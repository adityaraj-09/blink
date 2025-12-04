import { Github, Twitter, Linkedin, ShoppingCart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[#020617] border-t border-slate-800/60 pt-16 sm:pt-24 pb-0 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-900/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-800/20 rounded-full blur-[128px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12 sm:mb-16">
          <div className="col-span-2 lg:col-span-2">
            <a href="/" className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">I</span>
              </div>
              <span className="text-white font-bold text-xl tracking-tight">Merkle</span>
            </a>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-6">
              Empowering developers to build the future with cutting-edge tools and a supportive community.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-100 text-sm uppercase tracking-wider mb-4">Product</h3>
            <ul className="space-y-3">
              <li><a href="#features" className="text-gray-300 text-sm hover:text-white transition-colors duration-200">Features</a></li>
              <li><a href="#pricing" className="text-gray-300 text-sm hover:text-white transition-colors duration-200">Pricing</a></li>
              <li><a href="#integrations" className="text-gray-300 text-sm hover:text-white transition-colors duration-200">Integrations</a></li>
              <li><a href="#changelog" className="text-gray-300 text-sm hover:text-white transition-colors duration-200">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-100 text-sm uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-3">
              <li><a href="#about" className="text-gray-300 text-sm hover:text-white transition-colors duration-200">About</a></li>
              <li><a href="#blog" className="text-gray-300 text-sm hover:text-white transition-colors duration-200">Blog</a></li>
              <li><a href="#careers" className="text-gray-300 text-sm hover:text-white transition-colors duration-200">Careers</a></li>
              <li><a href="#contact" className="text-gray-300 text-sm hover:text-white transition-colors duration-200">Contact</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-100 text-sm uppercase tracking-wider mb-4">Resources</h3>
            <ul className="space-y-3">
              <li><a href="#docs" className="text-gray-300 text-sm hover:text-white transition-colors duration-200">Documentation</a></li>
              <li><a href="#help" className="text-gray-300 text-sm hover:text-white transition-colors duration-200">Help Center</a></li>
              <li><a href="#community" className="text-gray-300 text-sm hover:text-white transition-colors duration-200">Community</a></li>
              <li><a href="#api" className="text-gray-300 text-sm hover:text-white transition-colors duration-200">API Reference</a></li>
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="relative mt-7 sm:mt-12 mb-0 py-8 border-t overflow-hidden border-slate-700/60 w-full flex justify-center">
          <div className="relative w-full max-w-[95%] mx-auto p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl shadow-black/20 flex flex-col items-center">
            <h3 className="font-medium text-gray-100 text-sm uppercase tracking-wider mb-3 text-center">Stay Updated</h3>
            <p className="text-gray-300 text-sm mb-4 text-center">Get the latest updates, templates, and design insights.</p>
            <div className="flex gap-3 w-full max-w-md flex-col sm:flex-row">
              <div className="flex-grow basis-0 h-[42px] bg-slate-900/20 backdrop-blur-sm rounded-xl border border-slate-800/50 shadow-[0px_1px_4px_0px_rgba(0,0,0,0.18)] relative hover:border-slate-700/50 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all duration-200 flex-1">
                <input
                  className="w-full h-full px-4 bg-transparent outline-none text-gray-200 text-[14px] tracking-[0.98px] font-light rounded-xl placeholder:text-gray-400 placeholder:font-light font-dm-sans"
                  placeholder="Enter your email"
                  type="email"
                />
              </div>
              <div className="z-10 select-none">
                <button type="button" className="relative inline-flex items-center justify-center gap-2 px-4 py-[9px] rounded-[30px] transition-colors cursor-pointer bg-emerald-600 hover:bg-emerald-500 w-full sm:w-auto">
                  <span className="relative w-fit font-normal text-[14px] leading-[20px] whitespace-nowrap flex items-center gap-2 transition-colors text-white">
                    Subscribe
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-700/60 flex flex-col md:flex-row justify-between items-center gap-4 pb-8">
          <p className="text-gray-400 text-sm">© 2025 Merkle. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-gray-400">Made with ❤️ for developers</span>
          </div>
        </div>
      </div>

    
    </footer>
  );
};

export default Footer;
