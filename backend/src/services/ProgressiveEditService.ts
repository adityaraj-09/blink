import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseSchema } from '../database/schema';
import { GeminiEmbeddingService } from './gemini-embedding-service';
import { ChromaService } from './chroma-service';
import { AICodeEditService } from './AICodeEditService';
import { FileEditService } from './FileEditService';
import { RepoSyncService } from './RepoSyncService';
import { GitOperationsService } from './GitOperationsService';
import { GitHubOAuthService } from './GitHubOAuthService';
import { AITools, ToolResult, ToolContext } from './tools';
import {
  AIEditTask,
  AIEditTodo,
  ParsedPlan,
  TaskStatus,
  TodoStatus,
  TaskStatusResponse
} from '../types/progressive-edit';
import { CodeEdit } from '../types/code-edit';

/**
 * Service for progressive/streaming AI code edits
 * Generates TODO list first, then processes each TODO one-by-one
 */
export class ProgressiveEditService {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(
    private db: DatabaseSchema,
    private chroma: ChromaService,
    private embeddings: GeminiEmbeddingService,
    private aiEditService: AICodeEditService,
    private fileEditService: FileEditService,
    private githubAuth: GitHubOAuthService,
    config: {
      apiKey: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
      exaApiKey?: string;
    }
  ) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'gemini-2.5-flash';
    this.maxTokens = config.maxTokens || 8192;
    this.temperature = config.temperature || 0.1;
    this.exaApiKey = config.exaApiKey;
  }

  private exaApiKey?: string;

  /**
   * Determine the appropriate role/persona based on TODO content
   */
  private determineRole(todo: { title: string; description: string }): {
    persona: string;
    expertise: string;
    guidelines: string;
  } {
    const content = `${todo.title} ${todo.description}`.toLowerCase();

    // Security/Authentication expert
    if (
      content.includes('auth') ||
      content.includes('security') ||
      content.includes('password') ||
      content.includes('token') ||
      content.includes('jwt') ||
      content.includes('encrypt') ||
      content.includes('hash') ||
      content.includes('permission') ||
      content.includes('authorization') ||
      content.includes('vulnerability') ||
      content.includes('sanitiz')
    ) {
      return {
        persona: 'You are a senior security engineer with 10+ years of experience in application security and authentication systems.',
        expertise: 'You specialize in secure authentication, encryption, token management, and protecting against common vulnerabilities (OWASP Top 10).',
        guidelines: `- Always follow security best practices and principle of least privilege
- Never store sensitive data in plain text
- Use industry-standard libraries (bcrypt, jsonwebtoken, etc.)
- Validate and sanitize all inputs
- Implement proper error handling without leaking sensitive information
- Consider edge cases like token expiration, session hijacking, and brute force attacks
- Add rate limiting and proper logging for security events`
      };
    }

    // Performance/Optimization expert
    if (
      content.includes('performance') ||
      content.includes('optimi') ||
      content.includes('cache') ||
      content.includes('speed') ||
      content.includes('efficient') ||
      content.includes('async') ||
      content.includes('parallel') ||
      content.includes('concurren') ||
      content.includes('throttle') ||
      content.includes('debounce') ||
      content.includes('lazy load') ||
      content.includes('memory')
    ) {
      return {
        persona: 'You are a senior performance engineer with 10+ years of experience in optimization and scalability.',
        expertise: 'You specialize in performance optimization, caching strategies, async processing, memory management, and scalable architectures.',
        guidelines: `- Profile before optimizing - measure actual bottlenecks
- Use appropriate data structures and algorithms (consider time/space complexity)
- Implement caching at the right layer (memory, Redis, CDN)
- Leverage async/await and Promise.all for parallelization
- Avoid N+1 queries and unnecessary database calls
- Consider lazy loading and pagination for large datasets
- Monitor memory usage and prevent leaks
- Use connection pooling and resource reuse`
      };
    }

    // Database/Data expert
    if (
      content.includes('database') ||
      content.includes('sql') ||
      content.includes('query') ||
      content.includes('migration') ||
      content.includes('schema') ||
      content.includes('index') ||
      content.includes('transaction') ||
      content.includes('orm')
    ) {
      return {
        persona: 'You are a senior database engineer with 10+ years of experience in database design and optimization.',
        expertise: 'You specialize in database schema design, query optimization, indexing strategies, and data integrity.',
        guidelines: `- Design normalized schemas that balance efficiency and maintainability
- Use proper indexing for frequently queried columns
- Wrap related operations in transactions for data integrity
- Use prepared statements to prevent SQL injection
- Consider query performance and use EXPLAIN when needed
- Handle connection pooling and timeouts properly
- Add appropriate constraints and foreign keys
- Plan for data migrations and backwards compatibility`
      };
    }

    // API/Integration expert
    if (
      content.includes('api') ||
      content.includes('endpoint') ||
      content.includes('rest') ||
      content.includes('graphql') ||
      content.includes('webhook') ||
      content.includes('integration') ||
      content.includes('third-party') ||
      content.includes('external')
    ) {
      return {
        persona: 'You are a senior API architect with 10+ years of experience in designing and integrating APIs.',
        expertise: 'You specialize in RESTful API design, API integration, error handling, and building robust client-server communication.',
        guidelines: `- Follow REST principles and HTTP semantics correctly
- Use appropriate status codes (200, 201, 400, 401, 404, 500, etc.)
- Implement proper request validation and error responses
- Add rate limiting and request throttling
- Version your APIs for backwards compatibility
- Document API contracts clearly
- Handle timeouts and retries with exponential backoff
- Validate and sanitize all external inputs
- Implement proper authentication and authorization
- Log API calls for debugging and monitoring`
      };
    }

    // Testing expert
    if (
      content.includes('test') ||
      content.includes('unit') ||
      content.includes('integration') ||
      content.includes('e2e') ||
      content.includes('mock') ||
      content.includes('coverage')
    ) {
      return {
        persona: 'You are a senior QA engineer with 10+ years of experience in test-driven development and quality assurance.',
        expertise: 'You specialize in writing comprehensive tests, test automation, and ensuring code quality and reliability.',
        guidelines: `- Write clear, focused tests that test one thing at a time
- Follow AAA pattern: Arrange, Act, Assert
- Use descriptive test names that explain what's being tested
- Mock external dependencies appropriately
- Aim for high coverage of critical paths
- Test edge cases and error scenarios
- Keep tests fast and independent
- Use appropriate test types (unit, integration, e2e)`
      };
    }

    // UI/Frontend expert
    if (
      content.includes('ui') ||
      content.includes('frontend') ||
      content.includes('component') ||
      content.includes('react') ||
      content.includes('vue') ||
      content.includes('css') ||
      content.includes('style') ||
      content.includes('responsive') ||
      content.includes('accessibility')
    ) {
      return {
        persona: 'You are a senior frontend engineer with 10+ years of experience in building user interfaces.',
        expertise: 'You specialize in component architecture, responsive design, accessibility, and modern frontend frameworks.',
        guidelines: `- Build reusable, composable components
- Follow component framework best practices (hooks, lifecycle, etc.)
- Ensure responsive design for all screen sizes
- Implement accessibility standards (WCAG 2.1)
- Optimize bundle size and loading performance
- Handle loading and error states gracefully
- Use semantic HTML elements
- Implement proper form validation and user feedback`
      };
    }

    // Default: Senior Full-Stack Engineer
    return {
      persona: 'You are a senior full-stack engineer with 10+ years of experience building production systems.',
      expertise: 'You have deep expertise across the entire stack - frontend, backend, databases, and deployment.',
      guidelines: `- Write clean, maintainable, and well-documented code
- Follow SOLID principles and design patterns
- Consider scalability, security, and performance
- Handle errors gracefully with proper logging
- Use TypeScript types effectively for type safety
- Write code that's easy to test and debug
- Consider edge cases and failure scenarios
- Follow the existing codebase patterns and conventions
- Add appropriate comments for complex logic
- Think about maintainability - code is read more than written`
    };
  }

  /**
   * Retry helper with exponential backoff
   * Retries API calls up to 3 times with increasing delays
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    taskId: string,
    operation: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Task ${taskId}] ${operation} - Attempt ${attempt}/${maxRetries}`);
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if it's a retryable error
        const isRetryable =
          error.status === 503 || // Service Unavailable
          error.status === 429 || // Too Many Requests
          error.status === 500 || // Internal Server Error
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT';

        if (!isRetryable || attempt === maxRetries) {
          // Don't retry if not retryable or if this was the last attempt
          throw error;
        }

        // Calculate exponential backoff delay: 2^attempt seconds
        const delaySeconds = Math.pow(2, attempt);
        console.log(
          `[Task ${taskId}] ${operation} failed (${error.status || error.code}): ${error.message}. ` +
          `Retrying in ${delaySeconds}s... (${attempt}/${maxRetries})`
        );

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }
    }

    throw lastError;
  }

  /**
   * Step 1: Initiate progressive edit (generate TODO list)
   */
  async initiateProgressiveEdit(
    projectId: string,
    userId: string,
    message: string,
    sessionId?: string
  ): Promise<string> {
    const taskId = uuidv4();
    const now = Date.now();

    // Create task record
    this.db.getDb().prepare(`
      INSERT INTO ai_edit_tasks (
        task_id, project_id, user_id, session_id, user_message,
        status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'planning', ?, ?)
    `).run(taskId, projectId, userId, sessionId || null, message, now, now);

    // Start background processing
    this.processTaskInBackground(taskId, projectId, userId, message, sessionId).catch(error => {
      console.error(`Task ${taskId} failed:`, error);
      this.updateTaskStatus(taskId, 'failed');
    });

    return taskId;
  }

  /**
   * Step 2: Background processing - generate plan and execute TODOs
   */
  private async processTaskInBackground(
    taskId: string,
    projectId: string,
    userId: string,
    userMessage: string,
    sessionId?: string
  ): Promise<void> {
    try {
      // Phase 1: Generate TODO plan
      console.log(`[Task ${taskId}] Generating TODO plan...`);
      const plan = await this.generateTodoPlan(projectId, userMessage, taskId);

      // Save plan and TODOs
      await this.savePlanToDatabase(taskId, plan);

      // Update task status to processing
      await this.updateTaskStatus(taskId, 'processing');

      // Phase 2: Process each TODO
      console.log(`[Task ${taskId}] Processing ${plan.todos.length} TODOs...`);
      const completedEdits: Array<{ todo: AIEditTodo; edits: CodeEdit[] }> = [];

      for (const todoData of plan.todos) {
        const todo = await this.getTodoByOrder(taskId, todoData.order);
        if (!todo) continue;

        try {
          // Update TODO status to processing
          await this.updateTodoStatus(todo.todo_id, 'processing');

          // Generate edits for this TODO (can now return multiple edits)
          const edits = await this.generateEditForTodo(
            projectId,
            userMessage,
            plan.explanation,
            todo,
            completedEdits,
            taskId
          );

          // Save edits data (as JSON array)
          await this.saveTodoEdits(todo.todo_id, edits);

          // Update TODO status to completed
          await this.updateTodoStatus(todo.todo_id, 'completed');

          completedEdits.push({ todo, edits });

          // Update task progress
          await this.incrementTaskProgress(taskId);

        } catch (error: any) {
          console.error(`[Task ${taskId}] TODO ${todo.todo_id} failed:`, error);
          await this.updateTodoStatus(todo.todo_id, 'failed', error.message);
          await this.incrementTaskProgress(taskId, true);
        }
      }

      // Phase 3: Generate final summary
      console.log(`[Task ${taskId}] Generating final summary...`);
      const summary = await this.generateFinalSummary(taskId, completedEdits);

      // Update task as completed
      await this.completeTask(taskId, summary);

      // Save chat message if sessionId provided
      if (sessionId) {
        await this.saveChatMessage(sessionId, projectId, userId, userMessage, plan, completedEdits);
      }

      console.log(`[Task ${taskId}] Completed successfully!`);

    } catch (error: any) {
      console.error(`[Task ${taskId}] Task failed:`, error);
      await this.updateTaskStatus(taskId, 'failed');
    }
  }

  /**
   * Generate TODO plan from LLM
   */
  private async generateTodoPlan(
    projectId: string,
    userMessage: string,
    taskId: string = 'unknown'
  ): Promise<ParsedPlan> {
    // Get codebase context via vector search
    const queryEmbedding = await this.embeddings.embed(userMessage);
    const searchResults = await this.chroma.search(projectId, queryEmbedding, 15, 0.6);

    const context = searchResults
      .map((r, i) => {
        const { filePath, startLine, endLine, chunkText } = r.payload;
        return `[${i + 1}] ${filePath}:${startLine}-${endLine}\n\`\`\`\n${chunkText}\n\`\`\``;
      })
      .join('\n\n');

    // Build planning prompt
    const prompt = this.buildPlanningPrompt(userMessage, context);

    // Call LLM with retry logic
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        maxOutputTokens: this.maxTokens,
        temperature: this.temperature,
      },
    });

    const result = await this.retryWithBackoff(
      () => model.generateContent(prompt),
      taskId,
      'Generate TODO plan'
    );
    const response = result.response.text();

    // Parse plan
    return this.parsePlan(response);
  }

  /**
   * Build planning prompt
   */
  private buildPlanningPrompt(userMessage: string, context: string): string {
    return `ROLE: You are a senior software architect with 10+ years of experience designing and planning complex software systems.

EXPERTISE: You excel at breaking down requirements into actionable tasks, considering dependencies, and planning implementations that are maintainable, scalable, and secure. You have deep knowledge of software design patterns, system architecture, and best practices across the full stack.

User Request: "${userMessage}"

Codebase Context (initial search results):
${context}

IMPORTANT: Do NOT write code yet. Only create a detailed TODO list of what needs to be done.

You are creating a PLAN for an AI agent that will execute each TODO. The AI agent has access to powerful tools:
- search_codebase: Search for relevant code using vector similarity
- read_file: Read any file in the project
- search_web: Look up documentation, APIs, best practices
- get_chat_history: Reference previous conversation

Each TODO will be executed by an intelligent agent that can:
1. Search the codebase to find relevant files and code
2. Read multiple files to understand context
3. Look up documentation online if needed
4. Generate multiple edits across multiple files

Respond in this XML format:

<plan>
<explanation>
Brief overview of your plan (2-3 sentences explaining the approach and why).
</explanation>

<todo order="1">
<title>Short, action-oriented title (e.g., "Add user authentication logic")</title>
<description>
Detailed description of what needs to be accomplished in this step.
Focus on WHAT needs to be done and WHY, not HOW or WHERE.

The AI agent will figure out:
- Which files to read/search
- Which documentation to look up
- Which files to modify/create

Be specific about the business logic, requirements, and constraints.
</description>
</todo>

<todo order="2">
<title>Another focused task</title>
<description>What this task accomplishes and why it's necessary...</description>
</todo>

<!-- More TODOs -->
</plan>

CRITICAL RULES:
1. **DO NOT specify file paths** - The AI agent will search and find the right files
2. **Each TODO is a TASK, not a file** - One TODO can modify multiple files
3. **Order TODOs logically** - Dependencies matter (types → logic → routes → config)
4. **Be task-focused** - Describe goals, not implementation details
5. **Keep TODOs atomic** - Each should be independently testable
6. **Typical TODO count**: 5-15 depending on complexity
7. **Include search hints** - Mention what the agent should search for

Examples of GOOD TODOs (task-oriented, no file paths):

✓ "Add JWT-based authentication"
  Description: Implement JWT token generation and validation. The system should generate tokens on login, validate them on protected routes, and handle token expiration. Search for existing auth patterns in the codebase. Look up JWT best practices if needed.

✓ "Create user type definitions and interfaces"
  Description: Define TypeScript types for User, UserSession, and authentication responses. Search the codebase for existing type patterns and conventions. Ensure types match database schema.

✓ "Implement password hashing with bcrypt"
  Description: Add secure password hashing using bcrypt. Search for existing security utilities. Look up bcrypt best practices (salt rounds, async vs sync). Update user creation and login flows.

✓ "Add protected route middleware"
  Description: Create middleware to protect routes requiring authentication. Should verify JWT tokens, attach user info to request, and handle errors. Search for existing middleware patterns.

Examples of BAD TODOs (avoid these):

✗ "Edit src/types/user.ts" - Too specific, file-focused
✗ "Add line 45-60 in auth.ts" - Implementation detail, not a task
✗ "Import bcrypt at top of file" - Micro-task, not atomic

Start planning now:`;
  }

  /**
   * Parse plan XML response (now supports optional file attribute)
   */
  private parsePlan(response: string): ParsedPlan {
    // Extract explanation
    const explanationMatch = response.match(/<explanation>([\s\S]*?)<\/explanation>/);
    const explanation = explanationMatch ? explanationMatch[1].trim() : 'AI-generated plan';

    // Extract TODOs - file attribute is now optional
    const todoRegex = /<todo\s+order="(\d+)"(?:\s+file="([^"]+)")?\s*>([\s\S]*?)<\/todo>/g;
    const todos: ParsedPlan['todos'] = [];
    let match;

    while ((match = todoRegex.exec(response)) !== null) {
      const order = parseInt(match[1]);
      const file = match[2] || null; // File is optional now
      const content = match[3];

      const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
      const descMatch = content.match(/<description>([\s\S]*?)<\/description>/);

      const title = titleMatch ? titleMatch[1].trim() : `Task ${order}`;
      const description = descMatch ? descMatch[1].trim() : '';

      todos.push({ order, title, description, file });
    }

    // Sort by order
    todos.sort((a, b) => a.order - b.order);

    return { explanation, todos };
  }

  /**
   * Generate edit for a specific TODO (now with tool access)
   * This is where each TODO becomes an intelligent agent!
   */
  private async generateEditForTodo(
    projectId: string,
    userMessage: string,
    planExplanation: string,
    currentTodo: AIEditTodo,
    completedEdits: Array<{ todo: AIEditTodo; edits: CodeEdit[] }>,
    taskId: string = 'unknown'
  ): Promise<CodeEdit[]> {
    console.log(`[Task ${taskId}] TODO ${currentTodo.order_index}: Executing with tool access...`);

    // ============================================================
    // PHASE 1: LLM decides which tools to use for this TODO
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
              type: t.parameters.type as SchemaType,
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

    // Build context from completed TODOs
    const completedContext = completedEdits.length > 0
      ? completedEdits
          .map(({ todo, edits }) => {
            const editsSummary = edits.map(e => `  - ${e.action} in ${e.file}`).join('\n');
            return `✓ TODO ${todo.order_index}: ${todo.title}\n${editsSummary}`;
          })
          .join('\n\n')
      : 'This is the first TODO.';

    // Determine the appropriate role for this TODO
    const role = this.determineRole({
      title: currentTodo.title,
      description: currentTodo.description
    });
    console.log(`[Task ${taskId}] TODO ${currentTodo.order_index}: Assigned role: ${role.persona.split('.')[0]}`);

    // Initial prompt to decide tool usage
    const initialPrompt = `ROLE & EXPERTISE:
${role.persona}
${role.expertise}

You are executing a specific TODO from a larger development plan.

Original User Request: "${userMessage}"

Overall Plan:
${planExplanation}

Completed TODOs So Far:
${completedContext}

Current TODO to Execute:
Order: ${currentTodo.order_index}
Title: ${currentTodo.title}
Description: ${currentTodo.description}

IMPORTANT: You have access to powerful tools to help you complete this task:
${toolDefinitions.map(t => `- ${t.name}: ${t.description}`).join('\n')}

YOUR TASK:
1. **Analyze** what you need to accomplish this TODO
2. **Decide** which tools to use (you can use multiple tools):
   - Use search_codebase to find relevant existing code
   - Use read_file to read specific files you need to understand or modify
   - Use search_web if you need documentation, API references, or best practices
   - Use get_chat_history if this relates to previous conversation
3. **Call the tools** you need to gather context

CRITICAL:
- ALWAYS start by searching the codebase to find relevant files
- Read files you need to understand before making changes
- Look up documentation if you're implementing something new
- Be thorough - it's better to gather too much context than too little

If you need tools, call them now. If not (rare), explain why you don't need them.`;

    console.log(`[Task ${taskId}] TODO ${currentTodo.order_index}: Phase 1 - Tool selection...`);
    const phase1Result = await this.retryWithBackoff(
      () => model.generateContent(initialPrompt),
      taskId,
      `TODO ${currentTodo.order_index} tool selection`
    );
    const phase1Response = phase1Result.response;

    // Check if LLM wants to use tools
    const functionCalls = phase1Response.functionCalls();
    let toolResults: ToolResult[] = [];

    if (functionCalls && functionCalls.length > 0) {
      // ============================================================
      // PHASE 2: Execute tools that LLM requested
      // ============================================================
      console.log(`[Task ${taskId}] TODO ${currentTodo.order_index}: Phase 2 - Executing ${functionCalls.length} tool(s)...`);

      const toolContext: ToolContext = {
        projectId,
        sessionId: undefined,
        chroma: this.chroma,
        embeddings: this.embeddings,
        fileEditService: this.fileEditService,
        db: this.db,
        exaApiKey: this.exaApiKey,
      };

      // Execute all tools in parallel
      const toolPromises = functionCalls.map(async (call) => {
        console.log(`[Task ${taskId}] TODO ${currentTodo.order_index}: Executing tool: ${call.name}`);
        return await AITools.executeTool(
          call.name,
          call.args,
          toolContext
        );
      });

      toolResults = await Promise.all(toolPromises);
      console.log(`[Task ${taskId}] TODO ${currentTodo.order_index}: Tools executed successfully`);
    } else {
      console.log(`[Task ${taskId}] TODO ${currentTodo.order_index}: No tools requested`);
    }

    // ============================================================
    // PHASE 3: Generate edits with tool results
    // ============================================================
    console.log(`[Task ${taskId}] TODO ${currentTodo.order_index}: Phase 3 - Generating edits...`);

    const toolResultsText = this.formatToolResults(toolResults);
    const executionPrompt = this.buildExecutionPrompt(
      userMessage,
      planExplanation,
      currentTodo,
      completedContext,
      toolResultsText,
      role
    );

    const finalModel = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        maxOutputTokens: this.maxTokens,
        temperature: this.temperature,
      },
    });

    const finalResult = await this.retryWithBackoff(
      () => finalModel.generateContent(executionPrompt),
      taskId,
      `Generate edits for TODO ${currentTodo.order_index}`
    );
    const response = finalResult.response.text();

    // Parse edits (can now return multiple edits)
    const { edits } = this.aiEditService.parseEdits(response);

    if (edits.length === 0) {
      throw new Error('No edits generated by LLM');
    }

    console.log(`[Task ${taskId}] TODO ${currentTodo.order_index}: Generated ${edits.length} edit(s)`);
    return edits;
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
   * Build execution prompt for individual TODO (now with tool results and JSON output)
   */
  private buildExecutionPrompt(
    userMessage: string,
    planExplanation: string,
    currentTodo: AIEditTodo,
    completedContext: string,
    toolResultsText: string,
    role: { persona: string; expertise: string; guidelines: string }
  ): string {
    return `ROLE & EXPERTISE:
${role.persona}
${role.expertise}

SPECIALIZED GUIDELINES FOR THIS TASK:
${role.guidelines}

You are implementing a specific TODO from a larger development plan.

Original User Request: "${userMessage}"

Overall Plan:
${planExplanation}

Completed TODOs So Far:
${completedContext}

Current TODO to Implement:
Order: ${currentTodo.order_index}
Title: ${currentTodo.title}
Description: ${currentTodo.description}

Context Gathered from Tools:
${toolResultsText}

TASK: Implement this TODO using the context you gathered and following your specialized guidelines above. Generate code edits in JSON format.

CRITICAL: Output your response as a JSON object with the following structure:

\`\`\`json
{
  "explanation": "Brief explanation of what changes you're making and why",
  "edits": [
    {
      "file": "path/to/file.ts",
      "action": "create|replace|insert|delete",
      "startLine": 10,  // Required for replace/delete
      "endLine": 20,    // Required for replace/delete
      "afterLine": 5,   // Required for insert
      "oldCode": "exact code to replace or delete",  // Required for replace/delete
      "newCode": "new code to insert or use as replacement",  // Required for create/replace/insert
      "explanation": "Why this specific edit is needed"  // Optional but recommended
    }
  ]
}
\`\`\`

EDIT ACTIONS:
1. **create**: Create a new file (only newCode needed, entire file content)
2. **replace**: Replace existing code (needs startLine, endLine, oldCode, newCode)
3. **insert**: Insert new code after a line (needs afterLine, newCode)
4. **delete**: Delete existing code (needs startLine, endLine, oldCode)

CRITICAL RULES:
1. **Multiple edits allowed** - Include multiple objects in the edits array for multi-file changes
2. **Use exact file paths** - Use the paths you discovered through tools
3. **CRITICAL**: Ensure oldCode includes EXACTLY the code from the specified line range (startLine to endLine). Match character-for-character including whitespace.
4. The frontend uses fuzzy matching to locate edits, so exact line range content is sufficient - no need for extra surrounding context.
5. **Complete code** - Provide full, working implementations, not snippets
6. **All imports** - Include all necessary imports and dependencies
7. **Production-ready** - Follow best practices, handle errors, add types
8. **Leverage completed TODOs** - Use types/functions from previous TODOs
9. **Stay focused** - Only implement THIS TODO, not future ones
10. **Valid JSON** - Ensure your response is valid JSON that can be parsed

Example Response:

\`\`\`json
{
  "explanation": "Creating user type definitions and updating imports to use the new types",
  "edits": [
    {
      "file": "src/types/user.ts",
      "action": "create",
      "newCode": "export interface User {\n  id: string;\n  email: string;\n  name: string;\n  createdAt: Date;\n}\n\nexport interface UserSession {\n  user: User;\n  token: string;\n  expiresAt: Date;\n}",
      "explanation": "New file with user-related type definitions"
    },
    {
      "file": "src/services/auth.ts",
      "action": "replace",
      "startLine": 1,
      "endLine": 2,
      "oldCode": "import { Request, Response } from 'express';",
      "newCode": "import { Request, Response } from 'express';\nimport { User, UserSession } from '../types/user';",
      "explanation": "Adding import for new user types"
    },
    {
      "file": "src/services/auth.ts",
      "action": "insert",
      "afterLine": 20,
      "newCode": "\nexport function validateUser(user: User): boolean {\n  return !!(user.email && user.name && user.id);\n}",
      "explanation": "Adding user validation helper function"
    }
  ]
}
\`\`\`

Now implement this TODO and respond with ONLY the JSON object:`;
  }

  /**
   * Save plan to database
   */
  private async savePlanToDatabase(taskId: string, plan: ParsedPlan): Promise<void> {
    const now = Date.now();

    // Update task with explanation and total todos
    this.db.getDb().prepare(`
      UPDATE ai_edit_tasks
      SET plan_explanation = ?, total_todos = ?, updated_at = ?
      WHERE task_id = ?
    `).run(plan.explanation, plan.todos.length, now, taskId);

    // Insert TODOs
    for (const todo of plan.todos) {
      const todoId = uuidv4();
      this.db.getDb().prepare(`
        INSERT INTO ai_edit_todos (
          todo_id, task_id, order_index, title, description, file_path, status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).run(todoId, taskId, todo.order, todo.title, todo.description, todo.file, now, now);
    }
  }

  /**
   * Get TODO by order
   */
  private async getTodoByOrder(taskId: string, order: number): Promise<AIEditTodo | null> {
    const row = this.db.getDb().prepare(`
      SELECT * FROM ai_edit_todos WHERE task_id = ? AND order_index = ?
    `).get(taskId, order) as any;

    if (!row) return null;

    return {
      todo_id: row.todo_id,
      task_id: row.task_id,
      order_index: row.order_index,
      title: row.title,
      description: row.description,
      file_path: row.file_path,
      status: row.status,
      edit_data: row.edit_data ? JSON.parse(row.edit_data) : null,
      error_message: row.error_message,
      created_at: row.created_at,
      completed_at: row.completed_at
    };
  }

  /**
   * Save TODO edits (now supports multiple edits)
   */
  private async saveTodoEdits(todoId: string, edits: CodeEdit[]): Promise<void> {
    const now = Date.now();
    this.db.getDb().prepare(`
      UPDATE ai_edit_todos
      SET edit_json = ?, updated_at = ?
      WHERE todo_id = ?
    `).run(JSON.stringify(edits), now, todoId);
  }

  /**
   * Update TODO status
   */
  private async updateTodoStatus(
    todoId: string,
    status: TodoStatus,
    errorMessage?: string
  ): Promise<void> {
    const now = Date.now();
    const completedAt = status === 'completed' ? now : null;

    this.db.getDb().prepare(`
      UPDATE ai_edit_todos
      SET status = ?, error_message = ?, completed_at = ?, updated_at = ?
      WHERE todo_id = ?
    `).run(status, errorMessage || null, completedAt, now, todoId);
  }

  /**
   * Update task status
   */
  private async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const now = Date.now();

    this.db.getDb().prepare(`
      UPDATE ai_edit_tasks
      SET status = ?, updated_at = ?
      WHERE task_id = ?
    `).run(status, now, taskId);
  }

  /**
   * Increment task progress
   */
  private async incrementTaskProgress(taskId: string, failed: boolean = false): Promise<void> {
    const now = Date.now();
    const field = failed ? 'failed_todos' : 'completed_todos';

    this.db.getDb().prepare(`
      UPDATE ai_edit_tasks
      SET ${field} = ${field} + 1, updated_at = ?
      WHERE task_id = ?
    `).run(now, taskId);
  }

  /**
   * Generate final summary (updated for multiple edits per TODO)
   */
  private async generateFinalSummary(
    taskId: string,
    completedEdits: Array<{ todo: AIEditTodo; edits: CodeEdit[] }>
  ): Promise<string> {
    const allEdits = completedEdits.flatMap(c => c.edits);

    const creates = allEdits.filter(e => e.action === 'create').length;
    const replaces = allEdits.filter(e => e.action === 'replace').length;
    const inserts = allEdits.filter(e => e.action === 'insert').length;
    const deletes = allEdits.filter(e => e.action === 'delete').length;
    const affectedFiles = [...new Set(allEdits.map(e => e.file))];

    const summary = {
      totalEdits: allEdits.length,
      creates,
      replaces,
      inserts,
      deletes,
      affectedFiles,
      recommendation: 'Review all changes carefully before applying. Test thoroughly in a development environment.'
    };

    return JSON.stringify(summary);
  }

  /**
   * Complete task
   */
  private async completeTask(taskId: string, summary: string): Promise<void> {
    const now = Date.now();

    this.db.getDb().prepare(`
      UPDATE ai_edit_tasks
      SET status = 'completed', summary_json = ?, completed_at = ?, updated_at = ?
      WHERE task_id = ?
    `).run(summary, now, now, taskId);
  }

  /**
   * Save chat message for progressive edit (updated for multiple edits per TODO)
   */
  private async saveChatMessage(
    sessionId: string,
    projectId: string,
    userId: string,
    userMessage: string,
    plan: ParsedPlan,
    completedEdits: Array<{ todo: AIEditTodo; edits: CodeEdit[] }>
  ): Promise<void> {
    const now = Date.now();
    const messageId = uuidv4();

    // Check if session exists, if not create it
    const sessionExists = this.db.getDb().prepare(`
      SELECT 1 FROM chat_sessions WHERE session_id = ?
    `).get(sessionId);

    if (!sessionExists) {
      // Create new session
      this.db.getDb().prepare(`
        INSERT INTO chat_sessions (session_id, project_id, user_id, title, created_at, updated_at, message_count)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `).run(sessionId, projectId, userId, null, now, now);
    }

    // Flatten all edits
    const allEdits = completedEdits.flatMap(({ edits }) => edits);

    // Prepare metadata with edits and explanation
    const metadata = {
      explanation: plan.explanation,
      edits: allEdits,
      summary: {
        totalEdits: allEdits.length,
        creates: allEdits.filter(e => e.action === 'create').length,
        replaces: allEdits.filter(e => e.action === 'replace').length,
        inserts: allEdits.filter(e => e.action === 'insert').length,
        deletes: allEdits.filter(e => e.action === 'delete').length,
        affectedFiles: [...new Set(allEdits.map(e => e.file))]
      },
      contextChunks: [],
      mode: 'progressive'
    };

    // Save message
    this.db.getDb().prepare(`
      INSERT INTO chat_messages (message_id, session_id, role, content, created_at, context_chunks)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      messageId,
      sessionId,
      'user',
      userMessage,
      now,
      JSON.stringify(metadata)
    );

    // Update session
    this.db.getDb().prepare(`
      UPDATE chat_sessions
      SET updated_at = ?, message_count = message_count + 1
      WHERE session_id = ?
    `).run(now, sessionId);

    console.log(`[ProgressiveEdit] Saved chat message ${messageId} to session ${sessionId}`);
  }

  /**
   * Get task status (for polling)
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse | null> {
    // Get task
    const taskRow = this.db.getDb().prepare(`
      SELECT * FROM ai_edit_tasks WHERE task_id = ?
    `).get(taskId) as any;

    if (!taskRow) return null;

    // Get all TODOs
    const todoRows = this.db.getDb().prepare(`
      SELECT * FROM ai_edit_todos WHERE task_id = ? ORDER BY order_index ASC
    `).all(taskId) as any[];

    const todos = todoRows.map(row => ({
      todoId: row.todo_id,
      order: row.order_index,
      title: row.title,
      description: row.description,
      filePath: row.file_path,
      status: row.status as TodoStatus,
      edits: row.edit_json ? JSON.parse(row.edit_json) : [], // Now returns array of edits
      errorMessage: row.error_message,
      completedAt: row.completed_at
    }));

    const percentage = taskRow.total_todos > 0
      ? Math.round((taskRow.completed_todos / taskRow.total_todos) * 100)
      : 0;

    const response: TaskStatusResponse = {
      taskId: taskRow.task_id,
      status: taskRow.status,
      explanation: taskRow.plan_explanation,
      progress: {
        total: taskRow.total_todos,
        completed: taskRow.completed_todos,
        failed: taskRow.failed_todos,
        percentage
      },
      todos,
      createdAt: taskRow.created_at,
      completedAt: taskRow.completed_at
    };

    // Add summary if completed
    if (taskRow.status === 'completed' && taskRow.summary_json) {
      const summaryData = JSON.parse(taskRow.summary_json);
      response.summary = {
        ...summaryData,
        completedAt: taskRow.completed_at,
        duration: taskRow.completed_at - taskRow.created_at
      };
    }

    return response;
  }

  /**
   * Cancel task
   */
  async cancelTask(taskId: string): Promise<void> {
    await this.updateTaskStatus(taskId, 'cancelled');
  }

  /**
   * List user's tasks
   */
  async listUserTasks(userId: string, limit: number = 20): Promise<AIEditTask[]> {
    const rows = this.db.getDb().prepare(`
      SELECT * FROM ai_edit_tasks
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit) as any[];

    return rows.map(row => ({
      task_id: row.task_id,
      project_id: row.project_id,
      user_id: row.user_id,
      session_id: row.session_id,
      user_message: row.user_message,
      status: row.status,
      total_todos: row.total_todos,
      completed_todos: row.completed_todos,
      failed_todos: row.failed_todos,
      plan_explanation: row.plan_explanation,
      final_summary: row.final_summary,
      created_at: row.created_at,
      updated_at: row.updated_at,
      completed_at: row.completed_at
    }));
  }
}
