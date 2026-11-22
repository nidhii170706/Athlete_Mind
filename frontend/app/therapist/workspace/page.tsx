"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getScopedPatientId, getPublishedPlan } from "@/lib/care-plan";
import {
  ConsultationRequestRecord,
  getTherapistConsultationRequests,
  acceptConsultationRequest,
  declineConsultationRequest,
} from "@/lib/consultations";

export default function TherapistWorkspacePage() {
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  // Active top navigation tab: "caseload" | "consultations"
  const [workspaceTab, setWorkspaceTab] = useState<"caseload" | "consultations">("caseload");

  // Selected patient care context
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Patient Picker Modal (opened if Plan Editor or Reports clicked without selecting patient)
  const [showPatientPicker, setShowPatientPicker] = useState<"editor" | "reports" | "messages" | null>(null);

  // Consultation requests list
  const [consultations, setConsultations] = useState<ConsultationRequestRecord[]>([]);

  const loadConsultations = useCallback(() => {
    if (user?.id) {
      const list = getTherapistConsultationRequests(user.id);
      setConsultations(list);
    }
  }, [user?.id]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    loadConsultations();
  }, [loadConsultations]);

  useEffect(() => {
    const handleUpdate = () => {
      loadConsultations();
    };
    window.addEventListener("athletemind_consultations_updated", handleUpdate);
    return () => window.removeEventListener("athletemind_consultations_updated", handleUpdate);
  }, [loadConsultations]);

  // Auth guard: Must be signed in as a physiotherapist
  useEffect(() => {
    if (isMounted && !isLoading) {
      if (!user) {
        router.push("/auth/therapist/login");
      } else if (user.role !== "physiotherapist") {
        router.push("/today");
      }
    }
  }, [isMounted, isLoading, user, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (!isMounted || isLoading || !user || user.role !== "physiotherapist") {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading practitioner workspace...</span>
        </div>
      </div>
    );
  }

  // Scoped fictional demo patient for this physiotherapist
  const scopedPatientId = getScopedPatientId(user.id);
  const patientPlan = getPublishedPlan(scopedPatientId);
  const activeEx = patientPlan.exercises[0];

  // Patients in caseload
  const baseCaseload = [
    {
      id: scopedPatientId,
      name: "Aanya Rao",
      initials: "AR",
      color: "bg-amber-100 border-amber-300 text-amber-800",
      planTitle: patientPlan.planTitle,
      version: patientPlan.version || 1,
      schedule: "Mon - Wed - Fri schedule",
      exercise: activeEx,
      status: "Active",
      isPrimaryDemo: true,
    },
    {
      id: "sample_dev_patel",
      name: "Dev Patel",
      initials: "DP",
      color: "bg-teal-100 border-teal-300 text-teal-800",
      planTitle: "Post-Meniscectomy Knee Rehab",
      version: 1,
      schedule: "Tue - Thu - Sat schedule",
      exercise: {
        name: "Controlled Terminal Knee Extension",
        targetMinFlexionDeg: 10,
        targetMaxFlexionDeg: 25,
        reps: 6,
        holdDurationSec: 2.0,
      },
      status: "Active",
      isPrimaryDemo: false,
    },
  ];

  // Dynamically include patients admitted through consultation requests
  const admittedPatients = consultations
    .filter((c) => c.status === "admitted")
    .map((c) => {
      const pPlan = getPublishedPlan(c.patientId);
      const ex = pPlan.exercises[0] || activeEx;
      return {
        id: c.patientId,
        name: c.patientName,
        initials: c.patientName
          .replace(/^Dr\.\s+/i, "")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2),
        color: "bg-emerald-100 border-emerald-300 text-emerald-800",
        planTitle: pPlan.planTitle || "Personalized Knee Rehabilitation Protocol",
        version: pPlan.version || 1,
        schedule: pPlan.scheduleDesc || "Mon - Wed - Fri schedule",
        exercise: ex,
        status: "Active",
        isPrimaryDemo: false,
      };
    })
    .filter((p) => !baseCaseload.some((b) => b.id === p.id));

  const caseloadPatients = [...baseCaseload, ...admittedPatients];

  const handleSelectPatient = (pid: string) => {
    if (selectedPatientId === pid) {
      setSelectedPatientId(null);
    } else {
      setSelectedPatientId(pid);
    }
  };

  const handlePlanEditorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedPatientId) {
      router.push(`/therapist/editor?patientId=${selectedPatientId}`);
    } else {
      setShowPatientPicker("editor");
    }
  };

  const handleMessagesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const pid = selectedPatientId || scopedPatientId;
    router.push(`/messages?patientId=${pid}`);
  };

  const handleReportsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedPatientId) {
      router.push(`/therapist/patients/${selectedPatientId}/reports`);
    } else {
      setShowPatientPicker("reports");
    }
  };

  const handlePickerSelect = (pid: string) => {
    const action = showPatientPicker;
    setShowPatientPicker(null);
    setSelectedPatientId(pid);

    if (action === "editor") {
      router.push(`/therapist/editor?patientId=${pid}`);
    } else if (action === "reports") {
      router.push(`/therapist/patients/${pid}/reports`);
    } else if (action === "messages") {
      router.push(`/messages?patientId=${pid}`);
    }
  };

  const handleAdmitConsult = async (id: string) => {
    await acceptConsultationRequest(id);
    loadConsultations();
  };

  const handleDeclineConsult = (id: string) => {
    declineConsultationRequest(id);
    loadConsultations();
  };

  const activeSelectedPatient = caseloadPatients.find((p) => p.id === selectedPatientId);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col antialiased">
      {/* ------------------------------------------------------------- */}
      {/* Professional Top Navigation Header                            */}
      {/* ------------------------------------------------------------- */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🩺</span>
            <span className="font-extrabold text-slate-900 tracking-tight text-lg">AthleteMind</span>
            <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              Physiotherapist
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => setWorkspaceTab("caseload")}
              className={`pb-0.5 cursor-pointer transition-colors ${
                workspaceTab === "caseload"
                  ? "text-emerald-800 font-bold border-b-2 border-emerald-600"
                  : "hover:text-slate-900"
              }`}
            >
              Caseload
            </button>

            <button
              type="button"
              onClick={() => setWorkspaceTab("consultations")}
              className={`pb-0.5 cursor-pointer transition-colors flex items-center gap-1.5 ${
                workspaceTab === "consultations"
                  ? "text-emerald-800 font-bold border-b-2 border-emerald-600"
                  : "hover:text-slate-900"
              }`}
            >
              <span>Consultation Requests</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {consultations.filter((c) => c.status === "pending").length}
              </span>
            </button>

            <button
              type="button"
              onClick={handlePlanEditorClick}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Plan Editor
            </button>

            <button
              type="button"
              onClick={handleMessagesClick}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Messages
            </button>

            <button
              type="button"
              onClick={handleReportsClick}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Patient Reports
            </button>

            <Link href="/arena" className="hover:text-slate-900 transition-colors">
              Arena Hub
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-300">
              {user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900">{user.fullName}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {user.qualification || "Physiotherapist"} • {user.isVerified ? "Verified" : "Pending Audit"}
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
      {/* Active Patient Care Context Banner (if patient selected)     */}
      {/* ------------------------------------------------------------- */}
      {activeSelectedPatient && (
        <aside
          aria-label="Active patient care context"
          className="bg-emerald-900 text-emerald-50 px-4 sm:px-6 py-3 border-b border-emerald-800 flex flex-wrap items-center justify-between gap-3 shadow-sm animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center border border-emerald-500">
              {activeSelectedPatient.initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                  Active Patient Context:
                </span>
                <span className="text-sm font-black text-white">{activeSelectedPatient.name}</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-800 text-emerald-200 font-mono">
                  ID: {activeSelectedPatient.id}
                </span>
              </div>
              <p className="text-[11px] text-emerald-200">
                {activeSelectedPatient.planTitle} • {activeSelectedPatient.schedule}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/therapist/editor?patientId=${activeSelectedPatient.id}`}
              className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1"
            >
              <span>✏️</span>
              <span>Edit Plan</span>
            </Link>

            <Link
              href={`/today?patientId=${activeSelectedPatient.id}&preview=true`}
              className="py-1.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs font-bold border border-emerald-700 transition-all flex items-center gap-1"
            >
              <span>👁️</span>
              <span>Preview Portal</span>
            </Link>

            <Link
              href={`/messages?patientId=${activeSelectedPatient.id}`}
              className="py-1.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs font-bold border border-emerald-700 transition-all flex items-center gap-1"
            >
              <span>💬</span>
              <span>Message</span>
            </Link>

            <Link
              href={`/report?patientId=${activeSelectedPatient.id}`}
              className="py-1.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs font-bold border border-emerald-700 transition-all flex items-center gap-1"
            >
              <span>📊</span>
              <span>Reports</span>
            </Link>

            <button
              type="button"
              onClick={() => setSelectedPatientId(null)}
              className="text-xs text-emerald-300 hover:text-white px-2 py-1 rounded transition-colors"
              title="Clear selection"
            >
              ✕ Clear
            </button>
          </div>
        </aside>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Main Workspace Body                                           */}
      {/* ------------------------------------------------------------- */}
      <main className="p-4 sm:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6 flex-1">
        {/* Workspace Title & Demo Workspace Tag */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold tracking-wide">
                Demo workspace · Sample patients
              </span>
              {!user.isVerified && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium border border-slate-200">
                  Licence verification pending audit • Demo caseload enabled
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {workspaceTab === "caseload" ? "Clinical Caseload & Active Plans" : "Incoming Consultation Requests"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {workspaceTab === "caseload"
                ? "Click 'Select patient' on any caseload card to anchor their active care context, edit protocols, or review telemetry."
                : "Review prospective patient intake notes and admit authorized cases into your active clinical caseload."}
            </p>
          </div>

          {/* Quick Sub-navigation tabs for mobile */}
          <div className="flex md:hidden items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setWorkspaceTab("caseload")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                workspaceTab === "caseload" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-500"
              }`}
            >
              Caseload
            </button>
            <button
              onClick={() => setWorkspaceTab("consultations")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 ${
                workspaceTab === "consultations" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-500"
              }`}
            >
              <span>Consults</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                {consultations.filter((c) => c.status === "pending").length}
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CASELOAD TAB CONTENT                                      */}
        {/* ========================================================= */}
        {workspaceTab === "caseload" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {caseloadPatients.map((patient) => {
              const isSelected = selectedPatientId === patient.id;
              return (
                <div
                  key={patient.id}
                  className={`bg-white rounded-2xl border p-6 flex flex-col justify-between gap-5 transition-all shadow-xs ${
                    isSelected
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                      : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl border font-bold text-base flex items-center justify-center ${patient.color}`}
                      >
                        {patient.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900">{patient.name}</h2>
                          {isSelected && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Selected
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 block">
                          {patient.planTitle} • Week 1
                        </span>
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {patient.schedule}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Published (v{patient.version})
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        ID: {patient.id}
                      </span>
                    </div>
                  </div>

                  {/* Protocol Snapshot */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">
                        Assigned Exercise
                      </span>
                      <span className="font-bold text-slate-800">{patient.exercise.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">
                        Target Arc & Volume
                      </span>
                      <span className="font-mono font-bold text-teal-800">
                        {patient.exercise.targetMinFlexionDeg}°–{patient.exercise.targetMaxFlexionDeg}° •{" "}
                        {patient.exercise.reps} reps ({patient.exercise.holdDurationSec}s)
                      </span>
                    </div>
                  </div>

                  {/* Primary "Select patient" Action Button */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectPatient(patient.id)}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? "bg-emerald-800 text-white shadow-xs"
                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200"
                      }`}
                    >
                      <span>{isSelected ? "✓" : "👉"}</span>
                      <span>{isSelected ? "Selected Patient (Active Context)" : "Select patient"}</span>
                    </button>

                    {/* Secondary Direct Action Links */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <Link
                        href={`/therapist/editor?patientId=${patient.id}`}
                        className="py-2 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-center transition-all flex items-center justify-center gap-1 text-[11px]"
                      >
                        <span>✏️</span>
                        <span>Editor</span>
                      </Link>

                      <Link
                        href={`/today?patientId=${patient.id}&preview=true`}
                        className="py-2 px-2.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-center border border-teal-200 transition-all flex items-center justify-center gap-1 text-[11px]"
                      >
                        <span>👁️</span>
                        <span>Preview</span>
                      </Link>

                      <Link
                        href={`/therapist/patients/${patient.id}/reports`}
                        className="py-2 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-center transition-all flex items-center justify-center gap-1 text-[11px]"
                      >
                        <span>📊</span>
                        <span>Report</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================= */}
        {/* CONSULTATION REQUESTS TAB CONTENT                         */}
        {/* ========================================================= */}
        {workspaceTab === "consultations" && (
          <div className="flex flex-col gap-4">
            {consultations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
                <span className="text-3xl block mb-2">📋</span>
                <h3 className="font-bold text-slate-900 mb-1">No consultation requests</h3>
                <p className="text-xs text-slate-400">
                  You currently have no pending consultation requests directed to your clinical profile.
                </p>
              </div>
            ) : (
              consultations.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-base flex items-center justify-center shrink-0">
                      {c.patientName
                        .replace(/^Dr\.\s+/i, "")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">{c.patientName}</h2>
                        {c.aboutPatient && (
                          <span className="text-xs text-slate-400">({c.aboutPatient})</span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            c.status === "admitted"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : c.status === "declined"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {c.status === "admitted"
                            ? "Admitted to Caseload"
                            : c.status === "declined"
                            ? "Declined"
                            : "Pending Intake"}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-indigo-900 block mt-0.5">
                        {c.concern}
                      </span>
                      {c.affectedSide && (
                        <span className="inline-block mt-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.2 rounded">
                          Target Area: {c.affectedSide}
                        </span>
                      )}
                      {c.additionalNote && (
                        <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed italic bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                          &quot;{c.additionalNote}&quot;
                        </p>
                      )}
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Received {c.submittedDateFormatted}
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
                    {c.status === "pending" ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleDeclineConsult(c.id)}
                          className="py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs transition-all cursor-pointer w-full sm:w-auto text-center"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdmitConsult(c.id)}
                          className="py-2 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer w-full sm:w-auto text-center"
                        >
                          Accept Consultation
                        </button>
                      </div>
                    ) : c.status === "admitted" ? (
                      <div className="flex flex-col items-end gap-1.5 w-full sm:w-auto">
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <span>✓</span>
                          <span>Case Active</span>
                        </span>
                        <Link
                          href={`/messages?patientId=${c.patientId}`}
                          className="text-xs font-semibold text-teal-800 underline hover:text-teal-900"
                        >
                          Open conversation &rarr;
                        </Link>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">Declined</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* Patient Picker Modal                                          */}
      {/* ------------------------------------------------------------- */}
      {showPatientPicker && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="picker-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                  Practitioner Care Context
                </span>
                <h2 id="picker-title" className="text-xl font-black text-slate-900">
                  Select a Patient
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose a patient from your caseload to open their rehabilitation{" "}
                  {showPatientPicker === "editor" ? "plan editor" : showPatientPicker}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPatientPicker(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {caseloadPatients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => handlePickerSelect(patient.id)}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-center justify-between text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl border font-bold text-sm flex items-center justify-center ${patient.color}`}
                    >
                      {patient.initials}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block group-hover:text-emerald-900">
                        {patient.name}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        {patient.planTitle}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                    Select &rarr;
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowPatientPicker(null)}
              className="py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
