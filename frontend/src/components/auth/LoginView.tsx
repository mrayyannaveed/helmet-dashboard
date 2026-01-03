import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { XCircle, ChevronRight, Mail, Lock } from 'lucide-react';
import LoadingSpinner from '../ui/LoadingSpinner';

interface LoginViewProps {
  onLogin: (email: string, password: string) => void;
  onGoRegister: () => void;
  loading?: boolean;
  error?: string;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onGoRegister, loading = false, error }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    onLogin(email, password);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b1220] p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to access your Smart Helmet Dashboard</p>
        </div>

        {(error || localError) && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-200 text-sm rounded flex items-center gap-2">
            <XCircle size={16} /> {error || localError}
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
                disabled={loading}
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
                disabled={loading}
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
          <button
            onClick={onGoRegister}
            className="text-indigo-400 hover:text-indigo-300 font-medium"
            disabled={loading}
          >
            Register here
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginView;