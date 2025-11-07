/**
 * Unified AI Chat Panel with Two Modes
 * 1. Instant Edit Mode - Merkle sync first, then AI edits with file tagging
 * 2. Progressive Mode - Real-time TODO tracking
 */

import { useState, useEffect, useRef } from 'react';
import { Send, X, Loader, Zap, ListTodo, AlertCircle, RefreshCw, FileText, AtSign, History, MessageSquare, Plus, ChevronDown } from 'lucide-react';
import { useProgressiveEdit } from '../hooks/useProgressiveEdit';
import InstantEditView from './InstantEditView';
import ProgressiveEditView from './ProgressiveEditView';
import { getAIEdits, getChatSessions, getChatMessages } from '../api/aiEdit';
import { syncWithMerkleTree } from '../api/files';
import { MerkleHasher } from '../services/merkle';

const AIChatPanel = ({ projectId, files, fileContents, onClose, onFilesChange }) => {
  const [mode, setMode] = useState('instant'); // 'instant' or 'progressive'
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sessionId, setSessionId] = useState(null);

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
      console.log('[AI Chat] 🌳 Starting Merkle sync before AI request...');

      const merkleHasher = new MerkleHasher();

      // Build file list from local state
      const fileList = [];
      for (const [path, content] of Object.entries(fileContents)) {
        fileList.push({
          path,
          content,
          lastModified: Date.now()
        });
      }

      console.log(`[AI Chat] 🌳 Building Merkle tree from ${fileList.length} files...`);

      // Build Merkle tree
      const merkleTree = await merkleHasher.buildTreeFromFileSystem(fileList);
      console.log(`[AI Chat] 🌳 Merkle tree built: ${merkleTree.countFiles()} files, hash: ${merkleTree.hash.substring(0, 16)}`);

      // Step 1: Send Merkle tree to get list of changed files
      const compareResult = await syncWithMerkleTree(projectId, merkleTree.toJSON(), null);

      if (compareResult.needsFiles && compareResult.needsFiles.length > 0) {
        console.log(`[AI Chat] 📤 Sending content for ${compareResult.needsFiles.length} changed files...`);

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
   * Detect @ mentions for file tagging
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Check if user is typing @ for file mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      const searchTerm = atMatch[1].toLowerCase();
      const suggestions = files
        .filter(f => f.filePath.toLowerCase().includes(searchTerm))
        .slice(0, 5);

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
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = message.substring(0, cursorPos);
    const textAfterCursor = message.substring(cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      const beforeAt = textBeforeCursor.substring(0, textBeforeCursor.length - atMatch[0].length);
      const newMessage = `${beforeAt}@${file.filePath} ${textAfterCursor}`;
      setMessage(newMessage);

      // Track tagged file
      if (!taggedFiles.find(f => f.filePath === file.filePath)) {
        setTaggedFiles([...taggedFiles, file]);
      }
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
        await startTask(userMessage);
      }

      setMessage('');
      setTaggedFiles([]);
    } catch (error) {
      console.error('[AI Chat] Error:', error);
      if (mode === 'instant') {
        setInstantError(error.message || 'Request failed');
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
              AI Assistant
            </h3>
          </div>

          <div className="flex items-center gap-1">
            {/* New Session Button */}
            <button
              onClick={handleNewSession}
              className="p-1.5 hover:bg-[#2d2d2d] rounded transition-colors"
              title="New Session"
            >
              <Plus size={16} className="text-gray-400 hover:text-gray-200" />
            </button>

            {/* Session History Button */}
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

        {/* Tagged Files Preview */}
        {taggedFiles.length > 0 && (
          <div className="px-3 py-2 bg-[#252525] border-b border-[#2d2d2d]">
            <div className="text-xs text-gray-400 mb-1">Tagged Files:</div>
            <div className="flex flex-wrap gap-1">
              {taggedFiles.map((file) => (
                <div
                  key={file.filePath}
                  className="flex items-center gap-1 px-2 py-0.5 bg-[#1e1e1e] border border-[#3d3d3d] rounded text-xs text-gray-300"
                >
                  <FileText size={12} />
                  <span>{file.filePath}</span>
                  <button
                    onClick={() => setTaggedFiles(taggedFiles.filter(f => f.filePath !== file.filePath))}
                    className="ml-1 hover:text-red-400 text-gray-500"
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
            onFilesChange={onFilesChange}
          />
        )}
      </div>

        {/* Input Area */}
        <div className="p-3 border-t border-[#2d2d2d] bg-[#1e1e1e] relative">
          {/* File Suggestions Dropdown */}
          {showFileSuggestions && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-[#252525] border border-[#3d3d3d] rounded shadow-lg max-h-40 overflow-y-auto z-50">
              {fileSuggestions.map((file, index) => (
                <button
                  key={file.filePath}
                  onClick={() => selectFile(file)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-[#2d2d2d] flex items-center gap-2 text-gray-300 ${
                    index === selectedFileIndex ? 'bg-[#2d2d2d]' : ''
                  }`}
                >
                  <FileText size={14} className="text-gray-500" />
                  <span>{file.filePath}</span>
                </button>
              ))}
            </div>
          )}

          {/* Mode Dropdown */}
          {showModeDropdown && (
            <div className="absolute bottom-full left-3 mb-1 bg-[#252525] border border-[#3d3d3d] rounded shadow-lg z-50 w-48">
              <button
                onClick={() => {
                  setMode('instant');
                  setShowModeDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-[#2d2d2d] flex items-center gap-2 ${
                  mode === 'instant' ? 'bg-[#2d2d2d] text-gray-200' : 'text-gray-400'
                }`}
              >
                <Zap size={14} />
                <span>Instant Edit Mode</span>
              </button>
              <button
                onClick={() => {
                  setMode('progressive');
                  setShowModeDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-[#2d2d2d] flex items-center gap-2 ${
                  mode === 'progressive' ? 'bg-[#2d2d2d] text-gray-200' : 'text-gray-400'
                }`}
              >
                <ListTodo size={14} />
                <span>Progressive Mode</span>
              </button>
            </div>
          )}

          {/* Input Box with Buttons Inside */}
          <div className="relative flex items-end bg-[#252525] border border-[#3d3d3d] rounded focus-within:border-[#4d4d4d] transition-colors">
            {/* Mode Selector Button - Inside Input */}
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="flex-shrink-0 p-2 hover:bg-[#2d2d2d] rounded-l flex items-center gap-1 transition-colors text-gray-400 hover:text-gray-200"
              title="Select Mode"
            >
              {mode === 'instant' ? <Zap size={16} /> : <ListTodo size={16} />}
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
              className="flex-1 bg-transparent px-3 py-2 text-sm resize-none focus:outline-none text-gray-200 placeholder-gray-500 min-h-[36px] max-h-[200px] overflow-y-auto"
              style={{
                height: 'auto',
                minHeight: '36px',
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
              className="flex-shrink-0 p-2 hover:bg-[#2d2d2d] disabled:opacity-50 disabled:cursor-not-allowed rounded-r flex items-center justify-center transition-colors text-gray-400 hover:text-gray-200"
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
