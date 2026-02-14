'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Settings,
  LogOut,
  Menu,
  X,
  PenLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  Star,
  Trash2,
  FolderOpen,
  Bell,
  User
} from 'lucide-react';
import { User as UserType } from '@/types';

interface DashboardLayoutProps {
  children: ReactNode;
  projectName?: string;
}

function NavItem({
  icon,
  label,
  active,
  collapsed,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  href: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200
        ${active
          ? 'bg-amber-900 text-white shadow-md shadow-amber-900/20'
          : 'text-stone-600 hover:bg-stone-100 hover:text-amber-950'}
      `}
      title={collapsed ? label : undefined}
    >
      <div className="flex-shrink-0">
        {icon}
      </div>
      {!collapsed && <span className="text-sm font-medium tracking-wide">{label}</span>}
    </Link>
  );
}

export default function DashboardLayout({ children, projectName }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        if (typeof window === 'undefined') return;
        const token = localStorage.getItem('access_token');
        if (!token) return;
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
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

  // Close user menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('access_token');
      router.push('/');
    }
  };

  const userInitial = user?.email?.[0]?.toUpperCase() || 'U';
  const userName = user?.email?.split('@')[0] || 'User';

  return (
    <div className="flex h-screen bg-[#FCFAF7] text-stone-800 font-sans">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isSidebarCollapsed ? 'w-20' : 'w-64'}
          transition-all duration-300 ease-in-out border-r border-stone-200 bg-white flex flex-col
          fixed inset-y-0 left-0 z-50 lg:static lg:inset-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo + Collapse Toggle */}
        <div className="p-5 flex items-center justify-between">
          {!isSidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #D97706, #92400E)' }}
              >
                <PenLine className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span
                className="font-semibold text-lg tracking-tight text-amber-950"
                style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
              >
                CoWrite
              </span>
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 hover:bg-stone-100 rounded-md text-stone-500 mx-auto lg:mx-0 transition-colors hidden lg:flex"
          >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          {/* Mobile close */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 hover:bg-stone-100 rounded-md text-stone-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          <NavItem
            icon={<FileText size={20} />}
            label="My Projects"
            active={pathname === '/dashboard'}
            collapsed={isSidebarCollapsed}
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem
            icon={<Clock size={20} />}
            label="Recent"
            active={false}
            collapsed={isSidebarCollapsed}
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem
            icon={<Star size={20} />}
            label="Starred"
            active={false}
            collapsed={isSidebarCollapsed}
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem
            icon={<FolderOpen size={20} />}
            label="Folders"
            active={false}
            collapsed={isSidebarCollapsed}
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem
            icon={<Search size={20} />}
            label="Semantic Search"
            active={pathname.startsWith('/dashboard/search')}
            collapsed={isSidebarCollapsed}
            href="/dashboard/search"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="pt-4 pb-2 border-t border-stone-100 my-2"></div>
          <NavItem
            icon={<Trash2 size={20} />}
            label="Trash"
            active={false}
            collapsed={isSidebarCollapsed}
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
          />
        </nav>

        {/* Settings at bottom */}
        <div className="p-4 border-t border-stone-100">
          <NavItem
            icon={<Settings size={20} />}
            label="Settings"
            active={pathname.startsWith('/dashboard/settings')}
            collapsed={isSidebarCollapsed}
            href="/dashboard/settings"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 sm:px-8 z-10 shrink-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-stone-500 hover:bg-stone-100 transition-colors mr-3"
          >
            <Menu size={20} />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder="Search your projects..."
              className="w-full pl-10 pr-4 py-2 bg-stone-100 border-transparent focus:bg-white focus:ring-2 focus:ring-amber-900/20 focus:border-amber-900 rounded-full transition-all text-sm outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Right side: Bell + User */}
          <div className="flex items-center gap-4 ml-4 sm:ml-8">
            <button className="p-2 text-stone-500 hover:bg-stone-100 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-amber-700 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-stone-200 relative" ref={userMenuRef}>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs text-stone-500 mt-1">{user?.email || 'user@example.com'}</p>
              </div>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 cursor-pointer overflow-hidden border border-stone-300 transition-all hover:shadow-md"
                style={{ background: 'linear-gradient(135deg, #D97706, #92400E)', color: '#fff' }}
              >
                {userInitial}
              </button>

              {/* User dropdown */}
              {showUserMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-xl z-20 py-1.5 overflow-hidden bg-white"
                  style={{
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                    border: '1px solid #E7E5E4',
                  }}
                >
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center w-full px-3.5 py-2.5 text-sm transition-colors text-stone-700 hover:bg-stone-50"
                  >
                    <Settings className="w-3.5 h-3.5 mr-2.5 text-stone-500" />
                    Settings
                  </Link>
                  <div className="h-px mx-3 my-1 bg-stone-200" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-3.5 py-2.5 text-sm transition-colors text-red-500 hover:bg-red-50"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2.5 shrink-0" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
