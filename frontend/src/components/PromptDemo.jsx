import React from 'react';
import { ArrowRight, Send } from 'lucide-react';
import { gradients } from '../theme/palette';

const PromptDemo = () => {
  return (
    <section className="relative py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <span className="px-3 py-1 rounded-full text-sm bg-white/5 ring-gradient">Try it</span>
          <h2 className="mt-4 text-4xl sm:text-5xl font-bold leading-tight">
            Ask and automate.<br/>
            <span className="text-(--c1)">Your code, your workflow.</span>
          </h2>
          <p className="mt-3 text-gray-400 max-w-2xl mx-auto">A playful prompt box like the screenshots. This is a placeholder—wire it up to your backend when ready.</p>
        </div>

        <div className="relative rounded-3xl p-3 bg-white/5 border border-white/10 backdrop-blur-xl">
          <div className="absolute -inset-1 rounded-[1.6rem] opacity-60 blur-md pointer-events-none" style={{background: gradients.a}}/>
          <div className="relative rounded-2xl bg-black/30 p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <input placeholder="Ask CodeHub…" className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 outline-none text-white placeholder:text-white/40"/>
              <button className="px-6 py-4 rounded-xl font-semibold bg-white/10 hover:bg-white/15 transition ring-gradient flex items-center gap-2"><span>Send</span><Send size={18}/></button>
            </div>
            <div className="mt-4 flex gap-3 flex-wrap">
              {['Automate','Docs','Refactor'].map((tag)=> (
                <span key={tag} className="px-3 py-1 rounded-lg text-sm bg-white/5 border border-white/10">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromptDemo;
