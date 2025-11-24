import SettingsClient from '@/components/dashboard/SettingsClient';

// Force dynamic rendering - this is a server component that wraps the client component
export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return <SettingsClient />;
}
