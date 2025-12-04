import React from 'react';
import { Check } from 'lucide-react';

const Pricing = () => {
  return (
    <section className="relative bg-[#020617] bg-bg-dark pt-6 sm:pt-8 md:pt-10 py-6 sm:py-8 md:py-10 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-900/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-800/20 rounded-full blur-[128px] pointer-events-none"></div>

      <div className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[1250px] mx-auto p-4 sm:p-6 pt-8 sm:pt-12 md:pt-15 pb-6 sm:pb-8 md:pb-10 relative z-20 border-[0.5px] border-slate-800/0 rounded-[12px] overflow-hidden">
        
        {/* Background Effects */}
        <div className="absolute inset-0 w-full h-full z-0 max-w-[1000px] mx-auto translate-x-1/2 top-1/3 rotate-z-90" style={{ opacity: 1 }}>
          <div className="absolute inset-0 bg-bg-dark"></div>
          <div className="absolute animate-fade-in" style={{ top: '-25%', width: '10%', left: '20%', height: '120%', transform: 'rotate(25deg) translateZ(0px)', transformOrigin: 'center top', zIndex: 1 }}>
             <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20" style={{ width: '8px', height: '8px', background: 'radial-gradient(circle, rgb(16, 185, 129) 0%, rgba(16, 185, 129, 0.8) 30%, rgba(16, 185, 129, 0.4) 70%, transparent 100%)', borderRadius: '50%', filter: 'blur(0.5px)' }}></div>
             <div className="absolute top-0 left-0 w-full" style={{ height: '100%', transformOrigin: 'center top' }}>
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 animate-smooth-fade-in" style={{ width: '4%', height: '100%', background: 'linear-gradient(rgba(16, 185, 129, 0.56) 0%, rgba(16, 185, 129, 0) 100%)', filter: 'blur(32px)', mixBlendMode: 'screen' }}></div>
             </div>
          </div>
          <div className="absolute top-0 left-0 w-full h-full opacity-15 animate-pulse-slow" style={{ background: 'radial-gradient(at center top, rgba(52, 211, 153, 0.2) 0%, rgba(52, 211, 153, 0) 70%)', filter: 'blur(40px)' }}></div>
        </div>

        <div className="text-center sm:mb-20 relative py-3 sm:py-10 pt-5 pb-8 bg-cover bg-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
            Pricing Plans
          </div>
          <h2 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-4 sm:mb-6 relative z-10 font-clash-display leading-tight">
            Start free, scale smart
          </h2>
          <p className="text-text-body text-sm sm:text-base md:text-lg max-w-sm sm:max-w-lg md:max-w-2xl mx-auto leading-relaxed relative z-10 font-dm-sans">
            Choose the perfect plan for your coding journey. Start free and upgrade as you grow. All plans include core AI features.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6 mx-auto max-w-6xl relative z-10">
          
          {/* Starter Plan */}
          <div className="min-h-[692px] relative p-[1px] rounded-[20px] h-auto w-full group transition-all duration-300 bg-gradient-to-b from-white/10 to-white/5">
            <div className="w-full h-full rounded-[19px] relative flex flex-col p-8 bg-bg-dark/90 backdrop-blur-xl border border-white/10">
              <h3 className="text-white text-xl font-bold mb-2 font-clash-display">Starter</h3>
              <p className="text-gray-300 text-sm mb-6 font-dm-sans leading-relaxed">Perfect for individual developers getting started with AI-assisted coding.</p>
              <div className="mb-6">
                <div className="flex items-end mb-2">
                  <span className="text-4xl font-bold text-white font-clash-display">$0</span>
                  <span className="text-gray-400 text-sm mb-1 ml-1 font-dm-sans">/month</span>
                </div>
                <p className="text-gray-400 text-sm font-dm-sans">Free forever for individuals</p>
              </div>
              
              <div className="flex-grow mb-8">
                <h4 className="text-white text-sm font-medium mb-4 font-dm-sans uppercase tracking-wider">What's included:</h4>
                <ul className="flex flex-col gap-3">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-600/20 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-sm font-dm-sans text-gray-300">Basic AI code completion</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-600/20 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-sm font-dm-sans text-gray-300">Community support</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-600/20 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-sm font-dm-sans text-gray-300">5 Projects</span>
                  </li>
                </ul>
              </div>
              <div className="z-10 select-none">
                <button type="button" className="relative inline-flex items-center justify-center gap-2 px-4 py-[9px] rounded-[30px] transition-colors cursor-pointer bg-emerald-600 hover:bg-emerald-500 w-full font-dm-sans border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/10 hover:border-emerald-400/50">
                  <span className="relative w-fit font-normal text-[14px] leading-[20px] whitespace-nowrap flex items-center gap-2 transition-colors text-white">Start Free</span>
                </button>
              </div>
            </div>
          </div>

          {/* Growth Plan */}
          <div className="min-h-[692px] relative p-[1px] rounded-[20px] h-auto w-full group transition-all duration-300 bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700">
            <div className="w-full h-full rounded-[19px] relative flex flex-col p-8 bg-bg-dark/90 backdrop-blur-xl border border-white/10">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="px-3 py-1 bg-emerald-600 text-white text-xs font-medium rounded-full font-dm-sans shadow-lg">Most Popular</div>
              </div>
              <h3 className="text-white text-xl font-bold mb-2 font-clash-display">Pro</h3>
              <p className="text-gray-300 text-sm mb-6 font-dm-sans leading-relaxed">Advanced AI models and features for professional developers.</p>
              <div className="mb-6">
                <div className="flex items-end mb-2">
                  <span className="text-4xl font-bold text-white font-clash-display">$19</span>
                  <span className="text-gray-400 text-sm mb-1 ml-1 font-dm-sans">/month</span>
                </div>
                <p className="text-gray-400 text-sm font-dm-sans">Billed monthly, cancel anytime</p>
              </div>
              
              <div className="flex-grow mb-8">
                <h4 className="text-white text-sm font-medium mb-4 font-dm-sans uppercase tracking-wider">What's included:</h4>
                <ul className="flex flex-col gap-3">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-600/20 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-sm font-dm-sans text-white font-medium">Advanced AI models (GPT-4, Claude 3)</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-600/20 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-sm font-dm-sans text-white font-medium">Unlimited Projects</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-600/20 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-sm font-dm-sans text-white font-medium">Priority Support</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-600/20 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-sm font-dm-sans text-white font-medium">Early access to new features</span>
                  </li>
                </ul>
              </div>
              <div className="z-10 select-none">
                <button type="button" className="relative inline-flex items-center justify-center gap-2 px-4 py-[9px] rounded-[30px] transition-colors cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-600/25 w-full font-dm-sans">
                  <span className="relative w-fit font-normal text-[14px] leading-[20px] whitespace-nowrap flex items-center gap-2 transition-colors text-white">Get Started</span>
                </button>
              </div>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="min-h-[692px] relative p-[1px] rounded-[20px] h-auto w-full group transition-all duration-300 bg-gradient-to-b from-white/10 to-white/5">
            <div className="w-full h-full rounded-[19px] relative flex flex-col p-8 bg-bg-dark/90 backdrop-blur-xl border border-white/10">
              <h3 className="text-white text-xl font-bold mb-2 font-clash-display">Team</h3>
              <p className="text-gray-300 text-sm mb-6 font-dm-sans leading-relaxed">Complete solution for teams with collaboration features and admin controls.</p>
              <div className="mb-6">
                <div className="flex items-end mb-2">
                  <span className="text-4xl font-bold text-white font-clash-display">$49</span>
                  <span className="text-gray-400 text-sm mb-1 ml-1 font-dm-sans">/user/month</span>
                </div>
                <p className="text-gray-400 text-sm font-dm-sans">Billed monthly, cancel anytime</p>
              </div>
              
              <div className="flex-grow mb-8">
                <h4 className="text-white text-sm font-medium mb-4 font-dm-sans uppercase tracking-wider">What's included:</h4>
                <ul className="flex flex-col gap-3">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-600/20 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-sm font-dm-sans text-white font-medium">Everything in Pro</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-600/20 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-sm font-dm-sans text-white font-medium">Team collaboration tools</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-600/20 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-sm font-dm-sans text-white font-medium">Admin dashboard</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-600/20 flex items-center justify-center mr-3 mt-0.5">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-sm font-dm-sans text-white font-medium">SSO & Security features</span>
                  </li>
                </ul>
              </div>
              <div className="z-10 select-none">
                <button type="button" className="relative inline-flex items-center justify-center gap-2 px-4 py-[9px] rounded-[30px] transition-colors cursor-pointer bg-emerald-600 hover:bg-emerald-500 w-full font-dm-sans border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/10 hover:border-emerald-400/50">
                  <span className="relative w-fit font-normal text-[14px] leading-[20px] whitespace-nowrap flex items-center gap-2 transition-colors text-white">Contact Sales</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 sm:mt-10 md:mt-13 px-4 sm:px-8 md:px-15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 relative z-10">
          <div className="flex-1">
            <h4 className="text-white text-lg sm:text-xl font-bold mb-2 sm:mb-3 font-clash-display">Need custom solutions?</h4>
            <p className="text-gray-200 max-w-full sm:max-w-xl text-sm sm:text-base mb-4 sm:mb-6 font-dm-sans">
              Get tailored AI solutions, custom integrations, and dedicated support for your enterprise.
            </p>
          </div>
          <div className="z-10 select-none">
            <button type="button" className="relative inline-flex items-center justify-center gap-2 px-4 py-[9px] rounded-[30px] transition-colors cursor-pointer bg-transparent hover:bg-white/5 border border-white/30 w-full sm:w-auto flex-shrink-0">
              <span className="relative w-fit font-normal text-[14px] leading-[20px] whitespace-nowrap flex items-center gap-2 transition-colors text-white">Contact Sales</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
