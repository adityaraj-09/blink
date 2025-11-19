import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import PromptDemo from '../components/PromptDemo';
import IntegrationsShowcase from '../components/IntegrationsShowcase';
import ShowcaseStrip from '../components/ShowcaseStrip';
import Highlights from '../components/Highlights';
import WorksWith from '../components/WorksWith';
import SecurityFeatures from '../components/SecurityFeatures';
import PerformanceFeatures from '../components/PerformanceFeatures';
import HowItWorks from '../components/HowItWorks';
import Testimonials from '../components/Testimonials';
import FAQ from '../components/FAQ';
import CTA from '../components/CTA';
import Footer from '../components/Footer';
import Pricing from '../components/pricing';

const LandingPage = () => {
  return (
  <div className="relative min-h-screen bg-dark-bg text-white overflow-hidden">
      {/* Background layers: soft glows + grid are globally injected from index.css */}

      {/* Top radial spotlight */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-168 w-7xl rounded-full opacity-30 blur-3xl" style={{
        background: 'radial-gradient(closest-side, rgba(38,110,255,0.35), transparent 70%)'
      }} />

      {/* Corner glow */}
      <div aria-hidden className="pointer-events-none absolute -bottom-80 -right-40 h-160 w-200 rounded-full opacity-25 blur-3xl" style={{
        background: 'radial-gradient(closest-side, rgba(20,23,255,0.35), transparent 70%)'
      }} />

      <Navbar />
      <main className="relative z-10">
        <Hero/>
        <Features />
        <IntegrationsShowcase />
        <Highlights />
        <WorksWith />

        <SecurityFeatures />
        <PerformanceFeatures />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
