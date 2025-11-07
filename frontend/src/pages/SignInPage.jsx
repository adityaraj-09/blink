import { SignIn } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Code2, Terminal, GitBranch, Sparkles, Zap, Users } from 'lucide-react';

const SignInPage = () => {
  return (
    <div className="min-h-screen bg-[#1e2329] flex">
      {/* Left side - Welcome Card */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12">
        {/* Animated background gradients */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        {/* Main Welcome Card */}
        <div className="relative z-10 w-full max-w-2xl">
          {/* Logo at top */}
          <Link to="/" className="flex items-center space-x-2 mb-12">
            <Code2 className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold">CodeHub</span>
          </Link>

          {/* Card with darker background */}
          <div className="bg-[#0f1318] border border-primary/20 rounded-3xl p-10 relative overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5"></div>

            <div className="relative z-10 flex gap-8">
              {/* Left content */}
              <div className="flex-1 space-y-8">
                <div>
                  <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
                    Welcome Back
                  </div>
                  <h1 className="text-4xl font-bold mb-4 leading-tight">
                    Code Smarter,
                    <br />
                    <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                      Ship Faster
                    </span>
                  </h1>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    Join thousands of developers building amazing projects with real-time collaboration and AI-powered tools.
                  </p>
                </div>

                {/* Stats */}
                <div className="space-y-4 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      50K+
                    </div>
                    <div className="text-sm text-gray-400">Active Developers</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      10x
                    </div>
                    <div className="text-sm text-gray-400">Faster Deployment</div>
                  </div>
                </div>
              </div>

              {/* Right visual - Coding themed illustration */}
              <div className="flex-shrink-0 w-64 space-y-4">
                {/* Code window mockup */}
                <div className="bg-[#1a1f26] border border-primary/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/70"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-primary" />
                      <span className="text-gray-500">$ npm run dev</span>
                    </div>
                    <div className="text-green-400 pl-6">✓ Server running</div>
                    <div className="flex items-center gap-2 pt-2">
                      <GitBranch className="w-4 h-4 text-secondary" />
                      <span className="text-gray-500">git push origin main</span>
                    </div>
                    <div className="text-primary pl-6">→ Deploying...</div>
                  </div>
                </div>

                {/* Feature badges */}
                <div className="space-y-2">
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="text-sm font-semibold">AI Assistant</span>
                  </div>
                  <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-3 flex items-center gap-3">
                    <Zap className="w-5 h-5 text-secondary" />
                    <span className="text-sm font-semibold">Live Preview</span>
                  </div>
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-sm font-semibold">Team Sync</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-gray-400 text-center mt-8">
            © 2024 CodeHub. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Mobile gradient background */}
        <div className="absolute inset-0 lg:hidden">
          <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"></div>
        </div>

        {/* Form container */}
        <div className="relative z-10 w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center justify-center space-x-2 mb-8">
            <Code2 className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold">CodeHub</span>
          </Link>

          {/* Card wrapper with gradient border */}
          <div className="relative">
            {/* Gradient border effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-primary rounded-3xl blur opacity-30"></div>

            {/* Main card */}
            <div className="relative bg-[#1a1f26] rounded-3xl p-8 border border-primary/20">
          

              {/* Clerk SignIn component */}
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                redirectUrl="/"
                afterSignInUrl="/"
              />

              {/* Additional info */}
            
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
