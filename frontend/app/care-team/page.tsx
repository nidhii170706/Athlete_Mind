"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PatientHeader } from "@/components/PatientHeader";
import { CarePlan, getPublishedPlan } from "@/lib/care-plan";
import { useAuth } from "@/lib/auth-context";
import {
  PhysiotherapistDirectoryEntry,
  ConsultationRequestRecord,
  ConsultationDraft,
  getDirectoryPhysiotherapists,
  getPatientConsultationRequest,
  submitConsultationRequest,
  withdrawConsultationRequest,
  getRecipientFirstName,
  getConsultationDraft,
  saveConsultationDraft,
  clearConsultationDraft,
} from "@/lib/consultations";

function CareTeamContent() {
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get("patientId") || undefined;
  const isPreview = searchParams.get("preview") === "true";

  const { user, isLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [plan, setPlan] = useState<CarePlan | null>(null);

  // Directory & Consultation State
  const [directory, setDirectory] = useState<PhysiotherapistDirectoryEntry[]>([]);
  const [pendingRequest, setPendingRequest] = useState<ConsultationRequestRecord | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<PhysiotherapistDirectoryEntry | null>(null);
  const [viewingProfile, setViewingProfile] = useState<PhysiotherapistDirectoryEntry | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [aboutYou, setAboutYou] = useState("");
  const [problem, setProblem] = useState("");
  const [affectedSide, setAffectedSide] = useState("");
  const [additionalNote, setAdditionalNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal for Pending Request
  const [showPendingDetailsModal, setShowPendingDetailsModal] = useState(false);

  const effectivePatientId = patientIdParam || user?.id || "patient_aanya_rao";

  // Load initial data
  useEffect(() => {
    setIsMounted(true);
    setPlan(getPublishedPlan(effectivePatientId));
    setDirectory(getDirectoryPhysiotherapists());

    const existingReq = getPatientConsultationRequest(effectivePatientId);
    setPendingRequest(existingReq);

    // Load any saved draft
    const draft = getConsultationDraft();
    if (draft) {
      if (draft.aboutPatient) setAboutYou(draft.aboutPatient);
      if (draft.concern) setProblem(draft.concern);
      if (draft.affectedSide) setAffectedSide(draft.affectedSide);
      if (draft.additionalNote) setAdditionalNote(draft.additionalNote);
    }
  }, [effectivePatientId]);

  // Sync user name into form if available
  useEffect(() => {
    if (user?.fullName && !patientName) {
      setPatientName(user.fullName);
    }
  }, [user?.fullName, patientName]);

  // Real-time synchronization for consultation updates
  useEffect(() => {
    const handleConsultationsUpdate = () => {
      const existingReq = getPatientConsultationRequest(effectivePatientId);
      setPendingRequest(existingReq);
      setPlan(getPublishedPlan(effectivePatientId));
    };

    window.addEventListener("athletemind_consultations_updated", handleConsultationsUpdate);
    window.addEventListener("athletemind_auth_change", handleConsultationsUpdate);
    return () => {
      window.removeEventListener("athletemind_consultations_updated", handleConsultationsUpdate);
      window.removeEventListener("athletemind_auth_change", handleConsultationsUpdate);
    };
  }, [effectivePatientId]);

  // Draft persistence helper
  const persistCurrentDraft = (therapistId?: string) => {
    saveConsultationDraft({
      patientName: patientName || user?.fullName || "",
      aboutPatient: aboutYou,
      concern: problem,
      affectedSide,
      additionalNote,
      therapistId: therapistId || selectedTherapist?.id,
    });
  };

  // Open Request Consultation Form
  const handleOpenRequestForm = (pt: PhysiotherapistDirectoryEntry) => {
    setSelectedTherapist(pt);
    setFormError(null);
    if (!patientName) {
      setPatientName(user?.fullName || "");
    }
    setIsFormOpen(true);
  };

  // Back / Cancel handler (Preserves draft & directory position without sending anything)
  const handleBackToDirectory = () => {
    persistCurrentDraft(selectedTherapist?.id);
    setIsFormOpen(false);
    setFormError(null);
  };

  // Submit Consultation Request
  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTherapist) return;

    if (!patientName.trim()) {
      setFormError("Please enter your name.");
      return;
    }

    if (!problem.trim()) {
      setFormError("What problem would you like help with? is a required field.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    // Save draft state in case submission is rejected or therapist becomes unavailable
    persistCurrentDraft(selectedTherapist.id);

    const result = submitConsultationRequest({
      patientId: effectivePatientId,
      patientName: patientName.trim(),
      therapistId: selectedTherapist.id,
      aboutPatient: aboutYou.trim(),
      concern: problem.trim(),
      affectedSide: affectedSide.trim() || undefined,
      additionalNote: additionalNote.trim() || undefined,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.error || "Unable to send consultation request.");
      return;
    }

    // Success: clear form draft & close form
    clearConsultationDraft();
    setPendingRequest(result.request || null);
    setIsFormOpen(false);
    setSelectedTherapist(null);
  };

  // Withdraw Pending Consultation Request
  const handleWithdrawRequest = () => {
    if (!pendingRequest) return;
    const confirmWithdraw = window.confirm(
      `Withdraw your consultation request sent to ${pendingRequest.therapistName}? You can choose another physiotherapist anytime.`
    );
    if (confirmWithdraw) {
      withdrawConsultationRequest(pendingRequest.id);
      setPendingRequest(null);
    }
  };

  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading clinical care team...</span>
        </div>
      </div>
    );
  }

  // Active care relationship exists if patient has an active plan with assigned clinician
  // and is not marked hasActivePlan === false, or if a consultation was already admitted
  const hasCareRelationship =
    user?.hasActivePlan !== false &&
    (user?.assignedTherapistId || (plan && plan.clinicianName && plan.status === "published"));

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col antialiased">
      <PatientHeader
        patientName={user?.fullName || plan?.patientName || "Aanya Rao"}
        patientId={patientIdParam}
        isPreview={isPreview}
      />

      <main className="p-4 sm:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6 flex-1">
        {/* ========================================================= */}
        {/* VIEW 1: ACTIVE CARE RELATIONSHIP                          */}
        {/* ========================================================= */}
        {hasCareRelationship ? (
          <>
            {/* Header Title */}
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-bold text-[10px] uppercase tracking-wider">
                    Clinical Care Team • Biomechanical Supervision
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  My Care &amp; Clinical Supervision
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Authorized clinical providers supervising your range-of-motion recovery and exercise prescriptions.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {/* Primary Supervising Clinician Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xl flex items-center justify-center shrink-0">
                    {(plan?.clinicianName || "Dr. Meera Joshi, PT")
                      .replace(/^Dr\.\s+/i, "")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">
                        {plan?.clinicianName || "Dr. Meera Joshi, PT"}
                      </h2>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                        Verified Clinician
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {plan?.clinicianTitle || "Consultant Sports & Orthopaedic Physiotherapist"}
                    </p>
                    <p className="text-xs text-slate-600 mt-2 font-medium">
                      Supervising:{" "}
                      <span className="font-semibold text-slate-800">
                        {plan?.planTitle || "Personalized Knee Rehabilitation Protocol"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Link
                    href={`/messages${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
                    className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs transition-all shadow-xs"
                  >
                    Message my physiotherapist
                  </Link>
                </div>
              </div>

              {/* Consultation & Schedule Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-md inline-block mb-2">
                      Active Care Plan Status
                    </span>
                    <h3 className="text-base font-bold text-slate-900">Synchronized Clinical Prescription</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Your exercise prescription is synchronized with your clinic. Modifications to flexion angles or hold durations update your daily missions automatically.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Current schedule:</span>
                    <span className="font-semibold text-slate-800">
                      {plan?.scheduleDesc || "Mon - Wed - Fri schedule"}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md inline-block mb-2">
                      Upcoming Review
                    </span>
                    <h3 className="text-base font-bold text-slate-900">Bi-Weekly Tele-Rehab Consultation</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Next clinical review scheduled after completion of current week sessions to evaluate joint flexion arc progression.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-semibold text-emerald-700">✓ On Track</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : pendingRequest && pendingRequest.status === "pending" ? (
          /* ========================================================= */
          /* VIEW 2: PENDING CONSULTATION REQUEST                      */
          /* ========================================================= */
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[10px] uppercase tracking-wider">
                  Consultation Request Status
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Request sent to {pendingRequest.therapistName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Submitted on {pendingRequest.submittedDateFormatted}. Your supervising clinician will review your intake details.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-100 border border-teal-300 text-teal-800 font-bold text-lg flex items-center justify-center shrink-0">
                    {pendingRequest.therapistName
                      .replace(/^Dr\.\s+/i, "")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        {pendingRequest.therapistName}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Pending Review
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      Submitted on {pendingRequest.submittedDateFormatted}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowPendingDetailsModal(true)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    onClick={handleWithdrawRequest}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 font-semibold text-xs transition-all cursor-pointer"
                  >
                    Withdraw request
                  </button>
                </div>
              </div>

              {/* Summary of submitted request */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                    Problem / Clinical Concern
                  </span>
                  <p className="font-semibold text-slate-800 leading-relaxed">{pendingRequest.concern}</p>
                  {pendingRequest.affectedSide && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-medium text-[11px]">
                      Target Area: {pendingRequest.affectedSide}
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                    Patient Profile &amp; Notes
                  </span>
                  <p className="text-slate-600">
                    <strong className="text-slate-800">{pendingRequest.patientName}</strong>
                    {pendingRequest.aboutPatient ? ` • ${pendingRequest.aboutPatient}` : ""}
                  </p>
                  {pendingRequest.additionalNote && (
                    <p className="mt-2 text-slate-500 italic bg-white p-2.5 rounded-xl border border-slate-200/60">
                      &quot;{pendingRequest.additionalNote}&quot;
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : isFormOpen && selectedTherapist ? (
          /* ========================================================= */
          /* VIEW 3: REQUEST CONSULTATION FORM                         */
          /* ========================================================= */
          <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
            <button
              type="button"
              onClick={handleBackToDirectory}
              className="self-start text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>&larr;</span>
              <span>Back to directory</span>
            </button>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-bold text-[10px] uppercase tracking-wider">
                    Consultation Request
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                    Sample Data
                  </span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Request a consultation with {selectedTherapist.name}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedTherapist.title} • {selectedTherapist.areaOfPractice}
                </p>
              </div>

              {formError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                  <span>⚠️</span>
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitRequest} className="flex flex-col gap-4 text-xs">
                {/* 1. Your name (prefilled, required) */}
                <div>
                  <label htmlFor="patient-name-field" className="block font-bold text-slate-700 mb-1">
                    Your name <span className="text-rose-500 font-semibold">(required)</span>
                  </label>
                  <input
                    id="patient-name-field"
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all"
                  />
                </div>

                {/* 2. About you (optional) */}
                <div>
                  <label htmlFor="about-you-field" className="block font-bold text-slate-700 mb-1">
                    About you <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="about-you-field"
                    type="text"
                    value={aboutYou}
                    onChange={(e) => setAboutYou(e.target.value)}
                    placeholder="e.g. 28-year-old amateur athlete, recovering from knee arthroscopy"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all"
                  />
                </div>

                {/* 3. Problem / help (main required field) */}
                <div>
                  <label htmlFor="problem-field" className="block font-bold text-slate-700 mb-1">
                    What problem would you like help with?{" "}
                    <span className="text-rose-500 font-semibold">(required)</span>
                  </label>
                  <textarea
                    id="problem-field"
                    required
                    rows={3}
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    placeholder="Describe your current injury, symptoms, joint range-of-motion limitations, or rehabilitation goals..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all resize-none"
                  />
                </div>

                {/* 4. Affected area or side (optional) */}
                <div>
                  <label htmlFor="affected-side-field" className="block font-bold text-slate-700 mb-1">
                    Affected area or side <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="affected-side-field"
                    type="text"
                    value={affectedSide}
                    onChange={(e) => setAffectedSide(e.target.value)}
                    placeholder="e.g. Left Knee, Right Knee, Bilateral, Shoulder"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all"
                  />
                </div>

                {/* 5. Additional note (optional) */}
                <div>
                  <label htmlFor="additional-note-field" className="block font-bold text-slate-700 mb-1">
                    Anything else you&apos;d like your physiotherapist to know?{" "}
                    <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="additional-note-field"
                    rows={2}
                    value={additionalNote}
                    onChange={(e) => setAdditionalNote(e.target.value)}
                    placeholder="Relevant medical history, previous physical therapy, surgery dates, or training schedule..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all resize-none"
                  />
                </div>

                {/* Form Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleBackToDirectory}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-all cursor-pointer"
                  >
                    Cancel (Keep draft)
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 active:scale-[0.99] text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending request...</span>
                      </>
                    ) : (
                      <span>Send request to {getRecipientFirstName(selectedTherapist.name)}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* VIEW 4: FIRST VISIT — DIRECTORY IMMEDIATELY               */
          /* ========================================================= */
          <div className="flex flex-col gap-6">
            {/* Header Title */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-bold text-[10px] uppercase tracking-wider">
                  Care Team Directory
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                  Sample Data
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Find a physiotherapist
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Compare licensed clinical specialists, review credentials and availability, and request a personalized consultation.
              </p>
            </div>

            {/* If a previous request was declined, notify the patient */}
            {pendingRequest && pendingRequest.status === "declined" && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold block text-amber-950 mb-0.5">
                    Previous request update
                  </span>
                  <span>
                    {pendingRequest.therapistName} was unable to accept your consultation request (
                    {pendingRequest.declineReason || "Caseload full"}). Your draft details are preserved below so you can choose another clinician without re-typing.
                  </span>
                </div>
              </div>
            )}

            {/* Fictional Demo Notice Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span>ℹ️</span>
                <span>
                  <strong>Sample Data Notice:</strong> Clinician profiles, ratings, review counts, and credentials shown below are simulated for demonstration.
                </span>
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded bg-slate-200/70 text-slate-600 font-mono text-[10px]">
                Fictional Demo
              </span>
            </div>

            {/* Physiotherapists List (One horizontal row per therapist) */}
            <div className="flex flex-col gap-4">
              {directory.map((pt) => {
                const isAccepting = pt.availability === "accepting";
                const isNextAvailable = pt.availability === "next_available";
                const isUnavailable = pt.availability === "unavailable";

                return (
                  <div
                    key={pt.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    {/* Left & Middle: Exact requested reading order */}
                    <div className="flex items-start gap-4 flex-1">
                      {/* Avatar */}
                      <div
                        className={`w-14 h-14 rounded-2xl border font-bold text-base flex items-center justify-center shrink-0 ${pt.avatarBg} ${pt.avatarText}`}
                      >
                        {pt.initials}
                      </div>

                      <div className="flex flex-col gap-1 flex-1">
                        {/* 1. Name and professional title */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900">{pt.name}</h2>
                          <span className="text-xs text-slate-500 font-medium">• {pt.title}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 text-[9px] font-mono">
                            {pt.sampleDataLabel}
                          </span>
                        </div>

                        {/* 2. Average rating and review count together */}
                        <div className="flex items-center gap-2 text-xs">
                          {pt.rating > 0 ? (
                            <span className="font-bold text-amber-600 flex items-center gap-1">
                              <span>★</span>
                              <span>
                                {pt.rating.toFixed(1)} ({pt.reviewCount} reviews)
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">No reviews yet</span>
                          )}
                        </div>

                        {/* 3. Years of experience and area of practice */}
                        <p className="text-xs text-slate-600 font-medium">
                          {pt.experienceYears} years experience • {pt.areaOfPractice}
                        </p>

                        {/* 4. Qualifications and certifications, with a “View profile” action */}
                        <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5">
                          <span className="font-mono text-slate-500 font-semibold text-[11px]">
                            {pt.qualifications}
                          </span>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => setViewingProfile(pt)}
                            className="text-teal-700 hover:text-teal-800 underline font-semibold text-xs cursor-pointer transition-colors"
                          >
                            View profile
                          </button>
                        </div>

                        {/* 5. Availability */}
                        <div className="mt-1">
                          {isAccepting && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Accepting requests
                            </span>
                          )}
                          {isNextAvailable && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              Next available: {pt.nextAvailableDate}
                            </span>
                          )}
                          {isUnavailable && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Currently unavailable ({pt.unavailableReason || "Caseload full"})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 6. A clear “Request consultation” button */}
                    <div className="w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 flex items-center justify-end">
                      {isUnavailable ? (
                        <button
                          type="button"
                          disabled
                          title={`Currently unavailable: ${pt.unavailableReason}`}
                          className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed border border-slate-200"
                        >
                          Unavailable • {pt.unavailableReason || "Caseload full"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRequestForm(pt)}
                          className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 active:scale-[0.99] text-white font-bold text-xs shadow-xs transition-all cursor-pointer text-center"
                        >
                          Request consultation
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* VIEW PROFILE MODAL                                        */}
      {/* ========================================================= */}
      {viewingProfile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xl flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-14 h-14 rounded-2xl border font-bold text-lg flex items-center justify-center ${viewingProfile.avatarBg} ${viewingProfile.avatarText}`}
                >
                  {viewingProfile.initials}
                </div>
                <div>
                  <h2 id="profile-modal-title" className="text-lg font-bold text-slate-900">
                    {viewingProfile.name}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">{viewingProfile.title}</p>
                  <span className="text-[10px] font-mono text-slate-400">{viewingProfile.sampleDataLabel}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingProfile(null)}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-sm font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              {/* Rating & Experience */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-semibold text-slate-700">
                  {viewingProfile.experienceYears} Years Clinical Experience
                </span>
                {viewingProfile.rating > 0 ? (
                  <span className="font-bold text-amber-600 flex items-center gap-1">
                    <span>★</span>
                    <span>
                      {viewingProfile.rating.toFixed(1)} ({viewingProfile.reviewCount} reviews)
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">No reviews yet</span>
                )}
              </div>

              {/* Clinical Bio */}
              <div>
                <span className="font-bold text-slate-800 block mb-1">Clinical Background &amp; Focus</span>
                <p className="text-slate-600 leading-relaxed">{viewingProfile.bio}</p>
              </div>

              {/* Certifications */}
              <div>
                <span className="font-bold text-slate-800 block mb-1">Board Certifications &amp; Credentials</span>
                <ul className="space-y-1 text-slate-600">
                  {viewingProfile.certifications.map((c, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="text-teal-700 font-bold">✓</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Availability */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-400">Current Availability:</span>
                <span className="font-semibold text-slate-800">
                  {viewingProfile.availability === "accepting"
                    ? "Accepting requests"
                    : viewingProfile.availability === "next_available"
                    ? `Next available: ${viewingProfile.nextAvailableDate}`
                    : `Unavailable (${viewingProfile.unavailableReason})`}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewingProfile(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs cursor-pointer"
              >
                Close
              </button>

              {viewingProfile.availability !== "unavailable" && (
                <button
                  type="button"
                  onClick={() => {
                    const pt = viewingProfile;
                    setViewingProfile(null);
                    handleOpenRequestForm(pt);
                  }}
                  className="px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Request consultation
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PENDING REQUEST DETAILS MODAL                             */}
      {/* ========================================================= */}
      {showPendingDetailsModal && pendingRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pending-details-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xl flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                  Active Consultation Intake
                </span>
                <h2 id="pending-details-title" className="text-lg font-bold text-slate-900">
                  Consultation with {pendingRequest.therapistName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPendingDetailsModal(false)}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-sm font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                  Submission Status
                </span>
                <span className="font-semibold text-amber-800">
                  Pending review by {pendingRequest.therapistName}
                </span>
                <span className="text-slate-400 block mt-0.5">
                  Submitted: {pendingRequest.submittedDateFormatted}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-0.5">Patient Details</span>
                <p className="text-slate-600">
                  {pendingRequest.patientName} {pendingRequest.aboutPatient ? `(${pendingRequest.aboutPatient})` : ""}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-0.5">Primary Concern</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 leading-relaxed">
                  {pendingRequest.concern}
                </p>
              </div>

              {pendingRequest.affectedSide && (
                <div>
                  <span className="font-bold text-slate-800 block mb-0.5">Affected Side / Joint</span>
                  <p className="text-slate-600">{pendingRequest.affectedSide}</p>
                </div>
              )}

              {pendingRequest.additionalNote && (
                <div>
                  <span className="font-bold text-slate-800 block mb-0.5">Additional Notes</span>
                  <p className="text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    &quot;{pendingRequest.additionalNote}&quot;
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPendingDetailsModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPendingDetailsModal(false);
                  handleWithdrawRequest();
                }}
                className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 font-semibold text-xs cursor-pointer"
              >
                Withdraw request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CareTeamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center font-sans">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Loading clinical care team...</span>
          </div>
        </div>
      }
    >
      <CareTeamContent />
    </Suspense>
  );
}
