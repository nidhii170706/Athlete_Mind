"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  roleBadge: "Patient" | "Physiotherapist";
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  roleBadge,
  children,
  backHref = "/",
  backLabel = "Change role",
}) => {
  const { authMode } = useAuth();

  const isTherapist = roleBadge === "Physiotherapist";

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
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
            {authMode === "supabase" ? "☁️ Supabase Auth" : "🔒 Local Care Auth"}
          </span>

          <Link
            href={backHref}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            <span>←</span>
            <span>{backLabel}</span>
          </Link>
        </div>
      </header>

      {/* Main Form Center Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-lg p-6 sm:p-8 flex flex-col gap-6">
          {/* Header & Role Chip */}
          <div className="flex flex-col gap-2 text-left">
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isTherapist
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-teal-50 text-teal-800 border-teal-200"
                }`}
              >
                {roleBadge} Portal
              </span>
              <Link
                href="/"
                className="text-xs font-semibold text-slate-400 hover:text-teal-700 transition-colors"
              >
                Change role
              </Link>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{subtitle}</p>
          </div>

          {/* Form Content */}
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white">
        AthleteMind Biomechanical Telemetry & Care Portal • Compliant Clinical Architecture
      </footer>
    </div>
  );
};
