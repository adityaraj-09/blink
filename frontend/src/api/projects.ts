import { apiClient } from './client';

export interface Project {
  projectId: string;
  projectName: string;
  description: string | null;
  repositoryUrl: string | null;
  createdAt: number;
  updatedAt: number;
  lastIndexedAt: number | null;
  totalFiles: number;
  totalChunks: number;
  metadata: any;
}

export interface ProjectDetail extends Project {
  vectorStore?: {
    name: string;
    count: number;
  };
}

export interface ProjectFile {
  fileId: string;
  filePath: string;
  fileHash: string;
  language: string | null;
  sizeBytes: number;
  lineCount: number | null;
  indexedAt: number;
}

export interface ProjectFileContent extends ProjectFile {
  content: string;
}

export interface CreateProjectRequest {
  projectName: string;
  description?: string;
  repositoryUrl?: string;
  metadata?: any;
}

export interface UpdateProjectRequest {
  projectName?: string;
  description?: string;
  repositoryUrl?: string;
  metadata?: any;
}

/**
 * Get all projects for the authenticated user
 */
export async function getProjects(): Promise<{ projects: Project[] }> {
  return apiClient.get<{ projects: Project[] }>('/api/projects');
}

/**
 * Get a specific project by ID
 */
export async function getProject(projectId: string): Promise<ProjectDetail> {
  return apiClient.get<ProjectDetail>(`/api/projects/${projectId}`);
}

/**
 * Create a new project
 */
export async function createProject(data: CreateProjectRequest): Promise<Project> {
  return apiClient.post<Project>('/api/projects', data);
}

/**
 * Update a project
 */
export async function updateProject(projectId: string, data: UpdateProjectRequest): Promise<{ message: string }> {
  return apiClient.put<{ message: string }>(`/api/projects/${projectId}`, data);
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/api/projects/${projectId}`);
}

/**
 * Get files in a project
 */
export async function getProjectFiles(projectId: string): Promise<{ files: ProjectFile[] }> {
  return apiClient.get<{ files: ProjectFile[] }>(`/api/projects/${projectId}/files`);
}

/**
 * Get file content from project
 */
export async function getFileContent(projectId: string, filePath: string): Promise<ProjectFileContent> {
  return apiClient.get<ProjectFileContent>(
    `/api/projects/${projectId}/file?path=${encodeURIComponent(filePath)}`
  );
}

/**
 * Get all files with their content from project
 * This is useful for building a complete Merkle tree
 */
export async function getAllFilesWithContent(projectId: string): Promise<{ files: ProjectFileContent[]; totalFiles: number }> {
  return apiClient.get<{ files: ProjectFileContent[]; totalFiles: number }>(
    `/api/projects/${projectId}/files/content`
  );
}
