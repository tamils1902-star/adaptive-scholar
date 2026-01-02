import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  ArrowLeft,
  User,
  Mail,
  Trophy,
  Target,
  Save,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  total_points: number | null;
  current_level: string | null;
}

export default function ProfileSettings() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load profile.',
        variant: 'destructive',
      });
      return;
    }

    if (data) {
      setProfile(data);
      setFullName(data.full_name || '');
      setAvatarUrl(data.avatar_url || '');
    }
    setIsLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully.',
      });
      setProfile(prev => prev ? { ...prev, full_name: fullName, avatar_url: avatarUrl } : null);
    }
    
    setIsSaving(false);
  };

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-success/10 text-success border-success/20';
      case 'intermediate':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'advanced':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 gradient-primary rounded-xl">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <span className="text-xl font-display font-bold">Profile Settings</span>
                <p className="text-sm text-muted-foreground">Manage your account</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Profile Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full gradient-accent flex items-center justify-center mb-4">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Profile" 
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <span className="text-3xl font-semibold text-accent-foreground">
                {(fullName || profile?.email || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h2 className="text-xl font-display font-bold">{fullName || 'User'}</h2>
          <p className="text-muted-foreground">{profile?.email}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <Trophy className="w-8 h-8 text-warning mx-auto mb-2" />
              <p className="text-2xl font-display font-bold">{profile?.total_points || 0}</p>
              <p className="text-sm text-muted-foreground">Total Points</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <Target className="w-8 h-8 text-primary mx-auto mb-2" />
              <Badge className={getDifficultyColor(profile?.current_level)}>
                {(profile?.current_level || 'beginner').charAt(0).toUpperCase() + 
                 (profile?.current_level || 'beginner').slice(1)}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">Current Level</p>
            </CardContent>
          </Card>
        </div>

        {/* Edit Form */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Edit Profile
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input 
                id="email" 
                type="email" 
                value={profile?.email || ''} 
                disabled 
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </Label>
              <Input 
                id="fullName" 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
              <Input 
                id="avatarUrl" 
                type="url" 
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
              <p className="text-xs text-muted-foreground">Enter a URL to your profile picture</p>
            </div>

            <Button 
              variant="gradient" 
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
