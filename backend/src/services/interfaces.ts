import { DatabaseSchema } from '../database/schema';

export interface IEmbeddingService {
  embed(text: string): Promise<Float32Array>;
  embedBatch(texts: string[]): Promise<Float32Array[]>;
  estimateTokens(text: string): number;
  estimateCost(tokenCount: number): number;
  getModelName(): string;
  getDimension(): number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  projectId: string;
  userId: string;
  sessionId?: string;
  message: string;
  maxContextChunks?: number;
  minSimilarity?: number;
}

export interface ChatResponse {
  sessionId: string;
  messageId: string;
  response: string;
  contextChunks: Array<{
    filePath: string;
    startLine: number;
    endLine: number;
    chunkType: string;
    chunkName?: string;
    similarity: number;
  }>;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface IChatService {
  chat(request: ChatRequest): Promise<ChatResponse>;
  getSessionHistory(sessionId: string): any[];
  deleteSession(sessionId: string): void;
}
