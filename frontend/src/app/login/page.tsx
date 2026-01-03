'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import LoginView from '../../components/auth/LoginView';

const LoginPage = () => {
  const router = useRouter();
  const { login, loading: authLoading, error: authError } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    setLoginError(null);
    const result = await login(email, password);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setLoginError(result.error || 'Login failed');
    }
  };

  // If user is already authenticated, redirect to dashboard
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('fyp_token');
    if (token) {
      router.push('/dashboard');
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#0b1220]">
          <div className="text-white">Redirecting...</div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1220]">
      <LoginView
        onLogin={handleLogin}
        onGoRegister={() => router.push('/register')}
        loading={authLoading}
        error={authError || loginError}
      />
    </div>
  );
};

export default LoginPage;