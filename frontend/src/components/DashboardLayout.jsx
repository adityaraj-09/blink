import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import {
  LayoutDashboard,
  FolderGit2,
  Settings,
  User,
  Bell,
  Search,
  ChevronDown,
  Plus,
  Command,
  Zap
} from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const location = useLocation();
  const [searchFocused, setSearchFocused] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: FolderGit2, label: 'Projects', path: '/dashboard/projects' },
    { icon: User, label: 'Profile', path: '/dashboard/profile' },
    { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#0d1117] font-['Space_Grotesk'] text-gray-100">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#161b22]/80 backdrop-blur-xl border-b border-[#30363d] z-30">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-all">
                  <Zap className="w-5 h-5 text-white" fill="currentColor" />
                </div>
                <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">Merkle</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">PRO</span>
              </div>
            </Link>

            <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] transition-colors">
              <Plus size={16} className="text-gray-400" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className={`relative transition-all duration-200 ${searchFocused ? 'w-80' : 'w-64'}`}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                placeholder="Search projects..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-10 pr-12 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-gray-600">
                <Command size={12} />
                <span className="text-xs">K</span>
              </div>
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] transition-colors">
              <Bell size={18} className="text-gray-400" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
            </button>

            {/* User */}
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 ring-2 ring-[#30363d] hover:ring-emerald-500/50 transition-all"
                }
              }}
            />
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed left-0 top-16 bottom-0 w-60 bg-[#0d1117] border-r border-[#30363d] z-20 flex flex-col">
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group ${
                  active
                    ? 'bg-[#21262d] text-white border border-[#30363d]'
                    : 'text-gray-400 hover:bg-[#161b22] hover:text-gray-100'
                }`}
              >
                <Icon
                  size={18}
                  className={`transition-colors ${active ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-400'}`}
                />
                <span className="font-medium">{item.label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Section */}
        <div className="p-4">
          <div className="relative p-4 rounded-xl bg-gradient-to-br from-[#161b22] to-[#0d1117] border border-[#30363d] overflow-hidden">
            {/* Decorative glow */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400">Pro Features</span>
              </div>
              <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                Unlock unlimited projects and advanced AI features.
              </p>
              <button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30">
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pt-16 pl-60">
        <div className="p-8 relative">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
