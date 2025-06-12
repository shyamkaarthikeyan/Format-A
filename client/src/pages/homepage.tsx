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
  X
} from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
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

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <Card className="group hover:shadow-2xl transition-all duration-700 border-gray-200 hover:border-purple-300 hover:shadow-purple-100/50 transform hover:-translate-y-3 hover:scale-105 relative overflow-hidden bg-gradient-to-br from-white to-gray-50/50">
    <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-violet-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-violet-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
    <CardContent className="p-8 text-center relative z-10">
      <div className="w-16 h-16 mx-auto mb-6 text-purple-600 group-hover:text-purple-700 transition-all duration-500 transform group-hover:scale-125 group-hover:rotate-12 relative">
        <div className="absolute inset-0 bg-purple-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
        <div className="relative z-10">
          {icon}
        </div>
      </div>
      <h3 className="font-bold text-xl mb-3 text-gray-900 group-hover:text-purple-800 transition-colors duration-500">{title}</h3>
      <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-500">{description}</p>
    </CardContent>
  </Card>
);

const StepCard = ({ number, title, description, icon }: StepProps) => (
  <div className="text-center group cursor-pointer relative">
    <div className="relative mb-8">
      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 via-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-2xl group-hover:shadow-3xl group-hover:shadow-purple-400/50 transition-all duration-700 transform group-hover:scale-125 group-hover:rotate-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-shimmer"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400/50 to-violet-700/50 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <span className="relative z-10">{number}</span>
      </div>
      <div className="absolute inset-0 w-20 h-20 mx-auto text-white flex items-center justify-center transform group-hover:scale-125 transition-transform duration-700 z-20">
        <div className="w-10 h-10 group-hover:animate-bounce opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200">
          {icon}
        </div>
      </div>
    </div>
    <h3 className="font-bold text-xl mb-4 text-gray-900 group-hover:text-purple-800 transition-colors duration-500">{title}</h3>
    <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-500 max-w-sm mx-auto">{description}</p>
  </div>
);

const TestimonialCard = ({ quote, author, role }: TestimonialProps) => (
  <Card className="border-gray-200 hover:shadow-2xl hover:shadow-purple-100/50 transition-all duration-700 transform hover:-translate-y-2 hover:scale-105 relative overflow-hidden group bg-gradient-to-br from-white to-gray-50/30">
    <div className="absolute inset-0 bg-gradient-to-br from-purple-25/50 to-violet-25/50 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-100 to-violet-100 rounded-full opacity-10 group-hover:opacity-30 transition-opacity duration-700 transform translate-x-10 -translate-y-10 group-hover:scale-150"></div>
    <CardContent className="p-8 relative z-10">
      <div className="flex mb-6 justify-center">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className="w-5 h-5 fill-purple-400 text-purple-400 transition-all duration-500 hover:scale-125 group-hover:fill-purple-500 group-hover:text-purple-500" 
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
      <blockquote className="text-gray-700 mb-6 italic text-lg leading-relaxed group-hover:text-gray-800 transition-colors duration-500">"{quote}"</blockquote>
      <div className="text-center">
        <p className="font-bold text-gray-900 group-hover:text-purple-800 transition-colors duration-500 text-lg">{author}</p>
        <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-500 mt-1">{role}</p>
      </div>
    </CardContent>
  </Card>
);

const FloatingParticle = ({ delay }: { delay: number }) => (
  <div 
    className="absolute w-2 h-2 bg-purple-300 rounded-full opacity-30 animate-pulse"
    style={{
      animation: `float ${3 + Math.random() * 2}s ease-in-out infinite ${delay}s`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
    }}
  />
);

// Format A Logo Component
const FormatALogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg transform rotate-12 opacity-80"></div>
    <div className="relative bg-gradient-to-br from-purple-600 to-violet-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">
      A
    </div>
  </div>
);

// Navigation Component
const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [, setLocation] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center cursor-pointer group" onClick={() => setLocation("/")}>
            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600 font-serif">
              Format A
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-purple-600 transition-colors duration-300 font-medium">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-purple-600 transition-colors duration-300 font-medium">How it Works</a>
            <Button 
              onClick={() => setLocation("/generator")}
              className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white px-6 py-2 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-lg">
            <div className="px-4 py-6 space-y-4">
              <a href="#features" className="block text-gray-600 hover:text-purple-600 transition-colors duration-300 font-medium py-2">Features</a>
              <a href="#how-it-works" className="block text-gray-600 hover:text-purple-600 transition-colors duration-300 font-medium py-2">How it Works</a>
              <Button 
                onClick={() => setLocation("/generator")}
                className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold"
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

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleStartGenerating = () => {
    setLocation("/generator");
  };

  const handleTryDemo = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-50 via-pink-50 to-violet-100 pt-32 pb-40 overflow-hidden">
        <div className="absolute inset-0 bg-purple-grid-pattern opacity-10"></div>
        
        {/* Enhanced Animated Background Shapes */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-purple-200 to-violet-300 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-blob"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-gradient-to-br from-violet-200 to-fuchsia-300 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-gradient-to-br from-fuchsia-200 to-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-blob animation-delay-4000"></div>
        
        <div className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-1500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-5xl mx-auto">
            <div className="mb-6 inline-flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 text-sm text-purple-600 animate-bounce shadow-lg border border-purple-100">
              <Sparkles className="w-5 h-5 animate-spin" />
              <span className="font-semibold">✨ Now with AI-Powered Formatting</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold text-gray-900 mb-8 leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 font-serif animate-gradient-x drop-shadow-lg">
                Format A
              </span>
            </h1>
            
            <h2 className={`text-3xl md:text-4xl font-semibold text-gray-800 mb-6 transition-all duration-1500 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              Automate Your IEEE Paper Formatting. <em className="text-purple-600 animate-pulse">Perfectly.</em>
            </h2>
            
            <p className={`text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed max-w-4xl mx-auto transition-all duration-1500 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              Generate, edit, and export research papers in flawless IEEE format — effortlessly. 
              Transform your research into publication-ready documents with our intelligent formatting engine.
            </p>
            
            <div className={`flex flex-col sm:flex-row gap-6 justify-center items-center transition-all duration-1500 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
              <Button 
                onClick={handleStartGenerating}
                size="lg" 
                className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white px-12 py-6 text-xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 relative overflow-hidden group rounded-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer"></div>
                <Zap className="w-6 h-6 mr-3 group-hover:animate-spin" />
                Try It Now
              </Button>
              <Button 
                onClick={handleTryDemo}
                variant="outline" 
                size="lg"
                className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 px-12 py-6 text-xl font-bold transition-all duration-500 hover:shadow-xl transform hover:scale-110 rounded-2xl hover:border-purple-600"
              >
                <Eye className="w-6 h-6 mr-3" />
                View Demo
              </Button>
            </div>
          </div>
        </div>
        
        {/* Enhanced Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-8 h-12 border-2 border-purple-400 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-purple-400 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-gradient-to-br from-gray-50 to-purple-25 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-serif animate-fade-in-up">
              Why Choose Format A?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto animate-fade-in-up animation-delay-200 leading-relaxed">
              Professional-grade features designed for researchers, academics, and students who demand excellence.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[
              {
                icon: <Eye className="w-full h-full" />,
                title: "Live IEEE Preview",
                description: "See your paper formatted in real-time with pixel-perfect IEEE compliance as you type."
              },
              {
                icon: <Layout className="w-full h-full" />,
                title: "Easy Paper Structuring", 
                description: "Intuitive drag-and-drop interface for organizing sections, figures, and references effortlessly."
              },
              {
                icon: <Download className="w-full h-full" />,
                title: "One-Click Export",
                description: "Generate publication-ready Word and PDF documents with perfect IEEE formatting instantly."
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
      <section id="how-it-works" className="py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-serif animate-fade-in-up">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto animate-fade-in-up animation-delay-200 leading-relaxed">
              From draft to publication in three simple steps. No IEEE formatting expertise required.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
            {/* Enhanced Connection Lines */}
            <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-1 bg-gradient-to-r from-purple-300 via-violet-400 to-purple-300 rounded-full"></div>
            
            {[
              {
                number: "1",
                title: "Write or Paste Your Content",
                description: "Import your existing research or start writing directly in our editor. Format A handles the structure.",
                icon: <FileText className="w-full h-full" />
              },
              {
                number: "2", 
                title: "Format and Customize",
                description: "Use our intelligent tools to organize sections, add figures, and manage references with ease.",
                icon: <MousePointer className="w-full h-full" />
              },
              {
                number: "3",
                title: "Export in IEEE Format", 
                description: "Download your perfectly formatted IEEE paper in Word or PDF format, ready for submission.",
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

          <div className="text-center mt-16 animate-fade-in-up animation-delay-900">
            <Button 
              onClick={handleStartGenerating}
              size="lg"
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-12 py-6 text-xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 relative overflow-hidden group rounded-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer"></div>
              <ArrowRight className="w-6 h-6 mr-3 group-hover:translate-x-2 transition-transform duration-500" />
              Start Generating Now
            </Button>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gradient-to-br from-purple-900 via-violet-900 to-indigo-900 text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-800/20 to-violet-800/20"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h3 className="text-3xl font-bold font-serif animate-fade-in-up mb-4">Format A</h3>
            <p className="text-purple-200 mb-6 max-w-md mx-auto animate-fade-in-up animation-delay-200 text-lg leading-relaxed">
              The most advanced IEEE research paper formatting tool, designed for modern researchers and academics.
            </p>
            <p className="text-purple-300 animate-fade-in-up animation-delay-400">
              Built with ❤️ by the Format A Team
            </p>
          </div>
          
          <div className="border-t border-purple-800 mt-12 pt-12 flex flex-col md:flex-row justify-center items-center animate-fade-in-up animation-delay-1000">
            <div className="flex space-x-6">
              <a href="#" className="text-purple-200 hover:text-white transition-all duration-300 transform hover:scale-125 hover:-translate-y-1">
                <Github className="w-6 h-6" />
              </a>
              <a href="#" className="text-purple-200 hover:text-white transition-all duration-300 transform hover:scale-125 hover:-translate-y-1">
                <Mail className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Enhanced Custom Styles */}
      <style jsx>{`
        .bg-purple-grid-pattern {
          background-image: 
            linear-gradient(rgba(147, 51, 234, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(147, 51, 234, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
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
        
        @keyframes gradient-x {
          0%, 100% { background-size: 200% 200%; background-position: left center; }
          50% { background-size: 200% 200%; background-position: right center; }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-blob { animation: blob 7s infinite; }
        .animate-gradient-x { animation: gradient-x 3s ease infinite; }
        .animate-shimmer { animation: shimmer 2s infinite; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        
        .animation-delay-200 { animation-delay: 200ms; }
        .animation-delay-400 { animation-delay: 400ms; }
        .animation-delay-600 { animation-delay: 600ms; }
        .animation-delay-800 { animation-delay: 800ms; }
        .animation-delay-900 { animation-delay: 900ms; }
        .animation-delay-1000 { animation-delay: 1000ms; }
        .animation-delay-2000 { animation-delay: 2000ms; }
        .animation-delay-4000 { animation-delay: 4000ms; }
        
        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
        }
        
        .drop-shadow-lg {
          filter: drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) drop-shadow(0 4px 3px rgb(0 0 0 / 0.1));
        }
      `}</style>
    </div>
  );
}