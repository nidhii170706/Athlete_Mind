"use client";

import React from "react";

interface CameraTestViewProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoWidth: number;
  videoHeight: number;
  fps: number;
  jointVisibility: {
    hips: number;
    knees: number;
    ankles: number;
    shoulders: number;
    overall: number;
  };
  distanceStatus: "OPTIMAL" | "TOO_CLOSE" | "TOO_FAR" | "SEARCHING";
  positioningInstruction?: string;
  isFullBodyDetected?: boolean;
  onBack: () => void;
  onLaunchArena: () => void;
}

export const CameraTestView: React.FC<CameraTestViewProps> = ({
  canvasRef,
  videoWidth,
  videoHeight,
  fps,
  jointVisibility,
  distanceStatus,
  positioningInstruction,
  isFullBodyDetected,
  onBack,
  onLaunchArena,
}) => {
  const isOptimal = isFullBodyDetected ?? distanceStatus === "OPTIMAL";

  const getStatusText = () => {
    if (positioningInstruction) return positioningInstruction.toUpperCase();
    if (distanceStatus === "OPTIMAL") return "OPTIMAL SENSOR DISTANCE // FULL BODY CALIBRATED";
    if (distanceStatus === "TOO_CLOSE") return "TOO CLOSE // STEP BACK 2-3 FEET";
    if (distanceStatus === "TOO_FAR") return "TOO FAR // STEP CLOSER TO CAMERA";
    return "SEARCHING FOR OPERATIVE // STEP INTO FRAME";
  };

  const statusText = getStatusText();

  return (
    <div className="relative w-full h-full min-h-screen bg-[#050811] text-white flex flex-col font-mono select-none overflow-hidden">
      {/* Top Header */}
      <header className="relative z-30 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-[#080d1a]/90 border-b border-slate-800/80 backdrop-blur-md shrink-0">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-slate-900/90 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-400 text-xs font-bold text-cyan-300 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shadow-lg"
        >
          <span>←</span>
          <span>BACK TO MENU</span>
        </button>

        {/* Center Title */}
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg">📷</span>
          <span className="text-xs sm:text-sm md:text-base font-black tracking-widest text-cyan-300 uppercase truncate">
            SENSOR DIAGNOSTICS & HARDWARE CALIBRATION
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={onLaunchArena}
          className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_20px_rgba(0,240,255,0.6)] transition-all flex items-center gap-1.5 sm:gap-2 transform hover:scale-105"
        >
          <span>⚔️</span>
          <span>ENTER ARENA</span>
        </button>
      </header>

      {/* Main Container: Split View or Overlaid Feed */}
      <div className="relative flex-1 w-full min-h-0 flex flex-col lg:flex-row items-stretch justify-center p-2 sm:p-4 gap-3 sm:gap-4 overflow-y-auto lg:overflow-hidden">
        {/* Center/Left: Live Mirrored Canvas Feed with Distance Bounding Box */}
        <div className="relative flex-1 w-full h-full min-h-[300px] lg:min-h-0 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-cyan-500/40 bg-black shadow-[0_0_50px_rgba(0,240,255,0.15)] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full h-full object-contain"
          />

          {/* Interactive Distance Bounding Box Reticle */}
          <div className="absolute inset-3 sm:inset-6 md:inset-8 pointer-events-none flex flex-col items-center justify-between">
            {/* Top Frame Status Pill */}
            <div
              className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-2xl border-2 backdrop-blur-md transition-all uppercase font-black tracking-widest text-[10px] sm:text-xs flex items-center gap-2 shadow-2xl text-center max-w-[90%] ${
                isOptimal
                  ? "bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.7)]"
                  : statusText.includes("ANKLES") || distanceStatus === "TOO_CLOSE"
                  ? "bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.7)] animate-pulse"
                  : statusText.includes("CENTRE") || distanceStatus === "TOO_FAR"
                  ? "bg-amber-950/90 border-amber-500 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.6)]"
                  : "bg-cyan-950/80 border-cyan-400 text-cyan-300 animate-pulse"
              }`}
            >
              <span>
                {isOptimal
                  ? "✅"
                  : statusText.includes("ANKLES") || distanceStatus === "TOO_CLOSE"
                  ? "⚠️"
                  : statusText.includes("CENTRE")
                  ? "↔️"
                  : "⏳"}
              </span>
              <span className="truncate">{statusText}</span>
            </div>

            {/* Visual Bounding Guide Rectangle */}
            <div
              className={`w-full max-w-lg h-[55%] sm:h-[65%] rounded-3xl border-2 border-dashed transition-all duration-300 ${
                isOptimal
                  ? "border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.4)]"
                  : statusText.includes("ANKLES") || distanceStatus === "TOO_CLOSE"
                  ? "border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.5)]"
                  : statusText.includes("CENTRE") || distanceStatus === "TOO_FAR"
                  ? "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                  : "border-cyan-500/40"
              }`}
            />

            {/* Lower Diagnostic Instruction */}
            <div className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl bg-black/80 border border-slate-700/80 text-[10px] sm:text-[11px] text-slate-300 backdrop-blur-md text-center">
              Ensure head, hips, knees, and ankles remain visible within the camera feed.
            </div>
          </div>
        </div>

        {/* Right Sidebar: Real-Time Telemetry Gauges */}
        <div className="w-full lg:w-72 xl:w-80 flex flex-col gap-2.5 sm:gap-3.5 z-20 shrink-0">
          {/* Gauge 1: Hardware Stream Specs */}
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-md shadow-xl flex flex-col gap-1.5 sm:gap-2">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              CAMERA HARDWARE FEED
            </span>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-slate-300">Resolution</span>
              <span className="text-xs sm:text-sm font-black font-mono text-cyan-400">
                {videoWidth > 0 ? `${videoWidth} × ${videoHeight}` : "640 × 480"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-slate-300">Frame Rate</span>
              <span className="text-xs sm:text-sm font-black font-mono text-emerald-400">
                {fps > 0 ? `${Math.round(fps)} FPS` : "60 FPS"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-slate-300">Inference Latency</span>
              <span className="text-[10px] sm:text-xs font-mono text-amber-300">&lt; 16.6ms (Real-Time)</span>
            </div>
          </div>

          {/* Gauge 2: Joint Visibility Index */}
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-md shadow-xl flex flex-col gap-2 sm:gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                JOINT VISIBILITY INDEX
              </span>
              <span className="text-xs font-black text-cyan-400">
                {Math.round(jointVisibility.overall * 100)}%
              </span>
            </div>

            {/* Hips */}
            <div>
              <div className="flex justify-between text-[10px] sm:text-[11px] mb-0.5">
                <span className="text-slate-300">Hips (L/R)</span>
                <span className="font-mono text-emerald-400">
                  {Math.round(jointVisibility.hips * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-200"
                  style={{ width: `${Math.min(100, jointVisibility.hips * 100)}%` }}
                />
              </div>
            </div>

            {/* Knees */}
            <div>
              <div className="flex justify-between text-[10px] sm:text-[11px] mb-0.5">
                <span className="text-slate-300">Knees (L/R)</span>
                <span className="font-mono text-cyan-400">
                  {Math.round(jointVisibility.knees * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-200"
                  style={{ width: `${Math.min(100, jointVisibility.knees * 100)}%` }}
                />
              </div>
            </div>

            {/* Ankles */}
            <div>
              <div className="flex justify-between text-[10px] sm:text-[11px] mb-0.5">
                <span className="text-slate-300">Ankles (L/R)</span>
                <span className="font-mono text-amber-400">
                  {Math.round(jointVisibility.ankles * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-200"
                  style={{ width: `${Math.min(100, jointVisibility.ankles * 100)}%` }}
                />
              </div>
            </div>

            {/* Shoulders */}
            <div>
              <div className="flex justify-between text-[10px] sm:text-[11px] mb-0.5">
                <span className="text-slate-300">Shoulders (L/R)</span>
                <span className="font-mono text-purple-400">
                  {Math.round(jointVisibility.shoulders * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-400 transition-all duration-200"
                  style={{ width: `${Math.min(100, jointVisibility.shoulders * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Launch Card */}
          <div className="p-3 sm:p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 backdrop-blur-md flex flex-col gap-2">
            <span className="text-xs font-bold text-cyan-300 uppercase">
              READY FOR KINETIC GAUNTLET?
            </span>
            <p className="text-[10px] sm:text-[11px] text-slate-400 leading-normal">
              Once joints show green and distance is calibrated, launch into the arena for live combat encounters.
            </p>
            <button
              onClick={onLaunchArena}
              className="mt-1 w-full py-2 sm:py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg transition-all"
            >
              START SQUAT ARENA →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
