import { auth } from '@webcontainer/api';

/**
 * Initialize WebContainer authentication
 * Call this once at app startup (in main.jsx or App.jsx)
 */
export function initWebContainerAuth(): void {
  try {
    const clientId = import.meta.env.VITE_WEBCONTAINER_CLIENT_ID ||
                    'wc_api_itsrishabhforyou_e6d3698449b4aeac06751c047764187a';

    if (!clientId || clientId === 'your_webcontainer_client_id_here') {
    
      return;
    }

    auth.init({
      clientId,
      scope: '',
    });
    console.log('✅ WebContainer authentication initialized');
    console.log(`🔑 Using client ID: ${clientId.substring(0, 20)}...`);
  } catch (error) {
    console.error('❌ WebContainer auth initialization failed:', error);

    if (error instanceof Error) {
      if (error.message.includes('referrer')) {
      
      }
    }

    // Don't throw - allow app to continue, but WebContainer features may not work
  }
}

/**
 * Check if WebContainer is supported in current browser
 */
export function isWebContainerSupported(): boolean {
  try {
    // Check for required features
    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
    const hasWebAssembly = typeof WebAssembly !== 'undefined';
    const hasWorker = typeof Worker !== 'undefined';

    const supported = hasSharedArrayBuffer && hasWebAssembly && hasWorker;

    if (!supported) {
      console.warn('[WebContainer] Browser not fully supported', {
        SharedArrayBuffer: hasSharedArrayBuffer,
        WebAssembly: hasWebAssembly,
        Worker: hasWorker,
      });
    }

    return supported;
  } catch (error) {
    console.error('[WebContainer] Support check failed:', error);
    return false;
  }
}

/**
 * Get browser compatibility info
 */
export function getBrowserInfo(): {
  name: string;
  supported: boolean;
  message: string;
} {
  const ua = navigator.userAgent;

  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    const match = ua.match(/Chrome\/(\d+)/);
    const version = match ? parseInt(match[1]) : 0;
    return {
      name: 'Chrome',
      supported: version >= 84,
      message: version >= 84
        ? '✅ Fully supported'
        : `❌ Chrome ${version} detected. Chrome 84+ required.`,
    };
  }

  if (ua.includes('Edg')) {
    const match = ua.match(/Edg\/(\d+)/);
    const version = match ? parseInt(match[1]) : 0;
    return {
      name: 'Edge',
      supported: version >= 84,
      message: version >= 84
        ? '✅ Fully supported'
        : `❌ Edge ${version} detected. Edge 84+ required.`,
    };
  }

  if (ua.includes('Safari') && !ua.includes('Chrome')) {
    const match = ua.match(/Version\/(\d+)/);
    const version = match ? parseInt(match[1]) : 0;
    return {
      name: 'Safari',
      supported: version >= 15,
      message: version >= 15
        ? '✅ Supported (may have limitations)'
        : `⚠️ Safari ${version} detected. Safari 15.2+ recommended.`,
    };
  }

  if (ua.includes('Firefox')) {
    return {
      name: 'Firefox',
      supported: false,
      message: '❌ Firefox not currently supported (SharedArrayBuffer required)',
    };
  }

  return {
    name: 'Unknown',
    supported: false,
    message: '⚠️ Unknown browser. Chrome 84+ or Edge 84+ recommended.',
  };
}

export default {
  initWebContainerAuth,
  isWebContainerSupported,
  getBrowserInfo,
};
