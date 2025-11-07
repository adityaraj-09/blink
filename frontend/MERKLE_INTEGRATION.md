# Merkle Tree Integration - Frontend

This document describes the Merkle tree-based change detection system implemented in the frontend.

## Overview

The frontend now includes a complete Merkle tree implementation that:

1. **Detects Changes Efficiently**: Only processes files that have changed
2. **Persistent Snapshots**: Stores tree snapshots in IndexedDB across sessions
3. **Integrates with Backend**: Sends only changed files for embedding
4. **Real-time UI Updates**: Shows change summary with visual feedback

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Flow                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. User edits code in Monaco Editor                    │
│     ↓                                                    │
│  2. Build Merkle Tree from current files (Web Crypto)   │
│     ↓                                                    │
│  3. Load previous snapshot from IndexedDB               │
│     ↓                                                    │
│  4. Compare trees → Detect changes                      │
│     ↓                                                    │
│  5. Show ChangeDetector UI with summary                 │
│     ↓                                                    │
│  6. User clicks "Index Changes"                         │
│     ↓                                                    │
│  7. Chunk changed files (line-based or semantic)        │
│     ↓                                                    │
│  8. POST /api/ingest with chunks + file hashes          │
│     ↓                                                    │
│  9. Backend checks Redis cache → Generate embeddings    │
│     ↓                                                    │
│  10. Save new Merkle snapshot to IndexedDB              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## File Structure

```
frontend/src/
├── services/
│   ├── merkle/
│   │   ├── MerkleNode.ts           # Node class with serialization
│   │   ├── hasher.ts               # SHA-256 hashing (Web Crypto API)
│   │   ├── comparator.ts           # Tree comparison & change detection
│   │   └── index.ts                # Exports
│   ├── storage/
│   │   └── indexeddb.ts            # IndexedDB for snapshots
│   └── chunker/
│       ├── languageConfig.ts       # Language detection & config
│       ├── codeChunker.ts          # Line-based chunking
│       └── index.ts                # Exports
├── hooks/
│   ├── useMerkleTree.ts            # Merkle tree state management
│   ├── useCodeIngestion.ts         # Chunking & backend ingestion
│   ├── useAIChat.ts                # AI chat with codebase
│   ├── useAIEdit.ts                # AI-powered code editing
│   └── index.ts                    # Exports
├── api/
│   ├── client.ts                   # Base HTTP client
│   ├── ingest.ts                   # Ingestion API calls
│   ├── chat.ts                     # Chat API calls
│   ├── aiEdit.ts                   # AI Edit API calls
│   └── index.ts                    # Exports
├── components/
│   ├── CodeEditor.jsx              # Monaco editor (existing)
│   └── ChangeDetector.jsx          # Change notification UI
└── pages/
    ├── EditorPage.jsx              # Original editor page
    └── EditorPageEnhanced.jsx      # Enhanced with Merkle tree
```

## Core Components

### 1. MerkleNode (`services/merkle/MerkleNode.ts`)

```typescript
class MerkleNode {
  hash: string;
  nodeType: NodeType;  // File | Directory
  path: string;
  size: number;
  modifiedAt: number;
  createdAt: number;
  children?: MerkleNode[];
  isLeaf: boolean;

  // Methods
  findByPath(path: string): MerkleNode | undefined;
  countNodes(): number;
  countFiles(): number;
  totalSize(): number;
  toJSON(): object;
  static fromJSON(json: any): MerkleNode;
}
```

### 2. MerkleHasher (`services/merkle/hasher.ts`)

Uses Web Crypto API for SHA-256 hashing:

```typescript
class MerkleHasher {
  // Hash content using SHA-256
  async hashContent(content: string | ArrayBuffer): Promise<string>;

  // Hash directory by combining children hashes
  async hashDirectory(children: Array<{ hash, path }>): Promise<string>;

  // Build tree from in-memory files
  async buildTreeFromMemory(files: Array<{ path, content, lastModified }>): Promise<MerkleNode>;

  // Build tree from File objects
  async buildTreeFromFiles(files: File[]): Promise<MerkleNode>;

  // Build tree from FileSystemHandle (File System Access API)
  async buildTreeFromHandle(dirHandle: FileSystemDirectoryHandle): Promise<MerkleNode>;
}
```

### 3. Comparator (`services/merkle/comparator.ts`)

```typescript
// Compare two trees and find changes
function compareTrees(oldTree: MerkleNode, newTree: MerkleNode): FileChange[];

// Summarize changes
function summarizeChanges(changes: FileChange[]): ChangeSummary;

// Get files to process (added/modified only)
function getFilesToProcess(changes: FileChange[]): string[];
```

### 4. IndexedDB Storage (`services/storage/indexeddb.ts`)

```typescript
class MerkleTreeStorage {
  // Save snapshot
  async saveSnapshot(projectId: string, tree: MerkleNode): Promise<void>;

  // Load snapshot
  async loadSnapshot(projectId: string): Promise<MerkleNode | null>;

  // Get metadata only
  async getSnapshotInfo(projectId: string): Promise<SnapshotData | null>;

  // Delete snapshot
  async deleteSnapshot(projectId: string): Promise<void>;

  // List all snapshots
  async getAllSnapshots(): Promise<Array<SnapshotData>>;
}
```

## React Hooks

### useMerkleTree

Manages Merkle tree state and change detection:

```typescript
const {
  currentTree,      // Current Merkle tree
  previousTree,     // Previous snapshot
  changes,          // Array of FileChange
  changeSummary,    // { added, modified, deleted, total }
  hasChanges,       // Boolean
  isBuilding,       // Boolean
  buildTree,        // Build tree from files
  loadSnapshot,     // Load from IndexedDB
  saveSnapshot,     // Save to IndexedDB
  detectChanges,    // Compare trees
  getChangedFilePaths, // Get paths of changed files
} = useMerkleTree({ projectId, autoLoad: true });
```

### useCodeIngestion

Manages code chunking and backend ingestion:

```typescript
const {
  ingestFiles,      // Chunk and ingest files
  isIngesting,      // Boolean
  progress,         // { current, total, stage, currentFile }
  error,            // Error | null
  result,           // IngestResponse | null
} = useCodeIngestion({ projectId });
```

### useAIChat

Chat with the codebase using RAG:

```typescript
const {
  messages,         // ChatMessage[]
  sendMessage,      // Send message
  isLoading,        // Boolean
  error,            // Error | null
  sessionId,        // Session ID
  clearMessages,    // Clear history
} = useAIChat({ projectId, sessionId });
```

### useAIEdit

AI-powered code editing:

```typescript
const {
  suggestEdits,     // Get AI edit suggestions
  validateSingleEdit, // Validate edit
  previewSingleEdit,  // Preview diff
  applySingleEdit,    // Apply single edit
  applyMultipleEdits, // Apply batch edits
  isLoading,        // Boolean
  error,            // Error | null
  lastResponse,     // AIEditResponse | null
} = useAIEdit({ projectId });
```

## Usage Example

### Basic Integration

```jsx
import { useMerkleTree } from './hooks/useMerkleTree';
import { useCodeIngestion } from './hooks/useCodeIngestion';

function MyEditor() {
  const projectId = 'my-project';

  // Merkle tree
  const {
    changes,
    changeSummary,
    hasChanges,
    buildTree,
    saveSnapshot,
    detectChanges,
    getChangedFilePaths,
  } = useMerkleTree({ projectId });

  // Ingestion
  const { ingestFiles, isIngesting } = useCodeIngestion({ projectId });

  // Build tree when files change
  useEffect(() => {
    const fileData = files.map(f => ({
      path: f.name,
      content: f.content,
      lastModified: Date.now(),
    }));

    buildTree(fileData).then(() => detectChanges());
  }, [files]);

  // Index changes
  const handleIndexChanges = async () => {
    const changedPaths = getChangedFilePaths();
    const changedFiles = files.filter(f => changedPaths.includes(f.name));

    await ingestFiles(changedFiles);
    await saveSnapshot();
  };

  return (
    <div>
      {hasChanges && (
        <ChangeDetector
          changeSummary={changeSummary}
          isIngesting={isIngesting}
          onIndexChanges={handleIndexChanges}
        />
      )}
      {/* Your editor */}
    </div>
  );
}
```

## API Integration

The frontend sends chunks to the backend:

```typescript
POST /api/ingest
{
  projectId: "abc123",
  files: [{
    filePath: "index.js",
    fileHash: "a1b2c3...",  // SHA-256 hash
    language: "JavaScript",
    chunks: [{
      chunkText: "function foo() {...}",
      startLine: 10,
      endLine: 20,
      chunkType: "function",
      chunkName: "foo"
    }]
  }]
}
```

Backend response:

```typescript
{
  success: true,
  result: {
    projectId: "abc123",
    filesProcessed: 1,
    chunksProcessed: 5,
    chunksReused: 3,      // From Redis cache
    chunksComputed: 2,    // New embeddings
    cacheHitRate: "60%",
    duration: 1234
  }
}
```

## Change Detection Flow

1. **Initial State**: No previous snapshot
   - All files treated as "Added"
   - Full indexing performed

2. **Subsequent Edits**:
   - Build new tree
   - Compare with previous snapshot
   - Detect: Added, Modified, Deleted files
   - Show change summary UI

3. **User Indexes Changes**:
   - Chunk only changed files
   - Send to backend `/api/ingest`
   - Backend checks Redis cache for chunks
   - Reuse cached embeddings (high hit rate)
   - Save new snapshot to IndexedDB

## Performance Characteristics

- **Tree Building**: O(n) where n = number of files
- **Tree Comparison**: O(log n) average, O(n) worst case
- **Hashing**: SHA-256 via Web Crypto API (hardware accelerated)
- **Storage**: IndexedDB (async, doesn't block UI)
- **Cache Hit Rate**: Typically 80-90% for unchanged chunks

## Browser Compatibility

- **Web Crypto API**: All modern browsers
- **IndexedDB**: All modern browsers
- **File System Access API**: Chrome, Edge (optional)

## Future Enhancements

1. **Tree-sitter Integration**: Semantic chunking (currently line-based)
2. **Folder Hierarchy**: Support nested folder structures in Merkle tree
3. **Incremental Updates**: Update tree nodes instead of rebuilding
4. **Web Worker**: Run tree building in background
5. **Diff Visualization**: Show file diffs in UI
6. **Conflict Resolution**: Handle concurrent edits

## Debugging

Enable debug logging:

```javascript
localStorage.setItem('DEBUG', 'merkle:*');
```

View stored snapshots:

```javascript
// In browser console
const storage = getMerkleTreeStorage();
await storage.getAllSnapshots();
```

## Testing

```bash
# Run tests
npm test

# Test specific module
npm test -- merkle
```

## Support

For issues or questions:
- Check `TROUBLESHOOTING.md`
- Open issue on GitHub
- Contact dev team

---

**Last Updated**: 2025-01-27
**Version**: 1.0.0
