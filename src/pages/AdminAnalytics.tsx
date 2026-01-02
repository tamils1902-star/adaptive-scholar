import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Brain, 
  ArrowLeft,
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Trophy,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface AnalyticsStats {
  totalStudents: number;
  totalCourses: number;
  totalEnrollments: number;
  totalLessonsCompleted: number;
  totalQuizAttempts: number;
  averageQuizScore: number;
  publishedCourses: number;
}

interface EnrollmentByMonth {
  month: string;
  enrollments: number;
}

interface CourseEnrollment {
  name: string;
  enrollments: number;
}

interface DifficultyDistribution {
  name: string;
  value: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))'];

export default function AdminAnalytics() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AnalyticsStats>({
    totalStudents: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalLessonsCompleted: 0,
    totalQuizAttempts: 0,
    averageQuizScore: 0,
    publishedCourses: 0,
  });
  const [enrollmentsByMonth, setEnrollmentsByMonth] = useState<EnrollmentByMonth[]>([]);
  const [courseEnrollments, setCourseEnrollments] = useState<CourseEnrollment[]>([]);
  const [difficultyDistribution, setDifficultyDistribution] = useState<DifficultyDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      navigate('/dashboard');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (role === 'admin') {
      fetchAnalyticsData();
    }
  }, [role]);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);

    // Fetch total students (profiles count)
    const { count: studentCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Fetch total courses
    const { data: coursesData, count: courseCount } = await supabase
      .from('courses')
      .select('*', { count: 'exact' });

    const publishedCount = coursesData?.filter(c => c.is_published).length || 0;

    // Fetch total enrollments
    const { data: enrollmentsData, count: enrollmentCount } = await supabase
      .from('enrollments')
      .select('*, courses(title)', { count: 'exact' });

    // Fetch lessons completed
    const { count: lessonsCompletedCount } = await supabase
      .from('lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('completed', true);

    // Fetch quiz attempts
    const { data: quizAttemptsData, count: quizAttemptCount } = await supabase
      .from('quiz_attempts')
      .select('score', { count: 'exact' });

    const avgScore = quizAttemptsData && quizAttemptsData.length > 0
      ? Math.round(quizAttemptsData.reduce((acc, curr) => acc + curr.score, 0) / quizAttemptsData.length)
      : 0;

    setStats({
      totalStudents: studentCount || 0,
      totalCourses: courseCount || 0,
      totalEnrollments: enrollmentCount || 0,
      totalLessonsCompleted: lessonsCompletedCount || 0,
      totalQuizAttempts: quizAttemptCount || 0,
      averageQuizScore: avgScore,
      publishedCourses: publishedCount,
    });

    // Process enrollments by month
    if (enrollmentsData) {
      const monthlyData: Record<string, number> = {};
      enrollmentsData.forEach((enrollment: any) => {
        const date = new Date(enrollment.enrolled_at);
        const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      });

      const monthlyArray = Object.entries(monthlyData)
        .map(([month, enrollments]) => ({ month, enrollments }))
        .slice(-6);
      setEnrollmentsByMonth(monthlyArray);

      // Course enrollments
      const courseData: Record<string, number> = {};
      enrollmentsData.forEach((enrollment: any) => {
        const title = (enrollment.courses as any)?.title || 'Unknown';
        courseData[title] = (courseData[title] || 0) + 1;
      });

      const courseArray = Object.entries(courseData)
        .map(([name, enrollments]) => ({ name: name.substring(0, 20), enrollments }))
        .slice(0, 5);
      setCourseEnrollments(courseArray);
    }

    // Difficulty distribution
    if (coursesData) {
      const difficultyData: Record<string, number> = {
        beginner: 0,
        intermediate: 0,
        advanced: 0,
      };
      coursesData.forEach((course: any) => {
        const diff = course.difficulty || 'beginner';
        difficultyData[diff] = (difficultyData[diff] || 0) + 1;
      });

      setDifficultyDistribution([
        { name: 'Beginner', value: difficultyData.beginner },
        { name: 'Intermediate', value: difficultyData.intermediate },
        { name: 'Advanced', value: difficultyData.advanced },
      ]);
    }

    setIsLoading(false);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 gradient-primary rounded-xl">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <span className="text-xl font-display font-bold">Analytics Dashboard</span>
                <p className="text-sm text-muted-foreground">Platform performance insights</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Students</p>
                  <p className="text-3xl font-display font-bold">{stats.totalStudents}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Courses</p>
                  <p className="text-3xl font-display font-bold">{stats.totalCourses}</p>
                  <p className="text-xs text-muted-foreground">{stats.publishedCourses} published</p>
                </div>
                <div className="p-3 bg-accent/10 rounded-xl">
                  <BookOpen className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Enrollments</p>
                  <p className="text-3xl font-display font-bold">{stats.totalEnrollments}</p>
                </div>
                <div className="p-3 bg-warning/10 rounded-xl">
                  <GraduationCap className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Avg Quiz Score</p>
                  <p className="text-3xl font-display font-bold">{stats.averageQuizScore}%</p>
                  <p className="text-xs text-muted-foreground">{stats.totalQuizAttempts} attempts</p>
                </div>
                <div className="p-3 bg-success/10 rounded-xl">
                  <Trophy className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Lessons Completed</p>
                  <p className="text-3xl font-display font-bold">{stats.totalLessonsCompleted}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
                  <p className="text-3xl font-display font-bold">
                    {stats.totalEnrollments > 0 
                      ? Math.round((stats.totalLessonsCompleted / (stats.totalEnrollments * 5)) * 100) 
                      : 0}%
                  </p>
                </div>
                <div className="p-3 bg-accent/10 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Enrollments Over Time */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Enrollments Over Time
              </CardTitle>
              <CardDescription>Monthly enrollment trends</CardDescription>
            </CardHeader>
            <CardContent>
              {enrollmentsByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={enrollmentsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="enrollments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No enrollment data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course Difficulty Distribution */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-accent" />
                Course Difficulty Distribution
              </CardTitle>
              <CardDescription>Breakdown by difficulty level</CardDescription>
            </CardHeader>
            <CardContent>
              {difficultyDistribution.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={difficultyDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {difficultyDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No course data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Courses by Enrollment */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-warning" />
              Top Courses by Enrollment
            </CardTitle>
            <CardDescription>Most popular courses</CardDescription>
          </CardHeader>
          <CardContent>
            {courseEnrollments.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={courseEnrollments} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="name" className="text-xs" width={150} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="enrollments" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No enrollment data available
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
