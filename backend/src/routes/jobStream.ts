import { Router, Request, Response } from 'express';
import { DatabaseSchema } from '../database/schema';
import { JobQueue } from '../services/JobQueue';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rate-limit';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Validation schemas
const startJobSchema = z.object({
  projectId: z.string(),
  query: z.string().min(1),
});

export function createJobStreamRoutes(db: DatabaseSchema): Router {
  const router = Router();
  const queue = JobQueue.getInstance();

  // Apply rate limiting
  router.use(apiRateLimiter);

  // Apply authentication to all routes
  router.use(requireAuth);

  /**
   * POST /api/jobs/start
   * Start a new job and add to queue
   */
  router.post('/start', async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const body = startJobSchema.parse(req.body);

      // Verify user owns project
      if (!db.userOwnsProject(userId, body.projectId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Create job in database
      const jobId = uuidv4();
      const now = Date.now();

      db.getDb().prepare(`
        INSERT INTO ai_edit_jobs (
          job_id, project_id, user_id, query, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'pending', ?, ?)
      `).run(jobId, body.projectId, userId, body.query, now, now);

      // Add to queue
      queue.addJob({
        jobId,
        projectId: body.projectId,
        userId,
        query: body.query,
        createdAt: now,
      });

      console.log(`[JobStream] Created job ${jobId} for user ${userId}`);

      res.json({
        success: true,
        jobId,
        message: 'Job created and added to queue. Connect to /api/jobs/:jobId/stream for progress updates.',
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.issues });
      } else {
        console.error('Failed to start job:', error);
        res.status(500).json({ error: error.message || 'Failed to start job' });
      }
    }
  });

  /**
   * GET /api/jobs/:jobId/stream
   * SSE endpoint for real-time job progress
   */
  router.get('/:jobId/stream', async (req: Request, res: Response) => {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { jobId } = req.params;

    // Verify job exists and user owns it
    const job = db.getDb().prepare(`
      SELECT * FROM ai_edit_jobs WHERE job_id = ?
    `).get(jobId) as any;

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    console.log(`[JobStream] SSE connection opened for job ${jobId}`);

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', jobId })}\n\n`);

    // Send current job status if already started
    if (job.status !== 'pending') {
      res.write(`data: ${JSON.stringify({
        type: 'job:status',
        jobId,
        status: job.status,
        explanation: job.plan_explanation,
      })}\n\n`);
    }

    // Event listeners
    const onJobPlanning = (jId: string, message: string) => {
      if (jId === jobId) {
        res.write(`data: ${JSON.stringify({ type: 'job:planning', jobId: jId, message })}\n\n`);
      }
    };

    const onJobPlanComplete = (jId: string, explanation: string, totalSteps: number) => {
      if (jId === jobId) {
        res.write(`data: ${JSON.stringify({
          type: 'job:plan:complete',
          jobId: jId,
          explanation,
          totalSteps,
        })}\n\n`);
      }
    };

    const onStepStart = (jId: string, stepNumber: number, title: string) => {
      if (jId === jobId) {
        res.write(`data: ${JSON.stringify({
          type: 'step:start',
          jobId: jId,
          stepNumber,
          title,
        })}\n\n`);
      }
    };

    const onStepComplete = (jId: string, stepNumber: number, edit: any) => {
      if (jId === jobId) {
        res.write(`data: ${JSON.stringify({
          type: 'step:complete',
          jobId: jId,
          stepNumber,
          edit,
        })}\n\n`);
      }
    };

    const onStepFailed = (jId: string, stepNumber: number, error: string) => {
      if (jId === jobId) {
        res.write(`data: ${JSON.stringify({
          type: 'step:failed',
          jobId: jId,
          stepNumber,
          error,
        })}\n\n`);
      }
    };

    const onJobProgress = (jId: string, completed: number, total: number) => {
      if (jId === jobId) {
        res.write(`data: ${JSON.stringify({
          type: 'job:progress',
          jobId: jId,
          completed,
          total,
          percentage: Math.round((completed / total) * 100),
        })}\n\n`);
      }
    };

    const onJobComplete = (jId: string, summary: any) => {
      if (jId === jobId) {
        res.write(`data: ${JSON.stringify({
          type: 'job:complete',
          jobId: jId,
          summary,
        })}\n\n`);
        // Close connection after completion
        setTimeout(() => {
          res.end();
        }, 1000);
      }
    };

    const onJobFailed = (jId: string, error: string) => {
      if (jId === jobId) {
        res.write(`data: ${JSON.stringify({
          type: 'job:failed',
          jobId: jId,
          error,
        })}\n\n`);
        // Close connection after failure
        setTimeout(() => {
          res.end();
        }, 1000);
      }
    };

    // Register listeners
    queue.on('job:planning', onJobPlanning);
    queue.on('job:plan:complete', onJobPlanComplete);
    queue.on('step:start', onStepStart);
    queue.on('step:complete', onStepComplete);
    queue.on('step:failed', onStepFailed);
    queue.on('job:progress', onJobProgress);
    queue.on('job:complete', onJobComplete);
    queue.on('job:failed', onJobFailed);

    // Cleanup on connection close
    req.on('close', () => {
      console.log(`[JobStream] SSE connection closed for job ${jobId}`);
      queue.off('job:planning', onJobPlanning);
      queue.off('job:plan:complete', onJobPlanComplete);
      queue.off('step:start', onStepStart);
      queue.off('step:complete', onStepComplete);
      queue.off('step:failed', onStepFailed);
      queue.off('job:progress', onJobProgress);
      queue.off('job:complete', onJobComplete);
      queue.off('job:failed', onJobFailed);
      res.end();
    });

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      res.write(`: heartbeat\n\n`);
    }, 30000); // Every 30 seconds

    req.on('close', () => {
      clearInterval(heartbeat);
    });
  });

  /**
   * GET /api/jobs/:jobId/status
   * Get current job status (for polling fallback)
   */
  router.get('/:jobId/status', async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { jobId } = req.params;

      const job = db.getDb().prepare(`
        SELECT * FROM ai_edit_jobs WHERE job_id = ?
      `).get(jobId) as any;

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Get steps
      const steps = db.getDb().prepare(`
        SELECT step_id, step_number, todo_title, todo_description, file_path, status, edit_json, error_message
        FROM ai_edit_steps
        WHERE job_id = ?
        ORDER BY step_number ASC
      `).all(jobId) as any[];

      res.json({
        jobId: job.job_id,
        projectId: job.project_id,
        query: job.query,
        status: job.status,
        planExplanation: job.plan_explanation,
        finalSummary: job.final_summary ? JSON.parse(job.final_summary) : null,
        errorMessage: job.error_message,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        steps: steps.map(s => ({
          stepId: s.step_id,
          stepNumber: s.step_number,
          title: s.todo_title,
          description: s.todo_description,
          filePath: s.file_path,
          status: s.status,
          edit: s.edit_json ? JSON.parse(s.edit_json) : null,
          errorMessage: s.error_message,
        })),
      });
    } catch (error: any) {
      console.error('Failed to get job status:', error);
      res.status(500).json({ error: error.message || 'Failed to get job status' });
    }
  });

  /**
   * GET /api/jobs
   * List user's jobs
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { limit = '20', projectId } = req.query;
      const limitNum = parseInt(limit as string);

      let query = `
        SELECT job_id, project_id, query, status, created_at, completed_at, error_message
        FROM ai_edit_jobs
        WHERE user_id = ?
      `;
      const params: any[] = [userId];

      if (projectId) {
        query += ' AND project_id = ?';
        params.push(projectId);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limitNum);

      const jobs = db.getDb().prepare(query).all(...params) as any[];

      res.json({
        success: true,
        jobs: jobs.map(j => ({
          jobId: j.job_id,
          projectId: j.project_id,
          query: j.query,
          status: j.status,
          createdAt: j.created_at,
          completedAt: j.completed_at,
          errorMessage: j.error_message,
        })),
      });
    } catch (error: any) {
      console.error('Failed to list jobs:', error);
      res.status(500).json({ error: error.message || 'Failed to list jobs' });
    }
  });

  return router;
}
