import Navbar from '../components/Navbar.jsx';
import Hero from '../components/Hero.jsx';
import Stats from '../components/Stats.jsx';
import Features from '../components/Features.jsx';
import Pricing from '../components/Pricing.jsx';
import Testimonials from '../components/Testimonials.jsx';
import CTA from '../components/CTA.jsx';
import Footer from '../components/Footer.jsx';
import FAQ from '../components/FAQ.jsx';

const LandingPage = () => {
  return (
  <div className="relative min-h-screen bg-bg-dark text-white overflow-hidden">
      {/* Background layers: soft glows + grid are globally injected from index.css */}

      {/* Top radial spotlight */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-168 w-7xl rounded-full opacity-20 blur-3xl" style={{
        background: 'radial-gradient(closest-side, rgba(255,255,255,0.08), transparent 70%)'
      }} />

      {/* Corner glow */}
      <div aria-hidden className="pointer-events-none absolute -bottom-80 -right-40 h-160 w-200 rounded-full opacity-15 blur-3xl" style={{
        background: 'radial-gradient(closest-side, rgba(255,255,255,0.05), transparent 70%)'
      }} />

      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Stats />
        <Features />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
