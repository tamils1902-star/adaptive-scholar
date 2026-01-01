
-- Allow users to insert their own recommendations (for the adaptive system)
CREATE POLICY "Users can create their own recommendations" 
ON public.recommendations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
