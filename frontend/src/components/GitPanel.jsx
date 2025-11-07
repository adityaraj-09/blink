import { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit,
  Upload,
  Download,
  RefreshCw,
  Check,
  X,
  Clock,
  Loader2,
  Plus,
  Minus,
  File
} from 'lucide-react';
import { useAPIAuth } from '../hooks/useAPI';
import {
  getPendingChanges,
  stageChanges,
  unstageChanges,
  revertChanges,
  commitChanges,
  pushToGitHub,
  getCommitHistory
} from '../api/files';

const GitPanel = ({ projectId, onClose }) => {
  const [changes, setChanges] = useState([]);
  const [commits, setCommits] = useState([]);
  const [commitMessage, setCommitMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [activeTab, setActiveTab] = useState('changes'); // 'changes' or 'history'

  useAPIAuth();

  useEffect(() => {
    loadGitData();
  }, [projectId]);

  const loadGitData = async () => {
    try {
      setLoading(true);
      const [changesData, commitsData] = await Promise.all([
        getPendingChanges(projectId),
        getCommitHistory(projectId, 20)
      ]);
      setChanges(changesData.changes);
      setCommits(commitsData.commits);
    } catch (err) {
      console.error('Failed to load git data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStage = async (changeId) => {
    try {
      await stageChanges(projectId, [changeId]);
      await loadGitData();
    } catch (err) {
      console.error('Failed to stage:', err);
      alert(`Failed to stage: ${err.message}`);
    }
  };

  const handleUnstage = async (changeId) => {
    try {
      await unstageChanges(projectId, [changeId]);
      await loadGitData();
    } catch (err) {
      console.error('Failed to unstage:', err);
      alert(`Failed to unstage: ${err.message}`);
    }
  };

  const handleStageAll = async () => {
    try {
      await stageChanges(projectId, 'all');
      await loadGitData();
    } catch (err) {
      console.error('Failed to stage all:', err);
      alert(`Failed to stage all: ${err.message}`);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      alert('Please enter a commit message');
      return;
    }

    try {
      setCommitting(true);
      await commitChanges(projectId, commitMessage.trim());
      setCommitMessage('');
      await loadGitData();
      alert('✓ Commit created successfully!');
    } catch (err) {
      console.error('Failed to commit:', err);
      alert(`Failed to commit: ${err.message}`);
    } finally {
      setCommitting(false);
    }
  };

  const handlePush = async () => {
    if (!confirm('Push commits to GitHub?')) return;

    try {
      setPushing(true);
      const result = await pushToGitHub(projectId);
      alert(`✓ Pushed ${result.pushedCommits} commits to ${result.branch}!`);
      await loadGitData();
    } catch (err) {
      console.error('Failed to push:', err);
      alert(`Failed to push: ${err.message}`);
    } finally {
      setPushing(false);
    }
  };

  const stagedChanges = changes.filter(c => c.staged);
  const unstagedChanges = changes.filter(c => !c.staged);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getChangeIcon = (changeType) => {
    switch (changeType) {
      case 'created':
        return <Plus size={14} className="text-green-400" />;
      case 'deleted':
        return <Minus size={14} className="text-red-400" />;
      case 'modified':
      default:
        return <File size={14} className="text-blue-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#181818] border-l border-[#2d2d2d]">
      {/* Header */}
      <div className="p-4 border-b border-[#2d2d2d] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={20} />
          <h2 className="text-lg font-semibold">Git</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadGitData}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2d2d2d]">
        <button
          onClick={() => setActiveTab('changes')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'changes'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Changes ({changes.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          History ({commits.length})
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'changes' ? (
            <div className="p-4 space-y-4">
              {/* Commit Section */}
              {stagedChanges.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-300">Commit Message</h3>
                    <button
                      onClick={handleStageAll}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Stage All
                    </button>
                  </div>
                  <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Enter commit message..."
                    className="w-full bg-[#0e0e0e] border border-gray-700 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCommit}
                      disabled={committing || !commitMessage.trim()}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                      {committing ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Committing...
                        </>
                      ) : (
                        <>
                          <GitCommit size={14} />
                          Commit
                        </>
                      )}
                    </button>
                    <button
                      onClick={handlePush}
                      disabled={pushing}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                    >
                      {pushing ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Staged Changes */}
              {stagedChanges.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">
                    Staged Changes ({stagedChanges.length})
                  </h3>
                  <div className="space-y-1">
                    {stagedChanges.map(change => (
                      <div
                        key={change.id}
                        className="flex items-center gap-2 p-2 bg-[#0e0e0e] rounded hover:bg-gray-800 transition-colors group"
                      >
                        {getChangeIcon(change.changeType)}
                        <span className="flex-1 text-sm truncate">{change.filePath}</span>
                        <button
                          onClick={() => handleUnstage(change.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                          title="Unstage"
                        >
                          <Minus size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unstaged Changes */}
              {unstagedChanges.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">
                    Unstaged Changes ({unstagedChanges.length})
                  </h3>
                  <div className="space-y-1">
                    {unstagedChanges.map(change => (
                      <div
                        key={change.id}
                        className="flex items-center gap-2 p-2 bg-[#0e0e0e] rounded hover:bg-gray-800 transition-colors group"
                      >
                        {getChangeIcon(change.changeType)}
                        <span className="flex-1 text-sm truncate">{change.filePath}</span>
                        <button
                          onClick={() => handleStage(change.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                          title="Stage"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Changes */}
              {changes.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Check size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No changes</p>
                  <p className="text-xs mt-1">Working tree clean</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {commits.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <GitCommit size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No commits yet</p>
                </div>
              ) : (
                commits.map(commit => (
                  <div
                    key={commit.sha}
                    className="p-3 bg-[#0e0e0e] rounded hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <GitCommit size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {commit.message.split('\n')[0]}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{commit.author}</span>
                          <span>•</span>
                          <span>{formatDate(commit.committedAt)}</span>
                          {commit.pushed && (
                            <>
                              <span>•</span>
                              <span className="text-green-400">Pushed</span>
                            </>
                          )}
                        </div>
                        <code className="text-xs text-gray-600 mt-1 block">
                          {commit.sha.substring(0, 7)}
                        </code>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GitPanel;
