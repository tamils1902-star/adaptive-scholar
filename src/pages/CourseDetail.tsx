import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  BookOpen, 
  ArrowLeft,
  Clock,
  Play,
  CheckCircle2,
  Lock,
  ChevronRight
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  category: string | null;
}

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  order_index: number;
  duration_minutes: number | null;
  difficulty: string;
  completed?: boolean;
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && courseId) {
      fetchCourseData();
    }
  }, [user, courseId]);

  const fetchCourseData = async () => {
    if (!user || !courseId) return;
    
    setIsLoading(true);

    // Fetch course details
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError || !courseData) {
      toast({
        title: 'Error',
        description: 'Course not found.',
        variant: 'destructive',
      });
      navigate('/courses');
      return;
    }

    setCourse(courseData);

    // Check enrollment
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();

    setIsEnrolled(!!enrollment);
    if (enrollment) {
      setProgressPercentage(enrollment.progress_percentage || 0);
    }

    // Fetch lessons
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (lessonsData) {
      // Fetch lesson progress
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', user.id);

      const progressMap = new Map(progressData?.map(p => [p.lesson_id, p.completed]) || []);

      const lessonsWithProgress = lessonsData.map(lesson => ({
        ...lesson,
        completed: progressMap.get(lesson.id) || false,
      }));

      setLessons(lessonsWithProgress);

      // Calculate progress
      if (lessonsWithProgress.length > 0) {
        const completedCount = lessonsWithProgress.filter(l => l.completed).length;
        const progress = Math.round((completedCount / lessonsWithProgress.length) * 100);
        setProgressPercentage(progress);
      }
    }

    setIsLoading(false);
  };

  const handleEnroll = async () => {
    if (!user || !courseId) return;

    const { error } = await supabase
      .from('enrollments')
      .insert({
        user_id: user.id,
        course_id: courseId,
      });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setIsEnrolled(true);
    toast({
      title: 'Enrolled successfully!',
      description: 'You can now access all lessons.',
    });
  };

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

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/courses')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 gradient-primary rounded-xl">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-bold">AdaptLearn</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Course Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                  {course.difficulty}
                </Badge>
                {course.category && (
                  <Badge variant="secondary">{course.category}</Badge>
                )}
              </div>
              <h1 className="text-3xl font-display font-bold mb-2">{course.title}</h1>
              <p className="text-muted-foreground max-w-2xl">{course.description}</p>
            </div>
            
            {!isEnrolled && (
              <Button variant="gradient" size="lg" onClick={handleEnroll}>
                Enroll Now
              </Button>
            )}
          </div>

          {isEnrolled && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Course Progress</span>
                <span className="text-sm text-muted-foreground">{progressPercentage}% complete</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
        </div>

        {/* Lessons List */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Course Content
            </CardTitle>
            <CardDescription>
              {lessons.length} lessons • {lessons.reduce((acc, l) => acc + (l.duration_minutes || 0), 0)} minutes total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lessons.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No lessons available yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-colors cursor-pointer ${
                      isEnrolled 
                        ? 'hover:bg-muted' 
                        : 'opacity-60'
                    } ${lesson.completed ? 'bg-success/5' : 'bg-muted/30'}`}
                    onClick={() => {
                      if (isEnrolled) {
                        navigate(`/lesson/${lesson.id}`);
                      }
                    }}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      lesson.completed 
                        ? 'bg-success text-success-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {lesson.completed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isEnrolled ? (
                        <Play className="w-4 h-4" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Lesson {index + 1}</span>
                        <Badge variant="outline" className={`text-xs ${getDifficultyColor(lesson.difficulty)}`}>
                          {lesson.difficulty}
                        </Badge>
                      </div>
                      <h4 className="font-medium truncate">{lesson.title}</h4>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {lesson.duration_minutes || 10} min
                      </span>
                      {isEnrolled && (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
