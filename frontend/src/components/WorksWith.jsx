import { Clock, Brain, DollarSign, Zap, Code2, GitBranch, Gauge, Sparkles, TrendingDown } from 'lucide-react';

const WorksWith = () => {
  const features = [
    {
      title: "Lightning-fast performance",
      description: "CodeHub processes requests in milliseconds - up to 5X faster than competitors with optimized infrastructure.",
      visual: (
        <div className="relative h-48 flex items-center justify-center">
          {/* Speed gauge visualization */}
          <div className="relative w-full max-w-xs px-6">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-2xl"></div>
            <div className="relative bg-[#1a1f26] border border-primary/30 rounded-xl p-6">
              {/* Speedometer style visual */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <Gauge className="w-24 h-24 text-primary animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="w-10 h-10 text-secondary" />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">&lt;300ms</div>
                <div className="text-sm text-gray-400">Average Response Time</div>
              </div>
            </div>
          </div>
        </div>
      ),
      icon: <Clock className="w-6 h-6" />
    },
    {
      title: "AI-powered intelligence",
      description: "Built with advanced AI that understands context, learns patterns, and adapts to your coding style for smarter suggestions.",
      visual: (
        <div className="relative h-48 flex items-center justify-center">
          {/* AI brain visualization */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 blur-3xl"></div>
            <div className="relative flex items-center justify-center">
              {/* Center brain icon */}
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/50 animate-pulse">
                <Brain className="w-12 h-12 text-white" />
              </div>

              {/* Orbiting sparkles */}
              <div className="absolute -top-6 -left-6 animate-bounce">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="absolute -top-4 right-6 animate-bounce delay-100">
                <Sparkles className="w-5 h-5 text-secondary" />
              </div>
              <div className="absolute -bottom-6 -right-4 animate-bounce delay-200">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <div className="absolute bottom-4 -left-8 animate-bounce delay-300">
                <Sparkles className="w-5 h-5 text-secondary" />
              </div>
            </div>
          </div>
        </div>
      ),
      icon: <Brain className="w-6 h-6" />
    },
    {
      title: "Cost-effective solution",
      description: "Save up to 70% on infrastructure costs. Get enterprise-grade features without the enterprise price tag.",
      visual: (
        <div className="relative h-48 flex items-center justify-center">
          {/* Cost savings display */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-secondary/40 to-primary/50 blur-3xl"></div>
            <div className="relative text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <TrendingDown className="w-8 h-8 text-green-400" />
                <div className="text-2xl font-bold text-green-400">70% Less</div>
              </div>
              <div className="text-sm text-gray-400">Starting at</div>
              <div className="text-5xl font-bold bg-gradient-to-b from-white via-primary/80 to-secondary text-transparent bg-clip-text">
                $0.01
              </div>
              <div className="text-xs text-gray-500">per 1000 tokens</div>
            </div>
          </div>
        </div>
      ),
      icon: <DollarSign className="w-6 h-6" />
    }
  ];

  return (
    <section className="py-24 relative overflow-hidden bg-gradient-to-b from-[#1e2329] via-[#16191e] to-[#1e2329]">
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Works with every model.
            <br />
            <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              Faster. Better. Cheaper.
            </span>
          </h2>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="relative group rounded-2xl transition-all duration-500"
            >
              {/* Gradient shadow/glow */}
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/30 via-secondary/30 to-primary/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              {/* Main card */}
              <div className="relative bg-[#1a1f26] backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 group-hover:transform group-hover:-translate-y-2">
                {/* Visual Section */}
                <div className="bg-gradient-to-b from-[#0f1318] to-[#1a1f26]">
                  {feature.visual}
                </div>

                {/* Content Section */}
                <div className="p-6 space-y-3">
                  <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorksWith;
