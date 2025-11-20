import React from 'react';
import { Star } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      quote: "This AI code editor transformed how we build software. The intelligent suggestions help us ship features 2x faster.",
      author: "Sarah Chen",
      role: "Founder at TechFlow",
      avatar: "/images/avatars/1.webp"
    },
    {
      quote: "Finally, an editor that understands context. The codebase awareness is incredible and saves me hours of debugging.",
      author: "Marcus Rodriguez",
      role: "Senior Engineer at GrowthLab",
      avatar: "/images/avatars/2.webp"
    },
    {
      quote: "The best investment we've made for our dev team. The collaboration features and AI integration are seamless.",
      author: "Emily Watson",
      role: "CTO at StartupXYZ",
      avatar: "/images/avatars/3.webp"
    }
  ];

  return (
    <section className="bg-[#020617] relative select-none overflow-hidden py-12 sm:py-16 md:py-20">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-[128px] pointer-events-none"></div>

      <div className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[1250px] mx-auto px-4 sm:px-6 relative overflow-hidden z-20 border-[0.5px] border-slate-800/0 rounded-[12px]">
        
        {/* Background Effects */}
        <div className="absolute w-[200px] sm:w-[280px] md:w-[380px] h-[200px] sm:h-[280px] md:h-[380px] translate-y-[70%] -z-1 -translate-x-1/2 rounded-full bottom-0 left-1/2 opacity-40 sm:opacity-60" style={{ background: 'radial-gradient(circle, rgba(10, 51, 117, 0.1) 0%, rgb(10, 51, 117) 50%, transparent 100%)', filter: 'blur(120px)' }}></div>
        
        <div className="text-center sm:mb-20 relative py-3 sm:py-10 pt-5 pb-8 bg-cover bg-center mb-9">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
            Testimonials
          </div>
          <h2 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-4 sm:mb-6 relative z-10 font-clash-display leading-tight">
            Loved by developers
          </h2>
          <p className="text-text-body text-sm sm:text-base md:text-lg max-w-sm sm:max-w-lg md:max-w-2xl mx-auto leading-relaxed relative z-10 font-dm-sans">
            See what our community is saying about their experience with our AI-powered platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 flex flex-col h-full hover:bg-white/10 transition-colors duration-300">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-6 flex-1">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-3 mt-auto">
                <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-800">
                  {/* Placeholder for avatar if image fails */}
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                    {testimonial.author.charAt(0)}
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="text-white font-medium text-sm truncate">{testimonial.author}</h4>
                  <p className="text-gray-400 text-xs truncate">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
