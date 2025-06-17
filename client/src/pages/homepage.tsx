import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { 
  FileText, 
  Eye, 
  Download, 
  Users, 
  ArrowRight, 
  CheckCircle, 
  Github,
  Mail,
  Star,
  Zap,
  Layout,
  MousePointer,
  Sparkles,
  ChevronDown,
  Menu,
  X,
  Code,
  Layers,
  Monitor,
  Workflow
} from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}

interface StepProps {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface TestimonialProps {
  quote: string;
  author: string;
  role: string;
}

const FeatureCard = ({ icon, title, description, gradient }: FeatureCardProps) => (
  <div className="group relative h-80 overflow-hidden rounded-3xl transition-all duration-700 hover:scale-105">
    {/* Animated background gradient */}
    <div className={`absolute inset-0 ${gradient} opacity-90 group-hover:opacity-100 transition-opacity duration-700`}></div>
    
    {/* Animated overlay pattern */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
    
    {/* Floating geometric shapes */}
    <div className="absolute top-4 right-4 w-20 h-20 bg-white/20 rounded-2xl rotate-12 group-hover:rotate-45 transition-transform duration-700"></div>
    <div className="absolute bottom-8 left-6 w-12 h-12 bg-white/15 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
    
    {/* Content */}
    <div className="relative z-10 p-8 h-full flex flex-col justify-between text-white">
      <div className="w-16 h-16 text-white/90 group-hover:text-white group-hover:scale-110 transition-all duration-500">
        {icon}
      </div>
      
      <div>
        <h3 className="font-bold text-2xl mb-4 leading-tight">{title}</h3>
        <p className="text-white/90 leading-relaxed text-lg">{description}</p>
      </div>
    </div>
    
    {/* Hover glow effect */}
    <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-white/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10 blur-xl"></div>
  </div>
);

const StepCard = ({ number, title, description, icon }: StepProps) => (
  <div className="relative group cursor-pointer">
    {/* Background with mesh gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
    
    {/* Animated border */}
    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 rounded-3xl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
      <div className="bg-white rounded-3xl h-full w-full"></div>
    </div>
    
    <div className="relative z-10 p-8 text-center">
      {/* Step number with advanced styling */}
      <div className="relative mb-8 flex justify-center">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-2xl group-hover:shadow-purple-500/25 transition-all duration-700 transform group-hover:scale-110 group-hover:-rotate-6 relative overflow-hidden">
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <span className="relative z-10">{number}</span>
        </div>
        
        {/* Floating icon */}
        <div className="absolute inset-0 w-24 h-24 flex items-center justify-center text-white transform translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-700 delay-200">
          <div className="w-8 h-8">
            {icon}
          </div>
        </div>
      </div>
      
      <h3 className="font-bold text-xl mb-4 text-gray-900 group-hover:text-purple-800 transition-colors duration-500">{title}</h3>
      <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-500">{description}</p>
    </div>
  </div>
);

const TestimonialCard = ({ quote, author, role }: TestimonialProps) => (
  <div className="relative group h-64 overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 transition-all duration-700 hover:scale-105">
    {/* Animated mesh background */}
    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-violet-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
    
    {/* Geometric decorations */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-700"></div>
    
    <div className="relative z-10 p-8 h-full flex flex-col justify-between text-white">
      <div className="flex mb-4">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className="w-5 h-5 fill-yellow-400 text-yellow-400 mr-1 opacity-80 group-hover:opacity-100 transition-all duration-500" 
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
      
      <blockquote className="text-white/90 mb-6 italic text-lg leading-relaxed group-hover:text-white transition-colors duration-500 flex-1">
        "{quote}"
      </blockquote>
      
      <div>
        <p className="font-bold text-white text-lg">{author}</p>
        <p className="text-white/70 group-hover:text-white/90 transition-colors duration-500">{role}</p>
      </div>
    </div>
  </div>
);

// Navigation Component with glassmorphism
const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled 
        ? 'bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg shadow-purple-500/10' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center cursor-pointer group" onClick={() => setLocation("/")}>
            <div className="relative">
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent font-serif">
                Format A
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-700 hover:text-purple-600 transition-all duration-300 font-medium relative group">
              Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-600 group-hover:w-full transition-all duration-300"></span>
            </a>
            <a href="#how-it-works" className="text-gray-700 hover:text-purple-600 transition-all duration-300 font-medium relative group">
              How it Works
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-600 group-hover:w-full transition-all duration-300"></span>
            </a>
            <Button 
              onClick={() => setLocation("/generator")}
              className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-700 hover:via-violet-700 hover:to-indigo-700 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 relative overflow-hidden group"
            >
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-purple-600"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 right-0 bg-white/95 backdrop-blur-xl border border-white/20 shadow-xl rounded-b-3xl">
            <div className="px-6 py-8 space-y-6">
              <a href="#features" className="block text-gray-700 hover:text-purple-600 transition-colors duration-300 font-medium py-2">Features</a>
              <a href="#how-it-works" className="block text-gray-700 hover:text-purple-600 transition-colors duration-300 font-medium py-2">How it Works</a>
              <Button 
                onClick={() => setLocation("/generator")}
                className="w-full bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white font-semibold py-3 rounded-2xl"
              >
                Get Started
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default function Homepage() {
  const [, setLocation] = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsVisible(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleStartGenerating = () => {
    setLocation("/generator");
  };

  const handleTryDemo = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Dynamic cursor follower */}
      <div 
        className="fixed w-96 h-96 rounded-full bg-gradient-to-r from-purple-200/30 via-violet-200/30 to-indigo-200/30 blur-3xl pointer-events-none z-0 transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${mousePosition.x - 192}px, ${mousePosition.y - 192}px)`,
        }}
      />

      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Advanced mesh gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50"></div>
        
        {/* Animated geometric elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-purple-400/20 to-violet-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-violet-400/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-purple-200/10 via-violet-200/10 to-indigo-200/10 rounded-full blur-3xl animate-spin-slow"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

        <div className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-1500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-6xl mx-auto">
            {/* Introducing Badge */}
            <div className="mb-1 flex justify-center">
              <div className="group relative">
                <div className="relative inline-flex items-center gap-3 bg-white/90 backdrop-blur-xl rounded-full px-8 py-4 text-sm font-semibold text-purple-600 shadow-2xl border border-white/50 transition-all duration-500 hover:shadow-3xl hover:scale-110 animate-bounce-sync">
                  <span className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent font-bold">
                    Introducing
                  </span>
                </div>
              </div>
            </div>
            
            {/* Main heading with clean typography */}
            <h1 className="text-7xl md:text-9xl font-bold text-gray-900 mb-8 leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 font-serif">
                Format A
              </span>
            </h1>
            
            {/* Subtitle with animated gradient */}
            <h2 className={`text-4xl md:text-5xl font-semibold mb-8 transition-all duration-1500 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <span className="bg-gradient-to-r from-gray-800 via-purple-800 to-gray-800 bg-clip-text text-transparent">
                Automate Your IEEE Paper Formatting.
              </span>
              <span className="block mt-2 text-3xl md:text-4xl bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent font-bold animate-pulse">
                Perfectly.
              </span>
            </h2>
            
            {/* Description with better typography */}
            <p className={`text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed max-w-5xl mx-auto transition-all duration-1500 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              Generate, edit, and export research papers in flawless IEEE format — effortlessly. 
              Transform your research into publication-ready documents with our intelligent formatting engine.
            </p>
            
            {/* Enhanced CTA buttons */}
            <div className={`flex flex-col sm:flex-row gap-6 justify-center items-center transition-all duration-1500 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <Button 
                onClick={handleStartGenerating}
                size="lg" 
                className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-700 hover:via-violet-700 hover:to-indigo-700 text-white px-16 py-8 text-xl font-bold shadow-2xl hover:shadow-3xl hover:shadow-purple-500/25 transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 relative overflow-hidden group rounded-3xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer"></div>
                <span className="relative z-10 flex items-center">
                  <Zap className="w-6 h-6 mr-3 group-hover:animate-pulse" />
                  Try It Now
                </span>
              </Button>
              <Button 
                onClick={handleTryDemo}
                variant="outline" 
                size="lg"
                className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 bg-white/80 backdrop-blur-sm px-16 py-8 text-xl font-bold transition-all duration-500 hover:shadow-xl hover:shadow-purple-500/25 transform hover:scale-110 rounded-3xl hover:border-purple-600"
              >
                <Eye className="w-6 h-6 mr-3" />
                View Demo
              </Button>
            </div>
          </div>
        </div>
        
        {/* Enhanced Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-bounce-sync">
          <div className="w-10 h-16 border-2 border-purple-500 rounded-full flex justify-center relative overflow-hidden bg-white/50 backdrop-blur-sm">
            <div className="w-2 h-4 bg-gradient-to-b from-purple-500 to-violet-500 rounded-full mt-3 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-white relative overflow-hidden">
        {/* Section background elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500"></div>
        <div className="absolute top-20 right-0 w-64 h-64 bg-gradient-to-br from-purple-100 to-violet-100 rounded-full blur-3xl opacity-50"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 font-serif">
              <span className="bg-gradient-to-r from-gray-900 via-purple-800 to-gray-900 bg-clip-text text-transparent">
                Why Choose Format A?
              </span>
            </h2>
            <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Professional-grade features designed for researchers, academics, and students who demand excellence.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <FileText className="w-full h-full" />,
                title: "Intelligent Document Structure",
                description: "Automatically organize your research into proper IEEE sections with intelligent content analysis and formatting suggestions.",
                gradient: "bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600"
              },
              {
                icon: <CheckCircle className="w-full h-full" />,
                title: "IEEE Standards Compliance", 
                description: "Ensure perfect adherence to IEEE formatting guidelines with automated citation styles, reference formatting, and layout validation.",
                gradient: "bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-600"
              },
              {
                icon: <Download className="w-full h-full" />,
                title: "Professional Export Options",
                description: "Export publication-ready documents in multiple formats including Word DOCX and PDF with embedded fonts and proper metadata.",
                gradient: "bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <FeatureCard {...feature} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-32 bg-gradient-to-br from-gray-50 to-purple-50 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-purple-200/30 to-violet-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-violet-200/30 to-indigo-200/30 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 font-serif">
              <span className="bg-gradient-to-r from-gray-900 via-purple-800 to-gray-900 bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
            <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              From draft to publication in three simple steps. No IEEE formatting expertise required.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
            {/* Enhanced Connection Lines */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent rounded-full"></div>
            
            {[
              {
                number: "1",
                title: "Write or Import Content",
                description: "Import your existing research or start writing directly in our advanced editor. Format A handles the structure intelligently.",
                icon: <Code className="w-full h-full" />
              },
              {
                number: "2", 
                title: "Format and Customize",
                description: "Use our intelligent tools to organize sections, add figures, and manage references with precision and ease.",
                icon: <Layers className="w-full h-full" />
              },
              {
                number: "3",
                title: "Export in IEEE Format", 
                description: "Download your perfectly formatted IEEE paper in Word or PDF format, ready for immediate submission.",
                icon: <CheckCircle className="w-full h-full" />
              }
            ].map((step, index) => (
              <div 
                key={index}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 300}ms` }}
              >
                <StepCard {...step} />
              </div>
            ))}

          </div>

          <div className="text-center mt-20 animate-fade-in-up animation-delay-900">
            <Button 
              onClick={handleStartGenerating}
              size="lg"
              className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 text-white px-16 py-8 text-xl font-bold shadow-2xl hover:shadow-3xl hover:shadow-purple-500/25 transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 relative overflow-hidden group rounded-3xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer"></div>
              <span className="relative z-10 flex items-center">
                <ArrowRight className="w-6 h-6 mr-3 group-hover:translate-x-2 transition-transform duration-500" />
                Start Creating Now
              </span>
            </Button>
          </div>
        </div>
      </section>

      {/* Enhanced Call to Action Section */}
      <section className="py-32 bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/30 relative overflow-hidden">
        {/* Advanced background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100/20 via-violet-100/20 to-indigo-100/20"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent"></div>
        
        {/* Floating geometric shapes */}
        <div className="absolute top-20 left-20 w-40 h-40 bg-gradient-to-br from-purple-400/10 to-violet-400/10 rounded-3xl blur-2xl animate-pulse rotate-12"></div>
        <div className="absolute bottom-20 right-20 w-56 h-56 bg-gradient-to-br from-violet-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-2xl blur-xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            {/* Enhanced main heading */}
            <div className="relative mb-12">
              <h2 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6 font-serif leading-tight">
                <span className="bg-gradient-to-r from-gray-900 via-purple-800 to-gray-900 bg-clip-text text-transparent">
                  Ready to Transform
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  Your Research?
                </span>
              </h2>
              
              {/* Decorative underline */}
              <div className="flex justify-center">
                <div className="w-32 h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 rounded-full"></div>
              </div>
            </div>
            
            {/* Enhanced CTA button with surrounding elements */}
            <div className="relative">
              {/* Background glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-violet-500/20 to-indigo-500/20 rounded-full blur-3xl scale-150 opacity-50"></div>
              
              <Button 
                onClick={handleStartGenerating}
                size="lg"
                className="relative bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-700 hover:via-violet-700 hover:to-indigo-700 text-white px-24 py-12 text-2xl font-bold shadow-2xl hover:shadow-3xl hover:shadow-purple-500/30 transition-all duration-700 transform hover:scale-110 hover:-translate-y-4 group rounded-full border-2 border-white/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-shimmer rounded-full"></div>
                <span className="relative z-10 flex items-center">
                  <ArrowRight className="w-8 h-8 mr-4 group-hover:translate-x-2 transition-transform duration-500" />
                  Begin Your Research Journey
                  <Sparkles className="w-6 h-6 ml-4 group-hover:animate-spin transition-transform duration-500" />
                </span>
              </Button>
              
              {/* Floating action indicators */}
              <div className="absolute -top-4 -left-4 w-4 h-4 bg-gradient-to-r from-purple-400 to-violet-400 rounded-full animate-ping"></div>
              <div className="absolute -bottom-4 -right-4 w-4 h-4 bg-gradient-to-r from-violet-400 to-indigo-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-800/20 to-indigo-800/20"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-violet-400 to-indigo-400"></div>
        
        {/* Animated background elements */}
        <div className="absolute top-10 left-10 w-48 h-48 bg-gradient-to-br from-purple-500/10 to-violet-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-56 h-56 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h3 className="text-3xl font-bold font-serif mb-4">
              <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                Format A
              </span>
            </h3>
            <p className="text-purple-200 mb-6 max-w-2xl mx-auto text-lg leading-relaxed">
              The most advanced IEEE research paper formatting tool, designed for modern researchers and academics.
            </p>
            <p className="text-purple-300 text-base">
              Built with precision by the Format A Team
            </p>
          </div>
        </div>
      </footer>

      {/* Enhanced Custom Styles */}
      <style jsx>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(147, 51, 234, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(147, 51, 234, 0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        @keyframes spin-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes bounce-sync {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }
        
        .animate-blob { animation: blob 8s infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-bounce-sync { animation: bounce-sync 3s infinite; }
        .animate-shimmer { animation: shimmer 2s infinite; }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
        
        .animation-delay-200 { animation-delay: 200ms; }
        .animation-delay-400 { animation-delay: 400ms; }
        .animation-delay-600 { animation-delay: 600ms; }
        .animation-delay-800 { animation-delay: 800ms; }
        .animation-delay-900 { animation-delay: 900ms; }
        .animation-delay-1000 { animation-delay: 1000ms; }
        
        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  );
}