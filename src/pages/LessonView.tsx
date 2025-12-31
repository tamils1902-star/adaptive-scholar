import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  BookOpen,
  FileQuestion
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  course_id: string;
  order_index: number;
  duration_minutes: number | null;
  difficulty: string;
}

interface Quiz {
  id: string;
  title: string;
  difficulty: string;
  passing_score: number;
}

interface Course {
  id: string;
  title: string;
}

export default function LessonView() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && lessonId) {
      fetchLessonData();
    }
  }, [user, lessonId]);

  const fetchLessonData = async () => {
    if (!user || !lessonId) return;
    
    setIsLoading(true);

    // Fetch lesson details
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .maybeSingle();

    if (lessonError || !lessonData) {
      toast({
        title: 'Error',
        description: 'Lesson not found.',
        variant: 'destructive',
      });
      navigate('/courses');
      return;
    }

    setLesson(lessonData);

    // Fetch course
    const { data: courseData } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', lessonData.course_id)
      .maybeSingle();

    if (courseData) {
      setCourse(courseData);
    }

    // Fetch all lessons for navigation
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', lessonData.course_id)
      .order('order_index', { ascending: true });

    if (lessonsData) {
      setAllLessons(lessonsData);
    }

    // Check completion status
    const { data: progressData } = await supabase
      .from('lesson_progress')
      .select('completed')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (progressData) {
      setIsCompleted(progressData.completed || false);
    }

    // Fetch quiz for this lesson
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (quizData) {
      setQuiz(quizData);
    }

    setIsLoading(false);
  };

  const handleMarkComplete = async () => {
    if (!user || !lessonId || !lesson) return;

    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    // Upsert lesson progress
    const { error } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
        time_spent_seconds: timeSpent,
      }, {
        onConflict: 'user_id,lesson_id'
      });

    if (error) {
      // Try insert if upsert fails
      await supabase
        .from('lesson_progress')
        .insert({
          user_id: user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
          time_spent_seconds: timeSpent,
        });
    }

    // Update enrollment progress
    const completedLessons = allLessons.filter(l => l.id === lessonId).length + 
      (await supabase
        .from('lesson_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('lesson_id', allLessons.map(l => l.id))
      ).data?.length || 0;

    const progress = Math.round((completedLessons / allLessons.length) * 100);

    await supabase
      .from('enrollments')
      .update({ progress_percentage: progress })
      .eq('user_id', user.id)
      .eq('course_id', lesson.course_id);

    // Add points to profile
    await supabase
      .from('profiles')
      .update({ 
        total_points: supabase.rpc ? undefined : undefined
      })
      .eq('id', user.id);

    setIsCompleted(true);
    toast({
      title: 'Lesson completed!',
      description: 'Great job! Keep up the good work.',
    });
  };

  const getCurrentLessonIndex = () => {
    return allLessons.findIndex(l => l.id === lessonId);
  };

  const navigateToLesson = (direction: 'prev' | 'next') => {
    const currentIndex = getCurrentLessonIndex();
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (newIndex >= 0 && newIndex < allLessons.length) {
      navigate(`/lesson/${allLessons[newIndex].id}`);
    }
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

  if (!lesson) {
    return null;
  }

  const currentIndex = getCurrentLessonIndex();
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allLessons.length - 1;
  const progressValue = ((currentIndex + 1) / allLessons.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/course/${lesson.course_id}`)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 gradient-primary rounded-xl">
                  <Brain className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{course?.title}</p>
                  <p className="font-medium">Lesson {currentIndex + 1} of {allLessons.length}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {lesson.duration_minutes || 10} min
              </div>
              <Badge variant="outline" className={getDifficultyColor(lesson.difficulty)}>
                {lesson.difficulty}
              </Badge>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress value={progressValue} className="h-1" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Lesson Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">{lesson.title}</h1>
          {isCompleted && (
            <Badge className="bg-success/10 text-success border-success/20">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Completed
            </Badge>
          )}
        </div>

        {/* Lesson Content */}
        <Card className="border-0 shadow-lg mb-8">
          <CardContent className="p-8">
            <div className="prose prose-slate dark:prose-invert max-w-none">
              {lesson.content ? (
                <div className="whitespace-pre-wrap">
                  {lesson.content.split('\n').map((line, index) => {
                    if (line.startsWith('## ')) {
                      return <h2 key={index} className="text-xl font-display font-bold mt-6 mb-3">{line.replace('## ', '')}</h2>;
                    }
                    if (line.startsWith('# ')) {
                      return <h1 key={index} className="text-2xl font-display font-bold mt-6 mb-3">{line.replace('# ', '')}</h1>;
                    }
                    if (line.startsWith('```')) {
                      return null; // Handle code blocks separately
                    }
                    if (line.startsWith('- **')) {
                      const match = line.match(/- \*\*(.+?)\*\*: (.+)/);
                      if (match) {
                        return (
                          <div key={index} className="flex gap-2 my-2">
                            <span className="font-semibold">{match[1]}:</span>
                            <span>{match[2]}</span>
                          </div>
                        );
                      }
                    }
                    if (line.startsWith('- ')) {
                      return <li key={index} className="ml-4">{line.replace('- ', '')}</li>;
                    }
                    if (line.match(/^\d+\. /)) {
                      return <li key={index} className="ml-4 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
                    }
                    if (line.trim() === '') {
                      return <br key={index} />;
                    }
                    return <p key={index} className="my-2">{line}</p>;
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">No content available for this lesson.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quiz Section */}
        {quiz && (
          <Card className="border-0 shadow-lg mb-8 gradient-hero">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-primary" />
                Quiz Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Test your knowledge with a quiz! Pass score: {quiz.passing_score}%
              </p>
              <Button variant="gradient" onClick={() => navigate(`/quiz/${quiz.id}`)}>
                Take Quiz
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => navigateToLesson('prev')}
            disabled={!hasPrev}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous Lesson
          </Button>

          {!isCompleted ? (
            <Button variant="gradient" onClick={handleMarkComplete}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark as Complete
            </Button>
          ) : hasNext ? (
            <Button variant="gradient" onClick={() => navigateToLesson('next')}>
              Next Lesson
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button variant="gradient" onClick={() => navigate(`/course/${lesson.course_id}`)}>
              Back to Course
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => navigateToLesson('next')}
            disabled={!hasNext}
          >
            Next Lesson
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
}
