-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, is_online, last_seen, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    false,
    now(),
    now(),
    now()
  );
  RETURN new;
END;
$$;

-- Create trigger to run on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert missing profiles for existing users
INSERT INTO public.profiles (id, name, email, is_online, last_seen, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data ->> 'name', split_part(au.email, '@', 1)),
  au.email,
  false,
  now(),
  now(),
  now()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;