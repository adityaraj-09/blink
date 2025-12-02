import { Router } from 'express';
import { DatabaseSchema } from '../database/schema';
import { z } from 'zod';
import { requireAuth, AuthRequest, getUserInfo } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rate-limit';

// Validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
});

const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  language: z.string().optional(),
  dateFormat: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  projectUpdates: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  profileVisibility: z.enum(['public', 'private']).optional(),
  showEmail: z.boolean().optional(),
  showActivity: z.boolean().optional(),
});

export function createUsersRouter(db: DatabaseSchema): Router {
  const router = Router();

  // Apply rate limiting
  router.use(apiRateLimiter);

  // Apply authentication to all routes
  router.use(requireAuth);

  /**
   * GET /api/users/me
   * Get current user profile
   */
  router.get('/me', async (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Sync user info from Clerk
      const userInfo = await getUserInfo(req.auth.userId);
      if (userInfo) {
        db.syncUser(userInfo);
      }

      const dbConn = db.getDb();
      const user = dbConn.prepare(`
        SELECT user_id, email, first_name, last_name, full_name,
               image_url, created_at, last_login_at, metadata
        FROM users
        WHERE user_id = ?
      `).get(req.auth.userId) as any;

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Get preferences
      const preferences = dbConn.prepare(`
        SELECT * FROM user_preferences WHERE user_id = ?
      `).get(req.auth.userId) as any;

      res.json({
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: user.full_name,
        imageUrl: user.image_url,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        bio: preferences?.bio || null,
        location: preferences?.location || null,
        website: preferences?.website || null,
        metadata: user.metadata ? JSON.parse(user.metadata) : null,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get user profile', details: (err as Error).message });
    }
  });

  /**
   * PUT /api/users/me
   * Update current user profile
   */
  router.put('/me', async (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const body = updateProfileSchema.parse(req.body);
      const dbConn = db.getDb();
      const now = Date.now();

      // Update user table (firstName, lastName)
      const userUpdates: string[] = [];
      const userValues: any[] = [];

      if (body.firstName !== undefined) {
        userUpdates.push('first_name = ?');
        userValues.push(body.firstName);
      }
      if (body.lastName !== undefined) {
        userUpdates.push('last_name = ?');
        userValues.push(body.lastName);
      }

      if (body.firstName !== undefined || body.lastName !== undefined) {
        const fullName = `${body.firstName || ''} ${body.lastName || ''}`.trim();
        userUpdates.push('full_name = ?');
        userValues.push(fullName);
      }

      if (userUpdates.length > 0) {
        userValues.push(req.auth.userId);
        dbConn.prepare(`
          UPDATE users SET ${userUpdates.join(', ')}
          WHERE user_id = ?
        `).run(...userValues);
      }

      // Update or create preferences (bio, location, website)
      const prefUpdates: string[] = [];
      const prefValues: any[] = [];

      if (body.bio !== undefined) {
        prefUpdates.push('bio = ?');
        prefValues.push(body.bio || null);
      }
      if (body.location !== undefined) {
        prefUpdates.push('location = ?');
        prefValues.push(body.location || null);
      }
      if (body.website !== undefined) {
        prefUpdates.push('website = ?');
        prefValues.push(body.website || null);
      }

      if (prefUpdates.length > 0) {
        prefUpdates.push('updated_at = ?');
        prefValues.push(now);
        prefValues.push(req.auth.userId);

        // Insert or update preferences
        const existingPrefs = dbConn.prepare('SELECT 1 FROM user_preferences WHERE user_id = ?')
          .get(req.auth.userId);

        if (existingPrefs) {
          dbConn.prepare(`
            UPDATE user_preferences SET ${prefUpdates.join(', ')}
            WHERE user_id = ?
          `).run(...prefValues);
        } else {
          // Create default preferences with provided values
          dbConn.prepare(`
            INSERT INTO user_preferences (user_id, bio, location, website, updated_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            req.auth.userId,
            body.bio || null,
            body.location || null,
            body.website || null,
            now
          );
        }
      }

      res.json({ message: 'Profile updated successfully' });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: err.issues });
      } else {
        res.status(500).json({ error: 'Failed to update profile', details: (err as Error).message });
      }
    }
  });

  /**
   * GET /api/users/me/stats
   * Get user statistics
   */
  router.get('/me/stats', (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dbConn = db.getDb();

      // Get project count
      const projectCount = dbConn.prepare(`
        SELECT COUNT(*) as count FROM projects WHERE user_id = ?
      `).get(req.auth.userId) as { count: number };

      // Get total files
      const totalFiles = dbConn.prepare(`
        SELECT COUNT(DISTINCT f.file_id) as count
        FROM files f
        JOIN projects p ON f.project_id = p.project_id
        WHERE p.user_id = ?
      `).get(req.auth.userId) as { count: number };

      // Get total chunks
      const totalChunks = dbConn.prepare(`
        SELECT COUNT(*) as count
        FROM chunks c
        JOIN projects p ON c.project_id = p.project_id
        WHERE p.user_id = ?
      `).get(req.auth.userId) as { count: number };

      // Get chat message count
      const messageCount = dbConn.prepare(`
        SELECT COUNT(*) as count
        FROM chat_messages cm
        JOIN chat_sessions cs ON cm.session_id = cs.session_id
        WHERE cs.user_id = ? AND cm.role = 'user'
      `).get(req.auth.userId) as { count: number };

      // Get total commits
      const commitCount = dbConn.prepare(`
        SELECT COUNT(*) as count
        FROM commit_history ch
        JOIN git_repositories gr ON ch.repo_id = gr.id
        WHERE gr.user_id = ?
      `).get(req.auth.userId) as { count: number };

      // Check if GitHub is connected
      const githubConnected = dbConn.prepare(`
        SELECT 1 FROM github_integrations WHERE user_id = ?
      `).get(req.auth.userId);

      res.json({
        projects: projectCount.count,
        files: totalFiles.count,
        chunks: totalChunks.count,
        chatMessages: messageCount.count,
        commits: commitCount.count,
        githubConnected: !!githubConnected,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get user stats', details: (err as Error).message });
    }
  });

  /**
   * GET /api/users/me/preferences
   * Get user preferences/settings
   */
  router.get('/me/preferences', (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dbConn = db.getDb();
      const preferences = dbConn.prepare(`
        SELECT * FROM user_preferences WHERE user_id = ?
      `).get(req.auth.userId) as any;

      // Return defaults if no preferences exist
      const defaultPrefs = {
        theme: 'dark',
        language: 'en-US',
        dateFormat: 'MM/DD/YYYY',
        emailNotifications: true,
        pushNotifications: true,
        projectUpdates: true,
        securityAlerts: true,
        weeklyDigest: false,
        profileVisibility: 'public',
        showEmail: false,
        showActivity: true,
      };

      if (!preferences) {
        res.json(defaultPrefs);
        return;
      }

      res.json({
        theme: preferences.theme,
        language: preferences.language,
        dateFormat: preferences.date_format,
        emailNotifications: !!preferences.email_notifications,
        pushNotifications: !!preferences.push_notifications,
        projectUpdates: !!preferences.project_updates,
        securityAlerts: !!preferences.security_alerts,
        weeklyDigest: !!preferences.weekly_digest,
        profileVisibility: preferences.profile_visibility,
        showEmail: !!preferences.show_email,
        showActivity: !!preferences.show_activity,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get preferences', details: (err as Error).message });
    }
  });

  /**
   * PUT /api/users/me/preferences
   * Update user preferences/settings
   */
  router.put('/me/preferences', (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const body = updatePreferencesSchema.parse(req.body);
      const dbConn = db.getDb();
      const now = Date.now();

      // Check if preferences exist
      const existingPrefs = dbConn.prepare('SELECT 1 FROM user_preferences WHERE user_id = ?')
        .get(req.auth.userId);

      const updates: string[] = [];
      const values: any[] = [];

      if (body.theme !== undefined) {
        updates.push('theme = ?');
        values.push(body.theme);
      }
      if (body.language !== undefined) {
        updates.push('language = ?');
        values.push(body.language);
      }
      if (body.dateFormat !== undefined) {
        updates.push('date_format = ?');
        values.push(body.dateFormat);
      }
      if (body.emailNotifications !== undefined) {
        updates.push('email_notifications = ?');
        values.push(body.emailNotifications ? 1 : 0);
      }
      if (body.pushNotifications !== undefined) {
        updates.push('push_notifications = ?');
        values.push(body.pushNotifications ? 1 : 0);
      }
      if (body.projectUpdates !== undefined) {
        updates.push('project_updates = ?');
        values.push(body.projectUpdates ? 1 : 0);
      }
      if (body.securityAlerts !== undefined) {
        updates.push('security_alerts = ?');
        values.push(body.securityAlerts ? 1 : 0);
      }
      if (body.weeklyDigest !== undefined) {
        updates.push('weekly_digest = ?');
        values.push(body.weeklyDigest ? 1 : 0);
      }
      if (body.profileVisibility !== undefined) {
        updates.push('profile_visibility = ?');
        values.push(body.profileVisibility);
      }
      if (body.showEmail !== undefined) {
        updates.push('show_email = ?');
        values.push(body.showEmail ? 1 : 0);
      }
      if (body.showActivity !== undefined) {
        updates.push('show_activity = ?');
        values.push(body.showActivity ? 1 : 0);
      }

      updates.push('updated_at = ?');
      values.push(now);
      values.push(req.auth.userId);

      if (existingPrefs) {
        dbConn.prepare(`
          UPDATE user_preferences SET ${updates.join(', ')}
          WHERE user_id = ?
        `).run(...values);
      } else {
        // Create new preferences with defaults for unspecified fields
        dbConn.prepare(`
          INSERT INTO user_preferences (
            user_id, theme, language, date_format,
            email_notifications, push_notifications, project_updates,
            security_alerts, weekly_digest, profile_visibility,
            show_email, show_activity, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.auth.userId,
          body.theme || 'dark',
          body.language || 'en-US',
          body.dateFormat || 'MM/DD/YYYY',
          body.emailNotifications !== undefined ? (body.emailNotifications ? 1 : 0) : 1,
          body.pushNotifications !== undefined ? (body.pushNotifications ? 1 : 0) : 1,
          body.projectUpdates !== undefined ? (body.projectUpdates ? 1 : 0) : 1,
          body.securityAlerts !== undefined ? (body.securityAlerts ? 1 : 0) : 1,
          body.weeklyDigest !== undefined ? (body.weeklyDigest ? 1 : 0) : 0,
          body.profileVisibility || 'public',
          body.showEmail !== undefined ? (body.showEmail ? 1 : 0) : 0,
          body.showActivity !== undefined ? (body.showActivity ? 1 : 0) : 1,
          now
        );
      }

      res.json({ message: 'Preferences updated successfully' });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: err.issues });
      } else {
        res.status(500).json({ error: 'Failed to update preferences', details: (err as Error).message });
      }
    }
  });

  /**
   * GET /api/users/me/activity
   * Get recent user activity
   */
  router.get('/me/activity', (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const dbConn = db.getDb();

      // Get recent commits
      const recentCommits = dbConn.prepare(`
        SELECT ch.commit_sha, ch.message, ch.committed_at, ch.author_name,
               gr.repo_name, gr.owner, p.project_name
        FROM commit_history ch
        JOIN git_repositories gr ON ch.repo_id = gr.id
        JOIN projects p ON gr.project_id = p.project_id
        WHERE gr.user_id = ?
        ORDER BY ch.committed_at DESC
        LIMIT ?
      `).all(req.auth.userId, Math.min(limit, 50)) as any[];

      // Get recent projects
      const recentProjects = dbConn.prepare(`
        SELECT project_id, project_name, created_at, updated_at
        FROM projects
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT ?
      `).all(req.auth.userId, Math.min(limit, 50)) as any[];

      const activity = [
        ...recentCommits.map(c => ({
          type: 'commit',
          action: 'committed',
          target: c.message,
          time: c.committed_at,
          projectName: c.project_name,
          repoName: `${c.owner}/${c.repo_name}`,
        })),
        ...recentProjects.map(p => ({
          type: 'project',
          action: p.created_at === p.updated_at ? 'created' : 'updated',
          target: p.project_name,
          time: p.updated_at,
          projectId: p.project_id,
        })),
      ]
        .sort((a, b) => b.time - a.time)
        .slice(0, limit);

      res.json({ activity });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get activity', details: (err as Error).message });
    }
  });

  return router;
}
