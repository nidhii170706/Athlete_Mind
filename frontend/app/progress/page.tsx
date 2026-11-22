"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PatientHeader } from "@/components/PatientHeader";
import {
  CarePlan,
  SessionReport,
  getPublishedPlan,
  getLatestSessionReport,
  getAllSessionReports,
} from "@/lib/care-plan";
import { useAuth } from "@/lib/auth-context";

function ProgressContent() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") || undefined;
  const isPreview = searchParams.get("preview") === "true";

  const { user, isLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [allReports, setAllReports] = useState<SessionReport[]>([]);

  useEffect(() => {
    setIsMounted(true);
    setPlan(getPublishedPlan(patientId));
    const reportsList = getAllSessionReports(patientId);
    setAllReports(reportsList);
    setReport(reportsList[0] || getLatestSessionReport(patientId));
  }, [patientId]);

  if (!isMounted || !plan || isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading progress...</span>
        </div>
      </div>
    );
  }

  // Check if current patient has any completed workouts
  const hasCompletedSession =
    user?.hasActivePlan !== false && report && report.performedMovements > 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col antialiased">
      <PatientHeader
        patientName={plan.patientName}
        patientId={patientId}
        isPreview={isPreview}
      />

      <main className="p-4 sm:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6 flex-1">
        {/* Header */}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-bold text-[10px] uppercase tracking-wider">
                Rehabilitation Recovery Trajectory
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Progress &amp; Workout History
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Review completed arena sessions, hold purity, joint range of motion, and debrief reports.
            </p>
          </div>
        </div>

        {hasCompletedSession && report ? (
          <div className="flex flex-col gap-6">
            {/* Trajectory Stat Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Completed Sessions
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1">{allReports.length}</span>
                <span className="text-[11px] text-emerald-600 font-medium mt-0.5">✓ Calibrated</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Hold Purity
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1">
                  {Math.round((report.metTargetAndHold / report.plannedMovements) * 100)}%
                </span>
                <span className="text-[11px] text-teal-600 font-medium mt-0.5">
                  {report.metTargetAndHold} of {report.plannedMovements} holds met
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Observed Flexion
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1">
                  {report.observedMinDeg}°–{report.observedMaxDeg}°
                </span>
                <span className="text-[11px] text-slate-500 font-medium mt-0.5">Target: 35°–45°</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Deflection Shields
                </span>
                <span className="text-2xl font-black text-amber-600 mt-1">
                  {report.metTargetAndHold}
                </span>
                <span className="text-[11px] text-slate-500 font-medium mt-0.5">Bio-Bounty Hunter</span>
              </div>
            </div>

            {/* Selected Completed Session Debrief Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Selected Session • {report.sessionDate}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">{report.sessionTitle}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Exercise: {report.prescriptionSnapshot.name} ({report.performedMovements}/{report.plannedMovements} reps completed)
                  </p>
                </div>

                <Link
                  href={`/report?sessionId=${report.id}${patientId ? `&patientId=${patientId}` : ""}${isPreview ? "&preview=true" : ""}`}
                  className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs transition-all shadow-xs"
                >
                  View full clinical report →
                </Link>
              </div>

              {/* Repetition History Breakdown */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-700">Movement Breakdown</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  {report.movements.map((m) => (
                    <div
                      key={m.movementNum}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">Rep {m.movementNum}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            m.outcome === "met_target"
                              ? "bg-emerald-100 text-emerald-800"
                              : m.outcome === "early_release"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {m.outcome === "met_target"
                            ? "✓ Deflected"
                            : m.outcome === "early_release"
                            ? "⚠ Early"
                            : "Skipped"}
                        </span>
                      </div>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {m.observedPeakDeg !== undefined ? `${m.observedPeakDeg}° peak` : "—"} • {m.holdDurationSec !== undefined ? `${m.holdDurationSec}s hold` : "—"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 truncate">{m.gameEvent}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patient Note Preview */}
              {report.patientNote && (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-slate-700 flex flex-col gap-1">
                  <span className="font-bold text-amber-900">Your note for Dr. Meera:</span>
                  <p className="italic">&ldquo;{report.patientNote}&rdquo;</p>
                </div>
              )}
            </div>

            {/* All Saved Sessions List */}
            {allReports.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Saved Session Reports ({allReports.length})
                  </h3>
                  <span className="text-xs text-slate-400">Select any saved session to inspect its report</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {allReports.map((s) => {
                    const isSelected = report?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          isSelected
                            ? "border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/10 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {s.sessionDate} • Plan v{s.planVersion}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {s.metTargetAndHold}/{s.plannedMovements} holds
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-0.5">{s.sessionTitle}</h4>
                          <span className="text-xs text-slate-500">
                            {s.prescriptionSnapshot.name} • Observed {s.observedMinDeg}°–{s.observedMaxDeg}°
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <button
                            onClick={() => setReport(s)}
                            className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            Preview details
                          </button>
                          <Link
                            href={`/report?sessionId=${s.id}${patientId ? `&patientId=${patientId}` : ""}${isPreview ? "&preview=true" : ""}`}
                            className="px-3 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs transition-all flex items-center gap-1 shadow-2xs"
                          >
                            <span>Open report</span>
                            <span>&rarr;</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty state when no sessions have been logged yet */
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center max-w-lg mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-3xl mb-4">
              📈
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No completed workouts yet</h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Once you complete an exercise session in the Bio-Bounty Hunter arena, your joint angles, hold times, shield deflections, and recovery trajectory will appear here.
            </p>
            <Link
              href={`/hangar${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
              className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs transition-all shadow-xs"
            >
              Start today&apos;s workout in Hangar
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Loading progress...</span>
          </div>
        </div>
      }
    >
      <ProgressContent />
    </Suspense>
  );
}
