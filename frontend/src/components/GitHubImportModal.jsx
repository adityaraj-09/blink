/**
 * GitHub Import Modal
 * Connect GitHub and import repositories
 */

import { useState, useEffect } from 'react';
import { X, Github, ExternalLink, GitBranch, Star, GitFork, Clock, Search, CheckCircle } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Github size={20} className="text-gray-700" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Import from GitHub</h2>
              {isConnected && githubUsername && (
                <p className="text-xs text-gray-600">Connected as {githubUsername}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!isConnected ? (
            /* Connect GitHub */
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Github size={32} className="text-gray-700" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect your GitHub account</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Import repositories, sync changes, and collaborate seamlessly with GitHub integration.
                </p>
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-[#238636] hover:bg-[#2ea043] disabled:bg-gray-300 disabled:text-gray-500 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto text-white text-sm"
                >
                  <Github size={18} />
                  Connect GitHub
                </button>
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error.message}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Repository List */
            <>
              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search repositories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#365eff] focus:ring-1 focus:ring-[#365eff] transition-all text-gray-900"
                  />
                </div>
              </div>

              {/* Repository Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#365eff] border-t-transparent" />
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
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedRepo?.id === repo.id
                            ? 'bg-blue-50 border-[#365eff] shadow-sm'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm truncate text-gray-900">{repo.name}</h3>
                              {repo.private && (
                                <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-200">
                                  Private
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 truncate">{repo.fullName}</p>
                          </div>
                          {selectedRepo?.id === repo.id && (
                            <CheckCircle size={18} className="text-[#365eff] flex-shrink-0 ml-2" />
                          )}
                        </div>

                        {repo.description && (
                          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                            {repo.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {repo.language && (
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-[#365eff] rounded-full" />
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

                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
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
          <div className="p-5 border-t border-gray-200 bg-gray-50">
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#365eff] focus:ring-1 focus:ring-[#365eff] transition-all text-gray-900"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors text-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!selectedRepo || importing}
                className="flex-1 px-4 py-2 bg-[#365eff] hover:bg-[#2d4ed8] disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-white text-sm"
              >
                {importing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

            <p className="text-xs text-gray-600 mt-3 text-center">
              This will clone the repository and start indexing code for AI features
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubImportModal;
