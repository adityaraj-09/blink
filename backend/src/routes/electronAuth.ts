import { Router, Response, Request } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { log } from '../utils/logger';

/**
 * Electron Auth Routes
 * Provides a browser-based auth flow for Electron apps
 *
 * Flow:
 * 1. Electron opens popup to /auth/electron
 * 2. User signs in with Clerk
 * 3. After success, page sends postMessage to opener with token
 * 4. Electron receives token and stores it
 */
export function createElectronAuthRoutes(clerkPublishableKey: string): Router {
    const router = Router();

    /**
     * GET /auth/electron
     * Serves the Clerk auth page for Electron popup
     */
    router.get('/electron', (req: Request, res: Response) => {
        const callback = req.query.callback || 'postMessage';
        const redirectUri = req.query.redirect_uri as string || '';

        log.info(`[ElectronAuth] Serving auth page (callback: ${callback})`);

        // Serve an HTML page with Clerk
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in to Insien Editor</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #1e1e1e;
            color: #ffffff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            max-width: 400px;
            width: 100%;
            text-align: center;
        }
        .logo {
            width: 64px;
            height: 64px;
            margin-bottom: 16px;
            color: #7c3aed;
        }
        h1 {
            font-size: 24px;
            margin-bottom: 8px;
        }
        .subtitle {
            color: #a0a0a0;
            margin-bottom: 32px;
        }
        .loading {
            color: #a0a0a0;
            margin-top: 20px;
        }
        .success {
            background: #22c55e20;
            border: 1px solid #22c55e;
            border-radius: 8px;
            padding: 16px;
            margin-top: 20px;
        }
        .error {
            background: #ef444420;
            border: 1px solid #ef4444;
            border-radius: 8px;
            padding: 16px;
            margin-top: 20px;
        }
        #clerk-auth {
            margin-top: 20px;
        }
        /* Override Clerk styles for dark theme */
        .cl-rootBox {
            width: 100%;
        }
        .cl-card {
            background: #2d2d2d !important;
            border: 1px solid #404040 !important;
        }
    </style>
</head>
<body>
    <div class="container">
        <svg class="logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h1>Insien Editor</h1>
        <p class="subtitle">Sign in to continue</p>

        <div id="clerk-auth"></div>
        <div id="status"></div>
    </div>

    <script
        async
        crossorigin="anonymous"
        data-clerk-publishable-key="${clerkPublishableKey}"
        src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
        type="text/javascript"
    ></script>
    <script>
        const callbackMethod = '${callback}';
        const redirectUri = '${redirectUri}';

        async function init() {
            const statusEl = document.getElementById('status');

            try {
                // Wait for Clerk to be ready
                await window.Clerk.load();

                const clerk = window.Clerk;

                // Check if already signed in
                if (clerk.user) {
                    await handleAuthSuccess(clerk);
                    return;
                }

                // Mount sign-in UI
                clerk.mountSignIn(document.getElementById('clerk-auth'), {
                    appearance: {
                        variables: {
                            colorPrimary: '#7c3aed',
                            colorBackground: '#2d2d2d',
                            colorText: '#ffffff',
                            colorTextSecondary: '#a0a0a0',
                            colorInputBackground: '#1e1e1e',
                            colorInputText: '#ffffff',
                            borderRadius: '8px',
                        }
                    }
                });

                // Listen for sign-in completion
                clerk.addListener(async (event) => {
                    if (clerk.user) {
                        await handleAuthSuccess(clerk);
                    }
                });

            } catch (error) {
                console.error('Clerk init error:', error);
                statusEl.innerHTML = '<div class="error">Failed to initialize authentication. Please try again.</div>';
                sendToOpener({ type: 'AUTH_ERROR', error: error.message });
            }
        }

        async function handleAuthSuccess(clerk) {
            const statusEl = document.getElementById('status');
            const authEl = document.getElementById('clerk-auth');

            try {
                // Get session token
                const token = await clerk.session.getToken();
                const user = clerk.user;

                const userData = {
                    id: user.id,
                    email: user.primaryEmailAddress?.emailAddress,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName || (user.firstName + ' ' + user.lastName).trim(),
                    imageUrl: user.imageUrl,
                };

                // Hide sign-in form
                authEl.style.display = 'none';
                statusEl.innerHTML = '<div class="success">✓ Signed in successfully! Returning to app...</div>';

                // Handle based on callback method
                if ((callbackMethod === 'protocol' || callbackMethod === 'redirect') && redirectUri) {
                    // Redirect to callback URL (Electron local server or custom protocol)
                    const params = new URLSearchParams({
                        token: token,
                        user: encodeURIComponent(JSON.stringify(userData)),
                    });
                    const fullRedirectUri = redirectUri + '?' + params.toString();
                    console.log('Redirecting to:', fullRedirectUri);
                    window.location.href = fullRedirectUri;
                } else {
                    // Send via postMessage (for popup mode)
                    sendToOpener({
                        type: 'AUTH_SUCCESS',
                        user: userData,
                        token: token,
                    });

                    // Auto-close after a short delay
                    setTimeout(() => {
                        window.close();
                    }, 1500);
                }

            } catch (error) {
                console.error('Auth success handling error:', error);
                statusEl.innerHTML = '<div class="error">Failed to complete sign-in. Please try again.</div>';
                sendToOpener({ type: 'AUTH_ERROR', error: error.message });
            }
        }

        function sendToOpener(data) {
            if (window.opener) {
                // Send to all possible origins (Electron file:// and localhost)
                try {
                    window.opener.postMessage(data, '*');
                } catch (e) {
                    console.error('postMessage error:', e);
                }
            }
        }

        // Wait for Clerk script to load, then initialize
        function waitForClerk() {
            if (window.Clerk) {
                init();
            } else {
                setTimeout(waitForClerk, 50);
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', waitForClerk);
        } else {
            waitForClerk();
        }
    </script>
</body>
</html>
        `;

        // Set CSP headers to allow Clerk scripts and inline scripts
        res.setHeader('Content-Security-Policy', [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.clerk.accounts.dev https://*.clerk.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://api.clerk.dev",
            "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
        ].join('; '));
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    });


    router.get('/electron/silent-refresh', (req: Request, res: Response) => {
        log.info('[ElectronAuth] Silent refresh requested');

        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Token Refresh</title>
</head>
<body>
    <script
        async
        crossorigin="anonymous"
        data-clerk-publishable-key="${clerkPublishableKey}"
        src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
        type="text/javascript"
    ></script>
    <script>
        async function refreshToken() {
            try {
                await window.Clerk.load();
                const clerk = window.Clerk;

                if (clerk.session) {
                    // Get fresh token from existing session
                    const token = await clerk.session.getToken();

                    if (token) {
                        // Send success to parent
                        if (window.parent && window.parent !== window) {
                            window.parent.postMessage({
                                type: 'TOKEN_REFRESH_SUCCESS',
                                token: token,
                                expiresIn: 3600000 // 1 hour
                            }, '*');
                        }
                        return;
                    }
                }

                // No session or token - send failure
                sendFailure('No active session');
            } catch (error) {
                console.error('Silent refresh error:', error);
                sendFailure(error.message || 'Unknown error');
            }
        }

        function sendFailure(error) {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'TOKEN_REFRESH_FAILED',
                    error: error
                }, '*');
            }
        }

        // Wait for Clerk script to load, then refresh
        function waitForClerk() {
            if (window.Clerk) {
                refreshToken();
            } else {
                setTimeout(waitForClerk, 50);
            }
        }
        waitForClerk();
    </script>
</body>
</html>
        `;

        // Set CSP headers
        res.setHeader('Content-Security-Policy', [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.clerk.accounts.dev https://*.clerk.com",
            "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://api.clerk.dev",
        ].join('; '));
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    });


    return router;
}
