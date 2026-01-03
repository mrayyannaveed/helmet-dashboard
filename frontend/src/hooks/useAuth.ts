import { useState, useEffect } from 'react';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { User } from '../types';

// Define API_BASE with fallback and validation
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

if (!process.env.NEXT_PUBLIC_API_BASE) {
  console.warn("NEXT_PUBLIC_API_BASE is not set. Using default: http://localhost:8000");
}

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

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem('fyp_token');
      // Optionally redirect to login
    }
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

export const useAuth = () => {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Initialize token from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('fyp_token');
    if (storedToken) {
      setToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch user profile when token is available
  useEffect(() => {
    if (!token) {
      if (loading) setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchUserProfile = async () => {
      try {
        const response = await makeApiCall({ method: 'GET', url: '/api/auth/me' });
        if (!cancelled) {
          setUser(response.data);
        }
      } catch (err: any) {
        console.error('Auth check failed', err);

        if (err.message?.includes('Could not connect to backend server')) {
          setError(err.message);
        } else if (err.response?.status === 401) {
          // Token is invalid, clear it
          localStorage.removeItem('fyp_token');
          setToken(null);
          setUser(null);
        } else {
          setError(err.response?.data?.detail || 'Failed to fetch user profile');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchUserProfile();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", password);

      const response = await makeApiCall({ method: 'POST', url: '/api/auth/login', data: formData });
      const newToken = response.data.access_token;

      localStorage.setItem('fyp_token', newToken);
      setToken(newToken);

      // Fetch user profile after successful login
      const userResponse = await makeApiCall({ method: 'GET', url: '/api/auth/me' });
      setUser(userResponse.data);

      return { success: true };
    } catch (err: any) {
      console.error('Login failed', err);

      const errorMessage = err.message || err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: { email: string; password: string; first_name?: string; last_name?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);

      const response = await makeApiCall({ method: 'POST', url: '/api/auth/register', data: userData });
      const newToken = response.data.access_token;

      localStorage.setItem('fyp_token', newToken);
      setToken(newToken);

      // Fetch user profile after successful registration
      const userResponse = await makeApiCall({ method: 'GET', url: '/api/auth/me' });
      setUser(userResponse.data);

      return { success: true };
    } catch (err: any) {
      console.error('Registration failed', err);

      const errorMessage = err.message || err.response?.data?.detail || 'Registration failed.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('fyp_token');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token && user !== undefined;

  return {
    user,
    loading,
    error,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    refetchUser: () => {
      // This will trigger the useEffect to refetch user data
      if (token) {
        setUser(undefined);
      }
    }
  };
};