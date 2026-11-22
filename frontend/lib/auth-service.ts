// ---------------------------------------------------------------------------
// AthleteMind Authentication & Authorization Service
// Unified interface supporting Supabase Auth with robust local fallback
// ---------------------------------------------------------------------------

import { isSupabaseConfigured, supabase } from "./supabase.ts";

export type UserRole = "patient" | "physiotherapist";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  qualification?: string;       // Physiotherapist: DPT, PT, MSPT, etc.
  areaOfPractice?: string;      // Physiotherapist: Knee/ACL, Sports Rehab, etc.
  isVerified: boolean;          // Physiotherapist credential verification status
  assignedTherapistId?: string; // Patient: ID of linked physiotherapist
  hasActivePlan?: boolean;      // Patient: true for demo Aanya, false for fresh signups
  createdAt: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
  expiresAt: number;
}

export interface PatientSignupInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface TherapistSignupInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  qualification: string;
  areaOfPractice: string;
}

// ---------------------------------------------------------------------------
// Fictional Seed / Demo Accounts
// Used for testing & initial runnable state; kept separate from new signups
// ---------------------------------------------------------------------------
export const DEMO_PATIENT: UserProfile = {
  id: "patient_aanya_rao",
  email: "patient.aanya@athletemind.health",
  fullName: "Aanya Rao",
  role: "patient",
  isVerified: true,
  assignedTherapistId: "therapist_meera_joshi",
  hasActivePlan: true,
  createdAt: "2026-11-20T10:00:00.000Z",
};

export const DEMO_THERAPIST: UserProfile = {
  id: "therapist_meera_joshi",
  email: "therapist.meera@athletemind.health",
  fullName: "Dr. Meera Joshi, PT",
  role: "physiotherapist",
  qualification: "PT, DPT, OCS",
  areaOfPractice: "Knee & ACL Sports Rehabilitation",
  isVerified: true, // Pre-verified clinician for demo workflows
  createdAt: "2026-11-15T08:00:00.000Z",
};

export const DEMO_THERAPIST_MARCUS: UserProfile = {
  id: "therapist_marcus_vance",
  email: "dr.marcus@athletemind.health",
  fullName: "Dr. Marcus Vance, PT",
  role: "physiotherapist",
  qualification: "PT, DPT",
  areaOfPractice: "Sports Biomechanics & Knee Rehab",
  isVerified: true,
  createdAt: "2026-11-10T08:00:00.000Z",
};

export const DEMO_PATIENT_UNLINKED: UserProfile = {
  id: "patient_karan_sharma",
  email: "patient.karan@athletemind.health",
  fullName: "Karan Sharma",
  role: "patient",
  isVerified: true,
  assignedTherapistId: undefined,
  hasActivePlan: false,
  createdAt: "2026-11-21T10:00:00.000Z",
};

const STORAGE_SESSION_KEY = "athletemind_auth_session";
const STORAGE_USERS_KEY = "athletemind_registered_users";
const STORAGE_RESET_KEY = "athletemind_pwd_resets";

// Helper to hash/simulate passwords locally
function hashPassword(pwd: string): string {
  let hash = 0;
  for (let i = 0; i < pwd.length; i++) {
    hash = (hash << 5) - hash + pwd.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}`;
}

interface StoredUserRecord {
  profile: UserProfile;
  passwordHash: string;
}

function getStoredUsers(): Record<string, StoredUserRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading stored users", e);
  }
  // Initialize with seed demo accounts
  const initial: Record<string, StoredUserRecord> = {
    [DEMO_PATIENT.email.toLowerCase()]: {
      profile: DEMO_PATIENT,
      passwordHash: hashPassword("athlete123"),
    },
    [DEMO_PATIENT_UNLINKED.email.toLowerCase()]: {
      profile: DEMO_PATIENT_UNLINKED,
      passwordHash: hashPassword("athlete123"),
    },
    [DEMO_THERAPIST.email.toLowerCase()]: {
      profile: DEMO_THERAPIST,
      passwordHash: hashPassword("therapist123"),
    },
    [DEMO_THERAPIST_MARCUS.email.toLowerCase()]: {
      profile: DEMO_THERAPIST_MARCUS,
      passwordHash: hashPassword("therapist123"),
    },
  };
  saveStoredUsers(initial);
  return initial;
}

function saveStoredUsers(users: Record<string, StoredUserRecord>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn("Error saving users", e);
  }
}

// ---------------------------------------------------------------------------
// Password Validation Rules
// ---------------------------------------------------------------------------
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: "Password must contain at least one number (0-9)." };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character." };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Auth Service Core
// ---------------------------------------------------------------------------
class AuthService {
  getAuthMode(): "supabase" | "local" {
    return isSupabaseConfigured() ? "supabase" : "local";
  }

  getCurrentSession(): AuthSession | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_SESSION_KEY);
      if (!raw) return null;
      const session: AuthSession = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        this.signOut();
        return null;
      }
      return session;
    } catch (e) {
      return null;
    }
  }

  getCurrentUser(): UserProfile | null {
    return this.getCurrentSession()?.user || null;
  }

  private setSession(user: UserProfile): AuthSession {
    const session: AuthSession = {
      user,
      token: `tok_${Math.random().toString(36).substring(2)}_${Date.now()}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    }
    return session;
  }

  async signIn(
    email: string,
    password: string,
    expectedRole: UserRole
  ): Promise<{ success: boolean; session?: AuthSession; error?: string; mismatchRole?: UserRole }> {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Prioritize local stored and demo accounts so local demo mode works seamlessly
    // even if background Supabase keys are incomplete, invalid, or offline.
    const demoAccounts = [DEMO_PATIENT, DEMO_PATIENT_UNLINKED, DEMO_THERAPIST, DEMO_THERAPIST_MARCUS];
    const matchingDemo = demoAccounts.find((d) => d.email.toLowerCase() === normalizedEmail);

    const users = getStoredUsers();
    const localRecord = users[normalizedEmail];

    // If updated profile was stored (e.g. admitted consultation), use stored profile
    const activeProfile = localRecord ? localRecord.profile : matchingDemo;

    if (activeProfile) {
      if (activeProfile.role !== expectedRole) {
        return {
          success: false,
          error: `This account is registered as a ${
            activeProfile.role === "physiotherapist" ? "Physiotherapist" : "Patient"
          }. Please use the matching portal.`,
          mismatchRole: activeProfile.role,
        };
      }
      const expectedPwd = activeProfile.role === "physiotherapist" ? "therapist123" : "athlete123";
      if (localRecord) {
        if (localRecord.passwordHash !== hashPassword(password)) {
          return { success: false, error: "Incorrect password. Please verify your credentials and try again." };
        }
      } else {
        if (password !== expectedPwd && password !== "athlete123" && password !== "therapist123") {
          return { success: false, error: "Incorrect password. Please verify your credentials and try again." };
        }
      }
      const session = this.setSession(activeProfile);
      return { success: true, session };
    }

    // 2. Supabase Auth when configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) {
          if (localRecord) {
            return { success: false, error: "Incorrect password. Please verify your credentials and try again." };
          }
          return { success: false, error: error.message };
        }
        if (data.user) {
          // Fetch user profile from public.profiles
          const { data: profileData, error: profileErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();

          if (profileErr || !profileData) {
            return { success: false, error: "Profile not found for this account." };
          }

          // Check role mismatch
          if (profileData.role !== expectedRole) {
            await supabase.auth.signOut();
            return {
              success: false,
              error: `This account is registered as a ${
                profileData.role === "physiotherapist" ? "Physiotherapist" : "Patient"
              }. Please use the matching portal.`,
              mismatchRole: profileData.role,
            };
          }

          const profile: UserProfile = {
            id: profileData.id,
            email: profileData.email,
            fullName: profileData.full_name,
            role: profileData.role,
            qualification: profileData.qualification,
            areaOfPractice: profileData.area_of_practice,
            isVerified: profileData.is_verified,
            createdAt: profileData.created_at,
          };
          const session = this.setSession(profile);
          return { success: true, session };
        }
      } catch (err: any) {
        if (localRecord) {
          return { success: false, error: "Incorrect password. Please verify your credentials and try again." };
        }
        return { success: false, error: err.message || "Failed connecting to authentication service." };
      }
    }

    // 3. Local Fallback Auth Engine for non-demo users
    if (!localRecord) {
      return {
        success: false,
        error: "No account found with this email address. Please check your spelling or sign up.",
      };
    }

    if (localRecord.passwordHash !== hashPassword(password)) {
      return {
        success: false,
        error: "Incorrect password. Please verify your credentials and try again.",
      };
    }

    if (localRecord.profile.role !== expectedRole) {
      return {
        success: false,
        error: `This account is registered as a ${
          localRecord.profile.role === "physiotherapist" ? "Physiotherapist" : "Patient"
        }, not a ${expectedRole === "physiotherapist" ? "Physiotherapist" : "Patient"}.`,
        mismatchRole: localRecord.profile.role,
      };
    }

    const session = this.setSession(localRecord.profile);
    return { success: true, session };
  }

  async signUpPatient(input: PatientSignupInput): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Password validation
    if (input.password !== input.confirmPassword) {
      return { success: false, error: "Passwords do not match." };
    }
    const pwdCheck = validatePassword(input.password);
    if (!pwdCheck.valid) {
      return { success: false, error: pwdCheck.error };
    }

    // 1. Supabase Auth if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: input.password,
          options: {
            data: {
              full_name: input.fullName.trim(),
              role: "patient",
            },
          },
        });
        if (error) return { success: false, error: error.message };
        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: normalizedEmail,
            fullName: input.fullName.trim(),
            role: "patient",
            isVerified: true,
            hasActivePlan: false, // New patient starts with no plan until assigned
            createdAt: new Date().toISOString(),
          };
          const session = this.setSession(profile);
          return { success: true, session };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // 2. Local Fallback Engine
    const users = getStoredUsers();
    if (users[normalizedEmail]) {
      return {
        success: false,
        error: "An account already exists with this email address. Please sign in instead.",
      };
    }

    const newPatient: UserProfile = {
      id: `usr_${Math.random().toString(36).substring(2, 10)}`,
      email: normalizedEmail,
      fullName: input.fullName.trim(),
      role: "patient",
      isVerified: true,
      hasActivePlan: false, // Real new accounts start with "No exercise plan yet"
      createdAt: new Date().toISOString(),
    };

    users[normalizedEmail] = {
      profile: newPatient,
      passwordHash: hashPassword(input.password),
    };
    saveStoredUsers(users);

    const session = this.setSession(newPatient);
    return { success: true, session };
  }

  async signUpTherapist(
    input: TherapistSignupInput
  ): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
    const normalizedEmail = input.email.trim().toLowerCase();

    if (!input.qualification.trim()) {
      return { success: false, error: "Clinical qualification is required." };
    }
    if (!input.areaOfPractice.trim()) {
      return { success: false, error: "Area of clinical practice is required." };
    }
    if (input.password !== input.confirmPassword) {
      return { success: false, error: "Passwords do not match." };
    }
    const pwdCheck = validatePassword(input.password);
    if (!pwdCheck.valid) {
      return { success: false, error: pwdCheck.error };
    }

    // 1. Supabase Auth if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: input.password,
          options: {
            data: {
              full_name: input.fullName.trim(),
              role: "physiotherapist",
              qualification: input.qualification.trim(),
              area_of_practice: input.areaOfPractice.trim(),
              is_verified: false, // Self-registration starts unverified
            },
          },
        });
        if (error) return { success: false, error: error.message };
        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: normalizedEmail,
            fullName: input.fullName.trim(),
            role: "physiotherapist",
            qualification: input.qualification.trim(),
            areaOfPractice: input.areaOfPractice.trim(),
            isVerified: false, // Must be audited
            createdAt: new Date().toISOString(),
          };
          const session = this.setSession(profile);
          return { success: true, session };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // 2. Local Fallback Engine
    const users = getStoredUsers();
    if (users[normalizedEmail]) {
      return {
        success: false,
        error: "A practitioner account already exists with this email address. Please sign in.",
      };
    }

    // CRITICAL REQUIREMENT: Self-registration alone must never mark credentials as verified
    // or grant access to patient records.
    const newTherapist: UserProfile = {
      id: `pt_${Math.random().toString(36).substring(2, 10)}`,
      email: normalizedEmail,
      fullName: input.fullName.trim(),
      role: "physiotherapist",
      qualification: input.qualification.trim(),
      areaOfPractice: input.areaOfPractice.trim(),
      isVerified: false, // STRICTLY FALSE for new self-registered practitioners
      createdAt: new Date().toISOString(),
    };

    users[normalizedEmail] = {
      profile: newTherapist,
      passwordHash: hashPassword(input.password),
    };
    saveStoredUsers(users);

    const session = this.setSession(newTherapist);
    return { success: true, session };
  }

  async requestPasswordReset(
    email: string,
    role: UserRole
  ): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/auth/forgot-password?role=${role}`,
        });
      } catch (e) {
        // Continue to user-facing notification
      }
    }

    // Record local recovery request
    if (typeof window !== "undefined") {
      try {
        const resets = JSON.parse(localStorage.getItem(STORAGE_RESET_KEY) || "[]");
        resets.push({ email: normalizedEmail, role, requestedAt: new Date().toISOString() });
        localStorage.setItem(STORAGE_RESET_KEY, JSON.stringify(resets));
      } catch (e) {}
    }

    return {
      success: true,
      message: `Password reset instructions have been dispatched to ${normalizedEmail}. If an active account matches this address, you will receive a secure recovery link.`,
    };
  }

  async signOut(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  }

  // -------------------------------------------------------------------------
  // Authorization Rule Helpers
  // -------------------------------------------------------------------------
  canAccessPatientToday(user: UserProfile | null): boolean {
    return user?.role === "patient";
  }

  canAccessTherapistWorkspace(user: UserProfile | null): boolean {
    return user?.role === "physiotherapist";
  }

  isPatientInTherapistCaseload(user: UserProfile | null, patientId?: string): boolean {
    if (!user || user.role !== "physiotherapist") return false;
    if (!patientId) return true;

    // 1. Scoped primary demo patient (Aanya Rao)
    const isMeeraOrMarcus = user.id === "therapist_meera_joshi" || user.id === "therapist_marcus_vance";
    const myScopedId = isMeeraOrMarcus ? "patient_aanya_rao" : `patient_aanya_${user.id}`;

    // Direct match to this therapist's scoped patient ID (e.g. patient_aanya_pt_46tzt682)
    if (patientId === myScopedId) return true;

    // Global Aanya Rao ID belongs to Meera Joshi & Marcus Vance
    if (patientId === "patient_aanya_rao" && isMeeraOrMarcus) {
      return true;
    }

    // Security boundary: If patientId is explicitly scoped to a DIFFERENT therapist (e.g. patient_aanya_pt_OTHER)
    if (patientId.startsWith("patient_aanya_") && patientId !== myScopedId && patientId !== "patient_aanya_rao") {
      return false;
    }

    // 2. Standard Caseload Patients in demo mode (Dev Patel)
    if (patientId === "sample_dev_patel") {
      return true;
    }

    // 3. Admitted Consultation Requests
    if (typeof window !== "undefined") {
      try {
        const rawConsults = localStorage.getItem("athletemind_consultations");
        if (rawConsults) {
          const list = JSON.parse(rawConsults);
          if (Array.isArray(list)) {
            const hasAdmitted = list.some(
              (c: any) => c.therapistId === user.id && c.status === "admitted" && c.patientId === patientId
            );
            if (hasAdmitted) return true;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // 4. Pre-verified clinicians auditing records
    if (user.isVerified) {
      if (patientId === "patient_aanya_rao" || patientId === "sample_dev_patel") {
        return true;
      }
    }

    return false;
  }

  canEditCarePlan(user: UserProfile | null, patientId?: string): boolean {
    if (!user || user.role !== "physiotherapist") return false;
    return this.isPatientInTherapistCaseload(user, patientId);
  }

  canViewSessionReport(user: UserProfile | null, patientId?: string): boolean {
    if (!user) return false;
    // Patient can ONLY view their own report
    if (user.role === "patient") {
      return !patientId || user.id === patientId;
    }
    // Physiotherapist
    if (user.role === "physiotherapist") {
      return this.isPatientInTherapistCaseload(user, patientId);
    }
    return false;
  }

  updateUserProfile(userId: string, updates: Partial<UserProfile>): UserProfile | null {
    if (typeof window === "undefined") return null;
    const users = getStoredUsers();
    let targetEmail: string | null = null;
    for (const [email, record] of Object.entries(users)) {
      if (record.profile.id === userId) {
        targetEmail = email;
        break;
      }
    }
    if (!targetEmail) {
      for (const demo of [DEMO_PATIENT, DEMO_PATIENT_UNLINKED, DEMO_THERAPIST, DEMO_THERAPIST_MARCUS]) {
        if (demo.id === userId) {
          targetEmail = demo.email.toLowerCase();
          users[targetEmail] = {
            profile: { ...demo, ...updates },
            passwordHash: hashPassword("athlete123"),
          };
          break;
        }
      }
    }
    if (targetEmail && users[targetEmail]) {
      users[targetEmail].profile = {
        ...users[targetEmail].profile,
        ...updates,
      };
      saveStoredUsers(users);

      const currentSession = this.getCurrentSession();
      if (currentSession && currentSession.user.id === userId) {
        currentSession.user = {
          ...currentSession.user,
          ...updates,
        };
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(currentSession));
      }

      window.dispatchEvent(new CustomEvent("athletemind_auth_change"));
      return users[targetEmail].profile;
    }
    return null;
  }
}

export const authService = new AuthService();

export function canEditCarePlan(user: UserProfile | null, patientId?: string): boolean {
  return authService.canEditCarePlan(user, patientId);
}

export function canViewSessionReport(user: UserProfile | null, patientId?: string): boolean {
  return authService.canViewSessionReport(user, patientId);
}

export function updateUserProfile(userId: string, updates: Partial<UserProfile>): UserProfile | null {
  return authService.updateUserProfile(userId, updates);
}

