import React from 'react';
import { gradients } from '../theme/palette';

const items = [
  {
    title: 'Fast Responses',
    desc: 'Get timely answers to your questions.',
    img: '/fast-response.png',
    grad: 'var(--g-c)'
  },
  {
    title: 'Expert Guidance',
    desc: 'We understand both design and tech.',
    img: 'https://placehold.co/640x360/png?text=Expert+Guidance',
    grad: 'var(--g-d)'
  },
  {
    title: 'Continuous Help',
    desc: 'Support doesn’t stop after launch.',
    img: 'https://placehold.co/640x360/png?text=Continuous+Help',
    grad: 'var(--g-e)'
  },
];

const Highlights = () => {
  return (
    <section className="relative py-28">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="px-3 py-1 rounded-full text-sm bg-white/5 ring-gradient">Why teams choose us</span>
          <h2 className="mt-4 text-4xl sm:text-5xl font-bold leading-tight text-(--c1)">Built to deliver results</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((it, idx) => (
            <div key={idx} className="relative rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="absolute -inset-0.5 opacity-40 blur-md" style={{background: it.grad}} />
              <div className="relative p-6">
                <img src={it.img} alt={it.title} className="rounded-2xl w-full h-44 object-cover border border-white/10" />
                <h3 className="mt-6 text-2xl font-semibold">{it.title}</h3>
                <p className="mt-2 text-gray-400">{it.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Highlights;
