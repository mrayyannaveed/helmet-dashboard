// pages/index.tsx
/* Single-file Next.js TypeScript SPA implementing /dashboard /live /history views
   Put this file at pages/index.tsx in a standard Next.js + TypeScript project.
   Requirements:
     - tailwindcss configured (see Next/Tailwind docs)
     - framer-motion installed
     - lucide-react installed for icons
   This file uses client-side hash routing (#/dashboard, #/live, #/history).
*/
"use client"
import React, { useEffect, useState, useMemo } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Bell,
  MapPin,
  Activity,
  User,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

function useHashRoute() {
  const [route, setRoute] = useState<string>(
    typeof window !== "undefined" ? window.location.hash.slice(1) || "/dashboard" : "/dashboard"
  );
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1) || "/dashboard");
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

function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.15" fill="none"/>
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

const Sidebar: React.FC<{ onNavigate: (r: string) => void; route: string }> = ({ onNavigate, route }) => {
  const items = [
    { icon: Activity, label: "Dashboard", route: "/dashboard" },
    { icon: MapPin, label: "Live", route: "/live" },
    { icon: Menu, label: "History", route: "/history" }
  ];
  return (
    <aside className="w-72 min-w-[220px] bg-gray-900 text-gray-100 p-4 hidden md:block">
      <div className="text-2xl font-semibold mb-6">Smart Helmet</div>
      <nav className="space-y-2">
        {items.map((it) => {
          const Icon = it.icon;
          const active = route === it.route;
          return (
            <button
              key={it.route}
              onClick={() => onNavigate(it.route)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition ${
                active ? "bg-gray-800 ring-1 ring-indigo-500" : "hover:bg-gray-800/60"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

const ErrorBox: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="bg-red-900/70 text-red-100 p-3 rounded">
    <div className="flex justify-between items-center gap-4">
      <div>{error}</div>
      {onRetry && (
        <button onClick={onRetry} className="text-sm underline">
          Retry
        </button>
      )}
    </div>
  </div>
);

const DashboardView: React.FC<{
  user?: User | null;
  helmet?: Helmet | null;
  recentAlerts: AccidentEvent[];
  stats: { totalAccidents: number; totalTrips: number };
}> = ({ user, helmet, recentAlerts, stats }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div whileHover={{ y: -4 }} className="bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-300">Rider Status</div>
              <div className="text-lg font-semibold">{user?.first_name || user?.email || "Rider"}</div>
            </div>
            <div className="text-right">
              <div className={`text-sm ${helmet?.last_seen ? "text-green-400" : "text-yellow-300"}`}>
                {helmet?.last_seen ? "Connected" : "Disconnected"}
              </div>
              <div className="text-xs text-gray-400">{helmet?.serial_number || "—"}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400">Battery</div>
              <div className="text-sm">—%</div>
            </div>
            <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
              <div className="h-2 bg-indigo-500" style={{ width: "60%" }} />
            </div>
            <div className="text-xs text-gray-400">Last Trip</div>
            <div className="text-sm">{helmet?.last_seen ? formatDate(helmet.last_seen) : "No trips yet"}</div>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-300">Accident Summary</div>
          <div className="mt-3 flex items-center gap-6">
            <div>
              <div className="text-2xl font-semibold">{stats.totalAccidents}</div>
              <div className="text-xs text-gray-400">Total Accidents</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{stats.totalTrips}</div>
              <div className="text-xs text-gray-400">Total Trips</div>
            </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-300">Quick Actions</div>
          <div className="mt-3 space-y-2">
            <button className="w-full p-2 rounded bg-indigo-600 hover:bg-indigo-500">Acknowledge Last Alert</button>
            <button className="w-full p-2 rounded border border-gray-700">View Full History</button>
          </div>
        </motion.div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-300">Recent Alerts</div>
          <div className="text-xs text-gray-400">5 most recent</div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left">
            <thead className="text-xs text-gray-400">
              <tr>
                <th className="p-2">Time</th>
                <th className="p-2">G-Force</th>
                <th className="p-2">Location</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentAlerts.map((a) => (
                <motion.tr
                  key={a.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-t border-gray-700"
                >
                  <td className="p-2 text-sm">{formatDate(a.timestamp)}</td>
                  <td className="p-2 text-sm">{a.gforce_reading ?? "—"}</td>
                  <td className="p-2 text-sm">
                    {a.latitude && a.longitude ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}` : "—"}
                  </td>
                  <td className="p-2 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        a.alert_status === "PENDING"
                          ? "bg-yellow-600 text-yellow-50"
                          : a.alert_status === "CONFIRMED"
                          ? "bg-green-700 text-green-50"
                          : "bg-gray-700 text-gray-200"
                      }`}
                    >
                      {a.alert_status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

const LiveView: React.FC<{ helmet?: Helmet | null }> = ({ helmet }) => {
  // local mock state: speed, gforce, on/off
  const [speed, setSpeed] = useState<number>(0);
  const [gforce, setGforce] = useState<number>(0);
  const [on, setOn] = useState<boolean>(true);
  // polling
  useEffect(() => {
    const t = setInterval(() => {
      setSpeed((s) => Math.max(0, Math.min(120, s + (Math.random() - 0.4) * 6)));
      setGforce(() => +(Math.random() * 6).toFixed(2));
    }, 1500);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-sm text-gray-300">Map (simulated)</div>
          <div className="mt-3 h-64 bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg flex items-center justify-center">
            <svg width="320" height="200" viewBox="0 0 320 200" className="max-w-full">
              <rect width="320" height="200" fill="#0f1724" rx="8" />
              <circle cx={160 + Math.sin(Date.now() / 2000) * 60} cy={100 + Math.cos(Date.now() / 1800) * 20} r="8" fill="#7c3aed"/>
            </svg>
          </div>
          <div className="mt-3 text-xs text-gray-400">Last known: {helmet?.last_seen ? formatDate(helmet.last_seen) : "—"}</div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg space-y-4">
          <div className="text-sm text-gray-300">Live Sensor Data</div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-xs text-gray-400">Speed (km/h)</div>
              <div className="text-2xl font-semibold">{Math.round(speed)}</div>
            </div>
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-xs text-gray-400">G-Force</div>
              <div className="text-2xl font-semibold">{gforce.toFixed(2)}</div>
            </div>
            <div className="bg-gray-900 p-3 rounded flex flex-col items-start justify-center">
              <div className="text-xs text-gray-400">Helmet</div>
              <div className="text-lg">{on ? "On" : "Off"}</div>
              <button className="mt-2 text-xs underline" onClick={() => setOn(!on)}>
                Toggle
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-400">Sensor stream is simulated for demo.</div>
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
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="flex flex-wrap gap-2 items-center">
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="p-2 rounded bg-gray-900" />
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="p-2 rounded bg-gray-900" />
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="p-2 rounded bg-gray-900">
            <option value="">All</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
          <button
            className="ml-auto p-2 rounded bg-indigo-600"
            onClick={() =>
              onFilterChange?.({
                start: start || undefined,
                end: end || undefined,
                status: (status as AlertStatus) || undefined
              })
            }
          >
            Filter
          </button>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="text-sm text-gray-300 mb-3">Accident History</div>
        <div className="overflow-auto">
          <table className="w-full text-left">
            <thead className="text-xs text-gray-400">
              <tr>
                <th className="p-2">When</th>
                <th className="p-2">Helmet</th>
                <th className="p-2">G-Force</th>
                <th className="p-2">Location</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((a) => (
                <tr key={a.id} className="border-t border-gray-700">
                  <td className="p-2 text-sm">{formatDate(a.timestamp)}</td>
                  <td className="p-2 text-sm">{a.helmet_id}</td>
                  <td className="p-2 text-sm">{a.gforce_reading ?? "—"}</td>
                  <td className="p-2 text-sm">{a.latitude && a.longitude ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}` : "—"}</td>
                  <td className="p-2 text-sm">{a.alert_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-center">
          <button className="p-2 rounded bg-gray-700" onClick={() => fetchMore?.()}>
            Load more
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const MainApp: NextPage = () => {
  const { route, push } = useHashRoute();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [helmet, setHelmet] = useState<Helmet | null>(null);
  const [events, setEvents] = useState<AccidentEvent[]>([]);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      totalAccidents: events.length,
      totalTrips: trips.length
    }),
    [events, trips]
  );

  // Minimal auth wrapper for demo: look for token in localStorage
  const token = typeof window !== "undefined" ? localStorage.getItem("fyp_token") : null;

  useEffect(() => {
    // bootstrap: try to load user profile
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // fetch profile using token if present
        if (token) {
          const r = await axios.get(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
          if (cancelled) return;
          setUser(r.data);
        } else {
          setUser(null);
        }
        // fetch helmet, events, trips for demo
        const [hR, eR, tR] = await Promise.allSettled([
          axios.get(`${API_BASE}/api/helmets/my`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          axios.get(`${API_BASE}/api/accidents`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          axios.get(`${API_BASE}/api/data/trips`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        ]);
        if (hR.status === "fulfilled") setHelmet(hR.value.data || null);
        if (eR.status === "fulfilled") setEvents(eR.value.data || []);
        if (tR.status === "fulfilled") setTrips(tR.value.data || []);
      } catch (err: any) {
        console.error(err);
        setError("Failed to initialize data. See console for details.");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchFiltered = async (opts: { start?: string; end?: string; status?: AlertStatus | "" }) => {
    setLoading(true);
    try {
      const params: any = {};
      if (opts.start) params.start = opts.start;
      if (opts.end) params.end = opts.end;
      if (opts.status) params.status = opts.status;
      const r = await axios.get(`${API_BASE}/api/accidents`, { params, headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setEvents(r.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch filtered events");
    } finally {
      setLoading(false);
    }
  };

  const fetchMore = async () => {
    // For demo, this does a second load (in a real app, implement offset/limit)
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE}/api/accidents?limit=50`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setEvents(r.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load more events");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Smart Helmet Dashboard</title>
      </Head>
      <div className="min-h-screen flex bg-[#0b1220] text-gray-100">
        <Sidebar onNavigate={push} route={route} />
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button className="md:hidden p-2 bg-gray-900 rounded"><Menu size={16} /></button>
              <div className="text-xl font-semibold">Smart Helmet Dashboard</div>
              <div className="text-sm text-gray-400 hidden md:block">Dark. Responsive. Animated.</div>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded bg-gray-900"><Bell size={16} /></button>
              <div className="p-2 rounded bg-gray-900">{user ? `${user.first_name || user.email}` : "Guest"}</div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
                <div className="bg-gray-800 p-3 rounded flex items-center gap-3">
                  <LoadingSpinner /> Loading...
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
                <ErrorBox error={error} onRetry={() => window.location.reload()} />
              </motion.div>
            )}

            <motion.main key={route} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              {route === "/dashboard" && (
                <DashboardView user={user ?? null} helmet={helmet} recentAlerts={events.slice(0, 5)} stats={stats} />
              )}
              {route === "/live" && <LiveView helmet={helmet} />}
              {route === "/history" && <HistoryView events={events} onFilterChange={fetchFiltered} fetchMore={fetchMore} />}
              {/* default fallback */}
              {!["/dashboard", "/live", "/history"].includes(route) && (
                <div>
                  <h2>Not found</h2>
                  <button onClick={() => push("/dashboard")}>Go to dashboard</button>
                </div>
              )}
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default MainApp;
