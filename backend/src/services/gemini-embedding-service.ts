import { GoogleGenerativeAI } from '@google/generative-ai';
import { IEmbeddingService } from './interfaces';

/**
 * Embedding service using Google Gemini
 * Supports text-embedding-004 model (768 dimensions)
 */
export class GeminiEmbeddingService implements IEmbeddingService {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private dimension: number;

  constructor(config: {
    apiKey: string;
    model?: string;
    dimension?: number;
  }) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);

    // Gemini embedding models:
    // - text-embedding-004: 768 dimensions (recommended)
    // - embedding-001: 768 dimensions (older)
    this.model = config.model || 'text-embedding-004';
    this.dimension = config.dimension || 768;
  }

  /**
   * Get model name
   */
  getModelName(): string {
    return this.model;
  }

  /**
   * Get embedding dimension
   */
  getDimension(): number {
    return this.dimension;
  }

  /**
   * Generate embedding for single text
   */
  async embed(text: string): Promise<Float32Array> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });

      const result = await model.embedContent(text);
      const embedding = result.embedding;

      if (!embedding || !embedding.values) {
        throw new Error('No embedding returned from Gemini');
      }

      return new Float32Array(embedding.values);
    } catch (err) {
      console.error('Error generating Gemini embedding:', err);
      throw new Error(`Failed to generate Gemini embedding: ${(err as Error).message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   * Gemini API processes one at a time, so we handle batching
   */
  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    const results: Float32Array[] = [];

    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });

      // Process with concurrency limit to avoid rate limits
      const CONCURRENT_REQUESTS = 5;

      for (let i = 0; i < texts.length; i += CONCURRENT_REQUESTS) {
        const batch = texts.slice(i, i + CONCURRENT_REQUESTS);

        const embeddings = await Promise.all(
          batch.map(async (text) => {
            const result = await model.embedContent(text);
            if (!result.embedding || !result.embedding.values) {
              throw new Error('No embedding returned from Gemini');
            }
            return new Float32Array(result.embedding.values);
          })
        );

        results.push(...embeddings);
      }

      return results;
    } catch (err) {
      console.error('Error generating Gemini batch embeddings:', err);
      throw new Error(`Failed to generate Gemini batch embeddings: ${(err as Error).message}`);
    }
  }

  /**
   * Estimate token count for text
   * Gemini uses similar tokenization to other models
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate cost for embedding generation
   * Gemini embeddings are FREE (as of 2024)
   */
  estimateCost(tokenCount: number): number {
    // Gemini embeddings are currently free!
    return 0;
  }
}
