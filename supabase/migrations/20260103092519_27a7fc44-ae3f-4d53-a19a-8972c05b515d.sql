-- Drop existing trigger on auth.users first
DROP TRIGGER IF EXISTS assign_admin_on_signup ON auth.users;

-- Now drop the function
DROP FUNCTION IF EXISTS public.assign_admin_role_if_match() CASCADE;

-- Create new function with updated admin email
CREATE OR REPLACE FUNCTION public.assign_admin_role_if_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the new user's email matches the admin email
  IF NEW.email = 'tamilselvanit166@gmail.com' THEN
    -- Update user role to admin
    UPDATE public.user_roles 
    SET role = 'admin' 
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new signups
CREATE TRIGGER assign_admin_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_admin_role_if_match();

-- Create certificates table
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL,
  certificate_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completion_percentage INTEGER NOT NULL DEFAULT 100,
  final_score INTEGER,
  certificate_url TEXT
);

-- Enable RLS on certificates
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- RLS policies for certificates
CREATE POLICY "Users can view their own certificates"
ON public.certificates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create certificates"
ON public.certificates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all certificates"
ON public.certificates FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create exam_sessions table for secure exam environment
CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  tab_switches INTEGER DEFAULT 0,
  fullscreen_exits INTEGER DEFAULT 0,
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT
);

-- Enable RLS on exam_sessions
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for exam_sessions
CREATE POLICY "Users can manage their own exam sessions"
ON public.exam_sessions FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all exam sessions"
ON public.exam_sessions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create performance_logs table for real-time tracking
CREATE TABLE IF NOT EXISTS public.performance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on performance_logs
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for performance_logs
CREATE POLICY "Users can manage their own performance logs"
ON public.performance_logs FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all performance logs"
ON public.performance_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for performance tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_logs;