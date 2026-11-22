"use client";

import React from "react";

interface RocketBlueprintHUDProps {
  playerHp: number;
  playerMaxHp?: number;
  isShieldActive: boolean;
  shieldHoldProgress?: number;
  isBreached?: boolean;
  isExploding?: boolean;
  repCycleStatus?: "STAND_READY" | "HOLDING" | "STAND_UP_TO_RECHARGE";
  exerciseName?: string;
  actionCue?: string;
  className?: string;
}

export const RocketBlueprintHUD: React.FC<RocketBlueprintHUDProps> = ({
  playerHp,
  playerMaxHp = 100,
  isShieldActive,
  shieldHoldProgress = 0,
  isBreached = false,
  isExploding = false,
  repCycleStatus = "STAND_READY",
  exerciseName,
  actionCue,
  className = "",
}) => {
  const hpPct = Math.max(0, Math.min(100, Math.round((playerHp / playerMaxHp) * 100)));

  // Determine damage severity per anatomical zone
  const isThrusterDamaged = hpPct < 85 || isBreached || isExploding;
  const isCoreDamaged = hpPct < 60 || (isBreached && hpPct < 80) || isExploding;
  const isCockpitDamaged = hpPct < 30 || (isBreached && hpPct < 50) || isExploding;

  const getActionWord = () => {
    if (actionCue) return actionCue.toUpperCase();
    const name = (exerciseName || "Squats").toLowerCase();
    if (name.includes("squat")) return "SQUAT";
    if (name.includes("pushup") || name.includes("push-up") || name.includes("wall_pushup")) return "LOWER";
    if (name.includes("balance")) return "BALANCE";
    if (name.includes("press")) return "PRESS UP";
    if (name.includes("scaption")) return "RAISE ARMS";
    if (name.includes("rdl")) return "HINGE HIPS";
    if (name.includes("calf")) return "RAISE CALVES";
    if (name.includes("march") || name.includes("knee")) return "RAISE KNEE";
    if (name.includes("rotation") || name.includes("torso")) return "ROTATE";
    if (name.includes("lunge")) return "LUNGE SIDE";
    return "ENGAGE";
  };

  const getStatusAndCue = () => {
    if (isExploding || hpPct <= 0) {
      return {
        statusTag: "DESTROYED",
        statusColor: "bg-rose-950/90 border-rose-600 text-rose-400 animate-ping",
        cueText: "VESSEL OFFLINE",
        cueColor: "text-rose-400",
        dotColor: "bg-rose-600 animate-ping",
      };
    }
    if (isBreached) {
      return {
        statusTag: "BREACHED",
        statusColor: "bg-rose-950/90 border-rose-500 text-rose-300",
        cueText: "IMPACT DETECTED",
        cueColor: "text-rose-400",
        dotColor: "bg-rose-500 animate-ping",
      };
    }
    if (repCycleStatus === "STAND_UP_TO_RECHARGE") {
      return {
        statusTag: "STAND UP",
        statusColor: "bg-amber-950/90 border-amber-500 text-amber-300 animate-pulse",
        cueText: "RECHARGE CAPACITOR",
        cueColor: "text-amber-400 font-black animate-pulse",
        dotColor: "bg-amber-400 animate-pulse",
      };
    }
    if (isShieldActive) {
      return {
        statusTag: "SHIELD UP",
        statusColor: "bg-cyan-950/90 border-cyan-400 text-cyan-300 animate-pulse",
        cueText: "HOLD POSTURE",
        cueColor: "text-cyan-300",
        dotColor: "bg-cyan-400 animate-pulse",
      };
    }
    if (hpPct <= 25) {
      return {
        statusTag: "CRITICAL",
        statusColor: "bg-rose-950/90 border-rose-500 text-rose-300 animate-pulse",
        cueText: `${getActionWord()} TO DEFLECT`,
        cueColor: "text-rose-300",
        dotColor: "bg-rose-500 animate-pulse",
      };
    }
    if (hpPct <= 60) {
      return {
        statusTag: "DAMAGED",
        statusColor: "bg-amber-950/80 border-amber-500 text-amber-300",
        cueText: `${getActionWord()} TO ENGAGE`,
        cueColor: "text-amber-300",
        dotColor: "bg-amber-500",
      };
    }
    // Default Ready state: Keep READY visually distinct from instruction
    return {
      statusTag: "READY",
      statusColor: "bg-emerald-950/80 border-emerald-400/80 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
      cueText: `${getActionWord()} TO ENGAGE`,
      cueColor: "text-cyan-300",
      dotColor: "bg-emerald-400",
    };
  };

  const statusInfo = getStatusAndCue();

  return (
    <div
      className={`relative flex flex-col items-center bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_25px_rgba(0,240,255,0.15)] font-mono select-none ${className}`}
    >
      {/* Top Header Bar with distinct READY status and dynamic Action Cue */}
      <div className="w-full flex items-center justify-between pb-1.5 border-b border-slate-800/80 mb-1.5 gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`} />
          <span className="text-[9px] sm:text-[10px] font-black text-cyan-300 uppercase tracking-widest">
            EXPLORER
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black border uppercase tracking-wider ${statusInfo.statusColor}`}
          >
            {statusInfo.statusTag}
          </span>
          <span
            className={`text-[8px] sm:text-[9px] font-bold tracking-wider uppercase ${statusInfo.cueColor}`}
          >
            {statusInfo.cueText}
          </span>
        </div>
      </div>

      {/* Blueprint Visualizer Container */}
      <div className="relative w-28 sm:w-36 lg:w-40 h-32 sm:h-44 lg:h-56 flex items-center justify-center overflow-hidden my-0.5">
        {/* Dynamic Kinetic Shield Forcefield Envelope */}
        {isShieldActive && !isExploding && (
          <div className="absolute inset-x-2 inset-y-1 rounded-full border-2 border-cyan-400/90 bg-cyan-500/15 shadow-[0_0_30px_rgba(0,240,255,0.85)] z-20 pointer-events-none animate-pulse flex items-center justify-center">
            {/* Hexagonal / Radial Forcefield Grid Rings */}
            <div className="absolute inset-0 rounded-full border border-cyan-300/40 scale-95" />
            <div className="absolute inset-0 rounded-full border border-cyan-200/20 scale-90" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] sm:text-[9px] font-black text-cyan-200 tracking-widest uppercase bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-400/60 shadow-lg">
              AEGIS SHIELD
            </div>
          </div>
        )}

        {/* Breach Alert Flashing Glitch Ring */}
        {isBreached && !isExploding && (
          <div className="absolute inset-0 border-2 border-rose-500 bg-rose-600/25 rounded-2xl z-25 pointer-events-none animate-ping" />
        )}

        {/* Exploding Vessel Fireball & Debris Overlay */}
        {isExploding && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-radial from-yellow-300 via-rose-600 to-transparent animate-ping opacity-75" />
            <div className="relative text-2xl sm:text-3xl animate-bounce">💥</div>
          </div>
        )}

        {/* Base Blueprint Image */}
        <img
          src="/blueprint.png"
          alt="Rocket Blueprint Schematic"
          className={`w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(0,240,255,0.4)] transition-all duration-300 ${
            isExploding ? "brightness-50 contrast-200 blur-[1px] rotate-3 scale-95" : isBreached ? "brightness-150 contrast-125" : ""
          }`}
        />

        {/* ----------------------------------------------------------------- */}
        {/* DAMAGE OVERLAY MASKS (SECTOR-SPECIFIC RED GLOW)                   */}
        {/* ----------------------------------------------------------------- */}

        {/* 1. Cockpit & Avionics Bay (Top 28%) */}
        {isCockpitDamaged && (
          <div
            className="absolute top-[3%] left-[20%] right-[20%] h-[26%] bg-gradient-to-b from-rose-600/70 to-rose-500/50 mix-blend-screen rounded-t-full pointer-events-none z-10 animate-pulse"
            style={{ filter: "drop-shadow(0 0 10px rgba(244,63,94,0.9))" }}
          >
            <span className="absolute -right-7 top-1 text-[7px] sm:text-[8px] font-black text-rose-300 uppercase bg-black/80 px-1 rounded border border-rose-500/60">
              AVIONICS
            </span>
          </div>
        )}

        {/* 2. Core Fusion Reactor & Mid-Hull (Middle 42%) */}
        {isCoreDamaged && (
          <div
            className="absolute top-[30%] left-[16%] right-[16%] h-[40%] bg-gradient-to-b from-rose-600/60 via-rose-500/70 to-rose-600/60 mix-blend-screen pointer-events-none z-10 animate-pulse"
            style={{ filter: "drop-shadow(0 0 12px rgba(244,63,94,0.9))" }}
          >
            <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-[7px] sm:text-[8px] font-black text-rose-300 uppercase bg-black/80 px-1 rounded border border-rose-500/60">
              CORE
            </span>
          </div>
        )}

        {/* 3. Ion Propulsion & Thruster Bay (Bottom 30%) */}
        {isThrusterDamaged && (
          <div
            className="absolute bottom-[3%] left-[18%] right-[18%] h-[28%] bg-gradient-to-t from-rose-600/80 to-rose-500/40 mix-blend-screen rounded-b-2xl pointer-events-none z-10 animate-pulse"
            style={{ filter: "drop-shadow(0 0 10px rgba(244,63,94,0.9))" }}
          >
            <span className="absolute -right-7 bottom-2 text-[7px] sm:text-[8px] font-black text-rose-300 uppercase bg-black/80 px-1 rounded border border-rose-500/60">
              THRUST
            </span>
          </div>
        )}
      </div>

      {/* Hull Integrity & Shield Capacity Gauges */}
      <div className="w-full flex flex-col gap-1 mt-1.5 pt-1.5 border-t border-slate-800/80">
        {/* SHIP INTEGRITY */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-bold">
            <span className="text-slate-400">SHIP INTEGRITY</span>
            <span
              className={
                hpPct > 60 ? "text-cyan-400" : hpPct > 25 ? "text-amber-400" : "text-rose-400 animate-pulse font-black"
              }
            >
              {hpPct}%
            </span>
          </div>
          <div className="w-full h-1 sm:h-1.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                hpPct > 60
                  ? "bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                  : hpPct > 25
                  ? "bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                  : "bg-gradient-to-r from-red-600 to-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.9)]"
              }`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        {/* AEGIS SHIELD POWER */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-bold">
            <span className="text-slate-400">AEGIS CAPACITOR</span>
            <span
              className={
                isShieldActive
                  ? "text-cyan-300 font-black"
                  : repCycleStatus === "STAND_UP_TO_RECHARGE"
                  ? "text-amber-400 font-bold"
                  : "text-slate-500"
              }
            >
              {isShieldActive ? "ONLINE (100%)" : repCycleStatus === "STAND_UP_TO_RECHARGE" ? "DISCHARGED" : "OFFLINE (0%)"}
            </span>
          </div>
          <div className="w-full h-1 sm:h-1.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                isShieldActive
                  ? "bg-gradient-to-r from-cyan-400 to-blue-400 shadow-[0_0_10px_rgba(0,240,255,0.8)]"
                  : repCycleStatus === "STAND_UP_TO_RECHARGE"
                  ? "bg-amber-600/40 animate-pulse"
                  : "bg-slate-800"
              }`}
              style={{ width: isShieldActive ? "100%" : repCycleStatus === "STAND_UP_TO_RECHARGE" ? "15%" : "0%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
