import { ChromaClient, Collection, IncludeEnum } from 'chromadb';
import { v4 as uuidv4 } from 'uuid';

/**
 * Chunk payload stored in ChromaDB
 */
export interface ChunkPayload {
  projectId: string;
  fileId: string;
  filePath: string;
  chunkId: string;
  chunkHash: string;
  chunkText: string;
  chunkType: string;
  chunkName?: string;
  language: string;
  startLine: number;
  endLine: number;
  indexedAt: number;
}

/**
 * Search result from ChromaDB
 */
export interface SearchResult {
  id: string;
  score: number;
  payload: ChunkPayload;
}

/**
 * ChromaDB vector database service
 * Much simpler than Qdrant - runs locally without Docker!
 */
export class ChromaService {
  private client: ChromaClient;
  private collections: Map<string, Collection>;

  constructor(config?: {
    host?: string;
    port?: number;
  }) {
    // ChromaDB v3+ requires a running server
    // Default: http://localhost:8000
    const host = config?.host || 'localhost';
    const port = config?.port || 8001;

    this.client = new ChromaClient({
      path: `http://${host}:${port}`,
    });

    this.collections = new Map();
    console.log('ChromaDB initialized at:', `http://${host}:${port}`);
  }

  /**
   * Get collection name for a project
   */
  private getCollectionName(projectId: string): string {
    return `project_${projectId.replace(/-/g, '_')}`;
  }

  /**
   * Get or create collection for a project
   */
  private async getCollection(projectId: string): Promise<Collection> {
    const collectionName = this.getCollectionName(projectId);

    // Check cache
    if (this.collections.has(collectionName)) {
      return this.collections.get(collectionName)!;
    }

    try {
      // Try to get existing collection
      const collection = await this.client.getOrCreateCollection({
        name: collectionName,
        metadata: {
          'hnsw:space': 'cosine',
        },
      });

      this.collections.set(collectionName, collection);
      return collection;
    } catch (err) {
      console.error(`Error getting collection ${collectionName}:`, err);
      throw err;
    }
  }

  /**
   * Create collection for a project
   */
  async createProjectCollection(projectId: string): Promise<void> {
    await this.getCollection(projectId);
    console.log(`Created/verified ChromaDB collection for project: ${projectId}`);
  }

  /**
   * Delete collection for a project
   */
  async deleteProjectCollection(projectId: string): Promise<void> {
    const collectionName = this.getCollectionName(projectId);

    try {
      await this.client.deleteCollection({ name: collectionName });
      this.collections.delete(collectionName);
      console.log(`Deleted ChromaDB collection: ${collectionName}`);
    } catch (err) {
      console.error(`Error deleting collection ${collectionName}:`, err);
      throw err;
    }
  }

  /**
   * Upsert a single chunk embedding
   */
  async upsertChunk(
    projectId: string,
    embedding: Float32Array,
    payload: ChunkPayload,
    pointId?: string
  ): Promise<string> {
    const collection = await this.getCollection(projectId);
    const id = pointId || uuidv4();

    try {
      await collection.upsert({
        ids: [id],
        embeddings: [Array.from(embedding)],
        metadatas: [payload as any],
        documents: [payload.chunkText],
      });

      return id;
    } catch (err) {
      console.error('Error upserting chunk:', err);
      throw err;
    }
  }

  /**
   * Batch upsert multiple chunk embeddings
   */
  async upsertChunksBatch(
    projectId: string,
    chunks: Array<{
      embedding: Float32Array;
      payload: ChunkPayload;
      pointId?: string;
    }>
  ): Promise<string[]> {
    const collection = await this.getCollection(projectId);

    const ids = chunks.map(chunk => chunk.pointId || uuidv4());
    const embeddings = chunks.map(chunk => Array.from(chunk.embedding));
    const metadatas = chunks.map(chunk => chunk.payload as any);
    const documents = chunks.map(chunk => chunk.payload.chunkText);

    try {
      await collection.upsert({
        ids,
        embeddings,
        metadatas,
        documents,
      });

      return ids;
    } catch (err) {
      console.error('Error batch upserting chunks:', err);
      throw err;
    }
  }

  /**
   * Search for similar chunks
   */
  async search(
    projectId: string,
    queryEmbedding: Float32Array,
    limit: number = 10,
    minScore: number = 0.7,
    filter?: {
      fileId?: string;
      language?: string;
      chunkType?: string;
    }
  ): Promise<SearchResult[]> {
    const collection = await this.getCollection(projectId);

    try {
      // Build where filter
      let whereFilter: any = {
        projectId: projectId,
      };

      if (filter) {
        if (filter.fileId) {
          whereFilter.fileId = filter.fileId;
        }
        if (filter.language) {
          whereFilter.language = filter.language;
        }
        if (filter.chunkType) {
          whereFilter.chunkType = filter.chunkType;
        }
      }

      const results = await collection.query({
        queryEmbeddings: [Array.from(queryEmbedding)],
        nResults: limit,
        where: whereFilter,
        include: ['metadatas', 'distances'],
      });

      if (!results.ids || !results.ids[0]) {
        return [];
      }

      const searchResults: SearchResult[] = [];

      for (let i = 0; i < results.ids[0].length; i++) {
        const id = results.ids[0][i];
        const distance = results.distances?.[0]?.[i] ?? 1;
        const metadata = results.metadatas?.[0]?.[i] as any;

        // Convert distance to similarity score (cosine)
        // ChromaDB returns distance, we want similarity (1 - distance for cosine)
        const similarity = 1 - distance;

        // Filter by minimum similarity
        if (similarity >= minScore) {
          searchResults.push({
            id,
            score: similarity,
            payload: metadata as ChunkPayload,
          });
        }
      }

      return searchResults;
    } catch (err) {
      console.error('Error searching chunks:', err);
      throw err;
    }
  }

  /**
   * Delete chunks by file
   */
  async deleteChunksByFile(projectId: string, fileId: string): Promise<void> {
    const collection = await this.getCollection(projectId);

    try {
      // ChromaDB delete by metadata filter
      await collection.delete({
        where: { fileId },
      });

      console.log(`Deleted chunks for file: ${fileId}`);
    } catch (err) {
      console.error('Error deleting chunks by file:', err);
      throw err;
    }
  }

  /**
   * Get point by ID
   */
  async getPoint(
    projectId: string,
    pointId: string
  ): Promise<{ vector: Float32Array; payload: ChunkPayload } | null> {
    const collection = await this.getCollection(projectId);

    try {
      const result = await collection.get({
        ids: [pointId],
        include: ['embeddings', 'metadatas'],
      });

      if (!result.ids || result.ids.length === 0) {
        return null;
      }

      const embedding = result.embeddings?.[0];
      const metadata = result.metadatas?.[0];

      if (!embedding || !metadata) {
        return null;
      }

      return {
        vector: new Float32Array(embedding as number[]),
        payload: metadata as ChunkPayload,
      };
    } catch (err) {
      console.error('Error getting point:', err);
      return null;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(projectId: string) {
    try {
      const collection = await this.getCollection(projectId);
      const count = await collection.count();

      return {
        name: this.getCollectionName(projectId),
        count,
      };
    } catch (err) {
      console.error('Error getting collection info:', err);
      return null;
    }
  }

  /**
   * Check if ChromaDB is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.heartbeat();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reset (for testing)
   */
  async reset(): Promise<void> {
    await this.client.reset();
    this.collections.clear();
  }
}
