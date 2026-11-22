"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PatientHeader } from "@/components/PatientHeader";
import { EXERCISE_LIST, ExerciseConfig } from "@/lib/exercises";
import { CarePlan, getPublishedPlan } from "@/lib/care-plan";

function ExerciseLibraryContent() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") || undefined;
  const isPreview = searchParams.get("preview") === "true";

  const [isMounted, setIsMounted] = useState(false);
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseConfig | null>(null);
  const [filterRegion, setFilterRegion] = useState<string>("ALL");

  useEffect(() => {
    setIsMounted(true);
    setPlan(getPublishedPlan(patientId));
  }, [patientId]);

  if (!isMounted || !plan) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading exercise library...</span>
        </div>
      </div>
    );
  }

  const assignedExerciseId = plan.activeExerciseId || "squats";

  const filteredExercises = EXERCISE_LIST.filter((ex) => {
    if (filterRegion === "ALL") return true;
    return ex.targetRegion === filterRegion;
  });

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
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Clinical Exercise Library
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Browse 10 calibrated biomechanical movements with real-time MediaPipe joint kinematics.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
            {["ALL", "LOWER_BODY", "UPPER_BODY", "SPINE", "BALANCE"].map((region) => (
              <button
                key={region}
                onClick={() => setFilterRegion(region)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterRegion === region
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                {region.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Exercises Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExercises.map((ex) => {
            const isAssigned = ex.id === assignedExerciseId;
            return (
              <div
                key={ex.id}
                onClick={() => setSelectedExercise(ex)}
                className={`bg-white rounded-2xl border p-5 flex flex-col justify-between gap-4 cursor-pointer transition-all hover:shadow-md ${
                  isAssigned
                    ? "border-teal-500 ring-2 ring-teal-500/10 shadow-xs"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      {ex.targetRegion}
                    </span>
                    {isAssigned && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                        ★ Assigned in Plan
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    {ex.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {ex.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-400 font-mono text-[11px]">
                    Hold: {ex.deflectionHoldTime}s • {ex.primaryAngleName}
                  </span>
                  <span className="text-teal-700 font-bold hover:underline flex items-center gap-1">
                    Details <span>→</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Exercise Details Modal */}
      {selectedExercise && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 flex flex-col gap-6 relative max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                  {selectedExercise.targetRegion}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {selectedExercise.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedExercise(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs text-slate-600 leading-relaxed">
              <div>
                <span className="font-bold text-slate-800 block mb-1">Clinical Overview</span>
                <p>{selectedExercise.description}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                <span className="font-bold text-slate-800">Biomechanical Targets & Setup</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">Target Hold Time:</span>{" "}
                    <strong className="text-slate-800">{selectedExercise.deflectionHoldTime}s</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Target Region:</span>{" "}
                    <strong className="text-slate-800">{selectedExercise.targetRegion}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Primary Joint Angle:</span>{" "}
                    <strong className="text-slate-800">
                      {selectedExercise.primaryAngleName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Clinical Focus:</span>{" "}
                    <strong className="text-slate-800">{selectedExercise.clinicalFocus}</strong>
                  </div>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-1">Patient Instructions</span>
                <p className="bg-amber-50/50 border border-amber-200/60 p-3 rounded-xl text-slate-700">
                  {selectedExercise.instructions}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-1">Movement Guidance & Cues</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li><strong>Setup:</strong> {selectedExercise.prompts.initial}</li>
                  <li><strong>Active Hold:</strong> {selectedExercise.prompts.hold}</li>
                  <li><strong>Completion:</strong> {selectedExercise.prompts.complete}</li>
                  {selectedExercise.prompts.fault && (
                    <li className="text-rose-600"><strong>Kinematic Guardrail:</strong> {selectedExercise.prompts.fault}</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedExercise(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer shadow-xs"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExerciseLibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Loading exercise library...</span>
          </div>
        </div>
      }
    >
      <ExerciseLibraryContent />
    </Suspense>
  );
}
