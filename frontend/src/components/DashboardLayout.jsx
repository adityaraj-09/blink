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
  Plus
} from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
    { icon: FolderGit2, label: 'Projects', path: '/dashboard/projects' },
    { icon: User, label: 'Profile', path: '/dashboard/profile' },
    { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#fafbfc] font-['Space_Grotesk']">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#365eff] to-[#4d70ff] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">CodeHub</span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
          </div>

          <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors">
            <Plus size={16} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search..."
              className="bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-[#365eff] focus:ring-1 focus:ring-[#365eff] transition-all w-64"
            />
          </div>

          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
            <Bell size={18} className="text-gray-600" />
          </button>

          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-8 h-8"
              }
            }}
          />
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed left-0 top-14 bottom-0 w-56 bg-white border-r border-gray-200 z-20">
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${
                  active
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Upgrade Section */}
        <div className="absolute bottom-4 left-3 right-3 p-4 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg">
          <div className="text-xs font-medium text-orange-900 mb-1">Upgrade to a paid plan to</div>
          <div className="text-xs text-orange-700 mb-3">unlock more limits.</div>
          <button className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium py-2 rounded-md transition-colors">
            Upgrade
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pt-14 pl-56">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
