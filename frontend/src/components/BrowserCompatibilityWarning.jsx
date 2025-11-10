import { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { isWebContainerSupported, getBrowserInfo } from '../services/webcontainer/init';

/**
 * Browser Compatibility Warning Component
 * Shows a warning banner if browser doesn't support WebContainer
 */
export default function BrowserCompatibilityWarning() {
  const [show, setShow] = useState(false);
  const [browserInfo, setBrowserInfo] = useState(null);

  useEffect(() => {
    const supported = isWebContainerSupported();
    const info = getBrowserInfo();

    setBrowserInfo(info);

    // Show warning if not supported
    if (!supported || !info.supported) {
      setShow(true);
    }
  }, []);

  if (!show || !browserInfo) {
    return null;
  }

  return (
    <div className="bg-yellow-900/30 border-b border-yellow-700/50 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AlertCircle className="text-yellow-400" size={20} />
        <div>
          <p className="text-yellow-200 font-medium text-sm">
            WebContainer Limited Support
          </p>
          <p className="text-yellow-300/80 text-xs mt-0.5">
            {browserInfo.message}
            {' · '}
            Terminal features may not work properly.
            {' '}
            <a
              href="https://webcontainers.io/guides/browser-support"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-yellow-200"
            >
              Learn more
            </a>
          </p>
        </div>
      </div>

      <button
        onClick={() => setShow(false)}
        className="text-yellow-400 hover:text-yellow-300 transition-colors"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>
    </div>
  );
}
