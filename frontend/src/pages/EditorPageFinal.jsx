/**
 * Final Editor Page - Integrated with Backend
 * Features: Real project files, Create/Rename/Delete files, Auto-indexing
 */
import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CodeMirrorEditorWithInlineEdit from '../components/CodeMirrorEditorWithInlineEdit';
import CodeMirrorDiffViewer from '../components/CodeMirrorDiffViewer';
import {
  Bot,
  Github,
  GitBranch,
  Terminal as TerminalIcon,
  Settings as SettingsIcon,
  Maximize2,
  Minimize2,
  Folder,
  FolderOpen,
  FolderPlus,
  File,
  FilePlus,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  Save,
  ArrowLeft,
  FileText,
  Zap,
  ListTodo,
  CheckCircle,
  XCircle
} from 'lucide-react';
import AIChatPanel from '../components/AIChatPanel';
import FileSearchModal from '../components/FileSearchModal';
import GitPanel from '../components/GitPanel';
import WebContainerTerminal from '../components/WebContainerTerminal';
import SettingsPanel from '../components/SettingsPanel';
import BrowserCompatibilityWarning from '../components/BrowserCompatibilityWarning';
import PreviewPanel from '../components/PreviewPanel';
import { useAPIAuth } from '../hooks/useAPI';
import { getProject, getProjectFiles, getAllFilesWithContent } from '../api/projects';
import { getFileContent, updateFileContent, deleteFile, syncWithMerkleTree } from '../api/files';
import { useCodeIngestion } from '../hooks/useCodeIngestion';
import { useWebContainer } from '../hooks/useWebContainer';
import { initWebContainerAuth } from '../services/webcontainer/init';
import { Language, getLanguageFromExtension } from '../services/chunker';
import { getFileIcon, getFolderIcon } from '../utils/fileIcons';
import { MerkleHasher } from '../services/merkle';
import { FileSystemSync } from '../services/webcontainer';
import { locateEdit } from '../utils/fuzzyMatch';

// Folder icon variants with different colors (15 unique types)
const FOLDER_ICONS = [
  { name: 'folder-src', color: '#60A5FA' },        // blue-400
  { name: 'folder-components', color: '#34D399' }, // emerald-400
  { name: 'folder-api', color: '#F59E0B' },        // amber-500
  { name: 'folder-config', color: '#8B5CF6' },     // violet-500
  { name: 'folder-lib', color: '#EC4899' },        // pink-500
  { name: 'folder-utils', color: '#14B8A6' },      // teal-500
  { name: 'folder-public', color: '#F97316' },     // orange-500
  { name: 'folder-dist', color: '#6366F1' },       // indigo-500
  { name: 'folder-app', color: '#10B981' },        // emerald-500
  { name: 'folder-views', color: '#EAB308' },      // yellow-500
  { name: 'folder-admin', color: '#DC2626' },      // red-600
  { name: 'folder-images', color: '#06B6D4' },     // cyan-500
  { name: 'folder', color: '#A855F7' },            // purple-500 (default)
  { name: 'folder-lib', color: '#F472B6' },        // pink-400
  { name: 'folder-src', color: '#22D3EE' },        // cyan-400
];

// Hash function to consistently assign same icon to same folder
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Get consistent folder icon for a path
const getFolderIconForPath = (folderPath, isExpanded) => {
  const hash = hashString(folderPath || 'root');
  const iconData = FOLDER_ICONS[hash % FOLDER_ICONS.length];
  const iconName = isExpanded ? `${iconData.name}-open` : iconData.name;
  return {
    src: `/icons/${iconName}.svg`,
    color: iconData.color
  };
};

const EditorPageFinal = () => {
  const navigate = useNavigate();
  const editorRef = useRef(null);

  // Project state
  const [projectId, setProjectId] = useState(null);
  const [projectInfo, setProjectInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Files state
  const [files, setFiles] = useState([]);
  const [fileTree, setFileTree] = useState([]);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [fileContents, setFileContents] = useState({});
  const fileContentsRef = useRef({}); // Ref to access latest content in event handlers
  const [fileLanguages, setFileLanguages] = useState({}); // Store language for each file
  const [localFiles, setLocalFiles] = useState(new Set()); // Track locally-created files not yet saved
  const [unsavedChanges, setUnsavedChanges] = useState(new Set());

  // Keep ref in sync with state
  useEffect(() => {
    fileContentsRef.current = fileContents;
  }, [fileContents]);

  // UI state
  const [showAIChat, setShowAIChat] = useState(false);
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [showGitPanel, setShowGitPanel] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['root']));
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renameFile, setRenameFile] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [creatingFileInFolder, setCreatingFileInFolder] = useState(null); // For inline file creation
  const [inlineFileName, setInlineFileName] = useState('');
  const [creatingItemType, setCreatingItemType] = useState('file'); // 'file' or 'folder'
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default 256px (w-64)
  const [isResizing, setIsResizing] = useState(false);

  // Diff mode state
  const [diffMode, setDiffMode] = useState(false);
  const [currentDiffEdits, setCurrentDiffEdits] = useState([]); // Array of edits
  const [diffEditIndex, setDiffEditIndex] = useState(null); // Current index being viewed (if any)

  // Editor settings
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 14,
    tabSize: 4,
    wordWrap: false,
    minimap: true,
    autoSave: false,
    theme: 'vs-dark',
    lineHeight: 1.5
  });

  // Inject auth
  useAPIAuth();

  // Code ingestion
  const {
    ingestFiles,
    isIngesting,
    progress: ingestionProgress,
    result: ingestionResult,
  } = useCodeIngestion({ projectId });

  // WebContainer integration
  const {
    isBooted: wcBooted,
    isBooting: wcBooting,
    error: wcError,
    serverUrl,
    serverPort,
    bootContainer,
    mountFiles: wcMountFiles,
    writeFile: wcWriteFile,
    resetForNewProject: wcResetForNewProject,
  } = useWebContainer();

  const [wcFiles, setWcFiles] = useState({});
  const [showPreview, setShowPreview] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If event was already handled (e.g. by CodeMirror), don't handle it again
      if (e.defaultPrevented) return;

      // Cmd+S or Ctrl+S - Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab) {
          handleSaveFile();
        }
      }
      // Ctrl+P - File search
      else if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setShowFileSearch(prev => !prev);
      }
      // Ctrl+I - AI Chat panel
      else if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        setShowAIChat(prev => !prev);
      }
      // Ctrl+G - Git panel
      else if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        setShowGitPanel(prev => !prev);
      }
      // Ctrl+` - Terminal
      else if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setShowTerminal(prev => !prev);
      }
      // F11 - Fullscreen
      else if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Sidebar resize handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 180 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Load project on mount
  useEffect(() => {
    const selectedProject = localStorage.getItem('selectedProject');
    if (selectedProject) {
      try {
        const project = JSON.parse(selectedProject);
        setProjectId(project.id);
        loadProjectData(project.id);
      } catch (error) {
        console.error('Failed to load project:', error);
        setError('Failed to load project');
      }
    } else {
      setError('No project selected');
      setLoading(false);
    }
  }, []);

  // Load project data and files
  const loadProjectData = async (projId) => {
    try {
      setLoading(true);
      setError(null);

      // Reset all state for new project
      setOpenTabs([]);
      setActiveTab(null);
      setFileContents({});
      setFileLanguages({});
      setLocalFiles(new Set());
      setUnsavedChanges(new Set());
      setExpandedFolders(new Set(['root']));
      hasMountedFilesRef.current = false;

      console.log('📂 Loading project data and all files with content...');

      // Fetch project info and all files with content
      const [projectData, allFilesResponse] = await Promise.all([
        getProject(projId),
        getAllFilesWithContent(projId)
      ]);

      setProjectInfo(projectData);

      // Store basic file info for the file tree
      const filesList = allFilesResponse.files.map(f => ({
        fileId: f.fileId,
        filePath: f.filePath,
        fileHash: f.fileHash,
        language: f.language,
        sizeBytes: f.sizeBytes,
        lineCount: f.lineCount,
        indexedAt: f.indexedAt,
      }));
      setFiles(filesList);

      // Store all file contents in memory
      const contents = {};
      const languages = {};
      for (const file of allFilesResponse.files) {
        contents[file.filePath] = file.content || '';
        languages[file.filePath] = file.language || 'plaintext';
      }
      setFileContents(contents);
      setFileLanguages(languages);

      console.log(`✓ Loaded ${allFilesResponse.files.length} files with content into memory`);

      // Build file tree from files
      const tree = buildFileTree(filesList);
      setFileTree(tree);

      // Auto-index files on open
      if (filesList.length > 0) {
        await autoIndexFiles(projId, filesList);
      }

    } catch (err) {
      console.error('Failed to load project data:', err);
      setError(err.message || 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-index files when editor opens
  const autoIndexFiles = async (projId, filesList) => {
    try {
      console.log('Auto-indexing files...');

      // Load content for first few files to index
      const filesToIndex = filesList.slice(0, 10).map(f => ({
        id: f.fileId,
        name: f.filePath,
        content: '', // Backend handles actual content
        language: getLanguageFromExtension(f.filePath) || Language.Unknown,
      }));

      await ingestFiles(filesToIndex);
      console.log('Auto-indexing completed');
    } catch (err) {
      console.error('Auto-indexing failed:', err);
    }
  };

  // Initialize WebContainer auth and boot on mount
  const wcAuthInitializedRef = useRef(false);
  useEffect(() => {
    let mounted = true;

    const initAndBoot = async () => {
      try {
        // Initialize WebContainer auth only once
        if (!wcAuthInitializedRef.current) {
          console.log('[Editor] Initializing WebContainer auth...');
          initWebContainerAuth();
          wcAuthInitializedRef.current = true;
        }

        // Boot the container
        await bootContainer();
      } catch (err) {
        if (mounted) {
          console.error('Failed to boot WebContainer:', err);
        }
      }
    };

    initAndBoot();

    return () => {
      mounted = false;
    };
  }, []); // Empty deps = runs only once on mount

  // Track current project ID for WebContainer reset
  const previousProjectIdRef = useRef(null);
  const hasMountedFilesRef = useRef(false);

  // Reset WebContainer when project changes
  useEffect(() => {
    const resetAndPrepare = async () => {
      if (projectId && previousProjectIdRef.current && previousProjectIdRef.current !== projectId) {
        console.log(`[Editor] Project changed from ${previousProjectIdRef.current} to ${projectId}, resetting WebContainer...`);

        // Reset WebContainer for new project
        hasMountedFilesRef.current = false;
        setWcFiles({});
        setShowPreview(false);

        if (wcBooted) {
          try {
            await wcResetForNewProject();
            console.log('[Editor] WebContainer reset complete');
          } catch (err) {
            console.error('[Editor] Failed to reset WebContainer:', err);
          }
        }
      }
      previousProjectIdRef.current = projectId;
    };

    resetAndPrepare();
  }, [projectId, wcBooted, wcResetForNewProject]);

  // Mount files to WebContainer when they're loaded
  useEffect(() => {
    if (wcBooted && Object.keys(fileContents).length > 0 && !hasMountedFilesRef.current) {
      hasMountedFilesRef.current = true;

      const convertedFiles = FileSystemSync.convertToWebContainerFormat(
        Object.entries(fileContents).map(([path, content]) => ({
          path,
          content,
        }))
      );
      setWcFiles(convertedFiles);
      wcMountFiles(Object.entries(fileContents).map(([path, content]) => ({
        path,
        content,
      }))).catch(err => {
        console.error('Failed to mount files to WebContainer:', err);
        hasMountedFilesRef.current = false; // Allow retry on error
      });
    }
  }, [wcBooted, Object.keys(fileContents).length]); // Only depend on wcBooted and number of files, not the content itself

  // Sync file changes to WebContainer
  const syncFileToWebContainer = useCallback(async (path, content) => {
    if (wcBooted) {
      try {
        await wcWriteFile(path, content);
        console.log(`✓ Synced file to WebContainer: ${path}`);
      } catch (err) {
        console.error(`Failed to sync file to WebContainer: ${path}`, err);
      }
    }
  }, [wcBooted, wcWriteFile]);

  // Handle server ready
  const handleServerReady = useCallback((port, url) => {
    console.log(`🌐 Dev server ready at ${url}`);
    setShowPreview(true);
  }, []);

  // Sort tree nodes: folders first (alphabetically), then files (alphabetically)
  const sortTreeNodes = (nodes) => {
    return nodes.sort((a, b) => {
      // Folders come before files
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;

      // Both are same type, sort alphabetically (case-insensitive)
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  };

  // Build file tree structure
  const buildFileTree = (filesList) => {
    const root = {
      id: 'root',
      name: projectInfo?.projectName || 'Project',
      type: 'folder',
      children: []
    };

    filesList.forEach(file => {
      const parts = file.filePath.split('/');
      let currentLevel = root.children;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath += (currentPath ? '/' : '') + part;
        const isFile = index === parts.length - 1;

        let existing = currentLevel.find(item => item.name === part);
        if (!existing) {
          existing = {
            id: isFile ? file.fileId : `folder-${currentPath}`,
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'folder',
            ...(isFile ? { fileData: file } : { children: [] })
          };
          currentLevel.push(existing);
        }
        if (!isFile) {
          currentLevel = existing.children;
        }
      });
    });

    // Recursively sort all children
    const sortChildren = (node) => {
      if (node.children && node.children.length > 0) {
        node.children = sortTreeNodes(node.children);
        node.children.forEach(child => {
          if (child.type === 'folder') {
            sortChildren(child);
          }
        });
      }
    };

    sortChildren(root);

    return [root];
  };

  // Handle file click in tree
  const handleFileClick = async (file) => {
    if (file.type === 'folder') {
      toggleFolder(file.id);
      return;
    }

    // Add to open tabs if not already open
    if (!openTabs.find(f => f.path === file.path)) {
      setOpenTabs([...openTabs, file]);
    }
    setActiveTab(file.path);

    // All file contents are already loaded in memory, no need to fetch
    // If somehow the content is missing (shouldn't happen), show a message
    if (fileContents[file.path] === undefined) {
      console.warn(`File content not found in memory for: ${file.path}`);
      setFileContents(prev => ({
        ...prev,
        [file.path]: `// File content not loaded. Please refresh the editor.`
      }));
    }
  };

  // Toggle folder expansion
  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Handle editor content change
  const handleEditorChange = (value) => {
    if (activeTab) {
      setFileContents(prev => ({
        ...prev,
        [activeTab]: value
      }));
      setUnsavedChanges(prev => new Set(prev).add(activeTab));

      // Sync to WebContainer (debounced in real app, but immediate for now)
      syncFileToWebContainer(activeTab, value);
    }
  };

  // Save all changes using Merkle tree sync
  const handleSaveFile = async (filePath) => {
    if (!filePath) filePath = activeTab;
    if (!filePath) return;

    try {
      console.log(`💾 Saving changes using Merkle tree sync...`);

      // Build Merkle tree from local state (all files already in memory)
      const merkleHasher = new MerkleHasher();

      // Build file list from local state
      const fileList = [];
      const currentContents = fileContentsRef.current;
      for (const [path, content] of Object.entries(currentContents)) {
        fileList.push({
          path,
          content,
          lastModified: Date.now()
        });
      }

      console.log(`🌳 Building Merkle tree from ${fileList.length} files in local state...`);

      // Build Merkle tree
      const merkleTree = await merkleHasher.buildTreeFromFileSystem(fileList);
      console.log(`🌳 Merkle tree built: ${merkleTree.countFiles()} files, hash: ${merkleTree.hash.substring(0, 16)}`);
      console.log(`🌳 Merkle tree: ${JSON.stringify(merkleTree.toJSON())}`);
      // Step 1: Send Merkle tree to get list of changed files
      const compareResult = await syncWithMerkleTree(projectId, merkleTree.toJSON(), null);

      if (compareResult.needsFiles && compareResult.needsFiles.length > 0) {
        console.log(`📤 Sending content for ${compareResult.needsFiles.length} changed files...`);

        // Step 2: Send only the content of changed files
        const filesData = {};
        for (const changedPath of compareResult.needsFiles) {
          if (currentContents[changedPath] !== undefined) {
            filesData[changedPath] = {
              content: currentContents[changedPath],
              lastModified: Date.now()
            };
          } else {
            console.warn(`Content not available for changed file: ${changedPath}`);
          }
        }

        // Sync again with file contents
        const result = await syncWithMerkleTree(projectId, merkleTree.toJSON(), filesData);

        console.log(`✓ Sync complete: ${result.filesProcessed} files processed, ${result.filesDeleted || 0} files deleted`);
        console.log(`   Summary: ${result.summary.added} added, ${result.summary.modified} modified, ${result.summary.deleted} deleted`);
      } else {
        console.log(`✓ No changes detected or sync complete`);
      }

      // Clear all local files and unsaved changes
      setLocalFiles(new Set());
      setUnsavedChanges(new Set());

      console.log(`✓ All changes saved successfully`);
    } catch (err) {
      console.error('Failed to save changes:', err);
      alert(`Failed to save changes: ${err.message}`);
    }
  };

  // Create new file/folder inline in tree (VSCode style)
  const handleInlineCreateFile = () => {
    if (!inlineFileName.trim()) {
      setCreatingFileInFolder(null);
      setInlineFileName('');
      setCreatingItemType('file');
      return;
    }

    const itemName = inlineFileName.trim();

    // Build full path
    let itemPath;
    if (creatingFileInFolder && creatingFileInFolder !== 'root') {
      itemPath = `${creatingFileInFolder}/${itemName}`;
    } else {
      itemPath = itemName;
    }

    if (creatingItemType === 'folder') {
      // Creating a folder - just expand it in the tree
      // Folders don't need to be saved until they have files
      const folderId = `folder-${itemPath}`;

      // Add folder to expanded folders so it's visible
      setExpandedFolders(prev => new Set(prev).add(folderId));

      // Create a dummy file in the folder to make it appear in the tree
      // This is a placeholder that will be replaced when a real file is added
      const placeholderPath = `${itemPath}/.placeholder`;
      const placeholderFile = {
        fileId: `local-placeholder-${Date.now()}`,
        filePath: placeholderPath,
        language: 'plaintext',
        sizeBytes: 0,
        lineCount: 0,
        indexedAt: Date.now()
      };

      setFiles(prev => [...prev, placeholderFile]);

      // Rebuild file tree
      const updatedFiles = [...files, placeholderFile];
      const tree = buildFileTree(updatedFiles);
      setFileTree(tree);

      console.log(`📁 Created new folder: ${itemPath}`);
    } else {
      // Creating a file
      // Check if file already exists
      if (files.find(f => f.filePath === itemPath) || fileContents[itemPath]) {
        alert('File already exists');
        return;
      }

      // Detect language from extension
      const detectedLanguage = getLanguageFromExtension(itemPath);
      const initialContent = '';

      // Add to local files (not yet saved to backend)
      setLocalFiles(prev => new Set(prev).add(itemPath));

      // Add to files list (temporary local entry)
      const newFile = {
        fileId: `local-${Date.now()}`,
        filePath: itemPath,
        language: detectedLanguage,
        sizeBytes: 0,
        lineCount: 0,
        indexedAt: Date.now()
      };
      setFiles(prev => [...prev, newFile]);

      // Rebuild file tree
      const updatedFiles = [...files, newFile];
      const tree = buildFileTree(updatedFiles);
      setFileTree(tree);

      // Add content and language to state
      setFileContents(prev => ({
        ...prev,
        [itemPath]: initialContent
      }));
      setFileLanguages(prev => ({
        ...prev,
        [itemPath]: detectedLanguage
      }));

      // Mark as unsaved
      setUnsavedChanges(prev => new Set(prev).add(itemPath));

      // Open the new file
      const treeNode = {
        id: newFile.fileId,
        name: itemName,
        path: itemPath,
        type: 'file',
        fileData: newFile
      };

      if (!openTabs.find(f => f.path === itemPath)) {
        setOpenTabs([...openTabs, treeNode]);
      }
      setActiveTab(itemPath);

      console.log(`📄 Created new file: ${itemPath} (will be saved on save)`);
    }

    // Clear inline creation state
    setCreatingFileInFolder(null);
    setInlineFileName('');
    setCreatingItemType('file');
  };

  // Create new file (LOCAL FIRST - not sent to backend until save)
  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      alert('Please enter a file name');
      return;
    }

    const filePath = newFileName.trim();

    // Check if file already exists
    if (files.find(f => f.filePath === filePath) || localFiles.has(filePath)) {
      alert('File already exists');
      return;
    }

    // Detect language from extension
    const detectedLanguage = getLanguageFromExtension(filePath);
    const initialContent = '';

    // Add to local files (not yet saved to backend)
    setLocalFiles(prev => new Set(prev).add(filePath));

    // Add to files list (temporary local entry)
    const newFile = {
      fileId: `local-${Date.now()}`,
      filePath: filePath,
      language: detectedLanguage,
      sizeBytes: 0,
      lineCount: 0,
      indexedAt: Date.now()
    };
    setFiles(prev => [...prev, newFile]);

    // Rebuild file tree
    const updatedFiles = [...files, newFile];
    const tree = buildFileTree(updatedFiles);
    setFileTree(tree);

    // Add content and language to state
    setFileContents(prev => ({
      ...prev,
      [filePath]: initialContent
    }));
    setFileLanguages(prev => ({
      ...prev,
      [filePath]: detectedLanguage
    }));

    // Mark as unsaved
    setUnsavedChanges(prev => new Set(prev).add(filePath));

    setShowNewFileModal(false);
    setNewFileName('');

    // Open the new file
    const treeNode = {
      id: newFile.fileId,
      name: filePath.split('/').pop(),
      path: filePath,
      type: 'file',
      fileData: newFile
    };

    if (!openTabs.find(f => f.path === filePath)) {
      setOpenTabs([...openTabs, treeNode]);
    }
    setActiveTab(filePath);
  };

  // Delete file (local only, backend deletion happens on save via Merkle sync)
  const handleDeleteFile = (filePath) => {
    if (!confirm(`Are you sure you want to delete ${filePath}?`)) {
      return;
    }

    // Remove from open tabs
    setOpenTabs(prev => prev.filter(f => f.path !== filePath));
    if (activeTab === filePath) {
      const remainingTabs = openTabs.filter(f => f.path !== filePath);
      setActiveTab(remainingTabs[0]?.path || null);
    }

    // Remove from file contents (Merkle sync will detect deletion on save)
    setFileContents(prev => {
      const newContents = { ...prev };
      delete newContents[filePath];
      return newContents;
    });

    // Remove from files list
    setFiles(prev => prev.filter(f => f.filePath !== filePath));

    // Rebuild file tree
    const updatedFiles = files.filter(f => f.filePath !== filePath);
    const tree = buildFileTree(updatedFiles);
    setFileTree(tree);

    // Remove from languages
    setFileLanguages(prev => {
      const newLangs = { ...prev };
      delete newLangs[filePath];
      return newLangs;
    });

    // Remove from local files if present
    setLocalFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(filePath);
      return newSet;
    });

    // Remove from unsaved changes
    setUnsavedChanges(prev => {
      const newSet = new Set(prev);
      newSet.delete(filePath);
      return newSet;
    });

    setContextMenu(null);
    console.log(`🗑️ File marked for deletion: ${filePath} (will be deleted on save)`);
  };

  // Rename file (local only, backend will detect as delete + add on save)
  const handleRenameFile = () => {
    if (!newFileName.trim() || !renameFile) {
      alert('Please enter a new file name');
      return;
    }

    const oldPath = renameFile.path;
    const newPath = newFileName.trim();

    if (oldPath === newPath) {
      setShowRenameModal(false);
      return;
    }

    // Check if new path already exists
    if (files.find(f => f.filePath === newPath) || fileContents[newPath]) {
      alert('A file with that name already exists');
      return;
    }

    // Get current content
    const content = fileContents[oldPath] || '';
    const language = fileLanguages[oldPath] || getLanguageFromExtension(newPath);

    // Remove old file from state
    setFileContents(prev => {
      const newContents = { ...prev };
      delete newContents[oldPath];
      return newContents;
    });

    setFileLanguages(prev => {
      const newLangs = { ...prev };
      delete newLangs[oldPath];
      return newLangs;
    });

    // Remove old file from files list
    setFiles(prev => prev.filter(f => f.filePath !== oldPath));

    // Add new file with content
    const newFile = {
      fileId: `local-${Date.now()}`,
      filePath: newPath,
      language: getLanguageFromExtension(newPath),
      sizeBytes: content.length,
      lineCount: content.split('\n').length,
      indexedAt: Date.now()
    };
    setFiles(prev => [...prev, newFile]);

    // Add new file to state
    setFileContents(prev => ({
      ...prev,
      [newPath]: content
    }));

    setFileLanguages(prev => ({
      ...prev,
      [newPath]: language
    }));

    // Mark new file as unsaved (local)
    setLocalFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(oldPath);
      newSet.add(newPath);
      return newSet;
    });

    setUnsavedChanges(prev => {
      const newSet = new Set(prev);
      newSet.delete(oldPath);
      newSet.add(newPath);
      return newSet;
    });

    // Rebuild file tree
    const updatedFiles = files.filter(f => f.filePath !== oldPath);
    updatedFiles.push(newFile);
    const tree = buildFileTree(updatedFiles);
    setFileTree(tree);

    // Update tabs
    setOpenTabs(prev => prev.map(f =>
      f.path === oldPath ? { ...f, path: newPath, name: newPath.split('/').pop() } : f
    ));

    if (activeTab === oldPath) {
      setActiveTab(newPath);
    }

    setShowRenameModal(false);
    setRenameFile(null);
    setNewFileName('');

    console.log(`📝 File renamed: ${oldPath} → ${newPath} (will sync as delete+add on save)`);
  };

  // Close tab
  const handleCloseTab = (filePath, e) => {
    e?.stopPropagation();

    if (unsavedChanges.has(filePath)) {
      if (!confirm(`${filePath} has unsaved changes. Close anyway?`)) {
        return;
      }
    }

    const newTabs = openTabs.filter(f => f.path !== filePath);
    setOpenTabs(newTabs);

    if (activeTab === filePath) {
      setActiveTab(newTabs[0]?.path || null);
    }

    setUnsavedChanges(prev => {
      const newSet = new Set(prev);
      newSet.delete(filePath);
      return newSet;
    });
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle settings change
  const handleSettingsChange = (newSettings) => {
    setEditorSettings(newSettings);
  };

  // Handle file selection from search modal
  const handleFileSelectFromSearch = async (file) => {
    // Find the file in the tree and open it
    const foundFile = files.find(f => f.filePath === file.path);
    if (foundFile) {
      const treeNode = {
        id: foundFile.fileId,
        name: foundFile.filePath.split('/').pop(),
        path: foundFile.filePath,
        type: 'file',
        fileData: foundFile
      };
      await handleFileClick(treeNode);
    }
  };

  /**
   * Show diff for edits in the main editor area
   */
  const handleShowDiffInEditor = (edits, initialIndex = 0) => {
    // Normalize to array
    const editsArray = Array.isArray(edits) ? edits : [edits];
    
    if (editsArray.length === 0) return;
    
    const firstEdit = editsArray[0];
    console.log('[Editor] Showing diff in editor for:', firstEdit.file, initialIndex);

    // Open the file if not already open
    const file = files.find(f => f.filePath === firstEdit.file);
    if (file) {
      const treeNode = {
        id: file.fileId,
        name: firstEdit.file.split('/').pop(),
        path: firstEdit.file,
        type: 'file',
        fileData: file
      };

      // Add to open tabs if not already open
      if (!openTabs.find(f => f.path === firstEdit.file)) {
        setOpenTabs([...openTabs, treeNode]);
      }
      setActiveTab(firstEdit.file);
    }

    // Set diff mode
    setCurrentDiffEdits(editsArray);
    setDiffEditIndex(initialIndex);
    setDiffMode(true);
  };

  /**
   * Apply edit from diff viewer
   */
  const handleAcceptDiff = (indexToApply) => {
    // Determine which edits to apply
    let editsToApply = [];
    
    if (typeof indexToApply === 'number') {
      // Apply single edit
      if (currentDiffEdits[indexToApply]) {
        editsToApply = [currentDiffEdits[indexToApply]];
      }
    } else {
      // Apply all edits
      editsToApply = [...currentDiffEdits];
    }

    if (editsToApply.length === 0) return;

    try {
      // Apply all edits sequentially
      // Sort by line number (descending) to avoid position shifts for simple line-based edits
      // But for robust multi-edit, we rely on fuzzy matching + sequential application
      const sortedEdits = [...editsToApply].sort((a, b) => {
        const aLine = a.startLine || 0;
        const bLine = b.startLine || 0;
        return bLine - aLine; // Bottom to top
      });

      // Get current file content (starting point)
      const targetFile = sortedEdits[0].file;
      let currentContent = fileContents[targetFile] || '';

      for (const edit of sortedEdits) {
        // For replace/delete/insert, we need to re-locate the edit in the current content
        // because previous edits in the loop might have shifted things
        
        let newContent = '';

        if (edit.action === 'create') {
          newContent = edit.newCode || '';
          
          // Create file if it doesn't exist
          if (!files.find(f => f.filePath === edit.file)) {
            const detectedLanguage = getLanguageFromExtension(edit.file);
            setLocalFiles(prev => new Set(prev).add(edit.file));

            const newFile = {
              fileId: `local-${Date.now()}`,
              filePath: edit.file,
              language: detectedLanguage,
              sizeBytes: newContent.length,
              lineCount: newContent.split('\n').length,
              indexedAt: Date.now()
            };
            setFiles(prev => [...prev, newFile]);

            const updatedFiles = [...files, newFile];
            const tree = buildFileTree(updatedFiles);
            setFileTree(tree);

            setFileLanguages(prev => ({
              ...prev,
              [edit.file]: detectedLanguage
            }));
          }
        } else {
          // For existing files, use robust application
          if (edit.action === 'replace') {
            newContent = applyReplace(currentContent, edit);
          } else if (edit.action === 'insert') {
            newContent = applyInsert(currentContent, edit);
          } else if (edit.action === 'delete') {
            newContent = applyDelete(currentContent, edit);
          }
        }
        
        // Update content for next iteration
        currentContent = newContent;
      }

      // Update file contents finally
      setFileContents(prev => ({
        ...prev,
        [targetFile]: currentContent
      }));

      setUnsavedChanges(prev => new Set(prev).add(targetFile));

      // Remove applied edits from the list if we only applied one
      if (typeof indexToApply === 'number') {
        const newEdits = currentDiffEdits.filter((_, i) => i !== indexToApply);
        if (newEdits.length === 0) {
           setDiffMode(false);
           setCurrentDiffEdits([]);
           setDiffEditIndex(null);
        } else {
           setCurrentDiffEdits(newEdits);
        }
      } else {
        // Applied all
        setDiffMode(false);
        setCurrentDiffEdits([]);
        setDiffEditIndex(null);
      }

      console.log('[Editor] Edit(s) applied successfully');
    } catch (err) {
      console.error('[Editor] Failed to apply edit:', err);
      alert(`Failed to apply edit: ${err.message}`);
    }
  };

  /**
   * Reject diff and exit diff mode
   */
  const handleRejectDiff = (indexToReject) => {
    if (typeof indexToReject === 'number') {
        const newEdits = currentDiffEdits.filter((_, i) => i !== indexToReject);
        if (newEdits.length === 0) {
           setDiffMode(false);
           setCurrentDiffEdits([]);
           setDiffEditIndex(null);
        } else {
           setCurrentDiffEdits(newEdits);
        }
    } else {
        // Reject all
        setDiffMode(false);
        setCurrentDiffEdits([]);
        setDiffEditIndex(null);
    }
  };

  // Helper functions for applying edits
  const applyReplace = (content, edit) => {
    if (!edit.newCode) {
      throw new Error('New code is required for replace action');
    }

    // Try fuzzy match first
    if (edit.oldCode) {
       const match = locateEdit(content, edit.oldCode, edit.startLine);
       if (match.matchType !== 'not_found') {
         const before = content.slice(0, match.startIndex);
         const after = content.slice(match.endIndex);
         return before + edit.newCode + after;
       }
    }

    // Fallback to line numbers
    if (edit.startLine && edit.endLine) {
      const lines = content.split('\n');
      const before = lines.slice(0, edit.startLine - 1);
      const after = lines.slice(edit.endLine);
      // Split newCode into lines if it contains multiple lines
      const newLines = edit.newCode.split('\n');
      return [...before, ...newLines, ...after].join('\n');
    }

    throw new Error('Replace action requires either valid old code matching or line numbers');
  };

  const applyInsert = (content, edit) => {
    if (!edit.newCode) {
      throw new Error('New code is required for insert action');
    }

    if (!content) {
      return edit.newCode;
    }

    const lines = content.split('\n');
    const newLines = edit.newCode.split('\n');

    if (edit.startLine !== undefined) {
      const insertIndex = edit.startLine - 1;
      const before = lines.slice(0, insertIndex);
      const after = lines.slice(insertIndex);
      return [...before, ...newLines, ...after].join('\n');
    } else if (edit.afterLine !== undefined) {
      const before = lines.slice(0, edit.afterLine);
      const after = lines.slice(edit.afterLine);
      return [...before, ...newLines, ...after].join('\n');
    }

    return content + '\n' + edit.newCode;
  };

  const applyDelete = (content, edit) => {
     // Try fuzzy match first
    if (edit.oldCode) {
       const match = locateEdit(content, edit.oldCode, edit.startLine);
       if (match.matchType !== 'not_found') {
         const before = content.slice(0, match.startIndex);
         const after = content.slice(match.endIndex);
         return before + after;
       }
    }

    if (edit.startLine && edit.endLine) {
      const lines = content.split('\n');
      const before = lines.slice(0, edit.startLine - 1);
      const after = lines.slice(edit.endLine);
      return [...before, ...after].join('\n');
    }

    throw new Error('Delete action requires either valid old code matching or line numbers');
  };

  // Render file tree recursively
  const renderFileTree = (nodes) => {
    return nodes.map(node => {
      const isExpanded = expandedFolders.has(node.id);
      const isActive = activeTab === node.path;

      if (node.type === 'folder') {
        const folderIcon = getFolderIconForPath(node.path, isExpanded);
        return (
          <div key={node.id}>
            <div
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#1e293b] cursor-pointer rounded-md text-sm transition-all font-['DM_Sans']"
              onClick={() => toggleFolder(node.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ folder: node, x: e.clientX, y: e.clientY });
              }}
            >
              {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
              <img 
                src={folderIcon.src} 
                alt="folder" 
                className="w-4 h-4"
                style={{ filter: `drop-shadow(0 0 2px ${folderIcon.color})` }}
              />
              <span className="text-gray-300">{node.name}</span>
            </div>
            {isExpanded && (
              <div className="ml-4">
                {/* Show inline file/folder creation input */}
                {creatingFileInFolder === node.path && (
                  <div className="flex items-center gap-2 px-2 py-1 mb-1">
                    {creatingItemType === 'folder' ? (
                      <img 
                        src="/icons/folder-src.svg" 
                        alt="folder" 
                        className="w-4 h-4"
                        style={{ filter: 'drop-shadow(0 0 2px #60A5FA)' }}
                      />
                    ) : (
                      <File size={14} className="text-gray-400" />
                    )}
                    <input
                      type="text"
                      value={inlineFileName}
                      onChange={(e) => setInlineFileName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleInlineCreateFile();
                        } else if (e.key === 'Escape') {
                          setCreatingFileInFolder(null);
                          setInlineFileName('');
                          setCreatingItemType('file');
                        }
                      }}
                      onBlur={() => {
                        if (inlineFileName.trim()) {
                          handleInlineCreateFile();
                        } else {
                          setCreatingFileInFolder(null);
                          setInlineFileName('');
                          setCreatingItemType('file');
                        }
                      }}
                      placeholder={creatingItemType === 'folder' ? 'folder-name' : 'filename.ext'}
                      className="flex-1 bg-[#020617] border border-blue-500 rounded px-2 py-0.5 text-xs focus:outline-none text-gray-200"
                      autoFocus
                    />
                  </div>
                )}
                {node.children && renderFileTree(node.children)}
              </div>
            )}
          </div>
        );
      }

      const iconOrPath = getFileIcon(node.path);
      const isImage = typeof iconOrPath === 'string';

      return (
        <div
          key={node.id}
          className={`flex items-center justify-between gap-2 px-2 py-1.5 ml-6 hover:bg-[#1e293b] cursor-pointer rounded-md text-sm group transition-all font-['DM_Sans'] ${
            isActive ? 'bg-[#1e293b] border-l-2 border-l-blue-500' : ''
          }`}
          onClick={() => handleFileClick(node)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ file: node, x: e.clientX, y: e.clientY });
          }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isImage ? (
              <div className="w-4 h-4 flex items-center justify-center bg-black rounded">
                <img src={iconOrPath} alt="" className="w-3 h-3" />
              </div>
            ) : (
              React.createElement(iconOrPath, {
                size: 15,
                className: 'text-gray-400'
              })
            )}
            <span className="truncate text-gray-300">{node.name}</span>
            {unsavedChanges.has(node.path) && (
              <span className="text-yellow-400 text-xs font-bold">●</span>
            )}
          </div>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#020617]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-gray-400">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#020617]">
        <div className="flex flex-col items-center space-y-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-gray-200 font-semibold">Failed to load editor</p>
          <p className="text-gray-400 text-sm">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#020617]">
      {/* Hide scrollbars globally */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - File Tree */}
        <div
          className="bg-[#0a0e1a] border-r border-[#1e293b] flex flex-col relative"
          style={{ width: `${sidebarWidth}px` }}
        >
            <div className="p-3 border-b border-[#1e293b]">
              {/* Header with Project Name and Actions */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="text-gray-400 hover:text-gray-200 transition-all hover:scale-110"
                    title="Back to Dashboard"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <span className="text-sm font-semibold text-gray-300 font-['ClashDisplay-Variable'] truncate">
                    {projectInfo?.projectName || 'Project'}
                  </span>
                </div>
                <button
                  onClick={() => setShowNewFileModal(true)}
                  className="p-1.5 hover:bg-[#1e293b] rounded-lg transition-all hover:scale-110"
                  title="New File"
                >
                  <Plus size={16} className="text-blue-400" />
                </button>
              </div>
            
              {/* Quick Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowFileSearch(!showFileSearch)}
                  className={`flex-1 p-2 rounded-lg transition-all hover:scale-105 flex items-center justify-center 
                `}
                  title="Search Files (Ctrl+P)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              
                <button
                  onClick={() => setShowGitPanel(!showGitPanel)}
                  className={`flex-1 p-2 rounded-lg transition-all hover:scale-105 flex items-center justify-center `}
                  title="Git (Ctrl+G)"
                >
                  <GitBranch size={16} />
                </button>
              
                <button
                  onClick={() => setShowTerminal(!showTerminal)}
                  className={`flex-1 p-2 rounded-lg transition-all hover:scale-105 flex items-center justify-center `}
                  title="Terminal (Ctrl+`)"
                >
                  <TerminalIcon size={16} />
                </button>
              
                <button
                  onClick={() => setShowAIChat(!showAIChat)}
                  className={`flex-1 p-2 rounded-lg transition-all hover:scale-105 flex items-center justify-center `}
                  title="AI Assistant (Ctrl+I)"
                >
                  <Bot size={16} />
                </button>
              
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`flex-1 p-2 rounded-lg transition-all hover:scale-105 flex items-center justify-center `}
                  title="Settings"
                >
                  <SettingsIcon size={16} />
                </button>
              </div>
            </div>
          <div className="flex-1 overflow-y-auto p-2">
            {fileTree.length > 0 ? renderFileTree(fileTree) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No files</p>
              </div>
            )}
          </div>

          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors group"
            onMouseDown={() => setIsResizing(true)}
          >
            <div className="absolute inset-y-0 -right-1 w-3" />
          </div>
        </div>

        {/* Editor Area + Terminal Column */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Tabs - Compact */}
          {openTabs.length > 0 && (
            <div 
              className="bg-[#0a0e1a] border-b border-[#1e293b] flex overflow-x-auto scrollbar-hide"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {openTabs.map(file => {
                const iconOrPath = getFileIcon(file.path);
                const isImage = typeof iconOrPath === 'string';

                return (
                  <div
                    key={file.path}
                    className={`flex items-center gap-2 px-3 py-1.5 border-r border-[#1e293b] cursor-pointer hover:bg-[#1e293b] transition-all font-['DM_Sans'] group whitespace-nowrap ${
                      activeTab === file.path ? 'bg-[#020617] border-b-2 border-b-blue-500' : ''
                    }`}
                    onClick={() => setActiveTab(file.path)}
                    title={file.path}
                  >
                    {isImage ? (
                      <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center bg-black rounded">
                        <img src={iconOrPath} alt="" className="w-3 h-3" />
                      </div>
                    ) : (
                      React.createElement(iconOrPath, {
                        size: 14,
                        className: 'text-gray-400 shrink-0'
                      })
                    )}
                    <span className="text-xs text-gray-200">{file.name}</span>
                    {unsavedChanges.has(file.path) && (
                      <span className="text-yellow-400 text-[10px] font-bold shrink-0">●</span>
                    )}
                    <button
                      onClick={(e) => handleCloseTab(file.path, e)}
                      className="p-0.5 hover:bg-[#334155] rounded transition-all ml-1 opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Breadcrumb Navigation */}
          {activeTab && (
            <div 
              className="bg-[#0a0e1a] border-b border-[#1e293b] px-4 py-2 flex items-center gap-1 overflow-x-auto text-xs font-['DM_Sans'] scrollbar-hide"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {(() => {
                const pathParts = activeTab.split('/');
                const iconOrPath = getFileIcon(activeTab);
                const isImage = typeof iconOrPath === 'string';
                
                return (
                  <>
                    {pathParts.map((part, index) => {
                      const isLast = index === pathParts.length - 1;
                      const pathUpToHere = pathParts.slice(0, index + 1).join('/');
                      
                      // Check if this path segment corresponds to a folder in our tree
                      const isFolder = !isLast;
                      
                      return (
                        <React.Fragment key={index}>
                          {index > 0 && (
                            <ChevronRight size={12} className="text-gray-600 shrink-0" />
                          )}
                          {isFolder ? (
                            <button
                              onClick={() => {
                                // Find and expand this folder in the tree
                                const folderId = `folder-${pathUpToHere}`;
                                setExpandedFolders(prev => new Set(prev).add(folderId));
                              }}
                              className="text-gray-400 hover:text-gray-200 transition-colors hover:bg-[#1e293b] px-1.5 py-0.5 rounded flex items-center gap-1.5"
                              title={`Open ${part} folder`}
                            >
                              {index === 0 ? (
                                <img 
                                  src={getFolderIconForPath(pathUpToHere, false).src}
                                  alt="folder"
                                  className="w-3.5 h-3.5"
                                />
                              ) : (
                                <img 
                                  src={getFolderIconForPath(pathUpToHere, false).src}
                                  alt="folder"
                                  className="w-3.5 h-3.5"
                                />
                              )}
                              <span>{part}</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 text-gray-200 font-medium px-1.5 py-0.5">
                              {isImage ? (
                                <div className="w-3.5 h-3.5 flex items-center justify-center bg-black rounded">
                                  <img src={iconOrPath} alt="" className="w-3 h-3" />
                                </div>
                              ) : (
                                React.createElement(iconOrPath, {
                                  size: 14,
                                  className: 'text-blue-400'
                                })
                              )}
                              <span>{part}</span>
                              {unsavedChanges.has(activeTab) && (
                                <span className="text-yellow-400 text-[10px] ml-1">●</span>
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          )}

          {/* Editor */}
          <div className="flex-1 overflow-hidden relative min-h-0">
            {activeTab ? (
              <>
                {diffMode && currentDiffEdits.length > 0 ? (
                  // Show diff viewer
                  <div className="h-full flex flex-col bg-[#020617]">
                    {/* Diff Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e293b] bg-[#0a0e1a]">
                      <div>
                        <h3 className="font-semibold text-gray-200 mb-1">Review Edits</h3>
                        <p className="text-xs text-gray-500">
                          {currentDiffEdits.length} Edit{currentDiffEdits.length !== 1 ? 's' : ''} • {currentDiffEdits[0].file}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRejectDiff()}
                          className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] rounded flex items-center gap-2 text-sm font-medium transition-colors text-gray-300"
                        >
                          <XCircle size={16} />
                          Cancel All
                        </button>
                        <button
                          onClick={() => handleAcceptDiff()}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                          <CheckCircle size={16} />
                          Apply All
                        </button>
                      </div>
                    </div>

                    {/* Diff Viewer */}
                    <div className="flex-1 overflow-hidden">
                      <CodeMirrorDiffViewer
                        edits={currentDiffEdits}
                        onAcceptEdit={(index) => handleAcceptDiff(index)}
                        onRejectEdit={(index) => handleRejectDiff(index)}
                        onAcceptAll={() => handleAcceptDiff()}
                        onRejectAll={() => handleRejectDiff()}
                        fileContents={fileContents}
                      />
                    </div>
                  </div>
                ) : (
                  // Normal editor view
                  <>
                    <CodeMirrorEditorWithInlineEdit
                      value={fileContents[activeTab] || ''}
                      language={fileLanguages[activeTab] || getLanguageFromExtension(activeTab) || 'plaintext'}
                      onChange={handleEditorChange}
                      onSave={handleSaveFile}
                      onShowDiff={handleShowDiffInEditor}
                      settings={{
                        fontSize: editorSettings.fontSize,
                        tabSize: editorSettings.tabSize,
                        wordWrap: editorSettings.wordWrap,
                        minimap: editorSettings.minimap,
                        lineHeight: editorSettings.lineHeight,
                        theme: editorSettings.theme === 'vs-dark' ? 'oneDark' : editorSettings.theme,
                      }}
                      height="100%"
                      projectId={projectId}
                      filePath={activeTab}
                    />
                    {/* Inline Edit Hint */}
                    <div className="absolute bottom-3 right-3 bg-[#0a0e1a]/95 border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-gray-400 flex items-center gap-2 pointer-events-none shadow-xl backdrop-blur-sm font-['DM_Sans']">
                      <Zap size={14} className="text-blue-400" />
                      <span>Press <kbd className="px-2 py-1 bg-[#1e293b] rounded-md border border-[#334155] text-blue-400 font-medium">Cmd+K</kbd> for AI inline edit</span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a file to edit</p>
                </div>
              </div>
            )}
          </div>

          {/* Terminal Panel - Inside Editor Column */}
          {showTerminal && (
            <WebContainerTerminal
              projectId={projectId}
              files={wcFiles}
              onServerReady={handleServerReady}
              onClose={() => setShowTerminal(false)}
              defaultHeight={280}
              minHeight={150}
              maxHeight={500}
            />
          )}
        </div>

        {/* AI Chat Panel */}
        {showAIChat && (
          <AIChatPanel
            projectId={projectId}
            files={files}
            fileContents={fileContents}
            onClose={() => setShowAIChat(false)}
            onShowDiffInEditor={handleShowDiffInEditor}
            onFilesChange={(updatedContents, changedFilePath) => {
              // Update file contents in local state
              setFileContents(updatedContents);

              // Mark changed file as unsaved
              if (changedFilePath) {
                setUnsavedChanges(prev => new Set(prev).add(changedFilePath));

                // If it's a new file, add to file tree
                if (!files.find(f => f.filePath === changedFilePath)) {
                  console.log(`[Editor] Creating new file from AI edit: ${changedFilePath}`);

                  // Detect language from extension
                  const detectedLanguage = getLanguageFromExtension(changedFilePath);

                  // Add to local files
                  setLocalFiles(prev => new Set(prev).add(changedFilePath));

                  // Add to files list
                  const newFile = {
                    fileId: `local-${Date.now()}`,
                    filePath: changedFilePath,
                    language: detectedLanguage,
                    sizeBytes: updatedContents[changedFilePath]?.length || 0,
                    lineCount: updatedContents[changedFilePath]?.split('\n').length || 0,
                    indexedAt: Date.now()
                  };
                  setFiles(prev => [...prev, newFile]);

                  // Rebuild file tree
                  const updatedFiles = [...files, newFile];
                  const tree = buildFileTree(updatedFiles);
                  setFileTree(tree);

                  // Add language to state
                  setFileLanguages(prev => ({
                    ...prev,
                    [changedFilePath]: detectedLanguage
                  }));

                  // Open the new file
                  const treeNode = {
                    id: newFile.fileId,
                    name: changedFilePath.split('/').pop(),
                    path: changedFilePath,
                    type: 'file',
                    fileData: newFile
                  };

                  if (!openTabs.find(f => f.path === changedFilePath)) {
                    setOpenTabs(prev => [...prev, treeNode]);
                  }
                  setActiveTab(changedFilePath);

                  console.log(`[Editor] New file added to tree: ${changedFilePath}`);
                }
              }
            }}
          />
        )}

        {/* Git Panel */}
        {showGitPanel && (
          <div className="w-96 shrink-0">
            <GitPanel
              projectId={projectId}
              onClose={() => setShowGitPanel(false)}
            />
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-96 shrink-0">
            <SettingsPanel
              onClose={() => setShowSettings(false)}
              settings={editorSettings}
              onSettingsChange={handleSettingsChange}
            />
          </div>
        )}
        </div>

        {/* Preview Panel (when dev server is running) */}
        {showPreview && serverUrl && (
          <PreviewPanel
            url={serverUrl}
            onClose={() => setShowPreview(false)}
          />
        )}
      </div>

      {/* Status Bar */}
      {/* <div className="bg-[#0a0e1a] border-t border-[#1e293b] px-4 py-1.5 flex items-center justify-between text-xs font-['DM_Sans']">
        <div className="flex items-center gap-4">
          <span className="text-gray-500">
            {projectInfo?.projectName && (
              <>
                <span className="text-blue-400 font-medium">{projectInfo.projectName}</span>
                <span className="mx-2">•</span>
              </>
            )}
            <span className="text-gray-200 font-medium">{files.length}</span> files
          </span>
          {isIngesting && (
            <span className="text-blue-400 flex items-center gap-1">
              <span className="w-2 h-2 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              Indexing...
            </span>
          )}
          {ingestionResult && (
            <span className="text-green-400">
              ✓ Indexed {ingestionResult.result.filesProcessed} files
            </span>
          )}

          {wcBooting && (
            <span className="text-yellow-400 flex items-center gap-1">
              <span className="w-2 h-2 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              Booting WebContainer...
            </span>
          )}
          {wcBooted && !wcError && (
            <span className="text-green-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              WebContainer Ready
            </span>
          )}
          {wcError && (
            <span className="text-red-400 flex items-center gap-1">
              <AlertCircle size={12} />
              WC Error: {wcError}
            </span>
          )}
          {serverUrl && (
            <span className="text-blue-400 flex items-center gap-1">
              🌐 Server: <a href={serverUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">{serverUrl}</a>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {activeTab && (
            <span className="text-gray-400 truncate max-w-md">{activeTab}</span>
          )}
          {unsavedChanges.size > 0 && (
            <span className="text-yellow-400 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
              {unsavedChanges.size} unsaved • Press <kbd className="px-1.5 py-0.5 bg-[#1e293b] rounded text-xs ml-1">Cmd+S</kbd> to save
            </span>
          )}
        </div>
      </div> */}

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0a0e1a] rounded-xl p-6 w-96 border border-[#1e293b] shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 font-['ClashDisplay-Variable'] text-gray-100">Create New File</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="path/to/filename.ext"
              className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2.5 mb-4 focus:outline-none focus:border-blue-500 text-gray-200 font-['DM_Sans']"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile();
                if (e.key === 'Escape') {
                  setShowNewFileModal(false);
                  setNewFileName('');
                }
              }}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowNewFileModal(false);
                  setNewFileName('');
                }}
                className="px-4 py-2 bg-[#1e293b] hover:bg-[#334155] rounded-lg transition-all font-['DM_Sans'] font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-lg shadow-blue-600/25 font-['DM_Sans'] font-medium"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed bg-[#0a0e1a] border border-[#1e293b] rounded-lg shadow-2xl py-1 z-50 font-['DM_Sans']"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.folder ? (
              // Folder context menu
              <>
                <button
                  onClick={() => {
                    const folder = contextMenu.folder;
                    // Ensure folder is expanded
                    if (!expandedFolders.has(folder.id)) {
                      setExpandedFolders(prev => new Set(prev).add(folder.id));
                    }
                    // Start inline file creation
                    setCreatingFileInFolder(folder.path);
                    setInlineFileName('');
                    setCreatingItemType('file');
                    setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-[#1e293b] flex items-center gap-2 text-sm transition-all text-gray-300"
                >
                  <FilePlus size={14} className="text-blue-400" />
                  New File
                </button>
                <button
                  onClick={() => {
                    const folder = contextMenu.folder;
                    // Ensure folder is expanded
                    if (!expandedFolders.has(folder.id)) {
                      setExpandedFolders(prev => new Set(prev).add(folder.id));
                    }
                    // Start inline folder creation
                    setCreatingFileInFolder(folder.path);
                    setInlineFileName('');
                    setCreatingItemType('folder');
                    setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-[#1e293b] flex items-center gap-2 text-sm transition-all text-gray-300"
                >
                  <img 
                    src="/icons/folder-src.svg" 
                    alt="folder" 
                    className="w-4 h-4"
                    style={{ filter: 'drop-shadow(0 0 2px #60A5FA)' }}
                  />
                  New Folder
                </button>
              </>
            ) : (
              // File context menu
              <>
                <button
                  onClick={() => {
                    setRenameFile(contextMenu.file);
                    setNewFileName(contextMenu.file.path);
                    setShowRenameModal(true);
                    setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-[#1e293b] flex items-center gap-2 text-sm transition-all text-gray-300"
                >
                  <Edit2 size={14} className="text-blue-400" />
                  Rename
                </button>
                <button
                  onClick={() => {
                    handleDeleteFile(contextMenu.file.path);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-red-900/20 flex items-center gap-2 text-sm text-red-400 transition-all"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0a0e1a] rounded-xl p-6 w-96 border border-[#1e293b] shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 font-['ClashDisplay-Variable'] text-gray-100">Rename File</h3>
            <p className="text-sm text-gray-400 mb-3 font-['DM_Sans']">From: <span className="text-gray-300">{renameFile?.path}</span></p>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="new/path/to/filename.ext"
              className="w-full bg-[#020617] border border-[#1e293b] rounded-lg px-3 py-2.5 mb-4 focus:outline-none focus:border-blue-500 text-gray-200 font-['DM_Sans']"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameFile();
                if (e.key === 'Escape') {
                  setShowRenameModal(false);
                  setRenameFile(null);
                  setNewFileName('');
                }
              }}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setRenameFile(null);
                  setNewFileName('');
                }}
                className="px-4 py-2 bg-[#1e293b] hover:bg-[#334155] rounded-lg transition-all font-['DM_Sans'] font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameFile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-lg shadow-blue-600/25 font-['DM_Sans'] font-medium"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Search Modal */}
      <FileSearchModal
        isOpen={showFileSearch}
        onClose={() => setShowFileSearch(false)}
        files={files.map(f => ({ path: f.filePath, name: f.filePath.split('/').pop() }))}
        onFileSelect={handleFileSelectFromSearch}
      />
    </div>
  );
};

export default EditorPageFinal;
