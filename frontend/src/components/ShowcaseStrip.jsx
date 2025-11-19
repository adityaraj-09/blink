import React from 'react';
import { gradients } from '../theme/palette';

// Placeholder images (could be replaced with actual assets)
const placeholders = [
  'https://placehold.co/280x180/png?text=Repo+1',
  'https://placehold.co/280x180/png?text=Repo+2',
  'https://placehold.co/280x180/png?text=Repo+3',
  'https://placehold.co/280x180/png?text=Repo+4',
  'https://placehold.co/280x180/png?text=Repo+5'
];

const ShowcaseStrip = () => {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{background: gradients.d}} />
      <div className="relative max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <span className="px-4 py-2 rounded-full text-sm font-medium bg-white/5 ring-gradient">Latest Activity</span>
          <div className="flex gap-3 text-xs text-gray-400">
            <span className="hidden sm:inline">LIVE SYNC</span>
            <span className="w-2 h-2 rounded-full bg-(--c5) animate-pulse" />
          </div>
        </div>
        <div className="flex gap-6 overflow-x-auto scrollbar-none pb-4">
          {placeholders.map((src,i) => (
            <div key={i} className="relative group shrink-0">
              <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" style={{background: gradients.c}} />
              <img src={src} alt="placeholder" className="rounded-2xl w-[280px] h-[180px] object-cover bg-[#111] border border-white/10" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                <span className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white/80">branch: main</span>
                <span className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-(--c2)">updated • now</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShowcaseStrip;
