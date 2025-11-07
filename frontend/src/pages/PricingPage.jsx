import { SignInButton, SignedIn, SignedOut } from '@clerk/clerk-react';
import { Check, Star, Zap, Crown } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

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
    <div className="min-h-screen bg-[#1e2329]">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl sm:text-6xl font-bold mb-6">
            Simple, <span className="text-primary">Transparent Pricing</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
            Choose the perfect plan for your needs. All plans include a 14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div className="relative inline-block">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-secondary/30 blur-lg"></div>
            <div className="relative flex items-center bg-[#1a1f26]/80 backdrop-blur-sm rounded-lg p-1 mb-12 shadow-xl">
              <button className="px-6 py-2 bg-primary rounded-lg text-white font-semibold">
                Monthly
              </button>
              <button className="px-6 py-2 text-gray-400 hover:text-white transition-colors">
                Annual <span className="text-primary text-sm ml-1">(Save 20%)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-2xl transition-all duration-300 hover:transform hover:-translate-y-2 group ${
                  plan.highlighted ? 'scale-105' : ''
                }`}
              >
                {/* Gradient shadow/glow */}
                <div className={`absolute -inset-1 bg-gradient-to-br ${
                  plan.highlighted ? 'from-primary/40 to-secondary/40 opacity-100' : 'from-primary/30 to-secondary/30 opacity-30'
                } blur-xl group-hover:opacity-100 transition-opacity duration-300`}></div>

                {/* Main card */}
                <div className="relative bg-[#1a1f26]/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
                {/* Popular Badge */}
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="text-primary">{plan.icon}</div>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                  </div>
                  <p className="text-gray-400 text-sm">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    {plan.price !== 'Custom' && (
                      <span className="text-gray-400 ml-2">/{plan.period}</span>
                    )}
                    {plan.price === 'Custom' && (
                      <span className="text-gray-400 ml-2 text-xl">{plan.period}</span>
                    )}
                  </div>
                </div>

                {/* CTA Button */}
                <SignedOut>
                  <SignInButton mode="modal">
                    <button
                      className={`w-full py-3 rounded-lg font-semibold transition-all mb-8 ${
                        plan.highlighted
                          ? 'bg-primary hover:bg-secondary text-white'
                          : 'bg-white/10 hover:bg-white/20 text-white border border-primary/30'
                      }`}
                    >
                      {plan.cta}
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <button
                    className={`w-full py-3 rounded-lg font-semibold transition-all mb-8 ${
                      plan.highlighted
                        ? 'bg-primary hover:bg-secondary text-white'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-primary/30'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </SignedIn>

                {/* Features List */}
                <ul className="space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-gradient-to-b from-black to-black/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-12">
            Frequently Asked <span className="text-primary">Questions</span>
          </h2>

          <div className="space-y-6">
            {[
              {
                q: 'Can I change plans later?',
                a: 'Yes! You can upgrade, downgrade, or cancel your plan at any time. Changes take effect at the start of your next billing cycle.'
              },
              {
                q: 'Is there a free trial?',
                a: 'Absolutely! All paid plans come with a 14-day free trial. No credit card required to start.'
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards (Visa, MasterCard, American Express) and PayPal. Enterprise customers can also pay via invoice.'
              },
              {
                q: 'Can I get a refund?',
                a: 'Yes, we offer a 30-day money-back guarantee. If you\'re not satisfied, contact us for a full refund.'
              },
              {
                q: 'Do you offer discounts for students or non-profits?',
                a: 'Yes! We offer special discounts for students, educators, and non-profit organizations. Contact our sales team for more information.'
              }
            ].map((faq, index) => (
              <div
                key={index}
                className="relative rounded-xl group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 blur-lg group-hover:from-primary/30 group-hover:to-secondary/30 transition-all duration-300"></div>
                <div className="relative bg-[#1a1f26]/80 backdrop-blur-sm rounded-xl p-6 transition-all shadow-xl">
                  <h3 className="text-xl font-semibold mb-3">{faq.q}</h3>
                  <p className="text-gray-400">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 blur-3xl"></div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Still have questions?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Our team is here to help. Get in touch and we'll answer all your questions.
          </p>
          <button className="px-8 py-4 bg-primary hover:bg-secondary text-white rounded-lg font-semibold transition-all transform hover:scale-105">
            Contact Sales Team
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPage;
