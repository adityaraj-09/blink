import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
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

/**
 * Enhanced chat service for AI-powered code editing
 * Extends regular chat with structured code edit capabilities
 */
export class AICodeChatService {
  private genAI: GoogleGenerativeAI;
  private model: string;
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
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-pro';
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
      sessionId: requestSessionId
    } = request;

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

    // ============================================================
    // PHASE 1: LLM decides which tools to use (lightweight call)
    // ============================================================

    const toolDefinitions = AITools.getToolDefinitions();

    const model = this.genAI.getGenerativeModel({
      model: this.model,
      tools: [
        {
          functionDeclarations: toolDefinitions.map(t => ({
            name: t.name,
            description: t.description,
            parameters: {
              type:  t.parameters.type as SchemaType,
              properties: t.parameters.properties,
              required: t.parameters.required
            }

          }))
        }
      ],
      generationConfig: {
        temperature: 0.1,
      },
    });

    // Build initial prompt with minimal context
    let initialContext = `User Request: ${message}`;

    if(fileContext){
      initialContext+=`\n\nCurrent filePath (${fileContext.filePath})`;
    }

    // Add file context if provided
    if (fileContext && fileContext.content) {
      const lines = fileContext.content.split('\n');
      let relevantCode = fileContext.content;

      if (fileContext.startLine && fileContext.endLine) {
        relevantCode = lines
          .slice(fileContext.startLine - 1, fileContext.endLine)
          .join('\n');
        initialContext += `\n\nCurrent Selection (${fileContext.filePath}:${fileContext.startLine}-${fileContext.endLine}):\n\`\`\`\n${relevantCode}\n\`\`\``;
      } else {
        initialContext += `\n\nCurrent File (${fileContext.filePath}):\n\`\`\`\n${fileContext.content}\n\`\`\``;
      }
    }

    const initialPrompt = `You are an AI code editor assistant.

${initialContext}

Analyze the user's request and decide which tools (if any) you need to answer effectively. Available tools:
${toolDefinitions.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Guidelines:
- You have access to ALL tools - use any combination that helps complete the task
- if  user's request  is anyway related to the project/codebase, you can use the search_codebase tool.
- You can and SHOULD call multiple tools if needed for a comprehensive answer
- Consider using search_codebase to find relevant code context
- Use read_file to get specific file contents based on the discussion context
- Use search_web for latest information, libraries, APIs, or best practices
- Use get_chat_history to reference previous conversation context
- Prefer specific tools (read_file) over broad ones (read_project) when possible


IMPORTANT:

If calling tools, do so now. 
If no tools are needed follow below guidelines:
Add some explanation of the code changes/suggestions. and then add the code edit.

Always Use <edit> XML tags for  any code changes/suggestions.Always provide a code edit if the user asks to change code.

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
</edit>

**Replace Example:**
<edit file="src/auth.ts" start="15" end="20" action="replace">
if (user.password == inputPassword) {
  return true;
}
---
if (await bcrypt.compare(inputPassword, user.password)) {
  return true;
}
</edit>

**Insert Example:**
<edit file="src/auth.ts" after="5" action="insert">
import bcrypt from 'bcrypt';
</edit>

**Delete Example:**
<edit file="src/utils.ts" start="45" end="50" action="delete">
function deprecatedHelper() {
  // old code
}
</edit>

CAPABILITIES:
- Fix bugs and security issues
- Refactor code for better quality
- Add error handling and validation
- Optimize performance
- Add types, tests, and documentation
- Convert between paradigms (callbacks → async/await, etc.)
- Implement new features
- Apply best practices

`;

    console.log('[AI Chat] Phase 1: Tool selection...');
    const phase1Result = await model.generateContent(initialPrompt);
    const phase1Response = phase1Result.response;

    // Check if LLM wants to use tools
    const functionCalls = phase1Response.functionCalls();

    let toolResults: ToolResult[] = [];
    let totalToolTokens = 0;

    if (functionCalls && functionCalls.length > 0) {
      // ============================================================
      // PHASE 2: Execute tools that LLM requested
      // ============================================================
      console.log(`[AI Chat] Phase 2: Executing ${functionCalls.length} tool(s)...`);

      const toolContext: ToolContext = {
        projectId,
        sessionId,
        chroma: this.chroma,
        embeddings: this.embeddings,
        fileEditService: this.fileEditService,
        db: this.db,
        exaApiKey: this.exaApiKey,
      };

      // Execute all tools in parallel
      const toolPromises = functionCalls.map(async (call) => {
        console.log(`[AI Chat] Executing tool: ${call.name}`);
        return await AITools.executeTool(
          call.name,
          call.args,
          toolContext
        );
      });

      toolResults = await Promise.all(toolPromises);
      totalToolTokens = toolResults.reduce((sum, result) => sum + (result.tokensUsed || 0), 0);

      // ============================================================
      // PHASE 3: Call LLM again with tool results
      // ============================================================
      console.log('[AI Chat] Phase 3: Generating final response with tool results...');

      const toolResultsText = this.formatToolResults(toolResults);
      const systemPrompt = this.getCodeEditSystemPrompt();

      const finalPrompt = `${systemPrompt}

${initialContext}

Tool Results:
${toolResultsText}

Now provide your answer or code edits based on the information above.Always Use <edit> XML tags for  any code changes/suggestions.Always provide a code edit if the user asks to change code.`;

      const finalModel = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          maxOutputTokens: this.maxTokens,
          temperature: this.temperature,
        },
      });

      const finalResult = await finalModel.generateContent(finalPrompt);
      const response = finalResult.response.text();
      console.log('response', response);

      // Parse edits and build response
      return await this.buildResponse(
        sessionId,
        message,
        response,
        toolResults,
        totalToolTokens,
        projectId,
        finalPrompt
      );

    } else {
      // ============================================================
      // NO TOOLS NEEDED: Direct response
      // ============================================================
      console.log('[AI Chat] No tools needed, direct response');

      const directResponse = phase1Response.text();

      // Parse edits (might be text-only)
      return await this.buildResponse(
        sessionId,
        message,
        directResponse,
        [],
        0,
        projectId,
        initialPrompt
      );
    }
  }

  /**
   * Format tool results for LLM consumption
   */
  private formatToolResults(results: ToolResult[]): string {
    if (results.length === 0) {
      return 'No tools were used.';
    }

    return results.map((result, index) => {
      if (!result.success) {
        return `[Tool ${index + 1}] ${result.toolName} - FAILED\nError: ${result.error}`;
      }

      let formatted = `[Tool ${index + 1}] ${result.toolName} - SUCCESS\n`;

      switch (result.toolName) {
        case 'search_codebase':
          formatted += `Query: "${result.data.query}"\n`;
          formatted += `Found ${result.data.resultsCount} results:\n\n`;
          result.data.results.forEach((r: any) => {
            formatted += `[${r.index}] ${r.filePath}:${r.startLine}-${r.endLine}`;
            if (r.chunkName) {
              formatted += ` (${r.chunkType}: ${r.chunkName})`;
            }
            formatted += ` [similarity: ${r.similarity.toFixed(2)}]\n\`\`\`\n${r.code}\n\`\`\`\n\n`;
          });
          break;

        case 'read_file':
          formatted += `File: ${result.data.filePath}\n`;
          formatted += `Lines: ${result.data.lines} | Size: ${result.data.size} bytes\n`;
          formatted += `\`\`\`\n${result.data.content}\n\`\`\`\n`;
          break;

        case 'read_project':
          formatted += `Project: ${result.data.projectPath}\n`;
          formatted += `Total Files: ${result.data.summary.totalFiles}\n`;
          formatted += `Total Directories: ${result.data.summary.totalDirectories}\n`;
          formatted += `\n${JSON.stringify(result.data, null, 2)}\n`;
          break;

        case 'search_web':
          formatted += `Query: "${result.data.query}"\n`;
          formatted += `Found ${result.data.resultsCount} results:\n\n`;
          result.data.results.forEach((r: any, i: number) => {
            formatted += `[${i + 1}] ${r.title}\n`;
            formatted += `URL: ${r.url}\n`;
            formatted += `${r.text}\n\n`;
          });
          break;

        case 'get_chat_history':
          formatted += `Retrieved ${result.data.messageCount} messages:\n\n`;
          result.data.messages.forEach((msg: any) => {
            formatted += `[${msg.timestamp}] ${msg.role.toUpperCase()}: ${msg.content}\n\n`;
          });
          break;

        default:
          formatted += JSON.stringify(result.data, null, 2);
      }

      return formatted;
    }).join('\n---\n\n');
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
    fullPrompt: string
  ): Promise<AIEditResponse> {
    // Parse edits from response
    const { explanation, edits } = this.aiEditService.parseEdits(aiResponse);

    // Check if text-only
    const isTextOnly = edits.length === 0;

    // Enrich edits with content for preview
    const enrichedEdits = isTextOnly ? [] : await this.enrichEditsWithContent(edits, projectId);

    // Token estimation
    const promptTokens = this.estimateTokens(fullPrompt);
    const completionTokens = this.estimateTokens(aiResponse);

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
        totalTokens: promptTokens + completionTokens + toolTokens,
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
   * NOTE: We don't access git/filesystem here - just return edits as-is
   * Frontend has the file contents and will handle preview/diff generation
   */
  private async enrichEditsWithContent(
    edits: CodeEdit[],
    projectId: string
  ): Promise<CodeEdit[]> {
    // Simply return edits as-is
    // Frontend will handle oldCode extraction and preview generation
    return edits.map(edit => ({
      ...edit,
      explanation: edit.explanation || `${edit.action} in ${edit.file}`
    }));
  }

  /**
   * Get system prompt for code editing
   */
  private getCodeEditSystemPrompt(): string {
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
3. **CRITICAL**: In <old> tag, include EXACTLY the code from the specified line range (start to end). Match character-for-character including whitespace.
4. The frontend uses fuzzy matching to locate edits, so exact line range content is sufficient - no need for extra surrounding context.
5. Provide complete, working code in <new> tag
6. Always provide a code edit if the user asks to change code.
7. Consider dependencies (imports, etc.)
8. Maintain code style and conventions
9. Test suggestions mentally before responding
10. Always edit the code in the bounds of given code context.dont change the code outside the given code context.

RESPONSE FORMAT:
1. Brief explanation of what you'll do
2. One or more <edit> tags
3. Additional context or warnings if needed

Remember: Users can review and apply your edits individually, so each edit should be self-contained and safe to apply independently.`;
  }

  /**
   * Build context string from search results
   */
  private buildContext(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No relevant code found in vector search.';
    }

    const contextParts = results.map((result, index) => {
      const { filePath, startLine, endLine, chunkText, chunkType, chunkName } =
        result.payload;

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
   * Format conversation history
   */
  private formatHistory(
    history: Array<{ role: string; content: string }>
  ): string {
    if (history.length === 0) {
      return 'No previous conversation.';
    }

    return history.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n');
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
    // Clean the message
    let title = message.trim();

    // Remove file tags (@filepath)
    title = title.replace(/@[\w/.]+/g, '').trim();

    // Take first sentence or first 50 chars
    const firstSentence = title.split(/[.!?]/)[0];
    title = firstSentence.length > 50 ? firstSentence.substring(0, 47) + '...' : firstSentence;

    // Capitalize first letter
    if (title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    return title || 'New Chat';
  }

  /**
   * Get conversation history
   * Returns only user messages (which contain AI responses in metadata)
   */
  private getHistory(
    sessionId: string,
    limit: number = 10
  ): Array<{ role: string; content: string }> {
    const messages = this.db.getDb().prepare(`
      SELECT role, content
      FROM chat_messages
      WHERE session_id = ? AND role = 'user'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(sessionId, limit) as Array<{ role: string; content: string }>;

    return messages.reverse();
  }

  /**
   * Save messages to history
   * Saves user message with AI response in metadata
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
      // Save user message with AI response in metadata
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
        JSON.stringify(responseData) // AI response in user message metadata
      );

      // Update session (only increment by 1 since we're saving one combined message)
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
