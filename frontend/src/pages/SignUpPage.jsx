import { SignUp } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Code2, CheckCircle } from 'lucide-react';

const SignUpPage = () => {
  const benefits = [
    "Unlimited private repositories",
    "Advanced collaboration tools",
    "AI-powered code suggestions",
    "24/7 priority support",
    "Enterprise-grade security",
    "Free 14-day trial"
  ];

  return (
    <div className="min-h-screen bg-[#1e2329] flex">
      {/* Left side - Branding & Benefits */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated background gradients */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-secondary/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Code2 className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold">CodeHub</span>
          </Link>

          {/* Main content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl font-bold mb-4 leading-tight">
                Start Building
                <br />
                <span className="bg-gradient-to-r from-secondary via-primary to-secondary bg-clip-text text-transparent">
                  Something Amazing
                </span>
              </h1>
              <p className="text-xl text-gray-400">
                Get started with our platform and unlock powerful development tools
              </p>
            </div>

            {/* Benefits list */}
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 group"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-300 group-hover:text-white transition-colors">{benefit}</span>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="pt-8 border-t border-primary/20">
              <p className="text-sm text-gray-400 mb-4">Trusted by developers at</p>
              <div className="flex flex-wrap gap-6 opacity-60">
                <span className="text-lg font-semibold">Google</span>
                <span className="text-lg font-semibold">Microsoft</span>
                <span className="text-lg font-semibold">Amazon</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-gray-400">
            © 2024 CodeHub. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right side - Sign Up Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Mobile gradient background */}
        <div className="absolute inset-0 lg:hidden">
          <div className="absolute top-20 left-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
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
            <div className="absolute -inset-1 bg-gradient-to-r from-secondary via-primary to-secondary rounded-3xl blur opacity-30"></div>

            {/* Main card */}
            <div className="relative bg-[#1a1f26] rounded-3xl p-8 border border-primary/20">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold mb-2">Create Account</h2>
                <p className="text-gray-400">Start your free trial today</p>
              </div>

              {/* Clerk SignUp component */}
              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                redirectUrl="/"
                afterSignUpUrl="/"
              />

              {/* Additional info */}
              <div className="mt-6 pt-6 border-t border-primary/20">
                <p className="text-center text-sm text-gray-400">
                  Already have an account?{' '}
                  <Link to="/sign-in" className="text-primary hover:text-secondary transition-colors font-semibold">
                    Sign in
                  </Link>
                </p>
              </div>

              {/* Back to home */}
              <div className="mt-4 text-center">
                <Link to="/" className="text-sm text-gray-400 hover:text-primary transition-colors">
                  ← Back to home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
