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
import InlineEditWidget from './InlineEditWidget';
import { getInlineEdit } from '../api/aiEdit';

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
  }

  eq(other) {
    return (
      other.props.selectedText === this.props.selectedText &&
      other.props.isLoading === this.props.isLoading &&
      other.props.error === this.props.error &&
      other.props.suggestion === this.props.suggestion
    );
  }

  toDOM() {
    const wrap = document.createElement('div');
    wrap.className = 'inline-edit-widget-container';
    wrap.style.cssText = 'margin: 8px 0; position: relative; z-index: 100;';

    const root = createRoot(wrap);
    root.render(
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
      />
    );

    return wrap;
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

  /**
   * Show inline edit widget
   */
  const showInlineEdit = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;

    const selection = view.state.selection.main;
    if (selection.empty) {
      alert('Please select code to edit');
      return;
    }

    const selectedText = view.state.doc.sliceString(selection.from, selection.to);
    const startLine = view.state.doc.lineAt(selection.from).number;
    const endLine = view.state.doc.lineAt(selection.to).number;

    setInlineEditState({
      active: true,
      selectedText,
      startPos: selection.from,
      endPos: selection.to,
      startLine,
      endLine,
      isLoading: false,
      error: null,
      suggestion: null,
    });

    // Dispatch effect to show widget
    view.dispatch({
      effects: showInlineEditEffect.of({
        pos: selection.to,
        props: {
          selectedText,
          onSubmit: handleInlineEditSubmit,
          onCancel: handleInlineEditCancel,
          isLoading: false,
          error: null,
          suggestion: null,
          onAccept: null,
          onReject: null,
        },
      }),
    });
  }, []);

  /**
   * Handle inline edit submission
   */
  const handleInlineEditSubmit = useCallback(
    async (instruction) => {
      const view = viewRef.current;
      if (!view || !projectId || !filePath) return;

      setInlineEditState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Update widget to show loading
      view.dispatch({
        effects: showInlineEditEffect.of({
          pos: inlineEditState.endPos,
          props: {
            selectedText: inlineEditState.selectedText,
            onSubmit: handleInlineEditSubmit,
            onCancel: handleInlineEditCancel,
            isLoading: true,
            error: null,
            suggestion: null,
            onAccept: null,
            onReject: null,
          },
        }),
      });

      try {
        // Call inline edit API
        const response = await getInlineEdit({
          projectId,
          filePath,
          selectedCode: inlineEditState.selectedText,
          instruction,
          startLine: inlineEditState.startLine,
          endLine: inlineEditState.endLine,
          language,
          fullFileContent: view.state.doc.toString(),
        });

        setInlineEditState((prev) => ({
          ...prev,
          isLoading: false,
          suggestion: response,
        }));

        // Update widget with suggestion
        view.dispatch({
          effects: showInlineEditEffect.of({
            pos: inlineEditState.endPos,
            props: {
              selectedText: inlineEditState.selectedText,
              onSubmit: handleInlineEditSubmit,
              onCancel: handleInlineEditCancel,
              isLoading: false,
              error: null,
              suggestion: response,
              onAccept: () => handleAcceptEdit(response),
              onReject: handleInlineEditCancel,
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
        view.dispatch({
          effects: showInlineEditEffect.of({
            pos: inlineEditState.endPos,
            props: {
              selectedText: inlineEditState.selectedText,
              onSubmit: handleInlineEditSubmit,
              onCancel: handleInlineEditCancel,
              isLoading: false,
              error: error.message || 'Failed to generate suggestion',
              suggestion: null,
              onAccept: null,
              onReject: null,
            },
          }),
        });
      }
    },
    [inlineEditState, projectId, filePath, language]
  );

  /**
   * Handle accepting edit
   */
  const handleAcceptEdit = useCallback(
    (suggestion) => {
      const view = viewRef.current;
      if (!view) return;

      // Replace selected text with edited code
      view.dispatch({
        changes: {
          from: inlineEditState.startPos,
          to: inlineEditState.endPos,
          insert: suggestion.editedCode,
        },
        effects: hideInlineEditEffect.of(),
      });

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
    [inlineEditState]
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
      }),

      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: `${settings.fontSize}px`,
        },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: 'JetBrains Mono, Fira Code, Consolas, Monaco, "Courier New", monospace',
        },
        '.inline-edit-widget-container': {
          padding: '8px 0',
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
        backgroundColor: '#1e1e1e',
        position: 'relative',
      }}
    />
  );
};

export default CodeMirrorEditorWithInlineEdit;
