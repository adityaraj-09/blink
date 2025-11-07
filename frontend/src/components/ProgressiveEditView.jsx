/**
 * Progressive Edit View
 * Shows real-time TODO progress with step-by-step execution
 */

import { Loader, CheckCircle, XCircle, Circle, AlertCircle, Copy, StopCircle } from 'lucide-react';

const ProgressiveEditView = ({ taskStatus, isRunning, error, onCancel, projectId, onFilesChange }) => {
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'failed':
        return <XCircle size={16} className="text-red-400" />;
      case 'processing':
        return <Loader size={16} className="text-blue-400 animate-spin" />;
      default:
        return <Circle size={16} className="text-gray-500" />;
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
        <div className="p-3 border-b border-gray-700 bg-[#252525]">
          {/* Overall Progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={`font-semibold ${getStatusColor(taskStatus.status)}`}>
                Status: {taskStatus.status.toUpperCase()}
              </span>
              <span className="text-gray-400">
                {taskStatus.progress.completed}/{taskStatus.progress.total} TODOs
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                style={{ width: `${taskStatus.progress.percentage}%` }}
              />
            </div>
          </div>

          {/* Explanation */}
          {taskStatus.explanation && (
            <div className="p-2 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-gray-300 mb-2">
              <strong className="text-blue-300">Plan:</strong> {taskStatus.explanation}
            </div>
          )}

          {/* Current TODO */}
          {currentTodo && (
            <div className="p-2 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs">
              <div className="flex items-center gap-2 mb-1">
                <Loader size={12} className="animate-spin text-yellow-400" />
                <span className="font-semibold text-yellow-300">
                  Step {currentTodo.order}: {currentTodo.title}
                </span>
              </div>
              <div className="text-gray-400 text-xs">{currentTodo.description}</div>
              <div className="text-gray-500 text-xs mt-1">📁 {currentTodo.filePath}</div>
            </div>
          )}

          {/* Summary (when completed) */}
          {taskStatus.status === 'completed' && taskStatus.summary && (
            <div className="mt-2 p-2 bg-green-900/20 border border-green-500/30 rounded text-xs">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={14} className="text-green-400" />
                <span className="font-semibold text-green-300">All Steps Completed!</span>
              </div>
              <div className="text-gray-300 space-y-1">
                <div>Total Edits: {taskStatus.summary.totalEdits}</div>
                <div className="flex gap-3 text-xs">
                  <span>✨ {taskStatus.summary.creates} creates</span>
                  <span>✏️ {taskStatus.summary.replaces} replaces</span>
                  <span>➕ {taskStatus.summary.inserts} inserts</span>
                </div>
                <div className="text-gray-400">
                  Affected: {taskStatus.summary.affectedFiles.length} files
                </div>
                <div className="text-yellow-400 mt-2 text-xs">
                  ⚠️ {taskStatus.summary.recommendation}
                </div>
              </div>
            </div>
          )}

          {/* Cancel Button */}
          {isRunning && taskStatus.status !== 'completed' && (
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
                const isActive = todo.status === 'processing';
                const isCompleted = todo.status === 'completed';
                const isFailed = todo.status === 'failed';
                const isPending = todo.status === 'pending';

                return (
                  <div
                    key={todo.todoId}
                    className={`p-2 rounded border transition-all ${
                      isCompleted
                        ? 'bg-green-900/10 border-green-500/20'
                        : isFailed
                        ? 'bg-red-900/10 border-red-500/20'
                        : isActive
                        ? 'bg-blue-900/10 border-blue-500/30 ring-2 ring-blue-500/20'
                        : 'bg-gray-800 border-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{getStatusIcon(todo.status)}</div>
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                            {todo.order}
                          </span>
                          <span className="text-xs font-medium text-gray-200">
                            {todo.title}
                          </span>
                        </div>

                        {/* Description */}
                        <div className="text-xs text-gray-400 mb-1">{todo.description}</div>

                        {/* File Path */}
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

                        {/* Processing indicator */}
                        {isActive && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-blue-300">
                            <Loader size={12} className="animate-spin" />
                            <span>AI is working on this step...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="max-w-md p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-red-300 mb-2">
                <AlertCircle size={18} />
                <span className="font-semibold">Error</span>
              </div>
              <p className="text-sm text-red-200">{error.message}</p>
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
