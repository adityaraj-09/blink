import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseSchema } from '../database/schema';
import { GeminiEmbeddingService } from './gemini-embedding-service';
import { ChromaService } from './chroma-service';
import { AICodeEditService } from './AICodeEditService';
import { FileEditService } from './FileEditService';
import { RepoSyncService } from './RepoSyncService';
import { GitOperationsService } from './GitOperationsService';
import { GitHubOAuthService } from './GitHubOAuthService';
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
    private githubAuth: GitHubOAuthService,
    config: {
      apiKey: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'gemini-2.5-pro';
    this.maxTokens = config.maxTokens || 8192;
    this.temperature = config.temperature || 0.1;
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
      const completedEdits: Array<{ todo: AIEditTodo; edit: CodeEdit }> = [];

      for (const todoData of plan.todos) {
        const todo = await this.getTodoByOrder(taskId, todoData.order);
        if (!todo) continue;

        try {
          // Update TODO status to processing
          await this.updateTodoStatus(todo.todo_id, 'processing');

          // Generate edit for this TODO
          const edit = await this.generateEditForTodo(
            projectId,
            userMessage,
            plan.explanation,
            todo,
            completedEdits,
            taskId
          );

          // Save edit data
          await this.saveTodoEdit(todo.todo_id, edit);

          // Update TODO status to completed
          await this.updateTodoStatus(todo.todo_id, 'completed');

          completedEdits.push({ todo, edit });

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
    return `You are an expert code architect planning code changes.

User Request: "${userMessage}"

Codebase Context:
${context}

IMPORTANT: Do NOT write code yet. Only create a detailed TODO list of what needs to be done.

Respond in this XML format:

<plan>
<explanation>
Brief overview of your plan (2-3 sentences explaining the approach and why).
</explanation>

<todo order="1" file="path/to/file.ts">
<title>Short title of what this TODO accomplishes</title>
<description>
Detailed description of what needs to be done in this step.
Explain what will be created/modified and why it's necessary.
</description>
</todo>

<todo order="2" file="path/to/another/file.ts">
<title>Another task</title>
<description>What this task does...</description>
</todo>

<!-- More TODOs -->
</plan>

RULES:
1. Order TODOs logically (types/interfaces first, then services, then routes, then config)
2. Each TODO should be a single, focused task (one file modification)
3. Include the exact file path where changes will be made
4. Be specific about what each TODO accomplishes
5. Consider dependencies between TODOs (e.g., types before services that use them)
6. Typical TODO count: 5-15 depending on complexity
7. For new features, include: types, service logic, API routes, tests, documentation

Examples of good TODOs:
- "Create user type definitions" (src/types/user.ts)
- "Implement authentication service with bcrypt" (src/services/auth.ts)
- "Add authentication middleware" (src/middleware/auth.ts)
- "Create auth routes" (src/routes/auth.ts)
- "Update package.json with dependencies" (package.json)
- "Add environment variables" (.env.example)

Start planning now:`;
  }

  /**
   * Parse plan XML response
   */
  private parsePlan(response: string): ParsedPlan {
    // Extract explanation
    const explanationMatch = response.match(/<explanation>([\s\S]*?)<\/explanation>/);
    const explanation = explanationMatch ? explanationMatch[1].trim() : 'AI-generated plan';

    // Extract TODOs
    const todoRegex = /<todo\s+order="(\d+)"\s+file="([^"]+)">([\s\S]*?)<\/todo>/g;
    const todos: ParsedPlan['todos'] = [];
    let match;

    while ((match = todoRegex.exec(response)) !== null) {
      const order = parseInt(match[1]);
      const file = match[2];
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
   * Generate edit for a specific TODO
   */
  private async generateEditForTodo(
    projectId: string,
    userMessage: string,
    planExplanation: string,
    currentTodo: AIEditTodo,
    completedEdits: Array<{ todo: AIEditTodo; edit: CodeEdit }>,
    taskId: string = 'unknown'
  ): Promise<CodeEdit> {
    // Get codebase context
    const queryEmbedding = await this.embeddings.embed(
      `${currentTodo.title} ${currentTodo.description}`
    );
    const searchResults = await this.chroma.search(projectId, queryEmbedding, 10, 0.6);

    const vectorContext = searchResults
      .map((r, i) => {
        const { filePath, startLine, endLine, chunkText } = r.payload;
        return `[${i + 1}] ${filePath}:${startLine}-${endLine}\n\`\`\`\n${chunkText}\n\`\`\``;
      })
      .join('\n\n');

    // Build context from completed TODOs
    const completedContext = completedEdits
      .map(({ todo, edit }) => {
        return `✓ TODO ${todo.order_index}: ${todo.title} (${edit.file})
Action: ${edit.action}
${edit.newCode ? `Code:\n\`\`\`\n${edit.newCode.substring(0, 500)}${edit.newCode.length > 500 ? '...' : ''}\n\`\`\`` : ''}`;
      })
      .join('\n\n');

    // Build execution prompt
    const prompt = this.buildExecutionPrompt(
      userMessage,
      planExplanation,
      currentTodo,
      vectorContext,
      completedContext
    );

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
      `Generate edit for TODO ${currentTodo.order_index}`
    );
    const response = result.response.text();

    // Parse edit
    const { edits } = this.aiEditService.parseEdits(response);

    if (edits.length === 0) {
      throw new Error('No edit generated by LLM');
    }

    return edits[0];
  }

  /**
   * Build execution prompt for individual TODO
   */
  private buildExecutionPrompt(
    userMessage: string,
    planExplanation: string,
    currentTodo: AIEditTodo,
    vectorContext: string,
    completedContext: string
  ): string {
    return `You are implementing a specific TODO from a larger plan.

Original User Request: "${userMessage}"

Overall Plan:
${planExplanation}

${completedContext ? `Completed TODOs So Far:\n${completedContext}\n` : 'This is the first TODO.\n'}

Current TODO to Implement:
Order: ${currentTodo.order_index}
Title: ${currentTodo.title}
Description: ${currentTodo.description}
File: ${currentTodo.file_path}

Codebase Context:
${vectorContext}

TASK: Implement ONLY this TODO. Provide complete, production-ready code.

Respond with a SINGLE <edit> tag using this format:

For creating a new file:
<edit file="${currentTodo.file_path}" action="create">
[Complete file content with all imports, exports, and implementation]
</edit>

For modifying an existing file:
<edit file="${currentTodo.file_path}" start="10" end="25" action="replace">
[Exact old code to replace]
---
[Complete new code]
</edit>

For inserting into an existing file:
<edit file="${currentTodo.file_path}" after="5" action="insert">
[New code to insert]
</edit>

RULES:
1. Focus ONLY on this TODO
2. Use types/code from completed TODOs if applicable
3. Provide complete, working code (not snippets)
4. Include all necessary imports
5. Follow best practices and coding standards
6. Ensure code is production-ready
7. If creating a new file, provide the ENTIRE file content

Implement this TODO now:`;
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
   * Save TODO edit
   */
  private async saveTodoEdit(todoId: string, edit: CodeEdit): Promise<void> {
    const now = Date.now();
    this.db.getDb().prepare(`
      UPDATE ai_edit_todos
      SET edit_json = ?, updated_at = ?
      WHERE todo_id = ?
    `).run(JSON.stringify(edit), now, todoId);
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
   * Generate final summary
   */
  private async generateFinalSummary(
    taskId: string,
    completedEdits: Array<{ todo: AIEditTodo; edit: CodeEdit }>
  ): Promise<string> {
    const edits = completedEdits.map(c => c.edit);

    const creates = edits.filter(e => e.action === 'create').length;
    const replaces = edits.filter(e => e.action === 'replace').length;
    const inserts = edits.filter(e => e.action === 'insert').length;
    const deletes = edits.filter(e => e.action === 'delete').length;
    const affectedFiles = [...new Set(edits.map(e => e.file))];

    const summary = {
      totalEdits: edits.length,
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
   * Save chat message for progressive edit
   */
  private async saveChatMessage(
    sessionId: string,
    projectId: string,
    userId: string,
    userMessage: string,
    plan: ParsedPlan,
    completedEdits: Array<{ todo: AIEditTodo; edit: CodeEdit }>
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

    // Prepare metadata with edits and explanation
    const metadata = {
      explanation: plan.explanation,
      edits: completedEdits.map(({ edit }) => edit),
      summary: {
        totalEdits: completedEdits.length,
        creates: completedEdits.filter(({ edit }) => edit.action === 'create').length,
        replaces: completedEdits.filter(({ edit }) => edit.action === 'replace').length,
        inserts: completedEdits.filter(({ edit }) => edit.action === 'insert').length,
        deletes: completedEdits.filter(({ edit }) => edit.action === 'delete').length,
        affectedFiles: [...new Set(completedEdits.map(({ edit }) => edit.file))]
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
      edit: row.edit_json ? JSON.parse(row.edit_json) : null,
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
