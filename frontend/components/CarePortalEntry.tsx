"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface CarePortalEntryProps {
  initialTab?: "patient" | "physiotherapist";
}

export default function CarePortalEntry({ initialTab = "patient" }: CarePortalEntryProps) {
  const router = useRouter();
  const { user, isLoading, signIn, authMode } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"patient" | "physiotherapist">(initialTab);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mismatchNotice, setMismatchNotice] = useState<{
    targetRole: "patient" | "physiotherapist";
    message: string;
  } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync initialTab if changed
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Returning signed-in user automatically routed to their workspace without flashing wrong interface
  useEffect(() => {
    if (isMounted && !isLoading && user) {
      if (user.role === "patient") {
        router.replace("/today");
      } else if (user.role === "physiotherapist") {
        router.replace("/therapist/workspace");
      }
    }
  }, [isMounted, isLoading, user, router]);

  const handleTabSwitch = (newTab: "patient" | "physiotherapist") => {
    setActiveTab(newTab);
    setError(null);
    setMismatchNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMismatchNotice(null);

    if (!email.trim() || !password) {
      setError(
        activeTab === "patient"
          ? "Please enter both email address and password."
          : "Please enter both professional email and password."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await signIn(email, password, activeTab);
      if (res.success && res.session?.user) {
        // Workspace determined strictly by authenticated account role
        if (res.session.user.role === "patient") {
          router.push("/today");
        } else if (res.session.user.role === "physiotherapist") {
          router.push("/therapist/workspace");
        }
      } else {
        if (res.mismatchRole) {
          const targetRole = res.mismatchRole as "patient" | "physiotherapist";
          const targetTabName = targetRole === "patient" ? "Patient" : "Physiotherapist";
          setMismatchNotice({
            targetRole,
            message: `This account is registered as a ${res.mismatchRole}. Please switch to the ${targetTabName} tab above to sign in.`,
          });
        } else {
          setError(res.error || "Failed to sign in. Please verify your credentials.");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillPatientDemo = () => {
    setEmail("patient.aanya@athletemind.health");
    setPassword("athlete123");
    setError(null);
    setMismatchNotice(null);
  };

  const handleFillTherapistDemo = () => {
    setEmail("therapist.meera@athletemind.health");
    setPassword("therapist123");
    setError(null);
    setMismatchNotice(null);
  };

  // Render neutral loading spinner while authenticating / resolving session to prevent flashes
  if (!isMounted || isLoading || user) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading care portal...</span>
        </div>
      </div>
    );
  }

  const isPatient = activeTab === "patient";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col antialiased">
      {/* Top Clinical Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl">🛡️</span>
            <span className="font-extrabold text-slate-900 tracking-tight text-lg group-hover:text-teal-700 transition-colors">
              AthleteMind
            </span>
          </Link>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
            Care Portal
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Auth Backend Mode Indicator */}
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 hidden sm:inline">
            {authMode === "supabase" ? "☁️ Supabase Auth" : "🔒 Local Care Auth"}
          </span>

          <Link
            href="/arena"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-all shadow-2xs"
          >
            <span>🚀</span>
            <span>Return to Arena Hub</span>
          </Link>
        </div>
      </header>

      {/* Main Center Form */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-lg p-6 sm:p-8 flex flex-col gap-5">
          {/* ----------------------------------------------------------- */}
          {/* Two Accessible Top Tabs: Patient & Physiotherapist          */}
          {/* ----------------------------------------------------------- */}
          <div
            role="tablist"
            aria-label="Select role to sign in"
            className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80"
          >
            <button
              type="button"
              role="tab"
              id="tab-patient"
              aria-selected={isPatient}
              aria-controls="panel-login"
              onClick={() => handleTabSwitch("patient")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isPatient
                  ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🏃</span>
              <span>Patient</span>
            </button>

            <button
              type="button"
              role="tab"
              id="tab-therapist"
              aria-selected={!isPatient}
              aria-controls="panel-login"
              onClick={() => handleTabSwitch("physiotherapist")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                !isPatient
                  ? "bg-white text-emerald-800 shadow-xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🩺</span>
              <span>Physiotherapist</span>
            </button>
          </div>

          {/* Form Header */}
          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isPatient
                    ? "bg-teal-50 text-teal-800 border-teal-200"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                }`}
              >
                {isPatient ? "Patient Portal" : "Practitioner Workspace"}
              </span>

              <span className="text-[11px] text-slate-400 font-medium">
                {isPatient ? "Active recovery" : "Clinical caseload"}
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {isPatient ? "Patient sign in" : "Physiotherapist sign in"}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isPatient
                ? "Access your prescribed exercise plan, track bio-telemetry, and enter the arena."
                : "Manage your clinical caseload, prescribe biomechanical protocols, and review patient kinematics."}
            </p>
          </div>

          {/* Wrong Tab Mismatch Alert */}
          {mismatchNotice && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col gap-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <span>⚠️</span>
                <span>Wrong Portal Tab</span>
              </div>
              <p className="leading-relaxed">{mismatchNotice.message}</p>
              <button
                type="button"
                onClick={() => handleTabSwitch(mismatchNotice.targetRole)}
                className="self-start mt-0.5 py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer transition-all shadow-2xs"
              >
                Switch to {mismatchNotice.targetRole === "patient" ? "Patient" : "Physiotherapist"} Tab &rarr;
              </button>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-1 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <span>⚠️</span>
                <span>Sign-in Notice</span>
              </div>
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form
            id="panel-login"
            role="tabpanel"
            aria-labelledby={isPatient ? "tab-patient" : "tab-therapist"}
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">
                {isPatient ? "Email Address" : "Professional Email Address"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isPatient ? "patient@example.com" : "dr.joshi@athletemind.health"}
                required
                autoComplete="email"
                className={`w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none transition-all text-slate-900 placeholder:text-slate-400 ${
                  isPatient
                    ? "focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                    : "focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                }`}
              />
            </div>

            {/* Password Field with Show/Hide */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <Link
                  href={isPatient ? "/auth/forgot-password?role=patient" : "/auth/forgot-password?role=therapist"}
                  className={`text-xs font-semibold transition-colors ${
                    isPatient ? "text-teal-700 hover:text-teal-900" : "text-emerald-700 hover:text-emerald-900"
                  }`}
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={`w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 text-sm focus:outline-none transition-all text-slate-900 placeholder:text-slate-400 ${
                    isPatient
                      ? "focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                      : "focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-700 p-1"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`mt-2 w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                isPatient
                  ? "bg-teal-700 hover:bg-teal-800"
                  : "bg-emerald-700 hover:bg-emerald-800"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>{isPatient ? "Sign in to Patient Today" : "Sign in to Practitioner Workspace"}</span>
              )}
            </button>

            {/* Quick Demo Pre-fill Shortcut */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{isPatient ? "Demo Patient:" : "Demo Clinician:"}</span>
              <button
                type="button"
                onClick={isPatient ? handleFillPatientDemo : handleFillTherapistDemo}
                className={`text-xs font-semibold underline cursor-pointer transition-colors ${
                  isPatient ? "text-teal-700 hover:text-teal-900" : "text-emerald-700 hover:text-emerald-900"
                }`}
              >
                {isPatient ? "Fill Aanya Rao demo credentials" : "Fill Dr. Meera Joshi, PT credentials"}
              </button>
            </div>
          </form>

          {/* Registration Link */}
          <div className="text-center text-xs text-slate-500 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5">
            <span>{isPatient ? "New to AthleteMind?" : "New clinician?"}</span>
            <Link
              href={isPatient ? "/auth/patient/signup" : "/auth/therapist/signup"}
              className={`font-bold underline transition-colors ${
                isPatient ? "text-teal-700 hover:text-teal-900" : "text-emerald-700 hover:text-emerald-900"
              }`}
            >
              {isPatient ? "Create a patient account" : "Create a physiotherapist account"}
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white">
        AthleteMind Biomechanical Telemetry &amp; Care Portal • Compliant Clinical Architecture
      </footer>
    </div>
  );
}
