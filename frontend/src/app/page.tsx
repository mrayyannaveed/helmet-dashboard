"use client";
import React, { useEffect, useState, useMemo } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Bell,
  MapPin,
  Activity,
  BarChart3,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  History,
  LogOut,
  User as UserIcon,
  Lock,
  Mail,
  ChevronRight
} from "lucide-react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

// --- TYPES ---
type AlertStatus = "PENDING" | "CONFIRMED" | "RESOLVED";

type User = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
};

type Helmet = {
  id: string;
  user_id?: string;
  serial_number: string;
  last_seen?: string | null;
};

type AccidentEvent = {
  id: string;
  helmet_id: string;
  timestamp: string;
  latitude?: number | null;
  longitude?: number | null;
  gforce_reading?: number | null;
  alert_status: AlertStatus;
};

type TripData = {
  id: string;
  helmet_id: string;
  start_time?: string | null;
  end_time?: string | null;
  distance_km?: number | null;
  max_speed?: number | null;
  average_speed?: number | null;
};

// --- CONFIG ---
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const COLORS = ["#6366f1", "#10b981", "#ef4444", "#f59e0b"];

// --- HOOKS ---
function useHashRoute() {
  const [route, setRoute] = useState<string>(
    typeof window !== "undefined"
      ? window.location.hash.slice(1) || "/login" // Default to login if no hash
      : "/login"
  );
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1) || "/login");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const push = (r: string) => {
    window.location.hash = r;
    setRoute(r);
  };
  return { route, push };
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

// --- COMPONENTS ---

function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.15" fill="none" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// --- AUTH VIEWS ---

const LoginView: React.FC<{ onLoginSuccess: (token: string) => void; onGoRegister: () => void }> = ({ onLoginSuccess, onGoRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Connects to your backend logic
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", password);
      
      const res = await axios.post(`${API_BASE}/api/auth/login`, formData);
      onLoginSuccess(res.data.access_token);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Login failed. Check server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b1220] p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to access your Smart Helmet Dashboard</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-200 text-sm rounded flex items-center gap-2">
            <XCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-gray-500" size={18} />
              <input 
                type="email" required 
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="rider@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-gray-500" size={18} />
              <input 
                type="password" required 
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? <LoadingSpinner size={20} /> : <>Sign In <ChevronRight size={18} /></>}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <button onClick={onGoRegister} className="text-indigo-400 hover:text-indigo-300 font-medium">
            Register here
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const RegisterView: React.FC<{ onRegisterSuccess: (token: string) => void; onGoLogin: () => void }> = ({ onRegisterSuccess, onGoLogin }) => {
  const [formData, setFormData] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_BASE}/api/auth/register`, formData);
      onRegisterSuccess(res.data.access_token);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b1220] p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400">Join the Smart Helmet safety network</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-200 text-sm rounded flex items-center gap-2">
            <XCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-medium text-gray-400 mb-1">First Name</label>
               <input 
                 type="text" required 
                 value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})}
                 className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
               />
             </div>
             <div>
               <label className="block text-xs font-medium text-gray-400 mb-1">Last Name</label>
               <input 
                 type="text" required 
                 value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})}
                 className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
               />
             </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
            <input 
              type="email" required 
              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
            <input 
              type="password" required 
              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Min 8 chars"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? <LoadingSpinner size={20} /> : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <button onClick={onGoLogin} className="text-indigo-400 hover:text-indigo-300 font-medium">
            Login here
          </button>
        </div>
      </motion.div>
    </div>
  );
};


// --- DASHBOARD LAYOUT COMPONENTS ---

const Sidebar: React.FC<{
  onNavigate: (r: string) => void;
  route: string;
  isOpen: boolean;
  closeMobile: () => void;
  onLogout: () => void;
}> = ({ onNavigate, route, isOpen, closeMobile, onLogout }) => {
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

const ErrorBox: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="bg-red-900/30 border border-red-800 text-red-100 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
    <div className="flex justify-between items-center gap-4">
      <div className="flex items-center gap-2">
        <XCircle size={20} />
        <span>{error}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="text-sm px-3 py-1 bg-red-900/50 rounded hover:bg-red-800 transition">
          Retry
        </button>
      )}
    </div>
  </div>
);

// --- MAIN CONTENT VIEWS ---

const DashboardView: React.FC<{
  user?: User | null;
  helmet?: Helmet | null;
  recentAlerts: AccidentEvent[];
  stats: { totalAccidents: number; totalTrips: number };
}> = ({ user, helmet, recentAlerts, stats }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rider Card */}
        <motion.div whileHover={{ scale: 1.01 }} className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-400">Rider Status</div>
              {/* This will now show the REAL user name from backend */}
              <div className="text-xl font-bold text-white">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email || "Guest Rider"}
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${helmet?.last_seen ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-red-500"}`} />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Connection</span>
              <span className={helmet?.last_seen ? "text-green-400" : "text-gray-400"}>
                {helmet?.last_seen ? "Active" : "Offline"}
              </span>
            </div>
            <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: "75%" }} />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Battery</span>
              <span>75%</span>
            </div>
          </div>
        </motion.div>

        {/* Safety Score Card */}
        <motion.div whileHover={{ scale: 1.01 }} className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="text-sm text-gray-400">Safety Overview</div>
            <div className="text-3xl font-bold mt-1 text-white">{stats.totalAccidents} <span className="text-lg text-gray-500 font-normal">Alerts</span></div>
          </div>
           <div className="mt-4 flex gap-2">
              <div className="px-3 py-1 bg-gray-700 rounded text-xs text-gray-300">Trips: {stats.totalTrips}</div>
              <div className="px-3 py-1 bg-gray-700 rounded text-xs text-gray-300">Score: A+</div>
           </div>
        </motion.div>

        {/* Action Card */}
        <motion.div whileHover={{ scale: 1.01 }} className="bg-linear-to-br from-indigo-900/50 to-gray-800/50 border border-indigo-500/30 p-6 rounded-xl backdrop-blur-sm">
          <div className="text-sm text-indigo-300 font-semibold mb-3">Quick Actions</div>
          <div className="space-y-3">
             <button className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> Acknowledge Alert
             </button>
             <button className="w-full py-2 px-4 rounded-lg border border-gray-600 hover:bg-gray-700 text-gray-300 text-sm transition">
                Generate Report
             </button>
          </div>
        </motion.div>
      </div>

      {/* Recent Alerts Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="font-semibold text-gray-200">Recent Alerts</h3>
          <span className="text-xs text-gray-500">Last 5 Events</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs text-gray-400 bg-gray-900/50 uppercase tracking-wider">
              <tr>
                <th className="p-4">Time</th>
                <th className="p-4">Severity (G)</th>
                <th className="p-4">Location</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {recentAlerts.length === 0 ? (
                 <tr><td colSpan={4} className="p-4 text-center text-gray-500">No recent accidents recorded.</td></tr>
              ) : recentAlerts.map((a) => (
                <tr key={a.id} className="hover:bg-gray-700/30 transition">
                  <td className="p-4 text-sm text-gray-300">{formatDate(a.timestamp)}</td>
                  <td className="p-4 text-sm font-mono text-indigo-300">{a.gforce_reading ?? "—"}</td>
                  <td className="p-4 text-sm text-gray-400">
                    {a.latitude && a.longitude ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}` : "—"}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                      a.alert_status === "PENDING" ? "bg-yellow-900/30 text-yellow-500 border-yellow-700" :
                      a.alert_status === "CONFIRMED" ? "bg-red-900/30 text-red-500 border-red-700" :
                      "bg-green-900/30 text-green-500 border-green-700"
                    }`}>
                      {a.alert_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

const LiveView: React.FC<{ helmet?: Helmet | null }> = ({ helmet }) => {
  const [data, setData] = useState({
    accel: { x: 0, y: 0, z: 9.8 },
    gyro: { x: 0, y: 0, z: 0 },
    speed: 0,
    temp: 28
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setData({
        accel: {
          x: +(Math.random() - 0.5).toFixed(2),
          y: +(Math.random() - 0.5).toFixed(2),
          z: +(9.8 + (Math.random() - 0.5)).toFixed(2)
        },
        gyro: {
          x: +(Math.random() * 2).toFixed(1),
          y: +(Math.random() * 2).toFixed(1),
          z: +(Math.random() * 2).toFixed(1)
        },
        speed: Math.floor(Math.random() * 60),
        temp: 34
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-1 overflow-hidden h-[300px] relative group">
        <div className="absolute top-4 left-4 z-10 bg-gray-900/80 backdrop-blur text-xs px-3 py-1 rounded-full text-green-400 border border-green-900/50 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live Tracking
        </div>
        <div className="w-full h-full bg-[#111827] flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <div className="relative z-0 w-full h-full flex items-center justify-center text-gray-600">
               <MapPin size={48} className="text-indigo-500 animate-bounce" />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4 text-indigo-400">
            <Activity size={18} />
            <h3 className="font-semibold">Accelerometer</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
             <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700">
                <div className="text-xs text-gray-500">X-Axis</div>
                <div className="text-lg font-mono text-white">{data.accel.x}</div>
             </div>
             <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700">
                <div className="text-xs text-gray-500">Y-Axis</div>
                <div className="text-lg font-mono text-white">{data.accel.y}</div>
             </div>
             <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700">
                <div className="text-xs text-gray-500">Z-Axis</div>
                <div className="text-lg font-mono text-white">{data.accel.z}</div>
             </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4 text-purple-400">
            <Zap size={18} />
            <h3 className="font-semibold">Gyroscope</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
             <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700">
                <div className="text-xs text-gray-500">Roll</div>
                <div className="text-lg font-mono text-white">{data.gyro.x}°</div>
             </div>
             <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700">
                <div className="text-xs text-gray-500">Pitch</div>
                <div className="text-lg font-mono text-white">{data.gyro.y}°</div>
             </div>
             <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700">
                <div className="text-xs text-gray-500">Yaw</div>
                <div className="text-lg font-mono text-white">{data.gyro.z}°</div>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AnalysisView: React.FC = () => {
  const timeSeriesData = Array.from({ length: 20 }, (_, i) => ({
    time: `10:${30 + i}`,
    normal: 1 + Math.random() * 0.5,
    impact: i === 12 ? 4.5 : 1 + Math.random() * 0.5
  }));

  const accidentStats = [
    { name: 'Normal Trips', value: 85 },
    { name: 'Hard Braking', value: 10 },
    { name: 'Accidents', value: 5 },
  ];

  const spikeData = [
    { day: 'Mon', spikes: 2 },
    { day: 'Tue', spikes: 5 },
    { day: 'Wed', spikes: 1 },
    { day: 'Thu', spikes: 8 },
    { day: 'Fri', spikes: 3 },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
            <div className="text-gray-400 text-xs">Mean Acceleration</div>
            <div className="text-2xl font-bold text-white mt-1">1.2g</div>
         </div>
         <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
            <div className="text-gray-400 text-xs">Max Spike Recorded</div>
            <div className="text-2xl font-bold text-red-400 mt-1">4.5g</div>
         </div>
         <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
            <div className="text-gray-400 text-xs">Analysis Duration</div>
            <div className="text-2xl font-bold text-white mt-1">7 Days</div>
         </div>
         <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
            <div className="text-gray-400 text-xs">Data Reliability</div>
            <div className="text-2xl font-bold text-green-400 mt-1">98%</div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">G-Force Time Series (Impact Analysis)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="normal" stroke="#10b981" name="Normal Reading" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="impact" stroke="#ef4444" name="Impact Spike" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Max Spikes per Day</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spikeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip cursor={{fill: '#374151'}} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="spikes" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl lg:col-span-2">
           <h3 className="text-sm font-semibold text-gray-200 mb-4">Trip Classification (Accident vs Normal)</h3>
           <div className="h-64 w-full flex justify-center">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={accidentStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {accidentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

const HistoryView: React.FC<{
  events: AccidentEvent[];
  onFilterChange?: (opts: { start?: string; end?: string; status?: AlertStatus | "" }) => void;
  fetchMore?: () => void;
}> = ({ events, onFilterChange, fetchMore }) => {
  const [status, setStatus] = useState<AlertStatus | "" | undefined>("");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-end md:items-center">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
          <div>
             <label className="text-xs text-gray-400 block mb-1">Start Date</label>
             <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-sm text-white" />
          </div>
          <div>
             <label className="text-xs text-gray-400 block mb-1">End Date</label>
             <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-sm text-white" />
          </div>
          <div className="col-span-2 md:col-span-1">
             <label className="text-xs text-gray-400 block mb-1">Status</label>
             <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-sm text-white">
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="RESOLVED">RESOLVED</option>
             </select>
          </div>
        </div>
        <button
          className="w-full md:w-auto p-2.5 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
          onClick={() =>
            onFilterChange?.({
              start: start || undefined,
              end: end || undefined,
              status: (status as AlertStatus) || undefined
            })
          }
        >
          Apply Filters
        </button>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 p-0 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs text-gray-400 bg-gray-900/50 uppercase">
              <tr>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Helmet ID</th>
                <th className="p-4">Peak G-Force</th>
                <th className="p-4">Location</th>
                <th className="p-4">Resolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {events.map((a) => (
                <tr key={a.id} className="hover:bg-gray-700/30 transition">
                  <td className="p-4 text-sm">{formatDate(a.timestamp)}</td>
                  <td className="p-4 text-sm font-mono text-gray-400">{a.helmet_id}</td>
                  <td className="p-4 text-sm text-white">{a.gforce_reading ?? "—"}</td>
                  <td className="p-4 text-sm text-gray-400">{a.latitude && a.longitude ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}` : "—"}</td>
                  <td className="p-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                        a.alert_status === 'CONFIRMED' ? 'text-red-400 bg-red-900/20' : 'text-yellow-400 bg-yellow-900/20'
                    }`}>
                        {a.alert_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-700 text-center">
          <button className="text-sm text-indigo-400 hover:text-indigo-300 transition" onClick={() => fetchMore?.()}>
            Load older records
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// --- MAIN APP ---

const MainApp: NextPage = () => {
  const { route, push } = useHashRoute();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [helmet, setHelmet] = useState<Helmet | null>(null);
  const [events, setEvents] = useState<AccidentEvent[]>([]);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mobile sidebar state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("fyp_token") : null
  );

  const stats = useMemo(
    () => ({
      totalAccidents: events.length,
      totalTrips: trips.length || 12 
    }),
    [events, trips]
  );

  // AUTH HANDLERS
  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem("fyp_token", newToken);
    setToken(newToken);
    push("/dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("fyp_token");
    setToken(null);
    setUser(null);
    push("/login");
  };

  // INITIAL DATA LOAD
  useEffect(() => {
    if (!token) {
        // If not logged in and trying to access protected routes, force login
        if (route !== "/login" && route !== "/register") {
            push("/login");
        }
        return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // 1. Fetch User Profile
        const r = await axios.get(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (cancelled) return;
        setUser(r.data);

        // 2. Fetch Helmet/Accident Data
        try {
            const [hR, eR] = await Promise.allSettled([
                axios.get(`${API_BASE}/api/helmets/my`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_BASE}/api/accidents`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            
            if (hR.status === "fulfilled") setHelmet(hR.value.data || null);
            if (eR.status === "fulfilled") setEvents(eR.value.data || []);
        } catch (dataErr) {
            console.warn("Could not fetch helmet data (might be new user)", dataErr);
        }

      } catch (err: any) {
        console.error("Auth check failed", err);
        // If 401, token is invalid
        if (err.response?.status === 401) {
            handleLogout();
        } else {
            setError("Could not connect to backend. Data may be incomplete.");
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]); 
  // Dependency on 'token' ensures re-run on login

  const fetchFiltered = async (opts: any) => { console.log("Filtering:", opts); };
  const fetchMore = async () => { console.log("Fetching more..."); };

  // --- RENDER AUTH SCREENS ---
  if (route === "/login") {
      return <LoginView onLoginSuccess={handleLoginSuccess} onGoRegister={() => push("/register")} />;
  }
  if (route === "/register") {
      return <RegisterView onRegisterSuccess={handleLoginSuccess} onGoLogin={() => push("/login")} />;
  }

  // --- RENDER DASHBOARD ---
  return (
    <>
      <Head>
        <title>Smart Helmet | Phase 4 Analytics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className="min-h-screen flex bg-[#0b1220] text-gray-100 font-sans selection:bg-indigo-500/30">
        
        <Sidebar 
            onNavigate={push} 
            route={route} 
            isOpen={mobileMenuOpen} 
            closeMobile={() => setMobileMenuOpen(false)} 
            onLogout={handleLogout}
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
                    {route === '/dashboard' && 'Overview'}
                    {route === '/live' && 'Live Telemetry'}
                    {route === '/analysis' && 'Data Analytics'}
                    {route === '/history' && 'Accident Logs'}
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
                <AnimatePresence mode="wait">
                    {loading && (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
                        <div className="bg-indigo-900/20 text-indigo-200 p-3 rounded flex items-center gap-3">
                        <LoadingSpinner /> System Initializing...
                        </div>
                    </motion.div>
                    )}

                    {error && (
                    <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
                        <ErrorBox error={error} onRetry={() => window.location.reload()} />
                    </motion.div>
                    )}

                    <motion.main key={route} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                        {route === "/dashboard" && (
                            <DashboardView user={user ?? null} helmet={helmet} recentAlerts={events.slice(0, 5)} stats={stats} />
                        )}
                        {route === "/live" && <LiveView helmet={helmet} />}
                        {route === "/analysis" && <AnalysisView />}
                        {route === "/history" && <HistoryView events={events} onFilterChange={fetchFiltered} fetchMore={fetchMore} />}
                    </motion.main>
                </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default MainApp;

