import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { dark } from '@clerk/themes';

const SignUpPage = () => {
  return (
    <div className="h-screen  flex items-center justify-center p-10 sm:p-8 font-dm-sans">
      <div className="w-full m-4 max-w-[1200px]  bg-[#0f1318] rounded-[30px] overflow-hidden flex shadow-2xl border border-white/5 relative">
        
        {/* Background Gradients for the container */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px]"></div>
        </div>

        {/* Left Side - Image */}
        <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 bg-cover bg-center z-10" 
             style={{ backgroundImage: 'url("/images/m2.jpg")' , objectFit: 'contain' }}>
          <div className="absolute inset-0 bg-[#020617]/60 "></div>
          <div className="absolute inset-0 bg-linear-to-t from-[#020617] via-transparent to-transparent"></div>
          
          <div className="relative z-10 w-full flex justify-end">
             <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white text-sm hover:bg-white/10 transition-all duration-300 group">
               Back to website <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
             </Link>
          </div>

          <div className="relative z-10">
            <h2 className="text-4xl lg:text-5xl font-clash-display font-medium text-white mb-6 leading-tight">
              Join the Community
            </h2>
            <p className="text-gray-300 text-lg max-w-md leading-relaxed">
              Start building your next big idea with the most advanced AI coding platform.
            </p>
            
            <div className="flex gap-3 mt-12">
               <div className="w-2 h-1.5 bg-white/20 rounded-full"></div>
               <div className="w-12 h-1.5 bg-blue-500 rounded-full"></div>
               <div className="w-2 h-1.5 bg-white/20 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 bg-[#020617] p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative z-10">
           {/* Mobile Back Button */}
           <div className="lg:hidden absolute top-6 right-6">
             <Link to="/" className="text-gray-400 hover:text-white p-2">
               <ArrowLeft className="w-6 h-6" />
             </Link>
           </div>

           <div className="max-w-[400px] mx-auto w-full">
             <div className="mb-10">
                <h1 className="text-3xl sm:text-4xl font-clash-display font-medium text-white mb-3">
                Create Account
                </h1>
                <p className="text-gray-400 text-base">
                Already have an account? <Link to="/sign-in" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Log in</Link>
                </p>
             </div>

             <SignUp 
               appearance={{
                 baseTheme: dark,
                 elements: {
                   rootBox: "w-full",
                
                   header: "hidden",
                   footer: "hidden",
                   
                   formButtonPrimary: "bg-blue-600 hover:bg-blue-500 text-white normal-case text-[15px] py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-blue-600/20",
                   formFieldInput: "bg-[#0f1318] border-white/10 text-white rounded-xl focus:border-blue-500 focus:ring-blue-500/20 py-3 px-4 transition-all duration-300",
                   formFieldLabel: "text-gray-400 text-sm font-medium mb-1.5",
                   socialButtonsBlockButton: "bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl py-3 transition-all duration-300",
                   socialButtonsBlockButtonText: "font-medium",
                   dividerLine: "bg-white/10",
                   dividerText: "text-gray-500 text-sm",
                   formFieldAction: "text-blue-400 hover:text-blue-300 text-sm font-medium",
                   alert: "bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl",
                   identityPreviewText: "text-gray-300",
                   identityPreviewEditButton: "text-blue-400 hover:text-blue-300"
                 }
               }}
             />
           </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
