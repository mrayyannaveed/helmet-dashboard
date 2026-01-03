import React from 'react';
import { motion } from 'framer-motion';
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
} from 'recharts';

const COLORS = ["#6366f1", "#10b981", "#ef4444", "#f59e0b"];

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

export default AnalysisView;