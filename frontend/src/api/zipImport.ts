/**
 * ZIP Import API
 * Client-side API for importing projects from ZIP files
 */

import { getAPIClient } from './client';

export interface ZipImportRequest {
  projectName: string;
  description?: string;
  files: Record<string, { content: string; size: number }>;
}

export interface ZipImportResponse {
  projectId: string;
  projectName: string;
  description?: string;
  status: string;
  message: string;
}

export interface ZipImportStatusResponse {
  syncStatus: string;
  syncError: string | null;
  lastSynced: number | null;
  ingestion: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    totalFiles: number;
    processedFiles: number;
    totalChunks: number;
    currentFile: string | null;
    error: string | null;
    startedAt: number | null;
    completedAt: number | null;
  };
}

/**
 * Import a project from ZIP file contents
 */
export async function importFromZip(request: ZipImportRequest): Promise<ZipImportResponse> {
  const client = getAPIClient();
  return client.post<ZipImportResponse>('/api/zip/import', request);
}

/**
 * Get ZIP import status
 */
export async function getZipImportStatus(projectId: string): Promise<ZipImportStatusResponse> {
  const client = getAPIClient();
  return client.get<ZipImportStatusResponse>(`/api/zip/import/status/${projectId}`);
}
