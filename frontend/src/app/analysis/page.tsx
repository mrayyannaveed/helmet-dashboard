'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import AnalysisView from '../../components/dashboard/AnalysisView';
import ErrorBox from '../../components/ui/ErrorBox';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DashboardLayout from '../../components/layout/DashboardLayout';

const AnalysisPage = () => {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, error: authError } = useAuth();

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b1220]">
        <div className="flex items-center gap-3 text-white">
          <LoadingSpinner size={24} />
          <span>Loading analysis...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirect effect will handle this
  }

  return (
    <DashboardLayout currentRoute="/analysis">
      <div className="space-y-6">
        {authError && (
          <ErrorBox
            error={authError || ''}
            onRetry={() => {
              // Try to refetch user
              useAuth().refetchUser();
            }}
          />
        )}

        <AnalysisView />
      </div>
    </DashboardLayout>
  );
};

export default AnalysisPage;