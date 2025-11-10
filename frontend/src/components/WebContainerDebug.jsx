import { useState, useEffect } from 'react';

/**
 * WebContainer Debug Component
 * Shows cross-origin isolation status and requirements for WebContainer
 */
export default function WebContainerDebug() {
  const [status, setStatus] = useState({
    crossOriginIsolated: false,
    sharedArrayBufferAvailable: false,
    isHttps: false,
    currentUrl: '',
  });

  useEffect(() => {
    setStatus({
      crossOriginIsolated: self.crossOriginIsolated || false,
      sharedArrayBufferAvailable: typeof SharedArrayBuffer !== 'undefined',
      isHttps: window.location.protocol === 'https:',
      currentUrl: window.location.href,
    });
  }, []);

  const allGood = status.crossOriginIsolated && status.sharedArrayBufferAvailable;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-2xl max-w-md z-50 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">WebContainer Status</h3>
        {allGood ? (
          <span className="text-green-400 text-2xl">✅</span>
        ) : (
          <span className="text-red-400 text-2xl">❌</span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <StatusRow
          label="Cross-Origin Isolated"
          value={status.crossOriginIsolated}
          required
        />
        <StatusRow
          label="SharedArrayBuffer"
          value={status.sharedArrayBufferAvailable}
          required
        />
        <StatusRow
          label="HTTPS"
          value={status.isHttps}
          required
        />
        
        <div className="pt-2 border-t border-gray-700 mt-3">
          <p className="text-xs text-gray-400 break-all">
            URL: {status.currentUrl}
          </p>
        </div>

        {!allGood && (
          <div className="pt-3 border-t border-gray-700 mt-3">
            <p className="text-yellow-400 font-semibold mb-2">⚠️ Action Required:</p>
            <ol className="text-xs space-y-1 list-decimal list-inside">
              {!status.isHttps && (
                <li>Access via <code className="bg-gray-800 px-1">https://localhost:5173</code></li>
              )}
              {!status.crossOriginIsolated && (
                <>
                  <li>Ensure dev server is running with proper headers</li>
                  <li>Clear browser cache and restart</li>
                </>
              )}
              {!status.sharedArrayBufferAvailable && (
                <li>Try a different browser (Chrome/Edge/Firefox)</li>
              )}
            </ol>
          </div>
        )}

        {allGood && (
          <div className="pt-3 border-t border-gray-700 mt-3">
            <p className="text-green-400 text-sm">
              🎉 WebContainer should work!
            </p>
          </div>
        )}
      </div>

      <button
        onClick={() => {
          console.log('WebContainer Debug Info:');
          console.log('─────────────────────────');
          console.log('crossOriginIsolated:', self.crossOriginIsolated);
          console.log('SharedArrayBuffer:', typeof SharedArrayBuffer !== 'undefined');
          console.log('Protocol:', window.location.protocol);
          console.log('URL:', window.location.href);
          console.log('Headers (check Network tab in DevTools):');
          console.log('  - Cross-Origin-Embedder-Policy: require-corp');
          console.log('  - Cross-Origin-Opener-Policy: same-origin');
          alert('Check console for detailed info');
        }}
        className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
      >
        Log Debug Info to Console
      </button>
    </div>
  );
}

function StatusRow({ label, value, required }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-300">
        {label}
        {required && <span className="text-red-400">*</span>}
      </span>
      <span className={value ? 'text-green-400' : 'text-red-400'}>
        {value ? '✓' : '✗'}
      </span>
    </div>
  );
}

