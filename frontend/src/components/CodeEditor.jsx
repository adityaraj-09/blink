import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import {
  Play, Download, Upload, Copy, Settings, RotateCcw, FileText,
  Folder, FolderOpen, File, ChevronRight, ChevronDown, X,
  Plus, Search, MoreVertical, Save, Code, Terminal,
  Menu, Maximize2, Minimize2
} from 'lucide-react';

const CodeEditor = () => {
  const [files, setFiles] = useState([
    {
      id: '1',
      name: 'index.js',
      type: 'file',
      language: 'javascript',
      content: `// Welcome to Professional Code Editor
// Start coding here...

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci sequence:");
for (let i = 0; i < 10; i++) {
  console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}
`,
    },
    {
      id: '2',
      name: 'styles.css',
      type: 'file',
      language: 'css',
      content: `/* Styles */
body {
  margin: 0;
  font-family: 'Arial', sans-serif;
  background: #000;
  color: #fff;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
`,
    },
    {
      id: '3',
      name: 'README.md',
      type: 'file',
      language: 'markdown',
      content: `# Project Name

## Description
Your project description here...

## Features
- Feature 1
- Feature 2
- Feature 3
`,
    },
  ]);

  const [folderStructure, setFolderStructure] = useState([
    {
      id: 'root',
      name: 'my-project',
      type: 'folder',
      expanded: true,
      children: [
        {
          id: 'src',
          name: 'src',
          type: 'folder',
          expanded: true,
          children: [
            { id: '1', name: 'index.js', type: 'file' },
            { id: '2', name: 'styles.css', type: 'file' },
          ],
        },
        { id: '3', name: 'README.md', type: 'file' },
      ],
    },
  ]);

  const [openTabs, setOpenTabs] = useState(['1']);
  const [activeTab, setActiveTab] = useState('1');
  const [output, setOutput] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showTerminal, setShowTerminal] = useState(true);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const getActiveFile = () => files.find((f) => f.id === activeTab);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;

    editor.addCommand(window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    editor.addCommand(window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Enter, () => {
      handleRun();
    });
  };

  const handleEditorChange = (value) => {
    setFiles(
      files.map((f) => (f.id === activeTab ? { ...f, content: value || '' } : f))
    );
  };

  const toggleFolder = (folderId, items) => {
    return items.map((item) => {
      if (item.id === folderId && item.type === 'folder') {
        return { ...item, expanded: !item.expanded };
      }
      if (item.children) {
        return { ...item, children: toggleFolder(folderId, item.children) };
      }
      return item;
    });
  };

  const handleFolderClick = (folderId) => {
    setFolderStructure(toggleFolder(folderId, folderStructure));
  };

  const handleFileClick = (fileId) => {
    if (!openTabs.includes(fileId)) {
      setOpenTabs([...openTabs, fileId]);
    }
    setActiveTab(fileId);
  };

  const handleCloseTab = (fileId, e) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((id) => id !== fileId);
    setOpenTabs(newTabs);
    if (activeTab === fileId && newTabs.length > 0) {
      setActiveTab(newTabs[newTabs.length - 1]);
    }
  };

  const renderFileTree = (items, depth = 0) => {
    return items.map((item) => (
      <div key={item.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 cursor-pointer transition-colors ${
            activeTab === item.id ? 'bg-white/10' : ''
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() =>
            item.type === 'folder' ? handleFolderClick(item.id) : handleFileClick(item.id)
          }
        >
          {item.type === 'folder' ? (
            <>
              {item.expanded ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
              {item.expanded ? (
                <FolderOpen size={16} className="text-blue-400" />
              ) : (
                <Folder size={16} className="text-blue-400" />
              )}
            </>
          ) : (
            <>
              <span className="w-4" />
              <File size={16} className="text-gray-400" />
            </>
          )}
          <span className="text-sm text-gray-200">{item.name}</span>
        </div>
        {item.type === 'folder' && item.expanded && item.children && (
          <div>{renderFileTree(item.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  const handleRun = () => {
    const activeFile = getActiveFile();
    if (!activeFile || activeFile.language !== 'javascript') {
      setOutput('Only JavaScript files can be executed.');
      return;
    }

    setOutput('');
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const logs = [];

    console.log = (...args) => {
      logs.push(args.join(' '));
    };
    console.error = (...args) => {
      logs.push('Error: ' + args.join(' '));
    };

    try {
      // eslint-disable-next-line no-eval
      eval(activeFile.content);
      setOutput(logs.join('\n') || 'Code executed successfully!');
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    } finally {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    }
  };

  const handleSave = () => {
    const activeFile = getActiveFile();
    if (activeFile) {
      const blob = new Blob([activeFile.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setOutput(`Saved: ${activeFile.name}`);
    }
  };

  const handleDownload = () => {
    handleSave();
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result || '';
        const extension = file.name.split('.').pop();
        const languageMap = {
          js: 'javascript',
          ts: 'typescript',
          py: 'python',
          java: 'java',
          cpp: 'cpp',
          cs: 'csharp',
          rs: 'rust',
          go: 'go',
          html: 'html',
          css: 'css',
          json: 'json',
          md: 'markdown',
        };
        const language = languageMap[extension] || 'plaintext';

        const newFile = {
          id: Date.now().toString(),
          name: file.name,
          type: 'file',
          language,
          content,
        };

        setFiles([...files, newFile]);
        handleFileClick(newFile.id);
      };
      reader.readAsText(file);
    }
  };

  const handleCopy = () => {
    const activeFile = getActiveFile();
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content);
      setOutput('Code copied to clipboard!');
    }
  };

  const handleNewFile = () => {
    const newFile = {
      id: Date.now().toString(),
      name: 'untitled.js',
      type: 'file',
      language: 'javascript',
      content: '// New file\n',
    };
    setFiles([...files, newFile]);
    handleFileClick(newFile.id);
  };

  const activeFile = getActiveFile();

  return (
    <div className="flex flex-col h-screen bg-[#0e0e0e] text-white">
      {/* Top Menu Bar */}
      <div className="bg-[#181818] border-b border-[#2d2d2d] px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Code size={20} className="text-blue-500" />
            <span className="text-sm font-semibold text-gray-200">Code Editor</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-400">
            <button className="px-2 py-1 hover:bg-white/5 rounded transition-colors">
              File
            </button>
            <button className="px-2 py-1 hover:bg-white/5 rounded transition-colors">
              Edit
            </button>
            <button className="px-2 py-1 hover:bg-white/5 rounded transition-colors">
              View
            </button>
            <button className="px-2 py-1 hover:bg-white/5 rounded transition-colors">
              Run
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-1.5 hover:bg-white/5 rounded transition-colors"
            title="Toggle Sidebar"
          >
            <Menu size={16} className="text-gray-400" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-white/5 rounded transition-colors"
            title="Settings"
          >
            <Settings size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Activity Bar + Sidebar + Editor + Terminal */}
      <div className="flex-1 flex overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Activity Bar */}
          <Panel defaultSize={5} minSize={3} maxSize={5}>
            <div className="h-full bg-[#181818] border-r border-[#2d2d2d] flex flex-col items-center py-4 gap-4">
              <button
                className="p-2 hover:bg-white/5 rounded transition-colors text-gray-400 hover:text-white"
                title="Explorer"
              >
                <File size={20} />
              </button>
              <button
                className="p-2 hover:bg-white/5 rounded transition-colors text-gray-400 hover:text-white"
                title="Search"
              >
                <Search size={20} />
              </button>
              <button
                className="p-2 hover:bg-white/5 rounded transition-colors text-gray-400 hover:text-white"
                title="Source Control"
              >
                <Code size={20} />
              </button>
              <button
                onClick={() => setShowTerminal(!showTerminal)}
                className="p-2 hover:bg-white/5 rounded transition-colors text-gray-400 hover:text-white"
                title="Terminal"
              >
                <Terminal size={20} />
              </button>
            </div>
          </Panel>

          {/* Sidebar (File Explorer) */}
          {showSidebar && (
            <>
              <PanelResizeHandle className="w-0.5 bg-[#2d2d2d] hover:bg-blue-500 transition-colors" />
              <Panel defaultSize={20} minSize={15} maxSize={40}>
                <div className="h-full bg-[#181818] border-r border-[#2d2d2d] flex flex-col">
                  <div className="px-3 py-2 border-b border-[#2d2d2d] flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300 uppercase">
                      Explorer
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleNewFile}
                        className="p-1 hover:bg-white/5 rounded transition-colors"
                        title="New File"
                      >
                        <Plus size={14} className="text-gray-400" />
                      </button>
                      <button
                        onClick={handleUpload}
                        className="p-1 hover:bg-white/5 rounded transition-colors"
                        title="Upload File"
                      >
                        <Upload size={14} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto py-2">
                    {renderFileTree(folderStructure)}
                  </div>
                </div>
              </Panel>
            </>
          )}

          <PanelResizeHandle className="w-0.5 bg-[#2d2d2d] hover:bg-blue-500 transition-colors" />

          {/* Main Editor Area */}
          <Panel defaultSize={showSidebar ? 75 : 95} minSize={30}>
            <div className="h-full flex flex-col bg-[#1e1e1e]">
              <PanelGroup direction="vertical">
                {/* Editor Section */}
                <Panel defaultSize={showTerminal ? 70 : 100} minSize={30}>
                  <div className="h-full flex flex-col">
                    {/* Tabs */}
                    <div className="bg-[#181818] border-b border-[#2d2d2d] flex items-center overflow-x-auto">
                      {openTabs.map((tabId) => {
                        const file = files.find((f) => f.id === tabId);
                        if (!file) return null;
                        return (
                          <div
                            key={tabId}
                            className={`flex items-center gap-2 px-4 py-2 border-r border-[#2d2d2d] cursor-pointer transition-colors ${
                              activeTab === tabId
                                ? 'bg-[#1e1e1e] text-white'
                                : 'bg-[#181818] text-gray-400 hover:bg-[#1e1e1e]/50'
                            }`}
                            onClick={() => setActiveTab(tabId)}
                          >
                            <File size={14} />
                            <span className="text-sm">{file.name}</span>
                            <button
                              onClick={(e) => handleCloseTab(tabId, e)}
                              className="hover:bg-white/10 rounded p-0.5"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Editor Toolbar */}
                    <div className="bg-[#181818] border-b border-[#2d2d2d] px-3 py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{activeFile?.name || 'No file open'}</span>
                        <span>•</span>
                        <span className="capitalize">{activeFile?.language || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleCopy}
                          className="flex items-center gap-1.5 px-2 py-1 hover:bg-white/5 rounded transition-colors text-xs text-gray-400"
                          title="Copy"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={handleSave}
                          className="flex items-center gap-1.5 px-2 py-1 hover:bg-white/5 rounded transition-colors text-xs text-gray-400"
                          title="Save (Ctrl+S)"
                        >
                          <Save size={14} />
                        </button>
                        {activeFile?.language === 'javascript' && (
                          <button
                            onClick={handleRun}
                            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-xs text-white font-medium"
                            title="Run (Ctrl+Enter)"
                          >
                            <Play size={14} />
                            Run
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1">
                      {activeFile ? (
                        <Editor
                          height="100%"
                          language={activeFile.language}
                          value={activeFile.content}
                          theme="vs-dark"
                          onChange={handleEditorChange}
                          onMount={handleEditorDidMount}
                          options={{
                            fontSize,
                            fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
                            fontLigatures: true,
                            minimap: { enabled: true },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 2,
                            wordWrap: 'on',
                            lineNumbers: 'on',
                            renderLineHighlight: 'all',
                            cursorBlinking: 'smooth',
                            cursorSmoothCaretAnimation: 'on',
                            smoothScrolling: true,
                            contextmenu: true,
                            folding: true,
                            foldingStrategy: 'indentation',
                            showFoldingControls: 'always',
                            bracketPairColorization: { enabled: true },
                            guides: {
                              bracketPairs: true,
                              indentation: true,
                            },
                            padding: { top: 16, bottom: 16 },
                          }}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <Code size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-sm">No file open</p>
                            <p className="text-xs mt-2">Select a file from the explorer or create a new one</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Panel>

                {/* Terminal Panel */}
                {showTerminal && (
                  <>
                    <PanelResizeHandle className="h-0.5 bg-[#2d2d2d] hover:bg-blue-500 transition-colors" />
                    <Panel defaultSize={30} minSize={15} maxSize={60}>
                      <div className="h-full bg-[#181818] flex flex-col border-t border-[#2d2d2d]">
                        <div className="px-3 py-2 border-b border-[#2d2d2d] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Terminal size={14} className="text-gray-400" />
                            <span className="text-xs font-semibold text-gray-300 uppercase">
                              Output
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setOutput('')}
                              className="p-1 hover:bg-white/5 rounded transition-colors text-xs text-gray-400"
                            >
                              Clear
                            </button>
                            <button
                              onClick={() => setShowTerminal(false)}
                              className="p-1 hover:bg-white/5 rounded transition-colors"
                            >
                              <X size={14} className="text-gray-400" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 overflow-auto p-3">
                          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                            {output || '> Ready to run code...\n> Press Ctrl+Enter or click Run button'}
                          </pre>
                        </div>
                      </div>
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#181818] border border-[#2d2d2d] rounded-lg p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="hover:bg-white/5 rounded p-1"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Font Size</label>
                <input
                  type="range"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  min="10"
                  max="30"
                  className="w-full"
                />
                <span className="text-xs text-gray-400">{fontSize}px</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept=".js,.ts,.py,.java,.cpp,.cs,.rs,.go,.html,.css,.json,.md,.txt"
      />
    </div>
  );
};

export default CodeEditor;
