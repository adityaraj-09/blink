import {
  CodeEdit,
  EditValidation,
  AppliedEdit,
  DiffPreview,
  DiffLine,
  EditAction
} from '../types/code-edit';
import { DatabaseSchema } from '../database/schema';
import { FileEditService } from './FileEditService';
import { GitOperationsService } from './GitOperationsService';
import { RepoSyncService } from './RepoSyncService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for parsing and applying AI-generated code edits
 * Parses XML-formatted edit tags from LLM responses
 */
export class AICodeEditService {
  constructor(
    private db: DatabaseSchema,
    private fileEditService: FileEditService,
    private repoSyncService: RepoSyncService
  ) {}

  /**
   * Parse LLM response and extract structured edits
   * Supports both JSON and XML formats (JSON preferred)
   */
  parseEdits(llmResponse: string): { explanation: string; edits: CodeEdit[] } {
    // Try JSON format first (new format)
    try {
      return this.parseJsonEdits(llmResponse);
    } catch (jsonError) {
      // Fallback to XML format (legacy)
      return this.parseXmlEdits(llmResponse);
    }
  }

  /**
   * Parse JSON format edits (NEW FORMAT - preferred)
   * Format:
   * {
   *   "explanation": "...",
   *   "edits": [
   *     {
   *       "file": "path/to/file.ts",
   *       "action": "replace",
   *       "startLine": 10,
   *       "endLine": 15,
   *       "oldCode": "...",
   *       "newCode": "..."
   *     }
   *   ]
   * }
   */
  private parseJsonEdits(llmResponse: string): { explanation: string; edits: CodeEdit[] } {
    // Extract JSON block from markdown code fence if present
    let jsonText = llmResponse;
    const jsonBlockMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonText = jsonBlockMatch[1];
    } else {
      // Try to find JSON object
      const jsonMatch = llmResponse.match(/\{[\s\S]*"edits"[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
    }

    const parsed = JSON.parse(jsonText);

    if (!parsed.edits || !Array.isArray(parsed.edits)) {
      throw new Error('Invalid JSON format: missing edits array');
    }

    return {
      explanation: parsed.explanation || '',
      edits: parsed.edits.map((edit: any) => ({
        file: edit.file,
        action: edit.action as EditAction,
        startLine: edit.startLine,
        endLine: edit.endLine,
        afterLine: edit.afterLine,
        oldCode: edit.oldCode,
        newCode: edit.newCode,
        explanation: edit.explanation,
      })),
    };
  }

  /**
   * Parse XML format edits (LEGACY FORMAT - for backward compatibility)
   * Format: <edit file="path" start="10" end="15" action="replace">...</edit>
   */
  private parseXmlEdits(llmResponse: string): { explanation: string; edits: CodeEdit[] } {
    // Extract plain text explanation (everything outside <edit> tags)
    const explanation = llmResponse
      .replace(/<edit[^>]*>[\s\S]*?<\/edit>/g, '')
      .trim();

    // Extract all <edit> tags
    const editRegex = /<edit\s+([^>]+)>([\s\S]*?)<\/edit>/g;
    const edits: CodeEdit[] = [];
    let match;

    while ((match = editRegex.exec(llmResponse)) !== null) {
      const attributes = match[1];
      const content = match[2].trim();

      // Parse attributes
      const attrs = this.parseAttributes(attributes);

      // Split content by --- separator (OLD CODE --- NEW CODE)
      const parts = content.split(/\n?---+\n?/);

      const edit: CodeEdit = {
        file: attrs.file || '',
        action: (attrs.action as EditAction) || 'replace',
        startLine: attrs.start ? parseInt(attrs.start) : undefined,
        endLine: attrs.end ? parseInt(attrs.end) : undefined,
        afterLine: attrs.after ? parseInt(attrs.after) : undefined
      };

      // Handle different actions
      if (edit.action === 'replace') {
        edit.oldCode = parts[0]?.trim();
        edit.newCode = parts[1]?.trim();
      } else if (edit.action === 'insert') {
        edit.newCode = parts[0]?.trim() || content.trim();
      } else if (edit.action === 'delete') {
        edit.oldCode = parts[0]?.trim() || content.trim();
      } else if (edit.action === 'create') {
        // For create, entire content is the new file content
        edit.newCode = content.trim();
        edit.oldCode = undefined; // No old code for new files
      }

      if (edit.file) {
        edits.push(edit);
      }
    }

    return { explanation, edits };
  }

  /**
   * Parse XML attributes from string
   */
  private parseAttributes(attrString: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]+)"/g;
    let match;

    while ((match = attrRegex.exec(attrString)) !== null) {
      attrs[match[1]] = match[2];
    }

    return attrs;
  }

  /**
   * Validate an edit before applying
   */
  async validateEdit(
    edit: CodeEdit,
    projectId: string
  ): Promise<EditValidation> {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Get repository
      const repo = await this.repoSyncService.getRepositoryByProjectId(projectId);
      if (!repo) {
        return {
          valid: false,
          error: 'Repository not found'
        };
      }

      const gitOps = new GitOperationsService(repo.local_path);

      // Check if file exists
      const fileExists = gitOps.fileExists(edit.file);

      if (edit.action === 'create') {
        // For create action, file should NOT exist
        if (fileExists) {
          return {
            valid: false,
            error: `File ${edit.file} already exists. Use 'replace' action instead.`
          };
        }

        if (!edit.newCode) {
          return {
            valid: false,
            error: 'New code is required for create action'
          };
        }

        return { valid: true };
      }

      if (edit.action === 'replace' || edit.action === 'delete') {
        if (!fileExists) {
          return {
            valid: false,
            error: `File ${edit.file} does not exist`
          };
        }

        // Validate line numbers
        const content = await gitOps.readFile(edit.file);
        const lines = content.split('\n');

        if (edit.startLine && edit.startLine < 1) {
          return {
            valid: false,
            error: 'Start line must be >= 1'
          };
        }

        if (edit.endLine && edit.endLine > lines.length) {
          warnings.push(
            `End line ${edit.endLine} exceeds file length ${lines.length}`
          );
        }

        // Validate oldCode matches (for replace)
        if (edit.action === 'replace' && edit.oldCode && edit.startLine && edit.endLine) {
          const actualCode = lines
            .slice(edit.startLine - 1, edit.endLine)
            .join('\n')
            .trim();
          const expectedCode = edit.oldCode.trim();

          // Fuzzy match (ignore whitespace differences)
          const normalizeWhitespace = (str: string) =>
            str.replace(/\s+/g, ' ').trim();

          if (normalizeWhitespace(actualCode) !== normalizeWhitespace(expectedCode)) {
            warnings.push(
              'Old code does not exactly match file content. Using fuzzy matching.'
            );
            suggestions.push(
              'Consider refreshing file content or adjusting line numbers'
            );
          }
        }
      } else if (edit.action === 'insert') {
        if (!fileExists) {
          warnings.push(
            `File ${edit.file} does not exist. Will create new file.`
          );
        }

        if (edit.afterLine) {
          const content = await gitOps.readFile(edit.file);
          const lines = content.split('\n');

          if (edit.afterLine > lines.length) {
            warnings.push(
              `Insert position ${edit.afterLine} exceeds file length. Will append to end.`
            );
          }
        }
      }

      return {
        valid: true,
        warnings: warnings.length > 0 ? warnings : undefined,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Validation failed'
      };
    }
  }

  /**
   * Apply a single edit
   */
  async applyEdit(
    edit: CodeEdit,
    projectId: string,
    userId: string
  ): Promise<AppliedEdit> {
    try {
      // Get repository
      const repo = await this.repoSyncService.getRepositoryByProjectId(projectId);
      if (!repo) {
        throw new Error('Repository not found');
      }

      // Validate ownership
      if (repo.user_id !== userId) {
        throw new Error('Unauthorized');
      }

      const gitOps = new GitOperationsService(repo.local_path);

      // Read current file content
      let currentContent = '';
      let newContent = '';

      if (gitOps.fileExists(edit.file)) {
        currentContent = await gitOps.readFile(edit.file);
      }

      // Apply the edit based on action
      if (edit.action === 'create') {
        // For create, use the new code directly
        if (!edit.newCode) {
          throw new Error('New code is required for create action');
        }
        newContent = edit.newCode;
      } else if (edit.action === 'replace') {
        newContent = this.applyReplace(currentContent, edit);
      } else if (edit.action === 'insert') {
        newContent = this.applyInsert(currentContent, edit);
      } else if (edit.action === 'delete') {
        newContent = this.applyDelete(currentContent, edit);
      }

      // Track change using FileEditService
      const change = await this.fileEditService.trackChange(
        repo.id,
        edit.file,
        newContent,
        gitOps
      );

      return {
        editId: uuidv4(),
        changeId: change.id,
        file: edit.file,
        action: edit.action,
        success: true
      };
    } catch (error: any) {
      return {
        editId: uuidv4(),
        changeId: -1,
        file: edit.file,
        action: edit.action,
        success: false,
        error: error.message || 'Failed to apply edit'
      };
    }
  }

  /**
   * Apply replace action
   */
  private applyReplace(content: string, edit: CodeEdit): string {
    if (!edit.newCode) {
      throw new Error('New code is required for replace action');
    }

    // If line numbers are specified, replace those lines
    if (edit.startLine && edit.endLine) {
      const lines = content.split('\n');
      const before = lines.slice(0, edit.startLine - 1);
      const after = lines.slice(edit.endLine);

      return [...before, edit.newCode, ...after].join('\n');
    }

    // Otherwise, do string replacement
    if (edit.oldCode) {
      // Try exact match first
      if (content.includes(edit.oldCode)) {
        return content.replace(edit.oldCode, edit.newCode);
      }

      // Try fuzzy match (normalize whitespace)
      const normalizeWhitespace = (str: string) => str.replace(/\s+/g, ' ').trim();
      const oldNormalized = normalizeWhitespace(edit.oldCode);

      const lines = content.split('\n');
      let foundIndex = -1;
      let foundLength = 0;

      // Find matching segment
      for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j <= lines.length; j++) {
          const segment = lines.slice(i, j).join('\n');
          if (normalizeWhitespace(segment) === oldNormalized) {
            foundIndex = i;
            foundLength = j - i;
            break;
          }
        }
        if (foundIndex >= 0) break;
      }

      if (foundIndex >= 0) {
        const before = lines.slice(0, foundIndex);
        const after = lines.slice(foundIndex + foundLength);
        return [...before, edit.newCode, ...after].join('\n');
      }
    }

    throw new Error('Could not find old code to replace');
  }

  /**
   * Apply insert action
   */
  private applyInsert(content: string, edit: CodeEdit): string {
    if (!edit.newCode) {
      throw new Error('New code is required for insert action');
    }

    if (!content) {
      // New file
      return edit.newCode;
    }

    const lines = content.split('\n');

    if (edit.afterLine !== undefined) {
      // Insert after specific line
      const before = lines.slice(0, edit.afterLine);
      const after = lines.slice(edit.afterLine);
      return [...before, edit.newCode, ...after].join('\n');
    }

    // Default: append to end
    return content + '\n' + edit.newCode;
  }

  /**
   * Apply delete action
   */
  private applyDelete(content: string, edit: CodeEdit): string {
    if (edit.startLine && edit.endLine) {
      const lines = content.split('\n');
      const before = lines.slice(0, edit.startLine - 1);
      const after = lines.slice(edit.endLine);
      return [...before, ...after].join('\n');
    }

    if (edit.oldCode) {
      return content.replace(edit.oldCode, '');
    }

    throw new Error('Must specify either line numbers or old code for delete action');
  }

  /**
   * Generate diff preview without applying
   */
  async previewEdit(edit: CodeEdit, projectId: string): Promise<DiffPreview> {
    const repo = await this.repoSyncService.getRepositoryByProjectId(projectId);
    if (!repo) {
      throw new Error('Repository not found');
    }

    const gitOps = new GitOperationsService(repo.local_path);

    let oldContent = '';
    if (gitOps.fileExists(edit.file)) {
      oldContent = await gitOps.readFile(edit.file);
    }

    // Apply edit to get new content
    let newContent = '';
    if (edit.action === 'replace') {
      newContent = this.applyReplace(oldContent, edit);
    } else if (edit.action === 'insert') {
      newContent = this.applyInsert(oldContent, edit);
    } else if (edit.action === 'delete') {
      newContent = this.applyDelete(oldContent, edit);
    }

    // Generate diff lines
    const diffLines = this.generateDiffLines(oldContent, newContent);

    // Calculate stats
    const additions = diffLines.filter(l => l.type === 'add').length;
    const deletions = diffLines.filter(l => l.type === 'remove').length;

    return {
      file: edit.file,
      oldContent,
      newContent,
      diffLines,
      stats: {
        additions,
        deletions,
        changes: additions + deletions
      }
    };
  }

  /**
   * Generate diff lines (simple line-by-line diff)
   */
  private generateDiffLines(oldContent: string, newContent: string): DiffLine[] {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const diffLines: DiffLine[] = [];

    const maxLines = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === newLine) {
        diffLines.push({
          type: 'context',
          lineNumber: i + 1,
          content: oldLine || ''
        });
      } else {
        if (oldLine !== undefined) {
          diffLines.push({
            type: 'remove',
            lineNumber: i + 1,
            content: oldLine
          });
        }
        if (newLine !== undefined) {
          diffLines.push({
            type: 'add',
            lineNumber: i + 1,
            content: newLine
          });
        }
      }
    }

    return diffLines;
  }

  /**
   * Apply multiple edits in batch
   */
  async applyBatchEdits(
    edits: CodeEdit[],
    projectId: string,
    userId: string
  ): Promise<{
    appliedEdits: AppliedEdit[];
    failedEdits: Array<{ edit: CodeEdit; error: string }>;
  }> {
    const appliedEdits: AppliedEdit[] = [];
    const failedEdits: Array<{ edit: CodeEdit; error: string }> = [];

    for (const edit of edits) {
      try {
        const validation = await this.validateEdit(edit, projectId);
        if (!validation.valid) {
          failedEdits.push({
            edit,
            error: validation.error || 'Validation failed'
          });
          continue;
        }

        const result = await this.applyEdit(edit, projectId, userId);
        if (result.success) {
          appliedEdits.push(result);
        } else {
          failedEdits.push({
            edit,
            error: result.error || 'Failed to apply'
          });
        }
      } catch (error: any) {
        failedEdits.push({
          edit,
          error: error.message || 'Unknown error'
        });
      }
    }

    return { appliedEdits, failedEdits };
  }
}
