import { Router, Response } from 'express';
import { DatabaseSchema } from '../database/schema';
import { AICodeChatService } from '../services/AICodeChatService';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { log } from '../utils/logger';

export interface CustomChatRequest {
    projectId: string;
    sessionId?: string;
    message: string;
    model?: string;
    contextFiles?: Array<{
        path: string;
        content: string;
        startLine?: number;
        endLine?: number;
    }>;
}

export interface ModelConfig {
    id: string;
    name: string;
    vendor: string;
    isDefault?: boolean;
    maxTokens?: number;
}

// Available models configuration
const AVAILABLE_MODELS: ModelConfig[] = [
    {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        vendor: 'Google',
        isDefault: true,
        maxTokens: 8192,
    },
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        vendor: 'Google',
        maxTokens: 8192,
    },
    {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash',
        vendor: 'Google',
        maxTokens: 8192,
    },
];

export function createCustomChatRoutes(
    db: DatabaseSchema,
    aiChatService: AICodeChatService
): Router {
    const router = Router();
    router.use(requireAuth);

    /**
     * POST /api/custom-chat/send
     * Send chat message to backend LLM
     */
    router.post('/send', async (req: AuthRequest, res: Response) => {
        try {
            const request = req.body as CustomChatRequest;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (!request.projectId || !request.message) {
                return res.status(400).json({ error: 'Missing projectId or message' });
            }

            // Verify project ownership
            if (!db.userOwnsProject(userId, request.projectId)) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            log.info(`[CustomChat] Request from user ${userId} for project ${request.projectId}`);
            log.info(`[CustomChat] Message: ${request.message.substring(0, 100)}...`);
            log.info(`[CustomChat] Model: ${request.model || 'default'}`);
            log.info(`[CustomChat] Context files: ${request.contextFiles?.length || 0}`);

            // Build file context from provided files
            const fileContext = request.contextFiles?.[0] ? {
                filePath: request.contextFiles[0].path,
                content: request.contextFiles[0].content,
                startLine: request.contextFiles[0].startLine,
                endLine: request.contextFiles[0].endLine,
            } : undefined;

            // Call AICodeChatService
            const response = await aiChatService.chatEdit({
                projectId: request.projectId,
                sessionId: request.sessionId,
                message: request.message,
                fileContext,
            });

            log.info(`[CustomChat] Response: ${response.edits?.length || 0} edits`);

            // Get Merkle tree if edits were made
            let merkleTree = null;
            if (response.edits && response.edits.length > 0) {
                // Fetch Merkle tree from database to return to frontend
                const project = db.getDb().prepare(`
                    SELECT merkle_json FROM projects WHERE project_id = ?
                `).get(request.projectId) as { merkle_json: string | null } | undefined;

                if (project?.merkle_json) {
                    merkleTree = JSON.parse(project.merkle_json);
                }
            }

            res.json({
                success: true,
                ...response,
                merkleTree,
            });
        } catch (error: any) {
            log.error('[CustomChat] Send error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/custom-chat/send-stream
     * Send chat message with streaming response (SSE)
     */
    router.post('/send-stream', async (req: AuthRequest, res: Response) => {
        try {
            const request = req.body as CustomChatRequest;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (!request.projectId || !request.message) {
                return res.status(400).json({ error: 'Missing projectId or message' });
            }

            // Verify project ownership
            if (!db.userOwnsProject(userId, request.projectId)) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            // Set up SSE headers
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            // Send initial event
            res.write(`data: ${JSON.stringify({ type: 'start', message: 'Processing...' })}\n\n`);

            const fileContext = request.contextFiles?.[0] ? {
                filePath: request.contextFiles[0].path,
                content: request.contextFiles[0].content,
                startLine: request.contextFiles[0].startLine,
                endLine: request.contextFiles[0].endLine,
            } : undefined;

            // Get response (non-streaming for now, but send as stream events)
            const response = await aiChatService.chatEdit({
                projectId: request.projectId,
                sessionId: request.sessionId,
                message: request.message,
                fileContext,
            });

            // Get Merkle tree if edits were made
            let merkleTree = null;
            if (response.edits && response.edits.length > 0) {
                const project = db.getDb().prepare(`
                    SELECT merkle_json FROM projects WHERE project_id = ?
                `).get(request.projectId) as { merkle_json: string | null } | undefined;

                if (project?.merkle_json) {
                    merkleTree = JSON.parse(project.merkle_json);
                }
            }

            // Send response as stream event with Merkle tree
            res.write(`data: ${JSON.stringify({ type: 'response', data: { ...response, merkleTree } })}\n\n`);

            // Send complete event
            res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);

            res.end();
        } catch (error: any) {
            log.error('[CustomChat] Stream error:', error);

            // Send error event
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
            res.end();
        }
    });

    /**
     * GET /api/custom-chat/models
     * Get available AI models
     */
    router.get('/models', async (req: AuthRequest, res: Response) => {
        try {
            res.json({
                models: AVAILABLE_MODELS,
                default: AVAILABLE_MODELS.find(m => m.isDefault)?.id,
            });
        } catch (error: any) {
            log.error('[CustomChat] Models error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/custom-chat/sessions/:projectId
     * Get chat sessions for a project
     */
    router.get('/sessions/:projectId', async (req: AuthRequest, res: Response) => {
        try {
            const { projectId } = req.params;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (!db.userOwnsProject(userId, projectId)) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const sessions = db.getDb().prepare(`
                SELECT
                    session_id,
                    title,
                    message_count,
                    created_at,
                    updated_at
                FROM chat_sessions
                WHERE project_id = ? AND user_id = ?
                ORDER BY updated_at DESC
                LIMIT 50
            `).all(projectId, userId);

            res.json({
                sessions: sessions.map((s: any) => ({
                    sessionId: s.session_id,
                    title: s.title,
                    messageCount: s.message_count,
                    createdAt: s.created_at,
                    updatedAt: s.updated_at,
                })),
            });
        } catch (error: any) {
            log.error('[CustomChat] Sessions error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/custom-chat/history/:sessionId
     * Get chat history for a session
     */
    router.get('/history/:sessionId', async (req: AuthRequest, res: Response) => {
        try {
            const { sessionId } = req.params;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Verify ownership
            if (!db.userOwnsSession(userId, sessionId)) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const messages = db.getDb().prepare(`
                SELECT
                    message_id,
                    role,
                    content,
                    context_chunks,
                    created_at
                FROM chat_messages
                WHERE session_id = ?
                ORDER BY created_at ASC
            `).all(sessionId);

            res.json({
                sessionId,
                messages: messages.map((m: any) => ({
                    messageId: m.message_id,
                    role: m.role,
                    content: m.content,
                    metadata: m.context_chunks ? JSON.parse(m.context_chunks) : null,
                    createdAt: m.created_at,
                })),
            });
        } catch (error: any) {
            log.error('[CustomChat] History error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * DELETE /api/custom-chat/sessions/:sessionId
     * Delete a chat session
     */
    router.delete('/sessions/:sessionId', async (req: AuthRequest, res: Response) => {
        try {
            const { sessionId } = req.params;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (!db.userOwnsSession(userId, sessionId)) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            db.transaction(() => {
                db.getDb().prepare(`DELETE FROM chat_messages WHERE session_id = ?`).run(sessionId);
                db.getDb().prepare(`DELETE FROM chat_sessions WHERE session_id = ?`).run(sessionId);
            });

            log.info(`[CustomChat] Deleted session ${sessionId}`);

            res.json({ success: true });
        } catch (error: any) {
            log.error('[CustomChat] Delete session error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
