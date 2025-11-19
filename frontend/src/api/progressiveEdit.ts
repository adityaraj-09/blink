/**
 * Progressive Edit API
 * Background AI tasks with real-time progress tracking
 */

import { getAPIClient } from './client';
import { CodeEdit } from './aiEdit';

export interface ProgressiveEditRequest {
  projectId: string;
  message: string;
  sessionId?: string;
}

export interface ProgressiveEditInitResponse {
  taskId: string;
  status: 'planning' | 'processing' | 'completed' | 'failed' | 'cancelled';
  message: string;
}

export type TodoStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TodoItem {
  todoId: string;
  order: number;
  title: string;
  description: string;
  filePath: string;
  status: TodoStatus;
  edits: CodeEdit[];  // Array of edits (a TODO can generate multiple edits)
  errorMessage?: string;
  completedAt?: number;
}

export interface TaskProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
}

export interface TaskStatusResponse {
  taskId: string;
  status: 'planning' | 'processing' | 'completed' | 'failed' | 'cancelled';
  explanation?: string;
  errorMessage?: string;  // Error message when task fails
  progress: TaskProgress;
  todos: TodoItem[];
  createdAt: number;
  completedAt?: number;
  summary?: {
    totalEdits: number;
    creates: number;
    replaces: number;
    inserts: number;
    deletes: number;
    affectedFiles: string[];
    recommendation: string;
    duration: number;
  };
}

export interface TaskListItem {
  task_id: string;
  project_id: string;
  user_message: string;
  status: string;
  total_todos: number;
  completed_todos: number;
  failed_todos: number;
  created_at: number;
  updated_at: number;
  completed_at?: number;
}

/**
 * Initiate progressive edit (returns immediately with taskId)
 */
export async function initiateProgressiveEdit(
  request: ProgressiveEditRequest
): Promise<ProgressiveEditInitResponse> {
  const client = getAPIClient();
  return client.post<ProgressiveEditInitResponse>('/api/ai/edit/progressive', request);
}

/**
 * Poll for task status (call this repeatedly)
 */
export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const client = getAPIClient();
  return client.get<TaskStatusResponse>(`/api/ai/edit/tasks/${taskId}/status`);
}

/**
 * Cancel a running task
 */
export async function cancelTask(
  taskId: string
): Promise<{ success: boolean; message: string }> {
  const client = getAPIClient();
  return client.delete(`/api/ai/edit/tasks/${taskId}`);
}

/**
 * List user's tasks
 */
export async function listTasks(
  limit: number = 20
): Promise<{ success: boolean; tasks: TaskListItem[] }> {
  const client = getAPIClient();
  return client.get(`/api/ai/edit/tasks?limit=${limit}`);
}
