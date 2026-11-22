"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PatientHeader } from "@/components/PatientHeader";
import {
  CarePlan,
  DayScheduleItem,
  SEED_WEEKLY_SCHEDULE,
  getPublishedPlan,
} from "@/lib/care-plan";

function MyPlanContent() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId") || undefined;
  const isPreview = searchParams.get("preview") === "true";

  const [isMounted, setIsMounted] = useState(false);
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-24");
  const [schedule] = useState<DayScheduleItem[]>(SEED_WEEKLY_SCHEDULE);

  useEffect(() => {
    setIsMounted(true);
    const published = getPublishedPlan(patientId);
    setPlan(published);
  }, [patientId]);

  if (!isMounted || !plan) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading published plan...</span>
        </div>
      </div>
    );
  }

  const activeExercise =
    plan.exercises.find((e) => e.id === plan.activeExerciseId) || plan.exercises[0];
  const selectedDay = schedule.find((d) => d.dateStr === selectedDate) || schedule[0];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col antialiased">
      <PatientHeader
        patientName={plan.patientName}
        patientId={patientId}
        isPreview={isPreview}
      />

      <main className="p-4 sm:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6 flex-1">
        {/* Title & Sync Notice */}
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                Published Clinical Protocol • Read-Only
              </span>
              <span className="text-xs text-slate-400">Week 1 of 4</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              My Rehabilitation Plan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Prescribed by {plan.clinicianName} • {plan.scheduleDesc}
            </p>
          </div>

          <Link
            href={`/today${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
          >
            <span>← Back to Today</span>
          </Link>
        </div>

        {/* Weekly Calendar Selector */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Weekly Care Schedule</h2>
              <p className="text-xs text-slate-400">Click any day to inspect its prescribed protocol</p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
              3 Sessions Scheduled
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {schedule.map((day) => {
              const isSelected = day.dateStr === selectedDate;
              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${
                    isSelected
                      ? "border-teal-600 bg-teal-50/60 ring-2 ring-teal-500/20"
                      : day.isToday
                      ? "border-slate-300 bg-slate-50"
                      : "border-slate-100 bg-white hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-500">{day.dayName}</span>
                    <span
                      className={`text-xs font-black ${
                        day.isToday ? "text-teal-700" : "text-slate-800"
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-800 block truncate">
                      {day.isRestDay ? "Rest day" : `Squat • ${activeExercise.reps} reps`}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{day.subLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Day Protocol Details Panel */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {selectedDay.dayName}, {selectedDay.dateStr}
              </h3>
              <span className="text-xs text-slate-400">
                {selectedDay.isRestDay
                  ? "Scheduled muscular and ligamentous recovery"
                  : "Prescribed biomechanical deflection session"}
              </span>
            </div>

            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                selectedDay.isRestDay
                  ? "bg-slate-100 text-slate-600 border border-slate-200"
                  : "bg-teal-50 text-teal-800 border border-teal-200"
              }`}
            >
              {selectedDay.isRestDay ? "🛌 Rest Day" : "🎯 Scheduled Workout"}
            </span>
          </div>

          {selectedDay.isRestDay ? (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center flex flex-col items-center justify-center gap-2">
              <span className="text-3xl">☕</span>
              <h4 className="font-bold text-slate-800 text-sm">Recovery Day</h4>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                No biomechanical exercises are scheduled for this date. Allow connective tissues in your left knee to adapt and regenerate before your next arena session.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Exercise Prescription Card */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 font-mono flex flex-col items-center justify-center">
                      <span className="text-[9px] uppercase font-bold text-amber-700">Target</span>
                      <span className="text-xs font-black">
                        {activeExercise.targetMinFlexionDeg}–{activeExercise.targetMaxFlexionDeg}°
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900">{activeExercise.name}</h4>
                      <span className="text-xs text-slate-500">
                        Observed side: <strong>{activeExercise.observedSide} side</strong> • Affected: <strong>{activeExercise.affectedSide} knee</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase">Reps & Sets</span>
                      <span className="font-bold text-slate-800">
                        {activeExercise.sets} set × {activeExercise.reps} reps
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase">Hold Duration</span>
                      <span className="font-bold text-teal-800">{activeExercise.holdDurationSec}s</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase">Rest Period</span>
                      <span className="font-bold text-slate-800">{activeExercise.restSec}s</span>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="pt-3 border-t border-slate-200/60 text-xs text-slate-600">
                  <span className="font-bold text-slate-800 block mb-1">Therapist Instructions:</span>
                  <p className="leading-relaxed">{activeExercise.instructions}</p>
                </div>
              </div>

              {/* Action Hand-off to Today / Arena */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Ready to train? Enter the hangar to calibrate your camera.
                </span>
                <Link
                  href={`/hangar${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5"
                >
                  <span>🚀</span>
                  <span>Open Mission Hangar</span>
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function MyPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <MyPlanContent />
    </Suspense>
  );
}
