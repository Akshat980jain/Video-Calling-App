-- Add phone_number and date_of_birth columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Update the handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone_number, date_of_birth, is_online, last_seen, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone_number',
    (new.raw_user_meta_data ->> 'date_of_birth')::date,
    false,
    now(),
    now(),
    now()
  );
  RETURN new;
END;
$$;