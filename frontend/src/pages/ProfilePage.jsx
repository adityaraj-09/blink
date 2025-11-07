import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
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
    { key: 'projects', label: 'Projects', icon: Code2, color: 'blue' },
    { key: 'commits', label: 'Commits', icon: Activity, color: 'green' },
    { key: 'files', label: 'Files Indexed', icon: Star, color: 'yellow' },
    { key: 'chatMessages', label: 'AI Chats', icon: TrendingUp, color: 'purple' },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-gray-600">Loading profile...</p>
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
            <p className="text-gray-800 font-semibold">Failed to load profile</p>
            <p className="text-gray-600 text-sm">{error}</p>
            <button
              onClick={loadProfileData}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-sm">
          {/* Cover Image */}
          <div className="h-48 bg-gradient-to-r from-blue-600 to-purple-600"></div>

          <div className="px-6 pb-6">
            {/* Avatar & Basic Info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-16 mb-6">
              <img
                src={profile.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName)}&size=200&background=3b82f6&color=fff`}
                alt={profile.fullName}
                className="w-32 h-32 rounded-xl border-4 border-white shadow-xl"
              />

              <div className="flex-1 sm:mt-16">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{profile.fullName}</h1>
                    <p className="text-gray-600 mt-1">{profile.email}</p>
                  </div>

                  <button
                    onClick={() => navigate('/dashboard/settings')}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4 py-2.5 rounded-lg transition-all font-medium text-white"
                  >
                    <Edit size={18} />
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-gray-700 mb-4">{profile.bio}</p>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gray-400" />
                <span>{profile.email}</span>
              </div>
              {profile.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-2">
                  <LinkIcon size={16} className="text-gray-400" />
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <span>Joined {formatDate(profile.createdAt)}</span>
              </div>
            </div>

            {/* GitHub Connection Status */}
            {stats?.githubConnected && (
              <div className="flex gap-3 mt-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm">
                  <Github size={16} className="text-gray-700" />
                  <span className="text-gray-700 font-medium">GitHub Connected</span>
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
              return (
                <div key={stat.key} className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                  <Icon className={`text-${stat.color}-600 mx-auto mb-2`} size={24} />
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Achievements - Coming Soon */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Achievements</h2>
              <div className="text-center py-8">
                <Award className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Achievements coming soon!</p>
                <p className="text-sm text-gray-400 mt-1">
                  Complete projects and reach milestones to earn badges
                </p>
              </div>
            </div>

            {/* Quick Stats Summary */}
            {stats && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Activity Summary</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Total Projects</span>
                    <span className="text-2xl font-bold text-blue-600">{stats.projects}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Code Files</span>
                    <span className="text-2xl font-bold text-green-600">{stats.files}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Code Chunks Indexed</span>
                    <span className="text-2xl font-bold text-yellow-600">{stats.chunks}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Recent Activity */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
              {activity.length > 0 ? (
                <div className="space-y-4">
                  {activity.map((item, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium capitalize">{item.action}</span>{' '}
                          <span className="text-blue-600">{item.target}</span>
                        </p>
                        {item.projectName && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            in {item.projectName}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(item.time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
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
