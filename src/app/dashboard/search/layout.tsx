import { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Search - CoWriteAI',
  description: 'Search across your writing projects',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const dynamic = 'force-dynamic'

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

