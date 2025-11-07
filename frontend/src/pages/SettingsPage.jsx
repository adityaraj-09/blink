import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  User,
  Bell,
  Shield,
  Palette,
  CreditCard,
  Save,
  CheckCircle,
  Moon,
  Sun,
  Monitor,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useAPIAuth } from '../hooks/useAPI';
import {
  getUserProfile,
  getUserPreferences,
  updateUserProfile,
  updateUserPreferences
} from '../api/users';

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    location: '',
    website: '',
  });

  const [preferences, setPreferences] = useState({
    theme: 'dark',
    language: 'en-US',
    dateFormat: 'MM/DD/YYYY',
    emailNotifications: true,
    pushNotifications: true,
    projectUpdates: true,
    securityAlerts: true,
    weeklyDigest: false,
    profileVisibility: 'public',
    showEmail: false,
    showActivity: true,
  });

  // Inject auth token into API client
  useAPIAuth();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const [profileData, preferencesData] = await Promise.all([
        getUserProfile(),
        getUserPreferences()
      ]);

      setProfile({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        bio: profileData.bio || '',
        location: profileData.location || '',
        website: profileData.website || '',
      });

      setPreferences(preferencesData);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);

      await updateUserProfile(profile);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      setError(null);

      await updateUserPreferences(preferences);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileChange = (field, value) => {
    setProfile({ ...profile, [field]: value });
  };

  const handlePreferenceChange = (field, value) => {
    setPreferences({ ...preferences, [field]: value });
  };

  const sections = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'appearance', icon: Palette, label: 'Appearance' },
    { id: 'privacy', icon: Shield, label: 'Privacy' },
    { id: 'billing', icon: CreditCard, label: 'Billing' },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeSection === section.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium text-sm">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Profile Settings</h2>
                  <p className="text-gray-600">Update your personal information</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={profile.firstName}
                        onChange={(e) => handleProfileChange('firstName', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={profile.lastName}
                        onChange={(e) => handleProfileChange('lastName', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => handleProfileChange('bio', e.target.value)}
                      rows={4}
                      maxLength={500}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                      placeholder="Tell us about yourself..."
                    />
                    <p className="text-xs text-gray-500 mt-1">{profile.bio.length}/500 characters</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                      <input
                        type="text"
                        value={profile.location}
                        onChange={(e) => handleProfileChange('location', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        placeholder="San Francisco, CA"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                      <input
                        type="url"
                        value={profile.website}
                        onChange={(e) => handleProfileChange('website', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button for Profile */}
                <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 px-6 py-3 rounded-lg transition-all font-medium text-white"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>

                  {saved && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={18} />
                      <span className="text-sm font-medium">Saved successfully!</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Notification Preferences</h2>
                  <p className="text-gray-600">Manage how you receive notifications</p>
                </div>

                <div className="space-y-4">
                  <ToggleOption
                    title="Email Notifications"
                    description="Receive notifications via email"
                    checked={preferences.emailNotifications}
                    onChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                  />
                  <ToggleOption
                    title="Push Notifications"
                    description="Receive push notifications in browser"
                    checked={preferences.pushNotifications}
                    onChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
                  />
                  <ToggleOption
                    title="Project Updates"
                    description="Get notified about project changes"
                    checked={preferences.projectUpdates}
                    onChange={(checked) => handlePreferenceChange('projectUpdates', checked)}
                  />
                  <ToggleOption
                    title="Security Alerts"
                    description="Important security notifications"
                    checked={preferences.securityAlerts}
                    onChange={(checked) => handlePreferenceChange('securityAlerts', checked)}
                  />
                  <ToggleOption
                    title="Weekly Digest"
                    description="Receive weekly activity summary"
                    checked={preferences.weeklyDigest}
                    onChange={(checked) => handlePreferenceChange('weeklyDigest', checked)}
                  />
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSavePreferences}
                    disabled={saving}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 px-6 py-3 rounded-lg transition-all font-medium text-white"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>

                  {saved && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={18} />
                      <span className="text-sm font-medium">Saved successfully!</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Appearance Section */}
            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Appearance</h2>
                  <p className="text-gray-600">Customize how the app looks for you</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['light', 'dark'].map((theme) => (
                        <button
                          key={theme}
                          onClick={() => handlePreferenceChange('theme', theme)}
                          className={`flex flex-col items-center gap-2 p-4 border rounded-lg transition-all ${
                            preferences.theme === theme
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 bg-white hover:border-gray-400'
                          }`}
                        >
                          {theme === 'light' && <Sun size={24} className="text-gray-700" />}
                          {theme === 'dark' && <Moon size={24} className="text-gray-700" />}
                          <span className="text-sm font-medium text-gray-700 capitalize">{theme}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select
                      value={preferences.language}
                      onChange={(e) => handlePreferenceChange('language', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="es-ES">Spanish</option>
                      <option value="fr-FR">French</option>
                      <option value="de-DE">German</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                    <select
                      value={preferences.dateFormat}
                      onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSavePreferences}
                    disabled={saving}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 px-6 py-3 rounded-lg transition-all font-medium text-white"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>

                  {saved && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={18} />
                      <span className="text-sm font-medium">Saved successfully!</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Privacy Section */}
            {activeSection === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Privacy & Security</h2>
                  <p className="text-gray-600">Manage your privacy settings</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
                    <select
                      value={preferences.profileVisibility}
                      onChange={(e) => handlePreferenceChange('profileVisibility', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <ToggleOption
                    title="Show Email Address"
                    description="Make your email visible on profile"
                    checked={preferences.showEmail}
                    onChange={(checked) => handlePreferenceChange('showEmail', checked)}
                  />

                  <ToggleOption
                    title="Show Activity"
                    description="Display your recent activity"
                    checked={preferences.showActivity}
                    onChange={(checked) => handlePreferenceChange('showActivity', checked)}
                  />
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSavePreferences}
                    disabled={saving}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 px-6 py-3 rounded-lg transition-all font-medium text-white"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>

                  {saved && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={18} />
                      <span className="text-sm font-medium">Saved successfully!</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Billing Section */}
            {activeSection === 'billing' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Billing & Subscription</h2>
                  <p className="text-gray-600">Manage your subscription and payment methods</p>
                </div>

                <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Free Plan</h3>
                      <p className="text-sm text-gray-600 mt-1">Unlimited projects • 100 MB storage per project</p>
                    </div>
                    <span className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg">Active</span>
                  </div>
                  <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all">
                    Upgrade to Pro
                  </button>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Payment Methods</h3>
                  <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <p className="text-sm text-gray-600">No payment methods added</p>
                    <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Add Payment Method
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// Toggle component for settings
const ToggleOption = ({ title, description, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
    <div>
      <h3 className="font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
    <label className="relative inline-block w-12 h-6 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-full h-full bg-gray-300 peer-checked:bg-blue-600 rounded-full peer transition-colors"></div>
      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
    </label>
  </div>
);

export default SettingsPage;
