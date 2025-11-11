/**
 * Real-time streaming events for progressive edit tasks
 * Used for SSE (Server-Sent Events) to provide live updates to frontend
 */

export type EventType =
  // Task-level events
  | 'task.created'
  | 'task.planning.started'
  | 'task.planning.searching_codebase'
  | 'task.planning.completed'
  | 'task.processing.started'
  | 'task.completed'
  | 'task.failed'
  | 'task.cancelled'

  // TODO-level events
  | 'todo.started'
  | 'todo.tool_selection.started'
  | 'todo.tool_selection.completed'
  | 'todo.tool.executing'
  | 'todo.tool.completed'
  | 'todo.tool.failed'
  | 'todo.generating_edits.started'
  | 'todo.generating_edits.completed'
  | 'todo.completed'
  | 'todo.failed'

  // Progress events
  | 'progress.update';

/**
 * Base event structure
 */
export interface StreamEvent {
  eventId: string;
  taskId: string;
  todoId?: string;
  eventType: EventType;
  timestamp: number;
  sequenceNumber: number;
  data: EventData;
}

/**
 * Event data types for different events
 */
export type EventData =
  | TaskCreatedData
  | PlanningStartedData
  | PlanningSearchingData
  | PlanningCompletedData
  | ProcessingStartedData
  | TodoStartedData
  | ToolSelectionStartedData
  | ToolSelectionCompletedData
  | ToolExecutingData
  | ToolCompletedData
  | ToolFailedData
  | GeneratingEditsStartedData
  | GeneratingEditsCompletedData
  | TodoCompletedData
  | TodoFailedData
  | TaskCompletedData
  | TaskFailedData
  | ProgressUpdateData;

// Task Events
export interface TaskCreatedData {
  message: string;
  projectId: string;
  userId: string;
}

export interface PlanningStartedData {
  message: string;
  userMessage: string;
}

export interface PlanningSearchingData {
  message: string;
  query: string;
  resultsCount?: number;
}

export interface PlanningCompletedData {
  message: string;
  explanation: string;
  totalTodos: number;
  todos: Array<{
    order: number;
    title: string;
    description: string;
  }>;
}

export interface ProcessingStartedData {
  message: string;
  totalTodos: number;
}

// TODO Events
export interface TodoStartedData {
  message: string;
  todoId: string;
  order: number;
  title: string;
  description: string;
}

export interface ToolSelectionStartedData {
  message: string;
  availableTools: string[];
}

export interface ToolSelectionCompletedData {
  message: string;
  selectedTools: string[];
}

export interface ToolExecutingData {
  message: string;
  toolName: string;
  toolArgs: Record<string, any>;
}

export interface ToolCompletedData {
  message: string;
  toolName: string;
  success: boolean;
  resultSummary: string;
  tokensUsed?: number;
}

export interface ToolFailedData {
  message: string;
  toolName: string;
  error: string;
}

export interface GeneratingEditsStartedData {
  message: string;
  contextGathered: boolean;
}

export interface GeneratingEditsCompletedData {
  message: string;
  editsCount: number;
  filesAffected: string[];
  edits: Array<{
    file: string;
    action: 'create' | 'replace' | 'insert' | 'delete';
    explanation?: string;
  }>;
}

export interface TodoCompletedData {
  message: string;
  todoId: string;
  editsCount: number;
  filesAffected: string[];
}

export interface TodoFailedData {
  message: string;
  todoId: string;
  error: string;
}

export interface TaskCompletedData {
  message: string;
  summary: {
    totalEdits: number;
    creates: number;
    replaces: number;
    inserts: number;
    deletes: number;
    affectedFiles: string[];
  };
  duration: number;
}

export interface TaskFailedData {
  message: string;
  error: string;
}

export interface ProgressUpdateData {
  message: string;
  completed: number;
  failed: number;
  total: number;
  percentage: number;
  currentTodo?: {
    order: number;
    title: string;
  };
}

/**
 * SSE message format sent to client
 */
export interface SSEMessage {
  id: string;
  event: EventType;
  data: StreamEvent;
}
