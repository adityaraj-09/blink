/**
 * Inline Edit Widget for CodeMirror
 * Cursor-like inline editing with AI suggestions
 */

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Check, X, Loader2, AlertCircle, Info } from 'lucide-react';

const InlineEditWidget = ({
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
  suggestion = null,
  onAccept,
  onReject,
  selectedText = '',
}) => {
  const [instruction, setInstruction] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto-focus input when widget mounts
    if (inputRef.current && !suggestion) {
      inputRef.current.focus();
    }
  }, [suggestion]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (instruction.trim() && !isLoading) {
        onSubmit(instruction);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="inline-edit-widget bg-[#1e1e1e] border border-[#3d3d3d] rounded-lg shadow-2xl overflow-hidden animate-fadeIn" style={{ minWidth: '400px', maxWidth: '600px' }}>
      {/* Input Phase */}
      {!suggestion && (
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-xs font-semibold text-gray-300">AI Inline Edit</span>
            <div className="flex-1" />
            <button
              onClick={onCancel}
              className="p-1 hover:bg-[#2d2d2d] rounded transition-colors text-gray-500 hover:text-gray-300"
              title="Cancel (Esc)"
            >
              <X size={14} />
            </button>
          </div>

          {/* Selected Code Info */}
          {selectedText && (
            <div className="mb-2 px-2 py-1 bg-[#252525] border border-[#3d3d3d] rounded text-xs text-gray-400 flex items-center gap-1">
              <Info size={12} />
              <span>{selectedText.split('\n').length} lines selected</span>
            </div>
          )}

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to edit... (Enter to submit, Esc to cancel)"
            className="w-full bg-[#0e0e0e] border border-[#3d3d3d] rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            disabled={isLoading}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={onCancel}
              className="px-3 py-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => instruction.trim() && onSubmit(instruction)}
              disabled={!instruction.trim() || isLoading}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
            >
              {isLoading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles size={12} />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-2 px-2 py-1.5 bg-red-900/20 border border-red-900/50 rounded text-xs text-red-400 flex items-center gap-1">
              <AlertCircle size={12} />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Suggestion Phase */}
      {suggestion && (
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-green-400" />
            <span className="text-xs font-semibold text-gray-300">AI Suggestion</span>
            <div className="flex-1" />
            <span className="text-xs text-gray-500">
              +{suggestion.diff.additions} -{suggestion.diff.deletions}
            </span>
          </div>

          {/* Explanation */}
          {suggestion.explanation && (
            <div className="mb-2 px-2 py-1.5 bg-[#252525] border border-[#3d3d3d] rounded text-xs text-gray-300">
              {suggestion.explanation}
            </div>
          )}

          {/* Diff Preview (compact) */}
          <div className="max-h-48 overflow-auto bg-[#0e0e0e] border border-[#3d3d3d] rounded text-xs font-mono mb-2">
            {suggestion.diff.changes.slice(0, 20).map((line, idx) => (
              <div
                key={idx}
                className={`px-2 py-0.5 ${
                  line.type === 'add'
                    ? 'bg-green-900/20 text-green-400'
                    : line.type === 'remove'
                    ? 'bg-red-900/20 text-red-400'
                    : 'text-gray-500'
                }`}
              >
                <span className="inline-block w-5 text-right mr-2 text-gray-600">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </span>
                {line.content}
              </div>
            ))}
            {suggestion.diff.changes.length > 20 && (
              <div className="px-2 py-1 text-gray-500 text-center">
                +{suggestion.diff.changes.length - 20} more lines...
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onReject}
              className="flex-1 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
            >
              <X size={14} />
              <span>Reject</span>
            </button>
            <button
              onClick={onAccept}
              className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
            >
              <Check size={14} />
              <span>Accept</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InlineEditWidget;
