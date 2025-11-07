import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseSchema } from '../database/schema';
import { GitOperationsService } from './GitOperationsService';
import { GitHubOAuthService } from './GitHubOAuthService';
import { FileIngestionService } from './FileIngestionService';

export interface ImportRepoData {
  userId: string;
  repoId: string;
  repoFullName: string;
  owner: string;
  repoName: string;
  cloneUrl: string;
  defaultBranch: string;
  projectName?: string;
  description?: string;
}

export interface SyncResult {
  success: boolean;
  filesAdded: number;
  filesModified: number;
  filesDeleted: number;
  lastCommitSha: string;
  error?: string;
}

export interface GitRepository {
  id: number;
  project_id: string;
  user_id: string;
  github_repo_id: string;
  owner: string;
  repo_name: string;
  clone_url: string;
  default_branch: string;
  current_branch: string;
  local_path: string;
  last_synced_at: number | null;
  last_commit_sha: string | null;
  sync_status: 'idle' | 'syncing' | 'error';
  sync_error: string | null;
  created_at: number;
  updated_at: number;
}

export class RepoSyncService {
  private db: DatabaseSchema;
  private githubAuth: GitHubOAuthService;
  private fileIngestion: FileIngestionService | null;
  private storageBasePath: string;

  constructor(
    db: DatabaseSchema,
    githubAuth: GitHubOAuthService,
    fileIngestion?: FileIngestionService
  ) {
    this.db = db;
    this.githubAuth = githubAuth;
    this.fileIngestion = fileIngestion || null;
    this.storageBasePath = process.env.REPO_STORAGE_PATH || './repos';

    // Ensure storage directory exists
    if (!fs.existsSync(this.storageBasePath)) {
      fs.mkdirSync(this.storageBasePath, { recursive: true });
    }
  }

  /**
   * Import a GitHub repository
   */
  async importRepository(data: ImportRepoData): Promise<{ projectId: string; repoId: number }> {
    const now = Date.now();
    const projectId = uuidv4();

    // Get user's GitHub integration
    const integration = await this.githubAuth.getIntegration(data.userId);
    if (!integration) {
      throw new Error('GitHub not connected. Please connect your GitHub account first.');
    }

    // Create project record
    const projectStmt = this.db.getDb().prepare(`
      INSERT INTO projects (
        project_id, user_id, project_name, description,
        repository_url, is_github_repo, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `);

    projectStmt.run(
      projectId,
      data.userId,
      data.projectName || data.repoName,
      data.description || `Imported from ${data.repoFullName}`,
      data.cloneUrl,
      now,
      now
    );

    // Determine local path
    const localPath = path.join(
      this.storageBasePath,
      data.userId,
      String(data.repoId)
    );

    // Create git_repositories record
    const repoStmt = this.db.getDb().prepare(`
      INSERT INTO git_repositories (
        project_id, user_id, github_repo_id, owner, repo_name,
        clone_url, default_branch, current_branch, local_path,
        sync_status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'idle', ?, ?)
    `);

    const result = repoStmt.run(
      projectId,
      data.userId,
      data.repoId,
      data.owner,
      data.repoName,
      data.cloneUrl,
      data.defaultBranch,
      data.defaultBranch,
      localPath,
      now,
      now
    );

    const repoDbId = result.lastInsertRowid as number;

    // Start async import process
    this.startImportProcess(projectId, repoDbId, localPath, data.cloneUrl, integration.access_token)
      .catch(error => {
        console.error('Import process failed:', error);
        this.updateSyncStatus(repoDbId, 'error', error.message);
      });

    return {
      projectId,
      repoId: repoDbId
    };
  }

  /**
   * Start the import process (async)
   */
  private async startImportProcess(
    projectId: string,
    repoId: number,
    localPath: string,
    cloneUrl: string,
    accessToken: string
  ): Promise<void> {
    // Update status to syncing
    await this.updateSyncStatus(repoId, 'syncing', null);

    try {
      // Clone repository
      console.log(`🔄 Cloning repository to ${localPath}...`);
      const gitOps = await GitOperationsService.clone(cloneUrl, localPath, accessToken);

      // Get latest commit SHA
      const latestSha = await gitOps.getLatestCommitSha();

      // Update repository with commit SHA and status
      const now = Date.now();
      const stmt = this.db.getDb().prepare(`
        UPDATE git_repositories
        SET last_synced_at = ?, last_commit_sha = ?, sync_status = 'idle', sync_error = NULL, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(now, latestSha, now, repoId);

      console.log(`✅ Repository cloned successfully. Starting file ingestion...`);

      // Start file ingestion in background
      if (this.fileIngestion) {
        this.fileIngestion.ingestRepository(projectId, localPath)
          .catch(error => {
            console.error('❌ File ingestion failed:', error);
            // Ingestion failure is tracked separately in project metadata
          });
      } else {
        console.warn('⚠️  FileIngestionService not configured. Skipping file ingestion.');
      }
    } catch (error: any) {
      console.error('❌ Clone failed:', error);
      await this.updateSyncStatus(repoId, 'error', error.message);
      throw error;
    }
  }

  /**
   * Sync repository (pull latest changes)
   */
  async syncRepository(projectId: string): Promise<SyncResult> {
    // Get repository record
    const repo = await this.getRepositoryByProjectId(projectId);
    if (!repo) {
      throw new Error('Repository not found');
    }

    // Get user's GitHub integration
    const integration = await this.githubAuth.getIntegration(repo.user_id);
    if (!integration) {
      throw new Error('GitHub not connected');
    }

    // Update status to syncing
    await this.updateSyncStatus(repo.id, 'syncing', null);

    try {
      const gitOps = new GitOperationsService(repo.local_path);

      // Store old commit SHA
      const oldSha = repo.last_commit_sha;

      // Pull latest changes
      const pullResult = await gitOps.pull(repo.current_branch);

      // Get new commit SHA
      const newSha = await gitOps.getLatestCommitSha();

      // Detect changed files (if commits changed)
      let filesAdded = 0;
      let filesModified = 0;
      let filesDeleted = 0;

      if (oldSha !== newSha) {
        // Get diff summary to count changes
        const diffSummary = await gitOps.getDiffSummary();
        filesModified = diffSummary.filter(f => f.type === 'modified').length;
        filesAdded = diffSummary.filter(f => f.type === 'added').length;
        filesDeleted = diffSummary.filter(f => f.type === 'deleted').length;
      }

      // Update repository record
      const now = Date.now();
      const stmt = this.db.getDb().prepare(`
        UPDATE git_repositories
        SET last_synced_at = ?, last_commit_sha = ?, sync_status = 'idle', sync_error = NULL, updated_at = ?
        WHERE id = ?
      `);

      stmt.run(now, newSha, now, repo.id);

      return {
        success: true,
        filesAdded,
        filesModified,
        filesDeleted,
        lastCommitSha: newSha
      };
    } catch (error: any) {
      await this.updateSyncStatus(repo.id, 'error', error.message);
      return {
        success: false,
        filesAdded: 0,
        filesModified: 0,
        filesDeleted: 0,
        lastCommitSha: repo.last_commit_sha || '',
        error: error.message
      };
    }
  }

  /**
   * Get repository by project ID
   */
  async getRepositoryByProjectId(projectId: string): Promise<GitRepository | null> {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM git_repositories WHERE project_id = ?
    `);

    const row = stmt.get(projectId) as any;
    if (!row) {
      return null;
    }

    return this.mapRowToGitRepository(row);
  }

  /**
   * Get repository by ID
   */
  async getRepositoryById(repoId: number): Promise<GitRepository | null> {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM git_repositories WHERE id = ?
    `);

    const row = stmt.get(repoId) as any;
    if (!row) {
      return null;
    }

    return this.mapRowToGitRepository(row);
  }

  /**
   * List user's repositories
   */
  async listUserRepositories(userId: string): Promise<GitRepository[]> {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM git_repositories WHERE user_id = ? ORDER BY updated_at DESC
    `);

    const rows = stmt.all(userId) as any[];
    return rows.map(row => this.mapRowToGitRepository(row));
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(
    repoId: number,
    status: 'idle' | 'syncing' | 'error',
    error: string | null
  ): Promise<void> {
    const now = Date.now();
    const stmt = this.db.getDb().prepare(`
      UPDATE git_repositories
      SET sync_status = ?, sync_error = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(status, error, now, repoId);
  }

  /**
   * Update current branch
   */
  async updateCurrentBranch(repoId: number, branch: string): Promise<void> {
    const now = Date.now();
    const stmt = this.db.getDb().prepare(`
      UPDATE git_repositories
      SET current_branch = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(branch, now, repoId);
  }

  /**
   * Delete repository and cleanup
   */
  async deleteRepository(projectId: string): Promise<void> {
    const repo = await this.getRepositoryByProjectId(projectId);
    if (!repo) {
      return;
    }

    // Delete local files
    try {
      if (fs.existsSync(repo.local_path)) {
        fs.rmSync(repo.local_path, { recursive: true, force: true });
      }
    } catch (error: any) {
      console.error('Failed to delete local repository:', error);
    }

    // Delete from database (cascades to file_changes and commit_history)
    const stmt = this.db.getDb().prepare(`
      DELETE FROM git_repositories WHERE project_id = ?
    `);

    stmt.run(projectId);

    // Delete project
    const projectStmt = this.db.getDb().prepare(`
      DELETE FROM projects WHERE project_id = ?
    `);

    projectStmt.run(projectId);
  }

  /**
   * Get sync progress/status
   */
  async getSyncStatus(projectId: string): Promise<{
    status: string;
    error: string | null;
    lastSynced: number | null;
  }> {
    const repo = await this.getRepositoryByProjectId(projectId);
    if (!repo) {
      throw new Error('Repository not found');
    }

    return {
      status: repo.sync_status,
      error: repo.sync_error,
      lastSynced: repo.last_synced_at
    };
  }

  /**
   * Map database row to GitRepository object
   */
  private mapRowToGitRepository(row: any): GitRepository {
    return {
      id: row.id,
      project_id: row.project_id,
      user_id: row.user_id,
      github_repo_id: row.github_repo_id,
      owner: row.owner,
      repo_name: row.repo_name,
      clone_url: row.clone_url,
      default_branch: row.default_branch,
      current_branch: row.current_branch,
      local_path: row.local_path,
      last_synced_at: row.last_synced_at,
      last_commit_sha: row.last_commit_sha,
      sync_status: row.sync_status,
      sync_error: row.sync_error,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
