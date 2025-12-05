/**
 * ZIP Import Modal
 * Allows users to upload a ZIP file, unzip it client-side, and import the project
 */

import { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import {
  X,
  Upload,
  FileArchive,
  AlertCircle,
  Loader2,
  File,
  Folder,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { importFromZip } from '../api/zipImport';

// Files/directories to ignore when processing ZIP
const IGNORE_PATTERNS = [
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'out',
  'coverage',
  '.cache',
  'vendor',
  'target',
  '__pycache__',
  '.pytest_cache',
  '.venv',
  'venv',
  '__MACOSX',
  '.DS_Store',
];

// File extensions to ignore
const IGNORE_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.mp4', '.mov', '.avi', '.mkv',
  '.mp3', '.wav', '.ogg',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.pdf', '.doc', '.docx',
  '.exe', '.dll', '.so', '.dylib',
  '.lock', '.log',
  '.min.js', '.min.css',
  '.map',
];

// Supported code file extensions
const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
  '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.sh',
  '.sql', '.html', '.css', '.scss', '.json', '.yaml', '.yml', '.xml', '.md', '.txt',
];

function shouldProcessFile(filePath) {
  const pathParts = filePath.split('/');

  // Check if path contains ignored directories
  for (const part of pathParts) {
    if (IGNORE_PATTERNS.includes(part)) {
      return false;
    }
  }

  // Check file extension
  const ext = '.' + (filePath.split('.').pop()?.toLowerCase() || '');

  if (IGNORE_EXTENSIONS.includes(ext)) {
    return false;
  }

  // Must be a supported code file
  return CODE_EXTENSIONS.includes(ext);
}

const ZipImportModal = ({ isOpen, onClose, onImportSuccess }) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [zipFile, setZipFile] = useState(null);
  const [extractedFiles, setExtractedFiles] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Reset form
  const handleClose = () => {
    setProjectName('');
    setDescription('');
    setZipFile(null);
    setExtractedFiles(null);
    setError(null);
    setValidationErrors({});
    setDragActive(false);
    onClose();
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (file) => {
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setError('Please select a valid ZIP file');
      return;
    }

    setZipFile(file);
    setError(null);
    setExtracting(true);

    try {
      const zip = await JSZip.loadAsync(file);
      const files = {};
      let totalFiles = 0;
      let skippedFiles = 0;

      // Find common root folder (many ZIPs have a single root folder)
      const allPaths = Object.keys(zip.files);
      let rootPrefix = '';

      if (allPaths.length > 0) {
        const firstPath = allPaths[0];
        const parts = firstPath.split('/');
        if (parts.length > 1 && !zip.files[firstPath].dir === false) {
          // Check if all files start with the same folder
          const potentialRoot = parts[0] + '/';
          const allHaveSameRoot = allPaths.every(
            (p) => p.startsWith(potentialRoot) || p === parts[0]
          );
          if (allHaveSameRoot) {
            rootPrefix = potentialRoot;
          }
        }
      }

      // Extract files
      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        // Skip directories
        if (zipEntry.dir) continue;

        // Remove root prefix if exists
        let cleanPath = relativePath;
        if (rootPrefix && relativePath.startsWith(rootPrefix)) {
          cleanPath = relativePath.substring(rootPrefix.length);
        }

        // Skip empty paths
        if (!cleanPath) continue;

        // Check if file should be processed
        if (!shouldProcessFile(cleanPath)) {
          skippedFiles++;
          continue;
        }

        try {
          const content = await zipEntry.async('string');
          files[cleanPath] = {
            content,
            size: content.length,
          };
          totalFiles++;
        } catch (err) {
          console.warn(`Failed to extract ${cleanPath}:`, err);
          skippedFiles++;
        }
      }

      setExtractedFiles({
        files,
        totalFiles,
        skippedFiles,
      });

      // Auto-fill project name from ZIP file name
      if (!projectName) {
        const zipName = file.name.replace('.zip', '').replace(/[-_]/g, ' ');
        setProjectName(zipName);
      }
    } catch (err) {
      console.error('Failed to extract ZIP:', err);
      setError('Failed to extract ZIP file. Please make sure it is a valid ZIP archive.');
    } finally {
      setExtracting(false);
    }
  }, [projectName]);

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!projectName.trim()) {
      errors.projectName = 'Project name is required';
    } else if (projectName.trim().length < 3) {
      errors.projectName = 'Project name must be at least 3 characters';
    }

    if (!extractedFiles || extractedFiles.totalFiles === 0) {
      errors.zip = 'Please select a ZIP file with valid code files';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle import
  const handleImport = async () => {
    if (!validateForm()) return;

    setImporting(true);
    setError(null);

    try {
      const result = await importFromZip({
        projectName: projectName.trim(),
        description: description.trim() || undefined,
        files: extractedFiles.files,
      });

      console.log('✅ ZIP import started:', result);

      if (onImportSuccess) {
        onImportSuccess(result);
      }

      handleClose();
    } catch (err) {
      console.error('❌ Failed to import ZIP:', err);
      setError(err.message || 'Failed to import project. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <FileArchive size={20} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Import from ZIP</h2>
              <p className="text-xs text-gray-400">Upload a ZIP file to create a project</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[#21262d] rounded-lg transition-colors border border-transparent hover:border-[#30363d]"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-400 font-medium">Error</p>
                <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* ZIP File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ZIP File <span className="text-red-400">*</span>
            </label>
            <div
              className={`relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer ${
                dragActive
                  ? 'border-orange-500 bg-orange-500/10'
                  : zipFile
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-[#30363d] hover:border-[#484f58] bg-[#0d1117]'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={extracting || importing}
              />

              {extracting ? (
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-orange-400 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-300">Extracting files...</p>
                </div>
              ) : zipFile && extractedFiles ? (
                <div className="text-center">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-200">{zipFile.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {extractedFiles.totalFiles} code files extracted
                    {extractedFiles.skippedFiles > 0 && (
                      <span className="text-gray-500">
                        {' '}({extractedFiles.skippedFiles} skipped)
                      </span>
                    )}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setZipFile(null);
                      setExtractedFiles(null);
                    }}
                    className="mt-3 text-xs text-orange-400 hover:text-orange-300"
                  >
                    Change file
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-300">
                    Drop your ZIP file here or <span className="text-orange-400">browse</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Only code files will be extracted (ignores node_modules, images, etc.)
                  </p>
                </div>
              )}
            </div>
            {validationErrors.zip && (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle size={12} />
                {validationErrors.zip}
              </p>
            )}
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (validationErrors.projectName) {
                  setValidationErrors({ ...validationErrors, projectName: null });
                }
              }}
              placeholder="Enter project name"
              className={`w-full px-3 py-2.5 bg-[#0d1117] border ${
                validationErrors.projectName ? 'border-red-500/50' : 'border-[#30363d]'
              } rounded-lg text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all text-gray-100 placeholder-gray-500`}
              disabled={importing}
            />
            {validationErrors.projectName && (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle size={12} />
                {validationErrors.projectName}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-gray-500 text-xs font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description"
              rows={2}
              className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all text-gray-100 placeholder-gray-500 resize-none"
              disabled={importing}
            />
          </div>

          {/* Info Box */}
          <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-orange-500/10 rounded-lg">
                <Sparkles size={14} className="text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-orange-300 font-medium">
                  What happens next?
                </p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Your code will be processed and indexed for AI-powered code search and chat. Only code files are extracted (JS, TS, Python, etc.).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={importing}
              className="flex-1 px-4 py-2.5 bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] disabled:bg-[#161b22] disabled:text-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors text-gray-300 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || extracting || !extractedFiles}
              className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-white text-sm"
            >
              {importing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Import Project
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZipImportModal;
