import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { XCircle } from 'lucide-react';
import LoadingSpinner from '../ui/LoadingSpinner';

interface RegisterViewProps {
  onRegister: (userData: { email: string; password: string; first_name: string; last_name: string }) => void;
  onGoLogin: () => void;
  loading?: boolean;
  error?: string;
}

const RegisterView: React.FC<RegisterViewProps> = ({ onRegister, onGoLogin, loading = false, error }) => {
  const [formData, setFormData] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    onRegister(formData);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b1220] p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400">Join the Smart Helmet safety network</p>
        </div>

        {(error || localError) && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-200 text-sm rounded flex items-center gap-2">
            <XCircle size={16} /> {error || localError}
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
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Last Name</label>
              <input
                type="text" required
                value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                disabled={loading}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
            <input
              type="email" required
              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
            <input
              type="password" required
              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Min 8 chars"
              disabled={loading}
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
          <button
            onClick={onGoLogin}
            className="text-indigo-400 hover:text-indigo-300 font-medium"
            disabled={loading}
          >
            Login here
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterView;