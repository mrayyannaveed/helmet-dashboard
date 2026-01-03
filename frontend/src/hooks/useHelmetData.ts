import { useState, useEffect } from 'react';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { Helmet, AccidentEvent, TripData } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fyp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper function to make API calls with error handling
const makeApiCall = async (requestConfig: AxiosRequestConfig) => {
  try {
    return await apiClient(requestConfig);
  } catch (error: any) {
    // Check if it's a network error (connection refused, etc.)
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNABORTED' || error.message?.includes('Network Error')) {
      throw new Error('Could not connect to backend server. Please ensure the backend is running.');
    }
    throw error;
  }
};

export const useHelmetData = () => {
  const [helmet, setHelmet] = useState<Helmet | null>(null);
  const [events, setEvents] = useState<AccidentEvent[]>([]);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHelmetData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all helmet-related data in parallel
      const [helmetResponse, eventsResponse] = await Promise.allSettled([
        makeApiCall({ method: 'GET', url: '/api/helmets/my' }),
        makeApiCall({ method: 'GET', url: '/api/accidents' })
      ]);

      if (helmetResponse.status === 'fulfilled') {
        setHelmet(helmetResponse.value.data || null);
      } else {
        console.warn('Could not fetch helmet data', helmetResponse.reason);
        // Don't set error for helmet data since it might be a new user
      }

      if (eventsResponse.status === 'fulfilled') {
        setEvents(eventsResponse.value.data || []);
      } else {
        console.warn('Could not fetch events data', eventsResponse.reason);
        if (eventsResponse.reason.message?.includes('Could not connect to backend server')) {
          throw eventsResponse.reason;
        }
      }
    } catch (err: any) {
      console.error('Error fetching helmet data', err);

      if (err.message?.includes('Could not connect to backend server')) {
        setError(err.message);
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch helmet data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredEvents = async (filters: { start?: string; end?: string; status?: string }) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.start) params.append('start', filters.start);
      if (filters.end) params.append('end', filters.end);
      if (filters.status) params.append('status', filters.status);

      const response = await makeApiCall({ method: 'GET', url: `/api/accidents?${params.toString()}` });
      setEvents(response.data);
    } catch (err: any) {
      console.error('Error fetching filtered events', err);

      if (err.message?.includes('Could not connect to backend server')) {
        setError(err.message);
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch filtered events');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreEvents = async () => {
    // This would implement pagination in a real app
    console.log('Fetching more events...');
  };

  return {
    helmet,
    events,
    trips,
    loading,
    error,
    fetchHelmetData,
    fetchFilteredEvents,
    fetchMoreEvents
  };
};