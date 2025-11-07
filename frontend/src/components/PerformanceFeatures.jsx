import { Zap, Cloud, Terminal, Workflow, Gauge, Activity, Server, Rocket } from 'lucide-react';

const PerformanceFeatures = () => {
  const performanceFeatures = [
    {
      icon: <Zap className="w-10 h-10" />,
      title: "Lightning Fast Performance",
      description: "Experience blazing-fast load times and instant code compilation. Our optimized infrastructure ensures your development workflow is never interrupted.",
      stat: "<50ms",
      statLabel: "Average Response Time",
      details: [
        "Instant code hot-reload",
        "Zero-latency file sync",
        "Optimized build pipeline"
      ],
      badge: "99.9% Uptime"
    },
    {
      icon: <Cloud className="w-10 h-10" />,
      title: "Global CDN Network",
      description: "Your code is served from the nearest edge location. With 200+ data centers worldwide, your projects load instantly anywhere.",
      stat: "200+",
      statLabel: "Edge Locations",
      details: [
        "Multi-region redundancy",
        "Automatic failover",
        "Smart routing optimization"
      ],
      badge: "Global Scale"
    },
    {
      icon: <Server className="w-10 h-10" />,
      title: "Auto-Scaling Infrastructure",
      description: "Scale seamlessly from prototype to production. Our infrastructure automatically adjusts to your needs without manual intervention.",
      stat: "∞",
      statLabel: "Scalability",
      details: [
        "Automatic resource allocation",
        "Load balancing included",
        "Zero downtime scaling"
      ],
      badge: "Enterprise Ready"
    },
    {
      icon: <Rocket className="w-10 h-10" />,
      title: "Instant Deployments",
      description: "Deploy your applications in seconds, not minutes. Our optimized CI/CD pipeline ensures your code goes live faster than ever.",
      stat: "<30s",
      statLabel: "Average Deploy Time",
      details: [
        "Atomic deployments",
        "Instant rollbacks",
        "Zero-downtime updates"
      ],
      badge: "Production Ready"
    }
  ];

  return (
    <section className="py-24 relative overflow-hidden bg-gradient-to-b from-[#1e2329] via-[#16191e] to-[#1e2329]">
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 relative">
          {/* Gradient glow behind header */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/30 blur-3xl opacity-50"></div>

          <div className="relative z-10">
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Built for <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">Performance</span>
            </h2>
            <p className="text-2xl sm:text-3xl text-gray-300 max-w-4xl mx-auto mb-6 font-medium">
              Speed and reliability at the core of everything we do
            </p>
            <p className="text-lg text-gray-500 max-w-3xl mx-auto leading-relaxed">
              Our infrastructure is engineered for maximum performance, ensuring your development workflow is always fast, reliable, and scalable.
            </p>
          </div>
        </div>

        {/* Grid Layout with Enhanced Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {performanceFeatures.map((feature, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-3xl transition-all duration-500"
            >
              {/* Gradient shadow/glow */}
              <div className={`absolute -inset-1 bg-gradient-to-${index % 2 === 0 ? 'br' : 'bl'} from-primary/30 to-secondary/30 blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>

              {/* Main card */}
              <div className="relative bg-[#1a1f26]/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl transition-all duration-500 h-full overflow-hidden">
                {/* Inner gradient glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className={`absolute ${index % 2 === 0 ? 'top-0 right-0' : 'bottom-0 left-0'} w-64 h-64 bg-gradient-to-br from-primary/20 to-secondary/20 blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500`}></div>

                <div className="relative z-10 flex flex-col h-full">
                  {/* Header with icon, stat, and badge */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="text-primary group-hover:text-secondary transition-colors duration-300">
                      {feature.icon}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          {feature.stat}
                        </div>
                        <div className="text-xs text-gray-400">{feature.statLabel}</div>
                      </div>
                      <div className="px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs font-semibold text-primary">
                        {feature.badge}
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-400 leading-relaxed mb-6 flex-grow">
                    {feature.description}
                  </p>

                  {/* Details list */}
                  <div className="space-y-2 mb-6">
                    {feature.details.map((detail, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar decoration */}
                  <div className="mt-auto">
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div className={`bg-gradient-to-r from-primary via-secondary to-primary h-1.5 rounded-full transition-all duration-1000 group-hover:w-full ${index % 2 === 0 ? 'w-2/3' : 'w-3/4'}`}></div>
                    </div>
                  </div>
                </div>

                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom stats section */}
        <div className="mt-16 relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 blur-2xl"></div>
          <div className="relative bg-[#1a1f26]/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                  99.99%
                </div>
                <div className="text-sm text-gray-400">Uptime Guarantee</div>
              </div>
              <div>
                <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                  10ms
                </div>
                <div className="text-sm text-gray-400">P99 Latency</div>
              </div>
              <div>
                <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                  1M+
                </div>
                <div className="text-sm text-gray-400">Requests/Second</div>
              </div>
              <div>
                <div className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                  24/7
                </div>
                <div className="text-sm text-gray-400">Global Monitoring</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PerformanceFeatures;
