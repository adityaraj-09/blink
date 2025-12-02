import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import {
  MapPin,
  Link as LinkIcon,
  Calendar,
  Mail,
  Edit,
  Github,
  Star,
  Code2,
  Award,
  TrendingUp,
  Activity,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useAPIAuth } from '../hooks/useAPI';
import { getUserProfile, getUserStats, getUserActivity } from '../api/users';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Inject auth token into API client
  useAPIAuth();

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [profileData, statsData, activityData] = await Promise.all([
        getUserProfile(),
        getUserStats(),
        getUserActivity(10)
      ]);

      setProfile(profileData);
      setStats(statsData);
      setActivity(activityData.activity);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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

  const statsConfig = [
    { key: 'projects', label: 'Projects', icon: Code2, color: 'emerald' },
    { key: 'commits', label: 'Commits', icon: Activity, color: 'blue' },
    { key: 'files', label: 'Files Indexed', icon: Star, color: 'yellow' },
    { key: 'chatMessages', label: 'AI Chats', icon: TrendingUp, color: 'purple' },
  ];

  const getStatColorClasses = (color) => {
    const colors = {
      emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    };
    return colors[color] || colors.emerald;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            <p className="text-gray-400">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4 text-center">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-white font-semibold">Failed to load profile</p>
            <p className="text-gray-400 text-sm">{error}</p>
            <button
              onClick={loadProfileData}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden mb-6">
          {/* Cover Image */}
          <div className="h-48 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          </div>

          <div className="px-6 pb-6">
            {/* Avatar & Basic Info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/30 rounded-xl blur-xl" />
                <img
                  src={profile.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName)}&size=200&background=10b981&color=fff`}
                  alt={profile.fullName}
                  className="relative w-32 h-32 rounded-xl border-4 border-[#161b22] shadow-xl"
                />
              </div>

              <div className="flex-1 sm:mt-16">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-white">{profile.fullName}</h1>
                    <p className="text-gray-400 mt-1">{profile.email}</p>
                  </div>

                  <button
                    onClick={() => navigate('/dashboard/settings')}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 rounded-lg transition-all font-medium text-white text-sm"
                  >
                    <Edit size={16} />
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-gray-300 mb-4">{profile.bio}</p>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gray-500" />
                <span>{profile.email}</span>
              </div>
              {profile.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-500" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-2">
                  <LinkIcon size={16} className="text-gray-500" />
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 hover:underline"
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-500" />
                <span>Joined {formatDate(profile.createdAt)}</span>
              </div>
            </div>

            {/* GitHub Connection Status */}
            {stats?.githubConnected && (
              <div className="flex gap-3 mt-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-[#21262d] border border-[#30363d] rounded-lg text-sm">
                  <Github size={16} className="text-gray-300" />
                  <span className="text-gray-300 font-medium">GitHub Connected</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statsConfig.map((stat) => {
              const Icon = stat.icon;
              const value = stats[stat.key] || 0;
              const colorClasses = getStatColorClasses(stat.color);
              return (
                <div key={stat.key} className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 text-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 border ${colorClasses}`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Achievements - Coming Soon */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Achievements</h2>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#21262d] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400">Achievements coming soon!</p>
                <p className="text-sm text-gray-500 mt-1">
                  Complete projects and reach milestones to earn badges
                </p>
              </div>
            </div>

            {/* Quick Stats Summary */}
            {stats && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Activity Summary</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                    <span className="text-gray-300 font-medium">Total Projects</span>
                    <span className="text-2xl font-bold text-emerald-400">{stats.projects}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                    <span className="text-gray-300 font-medium">Code Files</span>
                    <span className="text-2xl font-bold text-blue-400">{stats.files}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                    <span className="text-gray-300 font-medium">Code Chunks Indexed</span>
                    <span className="text-2xl font-bold text-yellow-400">{stats.chunks}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Recent Activity */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
              {activity.length > 0 ? (
                <div className="space-y-4">
                  {activity.map((item, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm text-gray-300">
                          <span className="font-medium capitalize">{item.action}</span>{' '}
                          <span className="text-emerald-400">{item.target}</span>
                        </p>
                        {item.projectName && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            in {item.projectName}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 mt-1">{formatTimeAgo(item.time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-[#21262d] rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Activity className="w-6 h-6 text-gray-600" />
                  </div>
                  <p className="text-gray-500 text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
