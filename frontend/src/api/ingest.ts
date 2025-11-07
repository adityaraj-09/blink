/**
 * Code Ingestion API
 */

import { getAPIClient } from './client';

export interface ChunkInput {
  chunkText: string;
  startLine: number;
  endLine: number;
  chunkType: string;
  chunkName?: string;
}

export interface FileChunkInput {
  filePath: string;
  fileHash: string;
  language: string;
  chunks: ChunkInput[];
}

export interface IngestRequest {
  projectId: string;
  files: FileChunkInput[];
}

export interface IngestResponse {
  success: boolean;
  result: {
    projectId: string;
    filesProcessed: number;
    chunksProcessed: number;
    chunksReused: number;
    chunksComputed: number;
    cacheHitRate: string;
    duration: number;
  };
}

export interface DeleteFileRequest {
  projectId: string;
  filePath: string;
}

/**
 * Ingest code chunks for a project
 */
export async function ingestChunks(
  projectId: string,
  files: FileChunkInput[]
): Promise<IngestResponse> {
  const client = getAPIClient();

  return client.post<IngestResponse>('/api/ingest', {
    projectId,
    files,
  });
}

/**
 * Delete a file and its chunks
 */
export async function deleteFile(
  projectId: string,
  filePath: string
): Promise<{ success: boolean; message: string }> {
  const client = getAPIClient();

  return client.delete('/api/ingest/file', {
    body: {
      projectId,
      filePath,
    },
  });
}
