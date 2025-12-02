import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { Link } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Search,
  Filter,
  Grid3x3,
  List,
  Clock,
  Folder,
  Eye,
  MoreVertical,
  Loader2,
  AlertCircle,
  Github,
  Code2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useAPIAuth } from '../hooks/useAPI';
import { getProjects } from '../api/projects';

const ProjectsPage = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('updated');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Inject auth token into API client
  useAPIAuth();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjects();
      setProjects(data.projects);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects
    .filter((project) =>
      project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'updated') return b.updatedAt - a.updatedAt;
      if (sortBy === 'created') return b.createdAt - a.createdAt;
      if (sortBy === 'name') return a.projectName.localeCompare(b.projectName);
      if (sortBy === 'files') return (b.totalFiles || 0) - (a.totalFiles || 0);
      return 0;
    });

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const sortOptions = [
    { value: 'updated', label: 'Last Updated' },
    { value: 'created', label: 'Date Created' },
    { value: 'name', label: 'Name' },
    { value: 'files', label: 'File Count' },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Projects</h1>
        <p className="text-sm text-gray-400">Manage and organize all your projects</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium">Failed to load projects</p>
            <p className="text-red-400/70 text-xs mt-1">{error}</p>
          </div>
          <button
            onClick={loadProjects}
            className="text-sm text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-gray-100 placeholder-gray-500"
          />
        </div>

        <div className="flex gap-2">
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] hover:bg-[#21262d] px-3 py-2.5 rounded-lg transition-colors text-gray-300 text-sm"
            >
              <Filter size={16} />
              <span className="hidden sm:inline">{sortOptions.find(o => o.value === sortBy)?.label}</span>
              <ChevronDown size={14} />
            </button>
            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-20 py-1">
                  {sortOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-[#21262d] transition-colors ${
                        sortBy === option.value ? 'text-emerald-400' : 'text-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#21262d] text-emerald-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#21262d]'
              }`}
            >
              <Grid3x3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#21262d] text-emerald-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#21262d]'
              }`}
            >
              <List size={16} />
            </button>
          </div>

          <Link
            to="/dashboard"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Project</span>
          </Link>
        </div>
      </div>

      {/* Project Count */}
      <div className="mb-4 text-sm text-gray-500">
        {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
        {searchTerm && ` matching "${searchTerm}"`}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-12 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-[#21262d] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderGit2 className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {searchTerm ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {searchTerm
              ? 'Try adjusting your search term'
              : 'Get started by importing a repository from GitHub or creating a new project'}
          </p>
          {!searchTerm && (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg transition-colors font-medium text-sm"
            >
              <Plus size={16} />
              Create Project
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Link
              key={project.projectId}
              to={`/dashboard/projects/${project.projectId}`}
              className="group bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-emerald-500/30 hover:bg-[#1c2128] transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#21262d] rounded-lg group-hover:bg-emerald-500/10 transition-colors">
                    <FolderGit2 className="text-gray-500 group-hover:text-emerald-400 transition-colors" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-100 group-hover:text-emerald-400 transition-colors">
                      {project.projectName}
                    </h3>
                    {project.lastIndexedAt && (
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full mt-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        indexed
                      </span>
                    )}
                  </div>
                </div>
                <ExternalLink className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" size={14} />
              </div>

              <p className="text-xs text-gray-500 mb-4 line-clamp-2">{project.description || 'No description'}</p>

              <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Code2 size={12} />
                  <span>{project.totalFiles} files</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} />
                  <span>{formatTimeAgo(project.updatedAt)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#30363d]">
                {project.repositoryUrl ? (
                  <a
                    href={project.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-400 transition-colors"
                  >
                    <Github size={14} />
                    <span className="truncate max-w-[150px]">{project.repositoryUrl.replace('https://github.com/', '')}</span>
                    <ExternalLink size={10} />
                  </a>
                ) : (
                  <span className="text-xs text-gray-600">Local project</span>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="p-1.5 rounded-lg hover:bg-[#30363d] text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <MoreVertical size={14} />
                </button>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <Link
              key={project.projectId}
              to={`/dashboard/projects/${project.projectId}`}
              className="group flex items-center gap-4 bg-[#161b22] border border-[#30363d] rounded-xl p-4 hover:border-emerald-500/30 hover:bg-[#1c2128] transition-all"
            >
              <div className="p-3 bg-[#21262d] rounded-lg group-hover:bg-emerald-500/10 transition-colors">
                <FolderGit2 className="text-gray-500 group-hover:text-emerald-400 transition-colors" size={22} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-sm text-gray-100 group-hover:text-emerald-400 transition-colors">
                    {project.projectName}
                  </h3>
                  {project.lastIndexedAt && (
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      indexed
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{project.description || 'No description'}</p>
              </div>

              <div className="flex items-center gap-6 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Code2 size={14} />
                  <span>{project.totalFiles} files</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>{formatTimeAgo(project.updatedAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {project.repositoryUrl && (
                  <a
                    href={project.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2.5 bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] text-gray-400 hover:text-white rounded-lg transition-colors"
                    title="View on GitHub"
                  >
                    <Github size={16} />
                  </a>
                )}
                <button className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">
                  <Eye size={16} />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ProjectsPage;
