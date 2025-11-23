'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowRight } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      setSuccessMessage(message);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('ALL FIELDS REQUIRED');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'INVALID CREDENTIALS');
        return;
      }

      if (data.tokens && data.tokens.access_token) {
        localStorage.setItem('access_token', data.tokens.access_token);
        if (data.tokens.refresh_token) {
          localStorage.setItem('refresh_token', data.tokens.refresh_token);
        }
      }
      
      window.location.href = '/dashboard';
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError('NETWORK ERROR / CHECK CONNECTION');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    if (error) setError('');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      {/* Fixed Header */}
      <Link href="/" className="fixed top-8 left-8 text-xl font-mono text-[#39FF14] border-2 border-[#39FF14] px-3 py-1 z-50 backdrop-blur-sm hover:bg-[#39FF14] hover:text-[#0A0A0A] transition-all duration-100">
        ← COWRITE.IA
      </Link>

      <div className="w-full max-w-md">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 border-4 border-[#39FF14] bg-[#39FF14]/10 p-4">
            <p className="font-mono text-sm text-[#39FF14] uppercase">
              ✓ {successMessage}
            </p>
          </div>
        )}

        {/* Main Card */}
        <div className="border-4 border-white bg-white p-8 md:p-10">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-black uppercase mb-2 text-[#0A0A0A]">
              LOGIN
            </h1>
            <p className="font-mono text-sm text-gray-600">
              ACCESS YOUR ACCOUNT
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 border-4 border-[#FF073A] bg-[#FF073A]/10 p-4">
              <p className="font-mono text-sm text-[#FF073A] uppercase">
                ✗ {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block font-mono text-xs uppercase mb-2 text-[#0A0A0A] font-bold">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border-4 border-[#0A0A0A] bg-white px-4 py-3 pl-12 font-mono text-sm focus:outline-none focus:border-[#39FF14] transition-colors"
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block font-mono text-xs uppercase mb-2 text-[#0A0A0A] font-bold">
                PASSWORD
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full border-4 border-[#0A0A0A] bg-white px-4 py-3 pl-12 font-mono text-sm focus:outline-none focus:border-[#39FF14] transition-colors"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 border-2 border-[#0A0A0A]"
                />
                <label htmlFor="rememberMe" className="font-mono text-xs uppercase text-gray-600">
                  REMEMBER
                </label>
              </div>
              <Link
                href="/auth/forgot-password"
                className="font-mono text-xs uppercase text-[#0A0A0A] hover:text-[#39FF14] transition-colors"
              >
                FORGOT?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full border-4 border-[#39FF14] bg-transparent text-[#39FF14] font-mono px-6 py-4 text-sm uppercase font-bold cursor-pointer transition-all duration-100 hover:bg-[#39FF14] hover:text-[#0A0A0A] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ boxShadow: '6px 6px 0 0 #39FF14' }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.boxShadow = '0 0 0 0 #39FF14')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.boxShadow = '6px 6px 0 0 #39FF14')}
            >
              {loading ? 'AUTHENTICATING...' : (
                <>
                  LOGIN <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 pt-6 border-t-4 border-[#0A0A0A]">
            <p className="font-mono text-xs text-center text-gray-600">
              NO ACCOUNT?{' '}
              <Link
                href="/auth/register"
                className="text-[#0A0A0A] hover:text-[#FF073A] font-bold transition-colors uppercase"
              >
                REGISTER HERE →
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="font-mono text-xs text-gray-500">
            SECURE / ENCRYPTED / PRIVATE
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="border-4 border-[#39FF14] p-8">
          <p className="font-mono text-[#39FF14] uppercase">LOADING...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
