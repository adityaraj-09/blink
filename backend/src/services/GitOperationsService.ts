import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

export interface PullResult {
  filesChanged: number;
  insertions: number;
  deletions: number;
  summary: string;
}

export interface GitStatus {
  modified: string[];
  added: string[];
  deleted: string[];
  renamed: string[];
  staged: string[];
  unstaged: string[];
}

export interface FileDiff {
  file: string;
  changes: number;
  insertions: number;
  deletions: number;
  type: 'modified' | 'added' | 'deleted' | 'renamed';
}

export interface Author {
  name: string;
  email: string;
}

export class GitOperationsService {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;

    const options: Partial<SimpleGitOptions> = {
      baseDir: repoPath,
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false
    };

    this.git = simpleGit(options);
  }

  /**
   * Clone a repository
   */
  static async clone(
    cloneUrl: string,
    localPath: string,
    accessToken: string
  ): Promise<GitOperationsService> {
    // Ensure parent directory exists
    const parentDir = path.dirname(localPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // If directory exists, remove it first
    if (fs.existsSync(localPath)) {
      fs.rmSync(localPath, { recursive: true, force: true });
    }

    // Inject token into clone URL for authentication
    const authenticatedUrl = cloneUrl.replace(
      'https://github.com/',
      `https://${accessToken}@github.com/`
    );

    const git = simpleGit();
    await git.clone(authenticatedUrl, localPath, ['--depth', '1']);

    return new GitOperationsService(localPath);
  }

  /**
   * Configure git user for commits
   */
  async configureUser(author: Author): Promise<void> {
    await this.git.addConfig('user.name', author.name);
    await this.git.addConfig('user.email', author.email);
  }

  /**
   * Pull latest changes
   */
  async pull(branch?: string): Promise<PullResult> {
    try {
      const pullSummary = await this.git.pull('origin', branch);

      return {
        filesChanged: pullSummary.files.length,
        insertions: pullSummary.summary.insertions || 0,
        deletions: pullSummary.summary.deletions || 0,
        summary: pullSummary.summary.changes + ' changes'
      };
    } catch (error: any) {
      console.error('Pull failed:', error.message);
      throw new Error('Failed to pull changes from remote');
    }
  }

  /**
   * Checkout a branch
   */
  async checkout(branch: string, createNew: boolean = false): Promise<void> {
    try {
      if (createNew) {
        await this.git.checkoutLocalBranch(branch);
      } else {
        await this.git.checkout(branch);
      }
    } catch (error: any) {
      console.error('Checkout failed:', error.message);
      throw new Error(`Failed to checkout branch ${branch}`);
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch (error: any) {
      console.error('Failed to get current branch:', error.message);
      throw new Error('Failed to get current branch');
    }
  }

  /**
   * List all branches
   */
  async listBranches(): Promise<string[]> {
    try {
      const branches = await this.git.branchLocal();
      return branches.all;
    } catch (error: any) {
      console.error('Failed to list branches:', error.message);
      throw new Error('Failed to list branches');
    }
  }

  /**
   * Stage files
   */
  async stage(filePaths: string[]): Promise<void> {
    try {
      await this.git.add(filePaths);
    } catch (error: any) {
      console.error('Stage failed:', error.message);
      throw new Error('Failed to stage files');
    }
  }

  /**
   * Unstage files
   */
  async unstage(filePaths: string[]): Promise<void> {
    try {
      await this.git.reset(['HEAD', ...filePaths]);
    } catch (error: any) {
      console.error('Unstage failed:', error.message);
      throw new Error('Failed to unstage files');
    }
  }

  /**
   * Commit staged changes
   */
  async commit(message: string, author?: Author): Promise<string> {
    try {
      if (author) {
        await this.configureUser(author);
      }

      const result = await this.git.commit(message);
      return result.commit;
    } catch (error: any) {
      console.error('Commit failed:', error.message);
      throw new Error('Failed to create commit');
    }
  }

  /**
   * Push to remote
   */
  async push(branch: string, accessToken: string, force: boolean = false): Promise<void> {
    try {
      // Configure remote with authentication
      const remoteUrl = await this.getRemoteUrl();
      const authenticatedUrl = remoteUrl.replace(
        'https://github.com/',
        `https://${accessToken}@github.com/`
      );

      await this.git.remote(['set-url', 'origin', authenticatedUrl]);

      const options = force ? ['--force'] : [];
      await this.git.push('origin', branch, options);

      // Remove token from remote URL for security
      await this.git.remote(['set-url', 'origin', remoteUrl]);
    } catch (error: any) {
      console.error('Push failed:', error.message);
      throw new Error('Failed to push to remote');
    }
  }

  /**
   * Get remote URL
   */
  async getRemoteUrl(): Promise<string> {
    try {
      const remotes = await this.git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');

      if (!origin || !origin.refs.push) {
        throw new Error('Origin remote not found');
      }

      return origin.refs.push;
    } catch (error: any) {
      console.error('Failed to get remote URL:', error.message);
      throw new Error('Failed to get remote URL');
    }
  }

  /**
   * Get git status
   */
  async getStatus(): Promise<GitStatus> {
    try {
      const status = await this.git.status();

      return {
        modified: status.modified,
        added: status.created,
        deleted: status.deleted,
        renamed: status.renamed.map(r => r.to),
        staged: status.staged,
        unstaged: [...status.modified, ...status.created, ...status.deleted]
      };
    } catch (error: any) {
      console.error('Failed to get status:', error.message);
      throw new Error('Failed to get git status');
    }
  }

  /**
   * Get diff for uncommitted changes
   */
  async getDiff(): Promise<string> {
    try {
      const diff = await this.git.diff();
      return diff;
    } catch (error: any) {
      console.error('Failed to get diff:', error.message);
      throw new Error('Failed to get diff');
    }
  }

  /**
   * Get file diff summary
   */
  async getDiffSummary(): Promise<FileDiff[]> {
    try {
      const diffSummary = await this.git.diffSummary();

      return diffSummary.files.map((file: any) => ({
        file: file.file,
        changes: file.changes || 0,
        insertions: file.insertions || 0,
        deletions: file.deletions || 0,
        type: this.determineChangeType(file)
      }));
    } catch (error: any) {
      console.error('Failed to get diff summary:', error.message);
      throw new Error('Failed to get diff summary');
    }
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const fullPath = path.join(this.repoPath, filePath);
      return fs.readFileSync(fullPath, 'utf-8');
    } catch (error: any) {
      console.error('Failed to read file:', error.message);
      throw new Error(`Failed to read file ${filePath}`);
    }
  }

  /**
   * Write file content
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const fullPath = path.join(this.repoPath, filePath);
      const dir = path.dirname(fullPath);

      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, content, 'utf-8');
    } catch (error: any) {
      console.error('Failed to write file:', error.message);
      throw new Error(`Failed to write file ${filePath}`);
    }
  }

  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.repoPath, filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (error: any) {
      console.error('Failed to delete file:', error.message);
      throw new Error(`Failed to delete file ${filePath}`);
    }
  }

  /**
   * Get latest commit SHA
   */
  async getLatestCommitSha(): Promise<string> {
    try {
      const log = await this.git.log({ maxCount: 1 });
      return log.latest?.hash || '';
    } catch (error: any) {
      console.error('Failed to get latest commit:', error.message);
      throw new Error('Failed to get latest commit SHA');
    }
  }

  /**
   * Get commit history
   */
  async getCommitHistory(limit: number = 20): Promise<any[]> {
    try {
      const log = await this.git.log({ maxCount: limit });
      return [...log.all];
    } catch (error: any) {
      console.error('Failed to get commit history:', error.message);
      throw new Error('Failed to get commit history');
    }
  }

  /**
   * Check if file exists in repository
   */
  fileExists(filePath: string): boolean {
    const fullPath = path.join(this.repoPath, filePath);
    return fs.existsSync(fullPath);
  }

  /**
   * List all files in repository (excluding .git)
   */
  async listFiles(directory: string = ''): Promise<string[]> {
    const files: string[] = [];
    const basePath = path.join(this.repoPath, directory);

    const walkDir = (dir: string) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(this.repoPath, fullPath);

        // Skip .git directory
        if (relativePath.startsWith('.git')) {
          continue;
        }

        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else {
          files.push(relativePath);
        }
      }
    };

    walkDir(basePath);
    return files;
  }

  /**
   * Determine change type from diff file info
   */
  private determineChangeType(file: any): 'modified' | 'added' | 'deleted' | 'renamed' {
    if (file.binary) {
      return 'modified';
    }
    if (file.insertions > 0 && file.deletions === 0) {
      return 'added';
    }
    if (file.deletions > 0 && file.insertions === 0) {
      return 'deleted';
    }
    return 'modified';
  }
}
