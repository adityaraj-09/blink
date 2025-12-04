import { useState } from 'react';
import { Plus, Minus, Search, ChevronDown } from 'lucide-react';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = [
    { name: 'All', count: 10 },
    { name: 'Tracking', count: 3 },
    { name: 'Pricing', count: 2 },
    { name: 'Analytics', count: 3 },
    { name: 'Support', count: 2 }
  ];

  const faqs = [
    {
      question: "How do I start tracking users on my website?",
      answer: "Merkle is a GitHub-based coding platform that streamlines your development workflow. Simply connect your GitHub account, choose a repository, and start coding with our powerful in-browser editor.",
      category: "tracking"
    },
    {
      question: "What's included in the free trial?",
      answer: "Absolutely. We use bank-level 256-bit encryption, are SOC 2 certified, and comply with GDPR and HIPAA standards. Your code is stored securely, and we never access or share your private repositories.",
      category: "pricing"
    },
    {
      question: "Can I upgrade or downgrade my plan anytime?",
      answer: "Yes! Merkle works seamlessly with all your existing GitHub repositories. You can import any public or private repository, and all changes you make are automatically synced back to GitHub.",
      category: "pricing"
    },
    {
      question: "How accurate is the user tracking data?",
      answer: "Merkle supports all major programming languages including JavaScript, TypeScript, Python, Java, Go, Rust, and more. Our intelligent environment detection automatically configures your workspace.",
      category: "analytics"
    }
  ];

  return (
    <section id="faq" className="relative bg-[#020617] w-full bg-bg-dark py-6 sm:py-8 md:py-10 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-900/20 rounded-full blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-800/20 rounded-full blur-[128px] pointer-events-none"></div>

      <div className="bg-gradient-to-br from-slate-900/0 via-bg-dark to-slate-900/30 min-h-auto sm:min-h-[1075px] relative overflow-hidden z-10 container py-8 sm:py-12 md:py-15 mx-auto max-w-[95vw] sm:max-w-[90vw] md:max-w-[1250px] px-4 sm:px-6 border-[0.5px] border-slate-800/0 rounded-[12px] backdrop-blur-sm">
        
        {/* Background Elements */}
        <div className="absolute z-1 bottom-0 translate-y-[80%] -translate-x-1/2 left-1/2 w-[356px] h-[356px] opacity-60 pointer-events-none">
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-full mix-blend-overlay blur-3xl"></div>
          </div>
        </div>

        <div className="relative">
          <div className="text-center sm:mb-20 relative py-3 sm:py-10 pt-5 pb-8 bg-cover bg-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
            Frequently Asked Questions
          </div>
            <h2 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-4 sm:mb-6 relative z-10 font-clash-display leading-tight">
              Got questions? We've got answers
            </h2>
            <p className="text-text-body text-sm sm:text-base md:text-lg max-w-sm sm:max-w-lg md:max-w-2xl mx-auto leading-relaxed relative z-10 font-dm-sans">
              Everything you need to know about our platform, pricing, and how to get started.
            </p>
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 sm:w-60 md:w-72 h-48 sm:h-60 md:h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* Search Bar */}
        <div className="mt-6 sm:mt-8 mb-8 sm:mb-10 relative z-20">
          <div className="w-full max-w-full sm:max-w-lg mx-auto px-2 sm:px-0">
            <div className="relative">
              <div className="flex-grow basis-0 h-[42px] bg-slate-900/20 backdrop-blur-sm rounded-xl border border-slate-800/50 shadow-[0px_1px_4px_0px_rgba(0,0,0,0.18)] relative hover:border-slate-700/50 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all duration-200 w-full pl-10 sm:pl-6 text-sm sm:text-base">
                <input
                  className="w-full h-full px-4 bg-transparent outline-none text-gray-200 text-[14px] tracking-[0.98px] font-light rounded-xl placeholder:text-gray-400 placeholder:font-light font-dm-sans"
                  placeholder="Search questions..."
                  type="text"
                />
              </div>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="relative z-20">
          <div className="flex flex-col items-center mb-6 sm:mb-8 px-1 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
              {categories.map((cat) => (
                <div key={cat.name} className="z-10 select-none">
                  <button
                    type="button"
                    onClick={() => setActiveCategory(cat.name)}
                    className={`relative inline-flex items-center justify-center gap-2 px-4 py-[9px] rounded-[30px] transition-colors cursor-pointer
                      before:content-[''] before:absolute before:-top-[1px] before:-left-[1px] before:-z-[1] before:w-[calc(100%+2px)] before:h-[calc(100%+2px)] before:rounded-[30px] before:p-[1px]
                      ${activeCategory === cat.name 
                        ? 'bg-transparent hover:bg-white/5 border border-white/30 before:bg-transparent' 
                        : 'bg-transparent hover:bg-white/10 border border-transparent before:hidden text-gray-400 hover:text-gray-300 hover:bg-slate-800/30 border-slate-800/50'}
                      transition-all duration-150 whitespace-nowrap flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5`}
                  >
                    <span className={`relative w-fit font-normal text-[14px] leading-[20px] whitespace-nowrap flex items-center gap-2 transition-colors ${activeCategory === cat.name ? 'text-white' : 'text-white/70 hover:text-white'}`}>
                      <span className="flex items-center gap-0.5 sm:gap-1">
                        {cat.name}
                        <span className={`inline-flex items-center justify-center rounded-full font-medium ml-1 w-4 h-4 sm:w-5 sm:h-5 text-[10px] sm:text-xs ${activeCategory === cat.name ? 'text-black bg-white' : 'text-gray-400 bg-slate-800/50'}`}>
                          {cat.count}
                        </span>
                      </span>
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ Items */}
        <div className="flex flex-col gap-3 sm:gap-4 mt-6 sm:mt-8 max-w-full sm:max-w-[900px] mx-auto relative z-20">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-lg border border-slate-800/50 overflow-hidden transition-all duration-200 bg-slate-900/20 hover:bg-slate-900/30"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                className="flex justify-between items-start sm:items-center w-full p-4 sm:p-6 text-left"
              >
                <h3 className="font-medium text-base sm:text-lg text-white pr-3 sm:pr-4 font-dm-sans leading-tight">
                  {faq.question}
                </h3>
                <span className="flex items-center ml-2 sm:ml-4 flex-shrink-0">
                  <span className="hidden sm:block text-xs px-3 py-1 rounded-full mr-3 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-dm-sans">
                    {faq.category}
                  </span>
                  <div className={`flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-800/50 transition-transform duration-200 ${openIndex === index ? 'rotate-180' : ''}`}>
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  </div>
                </span>
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 text-gray-400 text-sm sm:text-base leading-relaxed font-dm-sans border-t border-slate-800/30 mt-2">
                  <div className="pt-4">
                    {faq.answer}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-center mt-8">
            <div className="z-10 select-none">
              <button type="button" className="relative inline-flex items-center justify-center gap-2 px-4 py-[9px] rounded-[30px] transition-colors cursor-pointer bg-transparent hover:bg-white/5 border border-white/30 flex items-center gap-2">
                <span className="relative w-fit font-normal text-[14px] leading-[20px] whitespace-nowrap flex items-center gap-2 transition-colors text-white">
                  <ChevronDown className="h-4 w-4" />
                  Show 6 More
                </span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default FAQ;
