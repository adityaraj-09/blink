import { Code2, GitBranch, Users, Monitor, Link2, UsersRound } from 'lucide-react';

const Features = () => {
  const mainFeatures = [
    {
      icon: <Code2 className="w-12 h-12" />,
      title: "Smart Code Editor",
      description: "Powerful in-browser code editor with syntax highlighting, auto-completion, and real-time collaboration. Work seamlessly with your team on any project.",
      gradient: "from-primary via-secondary to-primary",
      iconBg: "from-primary/20 to-secondary/20",
      decorIcon: <Monitor className="w-16 h-16" />
    },
    {
      icon: <GitBranch className="w-12 h-12" />,
      title: "GitHub Integration",
      description: "Seamlessly sync with your GitHub repositories. Pull, commit, and push directly from the platform with full version control support.",
      gradient: "from-secondary via-primary to-secondary",
      iconBg: "from-secondary/20 to-primary/20",
      decorIcon: <Link2 className="w-16 h-16" />
    },
    {
      icon: <Users className="w-12 h-12" />,
      title: "Team Collaboration",
      description: "Work together in real-time with your team. Share code, review pull requests, and track changes with powerful collaboration tools.",
      gradient: "from-primary/80 via-secondary/80 to-primary/80",
      iconBg: "from-primary/20 to-secondary/10",
      decorIcon: <UsersRound className="w-16 h-16" />
    }
  ];

  return (
  <section id="features" className="py-32 relative overflow-hidden bg-linear-to-b from-dark-bg via-[#0f1318] to-dark-bg">
      {/* Enhanced background effects */}
      <div className="absolute inset-0 z-0">
  <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-linear-to-r from-primary/20 to-secondary/15 rounded-full blur-[120px] animate-pulse"></div>
  <div className="absolute bottom-1/4 right-1/4 w-[700px] h-[700px] bg-linear-to-l from-secondary/20 to-primary/15 rounded-full blur-[130px] animate-pulse delay-1000"></div>
      </div>

      {/* Grid pattern overlay */}
  <div className="absolute inset-0 bg-[linear-gradient(to_right,#365eff05_1px,transparent_1px),linear-gradient(to_bottom,#365eff05_1px,transparent_1px)] bg-size-[4rem_4rem] pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
            <Code2 className="w-4 h-4 text-primary" />
            <span className="text-sm text-gray-300 font-medium">Powerful Features</span>
          </div>

          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="block mb-2">Everything you need for</span>
            <span className="text-(--c1)">Modern Development</span>
          </h2>

          <p className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto">
            Build, deploy, and scale your applications with confidence using our comprehensive suite of tools.
          </p>
        </div>

        {/* Main Features - Enhanced Large Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {mainFeatures.map((feature, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-3xl transition-all duration-500 transform hover:-translate-y-3"
            >
              {/* Enhanced gradient glow */}
              <div className={`absolute -inset-2 bg-linear-to-br ${feature.gradient} opacity-30 blur-2xl group-hover:opacity-60 transition-opacity duration-500`}></div>

              {/* Main card with enhanced glassmorphism */}
              <div className="relative bg-[#1a1f26]/80 backdrop-blur-xl border border-white/10 group-hover:border-primary/40 rounded-3xl transition-all duration-500 shadow-2xl h-full">
    {/* Animated gradient overlay */}
    <div className={`absolute inset-0 bg-linear-to-br ${feature.gradient} opacity-0 group-hover:opacity-15 rounded-3xl transition-opacity duration-500`}></div>

                
                <div className="relative z-10 p-8 flex flex-col h-full">
                  {/* Icon container with enhanced gradient and shadow */}
                  <div className={`inline-flex p-5 rounded-2xl bg-linear-to-br ${feature.iconBg} mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg w-fit`}>
                    <div className="text-primary group-hover:text-secondary transition-colors duration-300">
                      {feature.icon}
                    </div>
                  </div>

                  {/* Large decorative icon with better positioning */}
                  <div className="absolute top-6 right-6 text-primary/10 group-hover:text-secondary/20 group-hover:scale-110 transition-all duration-300">
                    {feature.decorIcon}
                  </div>

                  <h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors text-white">
                    {feature.title}
                  </h3>

                  <p className="text-gray-400 leading-relaxed mb-6 grow">
                    {feature.description}
                  </p>

                  {/* Enhanced decorative gradient bar */}
                  <div className="mt-auto">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full bg-linear-to-r ${feature.gradient} rounded-full transition-all duration-700 group-hover:w-full w-2/3`}></div>
                    </div>
                  </div>
                </div>

                {/* Enhanced shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -skew-x-12 group-hover:translate-x-full transition-transform duration-1000 rounded-3xl"></div>
                </div>

                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
