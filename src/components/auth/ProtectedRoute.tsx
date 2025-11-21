'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { api } from '@/lib/api';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth/login' 
}: ProtectedRouteProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!requireAuth) {
          setLoading(false);
          setAuthChecked(true);
          return;
        }

        // Get token from localStorage
        const token = localStorage.getItem('access_token');
        if (!token) {
          console.log('No access token found, redirecting to login');
          setAuthChecked(true);
          router.push(redirectTo);
          return;
        }

        console.log('Verifying token with backend...');
        console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
        console.log('Token preview:', token.substring(0, 20) + '...');
        
        // Use the API client which handles token properly
        const userData = await api.get<User>('/api/v1/auth/me');
        console.log('Token verified successfully:', userData);
        setUser(userData);
        setAuthChecked(true);
      } catch (error: any) {
        console.error('Auth check failed:', error);
        if (requireAuth) {
          // Clear token and redirect on auth failure
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setAuthChecked(true);
          router.push(redirectTo);
        }
      } finally {
        setLoading(false);
      }
    };

    // Only run auth check once
    if (!authChecked) {
      checkAuth();
    }
  }, [router, requireAuth, redirectTo, authChecked]);

  // Show loading while checking auth
  if (loading || !authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // If auth is required but user is not authenticated, don't render anything
  // (redirect will happen in useEffect)
  if (requireAuth && !user) {
    return null;
  }

  return children as JSX.Element;
}