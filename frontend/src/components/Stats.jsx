import React from 'react';

const Stats = () => {
  const stats = [
    {
      label: "Active Developers",
      value: "10k+",
      description: "Trust our platform worldwide"
    },
    {
      label: "Productivity Boost",
      value: "350%",
      description: "Faster code completion"
    },
    {
      label: "Uptime Guarantee",
      value: "99.9%",
      description: "Enterprise-grade reliability"
    }
  ];

  return (
    <section className="relative bg-[#020617] py-12 sm:py-12 md:py-16 lg:py-20 overflow-hidden mx-auto border-[0.5px] border-slate-800/0 rounded-xl">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-[128px] pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-6">
        <div className="relative z-10">
          <div className="text-center sm:mb-20 relative py-3 sm:py-10">
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium mb-6 backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
              Proven Results
            </div>
            <h2 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-4 sm:mb-6 relative z-10 font-clash-display leading-tight">
              Numbers that speak
            </h2>
            <p className="text-gray-300 text-sm sm:text-base md:text-lg max-w-sm sm:max-w-lg md:max-w-2xl mx-auto leading-relaxed relative z-10 font-dm-sans">
              See why thousands of developers choose our platform to accelerate their coding workflow and build better software faster.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-2 sm:mt-8">
          {stats.map((stat, index) => (
            <div key={index} className="w-full text-center py-8 px-6 relative flex-1  group">
              <div className="w-full absolute inset-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl transition-colors duration-300 group-hover:bg-white/10"></div>
              <div className="relative z-10">
                <h3 className="text-gray-200 text-lg sm:text-xl font-medium mb-2">{stat.label}</h3>
                <div className="text-4xl sm:text-5xl md:text-6xl font-clash-display font-medium  flex items-center justify-center">
                  <span className=" from-white to-white/60 bg-clip-text  drop-shadow-sm">
                    {stat.value}
                  </span>
                </div>
                <p className="text-gray-400 text-base">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
