'use client';

import { ArrowRight, FileText, Share2, Shield, Zap, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <div className="bg-primary text-white p-1 rounded">
              <FileText size={20} />
            </div>
            <span>CoWrite.ai</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Sign in
            </Link>
            <button
              onClick={() => router.push('/auth/register')}
              className="bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-dot-pattern">
        <div className="container mx-auto px-4 md:px-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-sm text-muted-foreground mb-8 animate-fade-in-up">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
            Reimagining the writing workflow
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 max-w-4xl text-foreground animate-fade-in-up delay-100">
            Write better, <span className="text-primary">faster</span>, and with more clarity.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mb-10 animate-fade-in-up delay-200">
            The professional AI-powered writing assistant that understands your manuscripts, tracks entities, and enhances your creative flow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-16 animate-fade-in-up delay-300">
            <button
              onClick={() => router.push('/auth/register')}
              className="bg-primary text-white hover:bg-primary/90 px-8 py-4 rounded-lg text-lg font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Start Writing for Free <ArrowRight size={20} />
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('features');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white border border-border hover:bg-gray-50 text-foreground px-8 py-4 rounded-lg text-lg font-medium transition-all shadow-sm hover:shadow-md flex items-center justify-center"
            >
              See How It Works
            </button>
          </div>

          {/* Hero Visual Placeholder */}
          <div className="w-full max-w-5xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in-up delay-400">
            <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center gap-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="mx-auto bg-white px-4 py-1 rounded-md text-xs text-gray-400 font-mono border border-gray-200">
                cowrite-project-untitled.docx
              </div>
            </div>
            <div className="bg-white p-0 aspect-[16/9] relative bg-grid-pattern">
              <div className="absolute inset-0 flex items-center justify-center text-gray-300 font-medium">
                <Image src="/hero-placeholder.svg" alt="App Interface Preview" width={800} height={450} className="w-full h-full object-cover opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful features for serious writers</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to organize complex narratives and research.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-background p-8 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 text-primary rounded-lg flex items-center justify-center mb-6">
                <Search size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Semantic Search</h3>
              <p className="text-muted-foreground leading-relaxed">
                Don't just search for keywords. Ask questions about your story world and get answers based on meaning and context.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-background p-8 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Instant Entity Extraction</h3>
              <p className="text-muted-foreground leading-relaxed">
                Automatically identify and catalog characters, locations, and organizations as you write or upload documents.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-background p-8 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-6">
                <Shield size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Secure & Private</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your manuscripts are your intellectual property. We use industry-standard encryption to keep your work safe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Trust */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-8">
            Trusted by modern storytellers
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale items-center">
            {/* Simple text logos for professional feel */}
            <span className="text-xl font-bold font-serif">Independent</span>
            <span className="text-xl font-bold font-serif">SCRIBE</span>
            <span className="text-xl font-bold font-serif">Novelty.</span>
            <span className="text-xl font-bold font-serif">Archived</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-white">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to upgrade your writing process?</h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Join thousands of writers who are using CoWrite to manage their masterpieces.
          </p>
          <button
            onClick={() => router.push('/auth/register')}
            className="bg-white text-primary hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            Get Started for Free
          </button>
          <p className="mt-4 text-sm text-white/60">
            No credit card required. Free 14-day trial.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12 text-sm">
        <div className="container mx-auto px-4 md:px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg text-gray-900 mb-4">
              <FileText size={20} />
              <span>CoWrite.ai</span>
            </div>
            <p className="text-gray-500">
              The intelligent writing workspace for the modern era.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Product</h4>
            <ul className="space-y-2 text-gray-600">
              <li><Link href="#" className="hover:text-primary">Features</Link></li>
              <li><Link href="#" className="hover:text-primary">Pricing</Link></li>
              <li><Link href="#" className="hover:text-primary">Enterprise</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Resources</h4>
            <ul className="space-y-2 text-gray-600">
              <li><Link href="#" className="hover:text-primary">Documentation</Link></li>
              <li><Link href="#" className="hover:text-primary">Blog</Link></li>
              <li><Link href="#" className="hover:text-primary">Community</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-4">Legal</h4>
            <ul className="space-y-2 text-gray-600">
              <li><Link href="#" className="hover:text-primary">Privacy</Link></li>
              <li><Link href="#" className="hover:text-primary">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-6 mt-12 pt-8 border-t border-gray-200 text-center text-gray-500">
          © 2025 CoWrite AI Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
