import Link from 'next/link';
import { AlertTriangle, ArrowLeft, FolderOpen, Search, LayoutDashboard, Settings } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function DashboardNotFound() {
  const suggestedRoutes = [
    {
      name: 'Dashboard Home',
      href: '/dashboard',
      icon: LayoutDashboard,
      description: 'Return to your main dashboard'
    },
    {
      name: 'Projects',
      href: '/dashboard/projects',
      icon: FolderOpen,
      description: 'View and manage your projects'
    },
    {
      name: 'Search',
      href: '/dashboard/search',
      icon: Search,
      description: 'Search across all your content'
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      description: 'Manage your account settings'
    }
  ];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-lg w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8">
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
              The dashboard page you're looking for doesn't exist or has been moved.
            </p>

            <button
              onClick={() => window.history.back()}
              className="w-full px-4 py-2 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50 transition-colors flex items-center justify-center mb-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Go Back
            </button>

            {/* Navigation Suggestions */}
            <div className="border-t border-secondary-200 pt-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                Available Pages:
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
        </div>
      </div>
    </DashboardLayout>
  );
}