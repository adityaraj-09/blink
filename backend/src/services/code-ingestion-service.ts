import { DatabaseSchema } from '../database/schema';
import { RedisCache, computeChunkHash } from './redis-cache';
import { ChromaService, ChunkPayload } from './chroma-service';
import { EmbeddingService } from './embedding-service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Chunk input from client
 */
export interface ChunkInput {
  filePath: string;
  fileHash: string;
  language: string;
  chunks: Array<{
    chunkText: string;
    startLine: number;
    endLine: number;
    chunkType: string;
    chunkName?: string;
  }>;
}

/**
 * Ingestion result
 */
export interface IngestionResult {
  projectId: string;
  filesProcessed: number;
  chunksProcessed: number;
  chunksReused: number;
  chunksComputed: number;
  duration: number;
}

/**
 * Code ingestion service
 * Orchestrates chunk ingestion with caching
 */
export class CodeIngestionService {
  constructor(
    private db: DatabaseSchema,
    private redis: RedisCache,
    private chroma: ChromaService,
    private embeddings: EmbeddingService
  ) {}

  /**
   * Ingest code chunks for a project - WITH PARALLEL PROCESSING
   */
  async ingestChunks(
    projectId: string,
    chunks: ChunkInput[]
  ): Promise<IngestionResult> {
    const startTime = Date.now();

    let filesProcessed = 0;
    let chunksProcessed = 0;
    let chunksReused = 0;
    let chunksComputed = 0;

    // Ensure project collection exists
    await this.chroma.createProjectCollection(projectId);

    // Process files in parallel batches
    const fileBatchSize = 5; // Process 5 files concurrently
    console.log(`[CodeIngestion] Processing ${chunks.length} files in parallel batches of ${fileBatchSize}...`);

    for (let i = 0; i < chunks.length; i += fileBatchSize) {
      const batch = chunks.slice(i, i + fileBatchSize);

      // Process batch in parallel
      const batchPromises = batch.map(fileChunks =>
        this.ingestFileChunks(
          projectId,
          fileChunks,
          (stats) => {
            chunksProcessed += stats.processed;
            chunksReused += stats.reused;
            chunksComputed += stats.computed;
          }
        ).then(() => {
          filesProcessed++;
        })
      );

      await Promise.all(batchPromises);

      console.log(`[CodeIngestion] Processed file batch ${Math.floor(i / fileBatchSize) + 1}/${Math.ceil(chunks.length / fileBatchSize)} (${filesProcessed}/${chunks.length} files)`);
    }

    // Update project stats
    await this.updateProjectStats(projectId);

    const duration = Date.now() - startTime;

    console.log(`[CodeIngestion] ✅ Completed: ${filesProcessed} files, ${chunksProcessed} chunks (${chunksReused} cached, ${chunksComputed} computed) in ${(duration / 1000).toFixed(2)}s`);

    return {
      projectId,
      filesProcessed,
      chunksProcessed,
      chunksReused,
      chunksComputed,
      duration,
    };
  }

  /**
   * Ingest chunks for a single file
   */
  private async ingestFileChunks(
    projectId: string,
    fileChunks: ChunkInput,
    onProgress: (stats: { processed: number; reused: number; computed: number }) => void
  ): Promise<void> {
    const db = this.db.getDb();

    // Create or update file record
    const fileId = uuidv4();

    db.prepare(`
      INSERT INTO files (file_id, project_id, file_path, file_hash, language, size_bytes, line_count, indexed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, file_path) DO UPDATE SET
        file_hash = excluded.file_hash,
        language = excluded.language,
        indexed_at = excluded.indexed_at
    `).run(
      fileId,
      projectId,
      fileChunks.filePath,
      fileChunks.fileHash,
      fileChunks.language,
      0, // size_bytes (can be calculated)
      0, // line_count (can be calculated)
      Date.now()
    );

    // Get actual file_id (in case of conflict)
    const file = db.prepare('SELECT file_id FROM files WHERE project_id = ? AND file_path = ?')
      .get(projectId, fileChunks.filePath) as { file_id: string };

    const actualFileId = file.file_id;

    // Delete old chunks for this file
    await this.chroma.deleteChunksByFile(projectId, actualFileId);

    db.prepare('DELETE FROM chunks WHERE file_id = ?').run(actualFileId);

    // Process chunks
    const chunksToProcess: Array<{
      chunkHash: string;
      chunkText: string;
      chunkData: any;
    }> = [];

    for (const chunk of fileChunks.chunks) {
      const chunkHash = computeChunkHash(chunk.chunkText);
      const chunkId = uuidv4();

      chunksToProcess.push({
        chunkHash,
        chunkText: chunk.chunkText,
        chunkData: {
          chunkId,
          fileId: actualFileId,
          projectId,
          chunkHash,
          ...chunk,
        },
      });
    }

    // Check cache for existing embeddings - PARALLEL PROCESSING
    const embeddingResults: Array<{
      chunkData: any;
      embedding: Float32Array;
      qdrantId: string;
      fromCache: boolean;
    }> = [];

    let reused = 0;
    let computed = 0;

    // PHASE 1: Check all cache entries in parallel
    console.log(`[Parallel] Checking cache for ${chunksToProcess.length} chunks...`);
    const cacheCheckPromises = chunksToProcess.map(item =>
      this.redis.getEmbedding(item.chunkHash).then(cached => ({ item, cached }))
    );
    const cacheResults = await Promise.all(cacheCheckPromises);

    // PHASE 2: Separate cached and uncached chunks
    const cachedChunks: typeof chunksToProcess = [];
    const uncachedChunks: typeof chunksToProcess = [];

    for (const { item, cached } of cacheResults) {
      if (cached) {
        embeddingResults.push({
          chunkData: item.chunkData,
          embedding: cached.vector,
          qdrantId: cached.qdrantId,
          fromCache: true,
        });
        reused++;
      } else {
        uncachedChunks.push(item);
      }
    }

    console.log(`[Parallel] Cache hits: ${reused}, Cache misses: ${uncachedChunks.length}`);

    // PHASE 3: Compute embeddings for uncached chunks in parallel batches
    if (uncachedChunks.length > 0) {
      const embeddingBatchSize = 10; // Process 10 embeddings concurrently
      console.log(`[Parallel] Computing ${uncachedChunks.length} embeddings in batches of ${embeddingBatchSize}...`);

      for (let i = 0; i < uncachedChunks.length; i += embeddingBatchSize) {
        const batch = uncachedChunks.slice(i, i + embeddingBatchSize);

        // Compute embeddings in parallel for this batch
        const embeddingPromises = batch.map(async (item) => {
          const embedding = await this.embeddings.embed(item.chunkText);
          const qdrantId = uuidv4();

          return {
            item,
            embedding,
            qdrantId
          };
        });

        const batchResults = await Promise.all(embeddingPromises);

        // Cache embeddings in parallel
        const cachePromises = batchResults.map(({ item, embedding, qdrantId }) =>
          this.redis.setEmbedding(
            item.chunkHash,
            embedding,
            qdrantId,
            this.embeddings.getModelName()
          )
        );
        await Promise.all(cachePromises);

        // Add to results
        for (const { item, embedding, qdrantId } of batchResults) {
          embeddingResults.push({
            chunkData: item.chunkData,
            embedding,
            qdrantId,
            fromCache: false,
          });
          computed++;
        }

        console.log(`[Parallel] Computed batch ${Math.floor(i / embeddingBatchSize) + 1}/${Math.ceil(uncachedChunks.length / embeddingBatchSize)} (${computed}/${uncachedChunks.length})`);
      }
    }

    // Batch upsert to ChromaDB
    const chromaChunks = embeddingResults.map((result) => {
      const payload: ChunkPayload = {
        projectId: result.chunkData.projectId,
        fileId: result.chunkData.fileId,
        filePath: fileChunks.filePath,
        chunkId: result.chunkData.chunkId,
        chunkHash: result.chunkData.chunkHash,
        chunkText: result.chunkData.chunkText,
        chunkType: result.chunkData.chunkType,
        chunkName: result.chunkData.chunkName,
        language: fileChunks.language,
        startLine: result.chunkData.startLine,
        endLine: result.chunkData.endLine,
        indexedAt: Date.now(),
      };

      return {
        embedding: result.embedding,
        payload,
        pointId: result.qdrantId,
      };
    });

    await this.chroma.upsertChunksBatch(projectId, chromaChunks);

    // Store chunk metadata in database
    this.db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO chunks (
          chunk_id, file_id, project_id, chunk_hash, chunk_text,
          start_line, end_line, chunk_type, chunk_name, language,
          indexed_at, qdrant_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const result of embeddingResults) {
        stmt.run(
          result.chunkData.chunkId,
          result.chunkData.fileId,
          result.chunkData.projectId,
          result.chunkData.chunkHash,
          result.chunkData.chunkText,
          result.chunkData.startLine,
          result.chunkData.endLine,
          result.chunkData.chunkType,
          result.chunkData.chunkName || null,
          fileChunks.language,
          Date.now(),
          result.qdrantId
        );
      }
    });

    onProgress({
      processed: chunksToProcess.length,
      reused,
      computed,
    });
  }

  /**
   * Update project statistics
   */
  private async updateProjectStats(projectId: string): Promise<void> {
    const db = this.db.getDb();

    const fileCount = (db.prepare('SELECT COUNT(*) as count FROM files WHERE project_id = ?')
      .get(projectId) as { count: number }).count;

    const chunkCount = (db.prepare('SELECT COUNT(*) as count FROM chunks WHERE project_id = ?')
      .get(projectId) as { count: number }).count;

    db.prepare(`
      UPDATE projects SET
        total_files = ?,
        total_chunks = ?,
        last_indexed_at = ?,
        updated_at = ?
      WHERE project_id = ?
    `).run(fileCount, chunkCount, Date.now(), Date.now(), projectId);
  }

  /**
   * Delete file and its chunks
   */
  async deleteFile(projectId: string, filePath: string): Promise<void> {
    const db = this.db.getDb();

    const file = db.prepare('SELECT file_id FROM files WHERE project_id = ? AND file_path = ?')
      .get(projectId, filePath) as { file_id: string } | undefined;

    if (file) {
      // Delete from ChromaDB
      await this.chroma.deleteChunksByFile(projectId, file.file_id);

      // Delete from database (cascades to chunks)
      db.prepare('DELETE FROM files WHERE file_id = ?').run(file.file_id);

      // Update project stats
      await this.updateProjectStats(projectId);
    }
  }
}
