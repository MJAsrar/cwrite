'use client';

import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw, ArrowLeft } from 'lucide-react';

interface ErrorPageProps {
  title?: string;
  message?: string;
  statusCode?: number;
  showRetry?: boolean;
  showHome?: boolean;
  showBack?: boolean;
  onRetry?: () => void;
}

export default function ErrorPage({
  title = 'Something went wrong',
  message = 'We encountered an unexpected error. Please try again or contact support if the problem persists.',
  statusCode,
  showRetry = true,
  showHome = true,
  showBack = false,
  onRetry,
}: ErrorPageProps) {
  const getStatusMessage = (code: number) => {
    switch (code) {
      case 404:
        return {
          title: 'Page Not Found',
          message: 'The page you\'re looking for doesn\'t exist or has been moved.',
        };
      case 403:
        return {
          title: 'Access Denied',
          message: 'You don\'t have permission to access this resource.',
        };
      case 500:
        return {
          title: 'Server Error',
          message: 'We\'re experiencing technical difficulties. Please try again later.',
        };
      default:
        return { title, message };
    }
  };

  const errorContent = statusCode ? getStatusMessage(statusCode) : { title, message };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          
          {statusCode && (
            <div className="text-6xl font-bold text-red-600 mb-4">
              {statusCode}
            </div>
          )}
          
          <h1 className="text-3xl font-bold text-secondary-900 mb-4">
            {errorContent.title}
          </h1>
          
          <p className="text-secondary-600 mb-8">
            {errorContent.message}
          </p>

          <div className="space-y-4">
            {showRetry && (
              <button
                onClick={onRetry || (() => window.location.reload())}
                className="w-full btn-primary flex items-center justify-center"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </button>
            )}
            
            {showHome && (
              <Link
                href="/"
                className="block w-full btn-secondary text-center"
              >
                <Home className="w-5 h-5 mr-2 inline" />
                Go Home
              </Link>
            )}

            {showBack && (
              <button
                onClick={() => window.history.back()}
                className="w-full btn-secondary flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Go Back
              </button>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-white rounded-xl border border-secondary-100 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Need Help?
          </h3>
          <div className="space-y-3 text-sm text-secondary-600">
            <p>• Check the URL for typos</p>
            <p>• Try refreshing the page</p>
            <p>• Clear your browser cache</p>
            <p>• Contact support if the issue continues</p>
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