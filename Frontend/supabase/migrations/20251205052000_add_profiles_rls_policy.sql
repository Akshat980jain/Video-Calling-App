-- Add RLS policy to allow authenticated users to read all profiles
-- This fixes the 406 (Not Acceptable) error when querying the profiles table

-- First, ensure RLS is enabled on the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow users to read all profiles" ON profiles;

-- Create policy to allow authenticated users to read any profile
CREATE POLICY "Allow users to read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Also ensure users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile (for signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
