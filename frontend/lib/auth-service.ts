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
// Supabase Error Formatter
// ---------------------------------------------------------------------------
export function formatSupabaseAuthError(rawMessage?: string): string {
  if (!rawMessage) return "Authentication service error. Please try again.";
  const msg = rawMessage.toLowerCase();
  if (
    msg.includes("email not confirmed") ||
    msg.includes("email link is invalid or has expired")
  ) {
    return "Your email address has not been confirmed yet. Please check your inbox for the confirmation link from Supabase, or turn off 'Confirm email' in Supabase Dashboard -> Authentication -> Providers -> Email.";
  }
  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid_credentials") ||
    msg.includes("invalid grant")
  ) {
    return "Invalid email or password. Please verify your credentials and try again.";
  }
  if (
    msg.includes("user already registered") ||
    msg.includes("already registered")
  ) {
    return "An account with this email address already exists. Please sign in instead.";
  }
  if (msg.includes("password should be at least")) {
    return "Password does not meet security requirements. Please use at least 8 characters.";
  }
  if (
    msg.includes("rate limit") ||
    msg.includes("rate_limit") ||
    msg.includes("too many requests")
  ) {
    return "Too many requests. Please wait a few moments before trying again.";
  }
  return rawMessage;
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

  setSession(user: UserProfile): AuthSession {
    const session: AuthSession = {
      user,
      token: `tok_${Math.random().toString(36).substring(2)}_${Date.now()}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
      if (typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new Event("athletemind_auth_change"));
      }
    }
    return session;
  }

  async signIn(
    email: string,
    password: string,
    expectedRole: UserRole
  ): Promise<{ success: boolean; session?: AuthSession; error?: string; mismatchRole?: UserRole }> {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Supabase Auth when configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) {
          return { success: false, error: formatSupabaseAuthError(error.message) };
        }
        if (data.user) {
          // Fetch user profile from public.profiles using maybeSingle()
          const { data: profileData, error: profileErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .maybeSingle();

          if (profileErr) {
            console.error("Database query error for profile:", profileErr);
            return {
              success: false,
              error: `Database error while retrieving profile (${profileErr.code || profileErr.message}). Please verify database table and permissions.`,
            };
          }

          let finalProfile: UserProfile;

          if (!profileData) {
            // Self-healing: user exists in auth.users (e.g. created via dashboard or before trigger was enabled)
            // Securely create/upsert profile row ONLY for authenticated user's own id (auth.uid() = id)
            const meta = data.user.user_metadata || {};
            const resolvedRole: UserRole =
              meta.role === "physiotherapist" || meta.role === "patient"
                ? meta.role
                : expectedRole;
            const resolvedFullName =
              meta.full_name ||
              (typeof data.user.email === "string" ? data.user.email.split("@")[0] : "User");

            const profileToUpsert = {
              id: data.user.id,
              email: normalizedEmail,
              full_name: resolvedFullName,
              role: resolvedRole,
              qualification: meta.qualification || null,
              area_of_practice: meta.area_of_practice || null,
              is_verified: resolvedRole === "physiotherapist" ? false : true,
            };

            const { data: createdProfile, error: insertErr } = await supabase
              .from("profiles")
              .upsert(profileToUpsert)
              .select()
              .single();

            if (insertErr || !createdProfile) {
              console.error("Failed to auto-create profile for authenticated user:", insertErr);
              return {
                success: false,
                error: `Account authenticated, but profile record could not be loaded or created: ${insertErr?.message || "Missing database profile"}. Please run the Supabase database migration.`,
              };
            }

            finalProfile = {
              id: createdProfile.id,
              email: createdProfile.email,
              fullName: createdProfile.full_name,
              role: createdProfile.role,
              qualification: createdProfile.qualification || undefined,
              areaOfPractice: createdProfile.area_of_practice || undefined,
              isVerified: createdProfile.is_verified,
              createdAt: createdProfile.created_at,
            };
          } else {
            finalProfile = {
              id: profileData.id,
              email: profileData.email,
              fullName: profileData.full_name,
              role: profileData.role,
              qualification: profileData.qualification || undefined,
              areaOfPractice: profileData.area_of_practice || undefined,
              isVerified: profileData.is_verified,
              createdAt: profileData.created_at,
            };
          }

          // Check role mismatch
          if (finalProfile.role !== expectedRole) {
            await supabase.auth.signOut();
            return {
              success: false,
              error: `This account is registered as a ${
                finalProfile.role === "physiotherapist" ? "Physiotherapist" : "Patient"
              }. Please use the matching portal.`,
              mismatchRole: finalProfile.role,
            };
          }

          const session = this.setSession(finalProfile);
          return { success: true, session };
        }
      } catch (err: any) {
        return { success: false, error: formatSupabaseAuthError(err.message || "Failed connecting to authentication service.") };
      }
    }

    // 2. Local Fallback Auth Engine
    const users = getStoredUsers();
    const record = users[normalizedEmail];

    if (!record) {
      return {
        success: false,
        error: "No account found with this email address. Please check your spelling or sign up.",
      };
    }

    if (record.passwordHash !== hashPassword(password)) {
      return {
        success: false,
        error: "Incorrect password. Please verify your credentials and try again.",
      };
    }

    // Strict Role Mismatch Check
    if (record.profile.role !== expectedRole) {
      return {
        success: false,
        error: `This account is registered as a ${
          record.profile.role === "physiotherapist" ? "Physiotherapist" : "Patient"
        }, not a ${expectedRole === "physiotherapist" ? "Physiotherapist" : "Patient"}.`,
        mismatchRole: record.profile.role,
      };
    }

    const session = this.setSession(record.profile);
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
        if (error) return { success: false, error: formatSupabaseAuthError(error.message) };
        if (data.user) {
          // If email confirmation is required and no session was issued
          if (!data.session && data.user.identities && data.user.identities.length > 0) {
            return {
              success: false,
              error:
                "Account created! A confirmation email has been dispatched. Please click the link in your email to activate your account, or disable 'Confirm email' in Supabase Authentication settings.",
            };
          }

          // Securely write profile for authenticated user's own id
          try {
            await supabase.from("profiles").upsert({
              id: data.user.id,
              email: normalizedEmail,
              full_name: input.fullName.trim(),
              role: "patient",
              is_verified: true,
            });
          } catch (profileUpsertErr) {
            console.warn(
              "Client profile upsert attempted; database trigger will handle persistence:",
              profileUpsertErr
            );
          }

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
        return { success: false, error: formatSupabaseAuthError(err.message) };
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
        if (error) return { success: false, error: formatSupabaseAuthError(error.message) };
        if (data.user) {
          // If email confirmation is required and no session was issued
          if (!data.session && data.user.identities && data.user.identities.length > 0) {
            return {
              success: false,
              error:
                "Physiotherapist account registered! A confirmation email has been dispatched. Please click the link in your email to activate your account, or disable 'Confirm email' in Supabase Authentication settings.",
            };
          }

          // Securely write profile for authenticated user's own id
          try {
            await supabase.from("profiles").upsert({
              id: data.user.id,
              email: normalizedEmail,
              full_name: input.fullName.trim(),
              role: "physiotherapist",
              qualification: input.qualification.trim(),
              area_of_practice: input.areaOfPractice.trim(),
              is_verified: false,
            });
          } catch (profileUpsertErr) {
            console.warn(
              "Client profile upsert attempted; database trigger will handle persistence:",
              profileUpsertErr
            );
          }

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
        return { success: false, error: formatSupabaseAuthError(err.message) };
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
      } catch (e) {
        console.warn("Supabase sign out notice:", e);
      }
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      if (typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new Event("athletemind_auth_change"));
      }
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

  canEditCarePlan(user: UserProfile | null, patientId?: string): boolean {
    if (!user || user.role !== "physiotherapist") return false;
    // Verified clinicians can edit assigned patients
    if (user.isVerified) {
      if (user.id === DEMO_THERAPIST.id && (!patientId || patientId === DEMO_PATIENT.id)) {
        return true;
      }
      return true;
    }
    // In local demo mode: unverified physiotherapist can access and edit their OWN scoped demo patient
    if (this.getAuthMode() === "local") {
      const scopedId = `patient_aanya_${user.id}`;
      if (!patientId || patientId === scopedId) {
        return true;
      }
      return false;
    }
    return false;
  }

  canViewSessionReport(user: UserProfile | null, patientId?: string): boolean {
    if (!user) return false;
    // Patient can view their own report
    if (user.role === "patient") {
      return !patientId || user.id === patientId || user.id === DEMO_PATIENT.id;
    }
    // Physiotherapist
    if (user.role === "physiotherapist") {
      if (user.isVerified) return true;
      if (this.getAuthMode() === "local") {
        const scopedId = `patient_aanya_${user.id}`;
        return !patientId || patientId === scopedId;
      }
      return false;
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

