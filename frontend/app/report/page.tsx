"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  SessionReport,
  SEED_SESSION_REPORT,
  getSessionReportById,
  updatePatientNote,
} from "@/lib/care-plan";

function SharedSessionReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const patientId = searchParams.get("patientId") || undefined;

  const { user, isLoading, signOut } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [report, setReport] = useState<SessionReport>(SEED_SESSION_REPORT);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [patientNoteInput, setPatientNoteInput] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const loaded = getSessionReportById(sessionId, patientId);
    setReport(loaded);
    setPatientNoteInput(loaded.patientNote || "");
  }, [sessionId, patientId]);

  // Auth guard: User must be signed in
  useEffect(() => {
    if (isMounted && !isLoading) {
      if (!user) {
        router.push("/");
      } else if (user.role === "physiotherapist" && !user.isVerified) {
        // Unverified practitioners cannot inspect clinical reports
        router.push("/therapist/workspace");
      }
    }
  }, [isMounted, isLoading, user, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const handleSaveNote = () => {
    updatePatientNote(patientNoteInput, patientId, report.id);
    setReport((prev) => ({ ...prev, patientNote: patientNoteInput }));
    setIsEditingNote(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const p = report.prescriptionSnapshot;

  if (!isMounted || isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#faf9f5] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading session report...</span>
        </div>
      </div>
    );
  }

  const isTherapist = user.role === "physiotherapist";
  const backHref = isTherapist ? "/therapist/workspace" : "/today";
  const backLabel = isTherapist ? "Back to Caseload" : "Back to Today";

  return (
    <div className="min-h-screen bg-[#faf9f5] text-slate-800 font-sans flex flex-col antialiased">
      {/* ------------------------------------------------------------- */}
      {/* Top Header Bar                                                */}
      {/* ------------------------------------------------------------- */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>←</span>
            <span>{backLabel}</span>
          </Link>
          <div className="h-3.5 w-px bg-slate-200" />
          <h1 className="text-sm font-bold text-slate-900">{report.sessionTitle}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Synced • Visible to {isTherapist ? "You & Patient" : "You & Dr. Meera Joshi"}</span>
          </div>

          <button
            onClick={handleSignOut}
            className="text-xs font-bold text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 px-3 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* Report Container                                              */}
      {/* ------------------------------------------------------------- */}
      <main className="p-4 sm:p-8 max-w-5xl mx-auto w-full flex flex-col gap-6 flex-1">
        {/* Top Summary Banner Card */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left Summary Narrative (8 cols) */}
          <div className="md:col-span-8 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                {p.name} • {p.affectedSide === "left" ? "Left knee" : "Right knee"}
              </span>
              <span className="text-xs text-slate-500">
                Original {report.sessionDate} prescription: {p.targetMinFlexionDeg}–{p.targetMaxFlexionDeg}° •{" "}
                {p.holdDurationSec.toFixed(1)} s hold (Plan v{report.planVersion})
              </span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {report.narrativeHeadline}
              </h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {report.narrativeSubtext}
              </p>
            </div>

            {/* 4 Stat Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Performed
                </span>
                <span className="text-base font-black text-slate-900">
                  {report.performedMovements} of {report.plannedMovements}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Met target &amp; hold
                </span>
                <span className="text-base font-black text-emerald-700">
                  {report.metTargetAndHold} ({report.metTargetAndHold} deflections)
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Early release
                </span>
                <span className="text-base font-black text-amber-700">
                  {report.earlyReleases}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Tracking pauses
                </span>
                <span className="text-base font-black text-slate-800">
                  {report.trackingPauses}
                </span>
              </div>
            </div>
          </div>

          {/* Right Arc Chart (Observed vs Prescribed) (4 cols) */}
          <div className="md:col-span-4 bg-slate-50/80 rounded-xl border border-slate-200/90 p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
              Observed vs. Prescribed Range
            </span>

            {/* SVG Range Arc Visualization */}
            <div className="relative w-44 h-24 flex items-center justify-center">
              <svg viewBox="0 0 180 100" className="w-full h-full">
                {/* Full Arc */}
                <path
                  d="M 25,80 A 65,65 0 0,1 155,80"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Target Zone Highlight */}
                <path
                  d="M 60,30 A 65,65 0 0,1 120,30"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <span className="text-xs font-bold text-slate-800 font-mono mt-1">
              Observed peak: {report.observedMinDeg}° – {report.observedMaxDeg}°
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              (Target: {p.targetMinFlexionDeg}–{p.targetMaxFlexionDeg}°)
            </span>
          </div>
        </section>

        {/* ----------------------------------------------------------- */}
        {/* Movement-by-movement Breakdown Table                        */}
        {/* ----------------------------------------------------------- */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Movement-by-movement breakdown
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-6">Movement</th>
                  <th className="py-3 px-6">Observed peak</th>
                  <th className="py-3 px-6">Hold duration</th>
                  <th className="py-3 px-6">Clinical outcome</th>
                  <th className="py-3 px-6">Game event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.movements.map((m) => {
                  const interruptionAfter = report.interruptions.find(
                    (intr) => intr.afterMovementNum === m.movementNum
                  );

                  return (
                    <React.Fragment key={m.movementNum}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-6 font-semibold text-slate-900">
                          Movement {m.movementNum}
                        </td>
                        <td className="py-3 px-6 font-mono text-slate-700">
                          {m.observedPeakDeg !== undefined ? `${m.observedPeakDeg}°` : "—"}
                        </td>
                        <td className="py-3 px-6 font-mono text-slate-700">
                          {m.holdDurationSec !== undefined ? `${m.holdDurationSec.toFixed(1)} s` : "—"}
                        </td>
                        <td className="py-3 px-6">
                          {m.outcome === "met_target" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
                              <span>✓</span>
                              <span>Met target</span>
                            </span>
                          )}
                          {m.outcome === "early_release" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-[11px]">
                              <span>⚠️</span>
                              <span>Early release</span>
                            </span>
                          )}
                          {m.outcome === "skipped" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 font-medium text-[11px]">
                              <span>Skipped</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-slate-600">
                          {m.gameEvent}
                        </td>
                      </tr>

                      {/* Interruption Alert Row */}
                      {interruptionAfter && (
                        <tr className="bg-amber-50/70 border-y border-amber-200/80">
                          <td colSpan={5} className="py-2.5 px-6 text-[11px] text-amber-900">
                            <span className="font-bold">⚠️ Tracking paused ({interruptionAfter.durationSec} s)</span>{" "}
                            — {interruptionAfter.reason}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ----------------------------------------------------------- */}
        {/* Bottom Row: Patient Note & Messaging / Therapist Action     */}
        {/* ----------------------------------------------------------- */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Left: Patient Note Card (7 cols) */}
          <div className="md:col-span-7 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 w-full">
              <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                AR
              </div>
              <div className="w-full">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Aanya&apos;s note from session
                  </span>
                  {!isEditingNote && (
                    <button
                      onClick={() => setIsEditingNote(true)}
                      className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
                    >
                      Edit note
                    </button>
                  )}
                </div>

                {isEditingNote ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <input
                      type="text"
                      value={patientNoteInput}
                      onChange={(e) => setPatientNoteInput(e.target.value)}
                      placeholder="Add an optional note about today's hold or effort..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveNote}
                        className="px-3 py-1 rounded-md bg-emerald-800 text-white font-bold text-xs cursor-pointer"
                      >
                        Save note
                      </button>
                      <button
                        onClick={() => setIsEditingNote(false)}
                        className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-medium text-slate-800 mt-1 italic">
                    &ldquo;{report.patientNote || "No note added."}&rdquo;
                  </p>
                )}

                {saveSuccess && (
                  <span className="text-[10px] text-emerald-600 font-bold block mt-1">
                    ✓ Note saved and synced to session report.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Buttons (5 cols) */}
          <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-3">
            <Link
              href={`/messages${patientId ? `?patientId=${patientId}` : ""}`}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>💬</span>
              <span>Message about this session</span>
            </Link>

            {isTherapist && (
              <Link
                href={`/therapist/editor?patientId=${patientId || "patient_aanya_rao"}&date=2026-11-28`}
                className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>📅</span>
                <span>Adjust upcoming session</span>
              </Link>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function SharedSessionReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf9f5] text-slate-800 flex items-center justify-center font-sans">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Loading session report...</span>
          </div>
        </div>
      }
    >
      <SharedSessionReportContent />
    </Suspense>
  );
}
