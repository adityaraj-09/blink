/**
 * Types for AI-powered code editing
 */

export type EditAction = 'replace' | 'insert' | 'delete' | 'create';

/**
 * Parsed code edit from LLM response
 */
export interface CodeEdit {
  file: string;                    // Relative path to file
  action: EditAction;              // Type of edit operation
  startLine?: number;              // Starting line (for replace/delete)
  endLine?: number;                // Ending line (for replace/delete)
  afterLine?: number;              // Insert after this line (for insert)
  oldCode?: string;                // Original code (for replace/delete)
  newCode?: string;                // New code (for replace/insert)
  explanation?: string;            // Optional explanation for this edit
}

/**
 * Validation result for a code edit
 */
export interface EditValidation {
  valid: boolean;
  error?: string;
  warnings?: string[];
  suggestions?: string[];
}

/**
 * Applied edit result
 */
export interface AppliedEdit {
  editId: string;
  changeId: number;                // ID from file_changes table
  file: string;
  action: EditAction;
  success: boolean;
  error?: string;
}

/**
 * Diff preview for an edit
 */
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
 * Individual diff line
 */
export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  lineNumber: number;
  content: string;
}

/**
 * AI code edit request
 */
export interface AIEditRequest {
  projectId: string;
  message: string;                  // User's edit instruction
  fileContext?: {                   // Optional: specific file to edit
    filePath: string;
    content?: string;
    startLine?: number;
    endLine?: number;
    cursorPosition?: number;
  };
  applyImmediately?: boolean;       // If true, auto-apply edits
  sessionId?: string;               // For conversation continuity
}

/**
 * AI code edit response
 */
export interface AIEditResponse {
  sessionId: string;
  messageId: string;
  explanation: string;              // LLM's explanation text
  edits: CodeEdit[];                // All parsed edits
  summary: {
    totalEdits: number;
    creates: number;                // New files to create
    replaces: number;               // Existing file modifications
    inserts: number;                // Code insertions
    deletes: number;                // Code/file deletions
    affectedFiles: string[];        // List of all files being changed
  };
  appliedEdits?: AppliedEdit[];     // If applyImmediately=true
  contextChunks: Array<{
    filePath: string;
    startLine: number;
    endLine: number;
    chunkType: string;
    chunkName?: string;
    similarity: number;
  }>;
  toolCalls?: {                     // Tools used during generation
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
    toolTokens?: number;            // Tokens used by tool results
  };
}

/**
 * Batch edit apply request
 */
export interface BatchApplyRequest {
  projectId: string;
  edits: CodeEdit[];
  commitMessage?: string;           // Optional: auto-commit after apply
}

/**
 * Batch edit apply response
 */
export interface BatchApplyResponse {
  success: boolean;
  appliedEdits: AppliedEdit[];
  failedEdits: Array<{
    edit: CodeEdit;
    error: string;
  }>;
  stats: {
    total: number;
    succeeded: number;
    failed: number;
  };
}
