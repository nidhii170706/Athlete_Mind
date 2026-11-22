-- ===========================================================================
-- AthleteMind Care Portal - Supabase Auth & Profile Synchronization Fix
-- File: supabase/migrations/20261122_fix_profiles_and_auth_trigger.sql
--
-- Instructions:
-- Copy and run this script in your Supabase Project Dashboard -> SQL Editor -> New Query.
--
-- What this does:
-- 1. Ensures public.profiles table exists with Row Level Security (RLS) enabled.
-- 2. Adds the missing RLS INSERT policy so authenticated users can only write their own profile (auth.uid() = id).
-- 3. Creates a secure trigger (SECURITY DEFINER) on auth.users to automatically provision or sync a public.profiles record whenever a user signs up.
-- 4. Backfills any existing users in auth.users who currently lack a profile.
-- ===========================================================================

-- 1. Ensure public.profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'physiotherapist')),
  qualification TEXT,            -- Physiotherapist only: e.g. DPT, PT, MSPT, OCS
  area_of_practice TEXT,         -- Physiotherapist only: e.g. Sports Orthopaedics, Knee/ACL
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure RLS is active
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for Profiles
DO $$
BEGIN
  -- Read own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can read their own profile'
  ) THEN
    CREATE POLICY "Users can read their own profile"
      ON public.profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;

  -- Insert own profile (restricted to authenticated user's own id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
      ON public.profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;

  -- Update own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END $$;

-- 3. Secure Trigger Function to Auto-Create/Sync Profile on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role TEXT;
  user_full_name TEXT;
  user_qualification TEXT;
  user_area_of_practice TEXT;
  user_is_verified BOOLEAN;
BEGIN
  -- Determine role (default to patient if not specified or invalid)
  assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
  IF assigned_role NOT IN ('patient', 'physiotherapist') THEN
    assigned_role := 'patient';
  END IF;

  -- Determine full name
  user_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );

  -- Clinical metadata
  user_qualification := NEW.raw_user_meta_data->>'qualification';
  user_area_of_practice := NEW.raw_user_meta_data->>'area_of_practice';
  
  -- Physiotherapists start unverified until audited; patients start active
  user_is_verified := CASE
    WHEN assigned_role = 'physiotherapist' THEN FALSE
    ELSE TRUE
  END;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    qualification,
    area_of_practice,
    is_verified,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    assigned_role,
    user_qualification,
    user_area_of_practice,
    user_is_verified,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    qualification = COALESCE(EXCLUDED.qualification, public.profiles.qualification),
    area_of_practice = COALESCE(EXCLUDED.area_of_practice, public.profiles.area_of_practice),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Attach Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill any existing users in auth.users who lack a profile
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  qualification,
  area_of_practice,
  is_verified,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.email,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)),
  CASE
    WHEN u.raw_user_meta_data->>'role' IN ('patient', 'physiotherapist') THEN u.raw_user_meta_data->>'role'
    ELSE 'patient'
  END,
  u.raw_user_meta_data->>'qualification',
  u.raw_user_meta_data->>'area_of_practice',
  CASE
    WHEN u.raw_user_meta_data->>'role' = 'physiotherapist' THEN FALSE
    ELSE TRUE
  END,
  COALESCE(u.created_at, NOW()),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;
