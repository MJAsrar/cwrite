'use client';

import Link from 'next/link';
import { AlertTriangle, Home, ArrowLeft, FolderOpen, Search, LayoutDashboard } from 'lucide-react';

export default function NotFound() {
  const suggestedRoutes = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      description: 'Go to your main dashboard'
    },
    {
      name: 'Projects',
      href: '/dashboard/projects',
      icon: FolderOpen,
      description: 'View all your projects'
    },
    {
      name: 'Search',
      href: '/dashboard/search',
      icon: Search,
      description: 'Search across your content'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          
          <div className="text-6xl font-bold text-red-600 mb-4">
            404
          </div>
          
          <h1 className="text-3xl font-bold text-secondary-900 mb-4">
            Page Not Found
          </h1>
          
          <p className="text-secondary-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="space-y-4 mb-8">
            <button
              onClick={() => window.history.back()}
              className="w-full btn-secondary flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Go Back
            </button>
            
            <Link
              href="/"
              className="block w-full btn-primary text-center"
            >
              <Home className="w-5 h-5 mr-2 inline" />
              Go Home
            </Link>
          </div>

          {/* Navigation Suggestions */}
          <div className="border-t border-secondary-200 pt-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              Try these instead:
            </h3>
            <div className="space-y-3">
              {suggestedRoutes.map((route) => (
                <Link
                  key={route.name}
                  href={route.href}
                  className="flex items-center p-3 rounded-lg border border-secondary-200 hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                >
                  <route.icon className="w-5 h-5 text-primary-600 mr-3 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-secondary-900">{route.name}</div>
                    <div className="text-sm text-secondary-600">{route.description}</div>
                  </div>
                </Link>
              ))}
            </div>
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