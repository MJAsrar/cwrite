'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Shield, Bell, Lock, Save, RefreshCcw } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import { User as UserType } from '@/types';

export default function SettingsClient() {
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
      setMessage({ type: 'error', text: 'Failed to load settings' });
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

      setMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || loading) {
    return (
      <DashboardLayout>
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#D97706', borderTopColor: 'transparent' }}
              />
              <p className="text-sm font-medium text-stone-500">Loading settings…</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 sm:p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8 pb-6 border-b border-stone-200">
            <h1
              className="text-3xl font-bold tracking-tight mb-1.5 text-stone-900"
              style={{ fontFamily: 'var(--font-playfair), Georgia, serif', letterSpacing: '-0.02em' }}
            >
              Settings
            </h1>
            <p className="text-sm text-stone-500">Account configuration & preferences</p>
          </div>

          {/* Message Banner */}
          {message && (
            <div className={`mb-6 rounded-xl p-4 flex items-center gap-3 ${message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
              <span className="text-lg">{message.type === 'success' ? '✓' : '✗'}</span>
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Account Section */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 p-5 border-b border-stone-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #FDE68A, #F59E0B)' }}
                >
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-stone-900">Account</h2>
                  <p className="text-xs text-stone-500">User information</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    <Mail className="w-3.5 h-3.5 inline mr-1.5 text-stone-400" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full border border-stone-200 bg-stone-50 px-4 py-2.5 rounded-lg text-sm text-stone-600 opacity-70 cursor-not-allowed"
                  />
                  <p className="text-xs text-stone-400 mt-1.5">Contact support to change email</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    <Shield className="w-3.5 h-3.5 inline mr-1.5 text-stone-400" />
                    Role
                  </label>
                  <div className="border border-stone-200 bg-stone-50 px-4 py-2.5 rounded-lg text-sm text-stone-700 font-medium capitalize">
                    {user?.role || 'User'}
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences Section */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 p-5 border-b border-stone-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #BAE6FD, #3B82F6)' }}
                >
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-stone-900">Preferences</h2>
                  <p className="text-xs text-stone-500">Customize your experience</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Theme</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                    className="w-full border border-stone-200 bg-white px-4 py-2.5 rounded-lg text-sm text-stone-700 cursor-pointer focus:ring-2 focus:ring-amber-900/20 focus:border-amber-900 outline-none transition-all"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full border border-stone-200 bg-white px-4 py-2.5 rounded-lg text-sm text-stone-700 cursor-pointer focus:ring-2 focus:ring-amber-900/20 focus:border-amber-900 outline-none transition-all"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-100">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-900">Email Notifications</p>
                    <p className="text-xs text-stone-500">Project updates & activity</p>
                  </div>
                  <button
                    onClick={() => setNotifications(!notifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications ? 'bg-amber-700' : 'bg-stone-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform bg-white rounded-full transition-transform shadow-sm ${notifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 p-5 border-b border-stone-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #FCA5A5, #EF4444)' }}
                >
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-stone-900">Security</h2>
                  <p className="text-xs text-stone-500">Password & authentication</p>
                </div>
              </div>

              <div className="p-5">
                <button
                  onClick={() => alert('Password change coming soon')}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-stone-200 text-stone-700 bg-white hover:bg-stone-50 transition-all"
                >
                  <Lock className="w-4 h-4" />
                  Change Password
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2 pb-8">
              <button
                onClick={loadUserSettings}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-stone-200 text-stone-700 bg-white hover:bg-stone-50 transition-all disabled:opacity-50"
              >
                <RefreshCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl text-white transition-all bg-amber-900 hover:bg-amber-950 disabled:opacity-50 shadow-sm hover:shadow-md"
              >
                {saving ? (
                  <>
                    <div
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: '#fff', borderTopColor: 'transparent' }}
                    />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
