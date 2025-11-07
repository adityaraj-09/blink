import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import FilePreviewModal from '../components/FilePreviewModal';
import {
  ArrowLeft,
  Code2,
  Clock,
  Share2,
  Download,
  FileText,
  Folder,
  Loader2,
  AlertCircle,
  Github,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useAPIAuth } from '../hooks/useAPI';
import { getProject, getProjectFiles, deleteProject } from '../api/projects';
import { getFileIcon } from '../utils/fileIcons';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // File preview modal
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Inject auth token into API client
  useAPIAuth();

  useEffect(() => {
    if (id) {
      loadProjectData();
    }
  }, [id]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectData, filesData] = await Promise.all([
        getProject(id),
        getProjectFiles(id)
      ]);

      setProject(projectData);
      setFiles(filesData.files);
    } catch (err) {
      console.error('Failed to load project:', err);
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getLanguageColor = (language) => {
    const colors = {
      javascript: '#f7df1e',
      typescript: '#3178c6',
      python: '#3776ab',
      java: '#b07219',
      cpp: '#f34b7d',
      c: '#555555',
      rust: '#dea584',
      go: '#00add8',
      ruby: '#701516',
      php: '#4f5d95',
    };
    return colors[language?.toLowerCase()] || '#858585';
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmText !== project.projectName) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteProject(id);
      navigate('/dashboard/projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert(`Failed to delete project: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-gray-600">Loading project...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Link
          to="/dashboard/projects"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6 text-sm"
        >
          <ArrowLeft size={16} />
          <span>Back to Projects</span>
        </Link>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4 text-center">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-gray-800 font-semibold">Failed to load project</p>
            <p className="text-gray-600 text-sm">{error}</p>
            <button
              onClick={loadProjectData}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <DashboardLayout>
      {/* Back Button */}
      <Link
        to="/dashboard/projects"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6 text-sm"
      >
        <ArrowLeft size={16} />
        <span>Back to Projects</span>
      </Link>

      {/* Project Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-gray-100 rounded-xl">
                <Code2 className="text-gray-700" size={24} />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.projectName}</h1>
                <div className="flex items-center gap-2">
                  {project.lastIndexedAt && (
                    <span className="inline-block px-2.5 py-1 text-xs border rounded-full bg-green-50 text-green-700 border-green-200">
                      indexed
                    </span>
                  )}
                  {project.repositoryUrl && (
                    <span className="text-xs text-gray-500">{project.repositoryUrl}</span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{project.description || 'No description provided'}</p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <Folder size={14} />
                <span>{project.totalFiles} files</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Code2 size={14} />
                <span>{project.totalChunks} chunks indexed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                <span>Updated {formatTimeAgo(project.updatedAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                localStorage.setItem('selectedProject', JSON.stringify({
                  id: project.projectId,
                  name: project.projectName,
                  description: project.description,
                  repositoryUrl: project.repositoryUrl,
                }));
                navigate('/editor');
              }}
              className="flex items-center justify-center gap-2 bg-[#365eff] hover:bg-[#2d4ed8] text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
            >
              <Code2 size={16} />
              Open in Editor
            </button>
            <button className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium text-sm">
              <Share2 size={16} />
              Share
            </button>
            {project.repositoryUrl && (
              <a
                href={project.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium text-sm"
              >
                <Github size={16} />
                View on GitHub
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl mb-6 shadow-sm">
        <div className="flex overflow-x-auto border-b border-gray-200">
          {['overview', 'files'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 font-medium capitalize transition-colors text-sm whitespace-nowrap ${
                activeTab === tab
                  ? 'text-[#365eff] border-b-2 border-[#365eff]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-4">Project Info</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Created</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(project.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Last Updated</span>
                    <span className="text-sm font-medium text-gray-900">{formatTimeAgo(project.updatedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Total Files</span>
                    <span className="text-sm font-medium text-gray-900">{project.totalFiles}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Chunks Indexed</span>
                    <span className="text-sm font-medium text-gray-900">{project.totalChunks}</span>
                  </div>
                  {project.lastIndexedAt && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Last Indexed</span>
                      <span className="text-sm font-medium text-gray-900">{formatDate(project.lastIndexedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900 mb-4">Vector Store Info</h3>
                {project.vectorStore ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Collection Name</span>
                      <span className="text-sm font-medium text-gray-900">{project.vectorStore.name}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Document Count</span>
                      <span className="text-sm font-medium text-gray-900">{project.vectorStore.count}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600">Vector store not initialized</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="space-y-2">
              {files.length === 0 ? (
                <div className="p-12 text-center">
                  <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No files yet</h3>
                  <p className="text-sm text-gray-600">Files will appear here after ingestion</p>
                </div>
              ) : (
                files.map((file) => {
                  const fileIcon = getFileIcon(file.filePath);
                  const isString = typeof fileIcon === 'string';

                  return (
                    <div
                      key={file.fileId}
                      onClick={() => {
                        setSelectedFile(file);
                        setShowPreviewModal(true);
                      }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isString ? (
                          <img src={fileIcon} alt="" className="w-[18px] h-[18px] flex-shrink-0" />
                        ) : (
                          React.createElement(fileIcon, { className: "text-gray-500 flex-shrink-0", size: 18 })
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{file.filePath}</p>

                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(file.indexedAt)}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Project Section */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Project</h2>
        <p className="text-sm text-gray-600 mb-6">
          Permanently delete this project and all files, chunks, embeddings, and settings.
        </p>

        {/* Project Info Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 inline-block">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded">
              <Code2 size={20} className="text-gray-700" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{project.projectName}</p>
              <p className="text-xs text-gray-500">Last updated {formatDate(project.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Delete Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium"
          >
            <Trash2 size={16} />
            Delete Project
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center gap-3 p-6 border-b border-gray-200">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Project</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                This will permanently delete <strong>{project.projectName}</strong> and all of its data including:
              </p>
              <ul className="text-sm text-gray-600 space-y-2 mb-6 list-disc list-inside">
                <li>{project.totalFiles} files</li>
                <li>{project.totalChunks} code chunks</li>
                <li>All embeddings in vector database</li>
                <li>All project metadata and settings</li>
              </ul>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To confirm, type <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{project.projectName}</span> below:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={project.projectName}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={isDeleting}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleteConfirmText !== project.projectName || isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setSelectedFile(null);
        }}
        projectId={id}
        file={selectedFile}
      />
    </DashboardLayout>
  );
};

export default ProjectDetailPage;
