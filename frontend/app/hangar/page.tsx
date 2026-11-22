"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { CarePlan, getPublishedPlan } from "@/lib/care-plan";

function MissionHangarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  const patientId = searchParams.get("patientId") || undefined;
  const isPreview = searchParams.get("preview") === "true";

  const [isMounted, setIsMounted] = useState(false);
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const published = getPublishedPlan(patientId);
    setPlan(published);
  }, [patientId]);

  // Auth guard: Requires patient session unless in authorized preview mode
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

  const handleLaunchMission = () => {
    // Navigate into existing arena with assigned parameter and patientId
    const query = patientId ? `?assigned=true&patientId=${patientId}` : "?assigned=true";
    router.push(`/arena${query}`);
  };

  if (!isMounted || isLoading || !user || (!isPreview && user.role !== "patient") || !plan) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-xs text-cyan-300 font-bold uppercase tracking-wider">Preparing Hangar Bay...</span>
        </div>
      </div>
    );
  }

  const backQuery = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return (
    <div className="min-h-screen bg-[#070b14] text-white font-mono flex flex-col antialiased select-none overflow-y-auto">
      {/* ------------------------------------------------------------- */}
      {/* Hangar Top Navigation                                         */}
      {/* ------------------------------------------------------------- */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href={`/today${backQuery}`}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>←</span>
            <span>Return to Today</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-cyan-400 tracking-wider">
              BIO-BOUNTY HUNTER
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-xs text-slate-300 font-semibold tracking-wide">
              Mission Hangar
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            {isAudioMuted ? "🔇 Audio Off" : "🔊 Audio On"}
          </button>
          <span className="text-xs text-emerald-400 border border-emerald-500/40 bg-emerald-950/60 px-3 py-1 rounded-full font-bold">
            BAY 04 • READY
          </span>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* Main 2-Column Hangar Layout (Stacked prominently on mobile)   */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Ship Showcase (Aegis-01) (6 cols)            */}
        {/* ========================================================= */}
        <section className="lg:col-span-6 bg-gradient-to-b from-slate-900/60 via-[#0a0f1d] to-[#050811] rounded-2xl border border-slate-800/80 p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl">
          {/* Subtle Cyber Grid */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:20px_20px]" />

          {/* Ship Header & Status */}
          <div className="flex items-start justify-between z-10">
            <div>
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                Assigned Kinetic Vessel
              </span>
              <h2 className="text-xl font-black text-white tracking-wider mt-0.5">
                AEGIS-01 INTERCEPTOR
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold">
              SHIELD 100%
            </span>
          </div>

          {/* Centered Spacecraft Hologram / Artwork */}
          <div className="my-auto py-8 flex flex-col items-center justify-center relative z-10">
            <div className="relative w-56 h-56 flex items-center justify-center">
              {/* Radial Glow */}
              <div className="absolute inset-0 rounded-full bg-cyan-500/15 blur-2xl animate-pulse" />
              {/* Outer Target Reticle Ring */}
              <div className="absolute inset-2 rounded-full border border-cyan-500/20 border-dashed animate-spin-slow" />
              <img
                src="/rocket.png"
                alt="Aegis-01 Interceptor"
                className="w-44 h-44 object-contain filter drop-shadow-[0_0_30px_rgba(0,240,255,0.6)] transform hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>

          {/* Bottom Tactical Briefing Quote */}
          <div className="z-10 px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
            <p className="text-xs text-slate-300 font-medium tracking-wide">
              &ldquo;Charge your shield with a hold. Return to deflect.&rdquo;
            </p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Mission Briefing & Boss Dossier (6 cols)    */}
        {/* ========================================================= */}
        <section className="lg:col-span-6 bg-slate-950/90 rounded-2xl border border-slate-800/90 p-6 flex flex-col justify-between gap-5 shadow-xl relative overflow-hidden">
          {/* Top Mission Title & Plan Tag */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase">
                ENCOUNTER 01
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-semibold text-slate-300">
                Monday Plan
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase">
              OPERATION: AEGIS RUN
            </h1>
          </div>

          {/* Boss Dossier Card (Valgus Goliath) */}
          <div className="rounded-xl border border-rose-900/40 bg-gradient-to-br from-rose-950/30 to-slate-900/60 p-4 flex items-center gap-4 relative overflow-hidden">
            <div className="w-20 h-20 rounded-lg bg-black/60 border border-rose-500/40 overflow-hidden shrink-0 flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              👾
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-rose-400 uppercase tracking-wider">
                  VALGUS GOLIATH
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono font-bold">
                  {activeExercise?.reps || 5} Plates
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Armoured shoulders • Exposed reactor
              </span>
            </div>
          </div>

          {/* Prescription Specs Grid (4 Tiles) */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-left">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Exercise
              </span>
              <span className="text-xs font-bold text-white block mt-0.5">
                {activeExercise?.name || "Therapeutic squat"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Observed side
              </span>
              <span className="text-xs font-bold text-cyan-300 block mt-0.5">
                {activeExercise?.observedSide === "left"
                  ? "Left side (Side-view)"
                  : "Right side (Side-view)"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Personal target
              </span>
              <span className="text-xs font-bold text-amber-400 font-mono block mt-0.5">
                {activeExercise?.targetMinFlexionDeg}–{activeExercise?.targetMaxFlexionDeg}° flexion
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Hold & Volume
              </span>
              <span className="text-xs font-bold text-emerald-400 font-mono block mt-0.5">
                {activeExercise?.holdDurationSec.toFixed(1)} s • {activeExercise?.reps} movements
              </span>
            </div>
          </div>

          {/* Privacy Note */}
          <p className="text-[11px] text-slate-400 leading-relaxed text-center sm:text-left">
            Your camera analyses movement locally on your device. No video is uploaded.
          </p>

          {/* Primary Action Button */}
          <button
            onClick={handleLaunchMission}
            className="w-full py-3.5 px-6 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-sm uppercase tracking-widest transition-all cursor-pointer shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:shadow-[0_0_35px_rgba(0,240,255,0.6)] flex items-center justify-center gap-2 group"
          >
            <span>🎥</span>
            <span>Check camera & Launch mission</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </section>
      </main>
    </div>
  );
}

export default function MissionHangarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center font-mono">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        </div>
      }
    >
      <MissionHangarContent />
    </Suspense>
  );
}
