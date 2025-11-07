/**
 * useCodeIngestion Hook
 * Manages code chunking and ingestion to backend
 */

import { useState, useCallback } from 'react';
import { CodeChunker, Language, getLanguageFromExtension } from '../services/chunker';
import { ingestChunks, IngestResponse, FileChunkInput } from '../api/ingest';
import { MerkleHasher } from '../services/merkle';

export interface FileToIngest {
  id: string;
  name: string;
  content: string;
  language: Language;
}

export interface IngestionProgress {
  current: number;
  total: number;
  currentFile?: string;
  stage: 'chunking' | 'hashing' | 'uploading' | 'idle';
}

export interface UseCodeIngestionOptions {
  projectId: string;
}

export interface UseCodeIngestionReturn {
  ingestFiles: (files: FileToIngest[]) => Promise<IngestResponse | null>;
  isIngesting: boolean;
  progress: IngestionProgress;
  error: Error | null;
  result: IngestResponse | null;
}

export function useCodeIngestion(
  options: UseCodeIngestionOptions
): UseCodeIngestionReturn {
  const { projectId } = options;

  const [isIngesting, setIsIngesting] = useState(false);
  const [progress, setProgress] = useState<IngestionProgress>({
    current: 0,
    total: 0,
    stage: 'idle',
  });
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<IngestResponse | null>(null);

  const chunker = new CodeChunker();
  const hasher = new MerkleHasher();

  /**
   * Ingest files to backend
   */
  const ingestFiles = useCallback(
    async (files: FileToIngest[]): Promise<IngestResponse | null> => {
      if (files.length === 0) {
        console.warn('No files to ingest');
        return null;
      }

      setIsIngesting(true);
      setError(null);
      setResult(null);
      setProgress({ current: 0, total: files.length, stage: 'chunking' });

      try {
        const fileChunks: FileChunkInput[] = [];

        // Process each file
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setProgress({
            current: i + 1,
            total: files.length,
            currentFile: file.name,
            stage: 'chunking',
          });

          // Detect language if not provided
          const language =
            file.language || getLanguageFromExtension(file.name) || Language.Unknown;

          // Chunk file
          const chunks = await chunker.chunkFile(file.content, file.name, language);

          // Hash file content
          setProgress({
            current: i + 1,
            total: files.length,
            currentFile: file.name,
            stage: 'hashing',
          });

          const fileHash = await hasher.computeHash(file.content);

          // Prepare chunks for API
          fileChunks.push({
            filePath: file.name,
            fileHash,
            language: language.toString(),
            chunks: chunks.map((c) => ({
              chunkText: c.text,
              startLine: c.startLine,
              endLine: c.endLine,
              chunkType: c.chunkType,
              chunkName: c.name,
            })),
          });
        }

        // Upload to backend
        setProgress({
          current: files.length,
          total: files.length,
          stage: 'uploading',
        });

        const response = await ingestChunks(projectId, fileChunks);

        console.log('Ingestion complete:', response);
        setResult(response);
        return response;
      } catch (err) {
        const error = err as Error;
        console.error('Ingestion failed:', error);
        setError(error);
        return null;
      } finally {
        setIsIngesting(false);
        setProgress({ current: 0, total: 0, stage: 'idle' });
      }
    },
    [projectId]
  );

  return {
    ingestFiles,
    isIngesting,
    progress,
    error,
    result,
  };
}
