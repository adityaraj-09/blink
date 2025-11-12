import { useState } from 'react';
import { Plus, Minus, HelpCircle } from 'lucide-react';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: "What is CodeHub and how does it work?",
      answer: "CodeHub is a GitHub-based coding platform that streamlines your development workflow. Simply connect your GitHub account, choose a repository, and start coding with our powerful in-browser editor. All changes sync seamlessly with your GitHub repositories, providing full version control and collaboration features."
    },
    {
      question: "Is my code and data secure?",
      answer: "Absolutely. We use bank-level 256-bit encryption, are SOC 2 certified, and comply with GDPR and HIPAA standards. Your code is stored securely, and we never access or share your private repositories without explicit permission. All data transfers are encrypted end-to-end."
    },
    {
      question: "Can I use CodeHub with my existing repositories?",
      answer: "Yes! CodeHub works seamlessly with all your existing GitHub repositories. You can import any public or private repository, and all changes you make are automatically synced back to GitHub. We support both personal and organization repositories."
    },
    {
      question: "What programming languages and frameworks are supported?",
      answer: "CodeHub supports all major programming languages including JavaScript, TypeScript, Python, Java, Go, Rust, and more. Our intelligent environment detection automatically configures your workspace based on your project's tech stack. We also provide integrated terminals and package managers for all supported languages."
    },
    {
      question: "How does pricing work?",
      answer: "We offer flexible pricing tiers to suit teams of all sizes. Start with our free tier to explore core features, then upgrade to Pro or Enterprise as your needs grow. All paid plans include unlimited repositories, advanced collaboration features, and priority support. Check our pricing page for detailed information."
    },
    {
      question: "Can I collaborate with my team in real-time?",
      answer: "Yes! CodeHub supports real-time collaboration features including live code editing, shared terminals, and integrated code review tools. Team members can work together on the same codebase simultaneously, with changes syncing instantly across all connected users."
    },
    {
      question: "What kind of support do you offer?",
      answer: "We provide 24/7 support for all users. Free tier users have access to our comprehensive documentation and community forums. Pro users get priority email support with <24 hour response times, while Enterprise customers receive dedicated support channels and custom onboarding assistance."
    },
    {
      question: "Can I deploy my applications directly from CodeHub?",
      answer: "Yes! CodeHub includes integrated deployment features that let you deploy to popular platforms with a single click. We support automatic builds, continuous integration, and deployment to production environments. Set up webhooks and automated deployment pipelines directly from your dashboard."
    }
  ];

  return (
    <section className="py-32 relative overflow-hidden bg-gradient-to-b from-[#1e2329] via-[#0f1318] to-[#1e2329]">
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-full blur-[120px] opacity-30"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-sm border border-primary/30 mb-6">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
            Frequently Asked
            <br />
            <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              Questions
            </span>
          </h2>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Everything you need to know about CodeHub. Can't find the answer you're looking for? Reach out to our support team.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="group relative rounded-2xl transition-all duration-300"
              >
                {/* Gradient glow - only visible when open */}
                <div className={`absolute -inset-1 bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/30 rounded-2xl blur-xl transition-opacity duration-500 ${
                  isOpen ? 'opacity-60' : 'opacity-0 group-hover:opacity-30'
                }`}></div>

                {/* Main card */}
                <div className={`relative rounded-2xl border transition-all duration-300 ${
                  isOpen
                    ? 'bg-[#1a1f26]/90 border-primary/40 backdrop-blur-lg'
                    : 'bg-[#1a1f26]/60 border-white/10 backdrop-blur-sm hover:border-primary/30'
                }`}>
                  {/* Question button */}
                  <button
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    className="w-full px-6 sm:px-8 py-6 flex items-center justify-between text-left gap-4 transition-all duration-300"
                  >
                    <span className={`text-lg sm:text-xl font-semibold transition-colors duration-300 ${
                      isOpen ? 'text-primary' : 'text-white group-hover:text-primary'
                    }`}>
                      {faq.question}
                    </span>

                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isOpen
                        ? 'bg-primary text-white rotate-180'
                        : 'bg-white/5 text-gray-400 group-hover:bg-primary/20 group-hover:text-primary'
                    }`}>
                      {isOpen ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </div>
                  </button>

                  {/* Answer panel */}
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${
                      isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-6 sm:px-8 pb-6">
                      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-6"></div>
                      <p className="text-gray-400 leading-relaxed text-base sm:text-lg">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          <div className="relative bg-[#1a1f26]/60 backdrop-blur-sm border border-white/10 group-hover:border-primary/30 rounded-2xl p-8 transition-all duration-300">
            <h3 className="text-2xl font-bold mb-3">Still have questions?</h3>
            <p className="text-gray-400 mb-6">
              Can't find the answer you're looking for? Please chat to our friendly team.
            </p>
            <button className="px-8 py-3 bg-primary hover:bg-secondary text-white rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg shadow-primary/20">
              Get in Touch
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
