'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Mail, RefreshCw } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    const emailParam = searchParams.get('email');
    
    if (emailParam) {
      setEmail(emailParam);
    }

    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
    }
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      // TODO: Implement actual email verification logic
      console.log('Verifying email with token:', token);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate different outcomes based on token
      if (token === 'expired') {
        setStatus('expired');
      } else if (token === 'invalid') {
        setStatus('error');
      } else {
        setStatus('success');
      }
    } catch (err) {
      setStatus('error');
    }
  };

  const resendVerificationEmail = async () => {
    setResending(true);
    try {
      // TODO: Implement actual resend logic
      console.log('Resending verification email to:', email);
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Show success message or redirect
    } catch (err) {
      console.error('Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-secondary-100 p-8 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
            
            <h1 className="text-3xl font-bold text-secondary-900 mb-4">
              Verifying Your Email
            </h1>
            
            <p className="text-secondary-600">
              Please wait while we verify your email address...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-secondary-100 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-secondary-900 mb-4">
              Email Verified!
            </h1>
            
            <p className="text-secondary-600 mb-8">
              Your email address has been successfully verified. You can now access all features of CoWriteAI.
            </p>

            <div className="space-y-4">
              <Link
                href="/auth/login"
                className="block w-full btn-primary text-center"
              >
                Continue to Login
              </Link>
              
              <Link
                href="/dashboard"
                className="block w-full btn-secondary text-center"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>

          {/* Welcome Benefits */}
          <div className="mt-6 bg-white rounded-xl border border-secondary-100 p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              🎉 Welcome to CoWriteAI!
            </h3>
            <div className="space-y-3 text-sm text-secondary-600">
              <p>• Upload your first manuscript to get started</p>
              <p>• Explore AI-powered character extraction</p>
              <p>• Try semantic search across your content</p>
              <p>• Discover relationships in your story world</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-secondary-100 p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-yellow-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-secondary-900 mb-4">
              Link Expired
            </h1>
            
            <p className="text-secondary-600 mb-8">
              This verification link has expired. Please request a new verification email to continue.
            </p>

            <div className="space-y-4">
              <button
                onClick={resendVerificationEmail}
                disabled={resending}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resending ? 'Sending...' : 'Send New Verification Email'}
              </button>
              
              <Link
                href="/auth/login"
                className="block w-full btn-secondary text-center"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-secondary-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-secondary-900 mb-4">
            Verification Failed
          </h1>
          
          <p className="text-secondary-600 mb-8">
            We couldn't verify your email address. The link may be invalid or expired.
          </p>

          <div className="space-y-4">
            <button
              onClick={resendVerificationEmail}
              disabled={resending}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? 'Sending...' : 'Send New Verification Email'}
            </button>
            
            <Link
              href="/auth/register"
              className="block w-full btn-secondary text-center"
            >
              Create New Account
            </Link>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-white rounded-xl border border-secondary-100 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Need Help?
          </h3>
          <div className="space-y-3 text-sm text-secondary-600">
            <p>• Make sure you're using the latest verification link</p>
            <p>• Check if the link was copied completely</p>
            <p>• Verification links expire after 24 hours</p>
          </div>
          <div className="mt-4">
            <Link
              href="/support"
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              Contact Support →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-secondary-100 p-8 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
            <h1 className="text-3xl font-bold text-secondary-900 mb-4">
              Loading...
            </h1>
            <p className="text-secondary-600">
              Please wait while we load the verification page...
            </p>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}