import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import GitHubImportModal from '../components/GitHubImportModal';
import CreateProjectModal from '../components/CreateProjectModal';
import IngestionProgressModal from '../components/IngestionProgressModal';
import {
  FolderGit2,
  Clock,
  Github,
  ArrowRight,
  Plus,
  Folder,
  Star,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { getProjects } from '../api/projects';
import { useGitHub } from '../hooks/useGitHub';
import { useAPIAuth } from '../hooks/useAPI';
import { isElectron } from '../services/electron';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { completeAuth } = useGitHub();
  const { isSignedIn, isLoaded } = useAuth();

  // Ingestion progress tracking
  const [importingProject, setImportingProject] = useState(null); // { projectId, projectName }

  // Setup automatic token refresh
  useAPIAuth();

  // Handle GitHub OAuth callback
  useEffect(() => {
    const handleGitHubCallback = async () => {
      // Wait for auth to be loaded
      if (!isLoaded || !isSignedIn) return;

      const code = searchParams.get('github_code');
      const state = searchParams.get('github_state');
      const githubError = searchParams.get('github_error');

      if (githubError) {
        setError(`GitHub connection failed: ${githubError}`);
        // Clean up URL
        searchParams.delete('github_error');
        setSearchParams(searchParams);
        return;
      }

      if (code && state) {
        try {
          console.log('🔗 Completing GitHub OAuth...');
          await completeAuth(code, state);
          // Clean up URL
          searchParams.delete('github_code');
          searchParams.delete('github_state');
          setSearchParams(searchParams);
          // Show success message or open modal
          setShowGitHubModal(true);
          console.log('✅ GitHub OAuth completed');
        } catch (err) {
          console.error('❌ Failed to complete GitHub auth:', err);
          setError('Failed to connect GitHub account');
        }
      }
    };

    handleGitHubCallback();
  }, [isLoaded, isSignedIn, searchParams, setSearchParams, completeAuth]);

  // Redirect to sign in if not authenticated (web only - Electron uses ProtectedRoute)
  useEffect(() => {
    // Skip in Electron - ProtectedRoute handles auth
    if (isElectron()) return;

    if (isLoaded && !isSignedIn) {
      console.log('User not signed in, redirecting to sign in page');
      navigate('/sign-in');
    }
  }, [isLoaded, isSignedIn, navigate]);

  // Load projects from backend on mount
  useEffect(() => {
    // In Electron, always load (auth is handled by ProtectedRoute)
    // In web, wait for Clerk auth
    if (isElectron() || (isLoaded && isSignedIn)) {
      console.log('📂 Loading projects...');
      loadProjects();
    }
  }, [isLoaded, isSignedIn]);

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

  // Get recent projects (top 3)
  const recentProjects = projects.slice(0, 3);

  // Handle GitHub import success
  const handleImportSuccess = (projectData) => {
    console.log('Repository imported:', projectData);

    // Close GitHub modal
    setShowGitHubModal(false);

    // Show ingestion progress modal
    setImportingProject({
      projectId: projectData.projectId,
      projectName: projectData.repoId || 'Repository'
    });

    // Reload projects list
    loadProjects();
  };

  // Handle ingestion complete
  const handleIngestionComplete = () => {
    console.log('Ingestion completed!');

    // Close progress modal
    setImportingProject(null);

    // Reload projects to get updated file counts
    loadProjects();

    // Navigate to the project page
    if (importingProject?.projectId) {
      navigate(`/dashboard/projects/${importingProject.projectId}`);
    }
  };

  // Handle create project success
  const handleCreateSuccess = (project) => {
    console.log('Project created successfully:', project);

    // Close create modal
    setShowCreateModal(false);

    // Reload projects list
    loadProjects();

    // Navigate to the project detail page
    navigate(`/dashboard/projects/${project.projectId}`);
  };

  // Close progress modal
  const handleCloseProgressModal = () => {
    setImportingProject(null);
    loadProjects();
  };

  // Handle project selection
  const handleProjectClick = (project) => {
    // Save selected project to localStorage for editor
    localStorage.setItem('selectedProject', JSON.stringify({
      id: project.projectId,
      name: project.projectName,
      description: project.description,
      repositoryUrl: project.repositoryUrl,
    }));
    navigate(`/dashboard/projects/${project.projectId}`);
  };

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Show loading while auth is initializing
  if (!isLoaded) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-gray-600 text-sm">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Journeys (tutorials/guides)
  const journeys = [
    {
      id: 1,
      title: 'Build an AI Knowledge assistant',
      description: 'A knowledge assistant allows you to ask questions about your data (e.g., files, google drive, etc.)',
      status: 'Not Started',
      duration: '5 min',
      type: 'Pipeline',
      credits: '0/2'
    },
    {
      id: 2,
      title: 'Create your first interface',
      description: 'Interfaces place user friendly UIs (e.g., chat) on your pipelines',
      status: 'Not Started',
      duration: '5 min',
      type: 'Interface',
      credits: '0/2'
    },
    {
      id: 3,
      title: 'Create your first knowledge base',
      description: 'Knowledge bases allow you to use your data in your AI workflow (e.g., files, google drive).',
      status: 'Not Started',
      duration: '5 min',
      type: 'Knowledge Base',
      credits: '0/2'
    }
  ];

  return (
    <DashboardLayout>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-sm text-gray-600">Continue building your AI applications. Explore our Journeys (Guided Tutorials) or create your own custom solution.</p>
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

      {/* Journeys Section */}
      <div className="mb-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-br from-[#365eff] to-[#4d70ff] rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Journeys</h2>
        </div>
        <p className="text-sm text-gray-600 mb-6">Complete these learning paths to earn AI credits and learn more about vectorshift features.</p>

        <div className="space-y-4">
          {journeys.map((journey, index) => (
            <div key={journey.id} className="flex items-start gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-semibold text-gray-700 border border-gray-300 flex-shrink-0">
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{journey.title}</h3>
                    <p className="text-xs text-gray-600 line-clamp-2">{journey.description}</p>
                  </div>
                  <button className="bg-[#365eff] hover:bg-[#2d4ed8] text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0">
                    Begin Journey
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span>{journey.status}</span>
                  </div>
                  <span>•</span>
                  <span>{journey.duration}</span>
                  <span>•</span>
                  <span>{journey.type}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-[#365eff]">
                    <Star size={12} />
                    <span>{journey.credits} Credits</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Projects */}
      {loading ? (
        <div className="mb-8 bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Loading projects...</p>
        </div>
      ) : recentProjects.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Projects</h2>
            <Link to="/dashboard/projects" className="flex items-center gap-1 text-sm text-[#365eff] hover:text-[#2d4ed8] font-medium transition-colors">
              View all projects
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProjects.map((project) => (
              <div
                key={project.projectId}
                onClick={() => handleProjectClick(project)}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#365eff] hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-50 transition-colors">
                      <Folder className="text-gray-600 group-hover:text-[#365eff] transition-colors" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">{project.projectName}</h3>
                      <p className="text-xs text-gray-600 line-clamp-2">{project.description || 'No description'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
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
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Github size={11} />
                    <span className="truncate">{project.repositoryUrl}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : !error && (
        <div className="mb-8 bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <FolderGit2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
          <p className="text-sm text-gray-600 mb-4">Get started by importing a repository from GitHub or creating a new project</p>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setShowGitHubModal(true)}
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#238636] hover:shadow-md transition-all group"
        >
          <div className="p-2.5 bg-gray-100 rounded-lg group-hover:bg-green-50 transition-colors">
            <Github className="text-gray-600 group-hover:text-[#238636] transition-colors" size={20} />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-900 mb-0.5">Import from GitHub</div>
            <div className="text-xs text-gray-600">Connect and import your repositories</div>
          </div>
        </button>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#365eff] hover:shadow-md transition-all group"
        >
          <div className="p-2.5 bg-gray-100 rounded-lg group-hover:bg-blue-50 transition-colors">
            <Plus className="text-gray-600 group-hover:text-[#365eff] transition-colors" size={20} />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-900 mb-0.5">Create New Project</div>
            <div className="text-xs text-gray-600">Start a new project from scratch</div>
          </div>
        </button>
      </div>

      {/* GitHub Import Modal */}
      <GitHubImportModal
        isOpen={showGitHubModal}
        onClose={() => setShowGitHubModal(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateSuccess={handleCreateSuccess}
      />

      {/* Ingestion Progress Modal */}
      {importingProject && (
        <IngestionProgressModal
          projectId={importingProject.projectId}
          projectName={importingProject.projectName}
          onComplete={handleIngestionComplete}
          onClose={handleCloseProgressModal}
        />
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
