'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Search, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { User as UserType } from '@/types';

interface DashboardLayoutProps {
  children: ReactNode;
  projectName?: string;
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
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    const getUserInfo = async () => {
      try {
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
      name: 'DASHBOARD',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: pathname === '/dashboard'
    },
    {
      name: 'SEARCH',
      href: '/dashboard/search',
      icon: Search,
      current: pathname.startsWith('/dashboard/search')
    },
    {
      name: 'SETTINGS',
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
      localStorage.removeItem('access_token');
      router.push('/');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r-4 border-[#0A0A0A] transform transition-transform duration-200 lg:translate-x-0 lg:relative
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b-4 border-[#0A0A0A]">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#39FF14] border-2 border-[#0A0A0A] flex items-center justify-center font-black text-[#0A0A0A]">
                C
              </div>
              <span className="font-black text-xl text-[#0A0A0A] uppercase">COWRITE.AI</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-[#0A0A0A] hover:text-[#39FF14]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const NavItem = () => (
                <div
                  className={`
                    group flex items-center px-4 py-3 text-sm font-mono font-bold uppercase transition-all duration-100 cursor-pointer
                    ${item.current
                      ? 'bg-[#39FF14] text-[#0A0A0A] border-4 border-[#0A0A0A]'
                      : 'text-[#0A0A0A] border-4 border-transparent hover:border-[#0A0A0A] hover:bg-gray-100'
                    }
                  `}
                  style={item.current ? { boxShadow: '4px 4px 0 0 #0A0A0A' } : {}}
                >
                  <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span>{item.name}</span>
                </div>
              );
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                >
                  <NavItem />
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t-4 border-[#0A0A0A] p-4">
            <div className="flex items-center space-x-3 mb-4 p-3 border-2 border-[#0A0A0A] bg-gray-50">
              <div className="w-10 h-10 bg-[#FF073A] border-2 border-[#0A0A0A] flex items-center justify-center font-black text-white text-lg">
                {user?.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono font-bold text-[#0A0A0A] truncate uppercase">
                  {user?.email}
                </p>
                <p className="text-xs font-mono text-gray-600 uppercase">
                  {user?.role || 'USER'}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-start px-4 py-3 text-sm font-mono font-bold uppercase text-[#FF073A] border-4 border-[#FF073A] hover:bg-[#FF073A] hover:text-white hover:shadow-none transition-all duration-100"
              style={{ boxShadow: '4px 4px 0 0 #FF073A' }}
            >
              <LogOut className="w-4 h-4 mr-3" />
              SIGN OUT
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-30 border-b-4 border-white px-4 py-3 lg:px-8 bg-[#0A0A0A]">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-[#39FF14] hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex-1 lg:flex-none">
              <p className="font-mono text-sm text-[#39FF14] uppercase">
                {pathname === '/dashboard' && 'DASHBOARD'}
                {pathname.startsWith('/dashboard/search') && 'SEARCH'}
                {pathname.startsWith('/dashboard/settings') && 'SETTINGS'}
                {pathname.startsWith('/dashboard/projects') && 'PROJECT'}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="hidden sm:block font-mono text-xs text-gray-500 uppercase">
                {user?.email?.split('@')[0]}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
