"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthLayout } from "@/components/AuthLayout";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const rawRole = searchParams.get("role");
  const role = rawRole === "therapist" ? "physiotherapist" : "patient";
  const isTherapist = role === "physiotherapist";

  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await requestPasswordReset(email, role);
      setStatusMessage(res.message);
    } catch (err: any) {
      setStatusMessage("Password reset request logged. Please check your inbox for verification.");
    } finally {
      setLoading(false);
    }
  };

  const returnHref = isTherapist ? "/auth/therapist/login" : "/auth/patient/login";
  const returnLabel = isTherapist ? "Back to Physiotherapist sign in" : "Back to Patient sign in";

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={`Enter the email associated with your ${
        isTherapist ? "physiotherapist" : "patient"
      } account to receive recovery instructions.`}
      roleBadge={isTherapist ? "Physiotherapist" : "Patient"}
      backHref={returnHref}
      backLabel="Back to sign in"
    >
      {statusMessage ? (
        <div className="flex flex-col gap-4 text-center py-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl mx-auto">
            📬
          </div>
          <h2 className="text-lg font-bold text-slate-900">Check your inbox</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{statusMessage}</p>
          <Link
            href={returnHref}
            className="mt-4 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs"
          >
            {returnLabel}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700">Account Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Sending link..." : "Send Password Recovery Link"}
          </button>

          <div className="text-center pt-2">
            <Link
              href={returnHref}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              {returnLabel}
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
          <div className="w-8 h-8 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
