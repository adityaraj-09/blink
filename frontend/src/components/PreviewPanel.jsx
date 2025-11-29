import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Tablet,
  Monitor,
  Globe,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react';

const DEVICE_SIZES = {
  mobile: { width: 375, height: 667, label: 'Mobile', icon: Smartphone },
  tablet: { width: 768, height: 1024, label: 'Tablet', icon: Tablet },
  desktop: { width: '100%', height: '100%', label: 'Desktop', icon: Monitor },
};

export default function PreviewPanel({ url, onClose }) {
  const iframeRef = useRef(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [deviceMode, setDeviceMode] = useState('desktop');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Panel position and size for dragging/resizing
  const [position, setPosition] = useState({ x: window.innerWidth - 520, y: 80 });
  const [size, setSize] = useState({ width: 500, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ width: 0, height: 0, x: 0, y: 0 });

  // Dragging handlers
  const handleDragStart = useCallback((e) => {
    if (isMaximized) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [position, isMaximized]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragStart.current.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragStart.current.y));
        setPosition({ x: newX, y: newY });
      }
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;
        const newWidth = Math.max(320, resizeStart.current.width + deltaX);
        const newHeight = Math.max(300, resizeStart.current.height + deltaY);
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isDragging ? 'move' : 'se-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isResizing, size.width]);

  // Resize handler
  const handleResizeStart = useCallback((e) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = {
      width: size.width,
      height: size.height,
      x: e.clientX,
      y: e.clientY,
    };
  }, [size, isMaximized]);

  // Refresh iframe
  const handleRefresh = () => {
    setIsRefreshing(true);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Copy URL
  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Open in new tab
  const handleOpenExternal = () => {
    window.open(url, '_blank');
  };

  // Toggle maximize
  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
    setIsMinimized(false);
  };

  // Toggle minimize
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    setIsMaximized(false);
  };

  const currentDevice = DEVICE_SIZES[deviceMode];
  const DeviceIcon = currentDevice.icon;

  // Calculate panel styles
  const panelStyle = isMaximized
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 100,
      }
    : {
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size.width,
        height: isMinimized ? 'auto' : size.height,
        zIndex: 100,
      };

  return (
    <div
      style={panelStyle}
      className="flex flex-col bg-[#0a0e1a] border border-[#1e293b] rounded-lg shadow-2xl overflow-hidden"
    >
      {/* Header - Draggable */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-[#0f172a] border-b border-[#1e293b] cursor-move select-none"
        onMouseDown={handleDragStart}
      >
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
              title={isMaximized ? 'Restore' : 'Maximize'}
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
            <Globe size={14} className="text-blue-400" />
            <span className="text-xs font-medium text-gray-300">Preview</span>
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
          {/* Device Mode Buttons */}
          {!isMinimized && (
            <div className="flex items-center gap-0.5 mr-2 bg-[#1e293b] rounded-md p-0.5">
              {Object.entries(DEVICE_SIZES).map(([key, device]) => {
                const Icon = device.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setDeviceMode(key)}
                    className={`p-1.5 rounded transition-all ${
                      deviceMode === key
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-[#334155]'
                    }`}
                    title={device.label}
                  >
                    <Icon size={12} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-[#1e293b] rounded transition-colors text-gray-400 hover:text-white"
            title="Refresh"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          {/* Copy URL */}
          <button
            onClick={handleCopyUrl}
            className="p-1.5 hover:bg-[#1e293b] rounded transition-colors text-gray-400 hover:text-white"
            title="Copy URL"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>

          {/* Open External */}
          <button
            onClick={handleOpenExternal}
            className="p-1.5 hover:bg-[#1e293b] rounded transition-colors text-gray-400 hover:text-white"
            title="Open in new tab"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* URL Bar */}
      {!isMinimized && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#020617] border-b border-[#1e293b]">
          <div className="flex-1 flex items-center gap-2 bg-[#1e293b] rounded-md px-3 py-1.5">
            <Globe size={12} className="text-gray-500" />
            <span className="text-xs text-gray-300 truncate font-mono">{url}</span>
          </div>
        </div>
      )}

      {/* Preview Content */}
      {!isMinimized && (
        <div className="flex-1 bg-[#1e293b] flex items-center justify-center overflow-hidden relative">
          {/* Device Frame */}
          <div
            className={`bg-white overflow-hidden transition-all duration-300 ${
              deviceMode !== 'desktop' ? 'rounded-lg shadow-2xl border-4 border-gray-800' : ''
            }`}
            style={{
              width: deviceMode === 'desktop' ? '100%' : currentDevice.width,
              height: deviceMode === 'desktop' ? '100%' : Math.min(currentDevice.height, size.height - 120),
              maxHeight: '100%',
            }}
          >
            <iframe
              ref={iframeRef}
              src={url}
              className="w-full h-full border-0"
              title="App Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          </div>

          {/* Device Info Badge */}
          {deviceMode !== 'desktop' && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#0a0e1a]/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 border border-[#1e293b]">
              <DeviceIcon size={12} className="text-blue-400" />
              <span className="text-[10px] text-gray-300">
                {currentDevice.width} × {currentDevice.height}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Resize Handle */}
      {!isMaximized && !isMinimized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize group"
          onMouseDown={handleResizeStart}
        >
          <svg
            className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
          </svg>
        </div>
      )}
    </div>
  );
}
