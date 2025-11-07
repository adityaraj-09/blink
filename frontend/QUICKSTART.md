# Quick Start Guide - Merkle Tree Frontend Integration

## Installation

```bash
cd frontend
npm install
```

## Environment Setup

Create `.env` file:

```env
VITE_API_URL=http://localhost:3000
```

## Usage

### Option 1: Use Enhanced Editor Page

The `EditorPageEnhanced.jsx` component has everything integrated:

```jsx
// In App.jsx or your router
import EditorPageEnhanced from './pages/EditorPageEnhanced';

function App() {
  return <EditorPageEnhanced />;
}
```

### Option 2: Add to Existing CodeEditor

```jsx
import { useMerkleTree } from './hooks/useMerkleTree';
import { useCodeIngestion } from './hooks/useCodeIngestion';
import ChangeDetector from './components/ChangeDetector';

function MyEditorPage() {
  const projectId = 'my-project-id';
  const [files, setFiles] = useState([...]);

  // Add Merkle tree
  const {
    changes,
    changeSummary,
    hasChanges,
    buildTree,
    saveSnapshot,
    detectChanges,
    getChangedFilePaths,
  } = useMerkleTree({ projectId });

  // Add ingestion
  const { ingestFiles, isIngesting, progress } = useCodeIngestion({ projectId });

  // Rebuild tree when files change
  useEffect(() => {
    const fileData = files.map(f => ({
      path: f.name,
      content: f.content,
      lastModified: Date.now(),
    }));
    buildTree(fileData).then(() => detectChanges());
  }, [files]);

  // Handle indexing
  const handleIndexChanges = async () => {
    const changedPaths = getChangedFilePaths();
    const changedFiles = files.filter(f => changedPaths.includes(f.name));

    const filesToIngest = changedFiles.map(f => ({
      id: f.id,
      name: f.name,
      content: f.content,
      language: getLanguageFromExtension(f.name) || Language.Unknown,
    }));

    await ingestFiles(filesToIngest);
    await saveSnapshot();
  };

  return (
    <div>
      {/* Change Detector */}
      {hasChanges && (
        <ChangeDetector
          projectId={projectId}
          files={files}
          changeSummary={changeSummary}
          hasChanges={hasChanges}
          isIngesting={isIngesting}
          ingestionProgress={progress}
          onIndexChanges={handleIndexChanges}
          onDismiss={saveSnapshot}
        />
      )}

      {/* Your existing editor */}
      <CodeEditor files={files} onChange={setFiles} />
    </div>
  );
}
```

## Testing the Integration

### 1. Start Backend

```bash
cd backend
npm run dev
```

Backend should be running on `http://localhost:3000`

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend should be running on `http://localhost:5173`

### 3. Test Change Detection

1. Open the editor
2. Edit a file (e.g., change `index.js`)
3. See "Changes Detected" banner appear
4. Click "Index Changes"
5. Check browser console for logs
6. Verify backend receives chunks

### 4. Verify IndexedDB Storage

Open browser DevTools → Application → IndexedDB → CodeEditorDB → merkle_snapshots

You should see:
- `projectId`: Your project ID
- `tree`: JSON representation of Merkle tree
- `timestamp`: When snapshot was saved
- `rootHash`: Root hash of tree
- `fileCount`: Number of files

### 5. Test Incremental Updates

1. Make another edit
2. See changes detected again
3. Index changes
4. Backend should have high cache hit rate (80%+)

## API Endpoints Used

The frontend calls these backend endpoints:

```
POST /api/ingest           - Ingest code chunks
POST /api/chat             - Chat with codebase
POST /api/ai/edit          - Get AI edit suggestions
POST /api/ai/apply-edit    - Apply single edit
POST /api/ai/batch-apply   - Apply multiple edits
```

## Common Issues

### "No changes detected" when files clearly changed

**Solution**: Clear IndexedDB and reload:
```javascript
// In browser console
indexedDB.deleteDatabase('CodeEditorDB');
location.reload();
```

### Backend returns 401 Unauthorized

**Solution**: Set auth token:
```javascript
import { getAPIClient } from './api/client';
getAPIClient().setAuthToken('your-token-here');
```

### Ingestion is slow

**Solution**:
- Check network tab for slow API calls
- Verify backend Redis/ChromaDB are running
- Enable backend caching

### CORS errors

**Solution**: Add CORS to backend:
```javascript
// In backend/src/server.ts
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
```

## Performance Tips

1. **Debounce tree building**: Don't rebuild on every keystroke
2. **Use Web Workers**: Run tree building in background
3. **Batch updates**: Wait for user to stop typing
4. **Cache language detection**: Detect language once per file

## Example: Debounced Tree Building

```jsx
import { useDebounce } from 'use-debounce';

function MyEditor() {
  const [files, setFiles] = useState([...]);
  const [debouncedFiles] = useDebounce(files, 1000); // 1 second delay

  useEffect(() => {
    const fileData = debouncedFiles.map(f => ({
      path: f.name,
      content: f.content,
      lastModified: Date.now(),
    }));
    buildTree(fileData).then(() => detectChanges());
  }, [debouncedFiles]);
}
```

## Example: Project Context

```jsx
import { createContext, useContext } from 'react';

const ProjectContext = createContext(null);

export function ProjectProvider({ children, projectId }) {
  return (
    <ProjectContext.Provider value={{ projectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within ProjectProvider');
  return context;
}

// Usage
function App() {
  return (
    <ProjectProvider projectId="my-project">
      <EditorPageEnhanced />
    </ProjectProvider>
  );
}
```

## Next Steps

1. **Add AI Chat**: Use `useAIChat` hook
2. **Add AI Edit**: Use `useAIEdit` hook
3. **Add Diff Viewer**: Show visual diffs
4. **Add File Tree**: Show folder structure
5. **Add Search**: Search across indexed code

## Documentation

- **Full Documentation**: See `MERKLE_INTEGRATION.md`
- **API Reference**: See `API.md`
- **Architecture**: See `ARCHITECTURE.md`

## Support

For help:
- Check browser console for errors
- Check backend logs
- Open issue on GitHub
- Contact development team

---

**Ready to go!** 🚀 Start the backend and frontend, and you'll see Merkle tree-based change detection in action.
