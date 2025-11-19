import { SignInButton, SignedOut, SignedIn } from '@clerk/clerk-react';
import { Github, ArrowRight, Zap, ShieldCheck, Cpu, Send } from 'lucide-react';

// New modern hero: layered radial gradients, floating callout, prompt box, trust bar
const Hero = () => {
  return (
    <section className="relative pt-44 pb-28 overflow-hidden">
      {/* Background gradient field */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 opacity-70" style={{background: 'radial-gradient(circle at 50% 0%, rgba(19,42,255,0.35), transparent 65%)'}} />
        <div className="absolute inset-0" style={{background: 'radial-gradient(80rem 40rem at 15% 60%, rgba(50,130,255,0.18), transparent 70%)'}} />
        <div className="absolute inset-0" style={{background: 'radial-gradient(70rem 40rem at 90% 70%, rgba(20,59,254,0.20), transparent 75%)'}} />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[4rem_4rem] opacity-30" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top badge strip */}
        <div className="flex justify-center mb-10">
          <a href="#updates" className="flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 backdrop-blur-xl ring-gradient">
            <span className="flex items-center gap-1"><Github size={16} className="text-(--c2)"/> Updates</span>
            <span className="text-(--c1)">We just shipped realtime sync →</span>
          </a>
        </div>

        {/* Headline */}
        <div className="text-center">
          <h1 className="font-bold tracking-tight text-5xl sm:text-6xl lg:text-7xl leading-[1.05]">
            Build smarter. Grow faster.
          </h1>
          <p className="mt-6 text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto">
            CodeHub helps teams automate, align & scale with AI-assisted development, secure workflows and instant collaboration.
          </p>
        </div>

        {/* Prompt demo inline */}
        <div className="mt-14 mx-auto max-w-3xl relative">
          <div className="absolute -inset-4 rounded-[2.2rem] opacity-50 blur-xl pointer-events-none" style={{background: 'var(--g-b)'}} />
          <div className="relative rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <input aria-label="Hero prompt" placeholder="Ask CodeHub…" className="w-full px-5 py-4 rounded-xl bg-black/30 border border-white/10 outline-none text-white placeholder:text-white/40" />
              <button className="px-6 py-4 rounded-xl font-semibold bg-(--c2)/20 hover:bg-(--c2)/30 transition text-white flex items-center gap-2">
                <Send size={18} /> Send
              </button>
            </div>
            <div className="mt-4 flex gap-3 flex-wrap">
              {['Automate','Refactor','Docs'].map(t => (
                <span key={t} className="px-3 py-1 rounded-lg text-sm bg-black/40 border border-white/10 text-gray-300">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA + stats row */}
        <div className="mt-12 flex flex-col items-center gap-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-8 py-4 rounded-xl font-semibold bg-(--c2)/25 hover:bg-(--c2)/35 transition text-white ring-gradient flex items-center gap-2">
                  Get Started <ArrowRight size={18} className="text-(--c1)" />
                </button>
              </SignInButton>
            </SignedOut>
            <a href="#pricing" className="px-8 py-4 rounded-xl font-semibold bg-white/5 hover:bg-white/10 border border-white/10 transition flex items-center gap-2 text-gray-200">
              View Pricing
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 text-center mt-4">
            <div>
              <div className="text-3xl font-bold text-(--c1)">50K+</div>
              <div className="text-gray-400 text-sm">Developers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-(--c1)">100K+</div>
              <div className="text-gray-400 text-sm">Repos</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-(--c1)">99.9%</div>
              <div className="text-gray-400 text-sm">Uptime</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-(--c1)">24/7</div>
              <div className="text-gray-400 text-sm">Support</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-(--c1)">SOC2</div>
              <div className="text-gray-400 text-sm">Security</div>
            </div>
          </div>
        </div>

        {/* Feature highlight mini cards */}
        <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {icon: <Zap size={24} className="text-(--c2)"/>, title:'Realtime Sync', desc:'Instant code & context updates.'},
            {icon: <ShieldCheck size={24} className="text-(--c2)"/>, title:'Secure by Design', desc:'Encryption & role control.'},
            {icon: <Cpu size={24} className="text-(--c2)"/>, title:'AI Assist', desc:'Smart edits & refactors.'},
            {icon: <Github size={24} className="text-(--c2)"/>, title:'GitHub Native', desc:'Pull, commit, push seamlessly.'}
          ].map((f,i)=>(
            <div key={i} className="relative p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden">
              <div className="absolute -inset-0.5 rounded-2xl opacity-40 blur-md" style={{background: i%2? 'var(--g-a)': 'var(--g-c)'}} />
              <div className="relative flex flex-col gap-3">
                <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center ring-gradient">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-sm text-white">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
