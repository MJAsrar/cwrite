'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';

export default function RegisterPage() {
  const router = useRouter();
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
      errors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password || formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      errors.password = 'Requires at least one lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      errors.password = 'Requires at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(formData.password)) {
      errors.password = 'Requires at least one number';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeToTerms) {
      errors.agreeToTerms = 'You must agree to the terms to continue';
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
        setError(data.detail || 'Registration failed. Please try again.');
        return;
      }

      router.push('/auth/login?message=Account created successfully! Please sign in.');

    } catch (err) {
      console.error('Registration error:', err);
      setError('Network error. Please check your connection and try again.');
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
    <AuthLayout
      title="Create an account"
      subtitle="Start your 14-day free trial. No credit card required."
    >
      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start text-red-800 animate-fade-in">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            Full name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className={`input-field pl-10 ${fieldErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              placeholder="John Doe"
              required
              autoComplete="name"
              disabled={loading}
            />
          </div>
          {fieldErrors.name && (
            <p className="text-sm font-medium text-red-500 mt-1">{fieldErrors.name}</p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className={`input-field pl-10 ${fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              placeholder="name@company.com"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>
          {fieldErrors.email && (
            <p className="text-sm font-medium text-red-500 mt-1">{fieldErrors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className={`input-field pl-10 ${fieldErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          {fieldErrors.password && (
            <p className="text-sm font-medium text-red-500 mt-1">{fieldErrors.password}</p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
            Confirm password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`input-field pl-10 ${fieldErrors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          {fieldErrors.confirmPassword && (
            <p className="text-sm font-medium text-red-500 mt-1">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        {/* Terms Checkbox */}
        <div className="pt-2 pb-1">
          <div className="flex items-start gap-3">
            <input
              id="agreeToTerms"
              name="agreeToTerms"
              type="checkbox"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
              disabled={loading}
            />
            <label htmlFor="agreeToTerms" className="text-sm text-muted-foreground leading-relaxed">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-foreground hover:text-primary font-medium hover:underline transition-colors">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-foreground hover:text-primary font-medium hover:underline transition-colors">
                Privacy Policy
              </Link>.
            </label>
          </div>
          {fieldErrors.agreeToTerms && (
            <p className="text-sm font-medium text-red-500 mt-1 pl-7">{fieldErrors.agreeToTerms}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-2"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Creating account...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              Create account <ArrowRight className="w-4 h-4" />
            </div>
          )}
        </button>
      </form>

      {/* Benefits List inside the card context */}
      <div className="mt-8 pt-6 border-t border-border">
        <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Features included</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>AI Entity Extraction & Tracking</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Semantic Story Search</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>Secure Cloud Backups</span>
          </li>
        </ul>
      </div>

      {/* Sign In Link */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="font-medium text-primary hover:underline transition-all"
        >
          Sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
