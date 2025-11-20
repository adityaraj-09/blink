import React from 'react';
import { ArrowRight, Github, GitBranch, Terminal, Code, Cpu, Globe } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative bg-[#020617] pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden bg-bg-dark">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] opacity-50 mix-blend-screen animate-pulse-slow"></div>
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px] opacity-50 mix-blend-screen animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
            v2.0 Now Available
          </div>
          
          <h1 
          className="text-white text-3xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-4 sm:mb-6 relative z-10 font-clash-display leading-tight">
            Code smarter <br />
          
              Ship faster

          </h1>
          
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed font-dm-sans">
            The AI-powered code editor that understands your codebase. 
            Write better code, debug faster, and automate repetitive tasks.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="z-10 select-none">
            <button type="button"
          className="relative inline-flex items-center justify-center gap-2 px-4 py-[9px] 
          rounded-[30px] transition-colors cursor-pointer
          before:content-[''] before:absolute  before:-top-[1px] before:-left-[1px] before:-z-[1] before:w-[calc(100%+2px)] before:h-[calc(100%+2px)] before:rounded-[30px] before:p-[1px]
          bg-[#044fc7] hover:bg-[#0956d4] before:bg-gradient-to-b before:from-[#598ffa] before:to-[#044fc7] w-full sm:w-auto"
                                            style={{backgroundImage: 'linear-gradient(rgba(108, 108, 108, 0.15), transparent)'}}><span
                                                className="relative w-fit font-normal text-[14px] leading-[20px] whitespace-nowrap flex items-center gap-2 transition-colors text-white [text-shadow:0px_0px_0.5px_#ffffff]">Get
                                                Started Free</span></button></div>
          
            <div className="z-10 select-none"><button type="button"
                                            className="relative inline-flex items-center justify-center gap-2 px-4 py-[9px] 
          rounded-[30px] transition-colors cursor-pointer
          before:content-[''] before:absolute before:-top-[1px] before:-left-[1px] before:-z-[1] before:w-[calc(100%+2px)] before:h-[calc(100%+2px)] before:rounded-[30px] before:p-[1px]
          bg-transparent hover:bg-white/5 border border-white/30 before:bg-transparent w-full sm:w-auto border-gray-400 sm:border-gray-500 text-gray-100 sm:text-gray-300 hover:bg-gray-800/50 sm:hover:bg-gray-700/30 hover:border-gray-300 sm:hover:border-gray-400"><span
                                                className="relative w-fit font-normal text-[14px] leading-[20px] whitespace-nowrap flex items-center gap-2 transition-colors text-white">
                                                <Github className="w-4 h-4" />
              View on GitHub</span></button></div>
            
          </div>
        </div>

        {/* Dashboard Mock */}
        <div className="relative mx-auto max-w-5xl">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20"></div>
          <div className="relative bg-[#0B1120] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Window Controls */}
            <div className="h-10 bg-[#0F172A] border-b border-slate-800 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
              <div className="ml-4 px-3 py-1 bg-slate-800/50 rounded text-xs text-slate-400 font-mono flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                ~/projects/ionix
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0B1120]/95 backdrop-blur-sm">
              
              {/* Language Usage (Pie Chart Mock) */}
              <div className="col-span-1 bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-slate-200 text-sm font-medium mb-4 flex items-center gap-2">
                  <Code className="w-4 h-4 text-blue-400" />
                  Language Usage
                </h3>
                <div className="flex items-center justify-center h-40 relative">
                  {/* Simple CSS Pie Chart */}
                  <div className="w-32 h-32 rounded-full border-[16px] border-blue-500 border-r-indigo-500 border-b-purple-500 border-l-cyan-500 transform rotate-45"></div>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl font-bold text-white">TS</span>
                    <span className="text-xs text-slate-400">TypeScript</span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-slate-300">TypeScript</span>
                    </div>
                    <span className="text-slate-400">45%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span className="text-slate-300">Rust</span>
                    </div>
                    <span className="text-slate-400">30%</span>
                  </div>
                </div>
              </div>

              {/* Commit Activity (Calendar Mock) */}
              <div className="col-span-1 bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                <h3 className="text-slate-200 text-sm font-medium mb-4 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-green-400" />
                  Commit Activity
                </h3>
                <div className="grid grid-cols-7 gap-1">
                  {[...Array(35)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-full pt-[100%] rounded-sm ${
                        Math.random() > 0.7 ? 'bg-green-500/80' : 
                        Math.random() > 0.4 ? 'bg-green-500/40' : 
                        'bg-slate-800'
                      }`}
                    ></div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-slate-800 rounded-sm"></div>
                    <div className="w-3 h-3 bg-green-500/40 rounded-sm"></div>
                    <div className="w-3 h-3 bg-green-500/80 rounded-sm"></div>
                  </div>
                  <span>More</span>
                </div>
              </div>

              {/* Recent PRs (Table Mock) */}
              <div className="col-span-1 md:col-span-1 bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col">
                <h3 className="text-slate-200 text-sm font-medium mb-4 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  System Status
                </h3>
                <div className="space-y-4 flex-1">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">CPU Usage</span>
                      <span className="text-purple-400">24%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 w-[24%]"></div>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Memory</span>
                      <span className="text-blue-400">1.2GB</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[45%]"></div>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Network</span>
                      <span className="text-green-400">Up</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-xs text-slate-300">Connected to US-East</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Works With Section */}
        <div className="mt-20 pt-10 border-t border-white/5">
          <p className="text-center text-gray-500 text-sm mb-8 font-medium uppercase tracking-wider">Trusted by developers at</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Simple text logos for now, or SVGs if available */}
            <div className="flex items-center gap-2 text-xl font-bold text-white"><Github className="w-6 h-6" /> GitHub</div>
            <div className="flex items-center gap-2 text-xl font-bold text-white"><GitBranch className="w-6 h-6" /> GitLab</div>
            <div className="flex items-center gap-2 text-xl font-bold text-white"><Terminal className="w-6 h-6" /> Bitbucket</div>
            <div className="flex items-center gap-2 text-xl font-bold text-white"><Globe className="w-6 h-6" /> Vercel</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
