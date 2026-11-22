"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  CarePlan,
  SessionReport,
  getPublishedPlan,
  getAllSessionReports,
  getWeekDaysForAnchor,
  formatDetailHeadingDate,
  formatDateToYYYYMMDD,
  parseDateString,
  WeekDayCardInfo,
} from "@/lib/care-plan";
import { authService } from "@/lib/auth-service";

interface TherapistDailyReportViewProps {
  patientId: string;
}

export function TherapistDailyReportContent({ patientId }: TherapistDailyReportViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, signOut } = useAuth();

  const [isMounted, setIsMounted] = useState(false);
  const [patientPlan, setPatientPlan] = useState<CarePlan | null>(null);
  const [allReports, setAllReports] = useState<SessionReport[]>([]);

  // Selected date from searchParams or default focal date
  const dateFromQuery = searchParams.get("date");
  const [selectedDate, setSelectedDate] = useState<string>(dateFromQuery || "2026-11-24");
  const [anchorDate, setAnchorDate] = useState<string>(dateFromQuery || "2026-11-24");

  // Keep internal state in sync with URL date changes (e.g. browser back/forward)
  useEffect(() => {
    if (dateFromQuery && dateFromQuery !== selectedDate) {
      setSelectedDate(dateFromQuery);
      setAnchorDate(dateFromQuery);
    }
  }, [dateFromQuery, selectedDate]);

  // Load patient plan and reports
  useEffect(() => {
    setIsMounted(true);
    const plan = getPublishedPlan(patientId);
    setPatientPlan(plan);
    const reports = getAllSessionReports(patientId);
    setAllReports(reports);
  }, [patientId]);

  // Access control check
  const canAccess = authService.canViewSessionReport(user, patientId);

  useEffect(() => {
    if (isMounted && !isLoading) {
      if (!user) {
        router.push("/auth/therapist/login");
      } else if (user.role !== "physiotherapist") {
        router.push("/today");
      }
    }
  }, [isMounted, isLoading, user, router]);

  // Update selected date and push to URL for history persistence
  const handleSelectDate = useCallback(
    (newDateStr: string) => {
      setSelectedDate(newDateStr);
      // Update URL search param ?date=YYYY-MM-DD
      const params = new URLSearchParams(searchParams.toString());
      params.set("date", newDateStr);
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Week navigation controls
  const handlePrevWeek = () => {
    const current = parseDateString(anchorDate);
    current.setDate(current.getDate() - 7);
    const newAnchor = formatDateToYYYYMMDD(current);
    setAnchorDate(newAnchor);
    handleSelectDate(newAnchor);
  };

  const handleNextWeek = () => {
    const current = parseDateString(anchorDate);
    current.setDate(current.getDate() + 7);
    const newAnchor = formatDateToYYYYMMDD(current);
    setAnchorDate(newAnchor);
    handleSelectDate(newAnchor);
  };

  const handleTodayClick = () => {
    const today = "2026-11-24";
    setAnchorDate(today);
    handleSelectDate(today);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading clinical report...</span>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Redirecting to login...</span>
        </div>
      </div>
    );
  }

  // Role check: Only clinicians can view daily exercise reports
  if (user.role !== "physiotherapist") {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Redirecting...</span>
        </div>
      </div>
    );
  }

  // Access control check: Must be authorized for this specific patient in caseload
  if (!canAccess) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans p-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md text-center shadow-lg flex flex-col items-center gap-4">
          <span className="text-3xl">🔒</span>
          <h2 className="text-lg font-bold text-slate-900">Restricted Clinical Record</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your clinical account does not have authorization to audit reports for patient ID:{" "}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{patientId}</code>.
          </p>
          <Link
            href="/therapist/workspace"
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
          >
            Return to Caseload
          </Link>
        </div>
      </div>
    );
  }

  // Unavailable data state: Plan is missing or unavailable
  if (!patientPlan) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans p-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md text-center shadow-lg flex flex-col items-center gap-4">
          <span className="text-3xl">📋</span>
          <h2 className="text-lg font-bold text-slate-900">Plan Record Unavailable</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            No published rehabilitation plan could be found for patient ID:{" "}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{patientId}</code>.
          </p>
          <Link
            href="/therapist/workspace"
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
          >
            Return to Caseload
          </Link>
        </div>
      </div>
    );
  }

  // Calculate week days for current anchor
  const todayStr = "2026-11-24";
  const { weekRangeLabel, days } = getWeekDaysForAnchor(
    anchorDate,
    patientPlan,
    allReports,
    todayStr
  );

  // Selected day info
  const selectedDayInfo =
    days.find((d) => d.dateStr === selectedDate) ||
    days[0] || {
      dateStr: selectedDate,
      dayName: "Tue",
      dayNumber: 24,
      monthName: "Nov",
      isToday: selectedDate === todayStr,
      state: "rest_day",
      statusLabel: "Rest day",
      sessions: [],
      isRestDay: true,
    };

  const activeExercise =
    patientPlan.exercises.find((e) => e.id === patientPlan.activeExerciseId) ||
    patientPlan.exercises[0];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col antialiased">
      {/* ------------------------------------------------------------- */}
      {/* 1. Practitioner Header Bar (Kept visible as required)         */}
      {/* ------------------------------------------------------------- */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-6">
          <Link href="/therapist/workspace" className="flex items-center gap-2">
            <span className="text-xl">🩺</span>
            <span className="font-extrabold text-slate-900 tracking-tight text-lg">AthleteMind</span>
            <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              Physiotherapist
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-500">
            <Link
              href="/therapist/workspace"
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Caseload
            </Link>

            <Link
              href="/therapist/workspace"
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Consultation Requests
            </Link>

            <Link
              href={`/therapist/editor?patientId=${patientId}`}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Plan Editor
            </Link>

            <Link
              href={`/messages?patientId=${patientId}`}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Messages
            </Link>

            <span className="text-emerald-800 font-bold border-b-2 border-emerald-600 pb-0.5">
              Patient Reports
            </span>

            <Link href="/arena" className="hover:text-slate-900 transition-colors">
              Arena Hub
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-300">
              {(user?.fullName || "Clinician")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900">{user?.fullName || "Dr. Clinician, PT"}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {user?.qualification || "Physiotherapist"} • Verified
              </span>
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
      {/* Breadcrumb / Context Navigation Banner                        */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-100/90 border-b border-slate-200/80 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <Link
          href="/therapist/workspace"
          className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1.5 transition-colors"
        >
          <span>&larr;</span>
          <span>Back to caseload</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Patient:</span>
          <span className="font-bold text-slate-900">{patientPlan.patientName}</span>
          <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
            ID: {patientId}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Main Content Area                                             */}
      {/* ------------------------------------------------------------- */}
      <main className="p-4 sm:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6 flex-1">
        {/* Heading: Patient Name · Daily exercise reports */}
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                Clinical Telemetry &amp; Adherence Report
              </span>
              <span className="px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-semibold text-[10px]">
                {patientPlan.scheduleDesc.split("•")[0].trim()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {patientPlan.patientName} &middot; Daily exercise reports
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {patientPlan.planTitle} &bull; Week of {weekRangeLabel}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/therapist/editor?patientId=${patientId}`}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition-all flex items-center gap-1"
            >
              <span>✏️</span>
              <span>Edit Plan</span>
            </Link>
            <Link
              href={`/messages?patientId=${patientId}`}
              className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1"
            >
              <span>💬</span>
              <span>Message Patient</span>
            </Link>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 2. Rehabilitation Plan's Weekly Layout (Week Selector)       */}
        {/* ------------------------------------------------------------- */}
        <section
          aria-label="Weekly calendar"
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4"
        >
          {/* Header Controls: Week Range & Previous/Today/Next Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Weekly Care Schedule</h2>
              <p className="text-xs text-slate-400">
                Click any day to audit recorded biomechanical movements and range metrics
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={handlePrevWeek}
                aria-label="Previous week"
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold transition-all cursor-pointer"
              >
                &larr; Previous week
              </button>
              <button
                type="button"
                onClick={handleTodayClick}
                aria-label="Current week / Today"
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition-all cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextWeek}
                aria-label="Next week"
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold transition-all cursor-pointer"
              >
                Next week &rarr;
              </button>
            </div>
          </div>

          {/* Seven Clickable Date Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {days.map((day: WeekDayCardInfo) => {
              const isSelected = day.dateStr === selectedDate;

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`${day.dayName}, ${day.monthName} ${day.dayNumber}: ${day.statusLabel}${
                    day.countLabel ? `, ${day.countLabel}` : ""
                  }`}
                  onClick={() => handleSelectDate(day.dateStr)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectDate(day.dateStr);
                    }
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between h-28 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-600/30 ${
                    isSelected
                      ? "border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20 shadow-xs"
                      : day.isToday
                      ? "border-slate-300 bg-slate-50 hover:border-slate-400"
                      : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  {/* Top row: Weekday and Date number */}
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-500">{day.dayName}</span>
                    <div className="flex items-center gap-1">
                      {day.isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600" title="Today" />
                      )}
                      <span
                        className={`text-xs font-black ${
                          day.isToday ? "text-teal-700" : "text-slate-800"
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Status & Count */}
                  <div className="flex flex-col gap-0.5">
                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold block truncate ${
                        day.state === "completed"
                          ? "text-emerald-700 font-extrabold"
                          : day.state === "partial"
                          ? "text-amber-700 font-extrabold"
                          : day.state === "due_today"
                          ? "text-teal-700 font-extrabold"
                          : day.state === "no_session"
                          ? "text-rose-600 font-semibold"
                          : day.state === "upcoming"
                          ? "text-slate-400"
                          : "text-slate-400 font-normal"
                      }`}
                    >
                      {day.statusLabel}
                    </span>

                    {/* Useful count when available */}
                    {day.countLabel ? (
                      <span className="text-[10px] text-slate-600 font-medium block truncate">
                        {day.countLabel}
                      </span>
                    ) : day.isRestDay ? (
                      <span className="text-[10px] text-slate-400 block truncate">Recovery</span>
                    ) : (
                      <span className="text-[10px] text-slate-400 block truncate">
                        {activeExercise.reps} reps planned
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* 3. Daily Report Detail Panel (Updates when date is clicked)   */}
        {/* ------------------------------------------------------------- */}
        <section
          aria-label="Daily report detail panel"
          className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col gap-6"
        >
          {/* Header of Detail Panel: Exact unified date calculation */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {formatDetailHeadingDate(selectedDate)}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedDayInfo.isRestDay
                  ? "Scheduled muscular and ligamentous recovery"
                  : selectedDayInfo.sessions.length > 0
                  ? "Recorded clinical rehabilitation telemetry"
                  : selectedDayInfo.state === "due_today"
                  ? "Scheduled daily workout • Due today"
                  : selectedDayInfo.state === "upcoming"
                  ? "Future scheduled workout"
                  : "Past scheduled workout • No telemetry saved"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  selectedDayInfo.state === "completed"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : selectedDayInfo.state === "partial"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : selectedDayInfo.state === "due_today"
                    ? "bg-teal-50 text-teal-800 border-teal-200"
                    : selectedDayInfo.state === "no_session"
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : selectedDayInfo.state === "upcoming"
                    ? "bg-slate-100 text-slate-600 border-slate-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {selectedDayInfo.state === "completed" && "✓ Completed"}
                {selectedDayInfo.state === "partial" && "⚡ Partial Session"}
                {selectedDayInfo.state === "due_today" && "🎯 Due Today"}
                {selectedDayInfo.state === "no_session" && "⚠️ No Session Recorded"}
                {selectedDayInfo.state === "upcoming" && "📅 Upcoming"}
                {selectedDayInfo.state === "rest_day" && "🛌 Rest Day"}
              </span>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* DETAIL STATE A: SESSIONS RECORDED ON THIS DATE              */}
          {/* ----------------------------------------------------------- */}
          {selectedDayInfo.sessions.length > 0 ? (
            <div className="flex flex-col gap-6">
              {selectedDayInfo.sessions.map((session, idx) => {
                const p = session.prescriptionSnapshot || activeExercise;
                const skippedCount = Math.max(0, session.plannedMovements - session.performedMovements);

                return (
                  <div
                    key={session.id || idx}
                    className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-5"
                  >
                    {/* Session Top Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-100 border border-teal-300 text-teal-800 font-bold flex items-center justify-center text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{session.sessionTitle}</h4>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Plan v{session.planVersion || 1} &bull; Recorded {session.sessionDate}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 uppercase">
                          {session.syncStatus}
                        </span>
                        <Link
                          href={`/report?sessionId=${session.id}&patientId=${patientId}`}
                          className="px-3 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1"
                        >
                          <span>View session details</span>
                          <span>&rarr;</span>
                        </Link>
                      </div>
                    </div>

                    {/* Exercise Prescription Details (snapshot from that session) */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 font-mono flex flex-col items-center justify-center shrink-0">
                          <span className="text-[9px] uppercase font-bold text-amber-700">Target</span>
                          <span className="text-xs font-black">
                            {p.targetMinFlexionDeg}–{p.targetMaxFlexionDeg}°
                          </span>
                        </div>

                        <div>
                          <h5 className="font-bold text-slate-900 text-sm">{p.name}</h5>
                          <span className="text-slate-500 text-[11px] block mt-0.5">
                            Observed side: <strong>{p.observedSide} side</strong> &bull; Affected:{" "}
                            <strong>{p.affectedSide} knee</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Reps &amp; Sets</span>
                          <span className="font-bold text-slate-800">
                            {p.sets} set &times; {p.reps} reps
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Hold Duration</span>
                          <span className="font-bold text-teal-800">{p.holdDurationSec}s</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Rest Interval</span>
                          <span className="font-bold text-slate-800">{p.restSec}s</span>
                        </div>
                      </div>
                    </div>

                    {/* Completion & Movement Quality Breakdown (Requirement 3 Example) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {/* 1. Performed vs Target */}
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          Volume &amp; Quality
                        </span>
                        <div className="mt-1">
                          <span className="text-base font-black text-slate-900 block">
                            {session.performedMovements} of {session.plannedMovements} performed
                          </span>
                          <span className="text-xs font-bold text-emerald-700">
                            &bull; {session.metTargetAndHold} met range &amp; hold target
                          </span>
                        </div>
                      </div>

                      {/* 2. Releases & Skipped */}
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          Form Anomalies
                        </span>
                        <div className="mt-1">
                          <span className="text-xs font-semibold text-amber-800 block">
                            {session.earlyReleases > 0
                              ? `⚠️ ${session.earlyReleases} early release(s)`
                              : "✓ 0 early releases"}
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5 block">
                            {skippedCount > 0 ? `${skippedCount} skipped movement(s)` : "All movements attempted"}
                          </span>
                        </div>
                      </div>

                      {/* 3. Observed Range & Interruptions */}
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          Kinematics &amp; Pauses
                        </span>
                        <div className="mt-1">
                          <span className="text-xs font-bold font-mono text-teal-800 block">
                            {session.observedMinDeg}°–{session.observedMaxDeg}° peak arc
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5 block">
                            {session.trackingPauses > 0
                              ? `${session.trackingPauses} tracking pause(s)`
                              : "Continuous optical tracking"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Narrative & Patient Note */}
                    <div className="flex flex-col gap-2 text-xs">
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80">
                        <span className="font-bold text-slate-900 block mb-0.5">
                          {session.narrativeHeadline}
                        </span>
                        <p className="text-slate-600 leading-relaxed">{session.narrativeSubtext}</p>
                      </div>

                      {session.patientNote && (
                        <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70 text-slate-700">
                          <span className="font-bold text-amber-900 block mb-0.5">Patient Reported Feedback:</span>
                          <p className="italic">&quot;{session.patientNote}&quot;</p>
                        </div>
                      )}

                      {session.interruptions && session.interruptions.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600">
                          <span className="font-bold text-slate-700 block mb-0.5">Tracking Interruption Log:</span>
                          {session.interruptions.map((inter, i) => (
                            <p key={i} className="text-[11px]">
                              &bull; After Movement {inter.afterMovementNum}: {inter.durationSec}s pause ({inter.reason})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : selectedDayInfo.isRestDay ? (
            /* ----------------------------------------------------------- */
            /* DETAIL STATE B: REST DAY WITHOUT SAVED SESSION             */
            /* ----------------------------------------------------------- */
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center flex flex-col items-center justify-center gap-2">
              <span className="text-3xl">☕</span>
              <h4 className="font-bold text-slate-800 text-sm">Scheduled Muscular &amp; Ligamentous Recovery</h4>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                No rehabilitation exercises are prescribed for this date. The patient&apos;s rehabilitation protocol
                schedules recovery periods between active loading days to allow collagen synthesis and tissue remodeling.
              </p>
            </div>
          ) : (
            /* ----------------------------------------------------------- */
            /* DETAIL STATE C: SCHEDULED DAY WITHOUT SAVED SESSION         */
            /* ----------------------------------------------------------- */
            <div className="flex flex-col gap-6">
              <div
                className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
                  selectedDayInfo.state === "no_session"
                    ? "bg-rose-50 border-rose-200 text-rose-800"
                    : selectedDayInfo.state === "due_today"
                    ? "bg-teal-50 border-teal-200 text-teal-800"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <span className="text-xl">
                  {selectedDayInfo.state === "no_session"
                    ? "⚠️"
                    : selectedDayInfo.state === "due_today"
                    ? "🎯"
                    : "📅"}
                </span>
                <div>
                  <span className="font-bold block">
                    {selectedDayInfo.state === "no_session"
                      ? "No Session Recorded for Past Scheduled Day"
                      : selectedDayInfo.state === "due_today"
                      ? "Session Scheduled for Today (Awaiting Completion)"
                      : "Upcoming Scheduled Exercise Day"}
                  </span>
                  <span className="text-[11px] leading-relaxed block mt-0.5">
                    {selectedDayInfo.state === "no_session"
                      ? "No session was recorded for this date. The patient may have completed exercises offline or rested. This does not prove the patient did no exercise."
                      : selectedDayInfo.state === "due_today"
                      ? "The patient has not yet completed their prescribed exercise protocol for today."
                      : "This session is scheduled for an upcoming date in the patient's care calendar."}
                  </span>
                </div>
              </div>

              {/* Show Assigned Prescription for that Day */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-900">
                    Prescribed Exercise Protocol for {selectedDayInfo.dayName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Active Plan Version {patientPlan.version || 1}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 font-mono flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] uppercase font-bold text-amber-700">Target</span>
                      <span className="text-xs font-black">
                        {activeExercise.targetMinFlexionDeg}–{activeExercise.targetMaxFlexionDeg}°
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{activeExercise.name}</h4>
                      <span className="text-xs text-slate-500">
                        Observed side: <strong>{activeExercise.observedSide} side</strong> &bull; Affected:{" "}
                        <strong>{activeExercise.affectedSide} knee</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-right">
                      <span className="text-slate-400 block text-[9px] uppercase">Reps &amp; Sets</span>
                      <span className="font-bold text-slate-800">
                        {activeExercise.sets} set &times; {activeExercise.reps} reps
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[9px] uppercase">Hold Duration</span>
                      <span className="font-bold text-teal-800">{activeExercise.holdDurationSec}s</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[9px] uppercase">Rest Interval</span>
                      <span className="font-bold text-slate-800">{activeExercise.restSec}s</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/60 text-xs text-slate-600">
                  <span className="font-bold text-slate-800 block mb-1">Prescribed Clinical Instructions:</span>
                  <p className="leading-relaxed">{activeExercise.instructions}</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function TherapistDailyReportView({ patientId }: TherapistDailyReportViewProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <TherapistDailyReportContent patientId={patientId} />
    </Suspense>
  );
}
