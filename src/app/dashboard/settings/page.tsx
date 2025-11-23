'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Shield, Bell, Lock, Save, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import { User as UserType } from '@/types';

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [email, setEmail] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadUserSettings();
    }
  }, [mounted]);

  const loadUserSettings = async () => {
    try {
      setLoading(true);
      const userData = await api.get<UserType>('/api/v1/auth/me');
      setUser(userData);
      
      setEmail(userData.email || '');
      setNotifications(userData.settings?.notifications ?? true);
      setTheme(userData.settings?.theme || 'light');
      setLanguage(userData.settings?.language || 'en');
    } catch (error) {
      console.error('Failed to load user settings:', error);
      setMessage({ type: 'error', text: 'FAILED TO LOAD SETTINGS' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      await api.put('/api/v1/users/settings', {
        settings: {
          theme,
          notifications,
          language
        }
      });
      
      setMessage({ type: 'success', text: 'SETTINGS SAVED SUCCESSFULLY' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: 'FAILED TO SAVE SETTINGS' });
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-16 h-16 border-4 border-[#39FF14] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-t-[#39FF14] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl md:text-6xl font-black uppercase mb-2 text-white">
            SETTINGS
          </h1>
          <p className="font-mono text-sm text-gray-400 uppercase">
            ACCOUNT CONFIGURATION / PREFERENCES
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`mb-6 border-4 p-4 ${
            message.type === 'success' 
              ? 'border-[#39FF14] bg-[#39FF14]/10' 
              : 'border-[#FF073A] bg-[#FF073A]/10'
          }`}>
            <p className={`font-mono text-sm uppercase font-bold ${
              message.type === 'success' ? 'text-[#39FF14]' : 'text-[#FF073A]'
            }`}>
              {message.type === 'success' ? '✓' : '✗'} {message.text}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Account Section */}
          <div className="border-4 border-white bg-white p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-4 border-[#0A0A0A]">
              <div className="w-12 h-12 bg-[#39FF14] border-4 border-[#0A0A0A] flex items-center justify-center">
                <User className="w-6 h-6 text-[#0A0A0A]" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase text-[#0A0A0A]">ACCOUNT</h2>
                <p className="font-mono text-xs text-gray-600 uppercase">USER INFORMATION</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-xs uppercase mb-2 text-[#0A0A0A] font-bold">
                  <Mail className="w-4 h-4 inline mr-2" />
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full border-4 border-[#0A0A0A] bg-gray-100 px-4 py-3 font-mono text-sm text-[#0A0A0A] opacity-50 cursor-not-allowed"
                />
                <p className="font-mono text-xs text-gray-500 mt-2 uppercase">
                  CONTACT SUPPORT TO CHANGE EMAIL
                </p>
              </div>
              
              <div>
                <label className="block font-mono text-xs uppercase mb-2 text-[#0A0A0A] font-bold">
                  <Shield className="w-4 h-4 inline mr-2" />
                  ROLE
                </label>
                <div className="border-4 border-[#0A0A0A] bg-gray-50 px-4 py-3 font-mono text-sm text-[#0A0A0A] uppercase font-bold">
                  {user?.role || 'USER'}
                </div>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="border-4 border-white bg-white p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-4 border-[#0A0A0A]">
              <div className="w-12 h-12 bg-[#FF073A] border-4 border-[#0A0A0A] flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase text-[#0A0A0A]">PREFERENCES</h2>
                <p className="font-mono text-xs text-gray-600 uppercase">CUSTOMIZE EXPERIENCE</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-xs uppercase mb-2 text-[#0A0A0A] font-bold">
                  THEME
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                  className="w-full border-4 border-[#0A0A0A] bg-white px-4 py-3 font-mono text-sm text-[#0A0A0A] uppercase font-bold cursor-pointer"
                >
                  <option value="light">LIGHT</option>
                  <option value="dark">DARK</option>
                </select>
              </div>
              
              <div>
                <label className="block font-mono text-xs uppercase mb-2 text-[#0A0A0A] font-bold">
                  LANGUAGE
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full border-4 border-[#0A0A0A] bg-white px-4 py-3 font-mono text-sm text-[#0A0A0A] uppercase font-bold cursor-pointer"
                >
                  <option value="en">ENGLISH</option>
                  <option value="es">ESPAÑOL</option>
                  <option value="fr">FRANÇAIS</option>
                  <option value="de">DEUTSCH</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 border-4 border-[#0A0A0A] bg-gray-50">
                <div className="flex-1">
                  <p className="font-mono text-sm font-bold text-[#0A0A0A] uppercase">EMAIL NOTIFICATIONS</p>
                  <p className="font-mono text-xs text-gray-600 uppercase">PROJECT UPDATES</p>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`relative inline-flex h-8 w-16 items-center border-4 border-[#0A0A0A] transition-colors ${
                    notifications ? 'bg-[#39FF14]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform bg-[#0A0A0A] transition-transform ${
                      notifications ? 'translate-x-8' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="border-4 border-white bg-white p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-4 border-[#0A0A0A]">
              <div className="w-12 h-12 bg-[#FF073A] border-4 border-[#0A0A0A] flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase text-[#0A0A0A]">SECURITY</h2>
                <p className="font-mono text-xs text-gray-600 uppercase">PASSWORD & AUTH</p>
              </div>
            </div>
            
            <button
              onClick={() => alert('PASSWORD CHANGE COMING SOON')}
              className="w-full border-4 border-[#0A0A0A] bg-transparent text-[#0A0A0A] font-mono px-6 py-3 text-sm uppercase font-bold hover:bg-[#0A0A0A] hover:text-white transition-all duration-100 flex items-center justify-center gap-2"
              style={{ boxShadow: '4px 4px 0 0 #0A0A0A' }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 #0A0A0A'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '4px 4px 0 0 #0A0A0A'}
            >
              <Lock className="w-4 h-4" />
              CHANGE PASSWORD
            </button>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              onClick={loadUserSettings}
              disabled={saving}
              className="border-4 border-gray-500 bg-transparent text-gray-700 font-mono px-6 py-3 text-sm uppercase font-bold hover:bg-gray-500 hover:text-white transition-all duration-100 disabled:opacity-50"
              style={{ boxShadow: '4px 4px 0 0 #6B7280' }}
              onMouseEnter={(e) => !saving && (e.currentTarget.style.boxShadow = '0 0 0 0 #6B7280')}
              onMouseLeave={(e) => !saving && (e.currentTarget.style.boxShadow = '4px 4px 0 0 #6B7280')}
            >
              RESET
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="border-4 border-[#39FF14] bg-transparent text-[#39FF14] font-mono px-8 py-3 text-sm uppercase font-bold hover:bg-[#39FF14] hover:text-[#0A0A0A] transition-all duration-100 disabled:opacity-50 flex items-center gap-2"
              style={{ boxShadow: '6px 6px 0 0 #39FF14' }}
              onMouseEnter={(e) => !saving && (e.currentTarget.style.boxShadow = '0 0 0 0 #39FF14')}
              onMouseLeave={(e) => !saving && (e.currentTarget.style.boxShadow = '6px 6px 0 0 #39FF14')}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-[#39FF14] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                  SAVING...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  SAVE CHANGES
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
