/**
 * useGitHub Hook
 * Manages GitHub integration and repository management
 */

import { useState, useCallback, useEffect } from 'react';
import {
  initiateGitHubAuth,
  completeGitHubAuth,
  getGitHubAuthStatus,
  disconnectGitHub,
  listGitHubRepositories,
  importGitHubRepository,
  getImportStatus,
  syncRepository,
  GitHubRepository,
  ImportRepositoryRequest,
} from '../api/github';

export interface UseGitHubReturn {
  // Auth
  isConnected: boolean;
  githubUsername: string | null;
  initiateAuth: () => Promise<void>;
  completeAuth: (code: string, state: string) => Promise<void>;
  disconnect: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;

  // Repositories
  repositories: GitHubRepository[];
  loadRepositories: (page?: number) => Promise<void>;
  importRepository: (repo: GitHubRepository, projectName?: string) => Promise<string | null>;
  syncRepo: (projectId: string) => Promise<void>;
  checkImportStatus: (projectId: string) => Promise<any>;

  // State
  isLoading: boolean;
  error: Error | null;
}

export function useGitHub(): UseGitHubReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Check auth status on mount
   * Disabled - let the component call this when ready
   */
  // useEffect(() => {
  //   checkAuthStatus();
  // }, []);

  /**
   * Check if GitHub is connected
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      const status = await getGitHubAuthStatus();
      setIsConnected(status.connected);
      setGithubUsername(status.githubUsername);
    } catch (err) {
      console.error('Failed to check auth status:', err);
      setIsConnected(false);
      setGithubUsername(null);
    }
  }, []);

  /**
   * Initiate OAuth flow
   */
  const initiateAuth = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await initiateGitHubAuth();

      // Redirect to GitHub OAuth page
      window.location.href = response.authUrl;
    } catch (err) {
      const error = err as Error;
      console.error('Failed to initiate auth:', error);
      setError(error);
      setIsLoading(false);
    }
  }, []);

  /**
   * Complete OAuth callback
   */
  const completeAuth = useCallback(async (code: string, state: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await completeGitHubAuth({ code, state });

      if (response.success) {
        setIsConnected(true);
        setGithubUsername(response.user.githubUsername);
      }
    } catch (err) {
      const error = err as Error;
      console.error('Failed to complete auth:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Disconnect GitHub
   */
  const disconnect = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      await disconnectGitHub();
      setIsConnected(false);
      setGithubUsername(null);
      setRepositories([]);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to disconnect:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load repositories
   */
  const loadRepositories = useCallback(async (page: number = 1) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await listGitHubRepositories(page, 30, 'owner', 'updated');
      setRepositories(response.repositories);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to load repositories:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Import repository
   */
  const importRepository = useCallback(
    async (repo: GitHubRepository, projectName?: string): Promise<string | null> => {
      setError(null);
      setIsLoading(true);

      try {
        console.log('📦 Preparing import request:', {
          repoId: repo.id,
          repoFullName: repo.fullName,
          cloneUrl: repo.cloneUrl,
          defaultBranch: repo.defaultBranch,
          projectName: projectName || repo.name,
          rawRepo: repo,
        });

        const request: ImportRepositoryRequest = {
          repoId: repo.id,
          repoFullName: repo.fullName,
          cloneUrl: repo.cloneUrl,
          defaultBranch: repo.defaultBranch,
          projectName: projectName || repo.name,
        };

        console.log('📤 Sending import request:', request);

        const response = await importGitHubRepository(request);
        console.log('✅ Import response:', response);
        return response.projectId;
      } catch (err) {
        const error = err as Error;
        console.error('Failed to import repository:', error);
        setError(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Sync repository
   */
  const syncRepo = useCallback(async (projectId: string) => {
    setError(null);
    setIsLoading(true);

    try {
      await syncRepository(projectId);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to sync repository:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check import status
   */
  const checkImportStatus = useCallback(async (projectId: string) => {
    try {
      return await getImportStatus(projectId);
    } catch (err) {
      console.error('Failed to check import status:', err);
      return null;
    }
  }, []);

  return {
    // Auth
    isConnected,
    githubUsername,
    initiateAuth,
    completeAuth,
    disconnect,
    checkAuthStatus,

    // Repositories
    repositories,
    loadRepositories,
    importRepository,
    syncRepo,
    checkImportStatus,

    // State
    isLoading,
    error,
  };
}
