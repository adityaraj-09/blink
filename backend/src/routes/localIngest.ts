import { Router, Response } from 'express';
import { DatabaseSchema } from '../database/schema';
import { FileIngestionService } from '../services/FileIngestionService';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { log } from '../utils/logger';

export interface FileUpload {
    path: string;
    content: string;
    size: number;
}

interface LocalProject {
    project_id: string;
    user_id: string;
    ingestion_status: string;
    total_files: number;
    processed_files: number;
    total_chunks: number;
    error_message?: string | null;
    last_ingested_at?: number | null;
}

export function createLocalIngestRoutes(
    db: DatabaseSchema,
    fileIngestionService: FileIngestionService
): Router {
    const router = Router();
    router.use(requireAuth);

    /**
     * POST /api/local-ingest/:projectId/init
     * Initialize ingestion with total file count and Merkle tree
     */
    router.post('/:projectId/init', async (req: AuthRequest, res: Response) => {
        try {
            const { projectId } = req.params;
            const { totalFiles, merkleTree } = req.body;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (typeof totalFiles !== 'number' || totalFiles < 0) {
                return res.status(400).json({ error: 'Invalid totalFiles' });
            }

            // Verify ownership
            const project = db.getDb().prepare(`
                SELECT project_id FROM local_projects WHERE project_id = ? AND user_id = ?
            `).get(projectId, userId) as { project_id: string } | undefined;

            if (!project) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const now = Date.now();

            // Store Merkle tree JSON if provided
            const merkleJson = merkleTree ? JSON.stringify(merkleTree) : null;

            db.getDb().prepare(`
                UPDATE local_projects
                SET total_files = ?,
                    processed_files = 0,
                    total_chunks = 0,
                    ingestion_status = 'pending',
                    error_message = NULL,
                    merkle_json = COALESCE(?, merkle_json),
                    updated_at = ?
                WHERE project_id = ?
            `).run(totalFiles, merkleJson, now, projectId);

            // Also update the main projects table with Merkle JSON
            if (merkleJson) {
                db.getDb().prepare(`
                    UPDATE projects
                    SET merkle_json = ?, updated_at = ?
                    WHERE project_id = ?
                `).run(merkleJson, now, projectId);
            }

            log.info(`[LocalIngest] Initialized ingestion for ${projectId} with ${totalFiles} files${merkleTree ? ' (with Merkle tree)' : ''}`);

            res.json({
                success: true,
                projectId,
                totalFiles,
                hasMerkleTree: !!merkleTree,
            });
        } catch (error: any) {
            log.error('[LocalIngest] Init error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/local-ingest/:projectId/files
     * Receive files from frontend for ingestion (batched)
     */
    router.post('/:projectId/files', async (req: AuthRequest, res: Response) => {
        try {
            const { projectId } = req.params;
            const { files, batchIndex, totalBatches } = req.body as {
                files: FileUpload[];
                batchIndex: number;
                totalBatches: number;
            };
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (!Array.isArray(files) || files.length === 0) {
                return res.status(400).json({ error: 'No files provided' });
            }

            // Verify ownership
            const project = db.getDb().prepare(`
                SELECT * FROM local_projects WHERE project_id = ? AND user_id = ?
            `).get(projectId, userId) as LocalProject | undefined;

            if (!project) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const now = Date.now();

            // Update status to processing if first batch
            if (batchIndex === 0) {
                db.getDb().prepare(`
                    UPDATE local_projects
                    SET ingestion_status = 'processing', updated_at = ?
                    WHERE project_id = ?
                `).run(now, projectId);
            }

            log.info(`[LocalIngest] Processing batch ${batchIndex + 1}/${totalBatches} (${files.length} files) for ${projectId}`);

            // Process this batch using FileIngestionService
            const result = await fileIngestionService.ingestFileBatch(projectId, files);

            // Get current progress
            const currentProgress = db.getDb().prepare(`
                SELECT processed_files, total_chunks FROM local_projects WHERE project_id = ?
            `).get(projectId) as { processed_files: number; total_chunks: number };

            const newProcessed = currentProgress.processed_files + files.length;
            const newChunks = currentProgress.total_chunks + (result?.chunksCreated || 0);

            // Update progress
            db.getDb().prepare(`
                UPDATE local_projects
                SET processed_files = ?,
                    total_chunks = ?,
                    updated_at = ?
                WHERE project_id = ?
            `).run(newProcessed, newChunks, now, projectId);

            // Mark complete if last batch
            if (batchIndex === totalBatches - 1) {
                db.getDb().prepare(`
                    UPDATE local_projects
                    SET ingestion_status = 'completed',
                        last_ingested_at = ?,
                        updated_at = ?
                    WHERE project_id = ?
                `).run(now, now, projectId);

                log.info(`[LocalIngest] Completed ingestion for ${projectId}: ${newProcessed} files, ${newChunks} chunks`);
            }

            res.json({
                success: true,
                batchIndex,
                filesProcessed: files.length,
                chunksCreated: result?.chunksCreated || 0,
                totalProcessed: newProcessed,
                totalChunks: newChunks,
                isComplete: batchIndex === totalBatches - 1,
            });
        } catch (error: any) {
            log.error('[LocalIngest] Files error:', error);

            // Update status to failed
            const { projectId } = req.params;
            db.getDb().prepare(`
                UPDATE local_projects
                SET ingestion_status = 'failed',
                    error_message = ?,
                    updated_at = ?
                WHERE project_id = ?
            `).run(error.message, Date.now(), projectId);

            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/local-ingest/:projectId/progress
     * Get real-time ingestion progress
     */
    router.get('/:projectId/progress', async (req: AuthRequest, res: Response) => {
        try {
            const { projectId } = req.params;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const project = db.getDb().prepare(`
                SELECT
                    ingestion_status,
                    total_files,
                    processed_files,
                    total_chunks,
                    error_message,
                    last_ingested_at
                FROM local_projects
                WHERE project_id = ? AND user_id = ?
            `).get(projectId, userId) as LocalProject | undefined;

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const percentComplete = project.total_files > 0
                ? Math.round((project.processed_files / project.total_files) * 100)
                : 0;

            res.json({
                status: project.ingestion_status,
                progress: {
                    total: project.total_files,
                    processed: project.processed_files,
                    chunks: project.total_chunks,
                    percent: percentComplete,
                },
                error: project.error_message,
                lastIngested: project.last_ingested_at,
            });
        } catch (error: any) {
            log.error('[LocalIngest] Progress error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * GET /api/local-ingest/:projectId/merkle
     * Get saved Merkle tree for a local project
     */
    router.get('/:projectId/merkle', async (req: AuthRequest, res: Response) => {
        try {
            const { projectId } = req.params;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const project = db.getDb().prepare(`
                SELECT merkle_json FROM local_projects WHERE project_id = ? AND user_id = ?
            `).get(projectId, userId) as { merkle_json: string | null } | undefined;

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            res.json({
                projectId,
                merkleTree: project.merkle_json ? JSON.parse(project.merkle_json) : null,
            });
        } catch (error: any) {
            log.error('[LocalIngest] Merkle error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * PUT /api/local-ingest/:projectId/merkle
     * Update Merkle tree for a local project
     */
    router.put('/:projectId/merkle', async (req: AuthRequest, res: Response) => {
        try {
            const { projectId } = req.params;
            const { merkleTree } = req.body;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (!merkleTree) {
                return res.status(400).json({ error: 'merkleTree is required' });
            }

            const project = db.getDb().prepare(`
                SELECT project_id FROM local_projects WHERE project_id = ? AND user_id = ?
            `).get(projectId, userId) as { project_id: string } | undefined;

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const now = Date.now();
            const merkleJson = JSON.stringify(merkleTree);

            // Update both local_projects and projects tables
            db.getDb().prepare(`
                UPDATE local_projects
                SET merkle_json = ?, updated_at = ?
                WHERE project_id = ?
            `).run(merkleJson, now, projectId);

            db.getDb().prepare(`
                UPDATE projects
                SET merkle_json = ?, updated_at = ?
                WHERE project_id = ?
            `).run(merkleJson, now, projectId);

            log.info(`[LocalIngest] Updated Merkle tree for ${projectId}`);

            res.json({
                success: true,
                projectId,
            });
        } catch (error: any) {
            log.error('[LocalIngest] Merkle update error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/local-ingest/:projectId/retry
     * Retry failed ingestion
     */
    router.post('/:projectId/retry', async (req: AuthRequest, res: Response) => {
        try {
            const { projectId } = req.params;
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const project = db.getDb().prepare(`
                SELECT ingestion_status FROM local_projects WHERE project_id = ? AND user_id = ?
            `).get(projectId, userId) as { ingestion_status: string } | undefined;

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            if (project.ingestion_status !== 'failed') {
                return res.status(400).json({ error: 'Project is not in failed state' });
            }

            // Reset to pending state
            db.getDb().prepare(`
                UPDATE local_projects
                SET ingestion_status = 'pending',
                    processed_files = 0,
                    total_chunks = 0,
                    error_message = NULL,
                    updated_at = ?
                WHERE project_id = ?
            `).run(Date.now(), projectId);

            log.info(`[LocalIngest] Reset project ${projectId} for retry`);

            res.json({
                success: true,
                message: 'Ready for retry. Send files again.',
            });
        } catch (error: any) {
            log.error('[LocalIngest] Retry error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
