-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create enum for difficulty levels
CREATE TYPE public.difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  current_level difficulty_level DEFAULT 'beginner',
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  difficulty difficulty_level DEFAULT 'beginner',
  category TEXT,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  duration_minutes INTEGER DEFAULT 10,
  difficulty difficulty_level DEFAULT 'beginner',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  difficulty difficulty_level DEFAULT 'beginner',
  passing_score INTEGER DEFAULT 70,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_questions table
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  points INTEGER DEFAULT 10,
  order_index INTEGER DEFAULT 0
);

-- Create enrollments table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  progress_percentage INTEGER DEFAULT 0,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (user_id, course_id)
);

-- Create lesson_progress table
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  time_spent_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (user_id, lesson_id)
);

-- Create quiz_attempts table
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  time_taken_seconds INTEGER,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recommendations table for AI-generated recommendations
CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  reason TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_dismissed BOOLEAN DEFAULT false
);

-- Enable Row Level Security on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for courses
CREATE POLICY "Anyone can view published courses"
  ON public.courses FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage all courses"
  ON public.courses FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for lessons
CREATE POLICY "Anyone can view lessons of published courses"
  ON public.lessons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lessons.course_id AND courses.is_published = true
  ));

CREATE POLICY "Admins can manage all lessons"
  ON public.lessons FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for quizzes
CREATE POLICY "Anyone can view quizzes of published courses"
  ON public.quizzes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = quizzes.lesson_id AND c.is_published = true
  ));

CREATE POLICY "Admins can manage all quizzes"
  ON public.quizzes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for quiz_questions
CREATE POLICY "Anyone can view quiz questions"
  ON public.quiz_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.lessons l ON l.id = q.lesson_id
    JOIN public.courses c ON c.id = l.course_id
    WHERE q.id = quiz_questions.quiz_id AND c.is_published = true
  ));

CREATE POLICY "Admins can manage quiz questions"
  ON public.quiz_questions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for enrollments
CREATE POLICY "Users can view their own enrollments"
  ON public.enrollments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll themselves"
  ON public.enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollments"
  ON public.enrollments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all enrollments"
  ON public.enrollments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for lesson_progress
CREATE POLICY "Users can manage their own progress"
  ON public.lesson_progress FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.lesson_progress FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for quiz_attempts
CREATE POLICY "Users can manage their own attempts"
  ON public.quiz_attempts FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts"
  ON public.quiz_attempts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for recommendations
CREATE POLICY "Users can view their own recommendations"
  ON public.recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can dismiss their own recommendations"
  ON public.recommendations FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();