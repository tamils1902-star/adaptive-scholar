import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Brain, 
  Sparkles, 
  BookOpen, 
  TrendingUp, 
  Target, 
  Zap,
  CheckCircle,
  ArrowRight,
  Play
} from 'lucide-react';
import { useEffect } from 'react';

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Personalization',
      description: 'Our intelligent system analyzes your learning patterns and adapts content to your unique needs.',
    },
    {
      icon: Target,
      title: 'Adaptive Difficulty',
      description: 'Quizzes and lessons automatically adjust to match your skill level for optimal learning.',
    },
    {
      icon: TrendingUp,
      title: 'Progress Analytics',
      description: 'Track your improvement with detailed insights and performance metrics.',
    },
    {
      icon: Zap,
      title: 'Smart Recommendations',
      description: 'Get personalized course suggestions based on your goals and learning history.',
    },
  ];

  const benefits = [
    'Personalized learning paths',
    'Real-time performance tracking',
    'Adaptive quiz difficulty',
    'AI-generated recommendations',
    'Comprehensive analytics',
    'Certificate of completion',
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 gradient-primary rounded-xl">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">AdaptLearn</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Login
            </Button>
            <Button variant="gradient" onClick={() => navigate('/auth')}>
              Get Started
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-50" />
        <div className="absolute top-40 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" />
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI-Powered Learning Platform</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Learn Smarter with
              <span className="block gradient-primary bg-clip-text text-transparent">Adaptive AI</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Experience personalized learning that evolves with you. Our AI analyzes your progress 
              and adapts content to help you achieve your goals faster.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Button size="xl" variant="gradient" onClick={() => navigate('/auth')}>
                Start Learning Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="xl" variant="outline">
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Why Choose AdaptLearn?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform combines cutting-edge AI technology with proven learning methodologies 
              to create a truly personalized educational experience.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="border-0 shadow-lg hover:shadow-xl transition-all group animate-fade-in"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <CardContent className="p-6">
                  <div className="p-3 gradient-primary rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes and begin your personalized learning journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up for free and tell us about your learning goals' },
              { step: '02', title: 'Take Assessment', desc: 'Complete a quick quiz to determine your current level' },
              { step: '03', title: 'Start Learning', desc: 'Access personalized courses tailored just for you' },
            ].map((item, index) => (
              <div key={item.step} className="text-center animate-fade-in" style={{ animationDelay: `${0.1 * index}s` }}>
                <div className="w-16 h-16 mx-auto mb-4 gradient-primary rounded-2xl flex items-center justify-center">
                  <span className="text-2xl font-display font-bold text-primary-foreground">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                Everything you need to succeed
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our platform provides all the tools and features you need to accelerate 
                your learning and achieve your educational goals.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={benefit} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${0.05 * index}s` }}>
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl flex items-center justify-center">
                <div className="p-8 bg-card rounded-2xl shadow-2xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
                      <Brain className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Your Learning Progress</h4>
                      <p className="text-sm text-muted-foreground">AI-Optimized Path</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {['Introduction', 'Core Concepts', 'Advanced Topics'].map((item, i) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${i === 0 ? 'bg-success' : i === 1 ? 'bg-warning' : 'bg-muted'}`}>
                          {i === 0 ? <CheckCircle className="w-4 h-4 text-success-foreground" /> : <span className="text-xs font-medium">{i + 1}</span>}
                        </div>
                        <span className={i === 0 ? 'line-through text-muted-foreground' : ''}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <Card className="border-0 gradient-primary overflow-hidden relative">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-40 h-40 bg-primary-foreground rounded-full blur-3xl" />
              <div className="absolute bottom-10 right-10 w-60 h-60 bg-primary-foreground rounded-full blur-3xl" />
            </div>
            <CardContent className="p-12 text-center relative z-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
                Ready to Transform Your Learning?
              </h2>
              <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
                Join thousands of learners who are already experiencing the power of AI-driven education.
              </p>
              <Button size="xl" variant="secondary" onClick={() => navigate('/auth')}>
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 gradient-primary rounded-xl">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">AdaptLearn</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 AdaptLearn. Empowering education through AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
