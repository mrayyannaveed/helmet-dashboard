import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertStatus, AccidentEvent } from '../../types';

interface HistoryViewProps {
  events: AccidentEvent[];
  onFilterChange?: (opts: { start?: string; end?: string; status?: AlertStatus | "" }) => void;
  fetchMore?: () => void;
}

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
};

const HistoryView: React.FC<HistoryViewProps> = ({ events, onFilterChange, fetchMore }) => {
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

export default HistoryView;