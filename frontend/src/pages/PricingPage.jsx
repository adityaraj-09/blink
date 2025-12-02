import { SignInButton, SignedIn, SignedOut } from '@clerk/clerk-react';
import { Check, Star, Zap, Crown } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import Pricing from '../components/Pricing.jsx';

const PricingPage = () => {
  const pricingPlans = [
    {
      name: 'Free',
      icon: <Star className="w-6 h-6" />,
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started and hobby projects',
      features: [
        'Up to 3 repositories',
        '500 MB storage',
        'Basic code editor',
        'GitHub integration',
        'Community support',
        'Basic templates',
        '1 team member'
      ],
      highlighted: false,
      cta: 'Get Started'
    },
    {
      name: 'Pro',
      icon: <Zap className="w-6 h-6" />,
      price: '$19',
      period: 'per month',
      description: 'For professional developers and small teams',
      features: [
        'Unlimited repositories',
        '50 GB storage',
        'Advanced code editor',
        'Priority GitHub sync',
        'AI-powered assistance',
        'Advanced templates',
        'Up to 5 team members',
        'CI/CD integration',
        'Priority support',
        'Custom domains',
        'Advanced analytics'
      ],
      highlighted: true,
      cta: 'Start Free Trial'
    },
    {
      name: 'Enterprise',
      icon: <Crown className="w-6 h-6" />,
      price: 'Custom',
      period: 'contact us',
      description: 'For large teams and organizations',
      features: [
        'Everything in Pro',
        'Unlimited storage',
        'Dedicated infrastructure',
        'SSO & SAML',
        'Advanced security',
        'Custom integrations',
        'Unlimited team members',
        'SLA guarantee',
        '24/7 phone support',
        'Custom training',
        'Dedicated account manager',
        'White-label options'
      ],
      highlighted: false,
      cta: 'Contact Sales'
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617]">
      <Navbar />

    <Pricing/>
      <Footer />
    </div>
  );
};

export default PricingPage;
