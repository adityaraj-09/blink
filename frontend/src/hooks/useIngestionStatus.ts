import { useState, useEffect, useCallback, useRef } from 'react';
import { getAPIClient } from '../api/client';

export interface IngestionProgress {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalFiles: number;
  processedFiles: number;
  totalChunks: number;
  currentFile: string | null;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
}

export interface ImportStatus {
  syncStatus: string;
  syncError: string | null;
  lastSynced: number | null;
  ingestion: IngestionProgress;
}

/**
 * Hook to poll ingestion status for a project
 * Automatically stops polling when ingestion is complete or failed
 */
export function useIngestionStatus(projectId: string | null, enabled: boolean = true) {
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!projectId) return;

    try {
      const apiClient = getAPIClient();
      const response = await apiClient.get<ImportStatus>(
        `/api/github/import/status/${projectId}`
      );

      setStatus(response);
      setError(null);
      setLoading(false);

      // Stop polling if ingestion is completed or failed
      if (
        response.ingestion.status === 'completed' ||
        response.ingestion.status === 'failed'
      ) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch ingestion status:', err);
      setError(err.message || 'Failed to fetch status');
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!enabled || !projectId) {
      setLoading(false);
      return;
    }

    // Fetch immediately
    fetchStatus();

    // Poll every 2 seconds
    intervalRef.current = setInterval(fetchStatus, 2000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [projectId, enabled, fetchStatus]);

  const isComplete = status?.ingestion.status === 'completed';
  const isFailed = status?.ingestion.status === 'failed';
  const isProcessing = status?.ingestion.status === 'processing';

  const progress = status?.ingestion.totalFiles > 0
    ? Math.round((status.ingestion.processedFiles / status.ingestion.totalFiles) * 100)
    : 0;

  return {
    status,
    loading,
    error,
    isComplete,
    isFailed,
    isProcessing,
    progress,
    refetch: fetchStatus,
  };
}
