-- ===========================================================================
-- AthleteMind Care Portal - Supabase Database Migration & RLS Policies
-- Sets up Profiles, Care Relationships, Care Plans, and Session Reports
-- ===========================================================================

-- 1. Create User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'physiotherapist')),
  qualification TEXT,            -- Physiotherapist only: e.g. DPT, PT, MSPT, OCS
  area_of_practice TEXT,         -- Physiotherapist only: e.g. Sports Orthopaedics, Knee/ACL
  is_verified BOOLEAN NOT NULL DEFAULT FALSE, -- Must be audited before granting patient access
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Physiotherapists can view profiles of their linked patients"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.care_relationships cr
      WHERE cr.therapist_id = auth.uid()
        AND cr.patient_id = public.profiles.id
        AND cr.status = 'active'
    )
  );

CREATE POLICY "Patients can view profile of their assigned physiotherapist"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.care_relationships cr
      WHERE cr.patient_id = auth.uid()
        AND cr.therapist_id = public.profiles.id
        AND cr.status = 'active'
    )
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. Care Relationships (Authorized Care Link between Physiotherapist and Patient)
CREATE TABLE IF NOT EXISTS public.care_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'revoked')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(therapist_id, patient_id)
);

ALTER TABLE public.care_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can see their own care relationships"
  ON public.care_relationships FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Physiotherapists can see their own care relationships"
  ON public.care_relationships FOR SELECT
  USING (auth.uid() = therapist_id);

-- 3. Care Plans (Prescribed Protocols & Drafts)
CREATE TABLE IF NOT EXISTS public.care_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  plan_title TEXT NOT NULL,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;

-- Care Plan RLS:
-- Patients can ONLY read their PUBLISHED care plans
CREATE POLICY "Patients can view published plans assigned to them"
  ON public.care_plans FOR SELECT
  USING (auth.uid() = patient_id AND status = 'published');

-- Verified Physiotherapists can read and write plans for their linked patients
CREATE POLICY "Verified Physiotherapists can manage plans for linked patients"
  ON public.care_plans FOR ALL
  USING (
    auth.uid() = therapist_id AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_verified = TRUE AND p.role = 'physiotherapist'
    ) AND
    EXISTS (
      SELECT 1 FROM public.care_relationships cr
      WHERE cr.therapist_id = auth.uid() AND cr.patient_id = public.care_plans.patient_id AND cr.status = 'active'
    )
  );

-- 4. Session Reports (Post-workout Debrief & Kinematics)
CREATE TABLE IF NOT EXISTS public.session_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.care_plans(id) ON DELETE SET NULL,
  session_date TEXT NOT NULL,
  session_title TEXT NOT NULL,
  performed_movements INTEGER NOT NULL DEFAULT 0,
  planned_movements INTEGER NOT NULL DEFAULT 0,
  met_target_and_hold INTEGER NOT NULL DEFAULT 0,
  early_releases INTEGER NOT NULL DEFAULT 0,
  tracking_pauses INTEGER NOT NULL DEFAULT 0,
  report_data JSONB NOT NULL,
  patient_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;

-- Patients can view and update (add note to) their own session reports
CREATE POLICY "Patients can view their own reports"
  ON public.session_reports FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can save notes on their own reports"
  ON public.session_reports FOR UPDATE
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can record their own workout reports"
  ON public.session_reports FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Authorized linked Physiotherapists can view their patients' reports
CREATE POLICY "Physiotherapists can read linked patients reports"
  ON public.session_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.care_relationships cr
      WHERE cr.therapist_id = auth.uid()
        AND cr.patient_id = public.session_reports.patient_id
        AND cr.status = 'active'
    )
  );
