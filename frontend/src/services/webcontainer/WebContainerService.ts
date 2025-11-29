import { WebContainer, WebContainerProcess } from '@webcontainer/api';

/**
 * WebContainer service for managing in-browser runtime environment
 * Handles container lifecycle, file system mounting, and process execution
 */
export class WebContainerService {
  private static instance: WebContainerService | null = null;
  private container: WebContainer | null = null;
  private processes: Map<string, WebContainerProcess> = new Map();
  private bootPromise: Promise<WebContainer> | null = null;

  private constructor() {
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WebContainerService {
    if (!WebContainerService.instance) {
      WebContainerService.instance = new WebContainerService();
    }
    return WebContainerService.instance;
  }

  /**
   * Boot WebContainer (lazy initialization)
   */
  async boot(): Promise<WebContainer> {
    if (this.container) {
      return this.container;
    }

    if (this.bootPromise) {
      return this.bootPromise;
    }

    console.log('[WebContainer] Starting boot process...');
    this.bootPromise = WebContainer.boot();

    try {
      this.container = await this.bootPromise;
      console.log('[WebContainer] Successfully booted');

      // Set up default environment
      await this.setupEnvironment();

      return this.container;
    } catch (error) {
      this.bootPromise = null;
      console.error('[WebContainer] Boot failed:', error);
      
      // Check if it's a cross-origin isolation error
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('SharedArrayBuffer') || 
          errorMessage.includes('crossOriginIsolated') ||
          errorMessage.includes('DataCloneError')) {
        
        const isHttps = window.location.protocol === 'https:';
        const isCrossOriginIsolated = self.crossOriginIsolated || false;
        
    
        
        throw new Error(
          `WebContainer requires Cross-Origin Isolation. ` +
          `${!isHttps ? 'Access via https://localhost:5173. ' : ''}` +
          `${!isCrossOriginIsolated ? 'Ensure headers are configured and restart dev server. ' : ''}` +
          `See console for details.`
        );
      }
      
      throw new Error(`Failed to boot WebContainer: ${error}`);
    }
  }

  /**
   * Set up default environment and install basic tools
   */
  private async setupEnvironment(): Promise<void> {
    if (!this.container) return;

    // Create common directories
    await this.container.fs.mkdir('/home', { recursive: true });
    await this.container.fs.mkdir('/tmp', { recursive: true });
  }

  /**
   * Get WebContainer instance (boots if not ready)
   */
  async getContainer(): Promise<WebContainer> {
    if (!this.container) {
      return await this.boot();
    }
    return this.container;
  }

  /**
   * Mount file system from project files
   */
  async mountFiles(files: { [path: string]: { file: { contents: string } } }): Promise<void> {
    const container = await this.getContainer();
    await container.mount(files);
    console.log('[WebContainer] Mounted files:', Object.keys(files));
  }

  /**
   * Write a single file
   */
  async writeFile(path: string, content: string): Promise<void> {
    const container = await this.getContainer();
    await container.fs.writeFile(path, content);
    console.log('[WebContainer] Wrote file:', path);
  }

  /**
   * Read a file
   */
  async readFile(path: string): Promise<string> {
    const container = await this.getContainer();
    const content = await container.fs.readFile(path, 'utf-8');
    return content;
  }

  /**
   * Delete a file
   */
  async deleteFile(path: string): Promise<void> {
    const container = await this.getContainer();
    await container.fs.rm(path);
    console.log('[WebContainer] Deleted file:', path);
  }

  /**
   * Create directory
   */
  async mkdir(path: string): Promise<void> {
    const container = await this.getContainer();
    await container.fs.mkdir(path, { recursive: true });
    console.log('[WebContainer] Created directory:', path);
  }

  /**
   * List directory contents
   */
  async readdir(path: string): Promise<string[]> {
    const container = await this.getContainer();
    const entries = await container.fs.readdir(path);
    return entries as string[];
  }

  /**
   * Spawn a process (interactive shell, server, etc.)
   */
  async spawn(
    command: string,
    args: string[] = [],
    options?: {
      cwd?: string;
      env?: Record<string, string>;
      output?: (data: string) => void;
      terminal?: { cols: number; rows: number };
    }
  ): Promise<WebContainerProcess> {
    const container = await this.getContainer();

    const process = await container.spawn(command, args, {
      cwd: options?.cwd,
      env: options?.env,
      terminal: options?.terminal,
    });

    // Handle output if callback provided
    if (options?.output) {
      process.output.pipeTo(
        new WritableStream({
          write: (data) => {
            options.output!(data);
          },
        })
      );
    }

    const processId = `${command}-${Date.now()}`;
    this.processes.set(processId, process);

    // Clean up when process exits
    process.exit.then(() => {
      this.processes.delete(processId);
      console.log(`[WebContainer] Process exited: ${processId}`);
    });

    return process;
  }

  /**
   * Execute a command and wait for completion
   */
  async exec(
    command: string,
    args: string[] = [],
    options?: { cwd?: string; env?: Record<string, string> }
  ): Promise<{ exitCode: number; output: string }> {
    const outputChunks: string[] = [];

    const process = await this.spawn(command, args, {
      ...options,
      output: (data) => outputChunks.push(data),
    });

    const exitCode = await process.exit;

    return {
      exitCode,
      output: outputChunks.join(''),
    };
  }

  /**
   * Install npm packages
   */
  async npmInstall(packages?: string[]): Promise<{ exitCode: number; output: string }> {
    console.log('[WebContainer] Installing packages:', packages || 'all dependencies');

    if (packages && packages.length > 0) {
      return await this.exec('npm', ['install', ...packages]);
    } else {
      return await this.exec('npm', ['install']);
    }
  }

  /**
   * Run npm script
   */
  async npmRun(script: string): Promise<WebContainerProcess> {
    console.log('[WebContainer] Running npm script:', script);
    return await this.spawn('npm', ['run', script]);
  }

  /**
   * Start development server
   */
  async startDevServer(command: string = 'npm', args: string[] = ['run', 'dev']): Promise<WebContainerProcess> {
    console.log('[WebContainer] Starting dev server');
    const process = await this.spawn(command, args, {
      terminal: { cols: 80, rows: 30 },
    });

    return process;
  }

  /**
   * Get server URL when available
   */
  async onServerReady(callback: (port: number, url: string) => void): Promise<void> {
    const container = await this.getContainer();

    container.on('server-ready', (port, url) => {
      console.log(`[WebContainer] Server ready on port ${port}: ${url}`);
      callback(port, url);
    });
  }

  /**
   * Kill a running process
   */
  killProcess(processId: string): void {
    const process = this.processes.get(processId);
    if (process) {
      process.kill();
      this.processes.delete(processId);
      console.log('[WebContainer] Killed process:', processId);
    }
  }

  /**
   * Kill all running processes
   */
  killAllProcesses(): void {
    this.processes.forEach((process, id) => {
      process.kill();
      console.log('[WebContainer] Killed process:', id);
    });
    this.processes.clear();
  }

  /**
   * Reset file system for new project (clears all files without tearing down container)
   */
  async resetForNewProject(): Promise<void> {
    if (!this.container) {
      console.log('[WebContainer] Not booted, nothing to reset');
      return;
    }

    console.log('[WebContainer] Resetting for new project...');

    // Kill all running processes first
    this.killAllProcesses();

    try {
      // Get all entries in root directory
      const entries = await this.container.fs.readdir('/');

      // Delete each entry (except system directories)
      const systemDirs = ['home', 'tmp', 'proc', 'dev'];
      for (const entry of entries) {
        if (!systemDirs.includes(entry as string)) {
          try {
            await this.container.fs.rm(`/${entry}`, { recursive: true });
            console.log(`[WebContainer] Removed: /${entry}`);
          } catch (err) {
            // Ignore errors for system files that can't be deleted
            console.warn(`[WebContainer] Could not remove /${entry}:`, err);
          }
        }
      }

      // Clear /tmp contents
      try {
        const tmpEntries = await this.container.fs.readdir('/tmp');
        for (const entry of tmpEntries) {
          await this.container.fs.rm(`/tmp/${entry}`, { recursive: true });
        }
      } catch (err) {
        // /tmp might not exist
      }

      console.log('[WebContainer] Reset complete');
    } catch (error) {
      console.error('[WebContainer] Reset error:', error);
      throw error;
    }
  }

  /**
   * Tear down WebContainer
   */
  async teardown(): Promise<void> {
    if (this.container) {
      this.killAllProcesses();
      try {
        await this.container.teardown();
      } catch (error) {
        console.error('[WebContainer] Teardown error:', error);
      }
      this.container = null;
      this.bootPromise = null;
      console.log('[WebContainer] Torn down');
    }
  }

  /**
   * Check if WebContainer is already booted
   */
  isBooted(): boolean {
    return this.container !== null;
  }
}

// Singleton instance
const webContainerService = WebContainerService.getInstance();

// Cleanup on page unload to prevent instance leaks
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    webContainerService.teardown().catch(err => {
      console.error('[WebContainer] Cleanup error:', err);
    });
  });
}

export default webContainerService;
