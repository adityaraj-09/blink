/**
 * Professional CodeMirror Diff Viewer Component
 * Shows side-by-side or unified diff with accept/reject functionality
 */

import { useEffect, useRef, useState } from 'react';
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
import { Check, X, ChevronDown, ChevronRight, FileText } from 'lucide-react';

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

/**
 * Single Edit Diff Viewer
 */
const SingleEditDiff = ({ edit, index, onAccept, onReject, language, isExpanded, onToggle }) => {
  const mergeViewRef = useRef(null);
  const mergeInstanceRef = useRef(null);

  useEffect(() => {
    if (!mergeViewRef.current || !isExpanded) return;

    // Get old and new content
    const oldContent = edit.oldCode || '';
    const newContent = edit.newCode || '';

    // Create extensions
    const extensions = [
      lineNumbers(),
      getLanguageExtension(language),
      oneDark,
      EditorView.editable.of(false),
      EditorState.readOnly.of(true),
    ];

    // Create merge view
    const mergeView = new MergeView({
      a: {
        doc: oldContent,
        extensions,
      },
      b: {
        doc: newContent,
        extensions,
      },
      parent: mergeViewRef.current,
      highlightChanges: true,
      gutter: true,
      renderRevertControl: () => null, // We'll use our own controls
    });

    mergeInstanceRef.current = mergeView;

    // Cleanup
    return () => {
      if (mergeInstanceRef.current) {
        mergeInstanceRef.current.destroy();
        mergeInstanceRef.current = null;
      }
    };
  }, [edit, language, isExpanded]);

  const getActionLabel = (action) => {
    const labels = {
      create: 'Create',
      replace: 'Replace',
      insert: 'Insert',
      delete: 'Delete',
    };
    return labels[action] || action;
  };

  const getActionColor = (action) => {
    const colors = {
      create: 'text-green-400 bg-green-900/20',
      replace: 'text-blue-400 bg-blue-900/20',
      insert: 'text-purple-400 bg-purple-900/20',
      delete: 'text-red-400 bg-red-900/20',
    };
    return colors[action] || 'text-gray-400 bg-gray-900/20';
  };

  return (
    <div className="border border-[#3d3d3d] rounded-lg overflow-hidden bg-[#1e1e1e]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-[#252525] border-b border-[#3d3d3d]">
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={onToggle}
            className="p-1 hover:bg-[#2d2d2d] rounded transition-colors"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <FileText size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-200">{edit.file}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${getActionColor(edit.action)}`}>
            {getActionLabel(edit.action)}
          </span>
          {edit.startLine && edit.endLine && (
            <span className="text-xs text-gray-500">
              Lines {edit.startLine}-{edit.endLine}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onReject(index)}
            className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs font-medium transition-colors flex items-center gap-1"
            title="Reject"
          >
            <X size={14} />
            Reject
          </button>
          <button
            onClick={() => onAccept(index)}
            className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded text-xs font-medium transition-colors flex items-center gap-1"
            title="Accept"
          >
            <Check size={14} />
            Accept
          </button>
        </div>
      </div>

      {/* Diff View */}
      {isExpanded && (
        <div className="relative">
          {edit.action === 'create' ? (
            // For create, show only the new content
            <div className="p-4 bg-[#1e1e1e]">
              <div className="text-xs text-gray-400 mb-2">New File Content:</div>
              <div
                ref={mergeViewRef}
                className="border border-[#3d3d3d] rounded overflow-auto"
                style={{ height: '400px' }}
              />
            </div>
          ) : edit.action === 'delete' ? (
            // For delete, show only the old content
            <div className="p-4 bg-[#1e1e1e]">
              <div className="text-xs text-gray-400 mb-2">Content to Delete:</div>
              <div
                ref={mergeViewRef}
                className="border border-[#3d3d3d] rounded overflow-auto"
                style={{ height: '400px' }}
              />
            </div>
          ) : (
            // For replace/insert, show side-by-side diff
            <div className="p-4 bg-[#1e1e1e]">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Before</span>
                <span>After</span>
              </div>
              <div
                ref={mergeViewRef}
                className="border border-[#3d3d3d] rounded overflow-auto"
                style={{ height: '400px' }}
              />
            </div>
          )}

          {edit.explanation && (
            <div className="px-4 pb-4">
              <div className="text-xs text-gray-400 mb-1">Explanation:</div>
              <div className="text-sm text-gray-300 bg-[#252525] border border-[#3d3d3d] rounded p-2">
                {edit.explanation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Main Diff Viewer Component
 */
const CodeMirrorDiffViewer = ({
  edits = [],
  onAcceptEdit,
  onRejectEdit,
  onAcceptAll,
  onRejectAll,
  fileContents = {},
}) => {
  const [expandedEdits, setExpandedEdits] = useState(new Set([0])); // First edit expanded by default

  const toggleEdit = (index) => {
    setExpandedEdits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedEdits(new Set(edits.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedEdits(new Set());
  };

  if (!edits || edits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No edits to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-3 bg-[#252525] border-b border-[#3d3d3d]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200">
            {edits.length} Edit{edits.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={expandAll}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            Expand All
          </button>
          <span className="text-gray-600">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            Collapse All
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onRejectAll && (
            <button
              onClick={onRejectAll}
              className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs font-medium transition-colors flex items-center gap-1"
            >
              <X size={14} />
              Reject All
            </button>
          )}
          {onAcceptAll && (
            <button
              onClick={onAcceptAll}
              className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Check size={14} />
              Accept All
            </button>
          )}
        </div>
      </div>

      {/* Edits List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {edits.map((edit, index) => {
          // Detect language from file extension
          const fileExt = edit.file?.split('.').pop()?.toLowerCase();
          const language = fileExt || 'plaintext';

          return (
            <SingleEditDiff
              key={index}
              edit={edit}
              index={index}
              onAccept={onAcceptEdit}
              onReject={onRejectEdit}
              language={language}
              isExpanded={expandedEdits.has(index)}
              onToggle={() => toggleEdit(index)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CodeMirrorDiffViewer;
