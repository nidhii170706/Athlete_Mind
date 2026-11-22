"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { PatientHeader } from "@/components/PatientHeader";
import {
  CarePlan,
  DayScheduleItem,
  SEED_WEEKLY_SCHEDULE,
  getPublishedPlan,
  getLatestSessionReport,
} from "@/lib/care-plan";

function PatientTodayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  const patientId = searchParams.get("patientId") || undefined;
  const isPreview = searchParams.get("preview") === "true";

  const [isMounted, setIsMounted] = useState(false);
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [schedule] = useState<DayScheduleItem[]>(SEED_WEEKLY_SCHEDULE);
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-24");
  const [showDayDetails, setShowDayDetails] = useState<boolean>(false);
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState<boolean>(false);
  const [hasCompletedSession, setHasCompletedSession] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    const published = getPublishedPlan(patientId);
    setPlan(published);

    const report = getLatestSessionReport(patientId);
    if (report && report.performedMovements > 0) {
      setHasCompletedSession(true);
    }
  }, [patientId]);

  // Auth guard: Must be signed in as patient unless in authorized therapist preview mode
  useEffect(() => {
    if (isMounted && !isLoading) {
      if (!user) {
        router.push("/auth/patient/login");
      } else if (user.role === "physiotherapist" && !isPreview) {
        router.push("/therapist/workspace");
      }
    }
  }, [isMounted, isLoading, user, isPreview, router]);

  const activeExercise =
    plan?.exercises.find((e) => e.id === plan.activeExerciseId) || plan?.exercises[0];
  const selectedDay = schedule.find((d) => d.dateStr === selectedDate) || schedule[0];

  if (!isMounted || isLoading || !user || (!isPreview && user.role !== "patient") || !plan) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading today's care plan...</span>
        </div>
      </div>
    );
  }

  // Handle fresh patient accounts with no assigned plan yet
  const hasNoPlanYet = !isPreview && user.hasActivePlan === false;
  const displayName = isPreview ? plan.patientName : user.fullName || plan.patientName;

  const hangarQuery = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col antialiased">
      {/* Shared Reusable Patient Header */}
      <PatientHeader
        patientName={displayName}
        patientId={patientId}
        isPreview={isPreview}
      />

      {/* Main Container */}
      <main className="p-4 sm:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6 flex-1">
        {/* Empty State for Real New Patient Accounts */}
        {hasNoPlanYet ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center max-w-xl mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-3xl mb-4">
              📋
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
              No exercise plan yet
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
              Welcome, <strong className="text-slate-800">{displayName}</strong>. You do not have an active rehabilitation plan assigned by your physiotherapist yet. Once your clinician publishes your personalized exercise protocol, your daily missions, target flexion angles, and schedule will appear here.
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex flex-col gap-2 max-w-md text-left">
              <span className="font-bold text-slate-800">What to do next:</span>
              <div className="flex items-center gap-2">
                <span>1️⃣</span>
                <span>Contact your supervising physiotherapist to receive your rehabilitation prescription.</span>
              </div>
              <div className="flex items-center gap-2">
                <span>2️⃣</span>
                <span>Or explore the standalone arena from the homepage while waiting for your plan.</span>
              </div>
            </div>
            <Link
              href="/arena"
              className="mt-6 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-all shadow-xs"
            >
              Go to Arena Hub
            </Link>
          </div>
        ) : (
          /* Normal Plan Screen for Aanya Demo & Patients with Plans */
          <>
            {/* Top Greeting & Sync Status */}
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Monday, Nov 24 • Week 1 of 4
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Good afternoon, {displayName.split(" ")[0]}
                </h1>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200 text-xs font-medium text-slate-600 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Plan synced with {plan.clinicianName || "Dr. Meera Joshi, PT"}</span>
              </div>
            </div>

            {/* Active Plan / Today's Session Hero Card */}
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-12 items-stretch">
              <div className="p-6 md:p-8 md:col-span-7 flex flex-col justify-between gap-6 order-1 md:order-1">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-bold text-[10px] tracking-wider uppercase">
                      Today&apos;s mission • Aegis Run
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Prescribed by {plan.clinicianName || "Dr. Meera Joshi, PT"}
                    </span>
                  </div>

                  <div className="flex items-start gap-4 mt-1">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center shrink-0 text-amber-900 font-mono">
                      <span className="text-[10px] uppercase font-bold text-amber-700">Target</span>
                      <span className="text-xs font-black">
                        {activeExercise?.targetMinFlexionDeg}–{activeExercise?.targetMaxFlexionDeg}°
                      </span>
                    </div>

                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {activeExercise?.name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {activeExercise?.sets} set • {activeExercise?.reps} reps • {activeExercise?.holdDurationSec}s hold • {activeExercise?.restSec}s rest
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed mt-2">
                    <span className="font-bold text-slate-700 block mb-0.5">Therapist instructions:</span>
                    {activeExercise?.instructions}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href={`/hangar${hangarQuery}`}
                    className="px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <span>🚀</span>
                    <span>Enter Arena (Mission Hangar)</span>
                  </Link>

                  <button
                    onClick={() => setShowDayDetails(!showDayDetails)}
                    className="px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                  >
                    {showDayDetails ? "Hide day details" : "View day details"}
                  </button>

                  {hasCompletedSession && (
                    <Link
                      href={`/report${hangarQuery}`}
                      className="px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <span>📊</span>
                      <span>View report</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Right Decorative Boss Artwork */}
              <div className="md:col-span-5 bg-gradient-to-br from-[#0b1329] to-[#050811] p-6 flex flex-col items-center justify-center text-center relative overflow-hidden order-2 md:order-2 border-t md:border-t-0 md:border-l border-slate-200">
                <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:16px_16px]" />
                <div className="relative z-10 w-24 h-24 rounded-full bg-cyan-950/80 border-2 border-cyan-500/50 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(0,240,255,0.3)] mb-3">
                  👾
                </div>
                <span className="relative z-10 text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                  SECTOR BOSS // TIER 1
                </span>
                <span className="relative z-10 text-base font-mono font-black text-white uppercase mt-0.5">
                  VALGUS GOLIATH
                </span>
                <span className="relative z-10 text-[11px] font-mono text-slate-400 max-w-xs mt-1">
                  Defeat via {activeExercise?.reps} stable squat holds • Left knee alignment
                </span>
              </div>
            </section>

            {/* Expandable Day Details Drawer */}
            {showDayDetails && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Day Details • {selectedDay.dayName}, {selectedDay.dateStr}
                  </h3>
                  <button
                    onClick={() => setShowDayDetails(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
                  >
                    ✕ Close
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-1">Session Type</span>
                    <span className="font-bold text-slate-800">
                      {selectedDay.isRestDay ? "Rest Day" : `Squat • ${activeExercise?.reps} reps`}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-1">Target Flexion</span>
                    <span className="font-bold text-slate-800">
                      {activeExercise?.targetMinFlexionDeg}° – {activeExercise?.targetMaxFlexionDeg}°
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-1">Rest Interval</span>
                    <span className="font-bold text-slate-800">{activeExercise?.restSec} seconds</span>
                  </div>
                </div>
              </div>
            )}

            {/* Weekly Calendar Schedule Strip */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Weekly Care Schedule</h3>
                  <p className="text-xs text-slate-400">Week 1: Nov 24 – Nov 30</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMonthlyCalendar(true)}
                    className="text-xs font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>📅</span>
                    <span>Open monthly calendar</span>
                  </button>
                  <Link
                    href={`/plan${hangarQuery}`}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex items-center gap-1 shadow-2xs"
                  >
                    <span>Full Plan</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {schedule.map((day) => {
                  const isSelected = day.dateStr === selectedDate;
                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => {
                        setSelectedDate(day.dateStr);
                        setShowDayDetails(true);
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${
                        isSelected
                          ? "border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20"
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
                          {day.isRestDay ? "Rest day" : `Squat • ${activeExercise?.reps} reps`}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{day.subLabel}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Monthly Calendar Modal Overlay */}
            {showMonthlyCalendar && (
              <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150"
              >
                <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                          Monthly Overview
                        </span>
                        <span className="text-xs text-slate-400">November 2026</span>
                      </div>
                      <h2 className="text-xl font-black text-slate-900 mt-1">
                        Rehabilitation Calendar
                      </h2>
                    </div>
                    <button
                      onClick={() => setShowMonthlyCalendar(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <span>← Back to Today</span>
                    </button>
                  </div>

                  {/* 30 Days of November Grid */}
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-16 rounded-xl bg-slate-50/40 border border-slate-100/40" />
                      ))}

                      {Array.from({ length: 30 }).map((_, i) => {
                        const dayNum = i + 1;
                        const dateString = `2026-11-${String(dayNum).padStart(2, "0")}`;
                        const dayOfWeek = (dayNum + 5) % 7;
                        const isWorkout = dayOfWeek === 0 || dayOfWeek === 2 || dayOfWeek === 4;
                        const isToday = dayNum === 24;
                        const isSelected = selectedDate === dateString;

                        return (
                          <button
                            key={dateString}
                            onClick={() => setSelectedDate(dateString)}
                            className={`h-16 p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer text-xs ${
                              isSelected
                                ? "border-teal-600 bg-teal-50 ring-2 ring-teal-500/20"
                                : isToday
                                ? "border-teal-400 bg-teal-50/30"
                                : isWorkout
                                ? "border-slate-200 bg-white hover:border-slate-300"
                                : "border-slate-100 bg-slate-50/60 text-slate-400 hover:border-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className={`font-black text-[11px] ${isToday ? "text-teal-700" : "text-slate-800"}`}>
                                {dayNum}
                              </span>
                              {isWorkout && (
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                              )}
                            </div>
                            <span className="text-[9px] font-semibold truncate block">
                              {isWorkout ? `${activeExercise?.reps} reps` : "Rest"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Date Real Information Breakdown */}
                  {selectedDate && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <span className="text-xs font-bold text-slate-800">
                          Selected Date: {selectedDate}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                          {selectedDay ? (selectedDay.isRestDay ? "Rest & Recovery" : "Prescribed Session") : "Scheduled"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Movement</span>
                          <span className="font-bold text-slate-900">{activeExercise?.name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Prescription</span>
                          <span className="font-bold text-slate-900">{activeExercise?.reps} reps • {activeExercise?.sets} set</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Target Range</span>
                          <span className="font-bold text-teal-700">{activeExercise?.targetMinFlexionDeg}°–{activeExercise?.targetMaxFlexionDeg}°</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Hold Duration</span>
                          <span className="font-bold text-slate-900">{activeExercise?.holdDurationSec}s</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setShowMonthlyCalendar(false)}
                      className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                    >
                      ← Back to Today
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function PatientTodayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <PatientTodayContent />
    </Suspense>
  );
}
