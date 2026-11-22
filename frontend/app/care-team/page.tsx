"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PatientHeader } from "@/components/PatientHeader";
import { CarePlan, getPublishedPlan } from "@/lib/care-plan";
import { useAuth } from "@/lib/auth-context";

function CareTeamContent() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") || undefined;
  const isPreview = searchParams.get("preview") === "true";

  const { user, isLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [plan, setPlan] = useState<CarePlan | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setPlan(getPublishedPlan(patientId));
  }, [patientId]);

  if (!isMounted || !plan || isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading clinical care team...</span>
        </div>
      </div>
    );
  }

  // If newly registered patient with no plan yet, show empty care state
  const hasCareRelationship = user?.hasActivePlan !== false;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col antialiased">
      <PatientHeader
        patientName={plan.patientName}
        patientId={patientId}
        isPreview={isPreview}
      />

      <main className="p-4 sm:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6 flex-1">
        {/* Title */}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-bold text-[10px] uppercase tracking-wider">
                Clinical Care Team • Biomechanical Supervision
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              My Care & Clinical Supervision
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Authorized clinical providers supervising your range-of-motion recovery and exercise prescriptions.
            </p>
          </div>
        </div>

        {hasCareRelationship ? (
          <div className="flex flex-col gap-6">
            {/* Primary Supervising Clinician Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xl flex items-center justify-center shrink-0">
                  MJ
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {plan.clinicianName || "Dr. Meera Joshi, PT"}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                      Verified Clinician
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consultant Sports & Orthopaedic Physiotherapist • Reg. PT-94021
                  </p>
                  <p className="text-xs text-slate-600 mt-2 font-medium">
                    Supervising: <span className="font-semibold text-slate-800">{plan.planTitle}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  href={`/messages${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
                  className="w-full sm:w-auto text-center px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs transition-all shadow-xs"
                >
                  Message clinician
                </Link>
              </div>
            </div>

            {/* Consultation & Schedule Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-md inline-block mb-2">
                    Active Care Plan Status
                  </span>
                  <h3 className="text-base font-bold text-slate-900">Synchronized Clinical Prescription</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Your exercise prescription is synchronized with your clinic. Modifications to flexion angles or hold durations update your daily missions automatically.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Current schedule:</span>
                  <span className="font-semibold text-slate-800">{plan.scheduleDesc}</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md inline-block mb-2">
                    Upcoming Review
                  </span>
                  <h3 className="text-base font-bold text-slate-900">Bi-Weekly Tele-Rehab Consultation</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Next clinical review scheduled after completion of Week 2 sessions to evaluate joint flexion arc progression.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-semibold text-emerald-700">✓ On Track</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state for newly registered patients */
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center max-w-lg mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-3xl mb-4">
              🩺
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No supervising physiotherapist linked</h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              You are currently using AthleteMind without an assigned clinical care team. Enter your supervising practitioner&apos;s clinic code to connect your account.
            </p>
            <div className="flex items-center gap-2 w-full max-w-xs">
              <input
                type="text"
                placeholder="Enter 6-digit clinic code"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-mono text-center uppercase"
              />
              <button
                onClick={() => alert("Clinic connection request sent. Your physiotherapist will approve access.")}
                className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Connect
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CareTeamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Loading clinical care team...</span>
          </div>
        </div>
      }
    >
      <CareTeamContent />
    </Suspense>
  );
}
