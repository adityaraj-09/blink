import React from 'react';
import { gradients } from '../theme/palette';
import { Github, Slack, Database, Link2 } from 'lucide-react';

const icons = [Github, Slack, Database, Link2, Github, Slack, Database, Link2];

const IntegrationsShowcase = () => {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_0%,rgba(19,42,255,0.15),transparent_60%)]" />
      <div className="relative max-w-6xl mx-auto px-4 text-center">
        <span className="px-3 py-1 rounded-full text-sm bg-white/5 ring-gradient">Integrations</span>
        <h2 className="mt-4 text-4xl sm:text-5xl font-bold leading-tight">
          Seamless integrations for <span className="text-(--c1)">maximum efficiency</span>
        </h2>
        <p className="mt-3 text-gray-400 max-w-2xl mx-auto">Plug CodeHub into your stack in minutes. Replace these placeholders with your real integrations.</p>

        <div className="mt-12 flex items-center justify-center gap-6 flex-wrap">
          {icons.map((Icon, i) => (
            <div key={i} className="relative p-5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="absolute -inset-2 rounded-full opacity-60 blur-md" style={{background: gradients.b}}/>
              <Icon className="relative text-white" size={28} />
            </div>
          ))}
        </div>

        <div className="mt-16 flex items-center justify-center">
          <button className="px-6 py-3 rounded-xl font-semibold bg-white/10 hover:bg-white/15 transition ring-gradient">View integration options</button>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsShowcase;
