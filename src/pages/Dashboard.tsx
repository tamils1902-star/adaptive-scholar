import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  BookOpen, 
  Trophy, 
  TrendingUp, 
  Clock, 
  Play, 
  LogOut, 
  Sparkles,
  Target,
  Zap,
  GraduationCap
} from 'lucide-react';

interface CourseWithProgress {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  difficulty: string;
  category: string | null;
  progress: number;
  lessonsCompleted: number;
  totalLessons: number;
}

interface DashboardStats {
  enrolledCourses: number;
  completedLessons: number;
  totalPoints: number;
  averageScore: number;
  currentLevel: string;
}

export default function Dashboard() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    enrolledCourses: 0,
    completedLessons: 0,
    totalPoints: 0,
    averageScore: 0,
    currentLevel: 'beginner',
  });
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      setProfileName(profile.full_name || profile.email.split('@')[0]);
      setStats(prev => ({
        ...prev,
        totalPoints: profile.total_points || 0,
        currentLevel: profile.current_level || 'beginner',
      }));
    }

    // Fetch enrolled courses with progress
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses (*)
      `)
      .eq('user_id', user.id);

    if (enrollments) {
      const coursesWithProgress = enrollments.map((enrollment: any) => ({
        id: enrollment.courses.id,
        title: enrollment.courses.title,
        description: enrollment.courses.description,
        thumbnail_url: enrollment.courses.thumbnail_url,
        difficulty: enrollment.courses.difficulty,
        category: enrollment.courses.category,
        progress: enrollment.progress_percentage || 0,
        lessonsCompleted: 0,
        totalLessons: 0,
      }));
      setCourses(coursesWithProgress);
      setStats(prev => ({
        ...prev,
        enrolledCourses: enrollments.length,
      }));
    }

    // Fetch completed lessons count
    const { data: lessonProgress } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', true);

    if (lessonProgress) {
      setStats(prev => ({
        ...prev,
        completedLessons: lessonProgress.length,
      }));
    }

    // Fetch quiz attempts for average score
    const { data: quizAttempts } = await supabase
      .from('quiz_attempts')
      .select('score')
      .eq('user_id', user.id);

    if (quizAttempts && quizAttempts.length > 0) {
      const avgScore = quizAttempts.reduce((acc, curr) => acc + curr.score, 0) / quizAttempts.length;
      setStats(prev => ({
        ...prev,
        averageScore: Math.round(avgScore),
      }));
    }

    // Fetch recommendations
    const { data: recs } = await supabase
      .from('recommendations')
      .select(`
        *,
        courses (*),
        lessons (*)
      `)
      .eq('user_id', user.id)
      .eq('is_dismissed', false)
      .order('priority', { ascending: false })
      .limit(3);

    if (recs) {
      setRecommendations(recs);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 gradient-primary rounded-xl">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">AdaptLearn</span>
          </div>
          
          <div className="flex items-center gap-4">
            {role === 'admin' && (
              <Button variant="outline" onClick={() => navigate('/admin')}>
                Admin Panel
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center">
                <span className="text-sm font-semibold text-accent-foreground">
                  {profileName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:inline font-medium">{profileName}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">
            Welcome back, {profileName}! 👋
          </h1>
          <p className="text-muted-foreground">Continue your learning journey where you left off.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Enrolled Courses</p>
                  <p className="text-3xl font-display font-bold">{stats.enrolledCourses}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Lessons Completed</p>
                  <p className="text-3xl font-display font-bold">{stats.completedLessons}</p>
                </div>
                <div className="p-3 bg-accent/10 rounded-xl">
                  <GraduationCap className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Points</p>
                  <p className="text-3xl font-display font-bold">{stats.totalPoints}</p>
                </div>
                <div className="p-3 bg-warning/10 rounded-xl">
                  <Trophy className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Average Score</p>
                  <p className="text-3xl font-display font-bold">{stats.averageScore}%</p>
                </div>
                <div className="p-3 bg-success/10 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* My Courses */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold">My Courses</h2>
              <Button variant="ghost" onClick={() => navigate('/courses')}>
                Browse All
              </Button>
            </div>

            {courses.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">No courses yet</h3>
                  <p className="text-muted-foreground mb-4">Start your learning journey by enrolling in a course.</p>
                  <Button variant="gradient" onClick={() => navigate('/courses')}>
                    Explore Courses
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <Card key={course.id} className="border-0 shadow-lg hover:shadow-xl transition-all group cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-8 h-8 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{course.title}</h3>
                            <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                              {course.difficulty}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                            {course.description || 'No description available'}
                          </p>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <Progress value={course.progress} className="h-2" />
                            </div>
                            <span className="text-sm font-medium">{course.progress}%</span>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-5 h-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Current Level */}
            <Card className="border-0 shadow-lg gradient-hero">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Current Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={`text-sm ${getDifficultyColor(stats.currentLevel)}`}>
                  {stats.currentLevel.charAt(0).toUpperCase() + stats.currentLevel.slice(1)}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Keep learning to advance to the next level!
                </p>
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-warning" />
                  AI Recommendations
                </CardTitle>
                <CardDescription>Personalized for you</CardDescription>
              </CardHeader>
              <CardContent>
                {recommendations.length === 0 ? (
                  <div className="text-center py-4">
                    <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Complete more lessons to get personalized recommendations!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                        <p className="font-medium text-sm">
                          {rec.courses?.title || rec.lessons?.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-accent" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/courses')}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Browse Courses
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="w-4 h-4 mr-2" />
                  Continue Last Lesson
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
