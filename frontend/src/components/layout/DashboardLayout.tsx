'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../../components/layout/Sidebar';
import { Bell, User as UserIcon, Menu, X } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { User } from '../../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentRoute: string;
}

const DashboardLayout = ({ children, currentRoute }: DashboardLayoutProps) => {
  const router = useRouter();
  const { isAuthenticated, loading, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleNavigate = (route: string) => {
    router.push(route);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b1220]">
        <div className="flex items-center gap-3 text-white">
          <LoadingSpinner size={24} />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirect effect will handle this
  }

  return (
    <div className="min-h-screen flex bg-[#0b1220] text-gray-100 font-sans selection:bg-indigo-500/30">
      <Sidebar
        onNavigate={handleNavigate}
        route={currentRoute}
        isOpen={mobileMenuOpen}
        closeMobile={() => setMobileMenuOpen(false)}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-4 md:px-8 bg-[#0b1220]/80 backdrop-blur z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-gray-800 rounded-lg transition"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold tracking-tight hidden md:block">
              {currentRoute === '/dashboard' && 'Overview'}
              {currentRoute === '/live' && 'Live Telemetry'}
              {currentRoute === '/analysis' && 'Data Analytics'}
              {currentRoute === '/history' && 'Accident Logs'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-full hover:bg-gray-800 transition">
              <Bell size={20} className="text-gray-400" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#0b1220]"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-gray-800">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-white">
                  {user?.first_name ? `${user.first_name}` : "User"}
                </div>
                <div className="text-xs text-gray-500">Connected</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
                {user?.first_name?.[0] || <UserIcon size={16} />}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;