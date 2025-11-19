import { CodeEdit } from './code-edit';

/**
 * Types for progressive AI code editing
 */

export type TaskStatus = 'planning' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type TodoStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

/**
 * AI Edit Task (master task)
 */
export interface AIEditTask {
  task_id: string;
  project_id: string;
  user_id: string;
  session_id: string | null;
  user_message: string;
  status: TaskStatus;
  total_todos: number;
  completed_todos: number;
  failed_todos: number;
  plan_explanation: string | null;
  final_summary: string | null;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
}

/**
 * Individual TODO item
 */
export interface AIEditTodo {
  todo_id: string;
  task_id: string;
  order_index: number;
  title: string;
  description: string | null;
  file_path: string | null;
  status: TodoStatus;
  edit_data: CodeEdit | null;  // Parsed edit after completion
  error_message: string | null;
  created_at: number;
  completed_at: number | null;
}

/**
 * Parsed plan from LLM
 */
export interface ParsedPlan {
  explanation: string;
  todos: Array<{
    order: number;
    title: string;
    description: string;
    file: string;
  }>;
}

/**
 * Progressive edit request
 */
export interface ProgressiveEditRequest {
  projectId: string;
  message: string;
  sessionId?: string;
}

/**
 * Task status response (for polling)
 */
export interface TaskStatusResponse {
  taskId: string;
  status: TaskStatus;
  explanation: string | null;
  errorMessage?: string;  // Error message when task fails
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
  todos: Array<{
    todoId: string;
    order: number;
    title: string;
    description: string | null;
    filePath: string | null;
    status: TodoStatus;
    edits: CodeEdit[];  // Array of edits (a TODO can generate multiple edits)
    errorMessage: string | null;
    completedAt: number | null;
  }>;
  summary?: {
    totalEdits: number;
    creates: number;
    replaces: number;
    inserts: number;
    deletes: number;
    affectedFiles: string[];
    completedAt: number;
    duration: number;
    recommendation: string;
  };
  createdAt: number;
  completedAt: number | null;
}

/**
 * Progressive edit initiation response
 */
export interface ProgressiveEditInitResponse {
  taskId: string;
  status: TaskStatus;
  message: string;
}
