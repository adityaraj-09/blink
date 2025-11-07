/**
 * GitHub Integration API
 */

import { getAPIClient } from './client';

export interface GitHubAuthInitResponse {
  authUrl: string;
  state: string;
}

export interface GitHubAuthCallbackRequest {
  code: string;
  state: string;
}

export interface GitHubAuthStatusResponse {
  connected: boolean;
  githubUsername: string | null;
  scopes: string[];
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  cloneUrl: string;
  defaultBranch: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
}

export interface GitHubRepositoriesResponse {
  repositories: GitHubRepository[];
  totalCount: number;
}

export interface ImportRepositoryRequest {
  repoId: number;
  repoFullName: string;
  cloneUrl: string;
  defaultBranch: string;
  projectName?: string;
}

export interface ImportRepositoryResponse {
  projectId: string;
  repoId: string;
  status: string;
  message: string;
}

export interface ImportStatusResponse {
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
  lastSynced?: number;
}

export interface SyncRepositoryResponse {
  success: boolean;
  status: string;
  pulledChanges: number;
  message: string;
}

export interface BranchInfo {
  name: string;
}

export interface BranchesResponse {
  branches: BranchInfo[];
  current: string;
}

export interface BranchActionRequest {
  action: 'create' | 'switch';
  branchName: string;
  baseBranch?: string;
}

/**
 * Initiate GitHub OAuth flow
 */
export async function initiateGitHubAuth(): Promise<GitHubAuthInitResponse> {
  const client = getAPIClient();
  return client.post<GitHubAuthInitResponse>('/api/github/auth/initiate');
}

/**
 * Complete GitHub OAuth callback
 */
export async function completeGitHubAuth(
  request: GitHubAuthCallbackRequest
): Promise<{ success: boolean; user: any }> {
  const client = getAPIClient();
  return client.post('/api/github/auth/callback', request);
}

/**
 * Check GitHub connection status
 */
export async function getGitHubAuthStatus(): Promise<GitHubAuthStatusResponse> {
  const client = getAPIClient();
  return client.get<GitHubAuthStatusResponse>('/api/github/auth/status');
}

/**
 * Disconnect GitHub integration
 */
export async function disconnectGitHub(): Promise<{ success: boolean }> {
  const client = getAPIClient();
  return client.delete('/api/github/auth/disconnect');
}

/**
 * List user's GitHub repositories
 */
export async function listGitHubRepositories(
  page: number = 1,
  perPage: number = 30,
  type: 'all' | 'owner' | 'member' = 'owner',
  sort: 'created' | 'updated' | 'pushed' | 'full_name' = 'updated'
): Promise<GitHubRepositoriesResponse> {
  const client = getAPIClient();
  return client.get<GitHubRepositoriesResponse>(
    `/api/github/repositories?page=${page}&perPage=${perPage}&type=${type}&sort=${sort}`
  );
}

/**
 * Import GitHub repository
 */
export async function importGitHubRepository(
  request: ImportRepositoryRequest
): Promise<ImportRepositoryResponse> {
  const client = getAPIClient();
  return client.post<ImportRepositoryResponse>('/api/github/import', request);
}

/**
 * Check import/sync status
 */
export async function getImportStatus(projectId: string): Promise<ImportStatusResponse> {
  const client = getAPIClient();
  return client.get<ImportStatusResponse>(`/api/github/import/status/${projectId}`);
}

/**
 * Sync repository (pull latest changes)
 */
export async function syncRepository(projectId: string): Promise<SyncRepositoryResponse> {
  const client = getAPIClient();
  return client.post<SyncRepositoryResponse>(`/api/github/${projectId}/sync`);
}

/**
 * List repository branches
 */
export async function listBranches(projectId: string): Promise<BranchesResponse> {
  const client = getAPIClient();
  return client.get<BranchesResponse>(`/api/github/${projectId}/branches`);
}

/**
 * Create or switch branch
 */
export async function manageBranch(
  projectId: string,
  request: BranchActionRequest
): Promise<{ success: boolean; currentBranch: string }> {
  const client = getAPIClient();
  return client.post(`/api/github/${projectId}/branches`, request);
}
