import { SignInButton, SignedIn, SignedOut } from '@clerk/clerk-react';
import { ArrowRight, Sparkles } from 'lucide-react';

const CTA = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/30 rounded-3xl p-12 md:p-16 overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:2rem_2rem]"></div>

          {/* Content */}
          <div className="relative z-10 text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-primary/20 border border-primary/40 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Limited Time Offer</span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Start Building
              <span className="text-primary"> Amazing Projects</span>
            </h2>

            {/* Description */}
            <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Join 50,000+ developers who are already using our platform to build faster, collaborate better, and deploy with confidence.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="group px-10 py-5 bg-primary hover:bg-secondary text-white rounded-lg text-lg font-semibold transition-all transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-primary/50">
                    <span>Start Free Trial</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <button className="group px-10 py-5 bg-primary hover:bg-secondary text-white rounded-lg text-lg font-semibold transition-all transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-primary/50">
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </SignedIn>
              <button className="px-10 py-5 bg-white/10 hover:bg-white/20 text-white border border-primary/30 rounded-lg text-lg font-semibold transition-all">
                View Pricing
              </button>
            </div>

            {/* Features list */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-10 right-10 w-32 h-32 bg-primary/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 left-10 w-32 h-32 bg-secondary/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
