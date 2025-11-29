import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import WebContainerService from '../services/webcontainer/WebContainerService';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Terminal as TerminalIcon,
  Play,
  Package,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Loader2,
} from 'lucide-react';

/**
 * WebContainer Terminal Component
 * Resizable terminal with improved UI
 */
export default function WebContainerTerminal({
  projectId,
  files,
  onServerReady,
  onClose,
  defaultHeight = 300,
  minHeight = 150,
  maxHeight = 600,
}) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const shellProcessRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const writerRef = useRef(null);

  // Resizing state
  const [height, setHeight] = useState(defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const resizeStartY = useRef(0);
  const resizeStartHeight = useRef(0);

  // Quick commands state
  const [runningCommand, setRunningCommand] = useState(null);

  useEffect(() => {
    let terminal = null;
    let fitAddon = null;
    let mounted = true;

    const initializeTerminal = async () => {
      try {
        // Create xterm instance with improved theme
        terminal = new Terminal({
          cursorBlink: true,
          fontSize: 13,
          fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, monospace',
          fontWeight: '400',
          letterSpacing: 0,
          lineHeight: 1.4,
          theme: {
            background: '#0a0e1a',
            foreground: '#e2e8f0',
            cursor: '#60a5fa',
            cursorAccent: '#0a0e1a',
            selectionBackground: '#334155',
            selectionForeground: '#f8fafc',
            black: '#1e293b',
            red: '#f87171',
            green: '#4ade80',
            yellow: '#fbbf24',
            blue: '#60a5fa',
            magenta: '#c084fc',
            cyan: '#22d3ee',
            white: '#f1f5f9',
            brightBlack: '#475569',
            brightRed: '#fca5a5',
            brightGreen: '#86efac',
            brightYellow: '#fde047',
            brightBlue: '#93c5fd',
            brightMagenta: '#d8b4fe',
            brightCyan: '#67e8f9',
            brightWhite: '#ffffff',
          },
          allowProposedApi: true,
          scrollback: 5000,
          smoothScrollDuration: 100,
        });

        // Add fit addon for responsive sizing
        fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);

        // Add web links addon
        const webLinksAddon = new WebLinksAddon();
        terminal.loadAddon(webLinksAddon);

        // Open terminal in DOM
        if (terminalRef.current) {
          terminal.open(terminalRef.current);
          // Small delay to ensure DOM is ready
          setTimeout(() => fitAddon.fit(), 50);
        }

        // Store references
        xtermRef.current = terminal;
        fitAddonRef.current = fitAddon;

        // Boot WebContainer
        terminal.writeln('\x1b[38;5;39m⚡ Initializing WebContainer...\x1b[0m');
        const container = await WebContainerService.getContainer();

        if (!mounted) return;

        terminal.writeln('\x1b[38;5;82m✓ WebContainer ready\x1b[0m');

        // Mount project files if provided
        if (files && Object.keys(files).length > 0) {
          terminal.writeln('\x1b[38;5;214m📁 Mounting project files...\x1b[0m');
          await WebContainerService.mountFiles(files);
          terminal.writeln(`\x1b[38;5;82m✓ Mounted ${Object.keys(files).length} files\x1b[0m`);
        }

        // Listen for server ready events
        if (onServerReady) {
          WebContainerService.onServerReady((port, url) => {
            terminal.writeln(`\n\x1b[38;5;51m🌐 Server ready at: \x1b[4m${url}\x1b[0m`);
            onServerReady(port, url);
          });
        }

        // Start interactive shell
        terminal.writeln('\x1b[38;5;245m─────────────────────────────────────\x1b[0m');
        terminal.writeln('');

        const shellProcess = await container.spawn('jsh', [], {
          terminal: {
            cols: terminal.cols,
            rows: terminal.rows,
          },
        });

        shellProcessRef.current = shellProcess;

        // Get writable stream for input
        const writer = shellProcess.input.getWriter();
        writerRef.current = writer;

        // Pipe shell output to terminal
        shellProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              if (mounted && terminal) {
                terminal.write(data);
              }
            },
          })
        );

        // Handle terminal input
        terminal.onData((data) => {
          if (writer) {
            writer.write(data);
          }
        });

        // Handle terminal resize
        terminal.onResize(({ cols, rows }) => {
          if (shellProcess) {
            shellProcess.resize({ cols, rows });
          }
        });

        setIsReady(true);

        // Handle shell process exit
        shellProcess.exit.then((exitCode) => {
          if (mounted && terminal) {
            terminal.writeln(`\n\x1b[38;5;208m⚠ Shell exited with code ${exitCode}\x1b[0m`);
          }
        });
      } catch (err) {
        console.error('[WebContainerTerminal] Initialization error:', err);
        if (mounted) {
          setError(err.message);
          if (terminal) {
            terminal.writeln(`\n\x1b[38;5;196m✗ Error: ${err.message}\x1b[0m`);
          }
        }
      }
    };

    initializeTerminal();

    // Cleanup
    return () => {
      mounted = false;

      if (writerRef.current) {
        try {
          writerRef.current.releaseLock();
        } catch (e) {}
      }

      if (shellProcessRef.current) {
        shellProcessRef.current.kill();
      }

      if (terminal) {
        terminal.dispose();
      }
    };
  }, [projectId, onServerReady]);

  // Re-fit terminal when height changes
  useEffect(() => {
    if (fitAddonRef.current && xtermRef.current && !isMinimized) {
      setTimeout(() => {
        fitAddonRef.current.fit();
      }, 50);
    }
  }, [height, isMinimized, isMaximized]);

  // Resize handlers
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = height;
  }, [height]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      const deltaY = resizeStartY.current - e.clientY;
      const newHeight = Math.min(maxHeight, Math.max(minHeight, resizeStartHeight.current + deltaY));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, minHeight, maxHeight]);

  // Re-mount files when they change
  useEffect(() => {
    if (isReady && files && Object.keys(files).length > 0) {
      const syncFiles = async () => {
        try {
          await WebContainerService.mountFiles(files);
          if (xtermRef.current) {
            xtermRef.current.writeln(`\n\x1b[38;5;82m✓ Synced ${Object.keys(files).length} files\x1b[0m`);
          }
        } catch (err) {
          console.error('[WebContainerTerminal] File sync error:', err);
          if (xtermRef.current) {
            xtermRef.current.writeln(`\n\x1b[38;5;196m✗ Sync error: ${err.message}\x1b[0m`);
          }
        }
      };

      syncFiles();
    }
  }, [files, isReady]);

  /**
   * Execute a command programmatically
   */
  const executeCommand = async (command) => {
    if (!isReady || !writerRef.current) {
      console.warn('[WebContainerTerminal] Terminal not ready');
      return;
    }

    try {
      setRunningCommand(command);
      await writerRef.current.write(command + '\n');
      // Clear running command after a short delay
      setTimeout(() => setRunningCommand(null), 500);
    } catch (err) {
      console.error('[WebContainerTerminal] Command execution error:', err);
      setRunningCommand(null);
      if (xtermRef.current) {
        xtermRef.current.writeln(`\n\x1b[38;5;196m✗ Error: ${err.message}\x1b[0m`);
      }
    }
  };

  /**
   * Clear terminal
   */
  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  /**
   * Toggle minimize
   */
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    setIsMaximized(false);
  };

  /**
   * Toggle maximize
   */
  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
    setIsMinimized(false);
  };

  // Quick command buttons
  const quickCommands = [
    { label: 'npm install', command: 'npm install', icon: Package, color: 'text-green-400' },
    { label: 'npm run dev', command: 'npm run dev', icon: Play, color: 'text-blue-400' },
    { label: 'npm run build', command: 'npm run build', icon: Package, color: 'text-yellow-400' },
  ];

  const terminalHeight = isMinimized ? 0 : (isMaximized ? 'calc(100vh - 200px)' : height);

  return (
    <div
      className="flex flex-col bg-[#0a0e1a] border-t border-[#1e293b] relative"
      style={{ height: isMinimized ? 'auto' : undefined }}
    >
      {/* Resize Handle */}
      {!isMinimized && !isMaximized && (
        <div
          className="absolute top-0 left-0 right-0 h-1 cursor-row-resize group z-10"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-transparent group-hover:bg-blue-500/50 transition-colors" />
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-12 h-1 bg-[#334155] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0f172a] border-b border-[#1e293b]">
        <div className="flex items-center gap-3">
          {/* Window Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors flex items-center justify-center group"
              title="Close"
            >
              <X size={8} className="text-red-900 opacity-0 group-hover:opacity-100" />
            </button>
            <button
              onClick={toggleMinimize}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors flex items-center justify-center group"
              title="Minimize"
            >
              <Minus size={8} className="text-yellow-900 opacity-0 group-hover:opacity-100" />
            </button>
            <button
              onClick={toggleMaximize}
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors flex items-center justify-center group"
              title="Maximize"
            >
              {isMaximized ? (
                <Minimize2 size={8} className="text-green-900 opacity-0 group-hover:opacity-100" />
              ) : (
                <Maximize2 size={8} className="text-green-900 opacity-0 group-hover:opacity-100" />
              )}
            </button>
          </div>

          {/* Title */}
          <div className="flex items-center gap-2">
            <TerminalIcon size={14} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-300">Terminal</span>
            {isReady ? (
              <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Ready
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                <Loader2 size={10} className="animate-spin" />
                Initializing
              </span>
            )}
          </div>
        </div>

        {/* Quick Commands & Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Command Buttons */}
          {!isMinimized && (
            <div className="flex items-center gap-1 mr-2">
              {quickCommands.map(({ label, command, icon: Icon, color }) => (
                <button
                  key={command}
                  onClick={() => executeCommand(command)}
                  disabled={!isReady || runningCommand === command}
                  className={`px-2 py-1 text-[10px] font-medium rounded transition-all flex items-center gap-1
                    ${runningCommand === command
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-[#1e293b] hover:bg-[#334155] text-gray-300 hover:text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={label}
                >
                  {runningCommand === command ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Icon size={10} className={color} />
                  )}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <button
            onClick={clearTerminal}
            className="p-1.5 hover:bg-[#1e293b] rounded transition-colors text-gray-400 hover:text-gray-200"
            disabled={!isReady}
            title="Clear Terminal"
          >
            <Trash2 size={14} />
          </button>

          <button
            onClick={toggleMinimize}
            className="p-1.5 hover:bg-[#1e293b] rounded transition-colors text-gray-400 hover:text-gray-200"
            title={isMinimized ? 'Expand' : 'Collapse'}
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && !isMinimized && (
        <div className="px-3 py-2 bg-red-900/20 border-b border-red-700/50 flex items-center gap-2">
          <span className="text-xs text-red-400">✗ {error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Terminal Container */}
      <div
        className="overflow-hidden transition-all duration-200"
        style={{ height: terminalHeight }}
      >
        <div
          ref={terminalRef}
          className="h-full p-2"
          style={{
            display: isMinimized ? 'none' : 'block',
          }}
        />
      </div>
    </div>
  );
}
