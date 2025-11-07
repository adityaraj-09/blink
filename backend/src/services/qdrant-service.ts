import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';

/**
 * Chunk payload stored in Qdrant
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
 * Search result from Qdrant
 */
export interface SearchResult {
  id: string;
  score: number;
  payload: ChunkPayload;
}

/**
 * Qdrant vector database service
 * Manages collections per project and vector operations
 */
export class QdrantService {
  private client: QdrantClient;
  private dimension: number;

  constructor(config: {
    url: string;
    apiKey?: string;
    dimension: number;
  }) {
    this.client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey,
    });

    this.dimension = config.dimension;
  }

  /**
   * Get collection name for a project
   */
  private getCollectionName(projectId: string): string {
    return `project_${projectId}`;
  }

  /**
   * Create collection for a project
   */
  async createProjectCollection(projectId: string): Promise<void> {
    const collectionName = this.getCollectionName(projectId);

    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === collectionName
      );

      if (!exists) {
        await this.client.createCollection(collectionName, {
          vectors: {
            size: this.dimension,
            distance: 'Cosine',
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });

        // Create payload indexes for filtering
        await this.client.createPayloadIndex(collectionName, {
          field_name: 'projectId',
          field_schema: 'keyword',
        });

        await this.client.createPayloadIndex(collectionName, {
          field_name: 'fileId',
          field_schema: 'keyword',
        });

        await this.client.createPayloadIndex(collectionName, {
          field_name: 'chunkHash',
          field_schema: 'keyword',
        });

        console.log(`Created Qdrant collection: ${collectionName}`);
      }
    } catch (err) {
      console.error(`Error creating collection ${collectionName}:`, err);
      throw err;
    }
  }

  /**
   * Delete collection for a project
   */
  async deleteProjectCollection(projectId: string): Promise<void> {
    const collectionName = this.getCollectionName(projectId);

    try {
      await this.client.deleteCollection(collectionName);
      console.log(`Deleted Qdrant collection: ${collectionName}`);
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
    const collectionName = this.getCollectionName(projectId);
    const id = pointId || uuidv4();

    try {
      await this.client.upsert(collectionName, {
        wait: true,
        points: [
          {
            id,
            vector: Array.from(embedding),
            payload,
          },
        ],
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
    const collectionName = this.getCollectionName(projectId);

    const points = chunks.map((chunk) => ({
      id: chunk.pointId || uuidv4(),
      vector: Array.from(chunk.embedding),
      payload: chunk.payload,
    }));

    try {
      await this.client.upsert(collectionName, {
        wait: true,
        points,
      });

      return points.map((p) => p.id as string);
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
    const collectionName = this.getCollectionName(projectId);

    try {
      // Build filter
      const qdrantFilter: any = {
        must: [
          {
            key: 'projectId',
            match: { value: projectId },
          },
        ],
      };

      if (filter?.fileId) {
        qdrantFilter.must.push({
          key: 'fileId',
          match: { value: filter.fileId },
        });
      }

      if (filter?.language) {
        qdrantFilter.must.push({
          key: 'language',
          match: { value: filter.language },
        });
      }

      if (filter?.chunkType) {
        qdrantFilter.must.push({
          key: 'chunkType',
          match: { value: filter.chunkType },
        });
      }

      const response = await this.client.search(collectionName, {
        vector: Array.from(queryEmbedding),
        limit,
        score_threshold: minScore,
        filter: qdrantFilter,
        with_payload: true,
      });

      return response.map((result) => ({
        id: result.id as string,
        score: result.score,
        payload: result.payload as ChunkPayload,
      }));
    } catch (err) {
      console.error('Error searching chunks:', err);
      throw err;
    }
  }

  /**
   * Delete chunks by file
   */
  async deleteChunksByFile(projectId: string, fileId: string): Promise<void> {
    const collectionName = this.getCollectionName(projectId);

    try {
      await this.client.delete(collectionName, {
        wait: true,
        filter: {
          must: [
            {
              key: 'fileId',
              match: { value: fileId },
            },
          ],
        },
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
    const collectionName = this.getCollectionName(projectId);

    try {
      const points = await this.client.retrieve(collectionName, {
        ids: [pointId],
        with_payload: true,
        with_vector: true,
      });

      if (points.length === 0) {
        return null;
      }

      const point = points[0];
      return {
        vector: new Float32Array(point.vector as number[]),
        payload: point.payload as ChunkPayload,
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
    const collectionName = this.getCollectionName(projectId);

    try {
      const info = await this.client.getCollection(collectionName);
      return {
        pointsCount: info.points_count,
        vectorsCount: info.vectors_count,
        segmentsCount: info.segments_count,
        status: info.status,
      };
    } catch (err) {
      console.error('Error getting collection info:', err);
      return null;
    }
  }

  /**
   * Check if Qdrant is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const collections = await this.client.getCollections();
      return true;
    } catch {
      return false;
    }
  }
}
