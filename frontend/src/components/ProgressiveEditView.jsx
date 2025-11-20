/**
 * Progressive Edit View
 * Shows real-time TODO progress with step-by-step execution
 */

import { useEffect, useRef, useState } from 'react';
import { Loader, CheckCircle, XCircle, Circle, AlertCircle, Copy, StopCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { locateEdit } from '../utils/fuzzyMatch';

const ProgressiveEditView = ({ taskStatus, isRunning, error, onCancel, projectId, fileContents, onFilesChange, onFileCreate }) => {
  // Track which todos have been applied
  const appliedTodosRef = useRef(new Set());

  // Track expanded TODOs
  const [expandedTodos, setExpandedTodos] = useState(new Set());

  /**
   * Auto-apply completed edits
   */
  useEffect(() => {
    if (!taskStatus || !taskStatus.todos || !onFilesChange) return;

    const completedTodos = taskStatus.todos.filter(
      todo => todo.status === 'completed' && todo.edits && todo.edits.length > 0 && !appliedTodosRef.current.has(todo.todoId)
    );

    if (completedTodos.length === 0) return;

    console.log('[ProgressiveEdit] Auto-applying', completedTodos.length, 'completed TODOs');

    completedTodos.forEach(todo => {
      appliedTodosRef.current.add(todo.todoId);

      // Apply all edits for this TODO
      todo.edits.forEach((edit, index) => {
        try {
          console.log(`[ProgressiveEdit] Applying edit ${index + 1}/${todo.edits.length} for TODO ${todo.order}`);

          if (edit.action === 'create') {
            // Create new file
            console.log(`[ProgressiveEdit] Creating file: ${edit.file}`);
            if (onFileCreate) {
              onFileCreate(edit.file, edit.newCode || '');
            }
          } else if (edit.action === 'replace') {
            // Replace code (with fuzzy match support)
            console.log(`[ProgressiveEdit] Replacing in file: ${edit.file}`);
            const existingContent = fileContents[edit.file] || '';
            
            let newContent = '';
            let applied = false;

            // Try fuzzy match first if oldCode is provided
            if (edit.oldCode) {
              const match = locateEdit(existingContent, edit.oldCode, edit.startLine);
              if (match.matchType !== 'not_found') {
                console.log(`[ProgressiveEdit] Applied replace using ${match.matchType} match`);
                const before = existingContent.slice(0, match.startIndex);
                const after = existingContent.slice(match.endIndex);
                newContent = before + (edit.newCode || '') + after;
                applied = true;
              }
            }

            // Fallback to line numbers or full file replace
            if (!applied) {
              if (edit.startLine && edit.endLine) {
                const lines = existingContent.split('\n');
                const before = lines.slice(0, edit.startLine - 1);
                const after = lines.slice(edit.endLine);
                newContent = [...before, edit.newCode || '', ...after].join('\n');
              } else {
                // Full file replace if no lines specified
                newContent = edit.newCode || '';
              }
            }

            const updatedContents = {
              ...fileContents,
              [edit.file]: newContent
            };
            onFilesChange(updatedContents, edit.file);
          } else if (edit.action === 'insert') {
            // Insert at specific line
            console.log(`[ProgressiveEdit] Inserting into file: ${edit.file} at line ${edit.afterLine}`);
            const existingContent = fileContents[edit.file] || '';
            const lines = existingContent.split('\n');
            
            // Support startLine (insert at line) or afterLine (insert after line)
            if (edit.startLine !== undefined) {
              const insertIndex = edit.startLine - 1;
              lines.splice(insertIndex, 0, edit.newCode || '');
            } else {
              const insertLine = edit.afterLine !== undefined ? edit.afterLine : lines.length;
              lines.splice(insertLine + 1, 0, edit.newCode || '');
            }
            
            const newContent = lines.join('\n');

            const updatedContents = {
              ...fileContents,
              [edit.file]: newContent
            };
            onFilesChange(updatedContents, edit.file);
          } else if (edit.action === 'delete') {
            // Delete lines (with fuzzy match support)
            console.log(`[ProgressiveEdit] Deleting from file: ${edit.file}`);
            const existingContent = fileContents[edit.file] || '';
            
            let newContent = '';
            let applied = false;

            // Try fuzzy match first if oldCode is provided
            if (edit.oldCode) {
              const match = locateEdit(existingContent, edit.oldCode, edit.startLine);
              if (match.matchType !== 'not_found') {
                console.log(`[ProgressiveEdit] Applied delete using ${match.matchType} match`);
                const before = existingContent.slice(0, match.startIndex);
                const after = existingContent.slice(match.endIndex);
                newContent = before + after;
                applied = true;
              }
            }

            if (!applied) {
              const lines = existingContent.split('\n');
              const startLine = edit.startLine || 0;
              const endLine = edit.endLine || startLine;
              lines.splice(startLine - 1, endLine - startLine + 1);
              newContent = lines.join('\n');
            }

            const updatedContents = {
              ...fileContents,
              [edit.file]: newContent
            };
            onFilesChange(updatedContents, edit.file);
          }
        } catch (err) {
          console.error(`[ProgressiveEdit] Failed to apply edit ${index + 1} for ${todo.todoId}:`, err);
        }
      });
    });
  }, [taskStatus, fileContents, onFilesChange, onFileCreate]);

  if (!taskStatus && !isRunning && !error) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <div className="w-16 h-16 bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Loader size={32} className="text-purple-400" />
          </div>
          <h3 className="font-semibold mb-2">Progressive Execution</h3>
          <p className="text-sm text-gray-400 max-w-xs">
            AI will break down your request into steps and execute them one by one with real-time progress.
          </p>
        </div>
      </div>
    );
  }

  const toggleTodo = (todoId) => {
    const newExpanded = new Set(expandedTodos);
    if (newExpanded.has(todoId)) {
      newExpanded.delete(todoId);
    } else {
      newExpanded.add(todoId);
    }
    setExpandedTodos(newExpanded);
  };

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'processing':
        return 'text-blue-400';
      case 'planning':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  const currentTodo =
    taskStatus?.todos.find((todo) => todo.status === 'processing') ||
    taskStatus?.todos.find((todo) => todo.status === 'pending') ||
    null;

  return (
    <div className="flex flex-col h-full">
      {/* Status Header */}
      {taskStatus && (
        <div className="p-3 border-b border-[#2d2d2d] bg-[#252525]">
          {/* Polling Error Warning (non-blocking) */}
          {error && isRunning && (
            <div className="mb-2 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs text-yellow-300 flex items-center gap-2">
              <AlertCircle size={12} className="flex-shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">Connection issue (retrying...)</div>
                <div className="text-yellow-400/80 text-xs mt-0.5">{error.message}</div>
              </div>
              <Loader size={12} className="animate-spin flex-shrink-0" />
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-semibold ${taskStatus.status === 'failed' ? 'text-red-400' : 'text-gray-300'}`}>
                {taskStatus.status === 'completed'
                  ? 'Completed'
                  : taskStatus.status === 'failed'
                  ? 'Failed'
                  : taskStatus.status === 'processing'
                  ? 'Processing'
                  : 'Planning'}
              </span>
              <span className="text-gray-400">
                {taskStatus.progress.completed}/{taskStatus.progress.total} steps
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  taskStatus.status === 'failed'
                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                    : 'bg-gradient-to-r from-purple-500 to-blue-500'
                }`}
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

          {/* Summary (when completed) - Scrollable */}
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

          {/* Failure Summary - Scrollable */}
          {taskStatus.status === 'failed' && (
            <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs max-h-32 overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={14} className="text-red-400" />
                <span className="font-semibold text-red-300">Task Failed</span>
              </div>
              <div className="text-gray-300 space-y-1">
                {taskStatus.errorMessage && (
                  <div className="text-red-200">
                    {taskStatus.errorMessage}
                  </div>
                )}
                {taskStatus.progress && (
                  <div className="text-gray-400 mt-1">
                    Completed {taskStatus.progress.completed} out of {taskStatus.progress.total} steps before failing.
                  </div>
                )}
                <div className="text-yellow-300 mt-2 text-xs flex items-start gap-1">
                  <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                  <span>The task encountered an error and could not complete. You can try again or modify your request.</span>
                </div>
              </div>
            </div>
          )}

          {/* Cancel Button */}
          {isRunning && taskStatus.status !== 'completed' && taskStatus.status !== 'failed' && (
            <button
              onClick={onCancel}
              className="mt-2 w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <StopCircle size={14} />
              Cancel Task
            </button>
          )}
        </div>
      )}

      {/* TODO List */}
      <div className="flex-1 overflow-y-auto p-3">
        {taskStatus && taskStatus.todos.length > 0 ? (
          <>
            <div className="text-xs font-semibold text-gray-400 mb-2">
              Execution Steps:
            </div>
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

                        {/* Show edits if completed */}
                        {isCompleted && todo.edits && todo.edits.length > 0 && (
                          <div className="mt-2 space-y-2">
                            <div className="text-xs text-gray-400">
                              Generated {todo.edits.length} edit{todo.edits.length !== 1 ? 's' : ''}
                            </div>
                            {todo.edits.map((edit, editIndex) => (
                              <div key={editIndex} className="border-l-2 border-gray-600 pl-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-400">
                                    {editIndex + 1}. <span className="text-blue-300">{edit.action}</span> in <span className="text-gray-300">{edit.file}</span>
                                  </span>
                                  {edit.newCode && (
                                    <button
                                      onClick={() => copyCode(edit.newCode)}
                                      className="p-1 hover:bg-white/10 rounded transition-colors"
                                      title="Copy code"
                                    >
                                      <Copy size={12} className="text-gray-400" />
                                    </button>
                                  )}
                                </div>
                                {edit.newCode && (
                                  <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto max-h-40 border border-gray-700">
                                    <code className="text-gray-300">
                                      {edit.newCode.substring(0, 200)}
                                      {edit.newCode.length > 200 && '...'}
                                    </code>
                                  </pre>
                                )}
                              </div>
                            ))}
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
          </>
        ) : taskStatus?.status === 'failed' ? (
          // Task failed - don't show "Planning steps..." or loading spinner
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <XCircle size={32} className="text-red-400 mx-auto mb-3" />
              <p className="text-sm">Task execution failed</p>
              <p className="text-xs text-gray-500 mt-1">Check the details above for more information</p>
            </div>
          </div>
        ) : error && !isRunning ? (
          // Only show fatal error when task is NOT running
          // If task is running, transient errors are shown in the header as warnings
          <div className="flex items-center justify-center h-full">
            <div className="max-w-md p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-red-300 mb-2">
                <AlertCircle size={18} />
                <span className="font-semibold">Task Failed to Start</span>
              </div>
              <p className="text-sm text-red-200">{error.message}</p>
              <p className="text-xs text-red-300/70 mt-2">The task could not be initiated. Please try again.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader size={24} className="animate-spin text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Planning steps...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressiveEditView;
