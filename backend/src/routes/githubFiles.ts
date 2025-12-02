import { Router, Request, Response } from 'express';
import { DatabaseSchema } from '../database/schema';
import { GitHubOAuthService } from '../services/GitHubOAuthService';
import { RepoSyncService } from '../services/RepoSyncService';
import { GitOperationsService } from '../services/GitOperationsService';
import { FileEditService } from '../services/FileEditService';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rate-limit';

export function createGitHubFileRoutes(db: DatabaseSchema): Router {
  const router = Router();
  const githubAuth = new GitHubOAuthService(db);
  const repoSync = new RepoSyncService(db, githubAuth);
  const fileEdit = new FileEditService(db);

  // Apply rate limiting
  router.use(apiRateLimiter);

  // Apply authentication to all routes
  router.use(requireAuth);

  /**
   * GET /api/projects/:projectId/files
   * Get file content (filePath sent as query parameter)
   */
  router.get('/:projectId/files', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      const { projectId } = req.params;
      const filePath = req.query.path as string;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!filePath) {
        return res.status(400).json({ error: 'File path is required (use ?path=...)' });
      }

      // Verify user owns project
      if (!db.userOwnsProject(userId, projectId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const repo = await repoSync.getRepositoryByProjectId(projectId);
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found' });
      }

      const gitOps = new GitOperationsService(repo.local_path);

      // Check if there's a pending change for this file
      const change = await fileEdit.getChange(repo.id, filePath);
      let content: string;
      let hasLocalChanges = false;

      if (change && change.new_content) {
        // Return modified content
        content = change.new_content;
        hasLocalChanges = true;
      } else {
        // Return current file content
        content = await gitOps.readFile(filePath);
      }

      res.json({
        path: filePath,
        content,
        hasLocalChanges,
        changeType: change?.change_type || null,
        staged: change?.staged || false
      });
    } catch (error: any) {
      console.error('Failed to read file:', error);
      res.status(500).json({ error: error.message || 'Failed to read file' });
    }
  });

  /**
   * PUT /api/projects/:projectId/files
   * Modify file content (filePath sent as query parameter)
   */
  router.put('/:projectId/files', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      const { projectId } = req.params;
      const filePath = req.query.path as string;
      const { content } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!filePath) {
        return res.status(400).json({ error: 'File path is required (use ?path=...)' });
      }

      if (content === undefined) {
        return res.status(400).json({ error: 'Content is required' });
      }

      // Verify user owns project
      if (!db.userOwnsProject(userId, projectId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const repo = await repoSync.getRepositoryByProjectId(projectId);
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found' });
      }

      const gitOps = new GitOperationsService(repo.local_path);

      // Track the change (stored in DB, not written to disk yet)
      const change = await fileEdit.trackChange(repo.id, filePath, content, gitOps);

      res.json({
        success: true,
        changeId: change.id,
        oldHash: change.original_hash,
        newHash: change.new_hash,
        changeType: change.change_type
      });
    } catch (error: any) {
      console.error('Failed to modify file:', error);
      res.status(500).json({ error: error.message || 'Failed to modify file' });
    }
  });

  /**
   * DELETE /api/projects/:projectId/files
   * Delete file (filePath sent as query parameter)
   */
  router.delete('/:projectId/files', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      const { projectId } = req.params;
      const filePath = req.query.path as string;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!filePath) {
        return res.status(400).json({ error: 'File path is required (use ?path=...)' });
      }

      // Verify user owns project
      if (!db.userOwnsProject(userId, projectId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const repo = await repoSync.getRepositoryByProjectId(projectId);
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found' });
      }

      const gitOps = new GitOperationsService(repo.local_path);

      // Track the deletion
      const change = await fileEdit.trackDeletion(repo.id, filePath, gitOps);

      res.json({
        success: true,
        changeId: change.id
      });
    } catch (error: any) {
      console.error('Failed to delete file:', error);
      res.status(500).json({ error: error.message || 'Failed to delete file' });
    }
  });

  /**
   * GET /api/projects/:projectId/changes
   * List pending changes
   */
  router.get('/:projectId/changes', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      const { projectId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify user owns project
      if (!db.userOwnsProject(userId, projectId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const repo = await repoSync.getRepositoryByProjectId(projectId);
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found' });
      }

      const changes = await fileEdit.getPendingChanges(repo.id);

      res.json({
        changes: changes.map(c => ({
          id: c.id,
          filePath: c.file_path,
          changeType: c.change_type,
          staged: c.staged,
          modifiedAt: c.updated_at
        })),
        totalChanges: changes.length
      });
    } catch (error: any) {
      console.error('Failed to list changes:', error);
      res.status(500).json({ error: 'Failed to list changes' });
    }
  });

  /**
   * POST /api/projects/:projectId/changes/stage
   * Stage or unstage changes
   */
  router.post('/:projectId/changes/stage', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      const { projectId } = req.params;
      const { changeIds, unstage } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify user owns project
      if (!db.userOwnsProject(userId, projectId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const repo = await repoSync.getRepositoryByProjectId(projectId);
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found' });
      }

      if (changeIds === 'all') {
        if (unstage) {
          const staged = await fileEdit.getStagedChanges(repo.id);
          const ids = staged.map(c => c.id);
          await fileEdit.unstageChanges(repo.id, ids);
          res.json({ success: true, stagedCount: 0 });
        } else {
          await fileEdit.stageAllChanges(repo.id);
          const count = await fileEdit.countStagedChanges(repo.id);
          res.json({ success: true, stagedCount: count });
        }
      } else {
        if (!Array.isArray(changeIds)) {
          return res.status(400).json({ error: 'changeIds must be an array or "all"' });
        }

        if (unstage) {
          await fileEdit.unstageChanges(repo.id, changeIds);
        } else {
          await fileEdit.stageChanges(repo.id, changeIds);
        }

        const count = await fileEdit.countStagedChanges(repo.id);
        res.json({ success: true, stagedCount: count });
      }
    } catch (error: any) {
      console.error('Failed to stage changes:', error);
      res.status(500).json({ error: 'Failed to stage changes' });
    }
  });

  /**
   * POST /api/projects/:projectId/changes/revert
   * Revert changes
   */
  router.post('/:projectId/changes/revert', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      const { projectId } = req.params;
      const { changeIds } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!Array.isArray(changeIds)) {
        return res.status(400).json({ error: 'changeIds must be an array' });
      }

      // Verify user owns project
      if (!db.userOwnsProject(userId, projectId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const repo = await repoSync.getRepositoryByProjectId(projectId);
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found' });
      }

      const gitOps = new GitOperationsService(repo.local_path);
      await fileEdit.revertChanges(repo.id, changeIds, gitOps);

      res.json({
        success: true,
        revertedCount: changeIds.length
      });
    } catch (error: any) {
      console.error('Failed to revert changes:', error);
      res.status(500).json({ error: 'Failed to revert changes' });
    }
  });

  /**
   * POST /api/projects/:projectId/commit
   * Create a commit from staged changes
   */
  router.post('/:projectId/commit', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      const { projectId } = req.params;
      const { message, description, authorName, authorEmail } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!message) {
        return res.status(400).json({ error: 'Commit message is required' });
      }

      // Verify user owns project
      if (!db.userOwnsProject(userId, projectId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const repo = await repoSync.getRepositoryByProjectId(projectId);
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found' });
      }

      // Check if there are staged changes
      const stagedCount = await fileEdit.countStagedChanges(repo.id);
      if (stagedCount === 0) {
        return res.status(400).json({ error: 'No staged changes to commit' });
      }

      const gitOps = new GitOperationsService(repo.local_path);

      // Apply staged changes to disk
      await fileEdit.applyStagedChanges(repo.id, gitOps);

      // Get staged changes for git operations
      const stagedChanges = await fileEdit.getStagedChanges(repo.id);
      const filePaths = stagedChanges.map(c => c.file_path);

      // Stage files in git
      await gitOps.stage(filePaths);

      // Create commit
      const fullMessage = description ? `${message}\n\n${description}` : message;
      const author = authorName && authorEmail ? { name: authorName, email: authorEmail } : undefined;
      const commitSha = await gitOps.commit(fullMessage, author);

      // Save commit to history
      const now = Date.now();
      const integration = await githubAuth.getIntegration(userId);
      const commitStmt = db.getDb().prepare(`
        INSERT INTO commit_history (
          repo_id, commit_sha, author_name, author_email,
          message, committed_at, pushed, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `);

      commitStmt.run(
        repo.id,
        commitSha,
        authorName || integration?.github_username || 'Unknown',
        authorEmail || 'unknown@example.com',
        fullMessage,
        now,
        now
      );

      // Clear staged changes from database
      await fileEdit.clearStagedChanges(repo.id);

      res.json({
        success: true,
        commitSha,
        filesCommitted: filePaths.length,
        branch: repo.current_branch
      });
    } catch (error: any) {
      console.error('Commit failed:', error);
      res.status(500).json({ error: error.message || 'Failed to create commit' });
    }
  });

  /**
   * POST /api/projects/:projectId/push
   * Push commits to GitHub
   */
  router.post('/:projectId/push', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      const { projectId } = req.params;
      const { branch, force } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify user owns project
      if (!db.userOwnsProject(userId, projectId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const repo = await repoSync.getRepositoryByProjectId(projectId);
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found' });
      }

      const integration = await githubAuth.getIntegration(userId);
      if (!integration) {
        return res.status(400).json({ error: 'GitHub not connected' });
      }

      const gitOps = new GitOperationsService(repo.local_path);

      const targetBranch = branch || repo.current_branch;

      // Push to GitHub
      await gitOps.push(targetBranch, integration.access_token, force || false);

      // Mark commits as pushed
      const now = Date.now();
      const updateStmt = db.getDb().prepare(`
        UPDATE commit_history
        SET pushed = 1, pushed_at = ?
        WHERE repo_id = ? AND pushed = 0
      `);

      const result = updateStmt.run(now, repo.id);

      res.json({
        success: true,
        pushedCommits: (result.changes as number) || 0,
        branch: targetBranch,
        remoteUrl: await gitOps.getRemoteUrl()
      });
    } catch (error: any) {
      console.error('Push failed:', error);
      res.status(500).json({ error: error.message || 'Failed to push to GitHub' });
    }
  });

  /**
   * GET /api/projects/:projectId/commits
   * List commit history
   */
  router.get('/:projectId/commits', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      const { projectId } = req.params;
      const { limit, offset } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify user owns project
      if (!db.userOwnsProject(userId, projectId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const repo = await repoSync.getRepositoryByProjectId(projectId);
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found' });
      }

      const limitNum = limit ? parseInt(limit as string) : 20;
      const offsetNum = offset ? parseInt(offset as string) : 0;

      const stmt = db.getDb().prepare(`
        SELECT * FROM commit_history
        WHERE repo_id = ?
        ORDER BY committed_at DESC
        LIMIT ? OFFSET ?
      `);

      const rows = stmt.all(repo.id, limitNum, offsetNum) as any[];

      const countStmt = db.getDb().prepare(`
        SELECT COUNT(*) as count FROM commit_history WHERE repo_id = ?
      `);

      const countRow = countStmt.get(repo.id) as { count: number };

      res.json({
        commits: rows.map(row => ({
          sha: row.commit_sha,
          message: row.message,
          author: row.author_name,
          email: row.author_email,
          committedAt: row.committed_at,
          pushed: row.pushed === 1,
          pushedAt: row.pushed_at
        })),
        totalCount: countRow.count
      });
    } catch (error: any) {
      console.error('Failed to list commits:', error);
      res.status(500).json({ error: 'Failed to list commits' });
    }
  });

  return router;
}
