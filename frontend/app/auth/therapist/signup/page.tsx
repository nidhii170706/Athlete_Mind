"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthLayout } from "@/components/AuthLayout";
import { validatePassword } from "@/lib/auth-service";

export default function TherapistSignupPage() {
  const router = useRouter();
  const { signUpTherapist } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [qualification, setQualification] = useState("PT, DPT, OCS");
  const [areaOfPractice, setAreaOfPractice] = useState("Sports Orthopaedics & Knee Rehabilitation");
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
      errors.fullName = "Please enter your full legal and professional name.";
    }
    if (!email.trim() || !email.includes("@")) {
      errors.email = "Please enter a valid professional email.";
    }
    if (!qualification.trim()) {
      errors.qualification = "Please state your physical therapy qualification (e.g. DPT, PT, OCS).";
    }
    if (!areaOfPractice.trim()) {
      errors.areaOfPractice = "Please specify your clinical specialty or area of practice.";
    }
    if (!pwdValidation.valid) {
      errors.password = pwdValidation.error || "Password does not meet clinical security standards.";
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
      const res = await signUpTherapist({
        fullName,
        email,
        password,
        confirmPassword,
        qualification,
        areaOfPractice,
      });

      if (res.success) {
        // Directs to workspace where verification status is shown
        router.push("/therapist/workspace");
      } else {
        setGeneralError(res.error || "Failed to create physiotherapist account.");
      }
    } catch (err: any) {
      setGeneralError(err.message || "An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your physiotherapist account"
      subtitle="Register as an authorized clinician to prescribe exercises, audit biomechanical holds, and supervise patient recovery."
      roleBadge="Physiotherapist"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Verification Transparency Alert */}
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col gap-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <span>🛡️</span>
            <span>Clinical Credential Verification Policy</span>
          </div>
          <p className="leading-relaxed">
            Newly registered practitioner accounts enter <strong>Pending Verification</strong> status. Self-registration alone does not grant access to private patient records until clinical credentials are confirmed.
          </p>
        </div>

        {/* General Error */}
        {generalError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <span>⚠️</span>
            <span>{generalError}</span>
          </div>
        )}

        {/* Full Name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-700">
            Full Professional Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Dr. Elena Chen, PT"
            required
            autoComplete="name"
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
              fieldErrors.fullName
                ? "border-rose-400 focus:ring-rose-200"
                : "border-slate-200 focus:ring-emerald-500/30 focus:border-emerald-500"
            }`}
          />
          {fieldErrors.fullName && (
            <span className="text-[11px] font-semibold text-rose-600">{fieldErrors.fullName}</span>
          )}
        </div>

        {/* Professional Email */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-700">
            Professional Email Address <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="elena.chen@athletemind.health"
            required
            autoComplete="email"
            className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
              fieldErrors.email
                ? "border-rose-400 focus:ring-rose-200"
                : "border-slate-200 focus:ring-emerald-500/30 focus:border-emerald-500"
            }`}
          />
          {fieldErrors.email && (
            <span className="text-[11px] font-semibold text-rose-600">{fieldErrors.email}</span>
          )}
        </div>

        {/* Qualification & Area of Practice Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-700">
              Qualification <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              placeholder="DPT, PT, OCS"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-700">
              Area of Practice <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={areaOfPractice}
              onChange={(e) => setAreaOfPractice(e.target.value)}
              placeholder="Sports Orthopaedics"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">
              Password <span className="text-rose-500">*</span>
            </label>
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
                : "border-slate-200 focus:ring-emerald-500/30 focus:border-emerald-500"
            }`}
          />
          {fieldErrors.password && (
            <span className="text-[11px] font-semibold text-rose-600">{fieldErrors.password}</span>
          )}

          {/* Password Checklist */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex flex-col gap-1 mt-1">
            <span className="font-bold text-slate-700">Clinical Security Standards:</span>
            <div className="flex items-center gap-1.5">
              <span>{password.length >= 8 ? "✅" : "⚪"}</span>
              <span className={password.length >= 8 ? "text-emerald-700 font-semibold" : ""}>
                Minimum 8 characters
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>{/\d/.test(password) ? "✅" : "⚪"}</span>
              <span className={/\d/.test(password) ? "text-emerald-700 font-semibold" : ""}>
                At least 1 numeric digit
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
                At least 1 special character
              </span>
            </div>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-700">
            Confirm Password <span className="text-rose-500">*</span>
          </label>
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
                : "border-slate-200 focus:ring-emerald-500/30 focus:border-emerald-500"
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
          className="mt-2 w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Registering Clinician...</span>
            </>
          ) : (
            <span>Submit Clinician Registration</span>
          )}
        </button>

        {/* Sign In Link */}
        <div className="text-center pt-2 text-xs text-slate-500">
          Already registered as a practitioner?{" "}
          <Link
            href="/auth/therapist/login"
            className="font-bold text-emerald-700 hover:text-emerald-900 underline transition-colors"
          >
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
