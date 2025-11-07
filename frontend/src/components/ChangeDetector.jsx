/**
 * Change Detector Component
 * Shows Merkle tree change detection UI
 */

import { useEffect } from 'react';
import { AlertCircle, CheckCircle, Upload, GitCommit } from 'lucide-react';
import { formatChangeSummary } from '../services/merkle';

const ChangeDetector = ({
  projectId,
  files,
  changeSummary,
  hasChanges,
  isIngesting,
  ingestionProgress,
  onIndexChanges,
  onDismiss,
}) => {
  if (!hasChanges || !changeSummary) {
    return null;
  }

  const getProgressStage = () => {
    if (!isIngesting) return null;

    switch (ingestionProgress.stage) {
      case 'chunking':
        return `Chunking file ${ingestionProgress.current}/${ingestionProgress.total}...`;
      case 'hashing':
        return `Hashing file ${ingestionProgress.current}/${ingestionProgress.total}...`;
      case 'uploading':
        return 'Uploading to backend...';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/50 rounded-lg p-4 mb-3 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-0.5">
            <GitCommit size={20} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-white">Changes Detected</h3>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                {changeSummary.total} files
              </span>
            </div>

            <div className="text-xs text-gray-300 space-y-1">
              <div className="flex items-center gap-4">
                {changeSummary.added > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="text-green-400">➕</span>
                    {changeSummary.added} added
                  </span>
                )}
                {changeSummary.modified > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="text-yellow-400">📝</span>
                    {changeSummary.modified} modified
                  </span>
                )}
                {changeSummary.deleted > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="text-red-400">❌</span>
                    {changeSummary.deleted} deleted
                  </span>
                )}
              </div>

              {isIngesting && (
                <div className="flex items-center gap-2 mt-2 text-blue-300">
                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span>{getProgressStage()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isIngesting && (
            <>
              <button
                onClick={onIndexChanges}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors"
                title="Index changes and update embeddings"
              >
                <Upload size={14} />
                Index Changes
              </button>
              <button
                onClick={onDismiss}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Dismiss"
              >
                <AlertCircle size={14} className="text-gray-400" />
              </button>
            </>
          )}
        </div>
      </div>

      {isIngesting && ingestionProgress.total > 0 && (
        <div className="mt-3">
          <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{
                width: `${(ingestionProgress.current / ingestionProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeDetector;
