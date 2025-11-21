import { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Projects - CoWriteAI',
  description: 'Manage your writing projects',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const dynamic = 'force-dynamic'

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

