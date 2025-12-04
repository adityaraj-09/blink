import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { Menu, X, Code2 } from 'lucide-react';
import GlassSurface from './GlassSurface';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
  
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
            <Code2 className="w-8 h-8 text-gray-400" />
            <span className="text-xl font-bold">Merkle</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-300 hover:text-white transition-colors">
              Home
            </Link>
            <Link to="/#features" className="text-gray-300 hover:text-white transition-colors">
              Features
            </Link>
            <Link to="/pricing" className="text-gray-300 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link to="/editor" className="text-gray-300 hover:text-white transition-colors">
              Editor
            </Link>
            <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors">
              Testimonials
            </a>
          </div>

    
                <div className="hidden md:flex items-center space-x-4">
                <SignedOut>
                  <Link to="/sign-in">
                  <button type="button" className="relative inline-flex items-center justify-center gap-2 px-4 py-[9px]
                    rounded-[30px] transition-colors cursor-pointer
                    before:content-[''] before:absolute before:-top-[1px] before:-left-[1px] before:-z-[1] before:w-[calc(100%+2px)] before:h-[calc(100%+2px)] before:rounded-[30px] before:p-[1px]
                    bg-emerald-600 hover:bg-emerald-500 before:bg-gradient-to-b before:from-emerald-400 before:to-emerald-600"
                    style={{ backgroundImage: 'linear-gradient(rgba(108, 108, 108, 0.15), transparent)' }}>
                    <span className="relative w-fit font-normal text-[14px] leading-[20px] whitespace-nowrap flex items-center gap-2 transition-colors text-white [text-shadow:0px_0px_0.5px_#ffffff]">
                    Sign In
                    </span>
                  </button>
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link to="/dashboard">
                  <button type="button" className="relative inline-flex items-center justify-center gap-2 px-4 py-[9px]
                    rounded-[30px] transition-colors cursor-pointer
                    before:content-[''] before:absolute before:-top-[1px] before:-left-[1px] before:-z-[1] before:w-[calc(100%+2px)] before:h-[calc(100%+2px)] before:rounded-[30px] before:p-[1px]
                    bg-emerald-600 hover:bg-emerald-500 before:bg-gradient-to-b before:from-emerald-400 before:to-emerald-600"
                    style={{ backgroundImage: 'linear-gradient(rgba(108, 108, 108, 0.15), transparent)' }}>
                    <span className="relative w-fit font-normal text-[14px] leading-[20px] whitespace-nowrap flex items-center gap-2 transition-colors text-white [text-shadow:0px_0px_0.5px_#ffffff]">
                    Dashboard
                    </span>
                  </button>
                  </Link>
                  <UserButton afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        footer: "hidden",
                        userButton: "w-8 h-8 rounded-full",
                        userButtonAvatarBox: "w-8 h-8 rounded-full",
                        userButtonPopoverCard: "bg-[#0f1318] border border-white/10",
                        userButtonPopoverHeader: "border-b border-white/10",
                        userButtonPopoverFooter: "border-t border-white/10",
                        userButtonSignOutButton: "w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-600/10 transition-colors",
                      },
                    }}
                   />
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

    
    </nav>





    </>
  );
};

export default Navbar;
