/**
 * Instant Edit View
 * Shows all suggested edits at once with diff preview
 */

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Eye, Code, Copy, Check, AlertTriangle, ChevronDown, ChevronUp, User, Bot } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CodeMirrorDiffViewer from './CodeMirrorDiffViewer';
import { locateEdit } from '../utils/fuzzyMatch';

/**
 * Detect language from file extension
 */
const getLanguageFromFile = (filePath) => {
  const ext = filePath.split('.').pop().toLowerCase();
  const languageMap = {
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',
    'py': 'python',
    'rb': 'ruby',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'r': 'r',
    'sql': 'sql',
    'html': 'markup',
    'xml': 'markup',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sh': 'bash',
    'bash': 'bash',
  };
  return languageMap[ext] || 'javascript';
};

const InstantEditView = ({ response, conversationHistory, isLoading, error, projectId, fileContents, onFilesChange, onFileCreate, onShowDiffInEditor }) => {
  const [selectedEdit, setSelectedEdit] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [showDiffViewer, setShowDiffViewer] = useState(false); // Show professional diff viewer
  const [currentMessageEdits, setCurrentMessageEdits] = useState([]); // Edits for diff viewer
  const [appliedEdits, setAppliedEdits] = useState(new Set());
  const [applyingEdit, setApplyingEdit] = useState(null);
  const [expandedEdits, setExpandedEdits] = useState(new Set()); // Track which code blocks are expanded
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">AI is analyzing your request...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="max-w-md p-4 bg-[#252525] border border-red-900/50 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertTriangle size={18} />
            <span className="font-semibold">Error</span>
          </div>
          <p className="text-sm text-gray-300">{error.message}</p>
        </div>
      </div>
    );
  }

  // Show conversation history if available, even without current response
  if (!response && conversationHistory.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <div className="w-16 h-16 bg-[#252525] rounded-full flex items-center justify-center mx-auto mb-3">
            <Code size={32} className="text-gray-400" />
          </div>
          <h3 className="font-semibold mb-2 text-gray-200">Ready for Instant Edits</h3>
          <p className="text-sm text-gray-400 max-w-xs">
            Describe what you want to change and I'll suggest all edits at once for your review.
          </p>
        </div>
      </div>
    );
  }

  /**
   * Apply edit locally in frontend (no backend call)
   */
  const handleApplyEdit = (edit, index) => {
    setApplyingEdit(`${edit.file}-${index}`);

    try {
      // Get current file content
      let currentContent = fileContents[edit.file] || '';

      // Apply the edit based on action
      let newContent = '';

      if (edit.action === 'create') {
        // Create new file with newCode
        newContent = edit.newCode || '';

        // Notify parent to create file with folder structure
        if (onFileCreate) {
          onFileCreate(edit.file, newContent);
        }
      } else if (edit.action === 'replace') {
        newContent = applyReplace(currentContent, edit);
      } else if (edit.action === 'insert') {
        newContent = applyInsert(currentContent, edit);
      } else if (edit.action === 'delete') {
        newContent = applyDelete(currentContent, edit);
      } else {
        throw new Error(`Unknown action: ${edit.action}`);
      }

      // Update file contents in parent component
      const updatedContents = {
        ...fileContents,
        [edit.file]: newContent
      };

      // Notify parent to update file contents
      if (onFilesChange) {
        onFilesChange(updatedContents, edit.file); // Pass file path to mark as unsaved
      }

      // Mark as applied using unique identifier (file + index)
      const editKey = `${edit.file}-${index}`;
      setAppliedEdits((prev) => new Set([...prev, editKey]));
      console.log('[InstantEditView] Edit applied successfully:', editKey);

    } catch (err) {
      console.error('[InstantEditView] Failed to apply edit:', err);
      alert(`Failed to apply edit: ${err.message}`);
    } finally {
      setApplyingEdit(null);
    }
  };

  /**
   * Apply replace action locally
   */
  const applyReplace = (content, edit) => {
    if (!edit.newCode) {
      throw new Error('New code is required for replace action');
    }

    // Try fuzzy match first if oldCode is provided
    if (edit.oldCode) {
      const match = locateEdit(content, edit.oldCode, edit.startLine);
      if (match.matchType !== 'not_found') {
        console.log(`[InstantEdit] Applied replace using ${match.matchType} match (confidence: ${match.confidence})`);
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
      return [...before, edit.newCode, ...after].join('\n');
    }

    throw new Error('Replace action requires valid oldCode matching or line numbers');
  };

  /**
   * Apply insert action locally
   */
  const applyInsert = (content, edit) => {
    if (!edit.newCode) {
      throw new Error('New code is required for insert action');
    }

    if (!content) {
      return edit.newCode;
    }

    // If we have a specific insertion point context (not just line numbers), we could fuzzy match here too
    // But insert usually relies on line numbers or "after line".
    // Current implementation relies on line numbers which is standard for "insert after".

    const lines = content.split('\n');

    // Support startLine (insert at line) or afterLine (insert after line)
    if (edit.startLine !== undefined) {
      const insertIndex = edit.startLine - 1;
      const before = lines.slice(0, insertIndex);
      const after = lines.slice(insertIndex);
      return [...before, edit.newCode, ...after].join('\n');
    } else if (edit.afterLine !== undefined) {
      const before = lines.slice(0, edit.afterLine);
      const after = lines.slice(edit.afterLine);
      return [...before, edit.newCode, ...after].join('\n');
    }

    return content + '\n' + edit.newCode;
  };

  /**
   * Apply delete action locally
   */
  const applyDelete = (content, edit) => {
    // Try fuzzy match first if oldCode is provided
    if (edit.oldCode) {
      const match = locateEdit(content, edit.oldCode, edit.startLine);
      if (match.matchType !== 'not_found') {
        console.log(`[InstantEdit] Applied delete using ${match.matchType} match`);
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

    throw new Error('Delete action requires valid oldCode matching or line numbers');
  };

  const handlePreviewEdit = (edit) => {
    setSelectedEdit(edit);
    setShowDiff(true);
  };

  /**
   * Show all edits for a message in the professional diff viewer
   */
  const handleShowDiffViewer = (edits, messageIndex) => {
    setCurrentMessageEdits(edits);
    setShowDiffViewer(true);
  };

  /**
   * Handle accepting an edit from the diff viewer
   */
  const handleAcceptEditFromViewer = (editIndex) => {
    const edit = currentMessageEdits[editIndex];
    handleApplyEdit(edit, editIndex);
  };

  /**
   * Handle rejecting an edit from the diff viewer
   */
  const handleRejectEditFromViewer = (editIndex) => {
    // Just close the diff viewer or mark as rejected
    console.log('Rejected edit:', editIndex);
  };

  /**
   * Handle accepting all edits from the diff viewer
   */
  const handleAcceptAllFromViewer = () => {
    currentMessageEdits.forEach((edit, index) => {
      handleApplyEdit(edit, index);
    });
    setShowDiffViewer(false);
  };

  /**
   * Handle rejecting all edits from the diff viewer
   */
  const handleRejectAllFromViewer = () => {
    setShowDiffViewer(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Conversation History */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        <div className="space-y-4 max-w-full">
          {conversationHistory.map((msg, index) => (
            <ConversationMessage
              key={index}
              messageIndex={index}
              userContent={msg.userContent}
              assistantContent={msg.assistantContent}
              edits={msg.edits}
              summary={msg.summary}
              contextChunks={msg.contextChunks}
              appliedEdits={appliedEdits}
              applyingEdit={applyingEdit}
              onPreview={handlePreviewEdit}
              onApply={handleApplyEdit}
              onShowDiffInEditor={onShowDiffInEditor}
              onShowDiffViewer={() => handleShowDiffViewer(msg.edits, index)}
              expandedEdits={expandedEdits}
              setExpandedEdits={setExpandedEdits}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Diff Modal (Legacy) */}
      {showDiff && selectedEdit && (
        <DiffModal
          edit={selectedEdit}
          onClose={() => {
            setShowDiff(false);
            setSelectedEdit(null);
          }}
          onApply={() => {
            // Find the index of the selected edit
            const allEdits = conversationHistory.flatMap(msg => msg.edits || []);
            const editIndex = allEdits.findIndex(e => e === selectedEdit);
            handleApplyEdit(selectedEdit, editIndex);
            setShowDiff(false);
            setSelectedEdit(null);
          }}
        />
      )}

      {/* Professional Diff Viewer */}
      {showDiffViewer && currentMessageEdits.length > 0 && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg w-full max-w-7xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2d2d2d]">
              <div>
                <h3 className="font-semibold mb-1 text-gray-200">Professional Diff Viewer</h3>
                <p className="text-xs text-gray-500">
                  Review and apply changes with CodeMirror v6
                </p>
              </div>
              <button
                onClick={() => setShowDiffViewer(false)}
                className="p-2 hover:bg-[#2d2d2d] rounded transition-colors text-gray-400 hover:text-gray-200"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Diff Viewer */}
            <div className="flex-1 overflow-hidden">
              <CodeMirrorDiffViewer
                edits={currentMessageEdits}
                onAcceptEdit={handleAcceptEditFromViewer}
                onRejectEdit={handleRejectEditFromViewer}
                onAcceptAll={handleAcceptAllFromViewer}
                onRejectAll={handleRejectAllFromViewer}
                fileContents={fileContents}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Conversation Message Component
 * Combines user and assistant messages while keeping the same UI
 */
const ConversationMessage = ({ userContent, assistantContent, edits, summary, contextChunks, appliedEdits, applyingEdit, onPreview, onApply, onShowDiffInEditor, expandedEdits, setExpandedEdits, messageIndex = 0, onShowDiffViewer }) => {
  const hasEdits = edits && edits.length > 0;
  const hasContext = contextChunks && contextChunks.length > 0;

  return (
    <div className="space-y-2">
      {/* User Message */}
      <div className="flex items-start gap-2 max-w-full">
        <div className="flex-shrink-0 w-6 h-6 bg-[#2d2d2d] rounded-full flex items-center justify-center mt-1">
          <User size={14} className="text-gray-400" />
        </div>
        <div className="flex-1 min-w-0 bg-[#252525] border border-[#3d3d3d] rounded-lg p-3 overflow-hidden">
          <div className="text-sm text-gray-200 whitespace-pre-wrap break-words">{userContent}</div>
        </div>
      </div>

      {/* Assistant Message */}
      <div className="flex items-start gap-2 max-w-full">
        <div className="flex-shrink-0 w-6 h-6 bg-[#2d2d2d] rounded-full flex items-center justify-center mt-1">
          <Bot size={14} className="text-gray-400" />
        </div>
        <div className="flex-1 min-w-0 space-y-2 overflow-hidden">
          {/* Explanation Text */}
          <div className="bg-[#252525] border border-[#3d3d3d] rounded-lg p-3 overflow-hidden">
            <div className="text-sm text-gray-200 whitespace-pre-wrap break-words">
              {formatAssistantMessage(assistantContent)}
            </div>

            {/* Context Chunks Info */}
            {hasContext && (
              <div className="mt-2 pt-2 border-t border-[#3d3d3d]">
                <div className="text-xs text-gray-400 mb-1">
                  📚 Used {contextChunks.length} code context{contextChunks.length > 1 ? 's' : ''}
                </div>
                <div className="text-xs text-gray-500">
                  {contextChunks.slice(0, 3).map((chunk, i) => (
                    <div key={i} className="truncate">
                      • {chunk.filePath}:{chunk.startLine}-{chunk.endLine} ({chunk.chunkType})
                    </div>
                  ))}
                  {contextChunks.length > 3 && (
                    <div className="text-gray-400">+ {contextChunks.length - 3} more</div>
                  )}
                </div>
              </div>
            )}
          </div>

        {/* Edit Summary */}
        {hasEdits && summary && (
          <div className="bg-[#252525] border border-[#3d3d3d] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-300">Suggested Changes</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {edits.filter((e, i) => appliedEdits.has(`${e.file}-${i}`)).length}/{edits.length} applied
                </span>
                {onShowDiffViewer && (
                  <button
                    onClick={onShowDiffViewer}
                    className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded text-xs font-medium transition-colors flex items-center gap-1"
                    title="Open in Professional Diff Viewer"
                  >
                    <Code size={12} />
                    Review All
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
              <span>{summary.creates || 0} creates</span>
              <span>{summary.replaces || 0} replaces</span>
              <span>{summary.inserts || 0} inserts</span>
              <span>{summary.deletes || 0} deletes</span>
            </div>

            {summary.affectedFiles && summary.affectedFiles.length > 0 && (
              <div className="text-xs text-gray-500">
                Files: {summary.affectedFiles.slice(0, 3).join(', ')}
                {summary.affectedFiles.length > 3 &&
                  ` +${summary.affectedFiles.length - 3} more`}
              </div>
            )}
          </div>
        )}

        {/* Edit List */}
        {hasEdits && (
          <div className="space-y-2">
            {edits.map((edit, index) => {
              const editKey = `${edit.file}-${index}`;
              const isApplied = appliedEdits.has(editKey);
              const isApplying = applyingEdit === editKey;
              const isExpanded = expandedEdits.has(editKey);
              const toggleExpand = () => {
                setExpandedEdits(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(editKey)) {
                    newSet.delete(editKey);
                  } else {
                    newSet.add(editKey);
                  }
                  return newSet;
                });
              };

              return (
                <div
                  key={index}
                  className={`rounded-lg border transition-all overflow-hidden ${
                    isApplied
                      ? 'bg-[#1e3a1e] border-green-900/50'
                      : 'bg-[#252525] border-[#3d3d3d] hover:border-[#4d4d4d]'
                  }`}
                >
                  {/* Header with Action Tag and Buttons */}
                  <div className="flex items-center justify-between px-3 py-2 bg-[#1e1e1e] border-b border-[#2d2d2d]">
                    <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={toggleExpand}>
                      <span className={`text-xs font-semibold px-2 py-1 rounded flex-shrink-0 ${
                        edit.action === 'create' ? 'bg-[#0e639c] text-[#4fc3f7]' :
                        edit.action === 'replace' ? 'bg-[#7a4f0e] text-[#f7b84f]' :
                        edit.action === 'insert' ? 'bg-[#0e7a4f] text-[#4ff7b8]' :
                        'bg-[#7a0e4f] text-[#f74fb8]'
                      }`}>
                        {edit.action.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-300 truncate">{edit.file}</span>
                      {edit.startLine && edit.endLine && (
                        <span className="text-xs text-gray-500">
                          Lines {edit.startLine}-{edit.endLine}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand();
                        }}
                        className="ml-auto p-1 hover:bg-[#2d2d2d] rounded transition-colors"
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? (
                          <ChevronUp size={14} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={14} className="text-gray-400" />
                        )}
                      </button>
                    </div>

                    {/* Action Buttons in Header */}
                    <div className="flex items-center gap-1 ml-2">
                      {isApplied ? (
                        <div className="px-2 py-1 text-xs flex items-center gap-1 text-green-400">
                          <Check size={14} />
                          <span>Applied</span>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => onPreview(edit)}
                            className="p-1.5 hover:bg-[#2d2d2d] rounded transition-colors"
                            title="Preview diff"
                          >
                            <Eye size={14} className="text-gray-400 hover:text-gray-200" />
                          </button>
                          <button
                            onClick={() => {
                              // If onShowDiffInEditor is provided, show diff in main editor
                              // Otherwise, apply directly
                              if (onShowDiffInEditor) {
                                onShowDiffInEditor(edit, index);
                              } else {
                                onApply(edit, index);
                              }
                            }}
                            disabled={isApplying}
                            className="p-1.5 hover:bg-[#2d2d2d] disabled:bg-transparent disabled:cursor-not-allowed rounded transition-colors"
                            title={onShowDiffInEditor ? "Show diff in editor" : "Apply this edit"}
                          >
                            {isApplying ? (
                              <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckCircle size={14} className="text-gray-400 hover:text-gray-200" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Code Block with Fixed Height and Expand/Collapse */}
                  {edit.newCode && (
                    <div
                      className="overflow-hidden transition-all duration-300"
                      style={{
                        maxHeight: isExpanded ? 'none' : '300px'
                      }}
                    >
                      <div className={isExpanded ? '' : 'max-h-[300px] overflow-scroll relative'}>
                        <SyntaxHighlighter
                          language={getLanguageFromFile(edit.file)}
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            padding: '12px',
                            background: '#0e0e0e',
                            fontSize: '11px',
                            lineHeight: '1.5',
                            borderRadius: 0,
                          }}
                          showLineNumbers={true}
                          wrapLines={true}
                          lineNumberStyle={{
                            minWidth: '2.5em',
                            paddingRight: '1em',
                            color: '#5a5a5a',
                            userSelect: 'none'
                          }}
                        >
                          {edit.newCode}
                        </SyntaxHighlighter>
                        {!isExpanded && edit.newCode.split('\n').length > 15 && (
                          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0e0e0e] to-transparent pointer-events-none" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </div>
  );

  
};


const formatAssistantMessage = (content) => {
  if (!content) return 'No response';

  // First split by code blocks (preserve them)
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);

  return parts.map((part, index) => {
    // Multi-line code block
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).trim();
      return (
        <pre key={index} className="my-2 text-xs bg-[#0e0e0e] p-2 rounded overflow-x-auto border border-[#2d2d2d]">
          <code className="text-gray-400">{code}</code>
        </pre>
      );
    }
    // Inline code
    if (part.startsWith('`') && part.endsWith('`')) {
      const code = part.slice(1, -1);
      return (
        <code key={index} className="px-1.5 py-0.5 bg-[#2d2d2d] text-gray-300 rounded text-xs font-mono">
          {code}
        </code>
      );
    }
    // Regular text - parse bold formatting
    return <span key={index}>{parseBoldText(part)}</span>;
  });
};

/**
 * Parse bold text (**text**) and return formatted components
 */
const parseBoldText = (text) => {
  // Split by bold markers **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    // Check if this part is bold
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <span key={index} className="font-semibold text-yellow-300 bg-yellow-500/10 px-1 rounded">
          {boldText}
        </span>
      );
    }
    // Regular text
    return <span key={index}>{part}</span>;
  });
};

/**
 * Diff Modal Component
 */
const DiffModal = ({ edit, onClose, onApply }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2d2d2d]">
          <div>
            <h3 className="font-semibold mb-1 text-gray-200">Diff Preview</h3>
            <p className="text-xs text-gray-500">
              {edit.file} • {edit.action}
              {edit.startLine && ` • Lines ${edit.startLine}-${edit.endLine}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2d2d2d] rounded transition-colors text-gray-400 hover:text-gray-200"
          >
            <XCircle size={20} />
          </button>
        </div>

        {/* Diff View */}
        <div className="flex-1 overflow-hidden flex">
          {/* Before */}
          {edit.oldCode && (
            <div className="flex-1 border-r border-[#2d2d2d] flex flex-col">
              <div className="px-4 py-2 bg-[#2d1a1a] border-b border-[#2d2d2d] flex items-center justify-between">
                <span className="text-xs font-semibold text-red-400">Before</span>
                <button
                  onClick={() => copyToClipboard(edit.oldCode)}
                  className="p-1 hover:bg-[#3d3d3d] rounded transition-colors"
                  title="Copy"
                >
                  <Copy size={14} className="text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-[#1e1e1e]">
                <pre className="text-xs p-4">
                  <code className="text-gray-400">{edit.oldCode}</code>
                </pre>
              </div>
            </div>
          )}

          {/* After */}
          {edit.newCode && (
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-2 bg-[#1a2d1a] border-b border-[#2d2d2d] flex items-center justify-between">
                <span className="text-xs font-semibold text-green-400">After</span>
                <button
                  onClick={() => copyToClipboard(edit.newCode)}
                  className="p-1 hover:bg-[#3d3d3d] rounded transition-colors"
                  title="Copy"
                >
                  {copied ? (
                    <Check size={14} className="text-green-400" />
                  ) : (
                    <Copy size={14} className="text-gray-500" />
                  )}
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-[#1e1e1e]">
                <pre className="text-xs p-4">
                  <code className="text-gray-400">{edit.newCode}</code>
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2d2d2d] flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded font-medium transition-colors text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            className="flex-1 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded font-medium transition-colors flex items-center justify-center gap-2 text-gray-300"
          >
            <CheckCircle size={18} />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstantEditView;
