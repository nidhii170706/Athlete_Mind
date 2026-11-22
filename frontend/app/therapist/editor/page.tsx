"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { canEditCarePlan } from "@/lib/auth-service";
import {
  CarePlan,
  ExerciseItem,
  getDraftPlan,
  getPublishedPlan,
  getScopedPatientId,
  SEED_DRAFT_PLAN,
  saveDraftPlan,
  savePublishedPlan,
} from "@/lib/care-plan";

function TherapistEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, signOut, authMode } = useAuth();

  const [isMounted, setIsMounted] = useState(false);
  const [plan, setPlan] = useState<CarePlan>(SEED_DRAFT_PLAN);
  const [selectedExId, setSelectedExId] = useState<string>("squats");
  const [statusNotice, setStatusNotice] = useState<{ message: string; type: "draft" | "published" } | null>(null);

  // Patient Arc Simulator state (Right column)
  const [simulatedFlexion, setSimulatedFlexion] = useState<number>(20);
  const [simulatedHoldTime, setSimulatedHoldTime] = useState<number>(0);
  const [isSimulatingHold, setIsSimulatingHold] = useState<boolean>(false);

  const effectivePatientId =
    searchParams.get("patientId") || (user ? getScopedPatientId(user.id) : "patient_aanya_rao");

  useEffect(() => {
    setIsMounted(true);
    const loaded = getDraftPlan(effectivePatientId);
    setPlan(loaded);
    if (loaded.exercises.length > 0) {
      setSelectedExId(loaded.exercises[0].id);
    }
  }, [effectivePatientId]);

  // Auth Guard: Verified physiotherapists or any physiotherapist in local demo
  useEffect(() => {
    if (isMounted && !isLoading) {
      if (!user) {
        router.push("/auth/therapist/login");
      } else if (user.role === "patient") {
        router.push("/today");
      } else if (user.role === "physiotherapist" && !canEditCarePlan(user)) {
        router.push("/therapist/workspace");
      }
    }
  }, [isMounted, isLoading, user, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const activeExercise: ExerciseItem =
    plan.exercises.find((e) => e.id === selectedExId) || plan.exercises[0];

  const updateActiveExercise = (updates: Partial<ExerciseItem>) => {
    setPlan((prev) => {
      const nextExercises = prev.exercises.map((e) =>
        e.id === activeExercise.id ? { ...e, ...updates } : e
      );
      const updatedPlan = { ...prev, exercises: nextExercises, status: "draft" as const };
      return updatedPlan;
    });
  };

  const handleSaveDraft = () => {
    if (!user || user.role !== "physiotherapist" || !canEditCarePlan(user)) {
      alert("Unauthorized: Only authorized physiotherapists can modify care plans.");
      return;
    }
    saveDraftPlan(plan, effectivePatientId);
    setStatusNotice({ message: "Draft saved. Changes kept in draft mode.", type: "draft" });
    setTimeout(() => setStatusNotice(null), 3500);
  };

  const handlePublishPlan = () => {
    if (!user || user.role !== "physiotherapist" || !canEditCarePlan(user)) {
      alert("Unauthorized: Only authorized physiotherapists can publish care plans.");
      return;
    }
    // Validate values
    if (activeExercise.targetMinFlexionDeg >= activeExercise.targetMaxFlexionDeg) {
      alert("Minimum angle must be less than maximum angle.");
      return;
    }
    if (activeExercise.holdDurationSec <= 0) {
      alert("Hold duration must be greater than zero.");
      return;
    }
    if (activeExercise.reps <= 0 || !Number.isInteger(activeExercise.reps)) {
      alert("Planned repetitions must be a positive whole number.");
      return;
    }
    if (activeExercise.sets <= 0 || !Number.isInteger(activeExercise.sets)) {
      alert("Sets must be a positive whole number.");
      return;
    }

    savePublishedPlan(plan, effectivePatientId);
    setStatusNotice({
      message: `Plan published! Patient assignment updated to ${activeExercise.reps} reps (${activeExercise.targetMinFlexionDeg}°–${activeExercise.targetMaxFlexionDeg}°).`,
      type: "published",
    });
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // Simulate hold timer when slider is inside target zone
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const inZone =
      simulatedFlexion >= activeExercise.targetMinFlexionDeg &&
      simulatedFlexion <= activeExercise.targetMaxFlexionDeg;

    if (inZone) {
      setIsSimulatingHold(true);
      timer = setInterval(() => {
        setSimulatedHoldTime((prev) => {
          if (prev >= activeExercise.holdDurationSec) {
            return activeExercise.holdDurationSec;
          }
          return Math.round((prev + 0.1) * 10) / 10;
        });
      }, 100);
    } else {
      setIsSimulatingHold(false);
      setSimulatedHoldTime(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [simulatedFlexion, activeExercise.targetMinFlexionDeg, activeExercise.targetMaxFlexionDeg, activeExercise.holdDurationSec]);

  // Arc Gauge Geometry (SVG)
  const arcRadius = 60;
  const arcCenter = { x: 90, y: 80 };
  const angleToRad = (deg: number) => {
    const normalized = 180 + (deg / 90) * 180;
    return (normalized * Math.PI) / 180;
  };

  const getArcPoint = (deg: number) => {
    const rad = angleToRad(deg);
    return {
      x: arcCenter.x + arcRadius * Math.cos(rad),
      y: arcCenter.y + arcRadius * Math.sin(rad),
    };
  };

  const isFlexionInTarget =
    simulatedFlexion >= activeExercise.targetMinFlexionDeg &&
    simulatedFlexion <= activeExercise.targetMaxFlexionDeg;

  if (!isMounted || isLoading || !user || user.role !== "physiotherapist" || !canEditCarePlan(user)) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Verifying clinician authorization...</span>
        </div>
      </div>
    );
  }

  const clinicianName = user.fullName || plan.clinicianName;
  const clinicianInitials = clinicianName.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col antialiased">
      {/* ------------------------------------------------------------- */}
      {/* Top Global Navigation Bar                                     */}
      {/* ------------------------------------------------------------- */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-8">
          <Link href="/therapist/workspace" className="flex items-center gap-2 group">
            <span className="text-xl">🩺</span>
            <span className="font-extrabold text-slate-900 tracking-tight text-lg group-hover:text-emerald-700 transition-colors">
              AthleteMind
            </span>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              Physiotherapist
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-500">
            <Link href="/therapist/workspace" className="hover:text-slate-900 transition-colors font-semibold">
              Caseload
            </Link>
            <span className="text-emerald-700 font-bold border-b-2 border-emerald-600 pb-1 cursor-pointer">
              Plan Editor
            </span>
            <Link href="/arena" className="hover:text-slate-900 transition-colors">
              Arena Hub
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-300">
              {clinicianInitials}
            </div>
            <div className="hidden sm:flex flex-col text-left text-xs leading-tight">
              <span className="font-bold text-slate-800">{clinicianName}</span>
              <span className="text-[10px] text-emerald-600 font-semibold">{user.qualification || "PT, Clinical Supervisor"}</span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="text-xs font-bold text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* Subheader: Patient Details & Save/Publish Actions             */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/therapist/workspace"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <span>←</span>
            <span>Back to Caseload</span>
          </Link>

          <div className="h-4 w-px bg-slate-200" />

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-300 overflow-hidden flex items-center justify-center text-sm font-bold text-amber-800">
              AR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900">
                  {plan.patientName} • {plan.planTitle}
                </h1>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    plan.status === "draft"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  }`}
                >
                  {plan.status === "draft" ? "Draft" : "Published"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{plan.scheduleDesc}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href={`/today?patientId=${effectivePatientId}&preview=true`}
            target="_blank"
            className="px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <span>👁</span>
            <span>Preview Patient View</span>
          </Link>
          <button
            onClick={handleSaveDraft}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            Save draft
          </button>
          <button
            onClick={handlePublishPlan}
            className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Publish plan</span>
          </button>
        </div>
      </section>

      {/* Status Notice Toast */}
      {statusNotice && (
        <div
          className={`mx-6 mt-4 p-3 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${
            statusNotice.type === "published"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-amber-50 border border-amber-200 text-amber-800"
          }`}
        >
          <span>✓ {statusNotice.message}</span>
          <Link
            href={`/today?patientId=${effectivePatientId}&preview=true`}
            className="underline font-bold hover:text-emerald-950"
          >
            View Patient Today →
          </Link>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3-Column Editor Main Workspace                                */}
      {/* ------------------------------------------------------------- */}
      <main className="p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Selected Day's Exercise List (3 cols)        */}
        {/* ========================================================= */}
        <section className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Monday exercises
            </h2>
            <button
              onClick={() => {
                alert("Exercise library: Added Romanian Deadlift (RDL) to Monday protocol.");
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              + Add
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {plan.exercises.map((ex, idx) => {
              const isSelected = ex.id === selectedExId;
              return (
                <button
                  key={ex.id}
                  onClick={() => setSelectedExId(ex.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-1 ${
                    isSelected
                      ? "bg-emerald-50/60 border-emerald-600 shadow-xs ring-1 ring-emerald-600/20"
                      : "bg-white hover:bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {idx + 1}. {ex.name}
                    </span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {ex.affectedSide === "left" ? "Left" : "Right"}{" "}
                    {ex.id === "squats" ? "knee" : "leg"} • {ex.targetMinFlexionDeg}–
                    {ex.targetMaxFlexionDeg}° • {ex.holdDurationSec.toFixed(1)} s hold • {ex.reps} reps
                  </span>
                </button>
              );
            })}
          </div>

          {activeExercise.cameraSetupNote && (
            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-700 block mb-0.5">Camera setup note:</span>
              {activeExercise.cameraSetupNote}
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* CENTER COLUMN: The Exercise Form (5 cols)                 */}
        {/* ========================================================= */}
        <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">{activeExercise.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Customise target angle, hold time, and repetition structure.
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              {activeExercise.observedSide === "left" ? "Side view" : "Front view"}
            </span>
          </div>

          {/* Affected Side & Camera View Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Affected side
              </label>
              <select
                value={activeExercise.affectedSide}
                onChange={(e) =>
                  updateActiveExercise({
                    affectedSide: e.target.value as "left" | "right" | "bilateral",
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 cursor-pointer"
              >
                <option value="left">Left knee</option>
                <option value="right">Right knee</option>
                <option value="bilateral">Bilateral</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Observed camera side
              </label>
              <select
                value={activeExercise.observedSide}
                onChange={(e) =>
                  updateActiveExercise({
                    observedSide: e.target.value as "left" | "right" | "front",
                  })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 cursor-pointer"
              >
                <option value="left">Left side</option>
                <option value="right">Right side</option>
                <option value="front">Frontal view</option>
              </select>
            </div>
          </div>

          {/* Target Angles (Degrees Flexion) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Target minimum angle</label>
                <span className="text-[11px] text-slate-400 font-mono">deg</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={activeExercise.targetMinFlexionDeg}
                  onChange={(e) =>
                    updateActiveExercise({ targetMinFlexionDeg: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 pointer-events-none">
                  °
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Target maximum angle</label>
                <span className="text-[11px] text-slate-400 font-mono">deg</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={activeExercise.targetMaxFlexionDeg}
                  onChange={(e) =>
                    updateActiveExercise({ targetMaxFlexionDeg: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 pointer-events-none">
                  °
                </span>
              </div>
            </div>
          </div>

          {/* Hold Duration & Rest */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Hold duration</label>
                <span className="text-[11px] text-slate-400 font-mono">sec</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="30"
                  value={activeExercise.holdDurationSec}
                  onChange={(e) =>
                    updateActiveExercise({ holdDurationSec: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 pointer-events-none">
                  s
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Rest between reps</label>
                <span className="text-[11px] text-slate-400 font-mono">sec</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={activeExercise.restSec}
                  onChange={(e) =>
                    updateActiveExercise({ restSec: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 pointer-events-none">
                  s
                </span>
              </div>
            </div>
          </div>

          {/* Sets & Repetitions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Sets</label>
              <input
                type="number"
                min="1"
                max="10"
                value={activeExercise.sets}
                onChange={(e) => updateActiveExercise({ sets: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Repetitions
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={activeExercise.reps}
                onChange={(e) => updateActiveExercise({ reps: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Patient-Facing Instructions */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Patient-facing instructions
            </label>
            <textarea
              rows={3}
              value={activeExercise.instructions}
              onChange={(e) => updateActiveExercise({ instructions: e.target.value })}
              className="w-full p-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 leading-relaxed resize-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Shown directly on Aanya&apos;s daily workout card and pre-flight mission hangar.
            </p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Patient Preview (4 cols)                    */}
        {/* ========================================================= */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          {/* Target Arc & Hold Visualizer */}
          <div className="bg-[#0f172a] rounded-xl p-5 text-white shadow-sm flex flex-col items-center border border-slate-800">
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800/80 mb-2">
              <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                Live Kinetic Arc Preview
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {activeExercise.targetMinFlexionDeg}° – {activeExercise.targetMaxFlexionDeg}°
              </span>
            </div>

            {/* SVG Arc Gauge */}
            <div className="relative w-48 h-32 flex items-center justify-center">
              <svg viewBox="0 0 180 120" className="w-full h-full">
                {/* Background Full Track (0 to 90 deg) */}
                <path
                  d="M 30,80 A 60,60 0 0,1 150,80"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="10"
                  strokeLinecap="round"
                />

                {/* Target Zone Arc Segment */}
                {(() => {
                  const pStart = getArcPoint(activeExercise.targetMinFlexionDeg);
                  const pEnd = getArcPoint(activeExercise.targetMaxFlexionDeg);
                  return (
                    <path
                      d={`M ${pStart.x},${pStart.y} A 60,60 0 0,1 ${pEnd.x},${pEnd.y}`}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                  );
                })()}

                {/* Simulated Patient Knee Pointer */}
                {(() => {
                  const pt = getArcPoint(simulatedFlexion);
                  return (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="7"
                      fill={isFlexionInTarget ? "#22c55e" : "#f59e0b"}
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      className="transition-all duration-75"
                    />
                  );
                })()}
              </svg>

              {/* Angle Readout in Center */}
              <div className="absolute top-12 flex flex-col items-center">
                <span
                  className={`text-2xl font-black font-mono transition-colors ${
                    isFlexionInTarget ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {simulatedFlexion}°
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-400">
                  {isFlexionInTarget ? "Target Zone Met" : "Adjusting Angle"}
                </span>
              </div>
            </div>

            {/* Knee Flexion Simulator Slider */}
            <div className="w-full mt-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Simulate patient knee flexion</span>
                <span className="text-cyan-400 font-bold">
                  {simulatedHoldTime.toFixed(1)} / {activeExercise.holdDurationSec.toFixed(1)} s
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                value={simulatedFlexion}
                onChange={(e) => setSimulatedFlexion(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
            </div>
          </div>

          {/* "What Aanya sees on Today" Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              What Aanya sees on Today
            </span>
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">{activeExercise.name}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {activeExercise.instructions}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function TherapistEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Loading clinical editor...</span>
          </div>
        </div>
      }
    >
      <TherapistEditorContent />
    </Suspense>
  );
}
