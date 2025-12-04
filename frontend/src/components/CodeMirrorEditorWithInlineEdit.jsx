/**
 * CodeMirror Editor with Inline AI Edit Support
 * Professional code editor with Cursor-like inline editing
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorState, StateField, StateEffect } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, Decoration, ViewPlugin, WidgetType } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle, foldGutter, foldKeymap } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, completionKeymap, autocompletion } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { Sparkles } from 'lucide-react';
import InlineEditWidget from './InlineEditWidget';
import { getInlineEdit } from '../api/aiEdit';
import { locateEdit } from '../utils/fuzzyMatch';

/**
 * Get language extension
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
 * Inline Edit Widget for CodeMirror
 */
class InlineEditWidgetView extends WidgetType {
  constructor(props) {
    super();
    this.props = props;
    this.root = null;
  }

  eq(other) {
    // Compare all props to determine if widget needs to be recreated
    return (
      other.props.selectedText === this.props.selectedText &&
      other.props.isLoading === this.props.isLoading &&
      other.props.error === this.props.error &&
      other.props.suggestion === this.props.suggestion &&
      other.props.onSubmit === this.props.onSubmit &&
      other.props.onCancel === this.props.onCancel
    );
  }

  toDOM() {
    const wrap = document.createElement('div');
    wrap.className = 'inline-edit-widget-container';
    wrap.style.cssText = 'margin: 8px 0; position: relative; z-index: 100;';

    // Create root and store it for cleanup
    this.root = createRoot(wrap);
    this.root.render(
      <InlineEditWidget
        {...this.props}
        selectedText={this.props.selectedText}
        onSubmit={this.props.onSubmit}
        onCancel={this.props.onCancel}
        isLoading={this.props.isLoading}
        error={this.props.error}
        suggestion={this.props.suggestion}
        onAccept={this.props.onAccept}
        onReject={this.props.onReject}
        language={this.props.language}
      />
    );

    return wrap;
  }

  destroy() {
    // Clean up React root when widget is destroyed
    if (this.root) {
      // Use setTimeout to avoid issues with React 18 concurrent rendering
      setTimeout(() => {
        if (this.root) {
          this.root.unmount();
          this.root = null;
        }
      }, 0);
    }
  }

  ignoreEvent() {
    return true;
  }
}

/**
 * State effect for showing inline edit widget
 */
const showInlineEditEffect = StateEffect.define();
const hideInlineEditEffect = StateEffect.define();

/**
 * State field for inline edit widget
 */
const inlineEditField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    value = value.map(tr.changes);

    for (let effect of tr.effects) {
      if (effect.is(showInlineEditEffect)) {
        const widget = Decoration.widget({
          widget: new InlineEditWidgetView(effect.value.props),
          side: 1,
          block: true,
        });
        value = Decoration.set([widget.range(effect.value.pos)]);
      } else if (effect.is(hideInlineEditEffect)) {
        value = Decoration.none;
      }
    }

    return value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/**
 * CodeMirror Editor with Inline Edit
 */
const CodeMirrorEditorWithInlineEdit = ({
  value = '',
  language = 'javascript',
  onChange,
  onSave,
  onShowDiff,
  settings = {
    fontSize: 14,
    tabSize: 4,
    wordWrap: false,
    lineHeight: 1.5,
    theme: 'vs-dark',
  },
  readOnly = false,
  height = '100%',
  projectId,
  filePath,
}) => {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const promptButtonRef = useRef(null);
  
  // Use refs to store filePath and projectId to avoid stale closures
  const filePathRef = useRef(filePath);
  const projectIdRef = useRef(projectId);
  
  // Refs for callbacks to avoid circular dependencies
  const handleInlineEditSubmitRef = useRef(null);
  const handleInlineEditCancelRef = useRef(null);
  
  // Keep refs in sync with props
  useEffect(() => {
    filePathRef.current = filePath;
  }, [filePath]);
  
  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);
  
  // Use a ref to store active edit context to avoid stale closures in callbacks
  const activeEditContextRef = useRef({
    active: false,
    selectedText: '',
    startPos: 0,
    endPos: 0,
    startLine: 0,
    endLine: 0,
  });

  const [inlineEditState, setInlineEditState] = useState({
    active: false,
    selectedText: '',
    startPos: 0,
    endPos: 0,
    startLine: 0,
    endLine: 0,
    isLoading: false,
    error: null,
    suggestion: null,
  });

  const [selectionState, setSelectionState] = useState({
    hasSelection: false,
    position: { top: 0, left: 0 },
  });

  // Ref to track inline edit state for selection listener
  const inlineEditStateRef = useRef(inlineEditState);
  
  // Keep ref in sync with state
  useEffect(() => {
    inlineEditStateRef.current = inlineEditState;
  }, [inlineEditState]);

  /**
   * Show inline edit widget
   */
  const showInlineEdit = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;

    const selection = view.state.selection.main;
    let selectedText, startPos, endPos, startLine, endLine, widgetPos;

    if (selection.empty) {
      // No selection - use entire file content
      selectedText = view.state.doc.toString();
      startPos = 0;
      endPos = view.state.doc.length;
      startLine = 1;
      endLine = view.state.doc.lines;
      // Position widget at cursor position
      widgetPos = selection.from;
    } else {
      // Selection exists - use selected text
      selectedText = view.state.doc.sliceString(selection.from, selection.to);
      startPos = selection.from;
      endPos = selection.to;
      startLine = view.state.doc.lineAt(selection.from).number;
      endLine = view.state.doc.lineAt(selection.to).number;
      widgetPos = selection.to;
    }

    // Update ref immediately
    activeEditContextRef.current = {
      active: true,
      selectedText,
      startPos,
      endPos,
      startLine,
      endLine,
    };

    setInlineEditState({
      active: true,
      selectedText,
      startPos,
      endPos,
      startLine,
      endLine,
      isLoading: false,
      error: null,
      suggestion: null,
    });

    // Dispatch effect to show widget
    // Use refs to get latest callbacks (avoid circular dependency)
    const submitHandler = handleInlineEditSubmitRef.current;
    const cancelHandler = handleInlineEditCancelRef.current;
    
    if (!submitHandler || !cancelHandler) {
      console.warn('[InlineEdit] Callbacks not initialized yet');
      return;
    }
    
    view.dispatch({
      effects: showInlineEditEffect.of({
        pos: widgetPos,
        props: {
          selectedText,
          onSubmit: submitHandler,
          onCancel: cancelHandler,
          isLoading: false,
          error: null,
          suggestion: null,
          onAccept: null,
          onReject: null,
          language,
        },
      }),
    });
  }, [language]);

  /**
   * Handle inline edit submission
   */
  const handleInlineEditSubmit = useCallback(
    async (instruction) => {
      const view = viewRef.current;
      // Use refs to get current values (always up-to-date, even if widget was created with old closure)
      const currentProjectId = projectIdRef.current;
      const currentFilePath = filePathRef.current;
      
      if (!view || !currentProjectId || !currentFilePath) {
        console.warn('[InlineEdit] Missing projectId or filePath:', { currentProjectId, currentFilePath });
        return;
      }

      // Use ref for current context
      const context = activeEditContextRef.current;

      setInlineEditState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Update widget to show loading
      // Use refs to get latest callbacks
      const submitHandler = handleInlineEditSubmitRef.current;
      const cancelHandler = handleInlineEditCancelRef.current;
      
      view.dispatch({
        effects: showInlineEditEffect.of({
          pos: context.endPos,
          props: {
            selectedText: context.selectedText,
            onSubmit: submitHandler || handleInlineEditSubmit,
            onCancel: cancelHandler || handleInlineEditCancel,
            isLoading: true,
            error: null,
            suggestion: null,
            onAccept: null,
            onReject: null,
            language,
          },
        }),
      });

      try {
        // Call inline edit API - use refs to ensure correct filePath
        console.log('[InlineEdit] Sending request with filePath:', currentFilePath);
        const response = await getInlineEdit({
          projectId: currentProjectId,
          filePath: currentFilePath,
          selectedCode: context.selectedText,
          instruction,
          startLine: context.startLine,
          endLine: context.endLine,
          language,
          fullFileContent: view.state.doc.toString(),
        });

        // Pre-calculate fuzzy matches for better UI feedback
        if (response.edits) {
          const currentDoc = view.state.doc.toString();
          response.edits = response.edits.map(edit => {
            if (edit.action === 'replace' || edit.action === 'delete') {
              const match = edit.oldCode 
                ? locateEdit(currentDoc, edit.oldCode, edit.startLine)
                : { matchType: 'not_found', confidence: 0 };
              
              return {
                ...edit,
                matchType: match.matchType,
                matchConfidence: match.confidence
              };
            }
            return edit;
          });
        }

        setInlineEditState((prev) => ({
          ...prev,
          isLoading: false,
          suggestion: response,
        }));

        // Update widget with suggestion
        // Use refs to get latest callbacks
        const submitHandler = handleInlineEditSubmitRef.current;
        const cancelHandler = handleInlineEditCancelRef.current;
        
        view.dispatch({
          effects: showInlineEditEffect.of({
            pos: context.endPos,
            props: {
              selectedText: context.selectedText,
              onSubmit: submitHandler || handleInlineEditSubmit,
              onCancel: cancelHandler || handleInlineEditCancel,
              isLoading: false,
              error: null,
              suggestion: response,
              onAccept: () => handleAcceptEdit(response),
              onReject: cancelHandler || handleInlineEditCancel,
              language,
            },
          }),
        });
      } catch (error) {
        console.error('Inline edit failed:', error);
        setInlineEditState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to generate suggestion',
        }));

        // Update widget with error
        // Use refs to get latest callbacks
        const submitHandler = handleInlineEditSubmitRef.current;
        const cancelHandler = handleInlineEditCancelRef.current;
        
        view.dispatch({
          effects: showInlineEditEffect.of({
            pos: context.endPos,
            props: {
              selectedText: context.selectedText,
              onSubmit: submitHandler || handleInlineEditSubmit,
              onCancel: cancelHandler || handleInlineEditCancel,
              isLoading: false,
              error: error.message || 'Failed to generate suggestion',
              suggestion: null,
              onAccept: null,
              onReject: null,
              language,
            },
          }),
        });
      }
    },
    [language] // Only depend on language, use refs for projectId and filePath
  );
  
  // Keep callback refs in sync
  useEffect(() => {
    handleInlineEditSubmitRef.current = handleInlineEditSubmit;
  }, [handleInlineEditSubmit]);

  /**
   * Handle accepting edit
   */
  const handleAcceptEdit = useCallback(
    (suggestion) => {
      const view = viewRef.current;
      if (!view) return;

      const context = activeEditContextRef.current;

      // Check if there are edits to apply
      if (suggestion.edits && suggestion.edits.length > 0) {
        // If onShowDiff is provided, show in diff mode
        if (onShowDiff) {
          // Show all edits in diff mode
          onShowDiff(suggestion.edits, 0);
        } else {
          // Fallback: Apply all edits directly
          // Sort edits by line number (descending) to avoid position shifts
          const sortedEdits = [...suggestion.edits].sort((a, b) => {
            const aLine = a.startLine || 0;
            const bLine = b.startLine || 0;
            return bLine - aLine; // Process from bottom to top
          });

          // Apply each edit sequentially to ensure state consistency
          // Using a sequential approach with re-location ensures subsequent edits find the right place
          // even if previous edits shifted things slightly (though sorting helps)
          
          let finalTransaction = null;

          // We'll apply edits one by one to get the latest state for fuzzy matching
          for (const edit of sortedEdits) {
            if (edit.newCode) {
              let fromPos, toPos;
              
              // Get fresh doc state for each edit
              const currentDoc = view.state.doc.toString();
              
              // Try to use robust fuzzy locating
              // Only try fuzzy match if oldCode is provided
              const match = edit.oldCode 
                ? locateEdit(currentDoc, edit.oldCode, edit.startLine)
                : { matchType: 'not_found' };
              
              if (match.matchType !== 'not_found') {
                fromPos = match.startIndex;
                toPos = match.endIndex;
                console.log(`[FuzzyMatch] Applied edit using ${match.matchType} match (confidence: ${match.confidence})`);
              } else {
                // Fallback to line numbers if fuzzy match fails
                if (edit.startLine && edit.endLine) {
                  // Use the edit's specific line range
                  // Check if lines exist to avoid out of bounds
                  const docLines = view.state.doc.lines;
                  const safeStartLine = Math.min(Math.max(1, edit.startLine), docLines);
                  const safeEndLine = Math.min(Math.max(1, edit.endLine), docLines);
                  
                  const startLineInfo = view.state.doc.line(safeStartLine);
                  const endLineInfo = view.state.doc.line(safeEndLine);
                  fromPos = startLineInfo.from;
                  toPos = endLineInfo.to;
                } else {
                  // Fallback to the original selection range
                  fromPos = context.startPos;
                  toPos = context.endPos;
                }
              }

              // Apply this edit immediately to update state for next iteration
              const transaction = view.state.update({
                changes: {
                  from: fromPos,
                  to: toPos,
                  insert: edit.newCode,
                }
              });
              view.dispatch(transaction);
            }
          }

          // Hide inline widget effects
          view.dispatch({
            effects: hideInlineEditEffect.of(),
          });
        }
      }

      // Hide inline widget and reset state
      view.dispatch({
        effects: hideInlineEditEffect.of(),
      });

      // Reset state
      activeEditContextRef.current = {
        active: false,
        selectedText: '',
        startPos: 0,
        endPos: 0,
        startLine: 0,
        endLine: 0,
      };

      setInlineEditState({
        active: false,
        selectedText: '',
        startPos: 0,
        endPos: 0,
        startLine: 0,
        endLine: 0,
        isLoading: false,
        error: null,
        suggestion: null,
      });
    },
    [onShowDiff]
  );

  /**
   * Handle canceling edit
   */
  const handleInlineEditCancel = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: hideInlineEditEffect.of(),
    });

    activeEditContextRef.current = {
      active: false,
      selectedText: '',
      startPos: 0,
      endPos: 0,
      startLine: 0,
      endLine: 0,
    };

    setInlineEditState({
      active: false,
      selectedText: '',
      startPos: 0,
      endPos: 0,
      startLine: 0,
      endLine: 0,
      isLoading: false,
      error: null,
      suggestion: null,
    });
  }, []);
  
  // Keep callback refs in sync
  useEffect(() => {
    handleInlineEditCancelRef.current = handleInlineEditCancel;
  }, [handleInlineEditCancel]);

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current) return;

    const extensions = [
      lineNumbers(),
      history(),
      foldGutter(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      highlightSelectionMatches(),
      getLanguageExtension(language),
      settings.theme === 'oneDark' ? oneDark : [],
      EditorState.tabSize.of(settings.tabSize || 4),
      settings.wordWrap ? EditorView.lineWrapping : [],
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
      inlineEditField,

      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
        indentWithTab,
        {
          key: 'Mod-s',
          run: () => {
            if (onSave) {
              onSave();
              return true;
            }
            return false;
          },
        },
        {
          key: 'Mod-k',
          run: () => {
            showInlineEdit();
            return true;
          },
        },
      ]),

      EditorView.updateListener.of((update) => {
        if (update.docChanged && onChange) {
          const newValue = update.state.doc.toString();
          onChange(newValue);
        }
        
        // Track selection changes for prompt button
        if (update.selectionSet || update.docChanged) {
          const selection = update.state.selection.main;
          const hasSelection = !selection.empty;
          const isActive = inlineEditStateRef.current.active;
          
          if (hasSelection && !isActive) {
            // Calculate button position from selection coordinates
            try {
              const coords = update.view.coordsAtPos(selection.to);
              const editorRect = editorRef.current?.getBoundingClientRect();
              
              if (coords && editorRect) {
                setSelectionState({
                  hasSelection: true,
                  position: {
                    top: coords.top - editorRect.top - 40, // Position above selection
                    left: coords.left - editorRect.left + 10,
                  },
                });
              }
            } catch (e) {
              // Ignore coordinate calculation errors
              setSelectionState({
                hasSelection: false,
                position: { top: 0, left: 0 },
              });
            }
          } else {
            setSelectionState({
              hasSelection: false,
              position: { top: 0, left: 0 },
            });
          }
        }
      }),

      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: `${settings.fontSize}px`,
          backgroundColor: '#020617',
        },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: 'monospace',
          backgroundColor: '#020617',
        },
        '.cm-gutters': {
          backgroundColor: '#020617',
          color:'#020617',
          borderRadius: '0px',
          fontFamily: '"Courier New", monospace',
        },
        '.cm-activeLineGutter': {
          backgroundColor: '#1e293b',
          color: '#e2e8f0',
        },
        '.cm-activeLine': {
          backgroundColor: '#1e293b20',
        },
        '.cm-selectionBackground, ::selection': {
          backgroundColor: '#3b82f640 !important',
        },
        '.cm-focused .cm-selectionBackground, .cm-focused ::selection': {
          backgroundColor: '#3b82f660 !important',
        },
        '.cm-cursor': {
          borderLeftColor: '#3b82f6',
          borderLeftWidth: '2px',
        },
        '.cm-content': {
          caretColor: '#3b82f6',
          color: '#e2e8f0',
        },
        '.inline-edit-widget-container': {
          padding: '8px 0',
          zIndex: '100',
          margin: '8px 0',
        },
      }),
    ];

    const startState = EditorState.create({
      doc: value || '',
      extensions,
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, settings.theme, settings.fontSize, settings.tabSize, settings.wordWrap, readOnly, projectId, filePath]);

  // Update content when value prop changes
  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString();
      if (value !== currentValue) {
        const transaction = viewRef.current.state.update({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: value || '',
          },
        });
        viewRef.current.dispatch(transaction);
      }
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      style={{
        width: '100%',
        height: height,
        overflow: 'hidden',
        backgroundColor: '#020617',
        position: 'relative',
        fontFamily: 'Inter, system-ui, sans-serif',
        border: '1px solid #1e293b',
        borderRadius: '8px',
      }}
    >
      {/* Floating Prompt Button */}
      {selectionState.hasSelection && !inlineEditState.active && !readOnly && (
        <button
          ref={promptButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            showInlineEdit();
          }}
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent losing selection
            e.stopPropagation();
          }}
          className="absolute z-50 flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-lg transition-all duration-200 hover:shadow-xl"
          style={{
            top: `${Math.max(8, selectionState.position.top)}px`,
            left: `${Math.max(8, selectionState.position.left)}px`,
            pointerEvents: 'auto',
          }}
          title="AI Edit (Cmd/Ctrl+K)"
        >
          <Sparkles size={14} />
          <span>AI Edit</span>
        </button>
      )}
    </div>
  );
};

export default CodeMirrorEditorWithInlineEdit;
