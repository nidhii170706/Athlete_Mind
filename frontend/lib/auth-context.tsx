"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  UserProfile,
  UserRole,
  AuthSession,
  PatientSignupInput,
  TherapistSignupInput,
  authService,
} from "./auth-service";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  authMode: "supabase" | "local";
  signIn: (
    email: string,
    password: string,
    expectedRole: UserRole
  ) => Promise<{ success: boolean; session?: AuthSession; error?: string; mismatchRole?: UserRole }>;
  signUpPatient: (
    input: PatientSignupInput
  ) => Promise<{ success: boolean; session?: AuthSession; error?: string }>;
  signUpTherapist: (
    input: TherapistSignupInput
  ) => Promise<{ success: boolean; session?: AuthSession; error?: string }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string, role: UserRole) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authMode = authService.getAuthMode();

  useEffect(() => {
    const session = authService.getCurrentSession();
    if (session) {
      setUser(session.user);
    }
    setIsLoading(false);

    const handleAuthChange = () => {
      const s = authService.getCurrentSession();
      setUser(s ? s.user : null);
    };

    window.addEventListener("athletemind_auth_change", handleAuthChange);
    return () => window.removeEventListener("athletemind_auth_change", handleAuthChange);
  }, []);

  const signIn = async (email: string, password: string, expectedRole: UserRole) => {
    const res = await authService.signIn(email, password, expectedRole);
    if (res.success && res.session) {
      setUser(res.session.user);
    }
    return res;
  };

  const signUpPatient = async (input: PatientSignupInput) => {
    const res = await authService.signUpPatient(input);
    if (res.success && res.session) {
      setUser(res.session.user);
    }
    return res;
  };

  const signUpTherapist = async (input: TherapistSignupInput) => {
    const res = await authService.signUpTherapist(input);
    if (res.success && res.session) {
      setUser(res.session.user);
    }
    return res;
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  const requestPasswordReset = async (email: string, role: UserRole) => {
    return authService.requestPasswordReset(email, role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        authMode,
        signIn,
        signUpPatient,
        signUpTherapist,
        signOut,
        requestPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
