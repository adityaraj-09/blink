/**
 * useMerkleTree Hook
 * Manages Merkle tree state and change detection
 */

import { useState, useCallback, useEffect } from 'react';
import {
  MerkleNode,
  MerkleHasher,
  compareTrees,
  summarizeChanges,
  getFilesToProcess,
  FileChange,
  ChangeSummary,
} from '../services/merkle';
import { getMerkleTreeStorage } from '../services/storage/indexeddb';

export interface UseMerkleTreeOptions {
  projectId: string;
  autoLoad?: boolean;
}

export interface UseMerkleTreeReturn {
  currentTree: MerkleNode | null;
  previousTree: MerkleNode | null;
  changes: FileChange[];
  changeSummary: ChangeSummary | null;
  isBuilding: boolean;
  hasChanges: boolean;
  buildTree: (
    files: Array<{ path: string; content: string; lastModified: number }>
  ) => Promise<MerkleNode>;
  loadSnapshot: () => Promise<MerkleNode | null>;
  saveSnapshot: () => Promise<void>;
  detectChanges: () => FileChange[];
  getChangedFilePaths: () => string[];
  reset: () => void;
}

export function useMerkleTree(options: UseMerkleTreeOptions): UseMerkleTreeReturn {
  const { projectId, autoLoad = true } = options;

  const [currentTree, setCurrentTree] = useState<MerkleNode | null>(null);
  const [previousTree, setPreviousTree] = useState<MerkleNode | null>(null);
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);

  const hasher = new MerkleHasher();
  const storage = getMerkleTreeStorage();

  /**
   * Build tree from current files
   */
  const buildTree = useCallback(
    async (files: Array<{ path: string; content: string; lastModified: number }>) => {
      setIsBuilding(true);
      try {
        const tree = await hasher.buildTreeFromMemory(files);
        setCurrentTree(tree);
        return tree;
      } finally {
        setIsBuilding(false);
      }
    },
    []
  );

  /**
   * Load previous snapshot from IndexedDB
   */
  const loadSnapshot = useCallback(async () => {
    try {
      const snapshot = await storage.loadSnapshot(projectId);
      if (snapshot) {
        setPreviousTree(snapshot);
        console.log('Loaded Merkle snapshot for project:', projectId);
      } else {
        console.log('No previous snapshot found for project:', projectId);
      }
      return snapshot;
    } catch (error) {
      console.error('Failed to load snapshot:', error);
      return null;
    }
  }, [projectId]);

  /**
   * Save current tree as snapshot
   */
  const saveSnapshot = useCallback(async () => {
    if (!currentTree) {
      console.warn('No current tree to save');
      return;
    }

    try {
      await storage.saveSnapshot(projectId, currentTree);
      setPreviousTree(currentTree);
      console.log('Saved Merkle snapshot for project:', projectId);
    } catch (error) {
      console.error('Failed to save snapshot:', error);
      throw error;
    }
  }, [projectId, currentTree]);

  /**
   * Detect changes between previous and current tree
   */
  const detectChanges = useCallback(() => {
    if (!currentTree) {
      setChanges([]);
      return [];
    }

    if (!previousTree) {
      // No previous snapshot - treat all files as new
      const allFiles: FileChange[] = [];
      collectAllFiles(currentTree, allFiles);
      setChanges(allFiles);
      console.log('No previous tree, treating all files as new:', allFiles.length);
      return allFiles;
    }

    // Compare trees
    const detected = compareTrees(previousTree, currentTree);
    setChanges(detected);
    console.log('Changes detected:', detected.length);
    return detected;
  }, [previousTree, currentTree]);

  /**
   * Get only changed file paths (for processing)
   */
  const getChangedFilePaths = useCallback(() => {
    return getFilesToProcess(changes);
  }, [changes]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setCurrentTree(null);
    setPreviousTree(null);
    setChanges([]);
  }, []);

  /**
   * Auto-load snapshot on mount
   */
  useEffect(() => {
    if (autoLoad) {
      loadSnapshot();
    }
  }, [autoLoad, loadSnapshot]);

  // Compute summary
  const changeSummary = changes.length > 0 ? summarizeChanges(changes) : null;
  const hasChanges = changes.length > 0;

  return {
    currentTree,
    previousTree,
    changes,
    changeSummary,
    isBuilding,
    hasChanges,
    buildTree,
    loadSnapshot,
    saveSnapshot,
    detectChanges,
    getChangedFilePaths,
    reset,
  };
}

/**
 * Helper: Collect all files from tree (for when there's no previous tree)
 */
function collectAllFiles(node: MerkleNode, files: FileChange[]): void {
  if (node.isLeafNode()) {
    files.push({
      changeType: 'Added',
      path: node.getPath(),
      newHash: node.getHash(),
    });
  } else {
    const children = node.getChildren();
    if (children) {
      children.forEach((child) => collectAllFiles(child, files));
    }
  }
}
