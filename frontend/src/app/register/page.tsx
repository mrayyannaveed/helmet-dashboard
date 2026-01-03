'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import RegisterView from '../../components/auth/RegisterView';

const RegisterPage = () => {
  const router = useRouter();
  const { register, loading: authLoading, error: authError } = useAuth();
  const [registerError, setRegisterError] = useState<string | null>(null);

  const handleRegister = async (userData: { email: string; password: string; first_name: string; last_name: string }) => {
    setRegisterError(null);
    const result = await register(userData);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setRegisterError(result.error || 'Registration failed');
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
      <RegisterView
        onRegister={handleRegister}
        onGoLogin={() => router.push('/login')}
        loading={authLoading}
        error={authError || registerError}
      />
    </div>
  );
};

export default RegisterPage;