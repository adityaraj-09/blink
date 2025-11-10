/**
 * Progressive Edit Panel - Real-time TODO-based AI edits
 */

import { useState, useEffect, useRef } from 'react';
import { Send, X, Loader, Save, RefreshCw, AtSign, History, MessageSquare, Plus, ChevronDown, ChevronRight, CheckCircle, Circle, AlertCircle, Copy, StopCircle } from 'lucide-react';
import { useProgressiveEdit } from '../hooks/useProgressiveEdit';
import { syncWithMerkleTree } from '../api/files';
import { getChatSessions } from '../api/aiEdit';
import { MerkleHasher } from '../services/merkle';

const ProgressiveEditPanel = ({ projectId, files: initialFiles, fileContents, onClose, onFilesChange }) => {
  const [message, setMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // Central files array - synced with parent
  const [files, setFiles] = useState(initialFiles || []);

  // Session management
  const [showSessionList, setShowSessionList] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Panel width management
  const [panelWidth, setPanelWidth] = useState(384);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef(null);
  const textareaRef = useRef(null);

  // Collapsible TODOs
  const [expandedTodos, setExpandedTodos] = useState(new Set());

  // Progressive edit hook
  const {
    startTask,
    cancelCurrentTask,
    taskStatus,
    isRunning: progressiveRunning,
    error: progressiveError,
  } = useProgressiveEdit({
    projectId,
    pollInterval: 2000,
  });

  // Track applied TODOs
  const appliedTodosRef = useRef(new Set());

  /**
   * Sync files array with parent
   */
  useEffect(() => {
    setFiles(initialFiles || []);
  }, [initialFiles]);

  /**
   * Load all sessions on mount
   */
  useEffect(() => {
    loadAllSessions();
  }, [projectId]);

  const loadAllSessions = async () => {
    try {
      setLoadingSessions(true);
      const { sessions: fetchedSessions } = await getChatSessions(projectId);
      setSessions(fetchedSessions || []);
    } catch (err) {
      console.error('[Progressive Edit] Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  /**
   * Auto-apply completed edits
   */
  useEffect(() => {
    if (!taskStatus || !taskStatus.todos || !onFilesChange) return;

    const completedTodos = taskStatus.todos.filter(
      todo => todo.status === 'completed' && todo.edit && !appliedTodosRef.current.has(todo.todoId)
    );

    if (completedTodos.length === 0) return;

    console.log('[Progressive Edit] Auto-applying', completedTodos.length, 'completed edits');

    completedTodos.forEach(todo => {
      const edit = todo.edit;
      appliedTodosRef.current.add(todo.todoId);

      try {
        if (edit.action === 'create') {
          console.log(`[Progressive Edit] Creating file: ${edit.file}`);
          const updatedContents = {
            ...fileContents,
            [edit.file]: edit.newCode || ''
          };
          onFilesChange(updatedContents, edit.file);
        } else if (edit.action === 'replace') {
          console.log(`[Progressive Edit] Replacing file: ${edit.file}`);
          const updatedContents = {
            ...fileContents,
            [edit.file]: edit.newCode || ''
          };
          onFilesChange(updatedContents, edit.file);
        } else if (edit.action === 'insert') {
          console.log(`[Progressive Edit] Inserting into file: ${edit.file}`);
          const existingContent = fileContents[edit.file] || '';
          const lines = existingContent.split('\n');
          const insertLine = edit.line || lines.length;
          lines.splice(insertLine, 0, edit.newCode || '');
          const newContent = lines.join('\n');

          const updatedContents = {
            ...fileContents,
            [edit.file]: newContent
          };
          onFilesChange(updatedContents, edit.file);
        } else if (edit.action === 'delete') {
          console.log(`[Progressive Edit] Deleting from file: ${edit.file}`);
          const existingContent = fileContents[edit.file] || '';
          const lines = existingContent.split('\n');
          const startLine = edit.startLine || 0;
          const endLine = edit.endLine || startLine;
          lines.splice(startLine, endLine - startLine + 1);
          const newContent = lines.join('\n');

          const updatedContents = {
            ...fileContents,
            [edit.file]: newContent
          };
          onFilesChange(updatedContents, edit.file);
        }
      } catch (err) {
        console.error(`[Progressive Edit] Failed to apply edit for ${todo.todoId}:`, err);
      }
    });
  }, [taskStatus, fileContents, onFilesChange]);

  /**
   * Perform Merkle sync
   */
  const performMerkleSync = async () => {
    try {
      setIsSyncing(true);

      const fileList = [];
      for (const [path, content] of Object.entries(fileContents)) {
        fileList.push({ path, content, lastModified: Date.now() });
      }

      if (fileList.length === 0) {
        console.log('[Progressive Edit] ⏭️  Skipping Merkle sync - no files present');
        return true;
      }

      const merkleHasher = new MerkleHasher();
      const merkleTree = await merkleHasher.buildTreeFromFileSystem(fileList);
      const compareResult = await syncWithMerkleTree(projectId, merkleTree.toJSON(), null);

      if (compareResult.needsFiles && compareResult.needsFiles.length > 0) {
        const filesData = {};
        for (const changedPath of compareResult.needsFiles) {
          if (fileContents[changedPath] !== undefined) {
            filesData[changedPath] = {
              content: fileContents[changedPath],
              lastModified: Date.now()
            };
          }
        }
        await syncWithMerkleTree(projectId, merkleTree.toJSON(), filesData);
      }

      return true;
    } catch (err) {
      console.error('[Progressive Edit] Merkle sync failed:', err);
      throw new Error(`Merkle sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Manual Merkle sync
   */
  const handleManualSync = async () => {
    try {
      setSyncSuccess(false);
      await performMerkleSync();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2000);
    } catch (err) {
      console.error('[Progressive Edit] Manual sync failed:', err);
    }
  };

  /**
   * Send progressive edit message
   */
  const handleSendMessage = async () => {
    if (!message.trim() || progressiveRunning) return;

    const userMessage = message.trim();
    setMessage('');

    try {
      // Merkle sync first
      await performMerkleSync();

      console.log('[Progressive Edit] 🤖 Starting task:', userMessage);

      await startTask(userMessage, sessionId);
      await loadAllSessions();
    } catch (err) {
      console.error('[Progressive Edit] Failed to start task:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewSession = () => {
    setSessionId(null);
    setMessage('');
    appliedTodosRef.current.clear();
    setExpandedTodos(new Set());
  };

  const handleSelectSession = (session) => {
    setSessionId(session.sessionId);
    setShowSessionList(false);
  };

  const toggleTodo = (todoId) => {
    const newExpanded = new Set(expandedTodos);
    if (newExpanded.has(todoId)) {
      newExpanded.delete(todoId);
    } else {
      newExpanded.add(todoId);
    }
    setExpandedTodos(newExpanded);
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  // Panel resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setPanelWidth(Math.max(300, Math.min(800, newWidth)));
    };

    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={14} className="text-green-400 flex-shrink-0" />;
      case 'failed':
        return <AlertCircle size={14} className="text-red-400 flex-shrink-0" />;
      case 'processing':
        return <Loader size={14} className="text-blue-400 animate-spin flex-shrink-0" />;
      default:
        return <Circle size={14} className="text-gray-500 flex-shrink-0" />;
    }
  };

  return (
    <div className="flex h-full">
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className="w-1 bg-[#2d2d2d] hover:bg-[#3d3d3d] cursor-ew-resize transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />

      {/* Main Panel */}
      <div
        className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#2d2d2d]"
        style={{ width: `${panelWidth}px` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[#2d2d2d]">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-gray-400" />
            <h3 className="font-semibold text-sm text-gray-200">
              Progressive Edit
            </h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleNewSession}
              className="p-1.5 hover:bg-[#2d2d2d] rounded transition-colors"
              title="New Session"
            >
              <Plus size={16} className="text-gray-400 hover:text-gray-200" />
            </button>

            <button
              onClick={() => setShowSessionList(!showSessionList)}
              className={`p-1.5 rounded transition-colors ${
                showSessionList
                  ? 'bg-[#2d2d2d] text-gray-200'
                  : 'hover:bg-[#2d2d2d] text-gray-400'
              }`}
              title="Session History"
            >
              <History size={16} />
            </button>

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className={`p-1.5 rounded transition-colors ${
                syncSuccess
                  ? 'bg-green-900/30 text-green-400'
                  : isSyncing
                  ? 'bg-[#2d2d2d] text-gray-400'
                  : 'hover:bg-[#2d2d2d] text-gray-400 hover:text-gray-200'
              }`}
              title={isSyncing ? 'Syncing...' : syncSuccess ? 'Synced!' : 'Save & Sync'}
            >
              {isSyncing ? (
                <Loader size={16} className="animate-spin" />
              ) : syncSuccess ? (
                <Save size={16} className="text-green-400" />
              ) : (
                <Save size={16} />
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 ml-2 hover:bg-[#2d2d2d] rounded transition-colors"
              title="Close"
            >
              <X size={16} className="text-gray-400 hover:text-gray-200" />
            </button>
          </div>
        </div>

        {/* Session List */}
        {showSessionList && (
          <div className="border-b border-[#2d2d2d] bg-[#1e1e1e] max-h-64 overflow-y-auto">
            {loadingSessions ? (
              <div className="p-4 text-center">
                <Loader size={16} className="animate-spin mx-auto text-gray-500" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No previous sessions
              </div>
            ) : (
              <div className="divide-y divide-[#2d2d2d]">
                {sessions.map((session) => (
                  <button
                    key={session.sessionId}
                    onClick={() => handleSelectSession(session)}
                    className={`w-full text-left p-3 hover:bg-[#252525] transition-colors ${
                      sessionId === session.sessionId
                        ? 'bg-[#252525] border-l-2 border-gray-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200 truncate">
                          {session.title || 'New Chat'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {session.messageCount} messages • {new Date(session.updatedAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <MessageSquare size={14} className="text-gray-500 flex-shrink-0 mt-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sync Status */}
        {isSyncing && (
          <div className="px-3 py-2 bg-[#252525] border-b border-[#2d2d2d]">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <RefreshCw size={14} className="animate-spin" />
              <span>Syncing changes with backend...</span>
            </div>
          </div>
        )}

        {/* Task Status Header */}
        {taskStatus && (
          <div className="p-3 border-b border-[#2d2d2d] bg-[#252525]">
            {/* Progress Bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-gray-300">
                  {taskStatus.status === 'completed' ? 'Completed' : taskStatus.status === 'processing' ? 'Processing' : 'Planning'}
                </span>
                <span className="text-gray-400">
                  {taskStatus.progress.completed}/{taskStatus.progress.total} steps
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${taskStatus.progress.percentage}%` }}
                />
              </div>
            </div>

            {/* Plan Explanation - Scrollable */}
            {taskStatus.explanation && (
              <div className="p-2 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-gray-300 max-h-20 overflow-y-auto">
                <strong className="text-blue-300">Plan:</strong> {taskStatus.explanation}
              </div>
            )}

            {/* Summary (when completed) */}
            {taskStatus.status === 'completed' && taskStatus.summary && (
              <div className="mt-2 p-2 bg-green-900/20 border border-green-500/30 rounded text-xs max-h-32 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={14} className="text-green-400" />
                  <span className="font-semibold text-green-300">Completed!</span>
                </div>
                <div className="text-gray-300 space-y-1">
                  <div>Total: {taskStatus.summary.totalEdits} edits</div>
                  <div className="flex gap-3 text-xs">
                    <span>✨ {taskStatus.summary.creates} creates</span>
                    <span>✏️ {taskStatus.summary.replaces} replaces</span>
                    <span>➕ {taskStatus.summary.inserts} inserts</span>
                  </div>
                  <div className="text-gray-400">
                    Files: {taskStatus.summary.affectedFiles.length}
                  </div>
                  {taskStatus.summary.recommendation && (
                    <div className="text-yellow-400 mt-2 text-xs">
                      ⚠️ {taskStatus.summary.recommendation}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cancel Button */}
            {progressiveRunning && taskStatus.status !== 'completed' && (
              <button
                onClick={cancelCurrentTask}
                className="mt-2 w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <StopCircle size={14} />
                Cancel Task
              </button>
            )}
          </div>
        )}

        {/* Content Area - TODO List */}
        <div className="flex-1 overflow-y-auto p-3">
          {taskStatus && taskStatus.todos && taskStatus.todos.length > 0 ? (
            <div className="space-y-2">
              {taskStatus.todos.map((todo) => {
                const isExpanded = expandedTodos.has(todo.todoId);
                const isActive = todo.status === 'processing';
                const isCompleted = todo.status === 'completed';
                const isFailed = todo.status === 'failed';

                return (
                  <div
                    key={todo.todoId}
                    className={`border rounded transition-all ${
                      isCompleted
                        ? 'bg-green-900/5 border-green-500/20'
                        : isFailed
                        ? 'bg-red-900/5 border-red-500/20'
                        : isActive
                        ? 'bg-blue-900/5 border-blue-500/30 ring-1 ring-blue-500/20'
                        : 'bg-[#252525] border-gray-700'
                    }`}
                  >
                    {/* TODO Header - Always Visible */}
                    <button
                      onClick={() => toggleTodo(todo.todoId)}
                      className="w-full p-2 flex items-center gap-2 hover:bg-white/5 transition-colors"
                    >
                      {getStatusIcon(todo.status)}
                      <span className="text-xs font-mono bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                        {todo.order}
                      </span>
                      <span className="flex-1 text-left text-sm text-gray-200">
                        {todo.title}
                      </span>
                      {isActive && (
                        <Loader size={12} className="animate-spin text-blue-400 flex-shrink-0" />
                      )}
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-gray-500 flex-shrink-0" />
                      )}
                    </button>

                    {/* TODO Details - Collapsible */}
                    {isExpanded && (
                      <div className="px-2 pb-2 border-t border-gray-700/50 pt-2">
                        <div className="text-xs text-gray-400 mb-1">{todo.description}</div>
                        <div className="text-xs text-gray-500 mb-2">📁 {todo.filePath}</div>

                        {/* Show edit if completed */}
                        {isCompleted && todo.edit && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-400">
                                Action: <span className="text-blue-300">{todo.edit.action}</span>
                              </span>
                              {todo.edit.newCode && (
                                <button
                                  onClick={() => copyCode(todo.edit.newCode)}
                                  className="p-1 hover:bg-white/10 rounded transition-colors"
                                  title="Copy code"
                                >
                                  <Copy size={12} className="text-gray-400" />
                                </button>
                              )}
                            </div>
                            {todo.edit.newCode && (
                              <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto max-h-40 border border-gray-700">
                                <code className="text-gray-300">
                                  {todo.edit.newCode.substring(0, 300)}
                                  {todo.edit.newCode.length > 300 && '...'}
                                </code>
                              </pre>
                            )}
                          </div>
                        )}

                        {/* Show error if failed */}
                        {isFailed && todo.errorMessage && (
                          <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-300">
                            <div className="flex items-center gap-1 mb-1">
                              <AlertCircle size={12} />
                              <span className="font-semibold">Error</span>
                            </div>
                            {todo.errorMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : progressiveError ? (
            <div className="flex items-center justify-center h-full">
              <div className="max-w-md p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-300 mb-2">
                  <AlertCircle size={18} />
                  <span className="font-semibold">Error</span>
                </div>
                <p className="text-sm text-red-200">{progressiveError.message}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                {progressiveRunning ? (
                  <>
                    <Loader size={24} className="animate-spin text-purple-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Planning steps...</p>
                  </>
                ) : (
                  <>
                    <MessageSquare size={32} className="text-gray-600 mx-auto mb-3" />
                    <h3 className="font-semibold mb-2 text-gray-300">Progressive Execution</h3>
                    <p className="text-sm text-gray-500 max-w-xs">
                      AI will break down your request into steps and execute them one by one.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-[#2d2d2d] bg-[#1e1e1e]">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to build..."
                className="w-full bg-[#252525] text-gray-200 px-3 py-2 pr-10 rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-600"
                rows={3}
                disabled={progressiveRunning || isSyncing}
              />
              <AtSign size={16} className="absolute right-3 top-2.5 text-gray-500" />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || progressiveRunning || isSyncing}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded text-sm font-medium transition-colors self-start flex items-center gap-2"
            >
              {progressiveRunning || isSyncing ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressiveEditPanel;
