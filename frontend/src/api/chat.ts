/**
 * Chat API
 */

import { getAPIClient } from './client';

export interface ChatRequest {
  projectId: string;
  message: string;
  sessionId?: string;
  maxContextChunks?: number;
  minSimilarity?: number;
}

export interface ContextChunk {
  filePath: string;
  startLine: number;
  endLine: number;
  chunkType: string;
  chunkName?: string;
  similarity: number;
}

export interface ChatResponse {
  success: boolean;
  sessionId: string;
  messageId: string;
  response: string;
  contextChunks: ContextChunk[];
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatHistoryResponse {
  success: boolean;
  sessionId: string;
  messages: Array<{
    messageId: string;
    role: string;
    content: string;
    createdAt: number;
  }>;
}

/**
 * Send a chat message
 */
export async function sendChatMessage(
  request: ChatRequest
): Promise<ChatResponse> {
  const client = getAPIClient();
  return client.post<ChatResponse>('/api/chat', request);
}

/**
 * Get chat session history
 */
export async function getChatHistory(
  sessionId: string
): Promise<ChatHistoryResponse> {
  const client = getAPIClient();
  return client.get<ChatHistoryResponse>(`/api/chat/${sessionId}/history`);
}

/**
 * Delete chat session
 */
export async function deleteChatSession(
  sessionId: string
): Promise<{ success: boolean; message: string }> {
  const client = getAPIClient();
  return client.delete(`/api/chat/${sessionId}`);
}
