import { Router, Response } from 'express';
import { DatabaseSchema } from '../database/schema';
import { CodeIngestionService } from '../services/code-ingestion-service';
import { FileIngestionService } from '../services/FileIngestionService';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import * as crypto from 'crypto';
import { requireAuth, AuthRequest, getUserInfo } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rate-limit';
import { log } from '../utils/logger';
import { MerkleHasher } from '../services/merkle';
import { chunkCodeWithFallback } from '../services/tree-sitter-chunker';
import { ChromaService } from '../services/chroma-service';

// Validation schemas
const zipImportSchema = z.object({
  projectName: z.string().min(1).max(255),
  description: z.string().optional(),
  files: z.record(z.string(), z.object({
    content: z.string(),
    size: z.number(),
  })),
});

// Language detection map
const LANGUAGE_MAP: Record<string, string> = {
  'js': 'javascript',
  'jsx': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'py': 'python',
  'java': 'java',
  'cpp': 'cpp',
  'c': 'c',
  'h': 'cpp',
  'hpp': 'cpp',
  'cs': 'csharp',
  'go': 'go',
  'rs': 'rust',
  'rb': 'ruby',
  'php': 'php',
  'swift': 'swift',
  'kt': 'kotlin',
  'scala': 'scala',
  'sh': 'bash',
  'sql': 'sql',
  'html': 'html',
  'css': 'css',
  'scss': 'scss',
  'json': 'json',
  'yaml': 'yaml',
  'yml': 'yaml',
  'xml': 'xml',
  'md': 'markdown',
  'txt': 'plaintext',
};

// Files/directories to ignore
const IGNORE_PATTERNS = [
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'out',
  'coverage',
  '.cache',
  'vendor',
  'target',
  '__pycache__',
  '.pytest_cache',
  '.venv',
  'venv',
  '__MACOSX',
  '.DS_Store',
];

// File extensions to ignore
const IGNORE_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.mp4', '.mov', '.avi', '.mkv',
  '.mp3', '.wav', '.ogg',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.pdf', '.doc', '.docx',
  '.exe', '.dll', '.so', '.dylib',
  '.lock', '.log',
  '.min.js', '.min.css',
  '.map',
];

function shouldProcessFile(filePath: string): boolean {
  const pathParts = filePath.split('/');

  // Check if path contains ignored directories
  for (const part of pathParts) {
    if (IGNORE_PATTERNS.includes(part)) {
      return false;
    }
  }

  // Check file extension
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const fullExt = '.' + ext;

  if (IGNORE_EXTENSIONS.includes(fullExt)) {
    return false;
  }

  // Must be a supported code file
  return ext in LANGUAGE_MAP;
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_MAP[ext] || 'plaintext';
}

export function createZipImportRoutes(
  db: DatabaseSchema,
  chroma: ChromaService,
  ingestionService: CodeIngestionService,
  fileIngestionService: FileIngestionService
): Router {
  const router = Router();

  // Apply rate limiting
  router.use(apiRateLimiter);

  // Apply authentication
  router.use(requireAuth);

  /**
   * POST /api/zip/import
   * Import a project from ZIP file contents (sent from frontend)
   */
  router.post('/import', async (req: AuthRequest, res: Response) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const body = zipImportSchema.parse(req.body);
      const { projectName, description, files } = body;

      log.info(`📦 ZIP Import: Starting import for "${projectName}"`);
      log.info(`   Files received: ${Object.keys(files).length}`);

      // Sync user info from Clerk
      const userInfo = await getUserInfo(req.auth.userId);
      if (userInfo) {
        db.syncUser(userInfo);
      }

      // Create project
      const projectId = uuidv4();
      const now = Date.now();

      const dbConn = db.getDb();
      dbConn.prepare(`
        INSERT INTO projects (
          project_id, user_id, project_name, description,
          created_at, updated_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        req.auth.userId,
        projectName,
        description || null,
        now,
        now,
        JSON.stringify({
          source: 'zip_import',
          ingestionProgress: {
            status: 'pending',
            totalFiles: Object.keys(files).length,
            processedFiles: 0,
            totalChunks: 0,
            currentFile: null,
            error: null,
            startedAt: now,
            completedAt: null,
          }
        })
      );

      // Create ChromaDB collection
      await chroma.createProjectCollection(projectId);

      // Respond immediately with project info
      res.status(201).json({
        projectId,
        projectName,
        description,
        status: 'importing',
        message: 'Project created. Processing files...',
      });

      // Process files in background
      processZipFiles(projectId, files, db, ingestionService).catch(err => {
        log.error(`❌ ZIP Import failed for ${projectId}:`, err);
      });

    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: err.issues });
      } else {
        log.error('ZIP Import error:', err);
        res.status(500).json({ error: 'Failed to import ZIP', details: (err as Error).message });
      }
    }
  });

  /**
   * GET /api/zip/import/status/:projectId
   * Check import status for a ZIP import
   */
  router.get('/import/status/:projectId', async (req: AuthRequest, res: Response) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { projectId } = req.params;

      // Verify user owns project
      if (!db.userOwnsProject(req.auth.userId, projectId)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const ingestionProgress = await fileIngestionService.getIngestionProgress(projectId);

      res.json({
        syncStatus: 'synced', // No git sync for ZIP imports
        syncError: null,
        lastSynced: null,
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
    } catch (err) {
      log.error('Failed to get ZIP import status:', err);
      res.status(500).json({ error: 'Failed to get status' });
    }
  });

  return router;
}

/**
 * Process ZIP files in background
 */
async function processZipFiles(
  projectId: string,
  files: Record<string, { content: string; size: number }>,
  db: DatabaseSchema,
  ingestionService: CodeIngestionService
): Promise<void> {
  const startTime = Date.now();
  const dbConn = db.getDb();

  try {
    // Filter files that should be processed
    const fileEntries = Object.entries(files).filter(([path]) => shouldProcessFile(path));

    log.info(`📂 Processing ${fileEntries.length} files (filtered from ${Object.keys(files).length})`);

    // Update status to processing
    updateIngestionProgress(dbConn, projectId, {
      status: 'processing',
      totalFiles: fileEntries.length,
      processedFiles: 0,
      totalChunks: 0,
      currentFile: null,
      error: null,
      startedAt: startTime,
      completedAt: null,
    });

    // Build Merkle tree using existing MerkleHasher
    const merkleHasher = new MerkleHasher();
    const fileListForMerkle = fileEntries.map(([path, data]) => ({
      path,
      content: data.content,
      lastModified: Date.now(),
    }));

    if (fileListForMerkle.length > 0) {
      const merkleTree = await merkleHasher.buildTreeFromFileList(fileListForMerkle);
      dbConn.prepare(`
        UPDATE projects SET merkle_json = ? WHERE project_id = ?
      `).run(JSON.stringify(merkleTree.toJSON()), projectId);
      log.info(`✓ Merkle tree saved (${merkleTree.countFiles()} files, hash: ${merkleTree.hash.substring(0, 16)})`);
    }

    // Process files in batches
    const batchSize = 10;
    let processedCount = 0;
    let totalChunks = 0;

    for (let i = 0; i < fileEntries.length; i += batchSize) {
      const batch = fileEntries.slice(i, i + batchSize);
      const chunkInputs: Array<{
        filePath: string;
        fileHash: string;
        language: string;
        chunks: Array<{
          chunkText: string;
          startLine: number;
          endLine: number;
          chunkType: string;
          chunkName?: string;
        }>;
      }> = [];

      for (const [filePath, fileData] of batch) {
        try {
          // Update current file
          updateIngestionProgress(dbConn, projectId, {
            status: 'processing',
            totalFiles: fileEntries.length,
            processedFiles: processedCount,
            totalChunks,
            currentFile: filePath,
            error: null,
            startedAt: startTime,
            completedAt: null,
          });

          const content = fileData.content;
          const fileHash = crypto.createHash('sha256').update(content).digest('hex');
          const language = detectLanguage(filePath);

          // Use tree-sitter for intelligent chunking with fallback
          const chunks = await chunkCodeWithFallback(content, language, filePath);

          if (chunks.length > 0) {
            chunkInputs.push({
              filePath,
              fileHash,
              language,
              chunks,
            });
            totalChunks += chunks.length;
          }

          processedCount++;
        } catch (error: any) {
          log.error(`❌ Failed to process file ${filePath}:`, error.message);
        }
      }

      // Ingest batch
      if (chunkInputs.length > 0) {
        try {
          await ingestionService.ingestChunks(projectId, chunkInputs);
          log.info(`✅ Ingested batch of ${chunkInputs.length} files`);
        } catch (error: any) {
          log.error(`❌ Failed to ingest batch:`, error.message);
        }
      }

      // Update progress
      updateIngestionProgress(dbConn, projectId, {
        status: 'processing',
        totalFiles: fileEntries.length,
        processedFiles: processedCount,
        totalChunks,
        currentFile: null,
        error: null,
        startedAt: startTime,
        completedAt: null,
      });
    }

    // Mark as completed
    const completedAt = Date.now();
    updateIngestionProgress(dbConn, projectId, {
      status: 'completed',
      totalFiles: fileEntries.length,
      processedFiles: processedCount,
      totalChunks,
      currentFile: null,
      error: null,
      startedAt: startTime,
      completedAt,
    });

    // Update project stats
    dbConn.prepare(`
      UPDATE projects
      SET total_files = ?, total_chunks = ?, last_indexed_at = ?, updated_at = ?
      WHERE project_id = ?
    `).run(processedCount, totalChunks, completedAt, completedAt, projectId);

    const duration = ((completedAt - startTime) / 1000).toFixed(2);
    log.info(`✅ ZIP Import completed in ${duration}s`);
    log.info(`   - Files processed: ${processedCount}`);
    log.info(`   - Chunks created: ${totalChunks}`);

  } catch (error: any) {
    log.error(`❌ ZIP Import failed:`, error.message);

    updateIngestionProgress(dbConn, projectId, {
      status: 'failed',
      totalFiles: 0,
      processedFiles: 0,
      totalChunks: 0,
      currentFile: null,
      error: error.message,
      startedAt: startTime,
      completedAt: Date.now(),
    });
  }
}

/**
 * Update ingestion progress in database
 */
function updateIngestionProgress(
  dbConn: any,
  projectId: string,
  progress: {
    status: string;
    totalFiles: number;
    processedFiles: number;
    totalChunks: number;
    currentFile: string | null;
    error: string | null;
    startedAt: number;
    completedAt: number | null;
  }
): void {
  dbConn.prepare(`
    UPDATE projects
    SET metadata = ?
    WHERE project_id = ?
  `).run(
    JSON.stringify({
      source: 'zip_import',
      ingestionProgress: progress
    }),
    projectId
  );
}
