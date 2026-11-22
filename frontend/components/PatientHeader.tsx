"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getUnreadCount } from "@/lib/messages";

interface PatientHeaderProps {
  patientName?: string;
  patientId?: string;
  isPreview?: boolean;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  patientName = "Aanya Rao",
  patientId,
  isPreview = false,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signOut } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const effectivePatientId = patientId || searchParams.get("patientId") || user?.id || "patient_aanya_rao";
  const effectivePreview = isPreview || searchParams.get("preview") === "true";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check unread messages
  useEffect(() => {
    if (mounted) {
      const count = getUnreadCount(effectivePatientId, "patient");
      setUnreadMessages(count);
    }
  }, [mounted, effectivePatientId, pathname]);

  // Handle escape key & click outside for modals/dropdowns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (helpOpen) {
          setHelpOpen(false);
          helpButtonRef.current?.focus();
        }
        if (accountMenuOpen) {
          setAccountMenuOpen(false);
        }
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [helpOpen, accountMenuOpen, mobileMenuOpen]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  // Helper to preserve patientId & preview query params across patient tabs
  const createHref = (basePath: string) => {
    const params = new URLSearchParams();
    if (searchParams.get("patientId")) {
      params.set("patientId", searchParams.get("patientId")!);
    }
    if (effectivePreview) {
      params.set("preview", "true");
    }
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const navItems = [
    { label: "Today", path: "/today", href: createHref("/today") },
    { label: "My Plan", path: "/plan", href: createHref("/plan") },
    { label: "Exercise Library", path: "/exercises", href: createHref("/exercises") },
    { label: "My Care", path: "/care-team", href: createHref("/care-team") },
    {
      label: "Messages",
      path: "/messages",
      href: createHref("/messages"),
      badge: unreadMessages > 0,
    },
    { label: "Progress", path: "/progress", href: createHref("/progress") },
  ];

  // During SSR and initial client hydration, use patientName to guarantee 100% hydration match
  const displayName = mounted && user?.fullName ? user.fullName : patientName;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <>
      {/* Top Banner if in Physiotherapist Preview Mode */}
      {effectivePreview && (
        <div className="bg-emerald-900 text-emerald-100 text-xs px-6 py-2 flex items-center justify-between z-40 border-b border-emerald-800 font-sans">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">
              Physiotherapist Preview Mode: Viewing {displayName}&apos;s patient portal (Read-only)
            </span>
          </div>
          <Link
            href="/therapist/workspace"
            className="text-[11px] font-bold bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1 rounded-md transition-colors"
          >
            ← Return to Therapist Workspace
          </Link>
        </div>
      )}

      {/* Main Patient Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl">🛡️</span>
            <span className="font-extrabold text-slate-900 tracking-tight text-lg group-hover:text-teal-700 transition-colors">
              AthleteMind
            </span>
          </Link>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-4 text-xs font-semibold">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg transition-all relative flex items-center gap-1.5 ${
                    isActive
                      ? "text-teal-900 bg-teal-50/80 font-bold border-b-2 border-teal-600 rounded-b-none"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      aria-label="New unread message"
                      className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white inline-block animate-pulse"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Controls: Help, Avatar Menu & Mobile Toggle */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Help Button */}
          <button
            ref={helpButtonRef}
            onClick={() => setHelpOpen(true)}
            aria-label="Open help and guidance panel"
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-1"
          >
            <span>❓</span>
            <span className="hidden sm:inline">Help</span>
          </button>

          {/* Patient Account Dropdown */}
          <div className="relative" ref={accountMenuRef}>
            <button
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              aria-expanded={accountMenuOpen}
              aria-label="Patient account menu"
              className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-bold text-xs flex items-center justify-center">
                {initials}
              </div>
              <span className="text-xs font-bold text-slate-800 hidden sm:inline">
                {displayName}
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">▼</span>
            </button>

            {/* Dropdown Menu */}
            {accountMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150 font-sans">
                <div className="px-4 py-2 border-b border-slate-100 flex flex-col">
                  <span className="text-xs font-bold text-slate-900">{displayName}</span>
                  <span className="text-[11px] text-slate-400 truncate">
                    {user?.email || "patient@athletemind.health"}
                  </span>
                  <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full inline-block w-fit">
                    Patient Role
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    href="/arena"
                    onClick={() => setAccountMenuOpen(false)}
                    className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium"
                  >
                    🚀 Bio-Bounty Hunter Arena Hub
                  </Link>
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setHelpOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium cursor-pointer"
                  >
                    📖 Clinical Guidance & Help
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex flex-col gap-1 shadow-md font-sans">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between ${
                  isActive
                    ? "bg-teal-50 text-teal-900 font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Help & Guidance Modal (Focus-trapped and dismissible with Escape) */}
      {helpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 flex flex-col gap-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🩺</span>
                <h2 id="help-title" className="text-base font-bold text-slate-900">
                  AthleteMind Patient Guidance
                </h2>
              </div>
              <button
                onClick={() => setHelpOpen(false)}
                aria-label="Close help modal"
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-5 text-xs text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              {/* Guidance Topic 1: Camera Setup */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <span>📹</span>
                  <span>Camera Setup & Positioning</span>
                </div>
                <p>
                  Place your laptop or camera at waist height, approximately 6–8 feet away. Ensure your entire body—from hip to ankle—remains visible in the frame during the full range of movement. Good lighting improves MediaPipe tracking reliability.
                </p>
              </div>

              {/* Guidance Topic 2: Exercise Instructions */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <span>📐</span>
                  <span>Finding Exercise Instructions</span>
                </div>
                <p>
                  Open <strong>Exercise Library</strong> in the top menu to view detailed joint angles, side-view setup requirements, and coaching tips. Your assigned daily target will always be marked with your physiotherapist&apos;s custom prescription.
                </p>
              </div>

              {/* Guidance Topic 3: Session Reports */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <span>📊</span>
                  <span>Opening Session Reports & Notes</span>
                </div>
                <p>
                  After finishing an arena workout, click <strong>Progress</strong> in the top navigation to review your deflection stats, peak flexion angles, and hold times. You can also view the full clinical debrief report and leave a note for your clinician.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setHelpOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Got it, thanks
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
