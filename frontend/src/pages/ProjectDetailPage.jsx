import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import FilePreviewModal from '../components/FilePreviewModal.jsx';
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
  AlertTriangle,
  ExternalLink,
  Package,
  Check
} from 'lucide-react';
import { useAPIAuth } from '../hooks/useAPI';
import { getProject, getProjectFiles, deleteProject } from '../api/projects';
import { getFileContent } from '../api/files';
import { getFileIcon } from '../utils/fileIcons';
import JSZip from 'jszip';

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

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);

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

  const handleDownloadAllFiles = async () => {
    if (files.length === 0) {
      alert('No files to download');
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      setDownloadComplete(false);

      const zip = new JSZip();
      const totalFiles = files.length;
      let processedFiles = 0;

      // Fetch all file contents in batches to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (file) => {
            try {
              const fileData = await getFileContent(id, file.filePath);
              zip.file(file.filePath, fileData.content);
            } catch (err) {
              console.warn(`Failed to fetch file ${file.filePath}:`, err);
              // Add empty placeholder for failed files
              zip.file(file.filePath, `// Failed to fetch: ${err.message}`);
            }
            processedFiles++;
            setDownloadProgress(Math.round((processedFiles / totalFiles) * 100));
          })
        );
      }

      // Generate and download the zip file
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.projectName.replace(/[^a-z0-9]/gi, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadComplete(true);
      setTimeout(() => {
        setDownloadComplete(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to download files:', err);
      alert(`Failed to download files: ${err.message}`);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            <p className="text-gray-400">Loading project...</p>
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
          className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors mb-6 text-sm"
        >
          <ArrowLeft size={16} />
          <span>Back to Projects</span>
        </Link>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4 text-center">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-white font-semibold">Failed to load project</p>
            <p className="text-gray-400 text-sm">{error}</p>
            <button
              onClick={loadProjectData}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
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
        className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors mb-6 text-sm"
      >
        <ArrowLeft size={16} />
        <span>Back to Projects</span>
      </Link>

      {/* Project Header */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-[#21262d] rounded-xl border border-[#30363d]">
                <Code2 className="text-emerald-400" size={24} />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white mb-2">{project.projectName}</h1>
                <div className="flex items-center gap-2">
                  {project.lastIndexedAt && (
                    <span className="inline-block px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      indexed
                    </span>
                  )}
                  {project.repositoryUrl && (
                    <span className="text-xs text-gray-500 truncate">{project.repositoryUrl}</span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4">{project.description || 'No description provided'}</p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
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
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg transition-colors font-medium text-sm"
            >
              <Code2 size={16} />
              Open in Editor
            </button>
            <button className="flex items-center justify-center gap-2 bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] text-gray-300 px-4 py-2.5 rounded-lg transition-colors font-medium text-sm">
              <Share2 size={16} />
              Share
            </button>
            <button
              onClick={handleDownloadAllFiles}
              disabled={isDownloading || files.length === 0}
              className="flex items-center justify-center gap-2 bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] text-gray-300 px-4 py-2.5 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            >
              {isDownloading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{downloadProgress}%</span>
                  <div
                    className="absolute bottom-0 left-0 h-0.5 bg-emerald-400 transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </>
              ) : downloadComplete ? (
                <>
                  <Check size={16} className="text-emerald-400" />
                  <span className="text-emerald-400">Downloaded</span>
                </>
              ) : (
                <>
                  <Package size={16} />
                  Download ZIP
                </>
              )}
            </button>
            {project.repositoryUrl && (
              <a
                href={project.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] text-gray-300 px-4 py-2.5 rounded-lg transition-colors font-medium text-sm"
              >
                <Github size={16} />
                View on GitHub
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl mb-6">
        <div className="flex overflow-x-auto border-b border-[#30363d]">
          {['overview', 'files'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 font-medium capitalize transition-colors text-sm whitespace-nowrap ${
                activeTab === tab
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-gray-400 hover:text-gray-200'
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
                <h3 className="text-base font-bold text-white mb-4">Project Info</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                    <span className="text-sm text-gray-400">Created</span>
                    <span className="text-sm font-medium text-gray-200">{formatDate(project.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                    <span className="text-sm text-gray-400">Last Updated</span>
                    <span className="text-sm font-medium text-gray-200">{formatTimeAgo(project.updatedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                    <span className="text-sm text-gray-400">Total Files</span>
                    <span className="text-sm font-medium text-gray-200">{project.totalFiles}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                    <span className="text-sm text-gray-400">Chunks Indexed</span>
                    <span className="text-sm font-medium text-gray-200">{project.totalChunks}</span>
                  </div>
                  {project.lastIndexedAt && (
                    <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                      <span className="text-sm text-gray-400">Last Indexed</span>
                      <span className="text-sm font-medium text-gray-200">{formatDate(project.lastIndexedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-4">Vector Store Info</h3>
                {project.vectorStore ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                      <span className="text-sm text-gray-400">Collection Name</span>
                      <span className="text-sm font-medium text-gray-200">{project.vectorStore.name}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                      <span className="text-sm text-gray-400">Document Count</span>
                      <span className="text-sm font-medium text-gray-200">{project.vectorStore.count}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-[#0d1117] rounded-lg border border-[#30363d] text-center">
                    <p className="text-sm text-gray-500">Vector store not initialized</p>
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
                  <div className="w-16 h-16 bg-[#21262d] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Folder className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No files yet</h3>
                  <p className="text-sm text-gray-500">Files will appear here after ingestion</p>
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
                      className="flex items-center justify-between p-4 bg-[#0d1117] rounded-lg border border-[#30363d] hover:bg-[#21262d] hover:border-[#484f58] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isString ? (
                          <img src={fileIcon} alt="" className="w-[18px] h-[18px] flex-shrink-0" />
                        ) : (
                          React.createElement(fileIcon, { className: "text-gray-500 flex-shrink-0", size: 18 })
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-200 group-hover:text-emerald-400 truncate transition-colors">{file.filePath}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{formatDate(file.indexedAt)}</span>
                        <ExternalLink size={14} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Project Section */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-2">Delete Project</h2>
        <p className="text-sm text-gray-400 mb-6">
          Permanently delete this project and all files, chunks, embeddings, and settings.
        </p>

        {/* Project Info Card */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 mb-6 inline-block">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#21262d] rounded-lg border border-[#30363d]">
              <Code2 size={20} className="text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-200">{project.projectName}</p>
              <p className="text-xs text-gray-500">Last updated {formatDate(project.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Delete Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-2.5 rounded-lg transition-colors font-medium"
          >
            <Trash2 size={16} />
            Delete Project
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md shadow-2xl shadow-black/50">
            {/* Modal Header */}
            <div className="flex items-center gap-3 p-6 border-b border-[#30363d]">
              <div className="p-2 bg-red-500/10 rounded-full border border-red-500/20">
                <AlertTriangle className="text-red-500" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Project</h3>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-sm text-gray-400 mb-4">
                This will permanently delete <strong className="text-white">{project.projectName}</strong> and all of its data including:
              </p>
              <ul className="text-sm text-gray-400 space-y-2 mb-6 list-disc list-inside">
                <li>{project.totalFiles} files</li>
                <li>{project.totalChunks} code chunks</li>
                <li>All embeddings in vector database</li>
                <li>All project metadata and settings</li>
              </ul>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  To confirm, type <span className="font-mono bg-[#21262d] px-1.5 py-0.5 rounded text-red-400">{project.projectName}</span> below:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={project.projectName}
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all text-gray-100 placeholder-gray-600"
                  disabled={isDeleting}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-[#30363d] bg-[#0d1117]">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 px-4 py-2.5 bg-[#21262d] border border-[#30363d] text-gray-300 rounded-lg hover:bg-[#30363d] transition-colors font-medium"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleteConfirmText !== project.projectName || isDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
