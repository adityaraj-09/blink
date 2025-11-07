/**
 * Merkle Tree Service - Main Export
 */

export { MerkleNode, NodeType } from './MerkleNode';
export type { MerkleNodeData } from './MerkleNode';

export { MerkleHasher, MerkleError } from './hasher';

export {
  compareTrees,
  summarizeChanges,
  getFilesToProcess,
  groupChangesByType,
  formatChange,
  formatChangeSummary,
  getChangeIcon,
  ChangeType,
} from './comparator';
export type { FileChange, ChangeSummary } from './comparator';
