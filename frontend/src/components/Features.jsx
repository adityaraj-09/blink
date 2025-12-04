import React from 'react';
import { Bell, Users, TrendingUp, Activity, BarChart3, Zap, MessageSquare, Shield } from 'lucide-react';

const Features = () => {
  return (
    <section className="relative bg-[#020617] bg-bg-dark py-20 sm:py-24 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-900/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-800/20 rounded-full blur-[128px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
            Features
          </div>
          <h2 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-4 sm:mb-6 relative z-10 font-clash-display leading-tight">
            Key Features Overview
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed font-dm-sans">
            Explore the comprehensive features that set Merkle apart in development excellence.
          </p>
        </div>

        {/* Grid Layout */}
        <div className="flex flex-col gap-6">
          
          {/* Row 1: Two Large Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Smart Notifications */}
            <div className="group relative bg-[#0B1120] border border-slate-800 rounded-3xl p-8 overflow-hidden hover:border-emerald-500/30 transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-600/20 transition-all duration-500"></div>

              <div className="relative z-10">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                  <Bell className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Smart Notifications</h3>
                <p className="text-gray-400 mb-8">Get real-time alerts for the updates that matter to you most. Filter noise and focus on code.</p>
                
                {/* Mock UI */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 backdrop-blur-sm transform group-hover:translate-y-[-5px] transition-transform duration-500">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"><Zap className="w-4 h-4" /></div>
                    <div>
                      <div className="text-sm text-white font-medium">Build Succeeded</div>
                      <div className="text-xs text-gray-500">Project: rust-merkle • 2m ago</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400"><MessageSquare className="w-4 h-4" /></div>
                    <div>
                      <div className="text-sm text-white font-medium">New Comment on PR #42</div>
                      <div className="text-xs text-gray-500">@sarah left a review • 5m ago</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Easy Collaborations */}
            <div className="group relative bg-[#0B1120] border border-slate-800 rounded-3xl p-8 overflow-hidden hover:border-teal-500/30 transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-teal-600/20 transition-all duration-500"></div>

              <div className="relative z-10">
                <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center mb-6 border border-teal-500/20 group-hover:scale-110 transition-transform duration-500">
                  <Users className="w-6 h-6 text-teal-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Easy Collaborations</h3>
                <p className="text-gray-400 mb-8">Streamlined solution for seamless and productive teamwork. Code together in real-time.</p>
                
                {/* Mock UI */}
                <div className="flex -space-x-3 mb-4 justify-center">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0B1120] bg-slate-800 flex items-center justify-center text-xs text-white font-medium relative group-hover:scale-110 transition-transform duration-300" style={{ transitionDelay: `${i * 50}ms` }}>
                      U{i}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0B1120] rounded-full"></div>
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-[#0B1120] bg-slate-800 flex items-center justify-center text-xs text-gray-400 font-medium">+5</div>
                </div>
                <div className="text-center text-xs text-emerald-400 font-mono bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20">
                  <span className="animate-pulse">●</span> 4 users editing main.rs
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Three Smaller Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Fuel Your Growth */}
            <div className="group relative bg-[#0B1120] border border-slate-800 rounded-3xl p-6 overflow-hidden hover:border-emerald-500/30 transition-all duration-500">
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4 border border-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Fuel Your Growth</h3>
              <p className="text-sm text-gray-400 mb-4">Empower your business with data-driven insights and analytics.</p>
              <div className="h-24 bg-slate-900/50 rounded-lg border border-slate-800 relative overflow-hidden flex items-end px-2 pb-2 gap-1">
                {[40, 60, 45, 70, 50, 80, 65, 90].map((h, i) => (
                  <div key={i} className="flex-1 bg-emerald-500/40 rounded-t-sm hover:bg-emerald-500 transition-colors" style={{ height: `${h}%` }}></div>
                ))}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="group relative bg-[#0B1120] border border-slate-800 rounded-3xl p-6 overflow-hidden hover:border-teal-500/30 transition-all duration-500">
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="w-10 h-10 bg-teal-500/10 rounded-lg flex items-center justify-center mb-4 border border-teal-500/20">
                <Activity className="w-5 h-5 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Performance Metrics</h3>
              <p className="text-sm text-gray-400 mb-4">Track your success with comprehensive analytics and insights.</p>
              <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <div className="text-xs text-gray-400">Latency</div>
                <div className="text-sm font-mono text-emerald-400">12ms <span className="text-xs text-gray-500">(-2ms)</span></div>
              </div>
              <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800 mt-2">
                <div className="text-xs text-gray-400">Uptime</div>
                <div className="text-sm font-mono text-emerald-400">99.99%</div>
              </div>
            </div>

            {/* Analytics Dashboard */}
            <div className="group relative bg-[#0B1120] border border-slate-800 rounded-3xl p-6 overflow-hidden hover:border-green-500/30 transition-all duration-500">
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center mb-4 border border-green-500/20">
                <BarChart3 className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Analytics Dashboard</h3>
              <p className="text-sm text-gray-400 mb-4">Stay ahead with real-time data visualization and reporting.</p>
              <div className="relative h-24 w-24 mx-auto">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset="60" className="text-emerald-500" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-lg font-bold text-white">76%</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default Features;
