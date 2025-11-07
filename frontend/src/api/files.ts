import { apiClient } from './client';

export interface FileContent {
  path: string;
  content: string;
  hasLocalChanges: boolean;
  changeType: string | null;
  staged: boolean;
}

export interface FileChange {
  id: number;
  filePath: string;
  changeType: 'modified' | 'created' | 'deleted';
  staged: boolean;
  modifiedAt: number;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  email: string;
  committedAt: number;
  pushed: boolean;
  pushedAt: number | null;
}

/**
 * Get file content (reconstructed from database chunks)
 */
export async function getFileContent(projectId: string, filePath: string): Promise<FileContent> {
  // Use the endpoint that reconstructs from database chunks (not cloned repo)
  const response = await apiClient.get<any>(
    `/api/projects/${projectId}/file?path=${encodeURIComponent(filePath)}`
  );

  // Transform to FileContent format
  return {
    path: response.filePath,
    content: response.content,
    hasLocalChanges: false, // Database version doesn't have local changes
    changeType: null,
    staged: false
  };
}

/**
 * Update/Create file content (DATABASE ONLY - not git repo)
 */
export async function updateFileContent(
  projectId: string,
  filePath: string,
  content: string
): Promise<{
  success: boolean;
  filePath: string;
  language: string;
  chunksCreated: number;
}> {
  return apiClient.put(
    `/api/projects/${projectId}/file?path=${encodeURIComponent(filePath)}`,
    { content }
  );
}

/**
 * Delete a file
 */
export async function deleteFile(projectId: string, filePath: string): Promise<{ success: boolean; changeId: number }> {
  return apiClient.delete(`/api/projects/${projectId}/files?path=${encodeURIComponent(filePath)}`);
}

/**
 * Get pending changes
 */
export async function getPendingChanges(projectId: string): Promise<{ changes: FileChange[]; totalChanges: number }> {
  return apiClient.get(`/api/projects/${projectId}/changes`);
}

/**
 * Stage changes
 */
export async function stageChanges(
  projectId: string,
  changeIds: number[] | 'all'
): Promise<{ success: boolean; stagedCount: number }> {
  return apiClient.post(`/api/projects/${projectId}/changes/stage`, { changeIds, unstage: false });
}

/**
 * Unstage changes
 */
export async function unstageChanges(
  projectId: string,
  changeIds: number[] | 'all'
): Promise<{ success: boolean; stagedCount: number }> {
  return apiClient.post(`/api/projects/${projectId}/changes/stage`, { changeIds, unstage: true });
}

/**
 * Revert changes
 */
export async function revertChanges(projectId: string, changeIds: number[]): Promise<{ success: boolean; revertedCount: number }> {
  return apiClient.post(`/api/projects/${projectId}/changes/revert`, { changeIds });
}

/**
 * Commit staged changes
 */
export async function commitChanges(
  projectId: string,
  message: string,
  description?: string,
  authorName?: string,
  authorEmail?: string
): Promise<{
  success: boolean;
  commitSha: string;
  filesCommitted: number;
  branch: string;
}> {
  return apiClient.post(`/api/projects/${projectId}/commit`, {
    message,
    description,
    authorName,
    authorEmail,
  });
}

/**
 * Push commits to GitHub
 */
export async function pushToGitHub(
  projectId: string,
  branch?: string,
  force?: boolean
): Promise<{
  success: boolean;
  pushedCommits: number;
  branch: string;
  remoteUrl: string;
}> {
  return apiClient.post(`/api/projects/${projectId}/push`, { branch, force });
}

/**
 * Get commit history
 */
export async function getCommitHistory(
  projectId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ commits: CommitInfo[]; totalCount: number }> {
  return apiClient.get(`/api/projects/${projectId}/commits?limit=${limit}&offset=${offset}`);
}

/**
 * Sync files using Merkle tree comparison
 * If files is null, backend returns list of changed files (needsFiles)
 * If files is provided, backend processes those files
 */
export async function syncWithMerkleTree(
  projectId: string,
  merkleTree: any,
  files: Record<string, { content: string; lastModified: number }> | null
): Promise<{
  success: boolean;
  changes: any[];
  summary: { added: number; modified: number; deleted: number; total: number };
  filesProcessed?: number;
  filesDeleted?: number;
  needsFiles?: string[];
  message: string;
}> {
  return apiClient.post(`/api/projects/${projectId}/merkle-sync`, {
    merkleTree,
    files
  });
}
