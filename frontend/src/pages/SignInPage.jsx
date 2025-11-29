import React, { useState } from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { dark } from '@clerk/themes';
import { isElectron } from '../services/electron';

const SignInPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const inElectron = isElectron();

  // Handle Electron auth - opens in system browser
  const handleElectronLogin = async () => {
    if (!window.electronAPI) return;

    setIsLoading(true);
    try {
      await window.electronAPI.auth.login();
      // Auth success will be handled by the auth listener
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  // Listen for auth success in Electron
  React.useEffect(() => {
    if (!window.electronAPI) {
      console.log('[SignIn] Not in Electron, skipping auth listener');
      return;
    }

    console.log('[SignIn] Setting up Electron auth listeners');

    const unsubSuccess = window.electronAPI.auth.onSuccess((data) => {
      console.log('[SignIn] Auth success received:', data.user?.email);
      setIsLoading(false);
      // Delay to ensure auth is fully propagated to global cache before navigation
      setTimeout(() => {
        console.log('[SignIn] Navigating to dashboard...');
        navigate('/dashboard');
      }, 200);
    });

    const unsubRestored = window.electronAPI.auth.onRestored((data) => {
      console.log('[SignIn] Auth restored:', data.user?.email);
      navigate('/dashboard');
    });

    // Check if already authenticated
    window.electronAPI.auth.getStored().then((authData) => {
      if (authData && authData.token) {
        console.log('[SignIn] Already authenticated, redirecting...');
        navigate('/dashboard');
      }
    });

    return () => {
      unsubSuccess();
      unsubRestored();
    };
  }, [navigate]);
  return (
    <div className="h-screen  bg-[#0f1318] flex items-center justify-center p-4 sm:p-8 font-dm-sans">
      <div className="w-full m-4 max-w-[1200px] bg-[#0f1318] rounded-[30px] overflow-hidden flex shadow-2xl border border-white/5 relative">
        
        {/* Background Gradients for the container */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px]"></div>
        </div>

        {/* Left Side - Image */}
        <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 bg-cover  z-10 object-contain" 
             style={{ backgroundImage: 'url("/images/m1.jpg")',objectFit: 'cover' }}>
          <div className="absolute inset-0 bg-[#020617]/60 "></div>
          <div className="absolute inset-0 bg-linear-to-t from-[#020617] via-transparent to-transparent"></div>
          
          <div className="relative z-10 w-full flex justify-end">
             <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white text-sm hover:bg-white/10 transition-all duration-300 group">
               Back to website <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
             </Link>
          </div>

          <div className="relative z-10">
            <h2 className="text-4xl lg:text-5xl font-clash-display font-medium text-white mb-6 leading-tight">
              Welcome Back
            </h2>
            <p className="text-gray-300 text-lg max-w-md leading-relaxed">
              Continue your journey of building amazing software with AI-powered tools.
            </p>
            
            <div className="flex gap-3 mt-12">
               <div className="w-12 h-1.5 bg-blue-500 rounded-full"></div>
               <div className="w-2 h-1.5 bg-white/20 rounded-full"></div>
               <div className="w-2 h-1.5 bg-white/20 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 bg-[#020617] p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative z-10">
           {/* Mobile Back Button */}
           <div className="lg:hidden absolute top-6 right-6">
             <Link to="/" className="text-gray-400 hover:text-white p-2">
               <ArrowLeft className="w-6 h-6" />
             </Link>
           </div>

           <div className=" mx-auto w-full">
             <div className="mb-10">
                <h1 className="text-3xl sm:text-4xl font-clash-display font-medium text-white mb-3">
                Sign In
                </h1>
                <p className="text-gray-400 text-base">
                Don't have an account? <Link to="/sign-up" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign up</Link>
                </p>
             </div>

             {inElectron ? (
               /* Electron: Custom auth buttons that open in system browser */
               <div className="space-y-4">
                 <button
                   onClick={handleElectronLogin}
                   disabled={isLoading}
                   className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white py-3.5 px-4 rounded-xl transition-all duration-300 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {isLoading ? (
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   ) : (
                     <svg className="w-5 h-5" viewBox="0 0 24 24">
                       <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                       <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                       <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                       <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                     </svg>
                   )}
                   <span className="font-medium">
                     {isLoading ? 'Opening browser...' : 'Continue with Google'}
                   </span>
                 </button>

                 <div className="flex items-center gap-3 my-6">
                   <div className="flex-1 h-px bg-white/10"></div>
                   <span className="text-gray-500 text-sm">or</span>
                   <div className="flex-1 h-px bg-white/10"></div>
                 </div>

                 <button
                   onClick={handleElectronLogin}
                   disabled={isLoading}
                   className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white py-3.5 px-4 rounded-xl transition-all duration-300 border border-white/10 disabled:opacity-50"
                 >
                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                   </svg>
                   <span className="font-medium">Continue with GitHub</span>
                 </button>

                 <p className="text-gray-500 text-sm text-center mt-6">
                   Sign in will open in your browser to use your existing accounts
                 </p>
               </div>
             ) : (
               /* Web: Use Clerk's built-in SignIn component */
               <SignIn
                 appearance={{
                   baseTheme: dark,
                   elements: {
                     rootBox: "w-full",

                     header: "hidden",
                     footer: "hidden",
                    headerTitle: "hidden",

                     formButtonPrimary: "bg-blue-600 border-none m-5 hover:bg-blue-500 text-white normal-case text-[15px] py-3  transition-all duration-300 shadow-lg shadow-blue-600/20",
                     formFieldInput: "bg-[#0f1318] text-white rounded-xl focus:border-blue-500 focus:ring-blue-500/20 py-3 px-4 transition-all duration-300",
                     formFieldLabel: "text-gray-400 text-sm font-medium mb-1.5",
                     socialButtonsBlockButton: "bg-white/5   text-white hover:bg-white/10 py-3 transition-all duration-300",
                     socialButtonsBlockButtonText: "font-medium",
                     dividerLine: "bg-white/10",
                     dividerText: "text-gray-500 text-sm",
                     formFieldAction: "text-blue-400 hover:text-blue-300 text-sm font-medium",
                     alert: "bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl",
                     identityPreviewText: "text-gray-300",
                     identityPreviewEditButton: "text-blue-400 hover:text-blue-300"
                   }
                 }}
               />
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
