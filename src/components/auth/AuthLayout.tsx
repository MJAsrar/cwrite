'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  showBackButton?: boolean;
  className?: string;
}

export function AuthLayout({ 
  children, 
  title, 
  subtitle, 
  showBackButton = true,
  className 
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-secondary/10 flex items-center justify-center p-4 sm:p-6 lg:p-8 safe-top safe-bottom">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        {/* Back to Home */}
        {showBackButton && (
          <Link 
            href="/" 
            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors group touch-target sm:touch-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm sm:text-base">Back to Home</span>
          </Link>
        )}

        {/* Main Auth Card */}
        <div className={cn(
          "bg-card/80 backdrop-blur-sm rounded-2xl shadow-xl border border-border/50 p-6 sm:p-8 animate-fade-in-up",
          className
        )}>
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {title}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {subtitle}
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;