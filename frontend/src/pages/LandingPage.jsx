import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Stats from '../components/Stats';
import Features from '../components/Features';
import Pricing from '../components/Pricing';
import Testimonials from '../components/Testimonials';
import CTA from '../components/CTA';
import Footer from '../components/Footer';
import FAQ from '../components/FAQ';

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
