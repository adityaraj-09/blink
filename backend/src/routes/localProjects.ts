import { Router, Response } from 'express';
import { DatabaseSchema } from '../database/schema';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { generateLocalProjectHash } from '../utils/project-hash';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../utils/logger';

interface LocalProject {
    id: number;
    project_id: string;
    user_id: string;
    local_hash: string;
    folder_name: string;
    folder_path: string;
    ingestion_status: string;
    total_files: number;
    processed_files: number;
    total_chunks: number;
    error_message: string | null;
    created_at: number;
    updated_at: number;
    last_ingested_at: number | null;
}

export function createLocalProjectRoutes(db: DatabaseSchema): Router {
    const router = Router();
    router.use(requireAuth);

    /**
     * POST /api/local-projects/check
     * Check if local project exists by hash
     */
    router.post('/check', async (req: AuthRequest, res: Response) => {
        try {
            const { folderPath, folderName } = req.body;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (!folderPath || !folderName) {
                return res.status(400).json({ error: 'Missing folderPath or folderName' });
            }

            const localHash = generateLocalProjectHash(userId, folderPath, folderName);

            const existing = db.getDb().prepare(`
                SELECT project_id, ingestion_status, total_files, processed_files, total_chunks
                FROM local_projects WHERE local_hash = ?
            `).get(localHash) as LocalProject | undefined;

            if (existing) {
                log.info(`[LocalProjects] Found existing project for hash ${localHash.substring(0, 12)}`);
                return res.json({
                    exists: true,
                    projectId: existing.project_id,
                    status: existing.ingestion_status,
                    progress: {
                        total: existing.total_files,
                        processed: existing.processed_files,
                        chunks: existing.total_chunks,
                    },
                    localHash,
                });
            }

            log.info(`[LocalProjects] No existing project for hash ${localHash.substring(0, 12)}`);
            res.json({
                exists: false,
                localHash,
            });
        } catch (error: any) {
            log.error('[LocalProjects] Check error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/local-projects/create
     * Create new local project entry
     */
    router.post('/create', async (req: AuthRequest, res: Response) => {
        try {
            const { folderPath, folderName, localHash } = req.body;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (!folderPath || !folderName || !localHash) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Verify hash matches
            const expectedHash = generateLocalProjectHash(userId, folderPath, folderName);
            if (expectedHash !== localHash) {
                return res.status(400).json({ error: 'Invalid hash' });
            }

            // Check if already exists
            const existing = db.getDb().prepare(`
                SELECT project_id FROM local_projects WHERE local_hash = ?
            `).get(localHash) as { project_id: string } | undefined;

            
            if (existing) {
                return res.json({
                    success: true,
                    projectId: existing.project_id,
                    localHash,
                    alreadyExists: true,
                });
            }

            const now = Date.now();
            const projectId = uuidv4();

            db.transaction(() => {
                // Create main project entry
                db.getDb().prepare(`
                    INSERT INTO projects (
                        project_id, user_id, project_name, is_github_repo,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, 0, ?, ?)
                `).run(projectId, userId, folderName, now, now);

                // Create local project tracking entry
                db.getDb().prepare(`
                    INSERT INTO local_projects (
                        project_id, user_id, local_hash, folder_name, folder_path,
                        ingestion_status, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
                `).run(projectId, userId, localHash, folderName, folderPath, now, now);
            });

            log.info(`[LocalProjects] Created project ${projectId} for folder ${folderName}`);

            res.json({
                success: true,
                projectId,
                localHash,
                alreadyExists: false,
            });
        } catch (error: any) {
            log.error('[LocalProjects] Create error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/local-projects/:projectId/status
     * Get ingestion status for a local project
     */
    router.get('/:projectId/status', async (req: AuthRequest, res: Response) => {
        try {
            const { projectId } = req.params;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const project = db.getDb().prepare(`
                SELECT * FROM local_projects WHERE project_id = ? AND user_id = ?
            `).get(projectId, userId) as LocalProject | undefined;

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            res.json({
                projectId: project.project_id,
                folderName: project.folder_name,
                folderPath: project.folder_path,
                status: project.ingestion_status,
                progress: {
                    total: project.total_files,
                    processed: project.processed_files,
                    chunks: project.total_chunks,
                },
                error: project.error_message,
                lastIngested: project.last_ingested_at,
                createdAt: project.created_at,
                updatedAt: project.updated_at,
            });
        } catch (error: any) {
            log.error('[LocalProjects] Status error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/local-projects
     * List all local projects for the authenticated user
     */
    router.get('/', async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const projects = db.getDb().prepare(`
                SELECT
                    lp.project_id,
                    lp.folder_name,
                    lp.folder_path,
                    lp.ingestion_status,
                    lp.total_files,
                    lp.processed_files,
                    lp.total_chunks,
                    lp.created_at,
                    lp.updated_at,
                    lp.last_ingested_at
                FROM local_projects lp
                WHERE lp.user_id = ?
                ORDER BY lp.updated_at DESC
            `).all(userId) as LocalProject[];

            res.json({
                projects: projects.map(p => ({
                    projectId: p.project_id,
                    folderName: p.folder_name,
                    folderPath: p.folder_path,
                    status: p.ingestion_status,
                    progress: {
                        total: p.total_files,
                        processed: p.processed_files,
                        chunks: p.total_chunks,
                    },
                    createdAt: p.created_at,
                    updatedAt: p.updated_at,
                    lastIngested: p.last_ingested_at,
                })),
            });
        } catch (error: any) {
            log.error('[LocalProjects] List error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * DELETE /api/local-projects/:projectId
     * Delete a local project
     */
    router.delete('/:projectId', async (req: AuthRequest, res: Response) => {
        try {
            const { projectId } = req.params;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Verify ownership
            const project = db.getDb().prepare(`
                SELECT project_id FROM local_projects WHERE project_id = ? AND user_id = ?
            `).get(projectId, userId) as { project_id: string } | undefined;

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            db.transaction(() => {
                // Delete from local_projects (will cascade to other tables via project_id)
                db.getDb().prepare(`
                    DELETE FROM local_projects WHERE project_id = ?
                `).run(projectId);

                // Delete from main projects table
                db.getDb().prepare(`
                    DELETE FROM projects WHERE project_id = ?
                `).run(projectId);
            });

            log.info(`[LocalProjects] Deleted project ${projectId}`);

            res.json({ success: true });
        } catch (error: any) {
            log.error('[LocalProjects] Delete error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
