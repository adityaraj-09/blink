import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import WebContainerService from '../services/webcontainer/WebContainerService';

/**
 * WebContainer Terminal Component
 * Integrates xterm.js with WebContainer for real shell execution
 */
export default function WebContainerTerminal({ projectId, files, onServerReady }) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const shellProcessRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const inputBufferRef = useRef('');
  const writerRef = useRef(null);

  useEffect(() => {
    let terminal = null;
    let fitAddon = null;
    let mounted = true;

    const initializeTerminal = async () => {
      try {
        // Create xterm instance
        terminal = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: '"Fira Code", "Courier New", monospace',
          theme: {
            background: '#1e1e1e',
            foreground: '#d4d4d4',
            cursor: '#ffffff',
            black: '#000000',
            red: '#cd3131',
            green: '#0dbc79',
            yellow: '#e5e510',
            blue: '#2472c8',
            magenta: '#bc3fbc',
            cyan: '#11a8cd',
            white: '#e5e5e5',
            brightBlack: '#666666',
            brightRed: '#f14c4c',
            brightGreen: '#23d18b',
            brightYellow: '#f5f543',
            brightBlue: '#3b8eea',
            brightMagenta: '#d670d6',
            brightCyan: '#29b8db',
            brightWhite: '#ffffff',
          },
          allowProposedApi: true,
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
          fitAddon.fit();
        }

        // Store references
        xtermRef.current = terminal;
        fitAddonRef.current = fitAddon;

        // Boot WebContainer
        terminal.writeln('🚀 Initializing WebContainer...');
        const container = await WebContainerService.getContainer();

        if (!mounted) return;

        terminal.writeln('✅ WebContainer ready');

        // Mount project files if provided
        if (files && Object.keys(files).length > 0) {
          terminal.writeln('📁 Mounting project files...');
          await WebContainerService.mountFiles(files);
          terminal.writeln(`✅ Mounted ${Object.keys(files).length} files`);
        }

        // Listen for server ready events
        if (onServerReady) {
          WebContainerService.onServerReady((port, url) => {
            terminal.writeln(`\n🌐 Server ready at: ${url}`);
            onServerReady(port, url);
          });
        }

        // Start interactive shell
        terminal.writeln('🐚 Starting shell...\n');

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
            terminal.writeln(`\n\n⚠️ Shell exited with code ${exitCode}`);
          }
        });
      } catch (err) {
        console.error('[WebContainerTerminal] Initialization error:', err);
        if (mounted) {
          setError(err.message);
          if (terminal) {
            terminal.writeln(`\n❌ Error: ${err.message}`);
          }
        }
      }
    };

    initializeTerminal();

    // Resize handler
    const handleResize = () => {
      if (fitAddon && terminal) {
        fitAddon.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);

      if (writerRef.current) {
        writerRef.current.releaseLock();
      }

      if (shellProcessRef.current) {
        shellProcessRef.current.kill();
      }

      if (terminal) {
        terminal.dispose();
      }
    };
  }, [projectId, onServerReady]);

  // Re-mount files when they change
  useEffect(() => {
    if (isReady && files && Object.keys(files).length > 0) {
      const syncFiles = async () => {
        try {
          await WebContainerService.mountFiles(files);
          if (xtermRef.current) {
            xtermRef.current.writeln(`\n✅ Synced ${Object.keys(files).length} files`);
          }
        } catch (err) {
          console.error('[WebContainerTerminal] File sync error:', err);
          if (xtermRef.current) {
            xtermRef.current.writeln(`\n❌ Sync error: ${err.message}`);
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
      // Write command to shell input
      await writerRef.current.write(command + '\n');
    } catch (err) {
      console.error('[WebContainerTerminal] Command execution error:', err);
      if (xtermRef.current) {
        xtermRef.current.writeln(`\n❌ Error: ${err.message}`);
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

  // Expose methods via ref
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.executeCommand = executeCommand;
      terminalRef.current.clear = clearTerminal;
    }
  }, [isReady]);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-2 text-sm text-gray-400">
            {isReady ? '🟢 Terminal Ready' : '🟡 Initializing...'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearTerminal}
            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            disabled={!isReady}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/20 border-b border-red-700">
          <p className="text-sm text-red-400">❌ {error}</p>
        </div>
      )}

      {/* Terminal Container */}
      <div ref={terminalRef} className="flex-1 p-2 overflow-hidden" />
    </div>
  );
}
