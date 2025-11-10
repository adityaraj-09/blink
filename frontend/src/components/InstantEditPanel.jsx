/**
 * Instant Edit Panel - Chat interface for instant AI edits
 */

import { useState, useEffect, useRef } from 'react';
import { Send, X, Loader, Save, RefreshCw, FileText, AtSign, History, MessageSquare, Plus } from 'lucide-react';
import InstantEditView from './InstantEditView';
import { getAIEdits, getChatSessions, getChatMessages } from '../api/aiEdit';
import { syncWithMerkleTree } from '../api/files';
import { MerkleHasher } from '../services/merkle';

const InstantEditPanel = ({ projectId, files: initialFiles, fileContents, onClose, onFilesChange }) => {
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
      console.error('[Instant Edit] Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  /**
   * Load conversation history when sessionId changes
   */
  useEffect(() => {
    const loadHistory = async () => {
      if (!sessionId) return;

      try {
        setLoadingHistory(true);
        const { messages } = await getChatMessages(sessionId);

        const history = messages.map((msg) => ({
          userMessage: msg.userMessage,
          aiResponse: msg.metadata?.aiResponse || null,
        }));

        setConversationHistory(history);
      } catch (err) {
        console.error('[Instant Edit] Failed to load history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [sessionId]);

  /**
   * Perform Merkle sync
   */
  const performMerkleSync = async () => {
    try {
      setIsSyncing(true);

      const fileList = [];
      for (const [path, content] of Object.entries(fileContents)) {
        fileList.push({
          path,
          content,
          lastModified: Date.now()
        });
      }

      if (fileList.length === 0) {
        console.log('[Instant Edit] ⏭️  Skipping Merkle sync - no files present');
        return true;
      }

      console.log('[Instant Edit] 🌳 Starting Merkle sync...');

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
        console.log('[Instant Edit] ✓ Sync complete');
      }

      return true;
    } catch (err) {
      console.error('[Instant Edit] Merkle sync failed:', err);
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
      console.error('[Instant Edit] Manual sync failed:', err);
    }
  };

  /**
   * File tagging with @ mentions
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    const cursorPos = e.target.selectionStart;
    const textUpToCursor = value.slice(0, cursorPos);
    const lastAtIndex = textUpToCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const searchTerm = textUpToCursor.slice(lastAtIndex + 1);

      if (searchTerm.length === 0) {
        setFileSuggestions(files.slice(0, 10));
        setShowFileSuggestions(true);
        setSelectedFileIndex(0);
      } else {
        const filtered = files.filter((file) =>
          file.filePath.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 10);

        if (filtered.length > 0) {
          setFileSuggestions(filtered);
          setShowFileSuggestions(true);
          setSelectedFileIndex(0);
        } else {
          setShowFileSuggestions(false);
        }
      }
    } else {
      setShowFileSuggestions(false);
    }
  };

  const selectFile = (file) => {
    const cursorPos = textareaRef.current.selectionStart;
    const textUpToCursor = message.slice(0, cursorPos);
    const lastAtIndex = textUpToCursor.lastIndexOf('@');
    const beforeAt = message.slice(0, lastAtIndex);
    const afterCursor = message.slice(cursorPos);

    setMessage(beforeAt + afterCursor);
    setShowFileSuggestions(false);

    if (!taggedFiles.find(f => f.filePath === file.filePath)) {
      setTaggedFiles([...taggedFiles, file]);
    }

    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e) => {
    if (showFileSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedFileIndex((prev) =>
          prev < fileSuggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedFileIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter' && fileSuggestions.length > 0) {
        e.preventDefault();
        selectFile(fileSuggestions[selectedFileIndex]);
        return;
      } else if (e.key === 'Escape') {
        setShowFileSuggestions(false);
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !showFileSuggestions) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Send instant edit message
   */
  const handleSendMessage = async () => {
    if (!message.trim() || instantLoading) return;

    const userMessage = message.trim();
    setMessage('');

    try {
      setInstantLoading(true);
      setInstantError(null);
      setInstantResponse(null);

      // Merkle sync first
      await performMerkleSync();

      console.log('[Instant Edit] 🤖 Sending to AI:', userMessage);

      const payload = {
        projectId,
        message: userMessage,
        ...(sessionId ? { sessionId } : {}),
        ...(taggedFiles.length > 0 ? { taggedFiles: taggedFiles.map(f => f.filePath) } : {}),
      };

      const response = await getAIEdits(payload);

      setInstantResponse(response);
      setSessionId(response.sessionId);
      setTaggedFiles([]);

      // Update conversation history
      setConversationHistory([
        ...conversationHistory,
        { userMessage, aiResponse: response }
      ]);

      await loadAllSessions();
    } catch (err) {
      console.error('[Instant Edit] Request failed:', err);
      setInstantError(err);
    } finally {
      setInstantLoading(false);
    }
  };

  const handleNewSession = () => {
    setSessionId(null);
    setConversationHistory([]);
    setInstantResponse(null);
    setInstantError(null);
    setMessage('');
    setTaggedFiles([]);
  };

  const handleSelectSession = (session) => {
    setSessionId(session.sessionId);
    setShowSessionList(false);
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
              Instant Edit
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
          <InstantEditView
            response={instantResponse}
            conversationHistory={conversationHistory}
            isLoading={instantLoading || loadingHistory}
            error={instantError}
            projectId={projectId}
            fileContents={fileContents}
            onFilesChange={onFilesChange}
            onFileCreate={(filePath, content) => {
              if (onFilesChange) {
                const updatedContents = {
                  ...fileContents,
                  [filePath]: content
                };
                onFilesChange(updatedContents, filePath);
              }
            }}
          />
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

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type @ to mention files, then describe your changes..."
                className="w-full bg-[#252525] text-gray-200 px-3 py-2 pr-10 rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-600"
                rows={3}
                disabled={instantLoading || isSyncing}
              />
              <AtSign size={16} className="absolute right-3 top-2.5 text-gray-500" />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || instantLoading || isSyncing}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded text-sm font-medium transition-colors self-start flex items-center gap-2"
            >
              {instantLoading || isSyncing ? (
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

export default InstantEditPanel;
