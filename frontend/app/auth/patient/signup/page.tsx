"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthLayout } from "@/components/AuthLayout";
import { validatePassword } from "@/lib/auth-service";

export default function PatientSignupPage() {
  const router = useRouter();
  const { signUpPatient } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const pwdValidation = validatePassword(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = "Please enter your full legal or preferred name.";
    }
    if (!email.trim() || !email.includes("@")) {
      errors.email = "Please enter a valid email address.";
    }
    if (!pwdValidation.valid) {
      errors.password = pwdValidation.error || "Password does not meet security criteria.";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const res = await signUpPatient({
        fullName,
        email,
        password,
        confirmPassword,
      });

      if (res.success) {
        // Direct to Patient Today (which will show empty state for new account)
        router.push("/today");
      } else {
        setGeneralError(res.error || "Failed to create patient account.");
      }
    } catch (err: any) {
      setGeneralError(err.message || "An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your patient account"
      subtitle="Register to access personalized rehabilitation plans, bio-telemetry, and the training arena."
      roleBadge="Patient"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* General Alert */}
        {generalError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <span>⚠️</span>
            <span>{generalError}</span>
          </div>
        )}

        {/* Full Name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-700">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Aanya Rao"
            required
            autoComplete="name"
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
              fieldErrors.fullName
                ? "border-rose-400 focus:ring-rose-200"
                : "border-slate-200 focus:ring-teal-500/30 focus:border-teal-500"
            }`}
          />
          {fieldErrors.fullName && (
            <span className="text-[11px] font-semibold text-rose-600">{fieldErrors.fullName}</span>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-700">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="aanya@example.com"
            required
            autoComplete="email"
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
              fieldErrors.email
                ? "border-rose-400 focus:ring-rose-200"
                : "border-slate-200 focus:ring-teal-500/30 focus:border-teal-500"
            }`}
          />
          {fieldErrors.email && (
            <span className="text-[11px] font-semibold text-rose-600">{fieldErrors.email}</span>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Password</label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
              fieldErrors.password
                ? "border-rose-400 focus:ring-rose-200"
                : "border-slate-200 focus:ring-teal-500/30 focus:border-teal-500"
            }`}
          />
          {fieldErrors.password && (
            <span className="text-[11px] font-semibold text-rose-600">{fieldErrors.password}</span>
          )}

          {/* Password Requirements Checklist (shown before submit) */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex flex-col gap-1 mt-1">
            <span className="font-bold text-slate-700">Password Requirements:</span>
            <div className="flex items-center gap-1.5">
              <span>{password.length >= 8 ? "✅" : "⚪"}</span>
              <span className={password.length >= 8 ? "text-emerald-700 font-semibold" : ""}>
                At least 8 characters
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>{/\d/.test(password) ? "✅" : "⚪"}</span>
              <span className={/\d/.test(password) ? "text-emerald-700 font-semibold" : ""}>
                At least 1 numeric digit (0-9)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "✅" : "⚪"}</span>
              <span
                className={
                  /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
                    ? "text-emerald-700 font-semibold"
                    : ""
                }
              >
                At least 1 special character (!@#$%...)
              </span>
            </div>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-700">Confirm Password</label>
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
              fieldErrors.confirmPassword
                ? "border-rose-400 focus:ring-rose-200"
                : "border-slate-200 focus:ring-teal-500/30 focus:border-teal-500"
            }`}
          />
          {fieldErrors.confirmPassword && (
            <span className="text-[11px] font-semibold text-rose-600">
              {fieldErrors.confirmPassword}
            </span>
          )}
          {passwordsMatch && (
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              ✓ Passwords match
            </span>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            <span>Complete Registration & Enter Today</span>
          )}
        </button>

        {/* Sign In Link */}
        <div className="text-center pt-2 text-xs text-slate-500">
          Already have a patient account?{" "}
          <Link
            href="/auth/patient/login"
            className="font-bold text-teal-700 hover:text-teal-900 underline transition-colors"
          >
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
