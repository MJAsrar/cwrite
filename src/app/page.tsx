'use client';

import { useEffect, useRef } from 'react';
import { ArrowRight, Brain, Search, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const layer1Ref = useRef<HTMLHeadingElement>(null);
  const layer2Ref = useRef<HTMLHeadingElement>(null);
  const layer3Ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return;
      
      const scrolled = window.scrollY;
      const heroHeight = heroRef.current.offsetHeight;
      
      // Parallax effect - different speeds for each layer
      if (layer1Ref.current) {
        layer1Ref.current.style.transform = `translate(-50%, calc(-50% - ${scrolled * 0.1}px))`;
      }
      if (layer2Ref.current) {
        layer2Ref.current.style.transform = `translate(-50%, calc(-50% - ${scrolled * 0.3}px))`;
      }
      if (layer3Ref.current) {
        layer3Ref.current.style.transform = `translate(-50%, calc(-50% - ${scrolled * 0.5}px))`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-[#0A0A0A] text-gray-200">
      {/* Fixed Header */}
      <div className="fixed top-8 left-8 text-xl font-mono text-[#39FF14] border-2 border-[#39FF14] px-3 py-1 z-50 backdrop-blur-sm">
        COWRITE.IA
      </div>
      <div className="fixed top-8 right-8 text-xl font-mono text-[#FF073A] z-50">
        ITERATION 2.0
      </div>

      {/* Scroll Indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 text-gray-400 font-mono text-sm z-50 animate-bounce">
        SCROLL TO EXPLORE ⬇
      </div>

      {/* Hero Section - Pseudo 3D Parallax */}
      <section 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{ perspective: '1500px' }}
      >
        {/* Background layers for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A] to-[#1a1a1a]" />
        
        {/* Layer 1 - Furthest back */}
        <h1 
          ref={layer1Ref}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(60px,12vw,180px)] font-black leading-[0.9] tracking-tighter uppercase opacity-10 text-gray-700 pointer-events-none"
          style={{ willChange: 'transform' }}
        >
          CREATIVE
        </h1>

        {/* Layer 2 - Middle */}
       

        {/* Layer 3 - Front with neon glow */}
        <h1 
          ref={layer3Ref}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(80px,15vw,220px)] font-black leading-[0.9] tracking-tighter uppercase text-white pointer-events-none text-center"
          style={{ 
            willChange: 'transform',
            textShadow: '0 0 7px #39FF14, 0 0 15px #39FF14, 0 0 30px #39FF14, 0 0 60px rgba(57, 255, 20, 0.6)'
          }}
        >
          COWRITE<span className="text-[#39FF14]">.</span>AI
        </h1>

        {/* Subtitle */}
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 text-center">
          <p className="font-mono text-sm md:text-base text-gray-400 mb-8">
            AI-POWERED MANUSCRIPT INDEXING / SEMANTIC SEARCH / ENTITY EXTRACTION
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/auth/register')}
              className="border-4 border-[#39FF14] bg-transparent text-[#39FF14] font-mono px-6 py-3 cursor-pointer transition-all duration-100 hover:bg-[#39FF14] hover:text-[#0A0A0A] hover:translate-x-1.5 hover:translate-y-1.5"
              style={{ boxShadow: '6px 6px 0 0 #39FF14' }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 #39FF14'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '6px 6px 0 0 #39FF14'}
            >
              START FREE →
            </button>
            <button
              onClick={() => router.push('/auth/login')}
              className="border-4 border-gray-500 bg-transparent text-gray-300 font-mono px-6 py-3 cursor-pointer transition-all duration-100 hover:bg-gray-500 hover:text-[#0A0A0A] hover:translate-x-1.5 hover:translate-y-1.5"
              style={{ boxShadow: '6px 6px 0 0 #6B7280' }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 #6B7280'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '6px 6px 0 0 #6B7280'}
            >
              LOGIN
            </button>
          </div>
        </div>
      </section>

      {/* Features Section - Brutalist Cards */}
      <section className="min-h-screen bg-white text-[#0A0A0A] p-10 md:p-20 relative z-10">
        <h2 className="text-6xl md:text-8xl font-black mb-12 border-b-8 border-[#0A0A0A] pb-4 uppercase">
          /FEATURES
        </h2>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Feature 1 */}
          <div className="border-2 border-[#0A0A0A] p-8 transition-all duration-300 hover:border-[#39FF14] hover:shadow-[0_0_20px_rgba(57,255,20,0.3)] bg-white">
            <div className="w-16 h-16 border-4 border-[#39FF14] flex items-center justify-center mb-6">
              <Brain className="w-8 h-8 text-[#39FF14]" />
            </div>
            <h3 className="text-3xl font-black mb-4 uppercase">AI EXTRACTION</h3>
            <p className="font-mono text-sm mb-6 leading-relaxed">
              Automatically extract characters, locations, and themes from your manuscripts using advanced NLP.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-mono border-2 border-[#0A0A0A] px-2 py-1">SPACY</span>
              <span className="text-xs font-mono border-2 border-[#0A0A0A] px-2 py-1">NLP</span>
              <span className="text-xs font-mono border-2 border-[#0A0A0A] px-2 py-1">ENTITIES</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="border-2 border-[#0A0A0A] p-8 transition-all duration-300 hover:border-[#FF073A] hover:shadow-[0_0_20px_rgba(255,7,58,0.3)] bg-white">
            <div className="w-16 h-16 border-4 border-[#FF073A] flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-[#FF073A]" />
            </div>
            <h3 className="text-3xl font-black mb-4 uppercase">SEMANTIC SEARCH</h3>
            <p className="font-mono text-sm mb-6 leading-relaxed">
              Find content by meaning, not just keywords. Natural language queries across your entire project.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-mono border-2 border-[#0A0A0A] px-2 py-1">VECTORS</span>
              <span className="text-xs font-mono border-2 border-[#0A0A0A] px-2 py-1">EMBEDDINGS</span>
              <span className="text-xs font-mono border-2 border-[#0A0A0A] px-2 py-1">CHROMADB</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="border-2 border-[#0A0A0A] p-8 transition-all duration-300 hover:border-[#39FF14] hover:shadow-[0_0_20px_rgba(57,255,20,0.3)] bg-white">
            <div className="w-16 h-16 border-4 border-[#39FF14] flex items-center justify-center mb-6">
              <Zap className="w-8 h-8 text-[#39FF14]" />
            </div>
            <h3 className="text-3xl font-black mb-4 uppercase">FAST INDEXING</h3>
            <p className="font-mono text-sm mb-6 leading-relaxed">
              Upload manuscripts in multiple formats. Instant processing and indexing for immediate search.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-mono border-2 border-[#0A0A0A] px-2 py-1">DOCX</span>
              <span className="text-xs font-mono border-2 border-[#0A0A0A] px-2 py-1">TXT</span>
              <span className="text-xs font-mono border-2 border-[#0A0A0A] px-2 py-1">MD</span>
            </div>
          </div>
        </div>

        {/* Quote */}
        <div className="mt-16 pt-8 border-t-8 border-[#0A0A0A]">
          <p className="font-mono text-sm md:text-base">
            "Built for novelists, screenwriters, and content creators who need to manage complex story worlds."
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="min-h-[60vh] bg-[#0A0A0A] flex items-center justify-center p-10">
        <div className="text-center max-w-4xl">
          <h2 className="text-5xl md:text-7xl font-black mb-8 uppercase" style={{
            textShadow: '0 0 7px #FF073A, 0 0 15px #FF073A, 0 0 30px #FF073A'
          }}>
            START WRITING SMARTER
          </h2>
          <p className="font-mono text-gray-400 mb-12 text-lg">
            NO CREDIT CARD / FREE 14-DAY TRIAL / CANCEL ANYTIME
          </p>
          <button
            onClick={() => router.push('/auth/register')}
            className="border-4 border-[#FF073A] bg-transparent text-[#FF073A] font-mono px-10 py-4 text-xl cursor-pointer transition-all duration-100 hover:bg-[#FF073A] hover:text-[#0A0A0A] hover:translate-x-1.5 hover:translate-y-1.5"
            style={{ boxShadow: '8px 8px 0 0 #FF073A' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 #FF073A'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '8px 8px 0 0 #FF073A'}
          >
            GET STARTED NOW →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white text-[#0A0A0A] p-10 border-t-8 border-[#0A0A0A]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-mono text-sm">
            © 2025 COWRITE.IA — ALL RIGHTS RESERVED
          </div>
          <div className="flex gap-6 font-mono text-sm">
            <Link href="/auth/login" className="hover:text-[#39FF14] transition-colors">
              LOGIN
            </Link>
            <Link href="/auth/register" className="hover:text-[#39FF14] transition-colors">
              REGISTER
            </Link>
            <Link href="/dashboard" className="hover:text-[#FF073A] transition-colors">
              DASHBOARD
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
