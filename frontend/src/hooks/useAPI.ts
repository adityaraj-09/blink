import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { getAPIClient } from '../api/client';

/**
 * Hook to automatically inject Clerk auth token into API client
 * Call this at the top level of your app or in components that make API calls
 * Uses token getter function to always get fresh tokens
 */
export function useAPIAuth() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    const apiClient = getAPIClient();

    if (isSignedIn) {
      console.log('🔑 useAPIAuth: Setting up token getter');
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
  }, [getToken, isSignedIn]);
}

/**
 * Hook to get an authenticated API call wrapper
 * Ensures the token is fresh for each API call
 */
export function useAuthenticatedAPI() {
  const { getToken, isSignedIn } = useAuth();

  const withAuth = async <T,>(apiCall: () => Promise<T>): Promise<T> => {
    if (!isSignedIn) {
      throw new Error('User is not authenticated');
    }

    try {
      const token = await getToken();
      if (token) {
        const apiClient = getAPIClient();
        apiClient.setAuthToken(token);
      }
      return await apiCall();
    } catch (error) {
      throw error;
    }
  };

  return { withAuth, isSignedIn };
}
