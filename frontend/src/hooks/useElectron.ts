import { useState, useEffect, useCallback } from 'react';
import { isElectron, getElectronAPIOrNull } from '../services/electron';
import type { AuthUser, FolderInfo, FileTreeNode } from '../services/electron/types';

/**
 * Hook to check if running in Electron
 */
export function useIsElectron(): boolean {
    return isElectron();
}

/**
 * Hook for Electron auth
 */
export function useElectronAuth() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const api = getElectronAPIOrNull();

    useEffect(() => {
        if (!api) {
            setLoading(false);
            return;
        }

        // Get stored auth on mount
        api.auth.getStored().then((authData) => {
            if (authData) {
                setUser(authData.user);
                setToken(authData.token);
            }
            setLoading(false);
        });

        // Listen for auth events
        const unsubSuccess = api.auth.onSuccess((data) => {
            setUser(data.user);
            setToken(data.token);
        });

        const unsubRestored = api.auth.onRestored((data) => {
            setUser(data.user);
            setToken(data.token);
        });

        const unsubLoggedOut = api.auth.onLoggedOut(() => {
            setUser(null);
            setToken(null);
        });

        return () => {
            unsubSuccess();
            unsubRestored();
            unsubLoggedOut();
        };
    }, [api]);

    const login = useCallback(async () => {
        if (!api) return;
        await api.auth.login();
    }, [api]);

    const logout = useCallback(async () => {
        if (!api) return;
        await api.auth.logout();
        setUser(null);
        setToken(null);
    }, [api]);

    return {
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        isElectron: !!api,
    };
}

/**
 * Hook for Electron file system operations
 */
export function useElectronFS() {
    const api = getElectronAPIOrNull();

    const openFolder = useCallback(async (): Promise<FolderInfo | null> => {
        if (!api) return null;
        return api.openFolder();
    }, [api]);

    const readFile = useCallback(async (filePath: string): Promise<string | null> => {
        if (!api) return null;
        const result = await api.fs.readFile(filePath);
        return result.success ? result.content! : null;
    }, [api]);

    const writeFile = useCallback(async (filePath: string, content: string): Promise<boolean> => {
        if (!api) return false;
        const result = await api.fs.writeFile(filePath, content);
        return result.success;
    }, [api]);

    const readDir = useCallback(async (dirPath: string) => {
        if (!api) return [];
        const result = await api.fs.readDir(dirPath);
        return result.success ? result.entries! : [];
    }, [api]);

    const readDirRecursive = useCallback(async (dirPath: string, options?: { maxDepth?: number; ignoreDirs?: string[] }): Promise<FileTreeNode[]> => {
        if (!api) return [];
        const result = await api.fs.readDirRecursive(dirPath, options);
        return result.success ? result.tree! : [];
    }, [api]);

    const exists = useCallback(async (filePath: string): Promise<boolean> => {
        if (!api) return false;
        return api.fs.exists(filePath);
    }, [api]);

    const mkdir = useCallback(async (dirPath: string): Promise<boolean> => {
        if (!api) return false;
        const result = await api.fs.mkdir(dirPath);
        return result.success;
    }, [api]);

    const remove = useCallback(async (filePath: string): Promise<boolean> => {
        if (!api) return false;
        const result = await api.fs.remove(filePath);
        return result.success;
    }, [api]);

    const rename = useCallback(async (oldPath: string, newPath: string): Promise<boolean> => {
        if (!api) return false;
        const result = await api.fs.rename(oldPath, newPath);
        return result.success;
    }, [api]);

    return {
        openFolder,
        readFile,
        writeFile,
        readDir,
        readDirRecursive,
        exists,
        mkdir,
        remove,
        rename,
        isElectron: !!api,
    };
}

/**
 * Hook for opening and managing local project
 */
export function useLocalProject() {
    const [currentProject, setCurrentProject] = useState<FolderInfo | null>(null);
    const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const api = getElectronAPIOrNull();

    // Load saved project on mount
    useEffect(() => {
        if (!api) return;

        api.store.get('lastProject').then((saved) => {
            if (saved) {
                // Verify the folder still exists
                api.fs.exists(saved.path).then((exists) => {
                    if (exists) {
                        setCurrentProject(saved);
                        loadFileTree(saved.path);
                    }
                });
            }
        });
    }, [api]);

    const loadFileTree = useCallback(async (folderPath: string) => {
        if (!api) return;

        try {
            const result = await api.fs.readDirRecursive(folderPath, {
                maxDepth: 5,
                ignoreDirs: ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', '.venv', 'venv', '.cache'],
            });

            if (result.success && result.tree) {
                setFileTree(result.tree);
            }
        } catch (err: any) {
            console.error('Failed to load file tree:', err);
        }
    }, [api]);

    const openProject = useCallback(async () => {
        if (!api) {
            setError('Not running in Electron');
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            const folder = await api.openFolder();
            if (folder) {
                setCurrentProject(folder);
                await loadFileTree(folder.path);

                // Save as last opened project
                await api.store.set('lastProject', folder);

                return folder;
            }
            return null;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [api, loadFileTree]);

    const closeProject = useCallback(async () => {
        setCurrentProject(null);
        setFileTree([]);
        setError(null);

        if (api) {
            await api.store.set('lastProject', null);
        }
    }, [api]);

    const refreshFileTree = useCallback(async () => {
        if (currentProject) {
            await loadFileTree(currentProject.path);
        }
    }, [currentProject, loadFileTree]);

    return {
        currentProject,
        fileTree,
        loading,
        error,
        openProject,
        closeProject,
        refreshFileTree,
        isElectron: !!api,
    };
}
