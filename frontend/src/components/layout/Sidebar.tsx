import React from 'react';
import { X, Activity, MapPin, BarChart3, History, LogOut } from 'lucide-react';

interface SidebarProps {
  onNavigate: (route: string) => void;
  route: string;
  isOpen: boolean;
  closeMobile: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, route, isOpen, closeMobile, onLogout }) => {
  const items = [
    { icon: Activity, label: "Dashboard", route: "/dashboard" },
    { icon: MapPin, label: "Live Monitor", route: "/live" },
    { icon: BarChart3, label: "Data Analysis", route: "/analysis" },
    { icon: History, label: "History", route: "/history" },
  ];

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] text-gray-100 p-4 transform transition-transform duration-300 ease-in-out border-r border-gray-800 flex flex-col
    ${isOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 md:flex
  `;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobile}
        />
      )}

      <aside className={sidebarClasses}>
        <div className="flex items-center justify-between mb-8">
          <div className="text-2xl font-bold text-indigo-400">Smart Helmet</div>
          <button onClick={closeMobile} className="md:hidden text-gray-400">
            <X size={24} />
          </button>
        </div>

        <nav className="space-y-2 flex-1">
          {items.map((it) => {
            const Icon = it.icon;
            const active = route === it.route;
            return (
              <button
                key={it.route}
                onClick={() => {
                  onNavigate(it.route);
                  closeMobile();
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition ${
                  active
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50"
                    : "hover:bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{it.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-gray-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-red-900/20 text-red-400 hover:text-red-300 transition"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
          <div className="mt-4 text-xs text-gray-600 text-center">
             v1.4.0 (Phase 4 Build)
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;