/**
 * Unified AI Chat Panel with Two Modes
 * 1. Instant Edit Mode - Merkle sync first, then AI edits with file tagging
 * 2. Progressive Mode - Real-time TODO tracking
 */

import { useState, useEffect, useRef } from 'react';
import { Send, X, Loader, Zap, ListTodo, AlertCircle, RefreshCw, FileText, AtSign, History, MessageSquare, Plus, ChevronDown, Save } from 'lucide-react';
import { useProgressiveEdit } from '../hooks/useProgressiveEdit';
import InstantEditView from './InstantEditView';
import ProgressiveEditView from './ProgressiveEditView';
import { getAIEdits, getChatSessions, getChatMessages } from '../api/aiEdit';
import { syncWithMerkleTree } from '../api/files';
import { MerkleHasher } from '../services/merkle';
import { quickSearchFiles } from '../utils/fileSearch';

const AIChatPanel = ({ projectId, files: initialFiles, fileContents, onClose, onFilesChange, onShowDiffInEditor }) => {
  const [mode, setMode] = useState('instant'); // 'instant' or 'progressive'
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
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
  const [panelWidth, setPanelWidth] = useState(384); // Default 96 (24rem = 384px)
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef(null);

  // Instant mode state
  const [instantResponse, setInstantResponse] = useState(null);
  const [instantLoading, setInstantLoading] = useState(false);
  const [instantError, setInstantError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // File tagging
  const [showFileSuggestions, setShowFileSuggestions] = useState(false);
  const [fileSuggestions, setFileSuggestions] = useState([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [taggedFiles, setTaggedFiles] = useState([]);
  const textareaRef = useRef(null);

  // Mode dropdown
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  // Progressive edit mode
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

  /**
   * Load all sessions for this project
   */
  const loadAllSessions = async () => {
    try {
      setLoadingSessions(true);
      const { sessions: fetchedSessions } = await getChatSessions(projectId);
      setSessions(fetchedSessions || []);
    } catch (err) {
      console.error('[AI Chat] Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  /**
   * Load conversation history when sessionId changes or component mounts
   */
  useEffect(() => {
    const loadHistory = async () => {
      if (!sessionId) {
        // No session selected - don't auto-load
        return;
      }

      // Load messages for selected session
      try {
        setLoadingHistory(true);
        const { messages } = await getChatMessages(sessionId);

        // Convert messages to conversation history format
        // Each user message contains AI response in metadata
        const history = messages
          .filter(msg => msg.role === 'user')
          .map(msg => {
            const metadata = msg.metadata || {};
            return {
              userContent: msg.content,
              assistantContent: metadata.explanation || '',
              edits: metadata.edits || [],
              summary: metadata.summary || {
                totalEdits: 0,
                creates: 0,
                replaces: 0,
                inserts: 0,
                deletes: 0,
                affectedFiles: []
              },
              contextChunks: metadata.contextChunks || [],
              timestamp: msg.createdAt
            };
          });

        setConversationHistory(history);
        console.log('[AI Chat] Loaded history:', history.length, 'messages');
      } catch (err) {
        console.error('[AI Chat] Failed to load history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (mode === 'instant' && sessionId) {
      loadHistory();
    }
  }, [sessionId, projectId, mode]);

  /**
   * Handle panel resize
   */
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 320 && newWidth <= 800) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  /**
   * Create new session
   */
  const handleNewSession = () => {
    setSessionId(null);
    setConversationHistory([]);
    setShowSessionList(false);
  };

  /**
   * Select a session
   */
  const handleSelectSession = (session) => {
    setSessionId(session.sessionId);
    setShowSessionList(false);
  };


  /**
   * Perform Merkle sync before AI request
   * Similar to handleSaveFile in EditorPageFinal
   */
  const performMerkleSync = async () => {
    try {
      setIsSyncing(true);

      // Build file list from local state
      const fileList = [];
      for (const [path, content] of Object.entries(fileContents)) {
        fileList.push({
          path,
          content,
          lastModified: Date.now()
        });
      }

      // Skip Merkle sync if no files present
      if (fileList.length === 0) {
        console.log('[AI Chat] ⏭️  Skipping Merkle sync - no files present');
        return true;
      }

      console.log('[AI Chat] 🌳 Starting Merkle sync before AI request...');

      const merkleHasher = new MerkleHasher();

      console.log(`[AI Chat] 🌳 Building Merkle tree from ${fileList.length} files...`);

      // Build Merkle tree
      const merkleTree = await merkleHasher.buildTreeFromFileSystem(fileList);
      console.log(`[AI Chat] 🌳 Merkle tree built: ${merkleTree.countFiles()} files, hash: ${merkleTree.hash.substring(0, 16)}`);

      // Step 1: Send Merkle tree to get list of changed files
      console.log('[AI Chat] 📨 Step 1: Sending merkle tree for comparison (files: null)');
      const compareResult = await syncWithMerkleTree(projectId, merkleTree.toJSON(), null);

      if (compareResult.needsFiles && compareResult.needsFiles.length > 0) {
        console.log(`[AI Chat] 📤 Step 2: Sending content for ${compareResult.needsFiles.length} changed files...`);
        console.log('[AI Chat] Changed files:', compareResult.needsFiles);

        // Step 2: Send only the content of changed files
        const filesData = {};
        for (const changedPath of compareResult.needsFiles) {
          if (fileContents[changedPath] !== undefined) {
            filesData[changedPath] = {
              content: fileContents[changedPath],
              lastModified: Date.now()
            };
          } else {
            console.warn(`[AI Chat] Content not available for changed file: ${changedPath}`);
          }
        }

        console.log('[AI Chat] 📦 Files data prepared:', Object.keys(filesData));
        console.log('[AI Chat] 📨 Sending actual file contents to backend...');

        // Sync again with file contents
        const result = await syncWithMerkleTree(projectId, merkleTree.toJSON(), filesData);

        console.log(`[AI Chat] ✓ Sync complete: ${result.filesProcessed} files processed, ${result.filesDeleted || 0} files deleted`);
        console.log(`[AI Chat]    Summary: ${result.summary.added} added, ${result.summary.modified} modified, ${result.summary.deleted} deleted`);
      } else {
        console.log('[AI Chat] ✓ No changes detected or sync complete');
      }

      return true;
    } catch (err) {
      console.error('[AI Chat] Merkle sync failed:', err);
      throw new Error(`Merkle sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Manual Merkle sync triggered by Save button
   */
  const handleManualSync = async () => {
    try {
      setSyncSuccess(false);
      await performMerkleSync();
      setSyncSuccess(true);

      // Clear success indicator after 2 seconds
      setTimeout(() => {
        setSyncSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('[AI Chat] Manual sync failed:', err);
      // Error is already logged in performMerkleSync
    }
  };

  /**
   * Detect @ mentions for file tagging
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Check if user is typing @ for file mention
    // Support both @filename and @path/to/file patterns
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    // Match @ followed by word characters, slashes, dots, dashes, underscores
    const atMatch = textBeforeCursor.match(/@([\w/.\-_]*)$/);

    if (atMatch) {
      const searchTerm = atMatch[1];
      
      // Use robust file search utility
      const suggestions = quickSearchFiles(
        files.map(f => ({ filePath: f.filePath, fileId: f.fileId })),
        searchTerm,
        8 // Show more suggestions for better UX
      );

      setFileSuggestions(suggestions);
      setShowFileSuggestions(suggestions.length > 0);
      setSelectedFileIndex(0);
    } else {
      setShowFileSuggestions(false);
    }
  };

  /**
   * Handle file selection from suggestions
   */
  const selectFile = (file) => {
    if (!file || !file.filePath) {
      console.warn('[AIChatPanel] Invalid file object:', file);
      setShowFileSuggestions(false);
      return;
    }
    
    if (!textareaRef.current) {
      console.warn('[AIChatPanel] Textarea ref not available');
      setShowFileSuggestions(false);
      return;
    }
    
    const cursorPos = textareaRef.current.selectionStart || 0;
    const textBeforeCursor = message.substring(0, cursorPos);
    const textAfterCursor = message.substring(cursorPos);
    // Match @ followed by word characters, slashes, dots, dashes, underscores (same as handleInputChange)
    const atMatch = textBeforeCursor.match(/@([\w/.\-_]*)$/);

    if (atMatch) {
      const beforeAt = textBeforeCursor.substring(0, textBeforeCursor.length - atMatch[0].length);
      const newMessage = `${beforeAt}@${file.filePath} ${textAfterCursor}`;
      setMessage(newMessage);

      // Update cursor position after the inserted file path and space
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = beforeAt.length + 1 + file.filePath.length + 1;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      }, 0);

      // Track tagged file - ensure we have the full file object from files array
      const fullFile = files.find(f => f.filePath === file.filePath);
      if (fullFile && !taggedFiles.find(f => f.filePath === file.filePath)) {
        setTaggedFiles([...taggedFiles, fullFile]);
      }
    } else {
      console.warn('[AIChatPanel] No @ match found in text before cursor:', textBeforeCursor);
    }

    setShowFileSuggestions(false);
  };

  /**
   * Handle keyboard navigation for file suggestions
   */
  const handleKeyDown = (e) => {
    if (showFileSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedFileIndex((selectedFileIndex + 1) % fileSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedFileIndex((selectedFileIndex - 1 + fileSuggestions.length) % fileSuggestions.length);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        selectFile(fileSuggestions[selectedFileIndex]);
      } else if (e.key === 'Escape') {
        setShowFileSuggestions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Send message in instant mode with AI edit API
   */
  const handleInstantMode = async (userMessage) => {
    try {
      setInstantLoading(true);
      setInstantError(null);

      // Build AI edit request
      const request = {
        projectId,
        message: userMessage,
        sessionId,
      };

      // Add file context if user tagged a specific file
      if (taggedFiles.length > 0) {
        const primaryFile = taggedFiles[0];
        request.fileContext = {
          filePath: primaryFile.filePath,
          content: fileContents[primaryFile.filePath],
        };
      }

      console.log('[AI Chat] Sending AI edit request:', JSON.stringify(request, null, 2));

      // Call AI edit API
      const response = await getAIEdits(request);
      console.log('[AI Chat] Received response:', response);

      // Save session ID for conversation continuity
      setSessionId(response.sessionId);

      // Add to conversation history in combined format
      setConversationHistory(prev => [
        ...prev,
        {
          userContent: userMessage,
          assistantContent: response.explanation,
          edits: response.edits || [],
          summary: response.summary || {
            totalEdits: 0,
            creates: 0,
            replaces: 0,
            inserts: 0,
            deletes: 0,
            affectedFiles: []
          },
          contextChunks: response.contextChunks || [],
          timestamp: Date.now()
        }
      ]);

      setInstantResponse(response);
      console.log('[AI Chat] AI edit response received:', response);

    } catch (err) {
      console.error('[AI Chat] AI edit failed:', err);
      setInstantError(err.message || 'Failed to get AI suggestions');
    } finally {
      setInstantLoading(false);
    }
  };

  /**
   * Send message in selected mode
   */
  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    const userMessage = message; // Capture message before clearing
    setIsProcessing(true);

    try {
      // Step 1: Merkle sync first (sync any local changes to backend)
      await performMerkleSync();

      // Step 2: Send AI request based on mode
      if (mode === 'instant') {
        await handleInstantMode(userMessage);
      } else {
        // Progressive mode - start background task
        console.log('[AI Chat] Starting progressive task:', userMessage);
        const taskId = await startTask(userMessage, sessionId);
        console.log('[AI Chat] Progressive task started:', taskId);
      }

      setMessage('');
      setTaggedFiles([]);
    } catch (error) {
      console.error('[AI Chat] Error:', error);
      if (mode === 'instant') {
        setInstantError(error.message || 'Request failed');
      } else {
        // For progressive mode, error is handled by the hook
        // But we can show a toast or alert here if needed
        alert(`Progressive task failed: ${error.message || 'Request failed'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = isProcessing || isSyncing || instantLoading || progressiveRunning;

  return (
    <div className="flex h-full">
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className="w-1 bg-[#1e293b] hover:bg-blue-500 cursor-ew-resize transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />

      {/* Main Panel */}
      <div
        className="flex flex-col h-full bg-[#0a0e1a] border-l border-[#1e293b]"
        style={{ width: `${panelWidth}px` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1e293b] bg-[#0a0e1a]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-purple-600/10 rounded-lg">
              <MessageSquare size={18} className="text-purple-400" />
            </div>
            <h3 className="font-semibold text-base text-gray-100 font-['ClashDisplay-Variable']">
              AI Assistant
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* New Session Button */}
            <button
              onClick={handleNewSession}
              className="p-2 hover:bg-[#1e293b] rounded-lg transition-all hover:scale-105"
              title="New Session"
            >
              <Plus size={16} className="text-blue-400" />
            </button>

            {/* Session History Button */}
            <button
              onClick={() => setShowSessionList(!showSessionList)}
              className={`p-2 rounded-lg transition-all hover:scale-105 ${
                showSessionList
                  ? 'bg-[#1e293b] text-gray-200'
                  : 'hover:bg-[#1e293b] text-gray-400'
              }`}
              title="Session History"
            >
              <History size={16} />
            </button>

            {/* Save Button (Manual Merkle Sync) */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className={`p-2 rounded-lg transition-all hover:scale-105 ${
                syncSuccess
                  ? 'bg-green-900/30 text-green-400'
                  : isSyncing
                  ? 'bg-[#1e293b] text-gray-400'
                  : 'hover:bg-[#1e293b] text-gray-400 hover:text-gray-200'
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

            <div className="h-6 w-px bg-[#1e293b]"></div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1e293b] rounded-lg transition-all hover:scale-105"
              title="Close"
            >
              <X size={16} className="text-gray-400 hover:text-gray-200" />
            </button>
          </div>
        </div>

        {/* Session List */}
        {showSessionList && (
          <div className="border-b border-[#1e293b] bg-[#020617] max-h-64 overflow-y-auto">
            {loadingSessions ? (
              <div className="p-4 text-center">
                <Loader size={16} className="animate-spin mx-auto text-gray-500" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 font-['DM_Sans']">
                No previous sessions
              </div>
            ) : (
              <div className="divide-y divide-[#1e293b]">
                {sessions.map((session) => (
                  <button
                    key={session.sessionId}
                    onClick={() => handleSelectSession(session)}
                    className={`w-full text-left p-3 hover:bg-[#1e293b] transition-all font-['DM_Sans'] ${
                      sessionId === session.sessionId
                        ? 'bg-[#1e293b] border-l-2 border-blue-500'
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
                      <MessageSquare size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sync Status */}
        {isSyncing && (
          <div className="px-4 py-2.5 bg-[#1e293b]/50 border-b border-[#1e293b]">
            <div className="flex items-center gap-2 text-xs text-blue-400 font-['DM_Sans']">
              <RefreshCw size={14} className="animate-spin" />
              <span>Syncing changes with backend...</span>
            </div>
          </div>
        )}

        {/* Tagged Files Preview */}
        {taggedFiles.length > 0 && (
          <div className="px-4 py-2.5 bg-[#1e293b]/30 border-b border-[#1e293b]">
            <div className="text-xs text-gray-400 mb-1.5 font-['DM_Sans'] font-medium">Tagged Files:</div>
            <div className="flex flex-wrap gap-1.5">
              {taggedFiles.map((file) => (
                <div
                  key={file.filePath}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#020617] border border-[#1e293b] rounded-md text-xs text-gray-300 font-['DM_Sans']"
                >
                  <FileText size={12} className="text-blue-400" />
                  <span>{file.filePath}</span>
                  <button
                    onClick={() => setTaggedFiles(taggedFiles.filter(f => f.filePath !== file.filePath))}
                    className="ml-1 hover:text-red-400 text-gray-500 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
        {mode === 'instant' ? (
          <InstantEditView
            response={instantResponse}
            conversationHistory={conversationHistory}
            isLoading={instantLoading || loadingHistory}
            error={instantError}
            projectId={projectId}
            fileContents={fileContents}
            onShowDiffInEditor={onShowDiffInEditor}
            onFilesChange={(updatedContents, changedFilePath) => {
              // Call parent's onFilesChange to update file contents and mark as unsaved
              onFilesChange(updatedContents, changedFilePath);
            }}
            onFileCreate={(filePath, content) => {
              // Call parent's file creation handler
              if (onFilesChange) {
                const updatedContents = {
                  ...fileContents,
                  [filePath]: content
                };
                onFilesChange(updatedContents, filePath);
              }
            }}
          />
        ) : (
          <ProgressiveEditView
            taskStatus={taskStatus}
            isRunning={progressiveRunning}
            error={progressiveError}
            onCancel={cancelCurrentTask}
            projectId={projectId}
            fileContents={fileContents}
            onFilesChange={onFilesChange}
            onFileCreate={(filePath, content) => {
              // Call parent's file creation handler
              if (onFilesChange) {
                const updatedContents = {
                  ...fileContents,
                  [filePath]: content
                };
                onFilesChange(updatedContents, filePath);
              }
            }}
          />
        )}
      </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[#1e293b] bg-[#0a0e1a] relative">
          {/* File Suggestions Dropdown */}
          {showFileSuggestions && fileSuggestions.length > 0 && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#0a0e1a] border border-[#1e293b] rounded-lg shadow-2xl max-h-40 overflow-y-auto z-50">
              {fileSuggestions.map((file, index) => {
                if (!file || !file.filePath) return null;
                
                return (
                  <button
                    key={`${file.filePath}-${index}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      selectFile(file);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[#1e293b] flex items-center gap-2 text-gray-300 font-['DM_Sans'] transition-all ${
                      index === selectedFileIndex ? 'bg-[#1e293b]' : ''
                    }`}
                    type="button"
                  >
                    <FileText size={14} className="text-blue-400" />
                    <span className="truncate">{file.filePath}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Mode Dropdown */}
          {showModeDropdown && (
            <div className="absolute bottom-full left-4 mb-2 bg-[#0a0e1a] border border-[#1e293b] rounded-lg shadow-2xl z-50 w-52">
              <button
                onClick={() => {
                  setMode('instant');
                  setShowModeDropdown(false);
                }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-[#1e293b] flex items-center gap-2 font-['DM_Sans'] transition-all ${
                  mode === 'instant' ? 'bg-[#1e293b] text-gray-200' : 'text-gray-400'
                }`}
              >
                <Zap size={14} className="text-blue-400" />
                <span>Instant Edit Mode</span>
              </button>
              <button
                onClick={() => {
                  setMode('progressive');
                  setShowModeDropdown(false);
                }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-[#1e293b] flex items-center gap-2 font-['DM_Sans'] transition-all ${
                  mode === 'progressive' ? 'bg-[#1e293b] text-gray-200' : 'text-gray-400'
                }`}
              >
                <ListTodo size={14} className="text-purple-400" />
                <span>Progressive Mode</span>
              </button>
            </div>
          )}

          {/* Input Box with Buttons Inside */}
          <div className="relative flex items-end bg-[#020617] border border-[#1e293b] rounded-lg focus-within:border-blue-500 transition-all shadow-lg">
            {/* Mode Selector Button - Inside Input */}
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="flex-shrink-0 p-2.5 hover:bg-[#1e293b] rounded-l-lg flex items-center gap-1 transition-all text-gray-400 hover:text-gray-200"
              title="Select Mode"
            >
              {mode === 'instant' ? <Zap size={16} className="text-blue-400" /> : <ListTodo size={16} className="text-purple-400" />}
              <ChevronDown size={12} />
            </button>

            {/* Auto-expanding Textarea */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'instant'
                  ? 'Type @ to tag files...'
                  : 'Describe feature...'
              }
              className="flex-1 bg-transparent px-3 py-2.5 text-sm resize-none focus:outline-none text-gray-200 placeholder-gray-500 min-h-[40px] max-h-[200px] overflow-y-auto font-['DM_Sans']"
              style={{
                height: 'auto',
                minHeight: '40px',
                maxHeight: '200px'
              }}
              disabled={isLoading}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
            />

            {/* Send Button - Inside Input */}
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="flex-shrink-0 p-2.5 hover:bg-[#1e293b] disabled:opacity-50 disabled:cursor-not-allowed rounded-r-lg flex items-center justify-center transition-all text-blue-400 hover:text-blue-300 hover:scale-105"
              title="Send"
            >
              {isLoading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;
