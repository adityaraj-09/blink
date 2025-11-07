import { Github, Code2, Rocket, CheckCircle } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: <Github className="w-12 h-12" />,
      number: "01",
      title: "Connect GitHub",
      description: "Link your GitHub account in seconds. We support both personal and organization repositories with full OAuth2 security."
    },
    {
      icon: <Code2 className="w-12 h-12" />,
      number: "02",
      title: "Choose Repository",
      description: "Select any repository or create a new one. Our platform automatically detects your tech stack and configures the environment."
    },
    {
      icon: <Rocket className="w-12 h-12" />,
      number: "03",
      title: "Start Coding",
      description: "Jump right into your code with our powerful editor. Real-time collaboration, AI assistance, and instant previews included."
    },
    {
      icon: <CheckCircle className="w-12 h-12" />,
      number: "04",
      title: "Deploy Instantly",
      description: "Push your changes and deploy with a single click. Automatic builds, testing, and deployment to production."
    }
  ];

  return (
    <section className="py-24 relative overflow-hidden bg-[#1e2329]">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#365eff10_1px,transparent_1px),linear-gradient(to_bottom,#365eff10_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            How It <span className="text-primary">Works</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Get started in minutes with our simple four-step process
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connecting line for desktop */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-primary"></div>

          {steps.map((step, index) => (
            <div
              key={index}
              className="relative group"
            >
              {/* Gradient shadow/glow */}
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/30 to-secondary/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Step Card */}
              <div className="relative">
                <div className="bg-[#1a1f26]/80 backdrop-blur-sm rounded-2xl p-8 transition-all duration-300 transform hover:-translate-y-2 shadow-xl">
                  {/* Number badge */}
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className="mb-6 text-primary group-hover:text-secondary transition-colors">
                    {step.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-semibold mb-4">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Arrow for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 -right-4 w-8 h-8 border-t-2 border-r-2 border-primary transform rotate-45 z-20"></div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom section */}
        <div className="mt-20 text-center relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-secondary/30 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative inline-block bg-[#1a1f26]/80 backdrop-blur-sm rounded-2xl p-8 max-w-2xl shadow-2xl">
            <h3 className="text-2xl font-semibold mb-4">
              Ready to Transform Your Workflow?
            </h3>
            <p className="text-gray-400 mb-6">
              Join thousands of developers who have already streamlined their development process
            </p>
            <button className="px-8 py-3 bg-primary hover:bg-secondary text-white rounded-lg font-semibold transition-all transform hover:scale-105">
              Get Started Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
