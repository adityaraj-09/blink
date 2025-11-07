import { Code2 } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      company: "TechVision",
      companyLogo: "TV",
      title: "Transforming Development Workflow",
      description: "TechVision uses CodeHub to power their development teams, bringing the most relevant and important developer tools.",
      quote: "As an early adopter, I was lightning fast, we were like holy sh**...",
      stats: [
        { value: "5x", label: "faster development" },
        { value: "3x", label: "improved team productivity" }
      ],
      name: "Sarah Chen",
      role: "CTO, TechVision",
      image: "https://framerusercontent.com/images/DcHe9nmFJ4JHeI73qUIBZtRoNE.png?width=512&height=512"
    },
    {
      company: "DevCorp",
      companyLogo: "DC",
      title: "Building Better Software",
      description: "DevCorp leverages CodeHub's AI-powered features to streamline their development process and ship faster.",
      quote: "The integration capabilities are mind-blowing. We shipped 3 major features in half the time.",
      stats: [
        { value: "10x", label: "cost and time saved" },
        { value: "2x", label: "improved code quality" }
      ],
      name: "Marcus Rodriguez",
      role: "Lead Engineer, DevCorp",
      image: "https://framerusercontent.com/images/DcHe9nmFJ4JHeI73qUIBZtRoNE.png?width=512&height=512"
    },
    {
      company: "InnovateLabs",
      companyLogo: "IL",
      title: "Accelerating Innovation",
      description: "InnovateLabs uses CodeHub to enable their distributed teams to collaborate seamlessly across timezones.",
      quote: "Game changer for our remote team. Everyone is in sync, and deployment is a breeze.",
      stats: [
        { value: "40%", label: "faster deployment" },
        { value: "99.9%", label: "uptime reliability" }
      ],
      name: "Emily Watson",
      role: "VP Engineering, InnovateLabs",
      image: "https://framerusercontent.com/images/DcHe9nmFJ4JHeI73qUIBZtRoNE.png?width=512&height=512"
    },
    {
      company: "CloudScale",
      companyLogo: "CS",
      title: "Scaling with Confidence",
      description: "CloudScale relies on CodeHub's enterprise features to maintain security and compliance at scale.",
      quote: "The security features and compliance tools give us complete peace of mind as we scale.",
      stats: [
        { value: "100%", label: "SOC 2 compliant" },
        { value: "50%", label: "reduced onboarding time" }
      ],
      name: "David Kim",
      role: "Security Lead, CloudScale",
      image: "https://framerusercontent.com/images/DcHe9nmFJ4JHeI73qUIBZtRoNE.png?width=512&height=512"
    }
  ];

  return (
    <section id="testimonials" className="py-24 relative overflow-hidden bg-gradient-to-b from-[#1e2329] via-[#16191e] to-[#1e2329]">
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-16 max-w-xl">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Our customers <span className="text-primary">love us</span>
          </h2>
          <p className="text-lg text-gray-400 mb-6">
            We enable personalized experiences for your users.
          </p>
          <p className="text-gray-500 mb-8">
            Builders everywhere are skipping months of infra work and shipping AI products with memory in days.
          </p>
          <button className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all">
            Browse case studies & blogs
          </button>
        </div>

        {/* Auto-scrolling Testimonials */}
        <div className="relative h-[500px]">
          {/* Fade gradients */}
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#16191e] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#16191e] to-transparent z-10 pointer-events-none"></div>

          {/* Scrollable container */}
          <div className="flex gap-6 overflow-hidden">
            {/* First column - scrolls up */}
            <div className="flex-1 flex flex-col gap-6 animate-scroll-up">
              {testimonials.concat(testimonials).map((testimonial, index) => (
                <TestimonialCard key={`col1-${index}`} testimonial={testimonial} />
              ))}
            </div>

            {/* Second column - scrolls down */}
            <div className="flex-1 flex flex-col gap-6 animate-scroll-down">
              {[...testimonials].reverse().concat([...testimonials].reverse()).map((testimonial, index) => (
                <TestimonialCard key={`col2-${index}`} testimonial={testimonial} />
              ))}
            </div>

            {/* Third column - scrolls up (hidden on mobile) */}
            <div className="hidden lg:flex flex-1 flex-col gap-6 animate-scroll-up-slow">
              {testimonials.concat(testimonials).map((testimonial, index) => (
                <TestimonialCard key={`col3-${index}`} testimonial={testimonial} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-up {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-50%);
          }
        }

        @keyframes scroll-down {
          0% {
            transform: translateY(-50%);
          }
          100% {
            transform: translateY(0);
          }
        }

        .animate-scroll-up {
          animation: scroll-up 40s linear infinite;
        }

        .animate-scroll-down {
          animation: scroll-down 40s linear infinite;
        }

        .animate-scroll-up-slow {
          animation: scroll-up 50s linear infinite;
        }
      `}</style>
    </section>
  );
};

const TestimonialCard = ({ testimonial }) => {
  return (
    <div className="relative group rounded-2xl flex-shrink-0">
      {/* Gradient shadow/glow */}
      <div className="absolute -inset-1 bg-gradient-to-br from-primary/30 to-secondary/30 blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Main card */}
      <div className="relative bg-[#1a1f26]/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
        {/* Company Logo */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">{testimonial.companyLogo}</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{testimonial.company}</h3>
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-2">{testimonial.title}</h4>
          <p className="text-gray-400 text-sm leading-relaxed">{testimonial.description}</p>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-6">
          {testimonial.stats.map((stat, idx) => (
            <div key={idx} className="flex-1">
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-6"></div>

        {/* Quote & Author */}
        <div className="flex gap-4">
          <img
            src={testimonial.image}
            alt={testimonial.name}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
          />
          <div className="flex-1">
            <p className="text-gray-300 text-sm italic mb-3">"{testimonial.quote}"</p>
            <div>
              <div className="font-semibold text-white text-sm">{testimonial.name}</div>
              <div className="text-xs text-gray-500">{testimonial.role}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
