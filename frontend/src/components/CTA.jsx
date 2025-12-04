import { SignInButton, SignedIn, SignedOut } from '@clerk/clerk-react';
import { ArrowRight, Check } from 'lucide-react';

const CTA = () => {
  return (
    <section className="mx-auto bg-[#020617]  border-[0.5px] border-slate-800/0 rounded-[12px] py-0 sm:py-12 md:py-16 pb-0 sm:pb-20 md:pb-25 relative w-full px-4 sm:px-6 overflow-hidden">
      <div className="relative z-10 flex flex-col">
        <div className="relative flex justify-center align-middle items-center" >
          <div className="text-center sm:mb-20 relative py-3 sm:py-10 pt-5 pb-8 bg-cover bg-center mb-0">
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
            Global Scale
          </div>
            <h2 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-4 sm:mb-6 relative z-10 font-clash-display leading-tight">
              Ready to Get Started?
            </h2>
            <p className="text-text-body text-sm sm:text-base md:text-lg max-w-sm sm:max-w-lg md:max-w-2xl mx-auto leading-relaxed relative z-10 font-dm-sans">
              Join 50,000+ developers who are already using our platform to build faster, collaborate better, and deploy with confidence.
            </p>
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl z-20 w-full mt-6 sm:mt-8">
          <div className="relative w-full h-[400px] sm:h-[500px] md:h-[500px] bg-slate-900/20 rounded-2xl border border-slate-800/50 overflow-hidden">
            
            {/* Map Background Effect */}
            <div className="absolute inset-0 opacity-40">
              <svg viewBox="0 0 800 400" className="w-full h-full absolute inset-0 pointer-events-none select-none" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"></feGaussianBlur>
                    <feMerge>
                      <feMergeNode in="coloredBlur"></feMergeNode>
                      <feMergeNode in="SourceGraphic"></feMergeNode>
                    </feMerge>
                  </filter>
                </defs>
                {/* Simulated Map Points */}
                {[
                  { cx: 72, cy: 30 }, { cx: 141, cy: 130 }, { cx: 298, cy: 252 },
                  { cx: 576, cy: 154 }, { cx: 697, cy: 121 }, { cx: 486, cy: 220 },
                  { cx: 408, cy: 114 }, { cx: 408, cy: 155 }, { cx: 200, cy: 80 },
                  { cx: 650, cy: 300 }, { cx: 100, cy: 300 }, { cx: 750, cy: 100 }
                ].map((point, i) => (
                  <g key={i}>
                    <circle cx={point.cx} cy={point.cy} r="2" fill="#10b981" filter="url(#glow)"></circle>
                    <circle cx={point.cx} cy={point.cy} r="8" fill="#10b981" opacity="0.3">
                      <animate attributeName="r" from="2" to="12" dur={`${2 + i%3}s`} begin={`${i%2}s`} repeatCount="indefinite"></animate>
                      <animate attributeName="opacity" from="0.6" to="0" dur={`${2 + i%3}s`} begin={`${i%2}s`} repeatCount="indefinite"></animate>
                    </circle>
                  </g>
                ))}
              </svg>
            </div>
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/20 via-transparent to-[#020617]/20"></div>

            {/* CTA Card Overlay */}
            <div className="flex justify-center    items-center z-20 w-full px-4">
              <div className="bg-gradient-to-br from-slate-900/55 via-gray-900/45 to-slate-800/40 backdrop-blur-md rounded-xl shadow-2xl p-6 sm:p-8 md:p-10 w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto relative overflow-hidden border border-slate-700/50">
                <div className="relative z-10 text-center">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-clash-display font-normal tracking-normal mb-2 text-slate-100">
                    Start Building Today
                  </h3>
                  <p className="text-gray-300 text-sm sm:text-base mb-6 sm:mb-8 leading-relaxed font-normal">
                    Join <span className="font-medium text-emerald-300">4,000+</span> startups using our platform to grow smarter.
                  </p>
                  
                  <div className="space-y-4">
                    <SignedOut>
                      <SignInButton mode="modal">
                        <button className="relative inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-500 w-full text-white font-medium shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40 transform hover:-translate-y-0.5">
                          <span>Get Started Free</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </SignInButton>
                    </SignedOut>
                    <SignedIn>
                      <button className="relative inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-500 w-full text-white font-medium shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40 transform hover:-translate-y-0.5">
                        <span>Go to Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </SignedIn>
                    
                    <p className="text-xs sm:text-sm text-gray-400 mt-3 font-normal flex items-center justify-center gap-2">
                      <Check className="w-3 h-3 text-green-400" /> No credit card required
                      <span className="mx-1">•</span>
                      <Check className="w-3 h-3 text-green-400" /> 14-day free trial
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Brand SVG Animation */}
            <div className="absolute w-full h-[180px] sm:h-[220px] md:h-[250px] translate-y-[55%] bottom-0 pointer-events-none select-none">
              <div className="w-full h-full">
                <svg width="100%" height="100%" viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" className="select-none">
                  <defs>
                    <linearGradient id="textGradient" gradientUnits="userSpaceOnUse" cx="50%" cy="50%" r="25%">
                      <stop offset="0%" stopColor="#eab308"></stop>
                      <stop offset="25%" stopColor="#ef4444"></stop>
                      <stop offset="50%" stopColor="#3b82f6"></stop>
                      <stop offset="75%" stopColor="#06b6d4"></stop>
                      <stop offset="100%" stopColor="#8b5cf6"></stop>
                    </linearGradient>
                    <radialGradient id="revealMask" gradientUnits="userSpaceOnUse" r="20%" cx="56.38167%" cy="78.56365%">
                      <stop offset="0%" stopColor="white"></stop>
                      <stop offset="100%" stopColor="black"></stop>
                    </radialGradient>
                    <mask id="textMask">
                      <rect x="0" y="0" width="100%" height="100%" fill="url(#revealMask)"></rect>
                    </mask>
                  </defs>
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" strokeWidth="0.3" className="fill-transparent stroke-neutral-200 font-[helvetica] text-7xl font-bold opacity-70">Brand</text>
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" strokeWidth="0.3" className="fill-transparent stroke-neutral-200 font-[helvetica] text-7xl font-bold" strokeDashoffset="0" strokeDasharray="1500">Brand</text>
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" stroke="url(#textGradient)" strokeWidth="0.3" mask="url(#textMask)" className="fill-transparent font-[helvetica] text-7xl font-bold">Brand</text>
                </svg>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
