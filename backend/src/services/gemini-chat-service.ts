import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChromaService, SearchResult } from './chroma-service';
import { IEmbeddingService, IChatService, ChatMessage, ChatRequest, ChatResponse } from './interfaces';
import { DatabaseSchema } from '../database/schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Chat service with RAG using Google Gemini
 * Retrieves relevant code chunks and uses them as context for LLM
 */
export class GeminiChatService implements IChatService {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(
    private db: DatabaseSchema,
    private chroma: ChromaService,
    private embeddings: IEmbeddingService,
    config: {
      apiKey: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);

    // Gemini models:
    // - gemini-2.0-flash-exp: Fast, multimodal (recommended)
    // - gemini-1.5-pro: High quality, longer context
    // - gemini-1.5-flash: Fast and efficient
    this.model = config.model || 'gemini-2.0-flash-exp';
    this.maxTokens = config.maxTokens || 8192;
    this.temperature = config.temperature || 0.1;
  }

  /**
   * Chat with the codebase
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const {
      projectId,
      userId,
      message,
      maxContextChunks = 10,
      minSimilarity = 0.7,
    } = request;

    // Get or create session
    const sessionId = request.sessionId || this.createSession(projectId, userId);

    // Step 1: Retrieve relevant code chunks
    const queryEmbedding = await this.embeddings.embed(message);
    const searchResults = await this.chroma.search(
      projectId,
      queryEmbedding,
      maxContextChunks,
      minSimilarity
    );

    // Step 2: Build context from chunks
    const context = this.buildContext(searchResults);

    // Step 3: Get conversation history
    const history = this.getHistory(sessionId);

    // Step 4: Build prompt for Gemini
    const systemPrompt = this.getSystemPrompt();
    const fullPrompt = `${systemPrompt}\n\nCode Context:\n\n${context}\n\nConversation History:\n${this.formatHistory(history)}\n\nUser Question: ${message}`;

    // Step 5: Call Gemini
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        maxOutputTokens: this.maxTokens,
        temperature: this.temperature,
      },
    });

    const result = await model.generateContent(fullPrompt);
    const response = result.response.text();

    // Estimate token usage (Gemini doesn't provide exact counts in the response)
    const promptTokens = this.estimateTokens(fullPrompt);
    const completionTokens = this.estimateTokens(response);
    const tokenUsage = {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };

    // Step 6: Save messages to history
    const messageId = this.saveMessages(
      sessionId,
      message,
      response,
      searchResults
    );

    return {
      sessionId,
      messageId,
      response,
      contextChunks: searchResults.map((r) => ({
        filePath: r.payload.filePath,
        startLine: r.payload.startLine,
        endLine: r.payload.endLine,
        chunkType: r.payload.chunkType,
        chunkName: r.payload.chunkName,
        similarity: r.score,
      })),
      tokenUsage,
    };
  }

  /**
   * Get system prompt
   */
  private getSystemPrompt(): string {
    return `You are an expert code assistant that helps developers understand and work with their codebase.

Your capabilities:
- Explain code functionality and logic
- Identify bugs and potential issues
- Suggest improvements and optimizations
- Answer questions about implementation details
- Provide code examples and alternatives

Guidelines:
- Use the provided code context to answer questions accurately
- Reference specific file paths and line numbers when relevant
- If the context doesn't contain enough information, say so
- Be concise but thorough in your explanations
- Use proper code formatting in your responses
- Focus on practical, actionable advice

Always consider:
- Code quality and best practices
- Performance implications
- Security concerns
- Maintainability and readability`;
  }

  /**
   * Build context string from search results
   */
  private buildContext(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No relevant code found.';
    }

    const contextParts = results.map((result, index) => {
      const { filePath, startLine, endLine, chunkText, chunkType, chunkName } = result.payload;

      let header = `[${index + 1}] ${filePath}:${startLine}-${endLine}`;
      if (chunkName) {
        header += ` (${chunkType}: ${chunkName})`;
      } else {
        header += ` (${chunkType})`;
      }

      return `${header}\n\`\`\`\n${chunkText}\n\`\`\``;
    });

    return contextParts.join('\n\n');
  }

  /**
   * Format conversation history for Gemini
   */
  private formatHistory(history: ChatMessage[]): string {
    if (history.length === 0) {
      return 'No previous conversation.';
    }

    return history.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n');
  }

  /**
   * Create new chat session
   */
  private createSession(projectId: string, userId: string): string {
    const sessionId = uuidv4();
    const now = Date.now();

    const db = this.db.getDb();
    db.prepare(`
      INSERT INTO chat_sessions (session_id, project_id, user_id, created_at, updated_at, message_count)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(sessionId, projectId, userId, now, now);

    return sessionId;
  }

  /**
   * Get conversation history
   */
  private getHistory(sessionId: string, limit: number = 10): ChatMessage[] {
    const db = this.db.getDb();

    const messages = db.prepare(`
      SELECT role, content
      FROM chat_messages
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(sessionId, limit) as Array<{ role: string; content: string }>;

    // Reverse to get chronological order
    return messages.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  }

  /**
   * Save messages to history
   */
  private saveMessages(
    sessionId: string,
    userMessage: string,
    assistantMessage: string,
    contextChunks: SearchResult[]
  ): string {
    const db = this.db.getDb();
    const now = Date.now();

    return this.db.transaction(() => {
      // Save user message
      const userMessageId = uuidv4();
      db.prepare(`
        INSERT INTO chat_messages (message_id, session_id, role, content, created_at, context_chunks)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        userMessageId,
        sessionId,
        'user',
        userMessage,
        now,
        JSON.stringify(contextChunks.map((c) => c.id))
      );

      // Save assistant message
      const assistantMessageId = uuidv4();
      db.prepare(`
        INSERT INTO chat_messages (message_id, session_id, role, content, created_at, context_chunks)
        VALUES (?, ?, ?, ?, ?, NULL)
      `).run(
        assistantMessageId,
        sessionId,
        'assistant',
        assistantMessage,
        now
      );

      // Update session
      db.prepare(`
        UPDATE chat_sessions
        SET updated_at = ?, message_count = message_count + 2
        WHERE session_id = ?
      `).run(now, sessionId);

      return assistantMessageId;
    });
  }

  /**
   * Estimate token count
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Get session history
   */
  getSessionHistory(sessionId: string): Array<{
    messageId: string;
    role: string;
    content: string;
    createdAt: number;
  }> {
    const db = this.db.getDb();

    const messages = db.prepare(`
      SELECT message_id, role, content, created_at
      FROM chat_messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId) as any[];

    return messages.map((m) => ({
      messageId: m.message_id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    }));
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): void {
    const db = this.db.getDb();
    db.prepare('DELETE FROM chat_sessions WHERE session_id = ?').run(sessionId);
  }
}
