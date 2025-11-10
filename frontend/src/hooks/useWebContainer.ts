import { useState, useEffect, useCallback, useRef } from 'react';
import webContainerService from '../services/webcontainer/WebContainerService';
import fileSystemSync from '../services/webcontainer/FileSystemSync';
import { WebContainerProcess } from '@webcontainer/api';

interface WebContainerState {
  isBooted: boolean;
  isBooting: boolean;
  error: string | null;
  serverUrl: string | null;
  serverPort: number | null;
}

interface UseWebContainerResult extends WebContainerState {
  bootContainer: () => Promise<void>;
  mountFiles: (files: Array<{ path: string; content: string }>) => Promise<void>;
  writeFile: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  deleteFile: (path: string) => Promise<void>;
  executeCommand: (command: string, args?: string[], cwd?: string) => Promise<{ exitCode: number; output: string }>;
  spawnProcess: (command: string, args?: string[], options?: any) => Promise<WebContainerProcess>;
  installPackages: (packages?: string[], dev?: boolean) => Promise<{ exitCode: number; output: string }>;
  startDevServer: (command?: string, args?: string[]) => Promise<WebContainerProcess>;
  teardown: () => Promise<void>;
}

/**
 * React hook for managing WebContainer operations
 */
export function useWebContainer(): UseWebContainerResult {
  const [state, setState] = useState<WebContainerState>({
    isBooted: false,
    isBooting: false,
    error: null,
    serverUrl: null,
    serverPort: null,
  });

  const serverReadyHandlerRef = useRef(false);

  /**
   * Boot WebContainer
   */
  const bootContainer = useCallback(async () => {
    if (state.isBooted || state.isBooting) {
      return;
    }

    setState((prev) => ({ ...prev, isBooting: true, error: null }));

    try {
      await webContainerService.boot();

      // Set up server ready handler once
      if (!serverReadyHandlerRef.current) {
        webContainerService.onServerReady((port, url) => {
          setState((prev) => ({
            ...prev,
            serverPort: port,
            serverUrl: url,
          }));
        });
        serverReadyHandlerRef.current = true;
      }

      setState((prev) => ({
        ...prev,
        isBooted: true,
        isBooting: false,
      }));
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Failed to boot WebContainer';

      // Specific handling for instance limit error
      if (errorMessage.includes('Unable to create more instances')) {
        errorMessage = 'Instance limit reached. Close other tabs or refresh the page.';
        console.error('');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('🔴 WEBCONTAINER INSTANCE LIMIT REACHED');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('');
        console.error('Too many WebContainer instances are running.');
        console.error('');
        console.error('📋 SOLUTIONS:');
        console.error('');
        console.error('1. Close other tabs with this app open');
        console.error('2. Close any StackBlitz tabs');
        console.error('3. Refresh this page (Ctrl+Shift+R)');
        console.error('4. Wait a few minutes for cleanup');
        console.error('');
        console.error('💡 TIP: Keep only ONE tab open at a time');
        console.error('');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('');
      }

      setState((prev) => ({
        ...prev,
        isBooting: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [state.isBooted, state.isBooting]);

  /**
   * Mount files to WebContainer
   */
  const mountFiles = useCallback(
    async (files: Array<{ path: string; content: string }>) => {
      try {
        await fileSystemSync.mountProjectFiles(files);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to mount files';
        setState((prev) => ({ ...prev, error: errorMessage }));
        throw error;
      }
    },
    []
  );

  /**
   * Write a file
   */
  const writeFile = useCallback(async (path: string, content: string) => {
    try {
      await fileSystemSync.syncFile(path, content);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to write file';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  /**
   * Read a file
   */
  const readFile = useCallback(async (path: string): Promise<string> => {
    try {
      return await fileSystemSync.readFile(path);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to read file';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  /**
   * Delete a file
   */
  const deleteFile = useCallback(async (path: string) => {
    try {
      await fileSystemSync.deleteFile(path);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete file';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  /**
   * Execute a command and wait for completion
   */
  const executeCommand = useCallback(
    async (command: string, args: string[] = [], cwd?: string) => {
      try {
        return await webContainerService.exec(command, args, { cwd });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to execute command';
        setState((prev) => ({ ...prev, error: errorMessage }));
        throw error;
      }
    },
    []
  );

  /**
   * Spawn a process
   */
  const spawnProcess = useCallback(
    async (command: string, args: string[] = [], options?: any) => {
      try {
        return await webContainerService.spawn(command, args, options);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to spawn process';
        setState((prev) => ({ ...prev, error: errorMessage }));
        throw error;
      }
    },
    []
  );

  /**
   * Install npm packages
   */
  const installPackages = useCallback(
    async (packages?: string[], dev?: boolean) => {
      try {
        let result;
        if (packages && packages.length > 0) {
          const args = ['install', ...(dev ? ['--save-dev'] : []), ...packages];
          result = await webContainerService.exec('npm', args);
        } else {
          result = await webContainerService.npmInstall();
        }
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to install packages';
        setState((prev) => ({ ...prev, error: errorMessage }));
        throw error;
      }
    },
    []
  );

  /**
   * Start development server
   */
  const startDevServer = useCallback(
    async (command: string = 'npm', args: string[] = ['run', 'dev']) => {
      try {
        return await webContainerService.startDevServer(command, args);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start dev server';
        setState((prev) => ({ ...prev, error: errorMessage }));
        throw error;
      }
    },
    []
  );

  /**
   * Teardown WebContainer
   */
  const teardown = useCallback(async () => {
    try {
      await webContainerService.teardown();
      fileSystemSync.clearCache();
      setState({
        isBooted: false,
        isBooting: false,
        error: null,
        serverUrl: null,
        serverPort: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to teardown WebContainer';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't teardown on unmount since WebContainer is a singleton
      // and should persist across component unmounts
    };
  }, []);

  return {
    ...state,
    bootContainer,
    mountFiles,
    writeFile,
    readFile,
    deleteFile,
    executeCommand,
    spawnProcess,
    installPackages,
    startDevServer,
    teardown,
  };
}

export default useWebContainer;
