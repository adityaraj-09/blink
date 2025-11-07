/**
 * AI Code Edit API
 */

import { getAPIClient } from './client';

export interface AIEditRequest {
  projectId: string;
  message: string;
  fileContext?: {
    filePath: string;
    content?: string;
    startLine?: number;
    endLine?: number;
    cursorPosition?: number;
  };
  sessionId?: string;
}

export interface CodeEdit {
  file: string;
  action: 'create' | 'replace' | 'insert' | 'delete';
  startLine?: number;
  endLine?: number;
  afterLine?: number;
  oldCode?: string;
  newCode?: string;
  explanation?: string;
}

export interface AIEditResponse {
  sessionId: string;
  messageId: string;
  explanation: string;
  edits: CodeEdit[];
  summary: {
    totalEdits: number;
    creates: number;
    replaces: number;
    inserts: number;
    deletes: number;
    affectedFiles: string[];
  };
  contextChunks: Array<{
    filePath: string;
    startLine: number;
    endLine: number;
    chunkType: string;
    chunkName?: string;
    similarity: number;
  }>;
  toolCalls?: {
    totalCalls: number;
    tools: Array<{
      name: string;
      tokensUsed: number;
      success: boolean;
    }>;
  };
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    toolTokens?: number;
  };
}

export interface EditValidation {
  valid: boolean;
  error?: string;
  warnings?: string[];
  suggestions?: string[];
}

export interface AppliedEdit {
  editId: string;
  changeId: number;
  file: string;
  action: string;
  success: boolean;
  error?: string;
}

export interface DiffLine {
  type: 'context' | 'add' | 'remove';
  lineNumber: number;
  content: string;
}

export interface DiffPreview {
  file: string;
  oldContent: string;
  newContent: string;
  diffLines: DiffLine[];
  stats: {
    additions: number;
    deletions: number;
    changes: number;
  };
}

/**
 * Get AI-suggested code edits
 */
export async function getAIEdits(request: AIEditRequest): Promise<AIEditResponse> {
  const client = getAPIClient();
  return client.post<AIEditResponse>('/api/ai/edit', request);
}

/**
 * Validate an edit before applying
 */
export async function validateEdit(
  projectId: string,
  edit: CodeEdit
): Promise<{ success: boolean; validation: EditValidation }> {
  const client = getAPIClient();
  return client.post('/api/ai/validate-edit', { projectId, edit });
}

/**
 * Preview an edit (get diff)
 */
export async function previewEdit(
  projectId: string,
  edit: CodeEdit
): Promise<{ success: boolean; preview: DiffPreview }> {
  const client = getAPIClient();
  return client.post('/api/ai/preview-edit', { projectId, edit });
}

/**
 * Apply a single edit
 */
export async function applyEdit(
  projectId: string,
  edit: CodeEdit
): Promise<{ success: boolean; result: AppliedEdit }> {
  const client = getAPIClient();
  return client.post('/api/ai/apply-edit', { projectId, edit });
}

/**
 * Apply multiple edits in batch
 */
export async function applyBatchEdits(
  projectId: string,
  edits: CodeEdit[],
  commitMessage?: string
): Promise<{
  success: boolean;
  appliedEdits: AppliedEdit[];
  failedEdits: Array<{ edit: CodeEdit; error: string }>;
  stats: {
    total: number;
    succeeded: number;
    failed: number;
  };
}> {
  const client = getAPIClient();
  return client.post('/api/ai/batch-apply', {
    projectId,
    edits,
    commitMessage,
  });
}

/**
 * Parse edits from LLM response (for testing/debugging)
 */
export async function parseEdits(llmResponse: string): Promise<{
  success: boolean;
  explanation: string;
  edits: CodeEdit[];
  editCount: number;
}> {
  const client = getAPIClient();
  return client.post('/api/ai/parse-edits', { llmResponse });
}

/**
 * Session and Message Types
 */
export interface ChatSession {
  sessionId: string;
  projectId: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface ChatMessage {
  messageId: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  // For assistant messages, metadata contains full AIEditResponse structure
  metadata?: {
    explanation?: string;
    edits?: CodeEdit[];
    summary?: {
      totalEdits: number;
      creates: number;
      replaces: number;
      inserts: number;
      deletes: number;
      affectedFiles: string[];
    };
    contextChunks?: Array<{
      filePath: string;
      startLine: number;
      endLine: number;
      chunkType: string;
      chunkName?: string;
      similarity: number;
    }>;
  };
}

/**
 * Get all chat sessions for a project
 */
export async function getChatSessions(projectId: string): Promise<{
  success: boolean;
  sessions: ChatSession[];
}> {
  const client = getAPIClient();
  return client.get(`/api/ai/sessions/${projectId}`);
}

/**
 * Get all messages for a chat session
 */
export async function getChatMessages(sessionId: string): Promise<{
  success: boolean;
  sessionId: string;
  messages: ChatMessage[];
}> {
  const client = getAPIClient();
  return client.get(`/api/ai/messages/${sessionId}`);
}
