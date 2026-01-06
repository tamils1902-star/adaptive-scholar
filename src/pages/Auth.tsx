import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Brain, BookOpen, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const resetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const newPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const isPasswordReset = searchParams.get('reset') === 'true';
  
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const { signIn, signUp, user, role, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user && !isPasswordReset) {
      // Redirect admin users to admin page, students to dashboard
      if (role === 'admin') {
        navigate('/admin');
      } else if (role) {
        navigate('/dashboard');
      }
    }
  }, [user, role, navigate, isPasswordReset]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. If you are new, please Sign Up first.'
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'Successfully signed in.',
      });
      // Navigation will be handled by useEffect when role is fetched
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signUpSchema.safeParse({ 
      fullName: signUpName, 
      email: signUpEmail, 
      password: signUpPassword 
    });
    
    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signUpEmail, signUpPassword, signUpName);
    setIsLoading(false);

    if (error) {
      const errorMessage = error.message.includes('already registered')
        ? 'This email is already registered. Please login instead.'
        : error.message;
      
      toast({
        title: 'Sign Up Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account created!',
        description: 'Welcome to the Adaptive Learning System.',
      });
      navigate('/dashboard');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = resetSchema.safeParse({ email: resetEmail });
    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await resetPassword(resetEmail);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Email Sent!',
        description: 'Check your email for the password reset link.',
      });
      setShowForgotPassword(false);
      setResetEmail('');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = newPasswordSchema.safeParse({ password: newPassword, confirmPassword });
    if (!validation.success) {
      toast({
        title: 'Validation Error',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await updatePassword(newPassword);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Password Updated!',
        description: 'You can now login with your new password.',
      });
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary-foreground rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-foreground rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-foreground/10 rounded-xl backdrop-blur-sm">
              <Brain className="w-8 h-8 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-bold text-primary-foreground">AdaptLearn</span>
          </div>
          <p className="text-primary-foreground/80 mt-2">AI-Powered Adaptive Learning</p>
        </div>
        
        <div className="relative z-10 space-y-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-foreground/10 rounded-xl backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary-foreground mb-1">Personalized Learning</h3>
              <p className="text-primary-foreground/70">AI adapts content to your learning pace and style</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-foreground/10 rounded-xl backdrop-blur-sm">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary-foreground mb-1">Smart Recommendations</h3>
              <p className="text-primary-foreground/70">Get tailored course suggestions based on your progress</p>
            </div>
          </div>
        </div>
        
        <div className="relative z-10">
          <p className="text-primary-foreground/60 text-sm">
            © 2024 AdaptLearn. Empowering education through AI.
          </p>
        </div>
      </div>
      
      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="p-2 gradient-primary rounded-xl">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">AdaptLearn</span>
          </div>
          
          <Card className="border-0 shadow-xl">
            {/* Password Reset Mode */}
            {isPasswordReset ? (
              <>
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-display">Set New Password</CardTitle>
                  <CardDescription>Enter your new password below</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" variant="gradient" size="lg" disabled={isLoading}>
                      {isLoading ? 'Updating...' : 'Update Password'}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </form>
                </CardContent>
              </>
            ) : showForgotPassword ? (
              <>
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-display">Reset Password</CardTitle>
                  <CardDescription>Enter your email to receive a reset link</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" variant="gradient" size="lg" disabled={isLoading}>
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="w-full" 
                      onClick={() => setShowForgotPassword(false)}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back to Login
                    </Button>
                  </form>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-display">Welcome</CardTitle>
                  <CardDescription>Sign in to continue your learning journey</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="login" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="login">Login</TabsTrigger>
                      <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="login">
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email</Label>
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="you@example.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="login-password">Password</Label>
                            <button 
                              type="button"
                              onClick={() => setShowForgotPassword(true)}
                              className="text-sm text-primary hover:underline"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" variant="gradient" size="lg" disabled={isLoading}>
                          {isLoading ? 'Signing in...' : 'Sign In'}
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">
                          New here? Switch to the <span className="font-medium text-primary">Sign Up</span> tab to create an account.
                        </p>
                      </form>
                    </TabsContent>
                    
                    <TabsContent value="signup">
                      <form onSubmit={handleSignUp} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name">Full Name</Label>
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="John Doe"
                            value={signUpName}
                            onChange={(e) => setSignUpName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-email">Email</Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            value={signUpEmail}
                            onChange={(e) => setSignUpEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-password">Password</Label>
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="••••••••"
                            value={signUpPassword}
                            onChange={(e) => setSignUpPassword(e.target.value)}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" variant="gradient" size="lg" disabled={isLoading}>
                          {isLoading ? 'Creating account...' : 'Create Account'}
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">
                          For admin access, sign up with: <span className="font-medium">tamilselvanit166@gmail.com</span>
                        </p>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
