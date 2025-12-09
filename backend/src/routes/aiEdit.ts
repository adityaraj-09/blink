import { Router, Request, Response } from 'express';
import { DatabaseSchema } from '../database/schema';
import { AICodeChatService } from '../services/AICodeChatService';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rate-limit';
import { z } from 'zod';
import { AIEditRequest, CodeEdit, BatchApplyRequest } from '../types/code-edit';
import { getAvailableModels, DEFAULT_MODEL_ID } from '../services/llm';

// Validation schemas
const aiEditRequestSchema = z.object({
  projectId: z.string(),
  message: z.string().min(1),
  fileContext: z.object({
    filePath: z.string(),
    content: z.string().nullish(),
    startLine: z.number().int().positive().nullish(),
    endLine: z.number().int().positive().nullish(),
    cursorPosition: z.number().int().nullish()
  }).nullish().transform(val => {
    if (!val) return undefined;
    return {
      filePath: val.filePath,
      content: val.content ?? undefined,
      startLine: val.startLine ?? undefined,
      endLine: val.endLine ?? undefined,
      cursorPosition: val.cursorPosition ?? undefined
    };
  }),
  sessionId: z.string().nullish().transform(val => val ?? undefined),
  modelId: z.string().nullish().transform(val => val ?? undefined)
});

const validateEditSchema = z.object({
  projectId: z.string(),
  edit: z.object({
    file: z.string(),
    action: z.enum(['create', 'replace', 'insert', 'delete']),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
    afterLine: z.number().int().positive().optional(),
    oldCode: z.string().optional(),
    newCode: z.string().optional()
  })
});

const applyEditSchema = z.object({
  projectId: z.string(),
  edit: z.object({
    file: z.string(),
    action: z.enum(['create', 'replace', 'insert', 'delete']),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
    afterLine: z.number().int().positive().optional(),
    oldCode: z.string().optional(),
    newCode: z.string().optional()
  })
});

const batchApplySchema = z.object({
  projectId: z.string(),
  edits: z.array(z.object({
    file: z.string(),
    action: z.enum(['create', 'replace', 'insert', 'delete']),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
    afterLine: z.number().int().positive().optional(),
    oldCode: z.string().optional(),
    newCode: z.string().optional()
  })),
  commitMessage: z.string().optional()
});

const previewEditSchema = z.object({
  projectId: z.string(),
  edit: z.object({
    file: z.string(),
    action: z.enum(['create', 'replace', 'insert', 'delete']),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
    afterLine: z.number().int().positive().optional(),
    oldCode: z.string().optional(),
    newCode: z.string().optional()
  })
});

export function createAIEditRoutes(
  db: DatabaseSchema,
  aiCodeChatService: AICodeChatService
): Router {
  const router = Router();

  // Apply rate limiting
  router.use(apiRateLimiter);

  /**
   * GET /api/ai/models
   * Get available LLM models (public endpoint - no auth required)
   */
  router.get('/models', async (req, res) => {
    try {
      const models = getAvailableModels();

      res.json({
        success: true,
        defaultModelId: DEFAULT_MODEL_ID,
        models: models.map(m => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          supportsTools: m.supportsTools,
          maxTokens: m.maxTokens,
          contextWindow: m.contextWindow
        }))
      });
    } catch (error: any) {
      console.error('[AI Models] Failed:', error);
      res.status(500).json({ error: error.message || 'Failed to get models' });
    }
  });

  // Apply authentication to all routes below
  router.use(requireAuth);

  /**
   * POST /api/ai/edit
   * AI-powered code editing with LLM
   */
  router.post('/edit', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Log request for debugging
      console.log('[AI Edit] Request body:', JSON.stringify(req.body, null, 2));

      const body = aiEditRequestSchema.parse(req.body);

      // Verify user owns project
      if (!db.userOwnsProject(userId, body.projectId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const request: AIEditRequest = {
        ...body
      };
      
      const response = await aiCodeChatService.chatEdit(request);

      res.json({
        success: true,
        ...response
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error('[AI Edit] Validation error:', error.flatten().fieldErrors);
        console.error('[AI Edit] Request body was:', JSON.stringify(req.body, null, 2));
        res.status(400).json({ error: 'Validation error', details: error.flatten().fieldErrors });
      } else {
        console.error('[AI Edit] Failed:', error);
        res.status(500).json({ error: error.message || 'AI edit failed' });
      }
    }
  });

  /**
   * GET /api/ai/sessions/:projectId
   * Get all chat sessions for a project
   */
  router.get('/sessions/:projectId', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { projectId } = req.params;

      // Verify user owns project
      if (!db.userOwnsProject(userId, projectId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Get all sessions for this project
      const sessions = db.getDb().prepare(`
        SELECT session_id, project_id, user_id, title, created_at, updated_at, message_count
        FROM chat_sessions
        WHERE project_id = ? AND user_id = ?
        ORDER BY updated_at DESC
      `).all(projectId, userId) as Array<{
        session_id: string;
        project_id: string;
        user_id: string;
        title: string | null;
        created_at: number;
        updated_at: number;
        message_count: number;
      }>;

      res.json({
        success: true,
        sessions: sessions.map(s => ({
          sessionId: s.session_id,
          projectId: s.project_id,
          userId: s.user_id,
          title: s.title || 'New Chat',
          createdAt: s.created_at,
          updatedAt: s.updated_at,
          messageCount: s.message_count
        }))
      });
    } catch (error: any) {
      console.error('[AI Sessions] Failed:', error);
      res.status(500).json({ error: error.message || 'Failed to get sessions' });
    }
  });

  /**
   * GET /api/ai/messages/:sessionId
   * Get all messages for a chat session
   */
  router.get('/messages/:sessionId', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { sessionId } = req.params;

      // Verify user owns session
      const session = db.getDb().prepare(`
        SELECT project_id, user_id
        FROM chat_sessions
        WHERE session_id = ?
      `).get(sessionId) as { project_id: string; user_id: string } | undefined;

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (session.user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Get all messages for this session
      const messages = db.getDb().prepare(`
        SELECT message_id, session_id, role, content, created_at, context_chunks
        FROM chat_messages
        WHERE session_id = ?
        ORDER BY created_at ASC
      `).all(sessionId) as Array<{
        message_id: string;
        session_id: string;
        role: string;
        content: string;
        created_at: number;
        context_chunks: string;
      }>;

      res.json({
        success: true,
        sessionId,
        messages: messages.map(m => {
          let parsedMetadata = null;
          try {
            parsedMetadata = m.context_chunks ? JSON.parse(m.context_chunks) : null;
          } catch (e) {
            // Ignore parse errors
          }

          return {
            messageId: m.message_id,
            sessionId: m.session_id,
            role: m.role,
            content: m.content,
            createdAt: m.created_at,
            metadata: parsedMetadata
          };
        })
      });
    } catch (error: any) {
      console.error('[AI Messages] Failed:', error);
      res.status(500).json({ error: error.message || 'Failed to get messages' });
    }
  });

  return router;
}
