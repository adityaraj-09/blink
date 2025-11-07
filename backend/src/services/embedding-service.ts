import OpenAI from 'openai';

/**
 * Embedding service using OpenAI
 */
export class EmbeddingService {
  private openai: OpenAI;
  private model: string;
  private dimension: number;

  constructor(config: {
    apiKey: string;
    model?: string;
    dimension?: number;
  }) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
    });

    this.model = config.model || 'text-embedding-3-small';
    this.dimension = config.dimension || 1536;
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
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        encoding_format: 'float',
      });

      const embedding = response.data[0].embedding;
      return new Float32Array(embedding);
    } catch (err) {
      console.error('Error generating embedding:', err);
      throw new Error(`Failed to generate embedding: ${(err as Error).message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   * OpenAI supports up to 2048 texts per request
   */
  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    const BATCH_SIZE = 2048;
    const results: Float32Array[] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);

      try {
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: batch,
          encoding_format: 'float',
        });

        for (const item of response.data) {
          results.push(new Float32Array(item.embedding));
        }
      } catch (err) {
        console.error('Error generating batch embeddings:', err);
        throw new Error(`Failed to generate batch embeddings: ${(err as Error).message}`);
      }
    }

    return results;
  }

  /**
   * Estimate token count for text
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate cost for embedding generation
   */
  estimateCost(tokenCount: number): number {
    // Pricing for text-embedding-3-small: $0.02 per 1M tokens
    const costPerMillion = 0.02;
    return (tokenCount / 1_000_000) * costPerMillion;
  }
}
