import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
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
  Github
} from 'lucide-react';
import { useAPIAuth } from '../hooks/useAPI';
import { getProjects } from '../api/projects';

const ProjectsPage = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const filteredProjects = projects.filter((project) =>
    project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Projects</h1>
        <p className="text-sm text-gray-600">Manage and organize all your projects</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div className="flex-1">
            <p className="text-red-800 text-sm font-medium">Failed to load projects</p>
            <p className="text-red-700 text-xs mt-1">{error}</p>
          </div>
          <button
            onClick={loadProjects}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[#365eff] focus:ring-1 focus:ring-[#365eff] transition-all text-gray-900"
          />
        </div>

        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors text-gray-700 text-sm">
            <Filter size={16} />
            <span className="hidden sm:inline">Filter</span>
          </button>

          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Grid3x3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <List size={16} />
            </button>
          </div>

          <Link
            to="/dashboard"
            className="flex items-center gap-2 bg-[#365eff] hover:bg-[#2d4ed8] text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Project</span>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <FolderGit2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {searchTerm
              ? 'Try adjusting your search term'
              : 'Get started by importing a repository from GitHub or creating a new project'}
          </p>
          {!searchTerm && (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-[#365eff] hover:bg-[#2d4ed8] text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
            >
              <Plus size={16} />
              Create Project
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.projectId}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#365eff] hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-50 transition-colors">
                    <FolderGit2 className="text-gray-600 group-hover:text-[#365eff] transition-colors" size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 group-hover:text-[#365eff] transition-colors">
                      {project.projectName}
                    </h3>
                    {project.lastIndexedAt && (
                      <span className="inline-block px-2 py-0.5 text-xs border rounded-full mt-1 bg-green-50 text-green-700 border-green-200">
                        indexed
                      </span>
                    )}
                  </div>
                </div>

                <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical size={16} className="text-gray-400" />
                </button>
              </div>

              <p className="text-xs text-gray-600 mb-4 line-clamp-2">{project.description || 'No description'}</p>

              <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Folder size={11} />
                  <span>{project.totalFiles} files</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={11} />
                  <span>{formatTimeAgo(project.updatedAt)}</span>
                </div>
              </div>

              {project.repositoryUrl && (
                <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-600">
                  <Github size={11} />
                  <span className="truncate">{project.repositoryUrl}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  {project.totalChunks} chunks indexed
                </div>

                <Link
                  to={`/dashboard/projects/${project.projectId}`}
                  className="flex items-center gap-1 text-xs text-[#365eff] hover:text-[#2d4ed8] font-medium transition-colors"
                >
                  View
                  <Eye size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <div
              key={project.projectId}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-[#365eff] hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <FolderGit2 className="text-gray-600" size={20} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-sm text-gray-900">{project.projectName}</h3>
                    {project.lastIndexedAt && (
                      <span className="inline-block px-2 py-0.5 text-xs border rounded-full bg-green-50 text-green-700 border-green-200">
                        indexed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{project.description || 'No description'}</p>
                </div>

                <div className="flex items-center gap-6 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Folder size={12} />
                    <span>{project.totalFiles} files</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={12} />
                    <span>{formatTimeAgo(project.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/dashboard/projects/${project.projectId}`}
                    className="p-2 bg-[#365eff] hover:bg-[#2d4ed8] text-white rounded-lg transition-colors"
                  >
                    <Eye size={16} />
                  </Link>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ProjectsPage;
