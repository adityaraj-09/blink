import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { Menu, X, Code2 } from 'lucide-react';
import GlassSurface from './GlassSurface';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center py-4">
      <GlassSurface
        width="80%"
        height={64}
        borderRadius={50}
        brightness={10}
        opacity={0.3}
        blur={100}
        backgroundOpacity={0.3}

        saturation={1.2}
        className=""
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Code2 className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">CodeHub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-300 hover:text-primary transition-colors">
              Home
            </Link>
            <Link to="/#features" className="text-gray-300 hover:text-primary transition-colors">
              Features
            </Link>
            <Link to="/pricing" className="text-gray-300 hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link to="/editor" className="text-gray-300 hover:text-primary transition-colors">
              Editor
            </Link>
            <a href="#testimonials" className="text-gray-300 hover:text-primary transition-colors">
              Testimonials
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <SignedOut>
              <Link to="/sign-in">
                <button className="px-6 py-2 bg-linear-to-r from-primary to-secondary hover:from-secondary hover:to-primary text-white rounded-lg transition-all transform hover:scale-105">
                  Sign In
                </button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link to="/dashboard">
                <button className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-primary/20 text-white rounded-lg transition-all">
                  Dashboard
                </button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          </div>
        </div>
      </GlassSurface>

      {/* Mobile menu */}
      {isOpen && (
        <GlassSurface
          width="100%"
          borderRadius={0}
          brightness={10}
          opacity={0.95}
          blur={12}
          backgroundOpacity={0.4}
          saturation={1.2}
          className="md:hidden border-b border-primary/20"
        >
          <div className="px-4 pt-2 pb-4 space-y-3 w-full">
            <Link
              to="/"
              className="block py-2 text-gray-300 hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/#features"
              className="block py-2 text-gray-300 hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Features
            </Link>
            <Link
              to="/pricing"
              className="block py-2 text-gray-300 hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Pricing
            </Link>
            <Link
              to="/editor"
              className="block py-2 text-gray-300 hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Editor
            </Link>
            <a
              href="#testimonials"
              className="block py-2 text-gray-300 hover:text-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Testimonials
            </a>
            <div className="pt-4 border-t border-primary/20">
              <SignedOut>
                <Link to="/sign-in" onClick={() => setIsOpen(false)}>
                  <button className="w-full px-6 py-2 bg-linear-to-r from-primary to-secondary hover:from-secondary hover:to-primary text-white rounded-lg transition-all">
                    Sign In
                  </button>
                </Link>
              </SignedOut>
              <SignedIn>
                <div className="flex items-center justify-center">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </SignedIn>
            </div>
          </div>
        </GlassSurface>
      )}
    </nav>
  );
};

export default Navbar;
