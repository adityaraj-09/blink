import { Shield, Lock, Eye, FileCheck } from 'lucide-react';

const SecurityFeatures = () => {
  const securityFeatures = [
    {
      icon: <Shield className="w-10 h-10" />,
      title: "Enterprise Security",
      description: "Bank-level encryption, SOC 2 compliant"
    },
    {
      icon: <Lock className="w-10 h-10" />,
      title: "Private Repositories",
      description: "Granular permission management"
    },
    {
      icon: <Eye className="w-10 h-10" />,
      title: "Audit Logs",
      description: "Complete activity tracking"
    },
    {
      icon: <FileCheck className="w-10 h-10" />,
      title: "Compliance Ready",
      description: "GDPR, HIPAA, and SOC 2 compliant"
    }
  ];

  return (
    <section className="py-24 relative overflow-hidden bg-gradient-to-b from-[#1e2329] via-primary/5 to-[#1e2329]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Left-Right Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Content */}
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              <span className="text-primary">Security</span> First
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Your code is precious. We protect it with enterprise-grade security measures and compliance standards.
            </p>

            <div className="space-y-6">
              {securityFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="group relative rounded-xl"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 blur-lg group-hover:blur-xl group-hover:from-primary/30 group-hover:to-secondary/30 transition-all duration-300"></div>
                  <div className="relative bg-[#1a1f26]/80 backdrop-blur-sm rounded-xl p-4 transition-all duration-300 shadow-xl">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 text-primary group-hover:text-secondary transition-colors">
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                        <p className="text-gray-400 text-sm">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Visual */}
          <div className="relative">
            <div className="relative">
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-secondary/20 rounded-full blur-2xl animate-pulse delay-1000"></div>

              {/* Gradient shadow/glow */}
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/30 to-secondary/30 blur-2xl"></div>

              {/* Large gradient card */}
              <div className="relative rounded-3xl p-8 bg-[#1a1f26]/80 backdrop-blur-sm shadow-2xl">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-16 h-16 text-primary" />
                    <div>
                      <div className="text-3xl font-bold">99.9%</div>
                      <div className="text-gray-400">Uptime SLA</div>
                    </div>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <div className="absolute -inset-0.5 bg-primary/20 blur-lg"></div>
                      <div className="relative bg-[#1a1f26] rounded-xl p-4 shadow-lg">
                        <div className="text-2xl font-bold text-primary">256-bit</div>
                        <div className="text-sm text-gray-400">Encryption</div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute -inset-0.5 bg-secondary/20 blur-lg"></div>
                      <div className="relative bg-[#1a1f26] rounded-xl p-4 shadow-lg">
                        <div className="text-2xl font-bold text-secondary">SOC 2</div>
                        <div className="text-sm text-gray-400">Certified</div>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-primary/20 blur-lg"></div>
                    <div className="relative bg-[#1a1f26] rounded-xl p-4 shadow-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Security Score</span>
                        <span className="text-primary font-semibold">A+</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full w-[95%]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecurityFeatures;
