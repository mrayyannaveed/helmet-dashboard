import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Activity, Zap } from 'lucide-react';
import { Helmet } from '../../types';

interface LiveViewProps {
  helmet?: Helmet | null;
}

interface SensorData {
  accel: { x: number; y: number; z: number };
  gyro: { x: number; y: number; z: number };
  speed: number;
  temp: number;
}

const LiveView: React.FC<LiveViewProps> = ({ helmet }) => {
  const [data, setData] = useState<SensorData>({
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

export default LiveView;