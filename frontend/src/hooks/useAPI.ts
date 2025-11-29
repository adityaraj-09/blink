import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { getAPIClient } from '../api/client';
import { isElectron } from '../services/electron';

/**
 * Hook to automatically inject auth token into API client
 * Supports both Clerk (web) and Electron auth (desktop)
 */
export function useAPIAuth() {
  const { getToken, isSignedIn } = useAuth();
  const inElectron = isElectron();

  useEffect(() => {
    const apiClient = getAPIClient();

    if (inElectron) {
      // In Electron, use stored token
      console.log('🔑 useAPIAuth: Setting up Electron token getter');
      apiClient.setTokenGetter(async () => {
        try {
          const authData = await window.electronAPI?.auth.getStored();
          return authData?.token || null;
        } catch (error) {
          console.error('Failed to get Electron auth token:', error);
          return null;
        }
      });
    } else if (isSignedIn) {
      console.log('🔑 useAPIAuth: Setting up Clerk token getter');
      // Set up token getter that always gets fresh token
      apiClient.setTokenGetter(async () => {
        try {
          const token = await getToken();
          return token;
        } catch (error) {
          console.error('Failed to get auth token:', error);
          return null;
        }
      });
    } else {
      console.log('🔓 useAPIAuth: Clearing auth');
      apiClient.clearAuthToken();
    }
  }, [getToken, isSignedIn, inElectron]);
}

/**
 * Hook to get an authenticated API call wrapper
 * Ensures the token is fresh for each API call
 * Supports both Clerk (web) and Electron auth (desktop)
 */
export function useAuthenticatedAPI() {
  const { getToken, isSignedIn } = useAuth();
  const inElectron = isElectron();

  const withAuth = async <T,>(apiCall: () => Promise<T>): Promise<T> => {
    const apiClient = getAPIClient();

    if (inElectron) {
      // In Electron, get token from stored auth
      const authData = await window.electronAPI?.auth.getStored();
      if (!authData?.token) {
        throw new Error('User is not authenticated');
      }
      apiClient.setAuthToken(authData.token);
    } else {
      if (!isSignedIn) {
        throw new Error('User is not authenticated');
      }
      const token = await getToken();
      if (token) {
        apiClient.setAuthToken(token);
      }
    }

    return await apiCall();
  };

  // In Electron, auth status comes from stored token
  const isAuthenticated = inElectron ? true : isSignedIn; // ProtectedRoute ensures we're authed in Electron

  return { withAuth, isSignedIn: isAuthenticated };
}
