import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Playfair_Display } from 'next/font/google';
import './globals.css';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import SkipLink from '@/components/ui/SkipLink';

const playfair = Playfair_Display({
    subsets: ['latin'],
    variable: '--font-playfair',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'CoWriteAI - AI-Assisted Writing Platform',
    description: 'Intelligent project indexing and semantic search for writers',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
    ],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            try {
                                const theme = localStorage.getItem('cowrite-theme') || 'system';
                                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                                const resolvedTheme = theme === 'system' ? systemTheme : theme;
                                document.documentElement.classList.add(resolvedTheme);
                            } catch (e) {}
                        `,
                    }}
                />
            </head>
            <body className={`${GeistSans.variable} ${GeistMono.variable} ${playfair.variable} antialiased`}>
                <SkipLink href="#main-content">Skip to main content</SkipLink>
                <ThemeProvider defaultTheme="system" storageKey="cowrite-theme">
                    <AccessibilityProvider>
                        <ErrorBoundary>
                            {children}
                        </ErrorBoundary>
                    </AccessibilityProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}