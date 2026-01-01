
-- Add unique constraint for lesson_progress to enable upsert
ALTER TABLE public.lesson_progress 
ADD CONSTRAINT lesson_progress_user_lesson_unique 
UNIQUE (user_id, lesson_id);
