import { useState, useEffect, useMemo } from 'react';
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
  AlertCircle,
  TrendingUp,
  Code2,
  GitBranch,
  Activity,
  Zap,
  ChevronRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { getProjects } from '../api/projects';
import { useGitHub } from '../hooks/useGitHub';
import { useAPIAuth } from '../hooks/useAPI';

// GitHub-style Contribution Graph Component
const ContributionGraph = ({ projects }) => {
  const contributions = useMemo(() => {
    // Generate contribution data for the last 52 weeks (364 days)
    const weeks = 52;
    const data = [];
    const today = new Date();

    // Create a map of actual activity from projects (both created and updated dates)
    const activityMap = new Map();
    projects.forEach(project => {
      // Count project creation
      if (project.createdAt) {
        const createdDate = new Date(project.createdAt);
        const createdKey = createdDate.toISOString().split('T')[0];
        activityMap.set(createdKey, (activityMap.get(createdKey) || 0) + 2);
      }
      // Count project updates
      if (project.updatedAt) {
        const updatedDate = new Date(project.updatedAt);
        const updatedKey = updatedDate.toISOString().split('T')[0];
        activityMap.set(updatedKey, (activityMap.get(updatedKey) || 0) + 1);
      }
      // Count files as activity (spread across creation date)
      if (project.totalFiles && project.createdAt) {
        const fileDate = new Date(project.createdAt);
        const fileKey = fileDate.toISOString().split('T')[0];
        activityMap.set(fileKey, (activityMap.get(fileKey) || 0) + Math.min(project.totalFiles / 10, 3));
      }
    });

    for (let week = weeks - 1; week >= 0; week--) {
      const weekData = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (week * 7 + (6 - day)));
        const dateKey = date.toISOString().split('T')[0];

        // Use only actual activity data - no random generation
        const rawLevel = activityMap.get(dateKey) || 0;
        const level = Math.min(Math.ceil(rawLevel), 4);

        weekData.push({
          date: dateKey,
          level: level,
          count: Math.ceil(rawLevel)
        });
      }
      data.push(weekData);
    }
    return data;
  }, [projects]);

  const getContributionColor = (level) => {
    const colors = [
      'bg-[#161b22]', // 0 - empty
      'bg-emerald-900/50', // 1 - low
      'bg-emerald-700/60', // 2 - medium-low
      'bg-emerald-500/70', // 3 - medium-high
      'bg-emerald-400', // 4 - high
    ];
    return colors[level] || colors[0];
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Calculate month labels positions
  const getMonthLabels = () => {
    const labels = [];
    let currentMonth = -1;
    contributions.forEach((week, weekIndex) => {
      const date = new Date(week[0].date);
      if (date.getMonth() !== currentMonth) {
        currentMonth = date.getMonth();
        labels.push({ month: months[currentMonth], position: weekIndex });
      }
    });
    return labels;
  };

  const totalContributions = contributions.flat().reduce((sum, day) => sum + day.count, 0);

  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-100">Activity Overview</h3>
          <span className="text-xs text-gray-500">{totalContributions} contributions in the last year</span>
        </div>
        <button className="text-xs text-gray-500 hover:text-emerald-400 transition-colors flex items-center gap-1">
          Contribution settings
          <ChevronRight size={12} />
        </button>
      </div>

      {/* Month labels */}
      <div className="flex mb-2 text-xs text-gray-500 pl-8">
        {getMonthLabels().map((label, i) => (
          <span
            key={i}
            style={{ marginLeft: i === 0 ? 0 : `${(label.position - (getMonthLabels()[i-1]?.position || 0)) * 13 - 20}px` }}
          >
            {label.month}
          </span>
        ))}
      </div>

      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 text-xs text-gray-500 pr-2 pt-0.5">
          <span className="h-[10px]"></span>
          <span className="h-[10px] leading-[10px]">Mon</span>
          <span className="h-[10px]"></span>
          <span className="h-[10px] leading-[10px]">Wed</span>
          <span className="h-[10px]"></span>
          <span className="h-[10px] leading-[10px]">Fri</span>
          <span className="h-[10px]"></span>
        </div>

        {/* Contribution grid */}
        <div className="flex gap-[3px] overflow-x-auto">
          {contributions.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.map((day, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`w-[10px] h-[10px] rounded-sm ${getContributionColor(day.level)} hover:ring-1 hover:ring-gray-500 transition-all cursor-pointer`}
                  title={`${day.count} contributions on ${day.date}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500">
        <span>Less</span>
        <div className="flex gap-[3px]">
          {[0, 1, 2, 3, 4].map(level => (
            <div key={level} className={`w-[10px] h-[10px] rounded-sm ${getContributionColor(level)}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
};

// Stats Card Component
const StatCard = ({ icon: Icon, label, value, trend, color = 'emerald' }) => {
  const colorClasses = {
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-400',
    orange: 'from-orange-500/10 to-orange-600/5 border-orange-500/20 text-orange-400',
  };

  return (
    <div className={`relative p-5 rounded-xl bg-gradient-to-br ${colorClasses[color]} border overflow-hidden group hover:border-opacity-50 transition-all`}>
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-current opacity-5 rounded-full blur-xl group-hover:opacity-10 transition-opacity" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-100">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp size={12} className="text-emerald-400" />
              <span className="text-xs text-emerald-400">{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-2 rounded-lg bg-current/10`}>
          <Icon size={20} className="text-current" />
        </div>
      </div>
    </div>
  );
};

// Quick Action Card Component
const QuickActionCard = ({ icon: Icon, title, description, onClick, color = 'emerald' }) => {
  const colors = {
    emerald: 'hover:border-emerald-500/50 group-hover:text-emerald-400 group-hover:bg-emerald-500/10',
    purple: 'hover:border-purple-500/50 group-hover:text-purple-400 group-hover:bg-purple-500/10',
  };

  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-4 p-5 bg-[#161b22] border border-[#30363d] rounded-xl ${colors[color]} transition-all text-left w-full`}
    >
      <div className={`p-3 rounded-lg bg-[#21262d] ${colors[color]} transition-all`}>
        <Icon className="text-gray-400 group-hover:text-current transition-colors" size={22} />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-gray-100 mb-0.5">{title}</h4>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <ChevronRight className="text-gray-600 group-hover:text-gray-400 transition-colors" size={18} />
    </button>
  );
};

// Project Card Component
const ProjectCard = ({ project, onClick, formatTimeAgo }) => (
  <div
    onClick={() => onClick(project)}
    className="group bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-emerald-500/30 hover:bg-[#1c2128] transition-all cursor-pointer"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start gap-3 flex-1">
        <div className="p-2.5 bg-[#21262d] rounded-lg group-hover:bg-emerald-500/10 transition-colors">
          <Folder className="text-gray-500 group-hover:text-emerald-400 transition-colors" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-100 mb-1 truncate group-hover:text-emerald-400 transition-colors">
            {project.projectName}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-2">{project.description || 'No description'}</p>
        </div>
      </div>
      <ExternalLink className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" size={14} />
    </div>

    <div className="flex items-center gap-4 text-xs text-gray-500">
      <div className="flex items-center gap-1.5">
        <Code2 size={12} />
        <span>{project.totalFiles} files</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock size={12} />
        <span>{formatTimeAgo(project.updatedAt)}</span>
      </div>
    </div>

    {project.repositoryUrl && (
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#30363d] text-xs text-gray-600">
        <Github size={12} />
        <span className="truncate">{project.repositoryUrl.replace('https://github.com/', '')}</span>
      </div>
    )}
  </div>
);

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
  const [importingProject, setImportingProject] = useState(null);

  // Setup automatic token refresh
  useAPIAuth();

  // Handle GitHub OAuth callback
  useEffect(() => {
    const handleGitHubCallback = async () => {
      if (!isLoaded || !isSignedIn) return;

      const code = searchParams.get('github_code');
      const state = searchParams.get('github_state');
      const githubError = searchParams.get('github_error');

      if (githubError) {
        setError(`GitHub connection failed: ${githubError}`);
        searchParams.delete('github_error');
        setSearchParams(searchParams);
        return;
      }

      if (code && state) {
        try {
          console.log('🔗 Completing GitHub OAuth...');
          await completeAuth(code, state);
          searchParams.delete('github_code');
          searchParams.delete('github_state');
          setSearchParams(searchParams);
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

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (isElectron()) return;

    if (isLoaded && !isSignedIn) {
      console.log('User not signed in, redirecting to sign in page');
      navigate('/sign-in');
    }
  }, [isLoaded, isSignedIn, navigate]);

  // Load projects from backend on mount
  useEffect(() => {

      console.log('📂 Loading projects...');
      loadProjects();

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

  const recentProjects = projects.slice(0, 6);

  const handleImportSuccess = (projectData) => {
    console.log('Repository imported:', projectData);
    setShowGitHubModal(false);
    setImportingProject({
      projectId: projectData.projectId,
      projectName: projectData.repoId || 'Repository'
    });
    loadProjects();
  };

  const handleIngestionComplete = () => {
    console.log('Ingestion completed!');
    setImportingProject(null);
    loadProjects();
    if (importingProject?.projectId) {
      navigate(`/dashboard/projects/${importingProject.projectId}`);
    }
  };

  const handleCreateSuccess = (project) => {
    console.log('Project created successfully:', project);
    setShowCreateModal(false);
    loadProjects();
    navigate(`/dashboard/projects/${project.projectId}`);
  };

  const handleCloseProgressModal = () => {
    setImportingProject(null);
    loadProjects();
  };

  const handleProjectClick = (project) => {
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" />
              <div className="absolute inset-0 w-10 h-10 mx-auto bg-emerald-500/20 rounded-full blur-xl" />
            </div>
            <p className="text-gray-400 text-sm">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <Sparkles className="w-5 h-5 text-emerald-400" />
        </div>
        <p className="text-sm text-gray-400">
          Continue building amazing projects. Here's an overview of your recent activity.
        </p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FolderGit2}
          label="Total Projects"
          value={projects.length}
          trend="+2 this month"
          color="emerald"
        />
        <StatCard
          icon={Code2}
          label="Total Files"
          value={projects.reduce((sum, p) => sum + (p.totalFiles || 0), 0)}
          color="blue"
        />
        <StatCard
          icon={GitBranch}
          label="GitHub Repos"
          value={projects.filter(p => p.repositoryUrl).length}
          color="purple"
        />
        <StatCard
          icon={Activity}
          label="Active Today"
          value={projects.filter(p => Date.now() - p.updatedAt < 86400000).length}
          color="orange"
        />
      </div>

      {/* Contribution Graph */}
      <div className="mb-8">
        <ContributionGraph projects={projects} />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickActionCard
            icon={Github}
            title="Import from GitHub"
            description="Connect and import your repositories"
            onClick={() => setShowGitHubModal(true)}
            color="emerald"
          />
          <QuickActionCard
            icon={Plus}
            title="Create New Project"
            description="Start a new project from scratch"
            onClick={() => setShowCreateModal(true)}
            color="purple"
          />
        </div>
      </div>

      {/* Recent Projects */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Projects</h2>
          {projects.length > 0 && (
            <Link
              to="/dashboard/projects"
              className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              View all projects
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-12 text-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading projects...</p>
          </div>
        ) : recentProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProjects.map((project) => (
              <ProjectCard
                key={project.projectId}
                project={project}
                onClick={handleProjectClick}
                formatTimeAgo={formatTimeAgo}
              />
            ))}
          </div>
        ) : !error && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-[#21262d] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FolderGit2 className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              Get started by importing a repository from GitHub or creating a new project from scratch.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowGitHubModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-sm font-medium text-gray-100 rounded-lg transition-colors"
              >
                <Github size={16} />
                Import from GitHub
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-sm font-medium text-white rounded-lg transition-colors"
              >
                <Plus size={16} />
                Create Project
              </button>
            </div>
          </div>
        )}
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
