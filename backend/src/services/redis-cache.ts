import Redis from 'ioredis';
import * as crypto from 'crypto';
import { log } from '../utils/logger';

/**
 * Redis cache for embeddings
 * Stores embeddings as binary buffers with TTL
 */
export class RedisCache {
  private client: Redis;
  private prefix: string;
  private ttl: number;

  constructor(config: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    prefix?: string;
    ttl?: number;
  }) {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.prefix = config.prefix || 'code-chat';
    this.ttl = config.ttl || 86400; // 24 hours default

    this.client.on('error', (err) => {
      log.error('Redis error:', err);
    });

    this.client.on('connect', () => {
      log.info('Redis connected');
    });
  }

  /**
   * Generate cache key for chunk hash
   */
  private getCacheKey(chunkHash: string): string {
    return `${this.prefix}:embedding:${chunkHash}`;
  }

  /**
   * Get embedding from cache
   */
  async getEmbedding(chunkHash: string): Promise<{
    vector: Float32Array;
    qdrantId: string;
    modelName: string;
  } | null> {
    try {
      const key = this.getCacheKey(chunkHash);
      const data = await this.client.getBuffer(key);

      if (!data) {
        return null;
      }

      // Parse cached data
      // Format: [qdrantId_length(4 bytes)][qdrantId][modelName_length(4 bytes)][modelName][vector_dim(4 bytes)][vector_data]
      let offset = 0;

      // Read qdrantId
      const qdrantIdLen = data.readUInt32LE(offset);
      offset += 4;
      const qdrantId = data.toString('utf8', offset, offset + qdrantIdLen);
      offset += qdrantIdLen;

      // Read modelName
      const modelNameLen = data.readUInt32LE(offset);
      offset += 4;
      const modelName = data.toString('utf8', offset, offset + modelNameLen);
      offset += modelNameLen;

      // Read vector
      const dimension = data.readUInt32LE(offset);
      offset += 4;

      // Copy to a new aligned buffer to avoid Float32Array alignment issues
      const vectorByteLength = dimension * 4;
      const vectorBuffer = Buffer.allocUnsafe(vectorByteLength);
      data.copy(vectorBuffer, 0, offset, offset + vectorByteLength);
      const vector = new Float32Array(vectorBuffer.buffer, vectorBuffer.byteOffset, dimension);

      // Update access time
      await this.client.expire(key, this.ttl);

      return { vector, qdrantId, modelName };
    } catch (err) {
      log.error('Redis get error:', err);
      return null;
    }
  }

  /**
   * Set embedding in cache
   */
  async setEmbedding(
    chunkHash: string,
    vector: Float32Array,
    qdrantId: string,
    modelName: string
  ): Promise<void> {
    try {
      const key = this.getCacheKey(chunkHash);

      // Serialize data
      const qdrantIdBuf = Buffer.from(qdrantId, 'utf8');
      const modelNameBuf = Buffer.from(modelName, 'utf8');
      const vectorBuf = Buffer.from(vector.buffer);

      // Create combined buffer
      const totalLen =
        4 + qdrantIdBuf.length +
        4 + modelNameBuf.length +
        4 + vectorBuf.length;

      const buffer = Buffer.allocUnsafe(totalLen);
      let offset = 0;

      // Write qdrantId
      buffer.writeUInt32LE(qdrantIdBuf.length, offset);
      offset += 4;
      qdrantIdBuf.copy(buffer, offset);
      offset += qdrantIdBuf.length;

      // Write modelName
      buffer.writeUInt32LE(modelNameBuf.length, offset);
      offset += 4;
      modelNameBuf.copy(buffer, offset);
      offset += modelNameBuf.length;

      // Write vector
      buffer.writeUInt32LE(vector.length, offset);
      offset += 4;
      vectorBuf.copy(buffer, offset);

      // Store with TTL
      await this.client.setex(key, this.ttl, buffer);
    } catch (err) {
      log.error('Redis set error:', err);
      throw err;
    }
  }

  /**
   * Delete embedding from cache
   */
  async deleteEmbedding(chunkHash: string): Promise<void> {
    const key = this.getCacheKey(chunkHash);
    await this.client.del(key);
  }

  /**
   * Delete all embeddings for a project
   */
  async deleteProject(projectId: string): Promise<void> {
    const pattern = `${this.prefix}:project:${projectId}:*`;
    const keys = await this.scanKeys(pattern);

    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  /**
   * Scan for keys matching pattern
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, matchedKeys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      cursor = nextCursor;
      keys.push(...matchedKeys);
    } while (cursor !== '0');

    return keys;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsed: string;
    hitRate: string;
  }> {
    const info = await this.client.info('stats');
    const memory = await this.client.info('memory');

    const totalKeys = (await this.client.dbsize()) || 0;

    // Parse hit rate from info
    const hitsMatch = info.match(/keyspace_hits:(\d+)/);
    const missesMatch = info.match(/keyspace_misses:(\d+)/);
    const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
    const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
    const total = hits + misses;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) + '%' : '0%';

    // Parse memory usage
    const memoryMatch = memory.match(/used_memory_human:([^\r\n]+)/);
    const memoryUsed = memoryMatch ? memoryMatch[1].trim() : '0B';

    return {
      totalKeys,
      memoryUsed,
      hitRate,
    };
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    const pattern = `${this.prefix}:*`;
    const keys = await this.scanKeys(pattern);

    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  /**
   * Ping Redis
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.client.quit();
  }
}

/**
 * Compute chunk hash (SHA-256)
 */
export function computeChunkHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
