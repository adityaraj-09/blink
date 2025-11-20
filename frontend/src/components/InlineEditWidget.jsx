/**
 * Inline Edit Widget for CodeMirror
 * Cursor-like inline editing with AI suggestions
 */

import { useState, useRef, useEffect } from 'react';
import { Sparkles, Check, X, Loader2, AlertCircle, Info } from 'lucide-react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { MergeView } from '@codemirror/merge';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { oneDark } from '@codemirror/theme-one-dark';

/**
 * Get language extension based on file extension or language name
 */
const getLanguageExtension = (language) => {
  const langMap = {
    javascript: () => javascript({ jsx: true, typescript: false }),
    js: () => javascript({ jsx: false, typescript: false }),
    jsx: () => javascript({ jsx: true, typescript: false }),
    typescript: () => javascript({ jsx: false, typescript: true }),
    ts: () => javascript({ jsx: false, typescript: true }),
    tsx: () => javascript({ jsx: true, typescript: true }),
    html: () => html(),
    css: () => css(),
    json: () => json(),
    python: () => python(),
    py: () => python(),
    rust: () => rust(),
    rs: () => rust(),
    cpp: () => cpp(),
    c: () => cpp(),
    'c++': () => cpp(),
    java: () => java(),
    plaintext: () => [],
  };

  const lang = language?.toLowerCase() || 'plaintext';
  const extension = langMap[lang];
  return extension ? extension() : [];
};

const InlineEditWidget = ({
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
  suggestion = null,
  onAccept,
  onReject,
  selectedText = '',
  language = 'javascript',
}) => {
  const [instruction, setInstruction] = useState('');
  const inputRef = useRef(null);
  const mergeViewRefsMap = useRef(new Map()); // Map of edit index to merge view ref
  const mergeInstancesMap = useRef(new Map()); // Map of edit index to merge instance

  console.log('suggestion', suggestion);
  
  useEffect(() => {
    // Auto-focus input when widget mounts
    if (inputRef.current && !suggestion) {
      inputRef.current.focus();
    }
  }, [suggestion]);

  // Initialize CodeMirror diff views for all edits when suggestion is available
  useEffect(() => {
    // Clean up all existing merge views
    mergeInstancesMap.current.forEach((instance) => {
      if (instance) {
        instance.destroy();
      }
    });
    mergeInstancesMap.current.clear();

    if (!suggestion || !suggestion.edits || suggestion.edits.length === 0) {
      return;
    }

    // Create merge view for each edit
    suggestion.edits.forEach((edit, index) => {
      const container = mergeViewRefsMap.current.get(index);
      if (!container) return;

      const oldCode = edit.oldCode || suggestion.originalCode || '';
      const newCode = edit.newCode || '';

      // Create extensions
      const extensions = [
        lineNumbers(),
        getLanguageExtension(language),
        oneDark,
        EditorView.editable.of(false),
        EditorState.readOnly.of(true),
        EditorView.theme({
          '&': {
            fontSize: '12px',
          },
          '.cm-gutters': {
            backgroundColor: '#020617',
          },
        }),
      ];

      // Create merge view
      const mergeView = new MergeView({
        a: {
          doc: oldCode,
          extensions,
        },
        b: {
          doc: newCode,
          extensions,
        },
        parent: container,
        highlightChanges: true,
        gutter: true,
        renderRevertControl: () => null, // We use our own controls
      });

      mergeInstancesMap.current.set(index, mergeView);
    });

    // Cleanup
    return () => {
      mergeInstancesMap.current.forEach((instance) => {
        if (instance) {
          instance.destroy();
        }
      });
      mergeInstancesMap.current.clear();
    };
  }, [suggestion, language]);

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
    <div className="inline-edit-widget-container bg-[#0a0e1a] border border-[#1e293b] rounded-lg shadow-2xl overflow-hidden animate-fadeIn" style={{ minWidth: '400px', maxWidth: '600px' }}>
      {/* Input Phase */}
      {!suggestion && (
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-gray-300">AI Inline Edit</span>
            <div className="flex-1" />
            <button
              onClick={onCancel}
              className="p-1 hover:bg-[#1e293b] rounded transition-colors text-gray-500 hover:text-gray-300"
              title="Cancel (Esc)"
            >
              <X size={14} />
            </button>
          </div>

          {/* Selected Code Info */}
          {selectedText && (
            <div className="mb-2 px-2 py-1 bg-[#020617] border border-[#1e293b] rounded text-xs text-gray-400 flex items-center gap-1">
              <Info size={12} />
              <span>
                {selectedText.split('\n').length === 1 && selectedText.length < 100
                  ? `${selectedText.length} characters selected`
                  : `${selectedText.split('\n').length} lines selected`}
              </span>
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
            className="w-full bg-[#020617] border border-[#1e293b] rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
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
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-[#1e293b] disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors flex items-center gap-1 shadow-lg shadow-blue-600/25"
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
            <span className="text-xs font-semibold text-gray-300">AI Response</span>
            <div className="flex-1" />
            {suggestion.summary && suggestion.summary.totalEdits > 0 && (
              <span className="text-xs text-gray-500">
                {suggestion.summary.totalEdits} {suggestion.summary.totalEdits === 1 ? 'edit' : 'edits'}
              </span>
            )}
          </div>

          {/* Explanation */}
          {suggestion.explanation && (
            <div className="mb-2 px-3 py-2 bg-[#020617] border border-[#1e293b] rounded text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
              <div className="flex items-center gap-1.5 mb-1.5 text-blue-400">
                <Info size={12} />
                <span className="font-semibold">AI Explanation</span>
              </div>
              {suggestion.explanation}
            </div>
          )}

          {/* Summary - show if there are edits */}
          {suggestion.summary && suggestion.summary.totalEdits > 0 && (
            <div className="mb-2 px-3 py-2 bg-green-950/20 border border-green-900/40 rounded text-xs">
              <div className="flex items-center gap-2 text-green-400 mb-1.5">
                <Check size={12} />
                <span className="font-semibold">Suggested Changes</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                {suggestion.summary.creates > 0 && <span>{suggestion.summary.creates} creates</span>}
                {suggestion.summary.replaces > 0 && <span>{suggestion.summary.replaces} replaces</span>}
                {suggestion.summary.inserts > 0 && <span>{suggestion.summary.inserts} inserts</span>}
                {suggestion.summary.deletes > 0 && <span>{suggestion.summary.deletes} deletes</span>}
              </div>
            </div>
          )}

          {/* Diff Viewers - show all edits */}
          {suggestion.edits && suggestion.edits.length > 0 && (
            <div className="mb-3 space-y-2">
              {suggestion.edits.map((edit, index) => (
                <div key={index} className="border border-[#1e293b] rounded-lg overflow-hidden">
                  {/* Edit Header */}
                  <div className="flex items-center justify-between px-2 py-1 bg-[#020617] border-b border-[#1e293b]">
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className={`px-1.5 py-0.5 rounded ${
                        edit.action === 'create' ? 'bg-green-900/30 text-green-400' :
                        edit.action === 'replace' ? 'bg-blue-900/30 text-blue-400' :
                        edit.action === 'insert' ? 'bg-purple-900/30 text-purple-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {edit.action}
                      </span>
                      {edit.startLine && edit.endLine && (
                        <span>Lines {edit.startLine}-{edit.endLine}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-red-400">● Before</span>
                      <span className="text-green-400">● After</span>
                    </div>
                  </div>
                  
                  {/* Diff View */}
                  <div
                    ref={(el) => {
                      if (el) {
                        mergeViewRefsMap.current.set(index, el);
                      }
                    }}
                    className="overflow-hidden"
                    style={{ maxHeight: '250px' }}
                  />
                  
                  {/* Edit explanation if available */}
                  {edit.explanation && (
                    <div className="px-2 py-1.5 bg-[#020617] border-t border-[#1e293b] text-[10px] text-gray-400">
                      {edit.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No edits message */}
          {(!suggestion.edits || suggestion.edits.length === 0) && (
            <div className="mb-2 px-2 py-1.5 bg-blue-900/20 border border-blue-900/50 rounded text-xs text-blue-400 flex items-center gap-1">
              <Info size={12} />
              <span>No code changes suggested. The explanation provides information only.</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onReject}
              className="flex-1 px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-gray-300 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
            >
              <X size={14} />
              <span>{suggestion.edits && suggestion.edits.length > 0 ? 'Reject' : 'Close'}</span>
            </button>
            {suggestion.edits && suggestion.edits.length > 0 && (
              <button
                onClick={onAccept}
                className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 shadow-lg shadow-green-600/25"
              >
                <Check size={14} />
                <span>Review in Editor</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InlineEditWidget;
