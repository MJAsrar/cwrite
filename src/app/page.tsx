'use client';

import { 
  BookOpen, 
  Search, 
  Users, 
  Zap, 
  Shield, 
  Star,
  CheckCircle,
  ArrowRight,
  FileText,
  Brain,
  Network,
  Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';

export default function HomePage() {
  const router = useRouter();
  return (
    <Layout>
      <div>
      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-card to-muted/30">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-20 animate-pulse delay-1000"></div>
        
        <div className="relative container-wide py-20 lg:py-32">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm animate-fade-in">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Writing Assistant</span>
            </div>
            
            {/* Main Heading with Playfair Display */}
            <h1 className="font-serif text-display text-foreground mb-8 leading-[0.9] tracking-tight animate-fade-in-up">
              Transform Your
              <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Creative Writing
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-responsive-lg text-muted-foreground mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in-up delay-200">
              CoWriteAI intelligently indexes your manuscripts, extracts characters and themes, 
              and provides semantic search to help you navigate complex story worlds effortlessly.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in-up delay-300">
              <button 
                onClick={() => router.push('/auth/register')} 
                className="btn-primary text-lg px-8 py-4 h-12 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                Start Writing for Free
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => router.push('/dashboard')} 
                className="btn-outline text-lg px-8 py-4 h-12 rounded-2xl hover:bg-accent/10 transition-all duration-300"
              >
                Watch Demo
              </button>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-caption animate-fade-in-up delay-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Free 14-day trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="py-20 lg:py-32 bg-gradient-subtle">
        <div className="container-wide">
          <div className="text-center mb-20">
            <h2 className="font-serif text-heading text-foreground mb-6 animate-fade-in-up">
              Everything You Need to Write Better
            </h2>
            <p className="text-responsive-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed animate-fade-in-up delay-200">
              From intelligent indexing to semantic search, CoWriteAI provides the tools 
              modern writers need to manage complex creative projects.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 - AI Analysis */}
            <div className="group card card-hover bg-gradient-to-br from-primary/5 via-card to-primary/10 border-primary/20 animate-fade-in-up delay-100">
              <div className="card-content">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Brain className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-serif text-title text-foreground mb-4">
                  AI-Powered Analysis
                </h3>
                <p className="text-body text-muted-foreground mb-6 leading-relaxed">
                  Automatically extract characters, locations, and themes from your manuscripts 
                  using advanced natural language processing.
                </p>
                <ul className="space-y-3 text-caption">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Character relationship mapping</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Theme and motif detection</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Setting and location tracking</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 2 - Semantic Search */}
            <div className="group card card-hover bg-gradient-to-br from-accent/5 via-card to-accent/10 border-accent/20 animate-fade-in-up delay-200">
              <div className="card-content">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Search className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-serif text-title text-foreground mb-4">
                  Semantic Search
                </h3>
                <p className="text-body text-muted-foreground mb-6 leading-relaxed">
                  Find exactly what you're looking for with natural language queries. 
                  Search by meaning, not just keywords.
                </p>
                <ul className="space-y-3 text-caption">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Natural language queries</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Context-aware results</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Cross-document search</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 3 - Project Organization */}
            <div className="group card card-hover bg-gradient-to-br from-green-500/5 via-card to-green-500/10 border-green-500/20 animate-fade-in-up delay-300">
              <div className="card-content">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Network className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-serif text-title text-foreground mb-4">
                  Project Organization
                </h3>
                <p className="text-body text-muted-foreground mb-6 leading-relaxed">
                  Keep your writing projects organized with intelligent file management 
                  and visual relationship mapping.
                </p>
                <ul className="space-y-3 text-caption">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Multi-format file support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Visual relationship graphs</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Version control integration</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 4 - Multiple Formats */}
            <div className="group card card-hover bg-gradient-to-br from-purple-500/5 via-card to-purple-500/10 border-purple-500/20 animate-fade-in-up delay-400">
              <div className="card-content">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-serif text-title text-foreground mb-4">
                  Multiple Formats
                </h3>
                <p className="text-body text-muted-foreground mb-6 leading-relaxed">
                  Work with your preferred file formats. Support for Word documents, 
                  Markdown, and plain text files.
                </p>
                <ul className="space-y-3 text-caption">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>.docx, .md, .txt support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Batch file processing</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Real-time sync</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 5 - Security */}
            <div className="group card card-hover bg-gradient-to-br from-orange-500/5 via-card to-orange-500/10 border-orange-500/20 animate-fade-in-up delay-500">
              <div className="card-content">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-serif text-title text-foreground mb-4">
                  Secure & Private
                </h3>
                <p className="text-body text-muted-foreground mb-6 leading-relaxed">
                  Your creative work is protected with enterprise-grade security. 
                  Your stories remain private and secure.
                </p>
                <ul className="space-y-3 text-caption">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>End-to-end encryption</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Private cloud storage</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>GDPR compliant</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 6 - Collaboration */}
            <div className="group card card-hover bg-gradient-to-br from-blue-500/5 via-card to-blue-500/10 border-blue-500/20 animate-fade-in-up delay-600">
              <div className="card-content">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-serif text-title text-foreground mb-4">
                  Collaboration Ready
                </h3>
                <p className="text-body text-muted-foreground mb-6 leading-relaxed">
                  Share projects with editors, beta readers, or co-authors. 
                  Collaborate seamlessly on complex writing projects.
                </p>
                <ul className="space-y-3 text-caption">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Real-time collaboration</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Comment and feedback system</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Permission management</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Use Cases Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-muted/20 via-card/30 to-background">
        <div className="container-wide">
          <div className="text-center mb-20">
            <h2 className="font-serif text-heading text-foreground mb-6 animate-fade-in-up">
              Perfect for Every Type of Writer
            </h2>
            <p className="text-responsive-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed animate-fade-in-up delay-200">
              Whether you're writing your first novel or managing a complex series, 
              CoWriteAI adapts to your creative process.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            {/* Novelists */}
            <div className="group text-center animate-fade-in-up delay-100">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-8 shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-500 group-hover:rotate-3">
                <BookOpen className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="font-serif text-title text-foreground mb-6 group-hover:text-primary transition-colors duration-300">
                Novelists
              </h3>
              <p className="text-body text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">
                Track character arcs, plot threads, and world-building elements across 
                multiple books and series. Never lose track of your story's complexity.
              </p>
            </div>
            
            {/* Screenwriters */}
            <div className="group text-center animate-fade-in-up delay-200">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent to-primary flex items-center justify-center mx-auto mb-8 shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-500 group-hover:-rotate-3">
                <FileText className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="font-serif text-title text-foreground mb-6 group-hover:text-accent transition-colors duration-300">
                Screenwriters
              </h3>
              <p className="text-body text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">
                Manage character development, scene continuity, and dialogue consistency 
                across scripts, treatments, and story bibles.
              </p>
            </div>
            
            {/* Content Creators */}
            <div className="group text-center animate-fade-in-up delay-300">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-8 shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-500 group-hover:rotate-3">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="font-serif text-title text-foreground mb-6 group-hover:text-green-600 transition-colors duration-300">
                Content Creators
              </h3>
              <p className="text-body text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">
                Organize research, maintain consistency across long-form content, 
                and discover connections between different pieces of work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials Section */}
      <section className="py-20 lg:py-32 bg-card/30">
        <div className="container-wide">
          <div className="text-center mb-20">
            <h2 className="font-serif text-heading text-foreground mb-6 animate-fade-in-up">
              Loved by Writers Worldwide
            </h2>
            <p className="text-responsive-lg text-muted-foreground animate-fade-in-up delay-200">
              Join thousands of writers who have transformed their creative process
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="card bg-gradient-to-br from-primary/5 via-card to-card border-primary/10 animate-fade-in-up delay-100">
              <div className="card-content">
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <blockquote className="text-body text-foreground mb-8 leading-relaxed italic">
                  "CoWriteAI completely changed how I manage my fantasy series. 
                  The character relationship mapping helped me catch inconsistencies 
                  I never would have noticed."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg">
                    SM
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Sarah Mitchell</div>
                    <div className="text-caption text-muted-foreground">Fantasy Author</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Testimonial 2 */}
            <div className="card bg-gradient-to-br from-accent/5 via-card to-card border-accent/10 animate-fade-in-up delay-200">
              <div className="card-content">
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <blockquote className="text-body text-foreground mb-8 leading-relaxed italic">
                  "The semantic search is incredible. I can find any scene by describing 
                  what happens instead of remembering exact words. It's like having 
                  a research assistant."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg">
                    JC
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">James Chen</div>
                    <div className="text-caption text-muted-foreground">Screenwriter</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Testimonial 3 */}
            <div className="card bg-gradient-to-br from-green-500/5 via-card to-card border-green-500/10 animate-fade-in-up delay-300">
              <div className="card-content">
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <blockquote className="text-body text-foreground mb-8 leading-relaxed italic">
                  "As someone writing a historical fiction series, keeping track of 
                  all the research and character details was overwhelming. CoWriteAI 
                  made it manageable."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    ER
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Elena Rodriguez</div>
                    <div className="text-caption text-muted-foreground">Historical Fiction Author</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Pricing Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-muted/30 via-background to-card/50">
        <div className="container-wide">
          <div className="text-center mb-20">
            <h2 className="font-serif text-heading text-foreground mb-6 animate-fade-in-up">
              Simple, Transparent Pricing
            </h2>
            <p className="text-responsive-lg text-muted-foreground animate-fade-in-up delay-200">
              Choose the plan that fits your writing journey
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <div className="card bg-card border-border shadow-lg animate-fade-in-up delay-100">
              <div className="card-content">
                <div className="text-center mb-8">
                  <h3 className="font-serif text-title text-foreground mb-3">Starter</h3>
                  <div className="mb-3">
                    <span className="text-4xl font-bold text-foreground">$0</span>
                    <span className="text-responsive-sm text-muted-foreground">/month</span>
                  </div>
                  <p className="text-caption text-muted-foreground">Perfect for trying out CoWriteAI</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-body">1 project</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-body">Up to 10 files</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-body">Basic entity extraction</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-body">Semantic search</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-body">Community support</span>
                  </li>
                </ul>
                
                <button 
                  onClick={() => router.push('/auth/register')} 
                  className="w-full btn-outline text-lg py-3 h-12 rounded-2xl"
                >
                  Get Started Free
                </button>
              </div>
            </div>

            {/* Professional Plan - Most Popular */}
            <div className="relative card bg-gradient-to-br from-primary via-primary to-accent border-primary shadow-2xl animate-fade-in-up delay-200 scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                  Most Popular
                </span>
              </div>
              
              <div className="card-content">
                <div className="text-center mb-8">
                  <h3 className="font-serif text-title text-primary-foreground mb-3">Professional</h3>
                  <div className="mb-3">
                    <span className="text-4xl font-bold text-primary-foreground">$19</span>
                    <span className="text-responsive-sm text-primary-foreground/80">/month</span>
                  </div>
                  <p className="text-caption text-primary-foreground/80">For serious writers and creators</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-body text-primary-foreground">Unlimited projects</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-body text-primary-foreground">Unlimited files</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-body text-primary-foreground">Advanced AI analysis</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-body text-primary-foreground">Relationship mapping</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-body text-primary-foreground">Priority support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-body text-primary-foreground">Export capabilities</span>
                  </li>
                </ul>
                
                <button 
                  onClick={() => router.push('/auth/register')} 
                  className="w-full bg-primary-foreground text-primary font-semibold text-lg py-3 h-12 rounded-2xl hover:bg-primary-foreground/90 transition-all duration-300 shadow-lg"
                >
                  Start Free Trial
                </button>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="card bg-card border-border shadow-lg animate-fade-in-up delay-300">
              <div className="card-content">
                <div className="text-center mb-8">
                  <h3 className="font-serif text-title text-foreground mb-3">Enterprise</h3>
                  <div className="mb-3">
                    <span className="text-4xl font-bold text-foreground">$49</span>
                    <span className="text-responsive-sm text-muted-foreground">/month</span>
                  </div>
                  <p className="text-caption text-muted-foreground">For teams and organizations</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-body">Everything in Professional</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-body">Team collaboration</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-body">Advanced permissions</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-body">Custom integrations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-body">Dedicated support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-body">SLA guarantee</span>
                  </li>
                </ul>
                
                <button 
                  onClick={() => window.location.href = 'mailto:sales@cowriteai.com'} 
                  className="w-full btn-primary text-lg py-3 h-12 rounded-2xl"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-transparent to-accent/90"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary-foreground/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-accent-foreground/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-primary-foreground/5 rounded-full blur-lg animate-pulse delay-500"></div>
        
        <div className="relative container-wide text-center">
          <h2 className="font-serif text-heading text-primary-foreground mb-8 animate-fade-in-up">
            Ready to Transform Your Writing?
          </h2>
          <p className="text-responsive-lg text-primary-foreground/90 mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in-up delay-200">
            Join thousands of writers who have already discovered the power of AI-assisted writing. 
            Start your free trial today and see the difference CoWriteAI can make.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12 animate-fade-in-up delay-300">
            <button 
              onClick={() => router.push('/auth/register')} 
              className="group bg-primary-foreground text-primary font-semibold text-lg px-8 py-4 h-14 rounded-2xl hover:bg-primary-foreground/90 transition-all duration-300 flex items-center shadow-xl hover:shadow-2xl hover:scale-105"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform duration-300" />
            </button>
            <button 
              onClick={() => router.push('/dashboard')} 
              className="group border-2 border-primary-foreground text-primary-foreground font-semibold text-lg px-8 py-4 h-14 rounded-2xl hover:bg-primary-foreground hover:text-primary transition-all duration-300 backdrop-blur-sm hover:scale-105"
            >
              Schedule a Demo
            </button>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-8 text-caption text-primary-foreground/80 animate-fade-in-up delay-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>
      </div>
    </Layout>
  );
}