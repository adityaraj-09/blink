import React, { useState, useEffect, useRef } from 'react';
import { Search, File, X } from 'lucide-react';
import { getFileIcon } from '../utils/fileIcons';

const FileSearchModal = ({ isOpen, onClose, files, onFileSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Fuzzy search files
  const filteredFiles = files.filter(file => {
    const searchLower = searchTerm.toLowerCase();
    const pathLower = file.path.toLowerCase();

    if (!searchTerm) return true;

    // Simple fuzzy matching
    let searchIndex = 0;
    for (let i = 0; i < pathLower.length && searchIndex < searchLower.length; i++) {
      if (pathLower[i] === searchLower[searchIndex]) {
        searchIndex++;
      }
    }
    return searchIndex === searchLower.length;
  }).slice(0, 50); // Limit to 50 results

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
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl bg-[#1e1e1e] rounded-lg shadow-2xl z-50 border border-gray-700">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-700">
          <Search size={20} className="text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files... (type to filter)"
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500"
          />
          <button
            onClick={() => {
              onClose();
              setSearchTerm('');
            }}
            className="text-gray-400 hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <File size={48} className="mx-auto mb-2 opacity-50" />
              <p>No files found</p>
            </div>
          ) : (
            filteredFiles.map((file, index) => {
              const iconOrPath = getFileIcon(file.path);
              const isImage = typeof iconOrPath === 'string';

              return (
                <div
                  key={file.path}
                  onClick={() => handleFileClick(file)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  {isImage ? (
                    <div className="w-4 h-4 flex items-center justify-center bg-black rounded">
                      <img src={iconOrPath} alt="" className="w-3 h-3" />
                    </div>
                  ) : (
                    React.createElement(iconOrPath, {
                      size: 16,
                      className: index === selectedIndex ? 'text-white' : 'text-gray-400'
                    })
                  )}
                  <span className="flex-1 truncate">{file.path}</span>
                  {searchTerm && (
                    <span className="text-xs text-gray-500">
                      {file.name}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <div>{filteredFiles.length} files</div>
        </div>
      </div>
    </>
  );
};

export default FileSearchModal;
