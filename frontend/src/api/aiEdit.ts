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

/**
 * Inline Edit Request - for editing selected code directly in editor
 */
export interface InlineEditRequest {
  projectId: string;
  filePath: string;
  selectedCode: string;
  instruction: string;
  startLine?: number;
  endLine?: number;
  language?: string;
  fullFileContent?: string; // For better context
}

/**
 * Inline Edit Response - simplified response for inline editing
 */
export interface InlineEditResponse {
  originalCode: string;
  editedCode: string;
  explanation: string;
  diff: {
    additions: number;
    deletions: number;
    changes: DiffLine[];
  };
}

/**
 * Get AI-suggested inline edit (for selected code in editor)
 * This uses the existing AI edit endpoint but returns a simplified response
 */
export async function getInlineEdit(request: InlineEditRequest): Promise<InlineEditResponse> {
  const client = getAPIClient();

  // Convert inline edit request to AI edit request format
  const aiEditRequest: AIEditRequest = {
    projectId: request.projectId,
    message: `${request.instruction}\n\nSelected code to edit:\n\`\`\`${request.language || 'javascript'}\n${request.selectedCode}\n\`\`\``,
    fileContext: {
      filePath: request.filePath,
      content: request.fullFileContent,
      startLine: request.startLine,
      endLine: request.endLine,
    },
  };

  // Call AI edit endpoint
  const response = await client.post<AIEditResponse>('/api/ai/edit', aiEditRequest);

  // Extract the first edit (should be a replace operation)
  const firstEdit = response.edits[0];

  if (!firstEdit || !firstEdit.newCode) {
    throw new Error('No code suggestion returned from AI');
  }

  // Calculate diff
  const diffLines: DiffLine[] = calculateSimpleDiff(request.selectedCode, firstEdit.newCode);
  const additions = diffLines.filter(d => d.type === 'add').length;
  const deletions = diffLines.filter(d => d.type === 'remove').length;

  return {
    originalCode: request.selectedCode,
    editedCode: firstEdit.newCode,
    explanation: response.explanation,
    diff: {
      additions,
      deletions,
      changes: diffLines,
    },
  };
}

/**
 * Simple diff calculator for inline edits
 */
function calculateSimpleDiff(oldCode: string, newCode: string): DiffLine[] {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  const diffLines: DiffLine[] = [];

  const maxLines = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) {
      diffLines.push({
        type: 'context',
        lineNumber: i + 1,
        content: oldLine || '',
      });
    } else {
      if (oldLine !== undefined) {
        diffLines.push({
          type: 'remove',
          lineNumber: i + 1,
          content: oldLine,
        });
      }
      if (newLine !== undefined) {
        diffLines.push({
          type: 'add',
          lineNumber: i + 1,
          content: newLine,
        });
      }
    }
  }

  return diffLines;
}
