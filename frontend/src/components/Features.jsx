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
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Powerful Features for
            <span className="text-primary"> Modern Development</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Everything you need to build, deploy, and scale your applications with confidence.
          </p>
        </div>

        {/* Main Features - Large Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {mainFeatures.map((feature, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-3xl transition-all duration-500 transform hover:-translate-y-2"
            >
              {/* Gradient shadow/glow */}
              <div className={`absolute -inset-1 bg-gradient-to-br ${feature.gradient} opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500`}></div>

              {/* Main card with backdrop */}
              <div className="relative bg-[#1a1f26]/80 backdrop-blur-sm rounded-3xl transition-all duration-500 shadow-2xl">
                {/* Animated gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-500`}></div>

                {/* Content */}
                <div className="relative z-10 p-8">
                {/* Icon container with gradient */}
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.iconBg} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-primary group-hover:text-secondary transition-colors duration-300">
                    {feature.icon}
                  </div>
                </div>

                {/* Large decorative icon */}
                <div className="absolute top-4 right-4 text-primary/10 group-hover:text-secondary/20 transition-all duration-300">
                  {feature.decorIcon}
                </div>

                <h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>

                <p className="text-gray-400 leading-relaxed mb-6">
                  {feature.description}
                </p>

                {/* Decorative gradient bar */}
                <div className={`h-1 w-full bg-gradient-to-r ${feature.gradient} rounded-full opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                </div>

                {/* Shine effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 group-hover:translate-x-full transition-transform duration-1000"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
