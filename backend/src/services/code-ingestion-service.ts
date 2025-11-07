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
   * Ingest code chunks for a project
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

    for (const fileChunks of chunks) {
      await this.ingestFileChunks(
        projectId,
        fileChunks,
        (stats) => {
          chunksProcessed += stats.processed;
          chunksReused += stats.reused;
          chunksComputed += stats.computed;
        }
      );

      filesProcessed++;
    }

    // Update project stats
    await this.updateProjectStats(projectId);

    const duration = Date.now() - startTime;

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

    // Check cache for existing embeddings
    const embeddingResults: Array<{
      chunkData: any;
      embedding: Float32Array;
      qdrantId: string;
      fromCache: boolean;
    }> = [];

    let reused = 0;
    let computed = 0;

    for (const item of chunksToProcess) {
      // Check Redis cache
      const cached = await this.redis.getEmbedding(item.chunkHash);

      if (cached) {
        // Cache hit
        embeddingResults.push({
          chunkData: item.chunkData,
          embedding: cached.vector,
          qdrantId: cached.qdrantId,
          fromCache: true,
        });
        reused++;
      } else {
        // Cache miss - compute embedding
        const embedding = await this.embeddings.embed(item.chunkText);
        const qdrantId = uuidv4();

        embeddingResults.push({
          chunkData: item.chunkData,
          embedding,
          qdrantId,
          fromCache: false,
        });

        // Cache the embedding
        await this.redis.setEmbedding(
          item.chunkHash,
          embedding,
          qdrantId,
          this.embeddings.getModelName()
        );

        computed++;
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
