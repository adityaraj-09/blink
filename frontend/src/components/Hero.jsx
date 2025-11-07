import { SignInButton, SignedIn, SignedOut } from '@clerk/clerk-react';
import { ArrowRight, Github, Code2, GitBranch } from 'lucide-react';
import Prism from './Prism';

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center">
      
      {/* Plasma Background */}
      <div className="absolute inset-0 z-0 flex  justify-center">
      <Prism
        height={3.5}
        baseWidth={5.5}
        animationType="rotate"
        glow={0.6}
        offset={{ x: 0, y: 0 }}
        noise={0.0}
        hueShift={0.5}
        colorFrequency={2}
        suspendWhenOffscreen={true}
        timeScale={0.4}
  
      />
      </div>

      {/* Animated background blobs */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 mb-8">
            <Github className="w-4 h-4 text-primary" />
            <span className="text-sm text-gray-300">Powered by GitHub</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Code Together,
            <br />
            <span className="text-primary">Build Faster</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto">
            The ultimate GitHub-based coding platform for developers.
            Collaborate, review, and deploy with seamless integration.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="group px-8 py-4 bg-primary hover:bg-secondary text-white rounded-lg text-lg font-semibold transition-all transform hover:scale-105 flex items-center space-x-2">
                  <span>Get Started Free</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <button className="group px-8 py-4 bg-primary hover:bg-secondary text-white rounded-lg text-lg font-semibold transition-all transform hover:scale-105 flex items-center space-x-2">
                <span>Go to Dashboard</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </SignedIn>
            <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-primary/30 rounded-lg text-lg font-semibold transition-all flex items-center space-x-2">
              <Github className="w-5 h-5" />
              <span>View on GitHub</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">50K+</div>
              <div className="text-gray-400">Active Developers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">100K+</div>
              <div className="text-gray-400">Repositories</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-gray-400">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-gray-400">Support</div>
            </div>
          </div>
        </div>

        {/* Visual Element */}
        <div className="mt-20 relative">
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl"></div>
            <div className="relative bg-[#1a1f26]/80 backdrop-blur-sm border border-primary/20 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex items-center space-x-2">
                  <Code2 className="w-4 h-4 text-primary" />
                  <span className="text-gray-400">// Initialize your project</span>
                </div>
                <div className="text-secondary">git clone https://github.com/your-repo</div>
                <div className="flex items-center space-x-2">
                  <GitBranch className="w-4 h-4 text-primary" />
                  <span className="text-gray-400">// Create a new branch</span>
                </div>
                <div className="text-secondary">git checkout -b feature/awesome</div>
                <div className="text-primary">✓ Ready to code!</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
