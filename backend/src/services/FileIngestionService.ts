import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { GitOperationsService } from './GitOperationsService';
import { CodeIngestionService, ChunkInput } from './code-ingestion-service';
import { DatabaseSchema } from '../database/schema';
import { MerkleHasher, MerkleNode } from './merkle';

/**
 * Configuration for file ingestion
 */
export interface IngestionConfig {
  maxFileSize?: number; // Max file size in bytes (default 1MB)
  chunkSize?: number; // Lines per chunk (default 50)
  chunkOverlap?: number; // Overlap lines between chunks (default 5)
}

/**
 * Ingestion progress info
 */
export interface IngestionProgress {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalFiles: number;
  processedFiles: number;
  totalChunks: number;
  currentFile: string | null;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
}

/**
 * File ingestion service
 * Processes cloned repository files and feeds them to CodeIngestionService
 */
export class FileIngestionService {
  private db: DatabaseSchema;
  private codeIngestion: CodeIngestionService;
  private config: Required<IngestionConfig>;

  // Files/directories to ignore
  private readonly IGNORE_PATTERNS = [
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
  ];

  // File extensions to ignore
  private readonly IGNORE_EXTENSIONS = [
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

  // Supported code file extensions
  private readonly CODE_EXTENSIONS: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.h': 'cpp',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
    '.scala': 'scala',
    '.sh': 'bash',
    '.sql': 'sql',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.xml': 'xml',
    '.md': 'markdown',
    '.txt': 'plaintext',
  };

  constructor(
    db: DatabaseSchema,
    codeIngestion: CodeIngestionService,
    config?: IngestionConfig
  ) {
    this.db = db;
    this.codeIngestion = codeIngestion;
    this.config = {
      maxFileSize: config?.maxFileSize || 1024 * 1024, // 1MB
      chunkSize: config?.chunkSize || 50,
      chunkOverlap: config?.chunkOverlap || 5,
    };
  }

  /**
   * Ingest all files from a cloned repository
   * Runs in background and updates progress in database
   */
  async ingestRepository(
    projectId: string,
    localPath: string
  ): Promise<void> {
    console.log(`📦 Starting file ingestion for project ${projectId}`);

    const startTime = Date.now();

    try {
      // Build Merkle tree from cloned repository
      console.log(`🌳 Building Merkle tree for project ${projectId}...`);
      const merkleHasher = new MerkleHasher();
      const merkleTree = await merkleHasher.buildTreeFromDirectory(localPath, 'root');
      console.log(`✓ Merkle tree built: ${merkleTree.countFiles()} files, root hash: ${merkleTree.hash.substring(0, 16)}`);

      // Save Merkle tree to database
      const db = this.db.getDb();
      db.prepare(`
        UPDATE projects
        SET merkle_json = ?
        WHERE project_id = ?
      `).run(
        JSON.stringify(merkleTree.toJSON()),
        projectId
      );
      console.log(`✓ Merkle tree saved to database`);

      // Update status to processing
      await this.updateIngestionProgress(projectId, {
        status: 'processing',
        totalFiles: 0,
        processedFiles: 0,
        totalChunks: 0,
        currentFile: null,
        error: null,
        startedAt: startTime,
        completedAt: null,
      });

      // Get list of all files
      const gitOps = new GitOperationsService(localPath);
      const allFiles = await gitOps.listFiles();

      // Filter files
      const filesToProcess = allFiles.filter(file => this.shouldProcessFile(file));

      console.log(`📁 Found ${filesToProcess.length} files to process (out of ${allFiles.length} total)`);

      // Update total files count
      await this.updateIngestionProgress(projectId, {
        status: 'processing',
        totalFiles: filesToProcess.length,
        processedFiles: 0,
        totalChunks: 0,
        currentFile: null,
        error: null,
        startedAt: startTime,
        completedAt: null,
      });

      // Process files in batches
      const batchSize = 10;
      let processedCount = 0;
      let totalChunks = 0;

      for (let i = 0; i < filesToProcess.length; i += batchSize) {
        const batch = filesToProcess.slice(i, i + batchSize);
        const chunkInputs: ChunkInput[] = [];

        for (const filePath of batch) {
          try {
            // Update current file
            await this.updateIngestionProgress(projectId, {
              status: 'processing',
              totalFiles: filesToProcess.length,
              processedFiles: processedCount,
              totalChunks: totalChunks,
              currentFile: filePath,
              error: null,
              startedAt: startTime,
              completedAt: null,
            });

            const fileContent = await gitOps.readFile(filePath);
            const fileHash = this.computeFileHash(fileContent);
            const language = this.detectLanguage(filePath);

            // Chunk the file
            const chunks = this.chunkFile(fileContent, filePath);

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
            console.error(`❌ Failed to process file ${filePath}:`, error.message);
            // Continue with next file
          }
        }

        // Ingest batch
        if (chunkInputs.length > 0) {
          try {
            await this.codeIngestion.ingestChunks(projectId, chunkInputs);
            console.log(`✅ Ingested batch of ${chunkInputs.length} files`);
          } catch (error: any) {
            console.error(`❌ Failed to ingest batch:`, error.message);
          }
        }

        // Update progress
        await this.updateIngestionProgress(projectId, {
          status: 'processing',
          totalFiles: filesToProcess.length,
          processedFiles: processedCount,
          totalChunks: totalChunks,
          currentFile: null,
          error: null,
          startedAt: startTime,
          completedAt: null,
        });
      }

      // Mark as completed
      const completedAt = Date.now();
      await this.updateIngestionProgress(projectId, {
        status: 'completed',
        totalFiles: filesToProcess.length,
        processedFiles: processedCount,
        totalChunks: totalChunks,
        currentFile: null,
        error: null,
        startedAt: startTime,
        completedAt,
      });

      const duration = ((completedAt - startTime) / 1000).toFixed(2);
      console.log(`✅ File ingestion completed in ${duration}s`);
      console.log(`   - Files processed: ${processedCount}`);
      console.log(`   - Chunks created: ${totalChunks}`);

      // Cleanup cloned repo to save disk space (all data is in database now)
      await this.cleanupClonedRepo(localPath);

    } catch (error: any) {
      console.error(`❌ File ingestion failed:`, error.message);

      await this.updateIngestionProgress(projectId, {
        status: 'failed',
        totalFiles: 0,
        processedFiles: 0,
        totalChunks: 0,
        currentFile: null,
        error: error.message,
        startedAt: startTime,
        completedAt: Date.now(),
      });

      throw error;
    }
  }

  /**
   * Check if file should be processed
   */
  private shouldProcessFile(filePath: string): boolean {
    // Check if path contains ignored directories
    const pathParts = filePath.split(path.sep);
    for (const part of pathParts) {
      if (this.IGNORE_PATTERNS.includes(part)) {
        return false;
      }
    }

    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    if (this.IGNORE_EXTENSIONS.includes(ext)) {
      return false;
    }

    // Must be a supported code file
    return ext in this.CODE_EXTENSIONS;
  }

  /**
   * Detect programming language from file path
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return this.CODE_EXTENSIONS[ext] || 'plaintext';
  }

  /**
   * Compute file hash for change detection
   */
  private computeFileHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Chunk file content into smaller pieces
   * Simple line-based chunking for now
   */
  private chunkFile(
    content: string,
    filePath: string
  ): Array<{
    chunkText: string;
    startLine: number;
    endLine: number;
    chunkType: string;
    chunkName?: string;
  }> {
    const lines = content.split('\n');
    const chunks: Array<{
      chunkText: string;
      startLine: number;
      endLine: number;
      chunkType: string;
      chunkName?: string;
    }> = [];

    // Skip empty files
    if (lines.length === 0) {
      return chunks;
    }

    const { chunkSize, chunkOverlap } = this.config;

    for (let i = 0; i < lines.length; i += chunkSize - chunkOverlap) {
      const endLine = Math.min(i + chunkSize, lines.length);
      const chunkLines = lines.slice(i, endLine);
      const chunkText = chunkLines.join('\n');

      // Skip empty chunks
      if (chunkText.trim().length === 0) {
        continue;
      }

      chunks.push({
        chunkText,
        startLine: i + 1, // 1-indexed
        endLine: endLine,
        chunkType: 'code_block',
        chunkName: `${path.basename(filePath)}:${i + 1}-${endLine}`,
      });
    }

    return chunks;
  }

  /**
   * Update ingestion progress in database
   */
  private async updateIngestionProgress(
    projectId: string,
    progress: IngestionProgress
  ): Promise<void> {
    const db = this.db.getDb();

    db.prepare(`
      UPDATE projects
      SET metadata = ?
      WHERE project_id = ?
    `).run(
      JSON.stringify({ ingestionProgress: progress }),
      projectId
    );
  }

  /**
   * Get ingestion progress from database
   */
  async getIngestionProgress(projectId: string): Promise<IngestionProgress | null> {
    const db = this.db.getDb();

    const project = db.prepare(`
      SELECT metadata FROM projects WHERE project_id = ?
    `).get(projectId) as { metadata: string | null } | undefined;

    if (!project || !project.metadata) {
      return null;
    }

    try {
      const metadata = JSON.parse(project.metadata);
      return metadata.ingestionProgress || null;
    } catch {
      return null;
    }
  }

  /**
   * Ingest a batch of files sent from the frontend
   * This method processes files that are sent as content (not from local filesystem)
   */
  async ingestFileBatch(
    projectId: string,
    files: Array<{ path: string; content: string; size: number }>
  ): Promise<{ chunksCreated: number; filesProcessed: number }> {
    console.log(`📦 Ingesting batch of ${files.length} files for project ${projectId}`);

    let chunksCreated = 0;
    let filesProcessed = 0;

    const chunkInputs: ChunkInput[] = [];

    for (const file of files) {
      try {
        // Skip files that shouldn't be processed
        if (!this.shouldProcessFile(file.path)) {
          continue;
        }

        const fileHash = this.computeFileHash(file.content);
        const language = this.detectLanguage(file.path);
        const chunks = this.chunkFile(file.content, file.path);

        if (chunks.length > 0) {
          chunkInputs.push({
            filePath: file.path,
            fileHash,
            language,
            chunks,
          });

          chunksCreated += chunks.length;
        }

        filesProcessed++;
      } catch (error: any) {
        console.error(`❌ Failed to process file ${file.path}:`, error.message);
        // Continue with next file
      }
    }

    // Ingest all chunks to vector store
    if (chunkInputs.length > 0) {
      try {
        await this.codeIngestion.ingestChunks(projectId, chunkInputs);
        console.log(`✅ Ingested ${chunkInputs.length} files, ${chunksCreated} chunks`);
      } catch (error: any) {
        console.error(`❌ Failed to ingest chunks:`, error.message);
        throw error;
      }
    }

    return { chunksCreated, filesProcessed };
  }

  /**
   * Cleanup cloned repository folder
   */
  private async cleanupClonedRepo(localPath: string): Promise<void> {
    try {
      console.log(`🧹 Cleaning up cloned repo at ${localPath}`);
      if (fs.existsSync(localPath)) {
        fs.rmSync(localPath, { recursive: true, force: true });
        console.log(`✅ Cleanup completed`);
      }
    } catch (error: any) {
      console.error(`⚠️  Failed to cleanup cloned repo:`, error.message);
      // Don't throw - cleanup failure shouldn't break ingestion
    }
  }
}
