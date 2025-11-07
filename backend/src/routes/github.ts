import { Router, Request, Response } from 'express';
import { DatabaseSchema } from '../database/schema';
import { GitHubOAuthService } from '../services/GitHubOAuthService';
import { GitHubService } from '../services/GitHubService';
import { RepoSyncService } from '../services/RepoSyncService';
import { GitOperationsService } from '../services/GitOperationsService';
import { FileEditService } from '../services/FileEditService';
import { FileIngestionService } from '../services/FileIngestionService';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rate-limit';
import * as crypto from 'crypto';
import { log } from '../utils/logger';

export function createGitHubRoutes(
  db: DatabaseSchema,
  fileIngestionService: FileIngestionService
): Router {
  const router = Router();
  const githubAuth = new GitHubOAuthService(db);
  const repoSync = new RepoSyncService(db, githubAuth, fileIngestionService);
  const fileEdit = new FileEditService(db);

  // Store OAuth state tokens in memory (in production, use Redis)
  const oauthStates = new Map<string, { userId: string; expiresAt: number }>();

  /**
   * GET /api/github/callback
   * Handle GitHub OAuth callback (GitHub redirects here)
   * This endpoint receives the code from GitHub and redirects to frontend
   * NOTE: This route does NOT require authentication as it's called by GitHub
   */
  router.get('/callback', async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        // Redirect to frontend with error
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/dashboard?github_error=missing_params`);
      }

      // Redirect to frontend with code and state
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/dashboard?github_code=${code}&github_state=${state}`);
    } catch (error: any) {
      console.error('GitHub callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/dashboard?github_error=callback_failed`);
    }
  });

  // Apply rate limiting to authenticated routes
  router.use(apiRateLimiter);

  // Apply authentication to remaining routes
  router.use(requireAuth);

  /**
   * POST /api/github/auth/initiate
   * Initiate GitHub OAuth flow
   */
  router.post('/auth/initiate', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Generate random state token
      const state = crypto.randomBytes(32).toString('hex');

      // Store state with user ID (expires in 10 minutes)
      oauthStates.set(state, {
        userId,
        expiresAt: Date.now() + 10 * 60 * 1000
      });

      // Clean up expired states
      for (const [key, value] of oauthStates.entries()) {
        if (value.expiresAt < Date.now()) {
          oauthStates.delete(key);
        }
      }

      // Generate auth URL
      const authUrl = githubAuth.generateAuthUrl(state);

      res.json({
        authUrl,
        state
      });
    } catch (error: any) {
      console.error('Failed to initiate OAuth:', error);
      res.status(500).json({ error: 'Failed to initiate GitHub OAuth' });
    }
  });

  /**
   * POST /api/github/auth/callback
   * Complete GitHub OAuth flow (called by frontend with code and state)
   */
  router.post('/auth/callback', async (req: AuthRequest, res: Response) => {
    try {
      const { code, state } = req.body;

      if (!code || !state) {
        return res.status(400).json({ error: 'Missing code or state' });
      }

      // Verify state token
      const stateData = oauthStates.get(state);
      if (!stateData) {
        return res.status(400).json({ error: 'Invalid or expired state token' });
      }

      if (stateData.expiresAt < Date.now()) {
        oauthStates.delete(state);
        return res.status(400).json({ error: 'State token expired' });
      }

      const userId = stateData.userId;
      oauthStates.delete(state);

      // Ensure user exists in database before saving GitHub integration
      // Get user info from Clerk and sync to local database
      const { getUserInfo } = await import('../middleware/auth');
      const userInfo = await getUserInfo(userId);

      if (userInfo) {
        db.syncUser({
          id: userInfo.id,
          email: userInfo.email,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          fullName: userInfo.fullName,
          imageUrl: userInfo.imageUrl,
          createdAt: userInfo.createdAt,
          metadata: userInfo.metadata,
        });
      } else {
        // If we can't get user info from Clerk, create a minimal user record
        db.syncUser({
          id: userId,
          email: null,
          firstName: null,
          lastName: null,
          fullName: 'User',
          imageUrl: '',
          createdAt: Date.now(),
        });
      }

      // Exchange code for token
      const tokenData = await githubAuth.exchangeCodeForToken(code);

      // Get GitHub user info
      const githubUser = await githubAuth.getGitHubUser(tokenData.access_token);

      // Save integration
      await githubAuth.saveIntegration(userId, tokenData, githubUser);

      res.json({
        success: true,
        user: {
          githubUsername: githubUser.login,
          githubUserId: githubUser.id.toString(),
          connectedAt: Date.now()
        }
      });
    } catch (error: any) {
      console.error('OAuth callback failed:', error);
      res.status(500).json({ error: 'Failed to complete GitHub authentication' });
    }
  });

  /**
   * GET /api/github/auth/status
   * Check GitHub connection status
   */
  router.get('/auth/status', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Sync user info from Clerk to ensure user exists in database
      const { getUserInfo } = await import('../middleware/auth');
      const userInfo = await getUserInfo(userId);
      if (userInfo) {
        db.syncUser(userInfo);
      }

      const integration = await githubAuth.getIntegration(userId);

      if (!integration) {
        return res.json({
          connected: false,
          githubUsername: null,
          scopes: []
        });
      }

      res.json({
        connected: true,
        githubUsername: integration.github_username,
        scopes: integration.scopes
      });
    } catch (error: any) {
      console.error('Failed to check status:', error);
      res.status(500).json({ error: 'Failed to check GitHub connection status' });
    }
  });

  /**
   * DELETE /api/github/auth/disconnect
   * Disconnect GitHub integration
   */
  router.delete('/auth/disconnect', async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await githubAuth.revokeToken(userId);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      res.status(500).json({ error: 'Failed to disconnect GitHub' });
    }
  });

  /**
   * GET /api/github/repositories
   * List user's GitHub repositories
   */
  router.get('/repositories', async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const integration = await githubAuth.getIntegration(userId);
      if (!integration) {
        return res.status(400).json({ error: 'GitHub not connected' });
      }

      const githubService = new GitHubService(integration.access_token);

      const { page, perPage, type, sort } = req.query;
      const result = await githubService.listRepositories({
        page: page ? parseInt(page as string) : 1,
        perPage: perPage ? parseInt(perPage as string) : 30,
        type: (type as any) || 'owner',
        sort: (sort as any) || 'updated'
      });


      // Transform snake_case to camelCase for frontend
      const transformedRepos = result.repositories.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch,
        language: repo.language,
        stargazersCount: repo.stargazers_count || 0,
        forksCount: repo.forks_count || 0,
        updatedAt: repo.updated_at,
      }));

      res.json({
        repositories: transformedRepos,
        totalCount: result.totalCount
      });
    } catch (error: any) {
      log.error('Failed to list repositories:', error);
      res.status(500).json({ error: 'Failed to fetch repositories' });
    }
  });

  /**
   * POST /api/github/import
   * Import a GitHub repository
   */
  router.post('/import', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { repoId, repoFullName, cloneUrl, defaultBranch, projectName } = req.body;

      log.info('📦 Import repository request:', {
        userId,
        repoId,
        repoFullName,
        cloneUrl: cloneUrl ? 'present' : 'missing',
        defaultBranch,
        projectName,
        allFields: Object.keys(req.body),
      });

      if (!repoId || !repoFullName || !cloneUrl || !defaultBranch) {
        log.error('❌ Missing required fields:', {
          hasRepoId: !!repoId,
          hasRepoFullName: !!repoFullName,
          hasCloneUrl: !!cloneUrl,
          hasDefaultBranch: !!defaultBranch,
        });
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const [owner, repoName] = repoFullName.split('/');

      const result = await repoSync.importRepository({
        userId,
        repoId: String(repoId), // Convert number to string for path operations
        repoFullName,
        owner,
        repoName,
        cloneUrl,
        defaultBranch,
        projectName
      });

      res.json({
        projectId: result.projectId,
        repoId: result.repoId,
        status: 'importing',
        message: 'Repository import started. This may take a few minutes.'
      });
    } catch (error: any) {
      log.error('Failed to import repository:', error);
      res.status(500).json({ error: error.message || 'Failed to import repository' });
    }
  });

  /**
   * GET /api/github/import/status/:projectId
   * Check import/sync status and file ingestion progress
   */
  router.get('/import/status/:projectId', async (req: Request, res: Response) => {
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

      const syncStatus = await repoSync.getSyncStatus(projectId);
      const ingestionProgress = await fileIngestionService.getIngestionProgress(projectId);

      res.json({
        // Git sync status
        syncStatus: syncStatus.status,
        syncError: syncStatus.error,
        lastSynced: syncStatus.lastSynced,

        // File ingestion progress
        ingestion: ingestionProgress || {
          status: 'pending',
          totalFiles: 0,
          processedFiles: 0,
          totalChunks: 0,
          currentFile: null,
          error: null,
          startedAt: null,
          completedAt: null,
        }
      });
    } catch (error: any) {
      log.error('Failed to get status:', error);
      res.status(500).json({ error: 'Failed to get sync status' });
    }
  });

  /**
   * POST /api/projects/:projectId/sync
   * Sync repository (pull latest changes)
   */
  router.post('/:projectId/sync', async (req: Request, res: Response) => {
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

      const result = await repoSync.syncRepository(projectId);

      res.json(result);
    } catch (error: any) {
      log.error('Failed to sync repository:', error);
      res.status(500).json({ error: error.message || 'Failed to sync repository' });
    }
  });

  /**
   * GET /api/projects/:projectId/branches
   * List branches
   */
  router.get('/:projectId/branches', async (req: Request, res: Response) => {
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

      const gitOps = new GitOperationsService(repo.local_path);
      const branches = await gitOps.listBranches();
      const currentBranch = await gitOps.getCurrentBranch();

      res.json({
        branches: branches.map(name => ({ name })),
        current: currentBranch
      });
    } catch (error: any) {
      log.error('Failed to list branches:', error);
      res.status(500).json({ error: 'Failed to list branches' });
    }
  });

  /**
   * POST /api/projects/:projectId/branches
   * Create or switch branch
   */
  router.post('/:projectId/branches', async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.userId;
      const { projectId } = req.params;
      const { action, branchName, baseBranch } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!action || !branchName) {
        return res.status(400).json({ error: 'Missing required fields' });
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

      if (action === 'create') {
        await gitOps.checkout(branchName, true);
      } else if (action === 'switch') {
        await gitOps.checkout(branchName, false);
      } else {
        return res.status(400).json({ error: 'Invalid action' });
      }

      // Update current branch in database
      await repoSync.updateCurrentBranch(repo.id, branchName);

      res.json({
        success: true,
        currentBranch: branchName
      });
    } catch (error: any) {
      log.error('Branch operation failed:', error);
      res.status(500).json({ error: error.message || 'Branch operation failed' });
    }
  });

  return router;
}
