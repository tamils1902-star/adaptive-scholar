import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  BookOpen, 
  Search, 
  Filter, 
  ArrowLeft,
  Clock,
  Users,
  Play
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  difficulty: string;
  category: string | null;
  lessons_count?: number;
  enrolled?: boolean;
}

export default function Courses() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchCourses();
    if (user) {
      fetchEnrollments();
    }
  }, [user]);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
      return;
    }

    setCourses(data || []);
  };

  const fetchEnrollments = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('user_id', user.id);

    if (data) {
      setEnrolledCourseIds(new Set(data.map(e => e.course_id)));
    }
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setIsEnrolling(courseId);

    const { error } = await supabase
      .from('enrollments')
      .insert({
        user_id: user.id,
        course_id: courseId,
      });

    setIsEnrolling(null);

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Already enrolled',
          description: 'You are already enrolled in this course.',
        });
      } else {
        toast({
          title: 'Enrollment failed',
          description: error.message,
          variant: 'destructive',
        });
      }
      return;
    }

    setEnrolledCourseIds(prev => new Set([...prev, courseId]));
    toast({
      title: 'Enrolled successfully!',
      description: 'You can now access the course content.',
    });
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = !selectedDifficulty || course.difficulty === selectedDifficulty;
    return matchesSearch && matchesDifficulty;
  });

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

  if (loading) {
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
              <span className="text-xl font-display font-bold">AdaptLearn</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Explore Courses</h1>
          <p className="text-muted-foreground">Discover courses tailored to your learning goals</p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedDifficulty === null ? 'default' : 'outline'}
              onClick={() => setSelectedDifficulty(null)}
            >
              All
            </Button>
            <Button
              variant={selectedDifficulty === 'beginner' ? 'default' : 'outline'}
              onClick={() => setSelectedDifficulty('beginner')}
            >
              Beginner
            </Button>
            <Button
              variant={selectedDifficulty === 'intermediate' ? 'default' : 'outline'}
              onClick={() => setSelectedDifficulty('intermediate')}
            >
              Intermediate
            </Button>
            <Button
              variant={selectedDifficulty === 'advanced' ? 'default' : 'outline'}
              onClick={() => setSelectedDifficulty('advanced')}
            >
              Advanced
            </Button>
          </div>
        </div>

        {/* Courses Grid */}
        {filteredCourses.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No courses found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search terms' : 'Courses will appear here when available'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="border-0 shadow-lg hover:shadow-xl transition-all group overflow-hidden">
                <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-primary/40 group-hover:scale-110 transition-transform" />
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-1">{course.title}</CardTitle>
                    <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                      {course.difficulty}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {course.description || 'No description available'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    {course.category && (
                      <span className="flex items-center gap-1">
                        <Filter className="w-4 h-4" />
                        {course.category}
                      </span>
                    )}
                  </div>
                  
                  {enrolledCourseIds.has(course.id) ? (
                    <Button className="w-full" variant="accent" onClick={() => navigate(`/course/${course.id}`)}>
                      <Play className="w-4 h-4 mr-2" />
                      Continue Learning
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      variant="gradient"
                      disabled={isEnrolling === course.id}
                      onClick={() => handleEnroll(course.id)}
                    >
                      {isEnrolling === course.id ? 'Enrolling...' : 'Enroll Now'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
