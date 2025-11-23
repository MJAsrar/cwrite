'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name || formData.name.length < 2) {
      errors.name = 'NAME TOO SHORT (MIN 2 CHARS)';
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'INVALID EMAIL FORMAT';
    }

    if (!formData.password || formData.password.length < 8) {
      errors.password = 'PASSWORD TOO SHORT (MIN 8 CHARS)';
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      errors.password = 'NEEDS LOWERCASE LETTER';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      errors.password = 'NEEDS UPPERCASE LETTER';
    } else if (!/(?=.*\d)/.test(formData.password)) {
      errors.password = 'NEEDS NUMBER';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'PASSWORDS DO NOT MATCH';
    }

    if (!formData.agreeToTerms) {
      errors.agreeToTerms = 'MUST AGREE TO TERMS';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'REGISTRATION FAILED');
        return;
      }

      window.location.href = '/auth/login?message=REGISTRATION SUCCESSFUL! PLEASE SIGN IN.';
      
    } catch (err: any) {
      console.error('Registration error:', err);
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
    
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    if (error) setError('');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 py-12">
      {/* Fixed Header */}
      <Link href="/" className="fixed top-8 left-8 text-xl font-mono text-[#39FF14] border-2 border-[#39FF14] px-3 py-1 z-50 backdrop-blur-sm hover:bg-[#39FF14] hover:text-[#0A0A0A] transition-all duration-100">
        ← COWRITE.IA
      </Link>

      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="border-4 border-white bg-white p-8 md:p-10">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-black uppercase mb-2 text-[#0A0A0A]">
              REGISTER
            </h1>
            <p className="font-mono text-sm text-gray-600">
              CREATE YOUR ACCOUNT
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
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block font-mono text-xs uppercase mb-2 text-[#0A0A0A] font-bold">
                FULL NAME
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full border-4 ${fieldErrors.name ? 'border-[#FF073A]' : 'border-[#0A0A0A]'} bg-white px-4 py-3 pl-12 font-mono text-sm focus:outline-none focus:border-[#39FF14] transition-colors`}
                  placeholder="John Doe"
                  required
                  autoComplete="name"
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-1 font-mono text-xs text-[#FF073A]">{fieldErrors.name}</p>
              )}
            </div>

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
                  className={`w-full border-4 ${fieldErrors.email ? 'border-[#FF073A]' : 'border-[#0A0A0A]'} bg-white px-4 py-3 pl-12 font-mono text-sm focus:outline-none focus:border-[#39FF14] transition-colors`}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 font-mono text-xs text-[#FF073A]">{fieldErrors.email}</p>
              )}
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
                  className={`w-full border-4 ${fieldErrors.password ? 'border-[#FF073A]' : 'border-[#0A0A0A]'} bg-white px-4 py-3 pl-12 font-mono text-sm focus:outline-none focus:border-[#39FF14] transition-colors`}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
              </div>
              {fieldErrors.password && (
                <p className="mt-1 font-mono text-xs text-[#FF073A]">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block font-mono text-xs uppercase mb-2 text-[#0A0A0A] font-bold">
                CONFIRM PASSWORD
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full border-4 ${fieldErrors.confirmPassword ? 'border-[#FF073A]' : 'border-[#0A0A0A]'} bg-white px-4 py-3 pl-12 font-mono text-sm focus:outline-none focus:border-[#39FF14] transition-colors`}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 font-mono text-xs text-[#FF073A]">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Terms Checkbox */}
            <div>
              <div className="flex items-start gap-3">
                <input
                  id="agreeToTerms"
                  name="agreeToTerms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className="w-4 h-4 border-2 border-[#0A0A0A] mt-1"
                />
                <label htmlFor="agreeToTerms" className="font-mono text-xs text-gray-600 leading-relaxed">
                  I AGREE TO THE{' '}
                  <Link href="/terms" className="text-[#0A0A0A] hover:text-[#39FF14] font-bold transition-colors uppercase">
                    TERMS
                  </Link>{' '}
                  AND{' '}
                  <Link href="/privacy" className="text-[#0A0A0A] hover:text-[#39FF14] font-bold transition-colors uppercase">
                    PRIVACY POLICY
                  </Link>
                </label>
              </div>
              {fieldErrors.agreeToTerms && (
                <p className="mt-1 font-mono text-xs text-[#FF073A]">{fieldErrors.agreeToTerms}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full border-4 border-[#FF073A] bg-transparent text-[#FF073A] font-mono px-6 py-4 text-sm uppercase font-bold cursor-pointer transition-all duration-100 hover:bg-[#FF073A] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ boxShadow: '6px 6px 0 0 #FF073A' }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.boxShadow = '0 0 0 0 #FF073A')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.boxShadow = '6px 6px 0 0 #FF073A')}
            >
              {loading ? 'CREATING ACCOUNT...' : (
                <>
                  CREATE ACCOUNT <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-8 pt-6 border-t-4 border-[#0A0A0A]">
            <p className="font-mono text-xs text-center text-gray-600">
              HAVE AN ACCOUNT?{' '}
              <Link
                href="/auth/login"
                className="text-[#0A0A0A] hover:text-[#39FF14] font-bold transition-colors uppercase"
              >
                LOGIN HERE →
              </Link>
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-6 border-4 border-[#39FF14] bg-[#39FF14]/10 p-6">
          <h3 className="font-mono text-xs uppercase font-bold text-[#39FF14] mb-4">
            WHAT YOU GET:
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#39FF14] flex-shrink-0" />
              <span className="font-mono text-xs text-gray-300">AI ENTITY EXTRACTION</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#39FF14] flex-shrink-0" />
              <span className="font-mono text-xs text-gray-300">SEMANTIC SEARCH</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#39FF14] flex-shrink-0" />
              <span className="font-mono text-xs text-gray-300">RELATIONSHIP MAPPING</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#39FF14] flex-shrink-0" />
              <span className="font-mono text-xs text-gray-300">SECURE CLOUD STORAGE</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="font-mono text-xs text-gray-500">
            FREE 14-DAY TRIAL / NO CREDIT CARD
          </p>
        </div>
      </div>
    </div>
  );
}
