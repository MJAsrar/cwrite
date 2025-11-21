import ProjectsClient from '@/components/projects/ProjectsClient';

// Force dynamic rendering - this is a server component that wraps the client component
export const dynamic = 'force-dynamic';

export default function ProjectsListingPage() {
  return <ProjectsClient />;
}