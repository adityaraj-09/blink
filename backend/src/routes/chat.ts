import { Router } from 'express';
import { ChatService } from '../services/chat-service';
import { DatabaseSchema } from '../database/schema';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { chatRateLimiter } from '../middleware/rate-limit';

// Validation schemas
const chatRequestSchema = z.object({
  projectId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  message: z.string().min(1),
  maxContextChunks: z.number().int().min(1).max(20).optional(),
  minSimilarity: z.number().min(0).max(1).optional(),
});

export function createChatRouter(
  chatService: ChatService,
  db: DatabaseSchema
): Router {
  const router = Router();

  // Apply rate limiting
  router.use(chatRateLimiter);

  // Apply authentication
  router.use(requireAuth);


  /**
   * GET /api/chat/:sessionId/history
   * Get chat session history (only if user owns session)
   */
  router.get('/:sessionId/history', (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;

      // Check ownership
      if (!db.userOwnsSession(req.auth.userId, sessionId)) {
        res.status(403).json({ error: 'Forbidden', message: 'You do not own this chat session' });
        return;
      }

      const history = chatService.getSessionHistory(sessionId);

      res.json({
        success: true,
        sessionId,
        messages: history,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get history', details: (err as Error).message });
    }
  });

  /**
   * DELETE /api/chat/:sessionId
   * Delete chat session (only if user owns session)
   */
  router.delete('/:sessionId', (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;

      // Check ownership
      if (!db.userOwnsSession(req.auth.userId, sessionId)) {
        res.status(403).json({ error: 'Forbidden', message: 'You do not own this chat session' });
        return;
      }

      chatService.deleteSession(sessionId);

      res.json({
        success: true,
        message: 'Session deleted successfully',
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete session', details: (err as Error).message });
    }
  });

  return router;
}
