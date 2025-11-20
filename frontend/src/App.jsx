import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import EditorPageFinal from './pages/EditorPageFinal';
import ProtectedRoute from './components/ProtectedRoute';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function App() {
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#365eff',
          colorText: 'white',
          colorBackground: '#1e2329',
          colorInputBackground: '#1a1f26',
          colorInputText: 'white',
          borderRadius: '0.75rem',
        },
        elements: {
          formButtonPrimary:
            'bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary text-white transition-all transform hover:scale-[1.02]',
          card:
            'bg-transparent border-0 shadow-none',
          headerTitle:
            'text-white text-2xl',
          headerSubtitle:
            'text-gray-400',
          socialButtonsBlockButton:
            'bg-white/5 border-primary/20 hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 text-white transition-all hover:border-primary/40',
          formFieldLabel:
            'text-gray-300 font-medium',
          formFieldInput:
            'bg-white/5 border-primary/20 text-white focus:border-primary/40 rounded-xl transition-all',
          footerActionLink:
            'text-primary hover:text-secondary font-semibold',
          identityPreviewText:
            'text-white',
          identityPreviewEditButton:
            'text-primary hover:text-secondary',
          dividerLine:
            'bg-primary/20',
          dividerText:
            'text-gray-400',
        }
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/sign-in/*" element={<SignInPage />} />
          {/* <Route path="/sign-up/*" element={<SignUpPage />} /> */}

          {/* Protected Routes - Require Authentication */}
          <Route path="/editor" element={<ProtectedRoute><EditorPageFinal /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/dashboard/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
          <Route path="/dashboard/projects/:id" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
          <Route path="/dashboard/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        </Routes>
      </Router>
    </ClerkProvider>
  );
}

export default App;
