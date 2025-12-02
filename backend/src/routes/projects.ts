import { Router } from 'express';
import { DatabaseSchema } from '../database/schema';
import { ChromaService } from '../services/chroma-service';
import { CodeIngestionService } from '../services/code-ingestion-service';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import * as crypto from 'crypto';
import { requireAuth, AuthRequest, getUserInfo } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rate-limit';
import { MerkleNode, compareTrees, summarizeChanges, getFilesToProcess } from '../services/merkle';
import { log } from '../utils/logger';
import { chunkCodeWithFallback } from '../services/tree-sitter-chunker';

// Validation schemas
const createProjectSchema = z.object({
  projectName: z.string().min(1).max(255),
  description: z.string().optional(),
  repositoryUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const updateProjectSchema = z.object({
  projectName: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  repositoryUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export function createProjectsRouter(
  db: DatabaseSchema,
  chroma: ChromaService,
  ingestionService: CodeIngestionService
): Router {
  const router = Router();

  // Apply rate limiting
  router.use(apiRateLimiter);

  // Apply authentication to all routes
  router.use(requireAuth);

  /**
   * POST /api/projects
   * Create a new project
   */
  router.post('/', async (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const body = createProjectSchema.parse(req.body);

      // Sync user info from Clerk
      const userInfo = await getUserInfo(req.auth.userId);
      if (userInfo) {
        db.syncUser(userInfo);
      }

      const projectId = uuidv4();
      const now = Date.now();

      const dbConn = db.getDb();
      dbConn.prepare(`
        INSERT INTO projects (
          project_id, user_id, project_name, description, repository_url,
          created_at, updated_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId,
        req.auth.userId,
        body.projectName,
        body.description || null,
        body.repositoryUrl || null,
        now,
        now,
        body.metadata ? JSON.stringify(body.metadata) : null
      );

      // Create ChromaDB collection
      await chroma.createProjectCollection(projectId);

      res.status(201).json({
        projectId,
        projectName: body.projectName,
        description: body.description,
        repositoryUrl: body.repositoryUrl,
        createdAt: now,
        metadata: body.metadata,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: err.issues });
      } else {
        res.status(500).json({ error: 'Failed to create project', details: (err as Error).message });
      }
    }
  });

  /**
   * GET /api/projects
   * List all projects for the authenticated user
   */
  router.get('/', async (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Sync user info from Clerk to ensure user exists in database
      const userInfo = await getUserInfo(req.auth.userId);
      if (userInfo) {
        db.syncUser(userInfo);
      }

      const dbConn = db.getDb();
      const projects = dbConn.prepare(`
        SELECT project_id, project_name, description, repository_url,
               created_at, updated_at, last_indexed_at,
               total_files, total_chunks, metadata
        FROM projects
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `).all(req.auth.userId) as any[];

      res.json({
        projects: projects.map((p) => ({
          projectId: p.project_id,
          projectName: p.project_name,
          description: p.description,
          repositoryUrl: p.repository_url,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          lastIndexedAt: p.last_indexed_at,
          totalFiles: p.total_files,
          totalChunks: p.total_chunks,
          metadata: p.metadata ? JSON.parse(p.metadata) : null,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to list projects', details: (err as Error).message });
    }
  });

  /**
   * GET /api/projects/:projectId
   * Get project details (only if user owns it)
   */
  router.get('/:projectId', async (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { projectId } = req.params;

      // Check ownership
      if (!db.userOwnsProject(req.auth.userId, projectId)) {
        res.status(403).json({ error: 'Forbidden', message: 'You do not own this project' });
        return;
      }

      const dbConn = db.getDb();
      const project = dbConn.prepare(`
        SELECT project_id, project_name, description, repository_url,
               created_at, updated_at, last_indexed_at,
               total_files, total_chunks, metadata, merkle_json
        FROM projects
        WHERE project_id = ?
      `).get(projectId) as any;

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      // Get ChromaDB collection info
      const collectionInfo = await chroma.getCollectionInfo(projectId);

      res.json({
        projectId: project.project_id,
        projectName: project.project_name,
        description: project.description,
        repositoryUrl: project.repository_url,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        lastIndexedAt: project.last_indexed_at,
        totalFiles: project.total_files,
        totalChunks: project.total_chunks,
        metadata: project.metadata ? JSON.parse(project.metadata) : null,
        vectorStore: collectionInfo,
        merkleTree: project.merkle_json ? JSON.parse(project.merkle_json) : null,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get project', details: (err as Error).message });
    }
  });

  /**
   * PUT /api/projects/:projectId
   * Update project (only if user owns it)
   */
  router.put('/:projectId', (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { projectId } = req.params;

      // Check ownership
      if (!db.userOwnsProject(req.auth.userId, projectId)) {
        res.status(403).json({ error: 'Forbidden', message: 'You do not own this project' });
        return;
      }

      const body = updateProjectSchema.parse(req.body);

      const dbConn = db.getDb();

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];

      if (body.projectName) {
        updates.push('project_name = ?');
        values.push(body.projectName);
      }
      if (body.description !== undefined) {
        updates.push('description = ?');
        values.push(body.description);
      }
      if (body.repositoryUrl !== undefined) {
        updates.push('repository_url = ?');
        values.push(body.repositoryUrl);
      }
      if (body.metadata) {
        updates.push('metadata = ?');
        values.push(JSON.stringify(body.metadata));
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push('updated_at = ?');
      values.push(Date.now());
      values.push(projectId);

      const result = dbConn.prepare(`
        UPDATE projects SET ${updates.join(', ')}
        WHERE project_id = ?
      `).run(...values);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({ message: 'Project updated successfully' });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: err.issues });
      } else {
        res.status(500).json({ error: 'Failed to update project', details: (err as Error).message });
      }
    }
  });

  /**
   * DELETE /api/projects/:projectId
   * Delete project (only if user owns it)
   */
  router.delete('/:projectId', async (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { projectId } = req.params;

      // Check ownership
      if (!db.userOwnsProject(req.auth.userId, projectId)) {
        res.status(403).json({ error: 'Forbidden', message: 'You do not own this project' });
        return;
      }

      // Delete ChromaDB collection
      await chroma.deleteProjectCollection(projectId);

      // Delete from database (cascades to files and chunks)
      const dbConn = db.getDb();
      const result = dbConn.prepare('DELETE FROM projects WHERE project_id = ?')
        .run(projectId);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({ message: 'Project deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete project', details: (err as Error).message });
    }
  });

  /**
   * GET /api/projects/:projectId/files
   * List files in project (only if user owns it)
   */
  router.get('/:projectId/files', (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { projectId } = req.params;

      // Check ownership
      if (!db.userOwnsProject(req.auth.userId, projectId)) {
        res.status(403).json({ error: 'Forbidden', message: 'You do not own this project' });
        return;
      }

      const dbConn = db.getDb();
      const files = dbConn.prepare(`
        SELECT file_id, file_path, file_hash, language, size_bytes,
               line_count, indexed_at
        FROM files
        WHERE project_id = ?
        ORDER BY file_path ASC
      `).all(projectId) as any[];

      res.json({
        files: files.map((f) => ({
          fileId: f.file_id,
          filePath: f.file_path,
          fileHash: f.file_hash,
          language: f.language,
          sizeBytes: f.size_bytes,
          lineCount: f.line_count,
          indexedAt: f.indexed_at,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to list files', details: (err as Error).message });
    }
  });

  /**
   * GET /api/projects/:projectId/files/content
   * Get all files with their content from database
   * This is useful for building a complete Merkle tree
   */
  router.get('/:projectId/files/content', (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { projectId } = req.params;

      // Check ownership
      if (!db.userOwnsProject(req.auth.userId, projectId)) {
        res.status(403).json({ error: 'Forbidden', message: 'You do not own this project' });
        return;
      }

      const dbConn = db.getDb();

      // Get all files for this project
      const files = dbConn.prepare(`
        SELECT file_id, file_path, file_hash, language, size_bytes, line_count, indexed_at
        FROM files
        WHERE project_id = ?
        ORDER BY file_path ASC
      `).all(projectId) as any[];

      // For each file, get its chunks and reconstruct content
      const filesWithContent = files.map((file) => {
        // Get all chunks for this file, sorted by start_line
        const chunks = dbConn.prepare(`
          SELECT chunk_text, start_line, end_line
          FROM chunks
          WHERE file_id = ?
          ORDER BY start_line ASC
        `).all(file.file_id) as any[];

        // Reconstruct file content from chunks
        let content = '';
        if (chunks.length > 0) {
          // Build a map of line number -> line content
          const lineMap = new Map<number, string>();

          for (const chunk of chunks) {
            const chunkLines = chunk.chunk_text.split('\n');
            for (let i = 0; i < chunkLines.length; i++) {
              const lineNumber = chunk.start_line + i;
              // Only add if not already present (first chunk wins for overlaps)
              if (!lineMap.has(lineNumber)) {
                lineMap.set(lineNumber, chunkLines[i]);
              }
            }
          }

          // Sort by line number and concatenate
          const sortedLines = Array.from(lineMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([_, line]) => line);

          content = sortedLines.join('\n');
        }

        return {
          fileId: file.file_id,
          filePath: file.file_path,
          fileHash: file.file_hash,
          language: file.language,
          sizeBytes: file.size_bytes,
          lineCount: file.line_count,
          indexedAt: file.indexed_at,
          content: content,
        };
      });

      res.json({
        files: filesWithContent,
        totalFiles: filesWithContent.length,
      });
    } catch (err) {
      log.error('Failed to get all files with content:', err);
      res.status(500).json({ error: 'Failed to get files content', details: (err as Error).message });
    }
  });

  /**
   * GET /api/projects/:projectId/file?path=xxx
   * Get file content from database (reconstructed from chunks)
   */
  router.get('/:projectId/file', (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { projectId } = req.params;
      const filePath = req.query.path as string;

      if (!filePath) {
        res.status(400).json({ error: 'File path is required (use ?path=xxx)' });
        return;
      }

      // Check ownership
      if (!db.userOwnsProject(req.auth.userId, projectId)) {
        res.status(403).json({ error: 'Forbidden', message: 'You do not own this project' });
        return;
      }

      const dbConn = db.getDb();

      // Get file metadata
      const file = dbConn.prepare(`
        SELECT file_id, file_path, file_hash, language, size_bytes, line_count, indexed_at
        FROM files
        WHERE project_id = ? AND file_path = ?
      `).get(projectId, filePath) as any;

      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      // Get all chunks for this file, sorted by start_line
      const chunks = dbConn.prepare(`
        SELECT chunk_text, start_line, end_line
        FROM chunks
        WHERE file_id = ?
        ORDER BY start_line ASC
      `).all(file.file_id) as any[];

      // Reconstruct file content from chunks
      let content = '';
      if (chunks.length > 0) {
        // Build a map of line number -> line content
        const lineMap = new Map<number, string>();

        for (const chunk of chunks) {
          const chunkLines = chunk.chunk_text.split('\n');
          for (let i = 0; i < chunkLines.length; i++) {
            const lineNumber = chunk.start_line + i;
            // Only add if not already present (first chunk wins for overlaps)
            if (!lineMap.has(lineNumber)) {
              lineMap.set(lineNumber, chunkLines[i]);
            }
          }
        }

        // Sort by line number and concatenate
        const sortedLines = Array.from(lineMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([_, line]) => line);

        content = sortedLines.join('\n');
      }

      res.json({
        fileId: file.file_id,
        filePath: file.file_path,
        fileHash: file.file_hash,
        language: file.language,
        sizeBytes: file.size_bytes,
        lineCount: file.line_count,
        indexedAt: file.indexed_at,
        content: content,
      });
    } catch (err) {
      log.error('Failed to get file content:', err);
      res.status(500).json({ error: 'Failed to get file content', details: (err as Error).message });
    }
  });

  /**
   * PUT /api/projects/:projectId/file?path=xxx
   * Save file content to database (NOT git repo)
   * This will re-chunk and re-index the file
   */
  router.put('/:projectId/file', async (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { projectId } = req.params;
      const filePath = req.query.path as string;
      const { content } = req.body;

      if (!filePath) {
        res.status(400).json({ error: 'File path is required (use ?path=xxx)' });
        return;
      }

      if (content === undefined) {
        res.status(400).json({ error: 'Content is required' });
        return;
      }

      // Check ownership
      if (!db.userOwnsProject(req.auth.userId, projectId)) {
        res.status(403).json({ error: 'Forbidden', message: 'You do not own this project' });
        return;
      }

      // Detect language from file extension
      const ext = filePath.split('.').pop()?.toLowerCase() || '';
      const languageMap: Record<string, string> = {
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
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'md': 'markdown',
        'txt': 'plaintext',
      };
      const language = languageMap[ext] || 'plaintext';

      // Use tree-sitter for intelligent chunking with fallback to line-based
      const chunks = await chunkCodeWithFallback(content, language, filePath);

      // Compute file hash
      const fileHash = crypto.createHash('sha256').update(content).digest('hex');

      // Call ingestion service to save to database
      await ingestionService.ingestChunks(projectId, [{
        filePath,
        fileHash,
        language,
        chunks,
      }]);

      res.json({
        success: true,
        filePath,
        language,
        chunksCreated: chunks.length,
      });
    } catch (err) {
      log.error('Failed to save file:', err);
      res.status(500).json({ error: 'Failed to save file', details: (err as Error).message });
    }
  });

  /**
   * POST /api/projects/:projectId/merkle-sync
   * Sync files using Merkle tree comparison
   * Step 1: Accepts Merkle tree, compares with saved tree, returns list of changed files
   * Step 2: Frontend sends only changed file contents
   */
  router.post('/:projectId/merkle-sync', async (req: AuthRequest, res) => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { projectId } = req.params;
      const { merkleTree, files } = req.body;

      if (!merkleTree) {
        res.status(400).json({ error: 'merkleTree is required' });
        return;
      }

      // Check ownership
      if (!db.userOwnsProject(req.auth.userId, projectId)) {
        res.status(403).json({ error: 'Forbidden', message: 'You do not own this project' });
        return;
      }

      // Get saved Merkle tree from database
      const dbConn = db.getDb();
      const project = dbConn.prepare(`
        SELECT merkle_json FROM projects WHERE project_id = ?
      `).get(projectId) as { merkle_json: string | null } | undefined;

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const oldMerkleTree = project.merkle_json
        ? MerkleNode.fromJSON(JSON.parse(project.merkle_json))
        : null;

      const newMerkleTree = MerkleNode.fromJSON(merkleTree);

      log.info(`🔄 Merkle tree sync for project ${projectId}`);
      log.info(`   Old tree hash: ${oldMerkleTree?.hash.substring(0, 16) || 'none'}`);
      log.info(`   New tree hash: ${newMerkleTree.hash.substring(0, 16)}`);

      if (oldMerkleTree && oldMerkleTree.hash === newMerkleTree.hash) {
        // No changes
        res.json({
          success: true,
          changes: [],
          summary: { added: 0, modified: 0, deleted: 0, total: 0 },
          message: 'No changes detected',
          needsFiles: []
        });
        return;
      }

      // Compare trees to find changes
      let changes: any[];
      if (oldMerkleTree) {
        // Compare existing tree with new tree
        changes = compareTrees(oldMerkleTree, newMerkleTree);
      } else {
        // First sync - all files in new tree are "added"
        const getAllFiles = (node: MerkleNode, pathPrefix: string = ''): any[] => {
          if (node.isLeaf) {
            return [{
              path: node.path,
              changeType: 'Added',
              oldHash: null,
              newHash: node.hash
            }];
          }

          const files: any[] = [];
          if (node.children) {
            for (const child of node.children) {
              files.push(...getAllFiles(child, pathPrefix));
            }
          }
          return files;
        };

        changes = getAllFiles(newMerkleTree);
      }

      const summary = summarizeChanges(changes);
      log.info(`   Changes: ${summary.added} added, ${summary.modified} modified, ${summary.deleted} deleted`);

      // Get files that need to be processed (added or modified)
      const filesToProcess = getFilesToProcess(changes);

      // Get deleted files
      const deletedFiles = changes
        .filter((c) => c.changeType === 'Deleted')
        .map((c) => c.path);

      // If files content not provided, just return the list of files we need
      if (!files) {
        res.json({
          success: true,
          changes,
          summary,
          needsFiles: filesToProcess,
          message: `Found ${filesToProcess.length} changed files. Please send file contents.`
        });
        return;
      }

      // Process deleted files first
      if (deletedFiles.length > 0) {
        log.info(`🗑️  Deleting ${deletedFiles.length} files...`);
        for (const deletedPath of deletedFiles) {
          try {
            await ingestionService.deleteFile(projectId, deletedPath);
            log.info(`   ✓ Deleted: ${deletedPath}`);
          } catch (err) {
            log.error(`   ✗ Failed to delete ${deletedPath}:`, err);
          }
        }
      }

      // Process each changed file
      const chunkInputs = [];
      const languageMap: Record<string, string> = {
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
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'md': 'markdown',
        'txt': 'plaintext',
      };

      for (const filePath of filesToProcess) {
        const fileData = files[filePath];
        if (!fileData) {
          log.warn(`File content not provided for ${filePath}`);
          continue;
        }

        const content = fileData.content || '';
        const fileHash = crypto.createHash('sha256').update(content).digest('hex');

        const ext = filePath.split('.').pop()?.toLowerCase() || '';
        const language = languageMap[ext] || 'plaintext';

        // Use tree-sitter for intelligent chunking with fallback to line-based
        const chunks = await chunkCodeWithFallback(content, language, filePath);

        chunkInputs.push({
          filePath,
          fileHash,
          language,
          chunks,
        });
      }

      // Ingest all changed files
      if (chunkInputs.length > 0) {
        await ingestionService.ingestChunks(projectId, chunkInputs);
      }

      // Update saved Merkle tree
      dbConn.prepare(`
        UPDATE projects
        SET merkle_json = ?, updated_at = ?
        WHERE project_id = ?
      `).run(
        JSON.stringify(newMerkleTree.toJSON()),
        Date.now(),
        projectId
      );

      log.info(`✓ Merkle sync completed: ${chunkInputs.length} files processed, ${deletedFiles.length} files deleted`);

      res.json({
        success: true,
        changes,
        summary,
        filesProcessed: chunkInputs.length,
        filesDeleted: deletedFiles.length,
        message: `Processed ${chunkInputs.length} changed files, deleted ${deletedFiles.length} files`
      });
    } catch (err) {
      log.error('Failed to sync with Merkle tree:', err);
      res.status(500).json({ error: 'Failed to sync', details: (err as Error).message });
    }
  });

  return router;
}
