import * as crypto from 'crypto';
import { DatabaseSchema } from '../database/schema';
import { GitOperationsService } from './GitOperationsService';

export interface FileChange {
  id: number;
  repo_id: number;
  file_path: string;
  change_type: 'modified' | 'added' | 'deleted';
  original_content: string | null;
  new_content: string | null;
  original_hash: string | null;
  new_hash: string | null;
  staged: boolean;
  created_at: number;
  updated_at: number;
}

export class FileEditService {
  private db: DatabaseSchema;

  constructor(db: DatabaseSchema) {
    this.db = db;
  }

  /**
   * Track a file modification
   */
  async trackChange(
    repoId: number,
    filePath: string,
    newContent: string,
    gitOps: GitOperationsService
  ): Promise<FileChange> {
    const now = Date.now();

    // Read original content if file exists
    let originalContent: string | null = null;
    let originalHash: string | null = null;
    let changeType: 'modified' | 'added' | 'deleted' = 'modified';

    try {
      if (gitOps.fileExists(filePath)) {
        originalContent = await gitOps.readFile(filePath);
        originalHash = this.computeHash(originalContent);
        changeType = 'modified';
      } else {
        changeType = 'added';
      }
    } catch (error) {
      changeType = 'added';
    }

    const newHash = this.computeHash(newContent);

    // Check if change already exists
    const existing = await this.getChange(repoId, filePath);

    if (existing) {
      // Update existing change
      const stmt = this.db.getDb().prepare(`
        UPDATE file_changes
        SET new_content = ?, new_hash = ?, change_type = ?, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(newContent, newHash, changeType, now, existing.id);

      return {
        ...existing,
        new_content: newContent,
        new_hash: newHash,
        change_type: changeType,
        updated_at: now
      };
    } else {
      // Insert new change
      const stmt = this.db.getDb().prepare(`
        INSERT INTO file_changes (
          repo_id, file_path, change_type,
          original_content, new_content,
          original_hash, new_hash,
          staged, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `);

      const result = stmt.run(
        repoId,
        filePath,
        changeType,
        originalContent,
        newContent,
        originalHash,
        newHash,
        now,
        now
      );

      return {
        id: result.lastInsertRowid as number,
        repo_id: repoId,
        file_path: filePath,
        change_type: changeType,
        original_content: originalContent,
        new_content: newContent,
        original_hash: originalHash,
        new_hash: newHash,
        staged: false,
        created_at: now,
        updated_at: now
      };
    }
  }

  /**
   * Track a file deletion
   */
  async trackDeletion(
    repoId: number,
    filePath: string,
    gitOps: GitOperationsService
  ): Promise<FileChange> {
    const now = Date.now();

    // Read original content
    let originalContent: string | null = null;
    let originalHash: string | null = null;

    try {
      originalContent = await gitOps.readFile(filePath);
      originalHash = this.computeHash(originalContent);
    } catch (error) {
      // File doesn't exist, nothing to delete
      throw new Error('File does not exist');
    }

    // Check if change already exists
    const existing = await this.getChange(repoId, filePath);

    if (existing) {
      // Update to deletion
      const stmt = this.db.getDb().prepare(`
        UPDATE file_changes
        SET change_type = 'deleted', new_content = NULL, new_hash = NULL, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(now, existing.id);

      return {
        ...existing,
        change_type: 'deleted',
        new_content: null,
        new_hash: null,
        updated_at: now
      };
    } else {
      // Insert deletion record
      const stmt = this.db.getDb().prepare(`
        INSERT INTO file_changes (
          repo_id, file_path, change_type,
          original_content, new_content,
          original_hash, new_hash,
          staged, created_at, updated_at
        )
        VALUES (?, ?, 'deleted', ?, NULL, ?, NULL, 0, ?, ?)
      `);

      const result = stmt.run(
        repoId,
        filePath,
        originalContent,
        originalHash,
        now,
        now
      );

      return {
        id: result.lastInsertRowid as number,
        repo_id: repoId,
        file_path: filePath,
        change_type: 'deleted',
        original_content: originalContent,
        new_content: null,
        original_hash: originalHash,
        new_hash: null,
        staged: false,
        created_at: now,
        updated_at: now
      };
    }
  }

  /**
   * Get a specific change
   */
  async getChange(repoId: number, filePath: string): Promise<FileChange | null> {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM file_changes WHERE repo_id = ? AND file_path = ?
    `);

    const row = stmt.get(repoId, filePath) as any;
    if (!row) {
      return null;
    }

    return this.mapRowToFileChange(row);
  }

  /**
   * Get all pending changes for a repository
   */
  async getPendingChanges(repoId: number): Promise<FileChange[]> {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM file_changes WHERE repo_id = ? ORDER BY updated_at DESC
    `);

    const rows = stmt.all(repoId) as any[];
    return rows.map(row => this.mapRowToFileChange(row));
  }

  /**
   * Get staged changes
   */
  async getStagedChanges(repoId: number): Promise<FileChange[]> {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM file_changes WHERE repo_id = ? AND staged = 1 ORDER BY updated_at DESC
    `);

    const rows = stmt.all(repoId) as any[];
    return rows.map(row => this.mapRowToFileChange(row));
  }

  /**
   * Stage changes
   */
  async stageChanges(repoId: number, changeIds: number[]): Promise<void> {
    const now = Date.now();
    const placeholders = changeIds.map(() => '?').join(',');

    const stmt = this.db.getDb().prepare(`
      UPDATE file_changes
      SET staged = 1, updated_at = ?
      WHERE repo_id = ? AND id IN (${placeholders})
    `);

    stmt.run(now, repoId, ...changeIds);
  }

  /**
   * Stage all changes
   */
  async stageAllChanges(repoId: number): Promise<void> {
    const now = Date.now();

    const stmt = this.db.getDb().prepare(`
      UPDATE file_changes
      SET staged = 1, updated_at = ?
      WHERE repo_id = ?
    `);

    stmt.run(now, repoId);
  }

  /**
   * Unstage changes
   */
  async unstageChanges(repoId: number, changeIds: number[]): Promise<void> {
    const now = Date.now();
    const placeholders = changeIds.map(() => '?').join(',');

    const stmt = this.db.getDb().prepare(`
      UPDATE file_changes
      SET staged = 0, updated_at = ?
      WHERE repo_id = ? AND id IN (${placeholders})
    `);

    stmt.run(now, repoId, ...changeIds);
  }

  /**
   * Revert changes (restore to original)
   */
  async revertChanges(
    repoId: number,
    changeIds: number[],
    gitOps: GitOperationsService
  ): Promise<void> {
    const changes = await this.getPendingChanges(repoId);
    const toRevert = changes.filter(c => changeIds.includes(c.id));

    for (const change of toRevert) {
      if (change.change_type === 'modified' && change.original_content) {
        // Restore original content
        await gitOps.writeFile(change.file_path, change.original_content);
      } else if (change.change_type === 'added') {
        // Delete added file
        await gitOps.deleteFile(change.file_path);
      } else if (change.change_type === 'deleted' && change.original_content) {
        // Restore deleted file
        await gitOps.writeFile(change.file_path, change.original_content);
      }
    }

    // Delete change records
    const placeholders = changeIds.map(() => '?').join(',');
    const stmt = this.db.getDb().prepare(`
      DELETE FROM file_changes WHERE repo_id = ? AND id IN (${placeholders})
    `);

    stmt.run(repoId, ...changeIds);
  }

  /**
   * Apply staged changes to disk
   */
  async applyStagedChanges(repoId: number, gitOps: GitOperationsService): Promise<void> {
    const staged = await this.getStagedChanges(repoId);

    for (const change of staged) {
      if (change.change_type === 'modified' || change.change_type === 'added') {
        if (change.new_content) {
          await gitOps.writeFile(change.file_path, change.new_content);
        }
      } else if (change.change_type === 'deleted') {
        await gitOps.deleteFile(change.file_path);
      }
    }
  }

  /**
   * Clear staged changes after commit
   */
  async clearStagedChanges(repoId: number): Promise<void> {
    const stmt = this.db.getDb().prepare(`
      DELETE FROM file_changes WHERE repo_id = ? AND staged = 1
    `);

    stmt.run(repoId);
  }

  /**
   * Clear all changes for a repository
   */
  async clearAllChanges(repoId: number): Promise<void> {
    const stmt = this.db.getDb().prepare(`
      DELETE FROM file_changes WHERE repo_id = ?
    `);

    stmt.run(repoId);
  }

  /**
   * Count pending changes
   */
  async countPendingChanges(repoId: number): Promise<number> {
    const stmt = this.db.getDb().prepare(`
      SELECT COUNT(*) as count FROM file_changes WHERE repo_id = ?
    `);

    const row = stmt.get(repoId) as { count: number };
    return row.count;
  }

  /**
   * Count staged changes
   */
  async countStagedChanges(repoId: number): Promise<number> {
    const stmt = this.db.getDb().prepare(`
      SELECT COUNT(*) as count FROM file_changes WHERE repo_id = ? AND staged = 1
    `);

    const row = stmt.get(repoId) as { count: number };
    return row.count;
  }

  /**
   * Compute SHA-256 hash of content
   */
  private computeHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Map database row to FileChange object
   */
  private mapRowToFileChange(row: any): FileChange {
    return {
      id: row.id,
      repo_id: row.repo_id,
      file_path: row.file_path,
      change_type: row.change_type,
      original_content: row.original_content,
      new_content: row.new_content,
      original_hash: row.original_hash,
      new_hash: row.new_hash,
      staged: row.staged === 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
