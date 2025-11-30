import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, File, X } from 'lucide-react';
import { getFileIcon } from '../utils/fileIcons';
import { searchFiles } from '../utils/fileSearch';

const FileSearchModal = ({ isOpen, onClose, files, onFileSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Robust fuzzy search files using utility
  const filteredFiles = useMemo(() => {
    if (!searchTerm.trim()) {
      return files.slice(0, 50);
    }
    
    const searchResults = searchFiles(
      files.map(f => ({ filePath: f.path, name: f.name, fileId: f.fileId })),
      searchTerm,
      { maxResults: 50, minScore: 0.1 }
    );
    
    // Map back to expected format with path property
    return searchResults.map(result => {
      const originalFile = files.find(f => f.path === result.file.filePath);
      return {
        path: result.file.filePath,
        name: result.file.name || originalFile?.name || result.file.filePath.split('/').pop(),
        fileId: result.file.fileId || originalFile?.fileId,
        _score: result.score,
        _matchType: result.matchType
      };
    });
  }, [files, searchTerm]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredFiles[selectedIndex]) {
        onFileSelect(filteredFiles[selectedIndex]);
        onClose();
        setSearchTerm('');
      }
    } else if (e.key === 'Escape') {
      onClose();
      setSearchTerm('');
    }
  };

  const handleFileClick = (file) => {
    onFileSelect(file);
    onClose();
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl bg-[#161b22] rounded-xl shadow-2xl shadow-black/50 z-50 border border-[#30363d]">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-[#30363d]">
          <Search size={20} className="text-emerald-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files by name or path... (e.g., 'src/comp' or 'Button.jsx')"
            className="flex-1 bg-transparent border-none outline-none text-gray-100 placeholder-gray-500"
          />
          <button
            onClick={() => {
              onClose();
              setSearchTerm('');
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-[#21262d] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {filteredFiles.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-[#21262d] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <File size={32} className="text-gray-600" />
              </div>
              <p className="text-gray-400 text-sm">No files found</p>
              <p className="text-gray-600 text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            filteredFiles.map((file, index) => {
              const iconOrPath = getFileIcon(file.path);
              const isImage = typeof iconOrPath === 'string';

              return (
                <div
                  key={file.path}
                  onClick={() => handleFileClick(file)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
                    index === selectedIndex
                      ? 'bg-emerald-500/20 text-emerald-400 border-l-2 border-emerald-400'
                      : 'hover:bg-[#21262d] text-gray-300 border-l-2 border-transparent'
                  }`}
                >
                  {isImage ? (
                    <div className="w-5 h-5 flex items-center justify-center bg-[#21262d] rounded">
                      <img src={iconOrPath} alt="" className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    React.createElement(iconOrPath, {
                      size: 16,
                      className: index === selectedIndex ? 'text-emerald-400' : 'text-gray-500'
                    })
                  )}
                  <span className="flex-1 truncate text-sm">{file.path}</span>
                  {searchTerm && (
                    <span className="text-xs text-gray-600 bg-[#21262d] px-2 py-0.5 rounded">
                      {file.name}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#30363d] bg-[#0d1117] rounded-b-xl">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-[#21262d] rounded text-gray-400 font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-[#21262d] rounded text-gray-400 font-mono">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-[#21262d] rounded text-gray-400 font-mono">Esc</kbd>
              Close
            </span>
          </div>
          <div className="text-xs text-gray-500">
            <span className="text-emerald-400 font-medium">{filteredFiles.length}</span> files
          </div>
        </div>
      </div>
    </>
  );
};

export default FileSearchModal;
