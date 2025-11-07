/**
 * useBackgroundSync Hook
 * Automatically syncs code chunks in the background when files change
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCodeIngestion } from './useCodeIngestion';
import { Language, getLanguageFromExtension } from '../services/chunker';
import { useMerkleTree } from './useMerkleTree';

export interface UseBackgroundSyncOptions {
  projectId: string;
  files: Array<{ id: string; name: string; content: string }>;
  enabled?: boolean;
  debounceMs?: number; // Wait time after last change before syncing
}

export interface UseBackgroundSyncReturn {
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncNow: () => Promise<void>;
  pendingChanges: number;
}

export function useBackgroundSync(
  options: UseBackgroundSyncOptions
): UseBackgroundSyncReturn {
  const { projectId, files, enabled = true, debounceMs = 5000 } = options;

  const [lastSyncTime, setLastSyncTime] = React.useState<number | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFilesHashRef = useRef<string>('');
  const isSyncingRef = useRef(false);

  // Merkle tree for change detection
  const {
    currentTree,
    previousTree,
    changes,
    hasChanges,
    buildTree,
    saveSnapshot,
    detectChanges,
    getChangedFilePaths,
  } = useMerkleTree({ projectId, autoLoad: true });

  // Code ingestion
  const { ingestFiles, isIngesting } = useCodeIngestion({ projectId });

  /**
   * Compute hash of current files state
   */
  const computeFilesHash = useCallback((files: any[]) => {
    const content = files
      .map((f) => `${f.name}:${f.content.length}`)
      .sort()
      .join('|');
    return content;
  }, []);

  /**
   * Sync changes to backend
   */
  const syncChanges = useCallback(async () => {
    if (isSyncingRef.current || !hasChanges || files.length === 0) {
      return;
    }

    isSyncingRef.current = true;

    try {
      console.log('[Background Sync] Syncing changes...');

      // Get changed file paths
      const changedPaths = getChangedFilePaths();
      const changedFiles = files.filter((f) => changedPaths.includes(f.name));

      if (changedFiles.length === 0) {
        console.log('[Background Sync] No files to sync');
        return;
      }

      // Prepare files for ingestion
      const filesToIngest = changedFiles.map((f) => ({
        id: f.id,
        name: f.name,
        content: f.content,
        language: getLanguageFromExtension(f.name) || Language.Unknown,
      }));

      console.log('[Background Sync] Ingesting', filesToIngest.length, 'files');

      // Ingest in background
      const result = await ingestFiles(filesToIngest);

      if (result) {
        console.log('[Background Sync] Sync complete:', {
          files: result.result.filesProcessed,
          chunks: result.result.chunksProcessed,
          cacheHit: result.result.cacheHitRate,
          duration: result.result.duration,
        });

        // Save snapshot
        await saveSnapshot();
        setLastSyncTime(Date.now());
      }
    } catch (error) {
      console.error('[Background Sync] Sync failed:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }, [files, hasChanges, getChangedFilePaths, ingestFiles, saveSnapshot]);

  /**
   * Sync now (manual trigger)
   */
  const syncNow = useCallback(async () => {
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    await syncChanges();
  }, [syncChanges]);

  /**
   * Monitor file changes and trigger sync
   */
  useEffect(() => {
    if (!enabled || files.length === 0) return;

    // Compute current files hash
    const currentHash = computeFilesHash(files);

    // Check if files changed
    if (currentHash === lastFilesHashRef.current) {
      return;
    }

    lastFilesHashRef.current = currentHash;

    // Build Merkle tree
    const fileData = files.map((f) => ({
      path: f.name,
      content: f.content,
      lastModified: Date.now(),
    }));

    buildTree(fileData).then(() => {
      detectChanges();

      // Schedule sync with debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        syncChanges();
      }, debounceMs);
    });
  }, [files, enabled, computeFilesHash, buildTree, detectChanges, syncChanges, debounceMs]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    isSyncing: isIngesting || isSyncingRef.current,
    lastSyncTime,
    syncNow,
    pendingChanges: changes.length,
  };
}

// Re-export React for useState
import React from 'react';
