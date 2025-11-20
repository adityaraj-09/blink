/**
 * Professional CodeMirror v6 Editor Component
 * Features: Syntax highlighting, auto-completion, multi-cursor, search, vim mode
 */

import { useEffect, useRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle, foldGutter, foldKeymap } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, completionKeymap, autocompletion } from '@codemirror/autocomplete';
import { lintKeymap, lintGutter } from '@codemirror/lint';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';

// Language support
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';

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
 * Create custom theme based on settings
 */
const createCustomTheme = (settings) => {
  return EditorView.theme({
    '&': {
      fontSize: `${settings.fontSize}px`,
      lineHeight: settings.lineHeight,
    },
    '.cm-content': {
      fontFamily: 'JetBrains Mono, Fira Code, Consolas, Monaco, "Courier New", monospace',
      caretColor: '#528bff',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#528bff',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: '#264f78',
    },
    '.cm-activeLine': {
      backgroundColor: '#1a1a1a',
    },
    '.cm-gutters': {
      backgroundColor: '#1e1e1e',
      color: '#858585',
      border: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#1a1a1a',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: '#3c3c3c',
      border: 'none',
      color: '#858585',
    },
    '.cm-tooltip': {
      border: '1px solid #3c3c3c',
      backgroundColor: '#252526',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: '#094771',
      color: '#ffffff',
    },
  }, { dark: settings.theme === 'vs-dark' || settings.theme === 'oneDark' });
};

/**
 * CodeMirror Editor Component
 */
const CodeMirrorEditor = ({
  value = '',
  language = 'javascript',
  onChange,
  onSave,
  settings = {
    fontSize: 14,
    tabSize: 4,
    wordWrap: false,
    minimap: false,
    lineHeight: 1.5,
    theme: 'vs-dark',
  },
  readOnly = false,
  height = '100%',
}) => {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current) return;

    // Create extensions
    const extensions = [
      // Basic editing
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),

      // Gutters
      lintGutter(),

      // Language support
      getLanguageExtension(language),

      // Theme
      settings.theme === 'oneDark' ? oneDark : createCustomTheme(settings),

      // Tab size
      EditorState.tabSize.of(settings.tabSize || 4),

      // Word wrap
      settings.wordWrap ? EditorView.lineWrapping : [],

      // Read-only
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),

      // Keymaps
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
        indentWithTab,
        // Custom save keybinding
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
      ]),

      // Update listener
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onChange) {
          const newValue = update.state.doc.toString();
          onChange(newValue);
        }
      }),

      // Styling
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: `${settings.fontSize}px`,
        },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: 'JetBrains Mono, Fira Code, Consolas, Monaco, "Courier New", monospace',
        },
      }),
    ];

    // Create editor state
    const startState = EditorState.create({
      doc: value || '',
      extensions,
    });

    // Create editor view
    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;
    setIsReady(true);

    // Cleanup
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, settings.theme, settings.fontSize, settings.tabSize, settings.wordWrap, readOnly]); // Recreate on settings change

  // Update content when value prop changes (but only if different from current content)
  useEffect(() => {
    if (viewRef.current && isReady) {
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
  }, [value, isReady]);

  return (
    <div
      ref={editorRef}
      style={{
        width: '100%',
        height: height,
        overflow: 'hidden',
        backgroundColor: '#1e1e1e',
      }}
    />
  );
};

export default CodeMirrorEditor;
