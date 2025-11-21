import DashboardClient from '@/components/dashboard/DashboardClient';

// Force dynamic rendering - this is a server component that wraps the client component
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return <DashboardClient />;
}