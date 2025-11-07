/**
 * Progressive Chat Panel
 * AI chat with real-time TODO progress tracking
 */

import { useState } from 'react';
import { Send, X, Loader, CheckCircle, XCircle, Circle, AlertCircle, Copy } from 'lucide-react';
import { useProgressiveEdit } from '../hooks/useProgressiveEdit';

const ProgressiveChatPanel = ({ projectId, onClose }) => {
  const [message, setMessage] = useState('');

  const {
    startTask,
    cancelCurrentTask,
    taskStatus,
    isRunning,
    error,
    currentTodo,
  } = useProgressiveEdit({
    projectId,
    pollInterval: 2000,
    onTaskComplete: (taskId, result) => {
      console.log('Task completed:', taskId, result);
    },
  });

  const handleSendMessage = async () => {
    if (!message.trim() || isRunning) return;

    await startTask(message);
    setMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
      default:
        return 'text-gray-400';
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          <h3 className="font-semibold text-sm">AI Progressive Edit</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          title="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Task Status */}
      {taskStatus && (
        <div className="p-3 border-b border-gray-700 bg-[#252525]">
          {/* Overall Progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={getStatusColor(taskStatus.status)}>
                Status: {taskStatus.status}
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
            <div className="text-xs text-gray-300 mb-2">
              <strong>Plan:</strong> {taskStatus.explanation}
            </div>
          )}

          {/* Current TODO */}
          {currentTodo && (
            <div className="p-2 bg-blue-900/20 border border-blue-500/30 rounded text-xs">
              <div className="flex items-center gap-2 mb-1">
                <Loader size={12} className="animate-spin text-blue-400" />
                <span className="font-semibold text-blue-300">
                  Working on: {currentTodo.title}
                </span>
              </div>
              <div className="text-gray-400 text-xs">{currentTodo.description}</div>
              <div className="text-gray-500 text-xs mt-1">File: {currentTodo.filePath}</div>
            </div>
          )}

          {/* Summary (when completed) */}
          {taskStatus.status === 'completed' && taskStatus.summary && (
            <div className="mt-2 p-2 bg-green-900/20 border border-green-500/30 rounded text-xs">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={14} className="text-green-400" />
                <span className="font-semibold text-green-300">Task Completed!</span>
              </div>
              <div className="text-gray-300 space-y-1">
                <div>Total Edits: {taskStatus.summary.totalEdits}</div>
                <div className="flex gap-3">
                  <span>Creates: {taskStatus.summary.creates}</span>
                  <span>Replaces: {taskStatus.summary.replaces}</span>
                  <span>Inserts: {taskStatus.summary.inserts}</span>
                </div>
                <div className="text-gray-400">
                  Affected Files: {taskStatus.summary.affectedFiles.length}
                </div>
                <div className="text-yellow-400 mt-2">
                  ⚠️ {taskStatus.summary.recommendation}
                </div>
              </div>
            </div>
          )}

          {/* Cancel Button */}
          {isRunning && (
            <button
              onClick={cancelCurrentTask}
              className="mt-2 w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition-colors"
            >
              Cancel Task
            </button>
          )}
        </div>
      )}

      {/* TODO List */}
      {taskStatus && taskStatus.todos.length > 0 && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-xs font-semibold text-gray-400 mb-2">TODOs:</div>
          <div className="space-y-2">
            {taskStatus.todos.map((todo) => (
              <div
                key={todo.todoId}
                className={`p-2 rounded border ${
                  todo.status === 'completed'
                    ? 'bg-green-900/10 border-green-500/20'
                    : todo.status === 'failed'
                    ? 'bg-red-900/10 border-red-500/20'
                    : todo.status === 'processing'
                    ? 'bg-blue-900/10 border-blue-500/20'
                    : 'bg-gray-800 border-gray-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">{getStatusIcon(todo.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-200 mb-1">
                      {todo.order}. {todo.title}
                    </div>
                    <div className="text-xs text-gray-400 mb-1">{todo.description}</div>
                    <div className="text-xs text-gray-500">{todo.filePath}</div>

                    {/* Show edit if completed */}
                    {todo.status === 'completed' && todo.edit && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">
                            Action: {todo.edit.action}
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
                          <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto max-h-40">
                            <code>{todo.edit.newCode.substring(0, 300)}...</code>
                          </pre>
                        )}
                      </div>
                    )}

                    {/* Show error if failed */}
                    {todo.status === 'failed' && todo.errorMessage && (
                      <div className="mt-2 p-2 bg-red-900/20 rounded text-xs text-red-300">
                        <AlertCircle size={12} className="inline mr-1" />
                        {todo.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900/20 border-t border-red-500/30">
          <div className="flex items-center gap-2 text-xs text-red-300">
            <AlertCircle size={14} />
            <span>{error.message}</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what you want to change..."
            className="flex-1 bg-[#2d2d2d] border border-gray-600 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-purple-500"
            rows={3}
            disabled={isRunning}
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isRunning}
            className="px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded flex items-center justify-center transition-colors"
            title="Send"
          >
            {isRunning ? (
              <Loader size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Pro tip: Describe your changes in detail for best results
        </div>
      </div>
    </div>
  );
};

export default ProgressiveChatPanel;
