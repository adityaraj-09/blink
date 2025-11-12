import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
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
    <div className="min-h-screen bg-[#1e2329] text-white">
      <Navbar />
      <Hero />
      <Features />
      <WorksWith />

      <SecurityFeatures />
      <PerformanceFeatures />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
};

export default LandingPage;
