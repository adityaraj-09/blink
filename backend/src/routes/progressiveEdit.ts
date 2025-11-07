import { Router, Request, Response } from 'express';
import { DatabaseSchema } from '../database/schema';
import { ProgressiveEditService } from '../services/ProgressiveEditService';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rate-limit';
import { z } from 'zod';
import { ProgressiveEditRequest, ProgressiveEditInitResponse } from '../types/progressive-edit';

// Validation schemas
const progressiveEditRequestSchema = z.object({
  projectId: z.string(),
  message: z.string().min(1),
  sessionId: z.string().optional()
});

export function createProgressiveEditRoutes(
  db: DatabaseSchema,
  progressiveEditService: ProgressiveEditService
): Router {
  const router = Router();

  // Apply rate limiting
  router.use(apiRateLimiter);

  // Apply authentication to all routes
  router.use(requireAuth);

  /**
   * POST /api/ai/edit/progressive
   * Initiate progressive code editing (returns taskId immediately)
   */
  router.post('/progressive', async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const body = progressiveEditRequestSchema.parse(req.body);

      // Verify user owns project
      if (!db.userOwnsProject(userId, body.projectId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Initiate task (returns immediately, processing happens in background)
      const taskId = await progressiveEditService.initiateProgressiveEdit(
        body.projectId,
        userId,
        body.message,
        body.sessionId
      );

      const response: ProgressiveEditInitResponse = {
        taskId,
        status: 'planning',
        message: 'AI is planning the changes. Poll /api/ai/edit/tasks/{taskId}/status for progress.'
      };

      res.json(response);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
      } else {
        console.error('Progressive edit initiation failed:', error);
        res.status(500).json({ error: error.message || 'Failed to initiate progressive edit' });
      }
    }
  });

  /**
   * GET /api/ai/edit/tasks/:taskId/status
   * Get task status and progress (polling endpoint)
   */
  router.get('/tasks/:taskId/status', async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { taskId } = req.params;

      const status = await progressiveEditService.getTaskStatus(taskId);

      if (!status) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Verify user owns the project associated with this task
      const taskRow = db.getDb().prepare(`
        SELECT user_id FROM ai_edit_tasks WHERE task_id = ?
      `).get(taskId) as any;

      if (!taskRow || taskRow.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.json(status);
    } catch (error: any) {
      console.error('Failed to get task status:', error);
      res.status(500).json({ error: error.message || 'Failed to get task status' });
    }
  });

  /**
   * DELETE /api/ai/edit/tasks/:taskId
   * Cancel a running task
   */
  router.delete('/tasks/:taskId', async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { taskId } = req.params;

      // Verify ownership
      const taskRow = db.getDb().prepare(`
        SELECT user_id FROM ai_edit_tasks WHERE task_id = ?
      `).get(taskId) as any;

      if (!taskRow) {
        return res.status(404).json({ error: 'Task not found' });
      }

      if (taskRow.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await progressiveEditService.cancelTask(taskId);

      res.json({
        success: true,
        message: 'Task cancelled'
      });
    } catch (error: any) {
      console.error('Failed to cancel task:', error);
      res.status(500).json({ error: error.message || 'Failed to cancel task' });
    }
  });

  /**
   * GET /api/ai/edit/tasks
   * List user's tasks
   */
  router.get('/tasks', async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { limit } = req.query;
      const limitNum = limit ? parseInt(limit as string) : 20;

      const tasks = await progressiveEditService.listUserTasks(userId, limitNum);

      res.json({
        success: true,
        tasks
      });
    } catch (error: any) {
      console.error('Failed to list tasks:', error);
      res.status(500).json({ error: error.message || 'Failed to list tasks' });
    }
  });

  return router;
}
