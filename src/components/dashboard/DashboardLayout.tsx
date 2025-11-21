'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Search, 
  Settings, 
  User, 
  LogOut,
  Menu,
  X,
  BookOpen,
  Bell,
  ChevronDown,
  Command,
  Plus
} from 'lucide-react';
import { User as UserType } from '@/types';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import ThemeToggle from '@/components/ui/ThemeToggle';
import Button from '@/components/ui/Button';

interface DashboardLayoutProps {
  children: ReactNode;
  projectName?: string; // For dynamic breadcrumb labels
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  current?: boolean;
}

export default function DashboardLayout({ children, projectName }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // Initialize with a placeholder to avoid SSR issues during build
  const [user, setUser] = useState<UserType | null>({ 
    id: '', 
    email: 'Loading...', 
    role: 'user', 
    created_at: '', 
    email_verified: false 
  });
  const breadcrumbs = useBreadcrumbs(projectName);

  // Get user info from API (assuming auth is already verified by ProtectedRoute)
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined') return;
        
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to get user info:', error);
      }
    };

    getUserInfo();
  }, []);

  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: pathname === '/dashboard'
    },
    {
      name: 'Projects',
      href: '/dashboard/projects',
      icon: FolderOpen,
      current: pathname.startsWith('/dashboard/projects')
    },
    {
      name: 'Search',
      href: '/dashboard/search',
      icon: Search,
      current: pathname.startsWith('/dashboard/search')
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      current: pathname.startsWith('/dashboard/settings')
    }
  ];

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Clear token and redirect
      localStorage.removeItem('access_token');
      router.push('/');
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Enhanced Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden touch-manipulation animate-fade-in"
          onClick={() => setSidebarOpen(false)}
          onTouchStart={() => setSidebarOpen(false)}
        />
      )}

      {/* Enhanced Sidebar */}
      <div 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-card/95 backdrop-blur-xl border-r border-border shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:bg-card lg:backdrop-blur-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        onTouchStart={(e) => {
          // Store initial touch position for swipe detection
          const touch = e.touches[0];
          e.currentTarget.setAttribute('data-touch-start-x', touch.clientX.toString());
        }}
        onTouchMove={(e) => {
          // Prevent scrolling when swiping
          if (sidebarOpen) {
            const startX = parseFloat(e.currentTarget.getAttribute('data-touch-start-x') || '0');
            const currentX = e.touches[0].clientX;
            const diff = startX - currentX;
            
            // If swiping left significantly, close sidebar
            if (diff > 50) {
              setSidebarOpen(false);
            }
          }
        }}
      >
        <div className="flex flex-col h-full">
          {/* Enhanced Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-border">
            <Link href="/dashboard" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-serif text-xl font-bold text-foreground">CoWriteAI</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Enhanced Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 touch-manipulation
                  ${item.current
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 transition-transform group-hover:scale-110 ${item.current ? 'text-primary-foreground' : ''}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* Enhanced User section */}
          <div className="border-t border-border p-4">
            <div className="flex items-center space-x-3 mb-4 p-3 rounded-xl bg-muted/50">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role || 'User'}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Enhanced Top bar with backdrop blur */}
        <div className="sticky top-0 z-30 backdrop-blur-subtle border-b border-border/40 px-4 py-2 lg:px-8 bg-background/95">
          <div className="flex items-center justify-between h-10">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden -ml-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-accent h-9 w-9"
              >
                <Menu className="w-5 h-5" />
              </Button>
              
              {/* Breadcrumbs - responsive */}
              {breadcrumbs.length > 0 && (
                <div className="min-w-0 flex-1">
                  <Breadcrumb 
                    items={breadcrumbs} 
                    className="flex"
                  />
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2 ml-4">
              {/* Quick actions */}
              <Button
                variant="outline"
                size="icon"
                className="hidden sm:flex rounded-xl h-9 w-9"
              >
                <Plus className="h-4 w-4" />
              </Button>
              
              {/* Notifications */}
              <Button
                variant="outline"
                size="icon"
                className="relative rounded-xl h-9 w-9"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center">
                  2
                </span>
              </Button>
              
              {/* Theme toggle */}
              <ThemeToggle />
              
              {/* User menu */}
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 h-9 px-3 rounded-xl"
                >
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="hidden sm:block text-sm font-medium truncate max-w-24">
                    {user?.email?.split('@')[0]}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>

                {/* Enhanced User Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-2xl shadow-lg z-50 animate-scale-in">
                      <div className="p-4 border-b border-border">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-primary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {user?.email}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {user?.role || 'User'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-2">
                        <Link
                          href="/dashboard/settings"
                          className="flex items-center px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground rounded-xl transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4 mr-3" />
                          Settings
                        </Link>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setUserMenuOpen(false);
                            handleLogout();
                          }}
                          className="w-full justify-start px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-xl"
                        >
                          <LogOut className="w-4 h-4 mr-3" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Page content */}
        <main className="flex-1 px-4 py-3 lg:px-8 lg:py-4">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}