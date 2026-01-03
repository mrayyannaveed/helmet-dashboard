'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import LiveView from '../../components/dashboard/LiveView';
import ErrorBox from '../../components/ui/ErrorBox';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useHelmetData } from '../../hooks/useHelmetData';

const LivePage = () => {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, error: authError } = useAuth();
  const { helmet, loading: dataLoading, error: dataError, fetchHelmetData } = useHelmetData();

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      router.push('/login');
    } else if (isAuthenticated) {
      fetchHelmetData();
    }
  }, [isAuthenticated, authLoading, router, fetchHelmetData]);

  if (authLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b1220]">
        <div className="flex items-center gap-3 text-white">
          <LoadingSpinner size={24} />
          <span>Loading live data...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirect effect will handle this
  }

  return (
    <DashboardLayout currentRoute="/live">
      <div className="space-y-6">
        {(authError || dataError) && (
          <ErrorBox
            error={authError || dataError || ''}
            onRetry={() => {
              if (authError) {
                // Try to refetch user
                useAuth().refetchUser();
              } else {
                fetchHelmetData();
              }
            }}
          />
        )}

        <LiveView helmet={helmet} />
      </div>
    </DashboardLayout>
  );
};

export default LivePage;