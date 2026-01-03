'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import DashboardView from '../../components/dashboard/DashboardView';
import ErrorBox from '../../components/ui/ErrorBox';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useHelmetData } from '../../hooks/useHelmetData';

const DashboardPage = () => {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user, error: authError, logout } = useAuth();
  const { helmet, events, loading: dataLoading, error: dataError, fetchHelmetData } = useHelmetData();

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      router.push('/login');
    } else if (isAuthenticated) {
      fetchHelmetData();
    }
  }, [isAuthenticated, authLoading, router, fetchHelmetData]);

  const stats = {
    totalAccidents: events.length,
    totalTrips: 12 // This would come from the trips data in a real implementation
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b1220]">
        <div className="flex items-center gap-3 text-white">
          <LoadingSpinner size={24} />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirect effect will handle this
  }

  return (
    <DashboardLayout currentRoute="/dashboard">
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

        <DashboardView
          user={user ?? null}
          helmet={helmet}
          recentAlerts={events.slice(0, 5)}
          stats={stats}
        />
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;