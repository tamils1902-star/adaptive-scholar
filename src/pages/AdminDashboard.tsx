import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  BookOpen, 
  Users, 
  BarChart3, 
  Plus, 
  ArrowLeft,
  Trash2,
  Edit,
  LogOut,
  TrendingUp,
  GraduationCap,
  User,
  Mail,
  Calendar
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Course {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  category: string | null;
  is_published: boolean;
  created_at: string;
}

interface Student {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  enrollments_count: number;
}

interface Enrollment {
  id: string;
  user_email: string;
  user_name: string | null;
  course_title: string;
  enrolled_at: string;
  progress_percentage: number;
}

interface AdminStats {
  totalCourses: number;
  totalStudents: number;
  totalEnrollments: number;
  publishedCourses: number;
}

export default function AdminDashboard() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<AdminStats>({
    totalCourses: 0,
    totalStudents: 0,
    totalEnrollments: 0,
    publishedCourses: 0,
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [adminProfile, setAdminProfile] = useState<{ email: string; full_name: string | null } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<'courses' | 'students' | 'enrollments'>('courses');
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [category, setCategory] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (role !== 'admin') {
        navigate('/dashboard');
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges.',
          variant: 'destructive',
        });
      }
    }
  }, [user, role, loading, navigate, toast]);

  useEffect(() => {
    if (role === 'admin') {
      fetchAdminData();
    }
  }, [role]);

  const fetchAdminData = async () => {
    // Fetch admin profile
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single();
      
      if (profileData) {
        setAdminProfile(profileData);
      }
    }

    // Fetch courses
    const { data: coursesData } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (coursesData) {
      setCourses(coursesData);
      setStats(prev => ({
        ...prev,
        totalCourses: coursesData.length,
        publishedCourses: coursesData.filter(c => c.is_published).length,
      }));
    }

    // Fetch students with enrollment counts
    const { data: studentsData } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .order('created_at', { ascending: false });

    if (studentsData) {
      // Get enrollment counts for each student
      const studentsWithEnrollments = await Promise.all(
        studentsData.map(async (student) => {
          const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', student.id);
          
          return {
            ...student,
            enrollments_count: count || 0,
          };
        })
      );
      setStudents(studentsWithEnrollments);
    }

    // Fetch students count (excluding admin)
    const { count: studentsCount } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student');

    if (studentsCount !== null) {
      setStats(prev => ({
        ...prev,
        totalStudents: studentsCount,
      }));
    }

    // Fetch enrollments with details
    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select('id, enrolled_at, progress_percentage, course_id, user_id')
      .order('enrolled_at', { ascending: false });

    if (enrollmentsData) {
      // Get course and user details for each enrollment
      const enrichedEnrollments = await Promise.all(
        enrollmentsData.map(async (enrollment) => {
          const { data: courseData } = await supabase
            .from('courses')
            .select('title')
            .eq('id', enrollment.course_id)
            .single();
          
          const { data: userData } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', enrollment.user_id)
            .single();

          return {
            id: enrollment.id,
            user_email: userData?.email || 'Unknown',
            user_name: userData?.full_name || null,
            course_title: courseData?.title || 'Unknown Course',
            enrolled_at: enrollment.enrolled_at,
            progress_percentage: enrollment.progress_percentage || 0,
          };
        })
      );
      setEnrollments(enrichedEnrollments);
      setStats(prev => ({
        ...prev,
        totalEnrollments: enrichedEnrollments.length,
      }));
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDifficulty('beginner');
    setCategory('');
    setIsPublished(false);
    setEditingCourse(null);
  };

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setTitle(course.title);
    setDescription(course.description || '');
    setDifficulty(course.difficulty);
    setCategory(course.category || '');
    setIsPublished(course.is_published);
    setIsDialogOpen(true);
  };

  const handleSaveCourse = async () => {
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Course title is required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    if (editingCourse) {
      // Update existing course
      const { error } = await supabase
        .from('courses')
        .update({
          title,
          description,
          difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
          category,
          is_published: isPublished,
        })
        .eq('id', editingCourse.id);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Course updated',
          description: 'The course has been updated successfully.',
        });
        fetchAdminData();
      }
    } else {
      // Create new course
      const { error } = await supabase
        .from('courses')
        .insert({
          title,
          description,
          difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
          category,
          is_published: isPublished,
          created_by: user?.id,
        });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Course created',
          description: 'The course has been created successfully.',
        });
        fetchAdminData();
      }
    }

    setIsSaving(false);
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Course deleted',
        description: 'The course has been deleted.',
      });
      fetchAdminData();
    }
  };

  const handleTogglePublish = async (courseId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('courses')
      .update({ is_published: !currentStatus })
      .eq('id', courseId);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      fetchAdminData();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading || role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 gradient-primary rounded-xl">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <span className="text-xl font-display font-bold">AdaptLearn</span>
                <Badge variant="secondary" className="ml-2">Admin</Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {adminProfile && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{adminProfile.full_name || adminProfile.email}</span>
              </div>
            )}
            <Button variant="outline" onClick={() => navigate('/admin/analytics')}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage courses, students, and monitor platform activity</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Courses</p>
                  <p className="text-3xl font-display font-bold">{stats.totalCourses}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Published</p>
                  <p className="text-3xl font-display font-bold">{stats.publishedCourses}</p>
                </div>
                <div className="p-3 bg-success/10 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Students</p>
                  <p className="text-3xl font-display font-bold">{stats.totalStudents}</p>
                </div>
                <div className="p-3 bg-accent/10 rounded-xl">
                  <Users className="w-6 h-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Enrollments</p>
                  <p className="text-3xl font-display font-bold">{stats.totalEnrollments}</p>
                </div>
                <div className="p-3 bg-warning/10 rounded-xl">
                  <GraduationCap className="w-6 h-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="courses" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Enrollments
            </TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Course Management</CardTitle>
                    <CardDescription>Create, edit, and manage your courses</CardDescription>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="gradient">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Course
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>{editingCourse ? 'Edit Course' : 'Create New Course'}</DialogTitle>
                        <DialogDescription>
                          {editingCourse ? 'Update the course details below.' : 'Fill in the details to create a new course.'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Course Title</Label>
                          <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Introduction to Programming"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="A comprehensive course covering..."
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="difficulty">Difficulty</Label>
                            <Select value={difficulty} onValueChange={setDifficulty}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="beginner">Beginner</SelectItem>
                                <SelectItem value="intermediate">Intermediate</SelectItem>
                                <SelectItem value="advanced">Advanced</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Input
                              id="category"
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              placeholder="Programming"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="published">Publish Course</Label>
                          <Switch
                            id="published"
                            checked={isPublished}
                            onCheckedChange={setIsPublished}
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button variant="gradient" onClick={handleSaveCourse} disabled={isSaving}>
                            {isSaving ? 'Saving...' : editingCourse ? 'Update' : 'Create'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {courses.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No courses yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first course to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courses.map((course) => (
                      <div key={course.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{course.title}</h4>
                              <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                                {course.difficulty}
                              </Badge>
                              {course.is_published ? (
                                <Badge className="bg-success/10 text-success border-success/20">Published</Badge>
                              ) : (
                                <Badge variant="outline">Draft</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {course.description || 'No description'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/admin/course/${course.id}/lessons`)}
                          >
                            Manage Lessons
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleTogglePublish(course.id, course.is_published)}
                          >
                            {course.is_published ? 'Unpublish' : 'Publish'}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(course)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCourse(course.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Registered Students</CardTitle>
                <CardDescription>View all students registered on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No students yet</h3>
                    <p className="text-muted-foreground">Students will appear here when they sign up.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Enrollments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <span className="font-medium">{student.full_name || 'No name'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="w-4 h-4" />
                              {student.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              {new Date(student.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{student.enrollments_count} courses</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enrollments Tab */}
          <TabsContent value="enrollments">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Course Enrollments</CardTitle>
                <CardDescription>View all course enrollments and student progress</CardDescription>
              </CardHeader>
              <CardContent>
                {enrollments.length === 0 ? (
                  <div className="text-center py-12">
                    <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No enrollments yet</h3>
                    <p className="text-muted-foreground">Enrollments will appear here when students join courses.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Enrolled On</TableHead>
                        <TableHead>Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{enrollment.user_name || 'No name'}</p>
                                <p className="text-xs text-muted-foreground">{enrollment.user_email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-primary" />
                              <span>{enrollment.course_title}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(enrollment.enrolled_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Progress value={enrollment.progress_percentage} className="w-20 h-2" />
                              <span className="text-sm text-muted-foreground">{enrollment.progress_percentage}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
