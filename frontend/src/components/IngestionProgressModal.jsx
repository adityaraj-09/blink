import { useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useIngestionStatus } from '../hooks/useIngestionStatus';

const IngestionProgressModal = ({ projectId, projectName, onComplete, onClose }) => {
  const { status, loading, error, isComplete, isFailed, isProcessing, progress } =
    useIngestionStatus(projectId, !!projectId);

  // Call onComplete when ingestion finishes
  useEffect(() => {
    if (isComplete) {
      setTimeout(() => {
        onComplete();
      }, 1500); // Wait 1.5s to show success message
    }
  }, [isComplete, onComplete]);

  if (!projectId) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl shadow-black/50 max-w-md w-full p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-2">
            {isComplete ? 'Import Complete!' : isFailed ? 'Import Failed' : 'Importing Repository'}
          </h2>
          <p className="text-sm text-gray-400">{projectName}</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-16 h-16 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
              </div>
            </div>
            <p className="text-sm text-gray-400">Initializing import...</p>
          </div>
        )}

        {/* Error State */}
        {error && !status && (
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl" />
                <XCircle className="relative w-16 h-16 text-red-500" />
              </div>
            </div>
            <p className="text-center text-sm text-gray-400 mb-6">{error}</p>
            <button
              onClick={onClose}
              className="w-full bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Processing/Complete/Failed State */}
        {status && (
          <div>
            {/* Status Icon */}
            <div className="flex items-center justify-center mb-6">
              {isComplete && (
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-xl animate-pulse" />
                  <CheckCircle className="relative w-20 h-20 text-emerald-500" />
                </div>
              )}
              {isFailed && (
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl" />
                  <XCircle className="relative w-20 h-20 text-red-500" />
                </div>
              )}
              {isProcessing && (
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                  <Loader2 className="relative w-20 h-20 text-blue-500 animate-spin" />
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">Progress</span>
                  <span className="font-semibold text-white">{progress}%</span>
                </div>
                <div className="w-full bg-[#21262d] rounded-full h-3 overflow-hidden border border-[#30363d]">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-blue-400 h-full transition-all duration-300 rounded-full relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {/* Details */}
            <div className="space-y-3 mb-6 p-4 bg-[#0d1117] rounded-xl border border-[#30363d]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Files Processed</span>
                <span className="font-semibold text-white">
                  {status.ingestion.processedFiles} / {status.ingestion.totalFiles}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Code Chunks Created</span>
                <span className="font-semibold text-white">
                  {status.ingestion.totalChunks.toLocaleString()}
                </span>
              </div>

              {status.ingestion.currentFile && (
                <div className="pt-3 border-t border-[#30363d]">
                  <p className="text-xs text-gray-500 mb-1">Currently processing:</p>
                  <p className="text-xs font-mono text-emerald-400 truncate">
                    {status.ingestion.currentFile}
                  </p>
                </div>
              )}

              {status.ingestion.error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-xs font-semibold text-red-400">Error</p>
                    <p className="text-xs text-red-400/80">{status.ingestion.error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Status Messages */}
            {isComplete && (
              <div className="text-center mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm font-semibold text-emerald-400">
                    Repository imported successfully!
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  Redirecting to editor...
                </p>
              </div>
            )}

            {isFailed && (
              <div className="text-center mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-sm font-semibold text-red-400 mb-1">
                  Import failed
                </p>
                <p className="text-xs text-gray-400">
                  {status.ingestion.error || 'An unknown error occurred'}
                </p>
              </div>
            )}

            {/* Action Button */}
            {(isFailed || isComplete) && (
              <button
                onClick={onClose}
                className={`w-full font-medium py-2.5 px-4 rounded-lg transition-all ${
                  isFailed
                    ? 'bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-gray-300'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30'
                }`}
              >
                {isFailed ? 'Close' : 'Continue'}
              </button>
            )}

            {/* Info Message for Processing */}
            {isProcessing && (
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  This may take a few minutes depending on repository size...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IngestionProgressModal;
