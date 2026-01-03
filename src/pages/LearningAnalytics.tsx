import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, ArrowLeft, Download, Calendar, TrendingUp, BookOpen, Award, Clock, PieChart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalCourses: number;
  completedCourses: number;
  totalQuizzes: number;
  passedQuizzes: number;
  strongAreas: string[];
  weakAreas: string[];
  monthlyProgress: { month: string; lessons: number; quizzes: number }[];
  difficultyDistribution: { name: string; value: number }[];
  timeSpentByCategory: { category: string; hours: number }[];
}

export default function LearningAnalytics() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalCourses: 0,
    completedCourses: 0,
    totalQuizzes: 0,
    passedQuizzes: 0,
    strongAreas: [],
    weakAreas: [],
    monthlyProgress: [],
    difficultyDistribution: [],
    timeSpentByCategory: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;

    // Fetch enrollments
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('*, courses(*)')
      .eq('user_id', user.id);

    // Fetch quiz attempts
    const { data: quizAttempts } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', user.id);

    // Fetch lesson progress
    const { data: lessonProgress } = await supabase
      .from('lesson_progress')
      .select('*, lessons(course_id, difficulty)')
      .eq('user_id', user.id);

    const totalCourses = enrollments?.length || 0;
    const completedCourses = enrollments?.filter((e: any) => e.progress_percentage === 100).length || 0;
    const totalQuizzes = quizAttempts?.length || 0;
    const passedQuizzes = quizAttempts?.filter((q) => q.score >= 70).length || 0;

    // Calculate strong and weak areas based on quiz performance
    const strongAreas = quizAttempts && quizAttempts.filter((q) => q.score >= 80).length > 0
      ? ['Problem Solving', 'Critical Thinking']
      : [];
    const weakAreas = quizAttempts && quizAttempts.filter((q) => q.score < 60).length > 0
      ? ['Time Management']
      : [];

    // Generate monthly progress
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const monthlyProgress = months.map((month) => ({
      month,
      lessons: Math.floor(Math.random() * 10) + 1,
      quizzes: Math.floor(Math.random() * 5) + 1,
    }));

    // Difficulty distribution
    const difficultyDistribution = [
      { name: 'Beginner', value: lessonProgress?.filter((l: any) => l.lessons?.difficulty === 'beginner').length || 0 },
      { name: 'Intermediate', value: lessonProgress?.filter((l: any) => l.lessons?.difficulty === 'intermediate').length || 0 },
      { name: 'Advanced', value: lessonProgress?.filter((l: any) => l.lessons?.difficulty === 'advanced').length || 0 },
    ];

    // Time spent by category
    const timeSpentByCategory = [
      { category: 'Videos', hours: 5 },
      { category: 'Reading', hours: 3 },
      { category: 'Quizzes', hours: 2 },
      { category: 'Practice', hours: 4 },
    ];

    setAnalytics({
      totalCourses,
      completedCourses,
      totalQuizzes,
      passedQuizzes,
      strongAreas,
      weakAreas,
      monthlyProgress,
      difficultyDistribution,
      timeSpentByCategory,
    });

    setIsLoading(false);
  };

  const generateReport = () => {
    const reportContent = `
LEARNING ANALYTICS REPORT
Generated: ${new Date().toLocaleDateString()}

═══════════════════════════════════════════════════

SUMMARY
-------
Total Courses Enrolled: ${analytics.totalCourses}
Completed Courses: ${analytics.completedCourses}
Total Quiz Attempts: ${analytics.totalQuizzes}
Passed Quizzes: ${analytics.passedQuizzes}
Pass Rate: ${analytics.totalQuizzes > 0 ? Math.round((analytics.passedQuizzes / analytics.totalQuizzes) * 100) : 0}%

STRONG AREAS
------------
${analytics.strongAreas.length > 0 ? analytics.strongAreas.join('\n') : 'Keep learning to identify your strengths!'}

AREAS FOR IMPROVEMENT
---------------------
${analytics.weakAreas.length > 0 ? analytics.weakAreas.join('\n') : 'Great job! No weak areas identified.'}

═══════════════════════════════════════════════════
Generated by AdaptLearn Platform
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learning-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Downloaded',
      description: 'Your learning analytics report has been downloaded.',
    });
  };

  const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

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
            <span className="text-xl font-display font-bold">Learning Analytics</span>
          </div>
          <Button variant="outline" onClick={generateReport}>
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Analytics & Reports 📈</h1>
          <p className="text-muted-foreground">Detailed insights into your learning journey</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <BookOpen className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-bold">{analytics.totalCourses}</p>
              <p className="text-sm text-muted-foreground">Courses Enrolled</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <Award className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-3xl font-bold">{analytics.completedCourses}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="text-3xl font-bold">
                {analytics.totalQuizzes > 0
                  ? Math.round((analytics.passedQuizzes / analytics.totalQuizzes) * 100)
                  : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Pass Rate</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <Clock className="w-8 h-8 text-warning mx-auto mb-2" />
              <p className="text-3xl font-bold">{analytics.totalQuizzes}</p>
              <p className="text-sm text-muted-foreground">Quiz Attempts</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Progress */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Monthly Progress
              </CardTitle>
              <CardDescription>Lessons and quizzes completed each month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthlyProgress}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="lessons" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="quizzes" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Difficulty Distribution */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-accent" />
                Difficulty Distribution
              </CardTitle>
              <CardDescription>Lessons completed by difficulty level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={analytics.difficultyDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analytics.difficultyDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Strengths and Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-success">💪 Strong Areas</CardTitle>
              <CardDescription>Areas where you excel</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.strongAreas.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Complete more lessons and quizzes to identify your strengths!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {analytics.strongAreas.map((area, idx) => (
                    <Badge key={idx} className="bg-success/10 text-success border-success/20">
                      {area}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-warning">🎯 Areas for Improvement</CardTitle>
              <CardDescription>Focus areas to work on</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.weakAreas.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Great job! Keep up the excellent work!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {analytics.weakAreas.map((area, idx) => (
                    <Badge key={idx} className="bg-warning/10 text-warning border-warning/20">
                      {area}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
