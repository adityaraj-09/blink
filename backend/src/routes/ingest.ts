import { Router } from 'express';
import { CodeIngestionService } from '../services/code-ingestion-service';
import { DatabaseSchema } from '../database/schema';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ingestionRateLimiter } from '../middleware/rate-limit';

// Validation schemas
const chunkSchema = z.object({
  chunkText: z.string().min(1),
  startLine: z.number().int().min(1),
  endLine: z.number().int().min(1),
  chunkType: z.string().min(1),
  chunkName: z.string().optional(),
});

const fileChunksSchema = z.object({
  filePath: z.string().min(1),
  fileHash: z.string().min(1),
  language: z.string().min(1),
  chunks: z.array(chunkSchema).min(1),
});

const ingestRequestSchema = z.object({
  projectId: z.string().uuid(),
  files: z.array(fileChunksSchema).min(1),
});

const deleteFileSchema = z.object({
  projectId: z.string().uuid(),
  filePath: z.string().min(1),
});

export function createIngestRouter(
  ingestionService: CodeIngestionService,
  db: DatabaseSchema
): Router {
  const router = Router();

  // Apply rate limiting
  router.use(ingestionRateLimiter);

  // Apply authentication
  router.use(requireAuth);

  /**
   * POST /api/ingest
   * Ingest code chunks for a project (only if user owns it)
   */
  router.post('/', async (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const body = ingestRequestSchema.parse(req.body);

      // Check ownership
      if (!db.userOwnsProject(req.auth.userId, body.projectId)) {
        res.status(403).json({ error: 'Forbidden', message: 'You do not own this project' });
        return;
      }

      const result = await ingestionService.ingestChunks(
        body.projectId,
        body.files
      );

      res.json({
        success: true,
        result: {
          projectId: result.projectId,
          filesProcessed: result.filesProcessed,
          chunksProcessed: result.chunksProcessed,
          chunksReused: result.chunksReused,
          chunksComputed: result.chunksComputed,
          cacheHitRate:
            result.chunksProcessed > 0
              ? ((result.chunksReused / result.chunksProcessed) * 100).toFixed(2) + '%'
              : '0%',
          duration: result.duration,
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: err.issues });
      } else {
        res.status(500).json({ error: 'Ingestion failed', details: (err as Error).message });
      }
    }
  });

  /**
   * DELETE /api/ingest/file
   * Delete a file and its chunks (only if user owns project)
   */
  router.delete('/file', async (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const body = deleteFileSchema.parse(req.body);

      // Check ownership
      if (!db.userOwnsProject(req.auth.userId, body.projectId)) {
        res.status(403).json({ error: 'Forbidden', message: 'You do not own this project' });
        return;
      }

      await ingestionService.deleteFile(body.projectId, body.filePath);

      res.json({
        success: true,
        message: 'File and its chunks deleted successfully',
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: err.issues });
      } else {
        res.status(500).json({ error: 'Failed to delete file', details: (err as Error).message });
      }
    }
  });

  return router;
}
