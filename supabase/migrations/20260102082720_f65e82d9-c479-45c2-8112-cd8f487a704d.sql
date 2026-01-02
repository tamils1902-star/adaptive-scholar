-- Drop the old trigger and function
DROP TRIGGER IF EXISTS assign_admin_on_signup ON auth.users;
DROP FUNCTION IF EXISTS public.assign_admin_role_if_match();

-- Create updated function with new admin email
CREATE OR REPLACE FUNCTION public.assign_admin_role_if_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'tamilselvanvsb2006@gmail.com' THEN
    UPDATE public.user_roles 
    SET role = 'admin' 
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER assign_admin_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_admin_role_if_match();