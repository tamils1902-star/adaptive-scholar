import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, ArrowLeft, TrendingUp, Clock, Target, Zap, Activity, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface PerformanceData {
  totalStudyTime: number;
  lessonsCompleted: number;
  quizzesAttempted: number;
  averageScore: number;
  currentStreak: number;
  weeklyProgress: { day: string; score: number; time: number }[];
  recentActivities: { type: string; title: string; time: string; score?: number }[];
}

export default function PerformanceTracking() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    totalStudyTime: 0,
    lessonsCompleted: 0,
    quizzesAttempted: 0,
    averageScore: 0,
    currentStreak: 0,
    weeklyProgress: [],
    recentActivities: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPerformanceData();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel('performance-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'performance_logs',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchPerformanceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchPerformanceData = async () => {
    if (!user) return;

    // Fetch lesson progress
    const { data: lessonProgress } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id);

    // Fetch quiz attempts
    const { data: quizAttempts } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', user.id)
      .order('attempted_at', { ascending: false });

    // Calculate stats
    const completedLessons = lessonProgress?.filter((l) => l.completed).length || 0;
    const totalStudyTime = lessonProgress?.reduce((acc, l) => acc + (l.time_spent_seconds || 0), 0) || 0;
    const avgScore = quizAttempts?.length
      ? quizAttempts.reduce((acc, q) => acc + q.score, 0) / quizAttempts.length
      : 0;

    // Generate weekly progress data
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weeklyProgress = days.map((day, idx) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - idx));
      const dayAttempts = quizAttempts?.filter((q) => {
        const attemptDate = new Date(q.attempted_at);
        return attemptDate.toDateString() === date.toDateString();
      });
      return {
        day,
        score: dayAttempts?.length ? dayAttempts.reduce((acc, q) => acc + q.score, 0) / dayAttempts.length : 0,
        time: Math.floor(Math.random() * 60) + 10, // Placeholder for actual time tracking
      };
    });

    // Recent activities
    const recentActivities = quizAttempts?.slice(0, 5).map((q) => ({
      type: 'quiz',
      title: 'Quiz Attempt',
      time: new Date(q.attempted_at).toLocaleDateString(),
      score: q.score,
    })) || [];

    setPerformanceData({
      totalStudyTime: Math.floor(totalStudyTime / 60),
      lessonsCompleted: completedLessons,
      quizzesAttempted: quizAttempts?.length || 0,
      averageScore: Math.round(avgScore),
      currentStreak: Math.floor(Math.random() * 7) + 1, // Placeholder for streak calculation
      weeklyProgress,
      recentActivities,
    });

    setIsLoading(false);
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
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="p-2 gradient-primary rounded-xl">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">Performance Tracking</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
            <span className="text-sm text-muted-foreground">Real-time</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Your Performance 📊</h1>
          <p className="text-muted-foreground">Track your learning progress in real-time</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-xs text-success">Live</span>
              </div>
              <p className="text-2xl font-bold">{performanceData.totalStudyTime}m</p>
              <p className="text-xs text-muted-foreground">Total Study Time</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <p className="text-2xl font-bold">{performanceData.lessonsCompleted}</p>
              <p className="text-xs text-muted-foreground">Lessons Completed</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-5 h-5 text-warning" />
              </div>
              <p className="text-2xl font-bold">{performanceData.averageScore}%</p>
              <p className="text-xs text-muted-foreground">Average Score</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-5 h-5 text-success" />
              </div>
              <p className="text-2xl font-bold">{performanceData.currentStreak}</p>
              <p className="text-xs text-muted-foreground">Day Streak 🔥</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Progress Chart */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Weekly Score Trend
              </CardTitle>
              <CardDescription>Your quiz scores over the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData.weeklyProgress}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorScore)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" />
                Recent Activities
              </CardTitle>
              <CardDescription>Your latest learning activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceData.recentActivities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No recent activities. Start learning!
                  </p>
                ) : (
                  performanceData.recentActivities.map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <BarChart3 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{activity.title}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                      {activity.score !== undefined && (
                        <span className={`text-sm font-bold ${activity.score >= 70 ? 'text-success' : 'text-warning'}`}>
                          {activity.score}%
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Learning Progress */}
          <Card className="border-0 shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle>Learning Progress by Category</CardTitle>
              <CardDescription>Your progress across different areas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Course Completion</span>
                    <span>{Math.min(100, performanceData.lessonsCompleted * 10)}%</span>
                  </div>
                  <Progress value={Math.min(100, performanceData.lessonsCompleted * 10)} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Quiz Performance</span>
                    <span>{performanceData.averageScore}%</span>
                  </div>
                  <Progress value={performanceData.averageScore} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Engagement Level</span>
                    <span>{Math.min(100, performanceData.totalStudyTime)}%</span>
                  </div>
                  <Progress value={Math.min(100, performanceData.totalStudyTime)} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
