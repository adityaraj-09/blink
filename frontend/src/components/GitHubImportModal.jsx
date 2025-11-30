/**
 * GitHub Import Modal
 * Connect GitHub and import repositories
 */

import { useState, useEffect } from 'react';
import { X, Github, ExternalLink, GitBranch, Star, GitFork, Clock, Search, CheckCircle, Loader2 } from 'lucide-react';
import { useGitHub } from '../hooks/useGitHub';

const GitHubImportModal = ({ isOpen, onClose, onImportSuccess }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [importing, setImporting] = useState(false);

  const {
    isConnected,
    githubUsername,
    initiateAuth,
    checkAuthStatus,
    repositories,
    loadRepositories,
    importRepository,
    isLoading,
    error,
  } = useGitHub();

  useEffect(() => {
    if (isOpen) {
      // Check connection status when modal opens
      checkAuthStatus();
      if (isConnected) {
        loadRepositories();
      }
    }
  }, [isOpen, isConnected, checkAuthStatus]);

  const handleConnect = async () => {
    await initiateAuth();
  };

  const handleImport = async () => {
    if (!selectedRepo) return;

    setImporting(true);
    try {
      const projectId = await importRepository(selectedRepo, projectName || selectedRepo.name);

      if (projectId) {
        // Pass project data to parent
        const projectData = {
          projectId,
          name: projectName || selectedRepo.name,
          description: selectedRepo.description,
          language: selectedRepo.language,
          languageColor: selectedRepo.languageColor || '#858585',
          fullName: selectedRepo.fullName,
          cloneUrl: selectedRepo.cloneUrl,
          defaultBranch: selectedRepo.defaultBranch,
          files: [], // Will be populated by backend
        };

        onImportSuccess && onImportSuccess(projectData);
        onClose();
      }
    } finally {
      setImporting(false);
    }
  };

  const filteredRepos = repositories.filter((repo) =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#21262d] rounded-lg border border-[#30363d]">
              <Github size={20} className="text-gray-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Import from GitHub</h2>
              {isConnected && githubUsername && (
                <p className="text-xs text-gray-400">Connected as <span className="text-emerald-400">{githubUsername}</span></p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#21262d] rounded-lg transition-colors border border-transparent hover:border-[#30363d]"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!isConnected ? (
            /* Connect GitHub */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl" />
                  <div className="relative w-20 h-20 bg-[#21262d] rounded-full flex items-center justify-center border border-[#30363d]">
                    <Github size={36} className="text-gray-300" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Connect your GitHub account</h3>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                  Import repositories, sync changes, and collaborate seamlessly with GitHub integration.
                </p>
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition-all flex items-center gap-2 mx-auto text-white text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Github size={18} />
                  )}
                  {isLoading ? 'Connecting...' : 'Connect GitHub'}
                </button>
                {error && (
                  <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                    {error.message}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Repository List */
            <>
              {/* Search */}
              <div className="p-4 border-b border-[#30363d]">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search repositories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-gray-100 placeholder-gray-500"
                  />
                </div>
              </div>

              {/* Repository Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-3" />
                      <p className="text-sm text-gray-400">Loading repositories...</p>
                    </div>
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <p className="text-sm">No repositories found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredRepos.map((repo) => (
                      <div
                        key={repo.id}
                        onClick={() => {
                          setSelectedRepo(repo);
                          setProjectName(repo.name);
                        }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedRepo?.id === repo.id
                            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                            : 'bg-[#0d1117] border-[#30363d] hover:border-[#484f58] hover:bg-[#161b22]'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-semibold text-sm truncate ${selectedRepo?.id === repo.id ? 'text-emerald-400' : 'text-gray-100'}`}>
                                {repo.name}
                              </h3>
                              {repo.private && (
                                <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 text-xs rounded border border-yellow-500/20">
                                  Private
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{repo.fullName}</p>
                          </div>
                          {selectedRepo?.id === repo.id && (
                            <CheckCircle size={18} className="text-emerald-400 flex-shrink-0 ml-2" />
                          )}
                        </div>

                        {repo.description && (
                          <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                            {repo.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {repo.language && (
                            <span className="flex items-center gap-1.5">
                              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Star size={11} />
                            {repo.stargazersCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitFork size={11} />
                            {repo.forksCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitBranch size={11} />
                            {repo.defaultBranch}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-gray-600 mt-2">
                          <Clock size={11} />
                          Updated {new Date(repo.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {isConnected && selectedRepo && (
          <div className="p-5 border-t border-[#30363d] bg-[#0d1117]">
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-400 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                className="w-full px-3 py-2.5 bg-[#161b22] border border-[#30363d] rounded-lg text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-gray-100 placeholder-gray-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] rounded-lg font-medium transition-colors text-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!selectedRepo || importing}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-white text-sm"
              >
                {importing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Github size={16} />
                    Import Repository
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-3 text-center">
              This will clone the repository and start indexing code for AI features
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubImportModal;
