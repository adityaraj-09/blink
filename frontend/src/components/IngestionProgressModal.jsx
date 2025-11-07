import { useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {isComplete ? 'Import Complete!' : isFailed ? 'Import Failed' : 'Importing Repository'}
          </h2>
          <p className="text-sm text-gray-600">{projectName}</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600">Initializing import...</p>
          </div>
        )}

        {/* Error State */}
        {error && !status && (
          <div className="py-6">
            <div className="flex items-center justify-center mb-4">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <p className="text-center text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
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
              {isComplete && <CheckCircle className="w-16 h-16 text-green-500" />}
              {isFailed && <XCircle className="w-16 h-16 text-red-500" />}
              {isProcessing && <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />}
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-semibold text-gray-900">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Details */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Files Processed</span>
                <span className="font-semibold text-gray-900">
                  {status.ingestion.processedFiles} / {status.ingestion.totalFiles}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Code Chunks Created</span>
                <span className="font-semibold text-gray-900">
                  {status.ingestion.totalChunks.toLocaleString()}
                </span>
              </div>

              {status.ingestion.currentFile && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Currently processing:</p>
                  <p className="text-xs font-mono text-gray-700 truncate">
                    {status.ingestion.currentFile}
                  </p>
                </div>
              )}

              {status.ingestion.error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-xs font-semibold text-red-800">Error</p>
                    <p className="text-xs text-red-700">{status.ingestion.error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Status Messages */}
            {isComplete && (
              <div className="text-center mb-6">
                <p className="text-sm font-semibold text-green-700 mb-1">
                  Repository imported successfully!
                </p>
                <p className="text-xs text-gray-600">
                  Redirecting to editor...
                </p>
              </div>
            )}

            {isFailed && (
              <div className="text-center mb-6">
                <p className="text-sm font-semibold text-red-700 mb-1">
                  Import failed
                </p>
                <p className="text-xs text-gray-600">
                  {status.ingestion.error || 'An unknown error occurred'}
                </p>
              </div>
            )}

            {/* Action Button */}
            {(isFailed || isComplete) && (
              <button
                onClick={onClose}
                className="w-full bg-[#365eff] hover:bg-[#2d4ed8] text-white font-medium py-2 px-4 rounded-lg transition-colors"
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
