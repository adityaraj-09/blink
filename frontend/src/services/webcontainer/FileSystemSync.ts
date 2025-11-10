import WebContainerService from './WebContainerService';

/**
 * File system sync service
 * Converts project files to WebContainer file system format and syncs changes
 */
export class FileSystemSync {
  private projectFiles: Map<string, string> = new Map();
  private syncInProgress = false;

  /**
   * Convert project files to WebContainer mount format
   */
  static convertToWebContainerFormat(
    files: Array<{ path: string; content: string }>
  ): { [path: string]: { file: { contents: string } } } {
    const result: { [path: string]: { file: { contents: string } } } = {};

    files.forEach(({ path, content }) => {
      // Normalize path (remove leading slash if present)
      const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

      result[normalizedPath] = {
        file: {
          contents: content,
        },
      };
    });

    return result;
  }

  /**
   * Convert directory tree to WebContainer mount format
   */
  static convertTreeToWebContainerFormat(tree: {
    [key: string]: { type: 'file' | 'directory'; content?: string; children?: any };
  }): { [path: string]: any } {
    const result: { [path: string]: any } = {};

    const processNode = (node: any, path: string) => {
      if (node.type === 'file') {
        result[path] = {
          file: {
            contents: node.content || '',
          },
        };
      } else if (node.type === 'directory' && node.children) {
        result[path] = {
          directory: processChildren(node.children, path),
        };
      }
    };

    const processChildren = (children: any, parentPath: string): any => {
      const dir: any = {};

      Object.entries(children).forEach(([name, node]: [string, any]) => {
        const childPath = parentPath ? `${parentPath}/${name}` : name;

        if (node.type === 'file') {
          dir[name] = {
            file: {
              contents: node.content || '',
            },
          };
        } else if (node.type === 'directory' && node.children) {
          dir[name] = {
            directory: processChildren(node.children, childPath),
          };
        }
      });

      return dir;
    };

    Object.entries(tree).forEach(([name, node]: [string, any]) => {
      if (node.type === 'file') {
        result[name] = {
          file: {
            contents: node.content || '',
          },
        };
      } else if (node.type === 'directory' && node.children) {
        result[name] = {
          directory: processChildren(node.children, name),
        };
      }
    });

    return result;
  }

  /**
   * Load and mount project files to WebContainer
   */
  async mountProjectFiles(
    files: Array<{ path: string; content: string }>
  ): Promise<void> {
    if (this.syncInProgress) {
      console.warn('[FileSystemSync] Sync already in progress');
      return;
    }

    this.syncInProgress = true;

    try {
      // Store files in memory
      files.forEach(({ path, content }) => {
        this.projectFiles.set(path, content);
      });

      // Convert to WebContainer format
      const wcFiles = FileSystemSync.convertToWebContainerFormat(files);

      // Mount to WebContainer
      await WebContainerService.mountFiles(wcFiles);

      console.log(`[FileSystemSync] Mounted ${files.length} files`);
    } catch (error) {
      console.error('[FileSystemSync] Mount error:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync a single file change to WebContainer
   */
  async syncFile(path: string, content: string): Promise<void> {
    try {
      // Normalize path
      const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

      // Update in-memory cache
      this.projectFiles.set(path, content);

      // Write to WebContainer
      await WebContainerService.writeFile(normalizedPath, content);

      console.log(`[FileSystemSync] Synced file: ${path}`);
    } catch (error) {
      console.error(`[FileSystemSync] Error syncing file ${path}:`, error);
      throw error;
    }
  }

  /**
   * Sync multiple file changes
   */
  async syncMultipleFiles(
    changes: Array<{ path: string; content: string }>
  ): Promise<void> {
    const promises = changes.map(({ path, content }) =>
      this.syncFile(path, content)
    );

    await Promise.all(promises);
  }

  /**
   * Delete a file from WebContainer
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const normalizedPath = path.startsWith('/') ? path.slice(1) : path;

      this.projectFiles.delete(path);
      await WebContainerService.deleteFile(normalizedPath);

      console.log(`[FileSystemSync] Deleted file: ${path}`);
    } catch (error) {
      console.error(`[FileSystemSync] Error deleting file ${path}:`, error);
      throw error;
    }
  }

  /**
   * Create a new file in WebContainer
   */
  async createFile(path: string, content: string = ''): Promise<void> {
    await this.syncFile(path, content);
  }

  /**
   * Create a directory in WebContainer
   */
  async createDirectory(path: string): Promise<void> {
    try {
      const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
      await WebContainerService.mkdir(normalizedPath);

      console.log(`[FileSystemSync] Created directory: ${path}`);
    } catch (error) {
      console.error(`[FileSystemSync] Error creating directory ${path}:`, error);
      throw error;
    }
  }

  /**
   * Read file from WebContainer
   */
  async readFile(path: string): Promise<string> {
    try {
      const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
      const content = await WebContainerService.readFile(normalizedPath);

      return content;
    } catch (error) {
      console.error(`[FileSystemSync] Error reading file ${path}:`, error);
      throw error;
    }
  }

  /**
   * List directory contents from WebContainer
   */
  async listDirectory(path: string): Promise<string[]> {
    try {
      const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
      const entries = await WebContainerService.readdir(normalizedPath || '.');

      return entries;
    } catch (error) {
      console.error(`[FileSystemSync] Error listing directory ${path}:`, error);
      throw error;
    }
  }

  /**
   * Get all cached files
   */
  getCachedFiles(): Map<string, string> {
    return new Map(this.projectFiles);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.projectFiles.clear();
  }

  /**
   * Check if sync is in progress
   */
  isSyncing(): boolean {
    return this.syncInProgress;
  }
}

export default new FileSystemSync();
