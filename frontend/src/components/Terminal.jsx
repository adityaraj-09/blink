import { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, X, Trash2, Copy, ChevronRight } from 'lucide-react';

const Terminal = ({ onClose }) => {
  const [output, setOutput] = useState([
    { type: 'info', text: 'Welcome to integrated terminal!' },
    { type: 'info', text: 'Note: This is a simulated terminal. Backend integration required for real shell.' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleCommand = (cmd) => {
    if (!cmd.trim()) return;

    // Add command to output
    setOutput(prev => [...prev, { type: 'command', text: cmd }]);
    setHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    // Simulate command execution
    const parts = cmd.trim().split(' ');
    const command = parts[0].toLowerCase();

    let response;
    switch (command) {
      case 'help':
        response = [
          { type: 'success', text: 'Available commands:' },
          { type: 'info', text: '  help     - Show this help message' },
          { type: 'info', text: '  clear    - Clear terminal' },
          { type: 'info', text: '  echo     - Echo text' },
          { type: 'info', text: '  date     - Show current date' },
          { type: 'info', text: '  ls       - List files (simulated)' },
          { type: 'info', text: '  pwd      - Print working directory' },
        ];
        break;
      case 'clear':
        setOutput([]);
        return;
      case 'echo':
        response = [{ type: 'output', text: parts.slice(1).join(' ') }];
        break;
      case 'date':
        response = [{ type: 'output', text: new Date().toString() }];
        break;
      case 'ls':
        response = [
          { type: 'output', text: 'src/' },
          { type: 'output', text: 'public/' },
          { type: 'output', text: 'package.json' },
          { type: 'output', text: 'README.md' },
        ];
        break;
      case 'pwd':
        response = [{ type: 'output', text: '/project' }];
        break;
      case '':
        return;
      default:
        response = [
          {
            type: 'error',
            text: `Command not found: ${command}. Type 'help' for available commands.`
          }
        ];
    }

    setOutput(prev => [...prev, ...response]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      }
    }
  };

  const handleClear = () => {
    setOutput([]);
  };

  const handleCopy = () => {
    const text = output.map(o => o.text).join('\n');
    navigator.clipboard.writeText(text);
  };

  const getLineColor = (type) => {
    switch (type) {
      case 'command':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'success':
        return 'text-green-300';
      case 'info':
        return 'text-blue-300';
      case 'output':
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0e0e0e] border-t border-[#2d2d2d]">
      {/* Header */}
      <div className="px-4 py-2 bg-[#181818] border-b border-[#2d2d2d] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon size={16} />
          <span className="text-sm font-semibold">Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Copy output"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={handleClear}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Clear"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1"
      >
        {output.map((line, index) => (
          <div key={index} className="flex items-start gap-2">
            {line.type === 'command' && (
              <ChevronRight size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
            )}
            <span className={getLineColor(line.type)}>{line.text}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-[#181818] border-t border-[#2d2d2d] flex items-center gap-2 font-mono text-sm">
        <ChevronRight size={14} className="text-green-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-gray-200"
          placeholder="Type a command..."
          autoFocus
        />
      </div>
    </div>
  );
};

export default Terminal;
