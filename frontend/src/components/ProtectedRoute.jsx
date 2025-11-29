import { useAuth } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Check once at module load if we're in Electron
const IN_ELECTRON = !!(window.electronAPI?.isElectron);

// Global cache for Electron auth to persist across component instances
let cachedElectronAuth = null;
let authInitialized = false;
let authListeners = new Set();

// Notify all mounted ProtectedRoute components when auth changes
function notifyAuthChange(auth) {
  cachedElectronAuth = auth;
  authListeners.forEach(listener => listener(auth));
}

// Initialize auth and set up global listeners ONCE at module load
if (IN_ELECTRON && window.electronAPI) {
  // Get initial auth state
  window.electronAPI.auth.getStored().then((auth) => {
    cachedElectronAuth = auth;
    authInitialized = true;
    notifyAuthChange(auth);
  });

  // Set up global listeners that persist across component lifecycles
  window.electronAPI.auth.onSuccess((data) => {
    console.log('[ProtectedRoute:Global] Auth success received');
    const newAuth = { token: data.token, user: data.user, timestamp: Date.now() };
    notifyAuthChange(newAuth);
  });

  window.electronAPI.auth.onRestored((data) => {
    console.log('[ProtectedRoute:Global] Auth restored');
    const newAuth = { token: data.token, user: data.user, timestamp: Date.now() };
    notifyAuthChange(newAuth);
  });

  window.electronAPI.auth.onLoggedOut(() => {
    console.log('[ProtectedRoute:Global] Logged out');
    notifyAuthChange(null);
  });
}

/**
 * ProtectedRoute - Ensures user is authenticated before accessing route
 * Supports both Clerk auth (web) and Electron auth (desktop)
 */
const ProtectedRoute = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const location = useLocation();
  const [electronAuth, setElectronAuth] = useState(cachedElectronAuth);
  const [isChecking, setIsChecking] = useState(IN_ELECTRON && !authInitialized);

  useEffect(() => {
    if (!IN_ELECTRON) return;

    // Always re-check stored auth when component mounts
    // This catches the case where auth was stored but the event was missed
    window.electronAPI.auth.getStored().then((auth) => {
      console.log('[ProtectedRoute] Fresh auth check:', !!auth?.token);
      if (auth && auth.token) {
        cachedElectronAuth = auth;
        setElectronAuth(auth);
      }
      setIsChecking(false);
    });

    // Subscribe to global auth changes
    const handleAuthChange = (auth) => {
      console.log('[ProtectedRoute] Auth changed:', !!auth?.token);
      setElectronAuth(auth);
      setIsChecking(false);
    };

    authListeners.add(handleAuthChange);

    return () => {
      authListeners.delete(handleAuthChange);
    };
  }, []);

  // In Electron, only care about Electron auth
  if (IN_ELECTRON) {
    if (isChecking) {
      return (
        <div className="min-h-screen bg-[#0f1318] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    // Check both component state and global cache (global cache may be more recent)
    const hasAuth = (electronAuth && electronAuth.token) || (cachedElectronAuth && cachedElectronAuth.token);

    if (!hasAuth) {
      console.log('[ProtectedRoute] No auth found, redirecting to sign-in');
      return <Navigate to="/sign-in" state={{ from: location }} replace />;
    }

    return children;
  }

  // In web, use Clerk auth
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0f1318] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
