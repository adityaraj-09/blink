import { apiClient } from './client';

export interface UserProfile {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  imageUrl: string;
  createdAt: number;
  lastLoginAt: number;
  bio: string | null;
  location: string | null;
  website: string | null;
  metadata: any;
}

export interface UserStats {
  projects: number;
  files: number;
  chunks: number;
  chatMessages: number;
  commits: number;
  githubConnected: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  dateFormat: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  projectUpdates: boolean;
  securityAlerts: boolean;
  weeklyDigest: boolean;
  profileVisibility: 'public' | 'private';
  showEmail: boolean;
  showActivity: boolean;
}

export interface UserActivity {
  type: string;
  action: string;
  target: string;
  time: number;
  projectName?: string;
  projectId?: string;
  repoName?: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  bio?: string;
  location?: string;
  website?: string;
}

export interface UpdatePreferencesRequest {
  theme?: 'light' | 'dark';
  language?: string;
  dateFormat?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  projectUpdates?: boolean;
  securityAlerts?: boolean;
  weeklyDigest?: boolean;
  profileVisibility?: 'public' | 'private';
  showEmail?: boolean;
  showActivity?: boolean;
}

/**
 * Get current user profile
 */
export async function getUserProfile(): Promise<UserProfile> {
  return apiClient.get<UserProfile>('/api/users/me');
}

/**
 * Update current user profile
 */
export async function updateUserProfile(data: UpdateProfileRequest): Promise<{ message: string }> {
  return apiClient.put<{ message: string }>('/api/users/me', data);
}

/**
 * Get user statistics
 */
export async function getUserStats(): Promise<UserStats> {
  return apiClient.get<UserStats>('/api/users/me/stats');
}

/**
 * Get user preferences
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  return apiClient.get<UserPreferences>('/api/users/me/preferences');
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(data: UpdatePreferencesRequest): Promise<{ message: string }> {
  return apiClient.put<{ message: string }>('/api/users/me/preferences', data);
}

/**
 * Get user activity
 */
export async function getUserActivity(limit: number = 20): Promise<{ activity: UserActivity[] }> {
  return apiClient.get<{ activity: UserActivity[] }>(`/api/users/me/activity?limit=${limit}`);
}
