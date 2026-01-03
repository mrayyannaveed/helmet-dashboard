import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { User, Helmet, AccidentEvent } from '../../types';

interface DashboardViewProps {
  user?: User | null;
  helmet?: Helmet | null;
  recentAlerts: AccidentEvent[];
  stats: { totalAccidents: number; totalTrips: number };
}

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
};

const DashboardView: React.FC<DashboardViewProps> = ({ user, helmet, recentAlerts, stats }) => {
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

export default DashboardView;