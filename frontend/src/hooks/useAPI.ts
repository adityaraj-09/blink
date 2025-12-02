import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { getAPIClient } from '../api/client';

/**
 * Hook to automatically inject auth token into API client
 * Uses Clerk for web authentication
 */
export function useAPIAuth() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    const apiClient = getAPIClient();

    if (isSignedIn) {
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
  }, [getToken, isSignedIn]);
}

/**
 * Hook to get an authenticated API call wrapper
 * Ensures the token is fresh for each API call
 */
export function useAuthenticatedAPI() {
  const { getToken, isSignedIn } = useAuth();

  const withAuth = async <T,>(apiCall: () => Promise<T>): Promise<T> => {
    const apiClient = getAPIClient();

    if (!isSignedIn) {
      throw new Error('User is not authenticated');
    }
    const token = await getToken();
    if (token) {
      apiClient.setAuthToken(token);
    }

    return await apiCall();
  };

  return { withAuth, isSignedIn };
}
