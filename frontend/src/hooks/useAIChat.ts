/**
 * useAIChat Hook
 * Manages AI chat with codebase
 */

import { useState, useCallback } from 'react';
import { sendChatMessage, ChatRequest, ChatResponse } from '../api/chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  contextChunks?: ChatResponse['contextChunks'];
  tokenUsage?: ChatResponse['tokenUsage'];
}

export interface UseAIChatOptions {
  projectId: string;
  sessionId?: string;
}

export interface UseAIChatReturn {
  messages: ChatMessage[];
  sendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  sessionId: string | null;
  clearMessages: () => void;
}

export function useAIChat(options: UseAIChatOptions): UseAIChatReturn {
  const { projectId, sessionId: initialSessionId } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);

  /**
   * Send chat message
   */
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      setIsLoading(true);
      setError(null);

      try {
        const request: ChatRequest = {
          projectId,
          message,
          sessionId: sessionId || undefined,
        };

        const response = await sendChatMessage(request);

        // Update session ID
        if (!sessionId) {
          setSessionId(response.sessionId);
        }

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: response.messageId,
          role: 'assistant',
          content: response.response,
          timestamp: Date.now(),
          contextChunks: response.contextChunks,
          tokenUsage: response.tokenUsage,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const error = err as Error;
        console.error('Chat failed:', error);
        setError(error);

        // Add error message
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${error.message}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, sessionId]
  );

  /**
   * Clear messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    error,
    sessionId,
    clearMessages,
  };
}
