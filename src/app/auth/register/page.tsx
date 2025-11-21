'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, User, CheckCircle } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { useFormValidation } from '@/hooks/useFormValidation';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const { errors, validateForm, clearError, setError } = useFormValidation({
    name: {
      required: true,
      minLength: 2,
      maxLength: 50,
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      required: true,
      minLength: 8,
      custom: (value: string) => {
        if (!/(?=.*[a-z])/.test(value)) {
          return 'Password must contain at least one lowercase letter';
        }
        if (!/(?=.*[A-Z])/.test(value)) {
          return 'Password must contain at least one uppercase letter';
        }
        if (!/(?=.*\d)/.test(value)) {
          return 'Password must contain at least one number';
        }
        return null;
      },
    },
    confirmPassword: {
      required: true,
      custom: (value: string) => {
        if (value !== formData.password) {
          return 'Passwords do not match';
        }
        return null;
      },
    },
    agreeToTerms: {
      custom: (value: boolean) => {
        if (!value) {
          return 'You must agree to the terms and conditions';
        }
        return null;
      },
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(formData)) {
      return;
    }

    setLoading(true);
    setGeneralError('');

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
        if (data.detail) {
          setGeneralError(data.detail);
        } else if (data.field_errors) {
          Object.entries(data.field_errors).forEach(([field, message]) => {
            setError(field, message as string);
          });
        } else {
          setGeneralError('Registration failed. Please try again.');
        }
        return;
      }

      // Registration successful - redirect to login with success message
      window.location.href = '/auth/login?message=Registration successful! Please sign in.';
      
    } catch (err: any) {
      console.error('Registration error:', err);
      setGeneralError('Network error. Please check your connection and try again.');
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
    
    // Clear field error when user starts typing
    if (errors[name]) {
      clearError(name);
    }
    
    // Clear general error when user makes changes
    if (generalError) {
      setGeneralError('');
    }
  };

  return (
    <AuthLayout
      title="Create Your Account"
      subtitle="Join thousands of writers using CoWriteAI"
    >
      {/* Error Message */}
      {generalError && (
        <ErrorDisplay
          error={generalError}
          type="error"
          className="mb-6"
          dismissible={true}
          onDismiss={() => setGeneralError('')}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        {/* Name Field */}
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="name"
              name="name"
              type="text"
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              className="pl-10"
              required
              autoComplete="name"
            />
          </div>
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="email"
              name="email"
              type="email"
              label="Email Address"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              className="pl-10"
              required
              autoComplete="email"
              inputMode="email"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <PasswordInput
              id="password"
              name="password"
              label="Password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              className="pl-10"
              showStrengthIndicator={true}
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              className="pl-10"
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="space-y-2">
          <div className="flex items-start space-x-3">
            <input
              id="agreeToTerms"
              name="agreeToTerms"
              type="checkbox"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className="h-4 w-4 text-primary focus:ring-primary focus:ring-2 border-input rounded mt-1 transition-colors"
            />
            <label htmlFor="agreeToTerms" className="text-sm text-muted-foreground leading-relaxed select-none cursor-pointer">
              I agree to the{' '}
              <Link href="/terms" className="text-primary hover:text-primary/80 font-medium transition-colors touch-target sm:touch-auto">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary hover:text-primary/80 font-medium transition-colors touch-target sm:touch-auto">
                Privacy Policy
              </Link>
            </label>
          </div>
          {errors.agreeToTerms && (
            <p className="text-xs text-destructive ml-7" role="alert">
              {errors.agreeToTerms}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          loading={loading}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      {/* Sign In Link */}
      <div className="mt-6 sm:mt-8 text-center">
        <p className="text-sm sm:text-base text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="text-primary hover:text-primary/80 font-medium transition-colors touch-target sm:touch-auto"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Benefits */}
      <div className="mt-6 sm:mt-8 bg-card/50 border border-border/50 rounded-xl p-4 sm:p-6 animate-fade-in delay-200">
        <h3 className="font-serif text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
          What you'll get with CoWriteAI:
        </h3>
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-muted-foreground">AI-powered character and theme extraction</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-muted-foreground">Semantic search across all your projects</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-muted-foreground">Visual relationship mapping</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-xs sm:text-sm text-muted-foreground">Secure cloud storage for your manuscripts</span>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}