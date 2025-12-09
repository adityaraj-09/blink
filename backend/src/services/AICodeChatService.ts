import { ChromaService, SearchResult } from './chroma-service';
import { GeminiEmbeddingService } from './gemini-embedding-service';
import { DatabaseSchema } from '../database/schema';
import { AICodeEditService } from './AICodeEditService';
import { FileEditService } from './FileEditService';
import { RepoSyncService } from './RepoSyncService';
import { GitHubOAuthService } from './GitHubOAuthService';
import { AIEditRequest, AIEditResponse, CodeEdit } from '../types/code-edit';
import { AITools, ToolResult, ToolContext } from './tools';
import { v4 as uuidv4 } from 'uuid';
import {
  OpenRouterClient,
  createOpenRouterClient,
  ChatMessage,
  ToolCall,
  DEFAULT_MODEL_ID,
  getModelConfig,
  modelSupportsTools,
} from './llm';

/**
 * Enhanced chat service for AI-powered code editing
 * Uses OpenRouter for multi-model support with tool calling
 */
export class AICodeChatService {
  private llmClient: OpenRouterClient;
  private maxTokens: number;
  private temperature: number;
  private aiEditService: AICodeEditService;
  private exaApiKey?: string;

  constructor(
    private db: DatabaseSchema,
    private chroma: ChromaService,
    private embeddings: GeminiEmbeddingService,
    private fileEditService: FileEditService,
    private repoSyncService: RepoSyncService,
    private githubAuth: GitHubOAuthService,
  ) {
    this.llmClient = createOpenRouterClient();
    this.maxTokens = 8192;
    this.temperature = 0.1;
    this.exaApiKey = process.env.EXA_API_KEY || '';

    this.aiEditService = new AICodeEditService(
      db,
      fileEditService,
      repoSyncService
    );
  }

  /**
   * Chat with AI for code editing
   * Uses function calling to intelligently select tools
   * Returns edits for frontend approval - does NOT apply automatically
   */
  async chatEdit(request: AIEditRequest): Promise<AIEditResponse> {
    const {
      projectId,
      message,
      fileContext,
      sessionId: requestSessionId,
      modelId: requestModelId
    } = request;

    // Use requested model or default
    const modelId = requestModelId || DEFAULT_MODEL_ID;
    const modelConfig = getModelConfig(modelId);

    console.log(`[AI Chat] Using model: ${modelId}`);

    // Get user ID from project
    const ownerId = this.db.getProjectOwnerId(projectId);
    if (!ownerId) {
      throw new Error('Project not found');
    }

    // Get or create session (with title for new sessions)
    let sessionId = requestSessionId;
    if (!sessionId) {
      const title = this.generateTitle(message);
      sessionId = this.createSession(projectId, ownerId, title);
      console.log(`[AI Chat] Created new session with title: "${title}"`);
    }

    // Build tool context
    const toolContext: ToolContext = {
      projectId,
      sessionId,
      chroma: this.chroma,
      embeddings: this.embeddings,
      fileEditService: this.fileEditService,
      db: this.db,
      exaApiKey: this.exaApiKey,
    };

    // Build initial context
    let userContext = `User Request: ${message}`;

    if (fileContext) {
      userContext += `\n\nCurrent filePath (${fileContext.filePath})`;
    }

    // Add file context if provided
    if (fileContext && fileContext.content) {
      const lines = fileContext.content.split('\n');
      let relevantCode = fileContext.content;

      if (fileContext.startLine && fileContext.endLine) {
        relevantCode = lines
          .slice(fileContext.startLine - 1, fileContext.endLine)
          .join('\n');
        userContext += `\n\nCurrent Selection (${fileContext.filePath}:${fileContext.startLine}-${fileContext.endLine}):\n\`\`\`\n${relevantCode}\n\`\`\``;
      } else {
        userContext += `\n\nCurrent File (${fileContext.filePath}):\n\`\`\`\n${fileContext.content}\n\`\`\``;
      }
    }

    // Get tools in OpenAI format
    const tools = AITools.getOpenAITools();

    // Build messages array
    const systemPrompt = this.getSystemPrompt();
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContext }
    ];

    // Check if model supports tools
    const supportsTools = modelSupportsTools(modelId);
    let toolResults: ToolResult[] = [];
    let totalToolTokens = 0;

    if (supportsTools) {
      // Use tool calling flow
      console.log('[AI Chat] Using tool calling flow...');

      const { response, toolResults: results, iterations } = await this.llmClient.createCompletionWithTools(
        {
          model: modelId,
          messages,
          tools,
          tool_choice: 'auto',
          temperature: this.temperature,
          max_tokens: this.maxTokens,
        },
        async (toolCall: ToolCall) => {
          console.log(`[AI Chat] Executing tool: ${toolCall.function.name}`);
          const result = await AITools.executeToolCall(toolCall, toolContext);
          toolResults.push(result);
          totalToolTokens += result.tokensUsed || 0;
          return this.formatToolResultForLLM(result);
        }
      );

      console.log(`[AI Chat] Completed in ${iterations} iteration(s), ${toolResults.length} tool call(s)`);

      const aiResponse = response.choices[0]?.message?.content || '';

      // Build and return response
      return await this.buildResponse(
        sessionId,
        message,
        aiResponse,
        toolResults,
        totalToolTokens,
        projectId,
        userContext,
        response.usage
      );

    } else {
      // Model doesn't support tools - direct completion
      console.log('[AI Chat] Model does not support tools, using direct completion...');

      const response = await this.llmClient.createCompletion({
        model: modelId,
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });

      const aiResponse = response.choices[0]?.message?.content || '';

      return await this.buildResponse(
        sessionId,
        message,
        aiResponse,
        [],
        0,
        projectId,
        userContext,
        response.usage
      );
    }
  }

  /**
   * Get system prompt for code editing
   */
  private getSystemPrompt(): string {
    return `You are an expert AI code editor that helps developers write, refactor, and improve code.

RESPONSE TYPES:
1. **Text-Only Response**: When providing explanations, answering questions, or giving suggestions WITHOUT code changes
2. **Code Edit Response**: When proposing actual code modifications using <edit> XML tags

WHEN TO USE TEXT-ONLY:
- Answering questions about code ("How does this work?", "What does this do?")
- Explaining concepts or architectural decisions
- Providing general advice or best practices
- Discussing trade-offs without proposing specific changes
- Clarifying requirements before suggesting edits

WHEN TO USE CODE EDITS:
- User explicitly asks to change code
- Suggesting specific code improvements with concrete changes
- Implementing new features or functionality
- Correcting bugs or security issues

CODE EDIT FORMAT (use this XML format ONLY when proposing code changes):

<edit file="relative/path/to/file.ts" start="15" end="20" action="replace">
<old>
[EXACT OLD CODE from the file - must match exactly]
</old>
<new>
[NEW CODE with your improvements]
</new>
</edit>

EDIT TAG RULES:
1. **action** can be: "create", "replace", "insert", or "delete"
2. For **create**: Create new file, use <new> tag with entire file content
3. For **replace**: Include start/end line numbers with <old> and <new> tags
4. For **insert**: Use "after" attribute (line number), use <new> tag only
5. For **delete**: Include start/end line numbers, use <old> tag only

EXAMPLES:

**Create New File Example:**
<edit file="src/types/user.ts" action="create">
<new>
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface UserSession {
  user: User;
  token: string;
  expiresAt: Date;
}
</new>
</edit>

**Replace Example:**
<edit file="src/auth.ts" start="15" end="20" action="replace">
<old>
if (user.password == inputPassword) {
  return true;
}
</old>
<new>
if (await bcrypt.compare(inputPassword, user.password)) {
  return true;
}
</new>
</edit>

**Insert Example:**
<edit file="src/auth.ts" after="5" action="insert">
<new>
import bcrypt from 'bcrypt';
</new>
</edit>

**Delete Example:**
<edit file="src/utils.ts" start="45" end="50" action="delete">
<old>
function deprecatedHelper() {
  // old code
}
</old>
</edit>

TOOL USAGE GUIDELINES:
- You have access to tools for searching code, reading files, and web search
- Use search_codebase to find relevant code context
- Use read_file to get specific file contents
- Use search_web for documentation or external references
- Use get_chat_history to reference previous conversation
- Call multiple tools if needed for comprehensive answers

CAPABILITIES:
- Fix bugs and security issues
- Refactor code for better quality
- Add error handling and validation
- Optimize performance
- Add types, tests, and documentation
- Convert between paradigms (callbacks → async/await, etc.)
- Implement new features
- Apply best practices

GUIDELINES:
1. Always explain WHY before showing edits
2. Reference specific files and line numbers
3. **CRITICAL**: In <old> tag, include EXACTLY the code from the specified line range
4. Provide complete, working code in <new> tag
5. Always provide a code edit if the user asks to change code
6. Consider dependencies (imports, etc.)
7. Maintain code style and conventions
8. Test suggestions mentally before responding
9. Always edit code within bounds of given context

Remember: Users can review and apply your edits individually, so each edit should be self-contained and safe to apply independently.`;
  }

  /**
   * Format tool result for LLM consumption
   */
  private formatToolResultForLLM(result: ToolResult): string {
    if (!result.success) {
      return `Error: ${result.error}`;
    }

    switch (result.toolName) {
      case 'search_codebase':
        let searchOutput = `Found ${result.data.resultsCount} results for "${result.data.query}":\n\n`;
        result.data.results.forEach((r: any) => {
          searchOutput += `[${r.index}] ${r.filePath}:${r.startLine}-${r.endLine}`;
          if (r.chunkName) {
            searchOutput += ` (${r.chunkType}: ${r.chunkName})`;
          }
          searchOutput += ` [similarity: ${r.similarity.toFixed(2)}]\n\`\`\`\n${r.code}\n\`\`\`\n\n`;
        });
        return searchOutput;

      case 'read_file':
        return `File: ${result.data.filePath}\nLines: ${result.data.lines} | Size: ${result.data.size} bytes\n\`\`\`\n${result.data.content}\n\`\`\``;

      case 'read_project':
        return `Project: ${result.data.projectPath}\nTotal Files: ${result.data.summary.totalFiles}\nTotal Directories: ${result.data.summary.totalDirectories}\n\n${JSON.stringify(result.data, null, 2)}`;

      case 'search_web':
        let webOutput = `Web search results for "${result.data.query}":\n\n`;
        result.data.results.forEach((r: any, i: number) => {
          webOutput += `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.text}\n\n`;
        });
        return webOutput;

      case 'get_chat_history':
        let historyOutput = `Retrieved ${result.data.messageCount} messages:\n\n`;
        result.data.messages.forEach((msg: any) => {
          historyOutput += `[${msg.timestamp}] ${msg.role.toUpperCase()}: ${msg.content}\n\n`;
        });
        return historyOutput;

      default:
        return JSON.stringify(result.data, null, 2);
    }
  }

  /**
   * Build final response with edits, summary, and tool usage
   */
  private async buildResponse(
    sessionId: string,
    userMessage: string,
    aiResponse: string,
    toolResults: ToolResult[],
    toolTokens: number,
    projectId: string,
    fullPrompt: string,
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  ): Promise<AIEditResponse> {
    // Parse edits from response
    const { explanation, edits } = this.aiEditService.parseEdits(aiResponse);

    // Check if text-only
    const isTextOnly = edits.length === 0;

    // Enrich edits with content for preview
    const enrichedEdits = isTextOnly ? [] : await this.enrichEditsWithContent(edits, projectId);

    // Token estimation (use actual if available)
    const promptTokens = usage?.prompt_tokens || this.estimateTokens(fullPrompt);
    const completionTokens = usage?.completion_tokens || this.estimateTokens(aiResponse);

    // Extract search results from tools for context chunks
    const searchResults = toolResults
      .filter(r => r.toolName === 'search_codebase' && r.success)
      .flatMap(r => r.data.results);

    // Save to history
    const messageId = this.saveMessages(
      sessionId,
      userMessage,
      explanation || aiResponse,
      [],
      enrichedEdits
    );

    // Generate summary
    const summary = isTextOnly ? {
      totalEdits: 0,
      creates: 0,
      replaces: 0,
      inserts: 0,
      deletes: 0,
      affectedFiles: []
    } : this.generateEditSummary(enrichedEdits);

    return {
      sessionId,
      messageId,
      explanation: explanation || aiResponse,
      edits: enrichedEdits,
      summary,
      appliedEdits: undefined,
      contextChunks: searchResults.map((r: any) => ({
        filePath: r.filePath,
        startLine: r.startLine,
        endLine: r.endLine,
        chunkType: r.chunkType,
        chunkName: r.chunkName,
        similarity: r.similarity
      })),
      toolCalls: toolResults.length > 0 ? {
        totalCalls: toolResults.length,
        tools: toolResults.map(r => ({
          name: r.toolName,
          tokensUsed: r.tokensUsed || 0,
          success: r.success
        }))
      } : undefined,
      tokenUsage: {
        promptTokens,
        completionTokens,
        totalTokens: (usage?.total_tokens || promptTokens + completionTokens) + toolTokens,
        toolTokens
      }
    };
  }

  /**
   * Generate summary of edits for quick overview
   */
  private generateEditSummary(edits: CodeEdit[]) {
    const creates = edits.filter(e => e.action === 'create').length;
    const replaces = edits.filter(e => e.action === 'replace').length;
    const inserts = edits.filter(e => e.action === 'insert').length;
    const deletes = edits.filter(e => e.action === 'delete').length;
    const affectedFiles = [...new Set(edits.map(e => e.file))];

    return {
      totalEdits: edits.length,
      creates,
      replaces,
      inserts,
      deletes,
      affectedFiles
    };
  }

  /**
   * Enrich edits with current file content for frontend preview
   */
  private async enrichEditsWithContent(
    edits: CodeEdit[],
    projectId: string
  ): Promise<CodeEdit[]> {
    return edits.map(edit => ({
      ...edit,
      explanation: edit.explanation || `${edit.action} in ${edit.file}`
    }));
  }

  /**
   * Create new chat session with optional title
   */
  private createSession(projectId: string, userId: string, title?: string): string {
    const sessionId = uuidv4();
    const now = Date.now();

    this.db.getDb().prepare(`
      INSERT INTO chat_sessions (session_id, project_id, user_id, title, created_at, updated_at, message_count)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(sessionId, projectId, userId, title || null, now, now);

    return sessionId;
  }

  /**
   * Generate a concise title from user message (max 50 chars)
   */
  private generateTitle(message: string): string {
    let title = message.trim();
    title = title.replace(/@[\w/.]+/g, '').trim();
    const firstSentence = title.split(/[.!?]/)[0];
    title = firstSentence.length > 50 ? firstSentence.substring(0, 47) + '...' : firstSentence;

    if (title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    return title || 'New Chat';
  }

  /**
   * Save messages to history
   */
  private saveMessages(
    sessionId: string,
    userMessage: string,
    assistantMessage: string,
    contextChunks: SearchResult[],
    edits: CodeEdit[]
  ): string {
    const now = Date.now();

    return this.db.transaction(() => {
      const messageId = uuidv4();

      const responseData = {
        explanation: assistantMessage,
        edits: edits,
        summary: {
          totalEdits: edits.length,
          creates: edits.filter(e => e.action === 'create').length,
          replaces: edits.filter(e => e.action === 'replace').length,
          inserts: edits.filter(e => e.action === 'insert').length,
          deletes: edits.filter(e => e.action === 'delete').length,
          affectedFiles: [...new Set(edits.map(e => e.file))]
        },
        contextChunks: contextChunks.map(c => ({
          filePath: c.payload.filePath,
          startLine: c.payload.startLine,
          endLine: c.payload.endLine,
          chunkType: c.payload.chunkType,
          chunkName: c.payload.chunkName,
          similarity: c.score
        }))
      };

      this.db.getDb().prepare(`
        INSERT INTO chat_messages (message_id, session_id, role, content, created_at, context_chunks)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        messageId,
        sessionId,
        'user',
        userMessage,
        now,
        JSON.stringify(responseData)
      );

      this.db.getDb().prepare(`
        UPDATE chat_sessions
        SET updated_at = ?, message_count = message_count + 1
        WHERE session_id = ?
      `).run(now, sessionId);

      return messageId;
    });
  }

  /**
   * Estimate token count
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get AI edit service instance (for manual operations)
   */
  getEditService(): AICodeEditService {
    return this.aiEditService;
  }
}
