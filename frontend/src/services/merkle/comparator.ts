/**
 * Merkle Tree Comparator
 * Compare two Merkle trees and detect changes
 */

import { MerkleNode } from './MerkleNode';

export enum ChangeType {
  Added = 'Added',
  Modified = 'Modified',
  Deleted = 'Deleted',
}

export interface FileChange {
  changeType: ChangeType;
  path: string;
  oldHash?: string;
  newHash?: string;
}

export interface ChangeSummary {
  added: number;
  modified: number;
  deleted: number;
  total: number;
}

/**
 * Compare two Merkle trees and find all differences
 */
export function compareTrees(
  oldTree: MerkleNode,
  newTree: MerkleNode
): FileChange[] {
  const changes: FileChange[] = [];
  compareTreesRecursive(oldTree, newTree, changes);
  return changes;
}

/**
 * Recursively compare trees and collect changes
 */
function compareTreesRecursive(
  oldNode: MerkleNode,
  newNode: MerkleNode,
  changes: FileChange[]
): void {
  // If hashes are the same, no changes in this subtree
  if (oldNode.hash === newNode.hash) {
    return;
  }

  // Both are files - it's a modification
  if (oldNode.isLeaf && newNode.isLeaf) {
    changes.push({
      changeType: ChangeType.Modified,
      path: newNode.path,
      oldHash: oldNode.hash,
      newHash: newNode.hash,
    });
    return;
  }

  // Both are directories - compare children
  if (!oldNode.isLeaf && !newNode.isLeaf) {
    const oldChildren = oldNode.children || [];
    const newChildren = newNode.children || [];

    // Create maps for efficient lookup
    const oldMap = new Map<string, MerkleNode>();
    const newMap = new Map<string, MerkleNode>();

    for (const child of oldChildren) {
      oldMap.set(child.path, child);
    }

    for (const child of newChildren) {
      newMap.set(child.path, child);
    }

    // Find deleted files/directories
    for (const [path, oldChild] of oldMap) {
      if (!newMap.has(path)) {
        collectDeletedRecursive(oldChild, changes);
      }
    }

    // Find added and modified files/directories
    for (const [path, newChild] of newMap) {
      const oldChild = oldMap.get(path);
      if (oldChild) {
        // File/directory exists in both - check for modifications
        if (oldChild.hash !== newChild.hash) {
          compareTreesRecursive(oldChild, newChild, changes);
        }
      } else {
        // New file/directory
        collectAddedRecursive(newChild, changes);
      }
    }
  } else {
    // Type changed (file -> directory or directory -> file)
    // Treat as delete + add
    collectDeletedRecursive(oldNode, changes);
    collectAddedRecursive(newNode, changes);
  }
}

/**
 * Recursively collect all files in a deleted subtree
 */
function collectDeletedRecursive(node: MerkleNode, changes: FileChange[]): void {
  if (node.isLeaf) {
    changes.push({
      changeType: ChangeType.Deleted,
      path: node.path,
      oldHash: node.hash,
    });
  } else if (node.children) {
    for (const child of node.children) {
      collectDeletedRecursive(child, changes);
    }
  }
}

/**
 * Recursively collect all files in an added subtree
 */
function collectAddedRecursive(node: MerkleNode, changes: FileChange[]): void {
  if (node.isLeaf) {
    changes.push({
      changeType: ChangeType.Added,
      path: node.path,
      newHash: node.hash,
    });
  } else if (node.children) {
    for (const child of node.children) {
      collectAddedRecursive(child, changes);
    }
  }
}

/**
 * Get summary statistics of changes
 */
export function summarizeChanges(changes: FileChange[]): ChangeSummary {
  const summary: ChangeSummary = {
    added: 0,
    modified: 0,
    deleted: 0,
    total: 0,
  };

  for (const change of changes) {
    switch (change.changeType) {
      case ChangeType.Added:
        summary.added++;
        break;
      case ChangeType.Modified:
        summary.modified++;
        break;
      case ChangeType.Deleted:
        summary.deleted++;
        break;
    }
  }

  summary.total = summary.added + summary.modified + summary.deleted;
  return summary;
}

/**
 * Get only files that need to be processed (added or modified)
 */
export function getFilesToProcess(changes: FileChange[]): string[] {
  return changes
    .filter(
      (c) => c.changeType === ChangeType.Added || c.changeType === ChangeType.Modified
    )
    .map((c) => c.path);
}

/**
 * Group changes by change type
 */
export function groupChangesByType(changes: FileChange[]): {
  added: FileChange[];
  modified: FileChange[];
  deleted: FileChange[];
} {
  return {
    added: changes.filter((c) => c.changeType === ChangeType.Added),
    modified: changes.filter((c) => c.changeType === ChangeType.Modified),
    deleted: changes.filter((c) => c.changeType === ChangeType.Deleted),
  };
}

/**
 * Format change for display
 */
export function formatChange(change: FileChange): string {
  const icon = getChangeIcon(change.changeType);
  let result = `${icon} ${change.changeType}: ${change.path}`;

  if (change.oldHash && change.newHash) {
    result += ` (${change.oldHash.substring(0, 8)}... → ${change.newHash.substring(
      0,
      8
    )}...)`;
  } else if (change.newHash) {
    result += ` (hash: ${change.newHash.substring(0, 8)}...)`;
  } else if (change.oldHash) {
    result += ` (was: ${change.oldHash.substring(0, 8)}...)`;
  }

  return result;
}

/**
 * Get icon for change type
 */
export function getChangeIcon(changeType: ChangeType): string {
  switch (changeType) {
    case ChangeType.Added:
      return '➕';
    case ChangeType.Modified:
      return '📝';
    case ChangeType.Deleted:
      return '❌';
  }
}

/**
 * Format change summary for display
 */
export function formatChangeSummary(summary: ChangeSummary): string {
  return `➕ ${summary.added} added, 📝 ${summary.modified} modified, ❌ ${summary.deleted} deleted (Total: ${summary.total} changes)`;
}
