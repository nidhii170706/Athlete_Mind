// ---------------------------------------------------------------------------
// AthleteMind - Physiotherapist Directory & Consultation Service
// Connects patients seeking care with licensed physiotherapists
// ---------------------------------------------------------------------------

import { updateUserProfile } from "./auth-service.ts";
import { getPublishedPlan, savePublishedPlan } from "./care-plan.ts";
import type { CarePlan } from "./care-plan.ts";
import { sendMessage } from "./messages.ts";

export type AvailabilityStatus = "accepting" | "unavailable" | "next_available";

export interface PhysiotherapistDirectoryEntry {
  id: string;
  name: string;
  title: string;
  rating: number; // e.g. 4.9, or 0 if unrated
  reviewCount: number; // e.g. 48, or 0 if unrated
  experienceYears: number;
  areaOfPractice: string;
  qualifications: string;
  certifications: string[];
  availability: AvailabilityStatus;
  nextAvailableDate?: string;
  unavailableReason?: string;
  bio: string;
  initials: string;
  avatarBg: string;
  avatarText: string;
  sampleDataLabel: string;
}

export type ConsultationStatus = "pending" | "admitted" | "declined";

export interface ConsultationRequestRecord {
  id: string;
  patientId: string;
  patientName: string;
  therapistId: string;
  therapistName: string;
  aboutPatient: string;
  concern: string; // Required
  affectedSide?: string; // Optional: "Left Knee", "Right Knee", "Bilateral", etc.
  additionalNote?: string; // Optional
  status: ConsultationStatus;
  submittedAt: string; // ISO date string
  submittedDateFormatted: string; // e.g. "Nov 22, 2026"
  declineReason?: string;
}

export interface ConsultationDraft {
  patientName: string;
  aboutPatient: string;
  concern: string;
  affectedSide: string;
  additionalNote: string;
  therapistId?: string;
}

// ---------------------------------------------------------------------------
// Seed Directory Data (Fictional Demo Clinicians)
// ---------------------------------------------------------------------------
export const SEED_DIRECTORY_PHYSIOTHERAPISTS: PhysiotherapistDirectoryEntry[] = [
  {
    id: "therapist_meera_joshi",
    name: "Dr. Meera Joshi, PT",
    title: "Consultant Sports & Orthopaedic Physiotherapist",
    rating: 4.9,
    reviewCount: 48,
    experienceYears: 12,
    areaOfPractice: "Knee & ACL Sports Rehabilitation",
    qualifications: "PT, DPT, OCS",
    certifications: [
      "Board-Certified Orthopaedic Clinical Specialist (OCS)",
      "Fellow of the American Academy of Orthopaedic Manual Physical Therapists (FAAOMPT)",
      "Dynamic Neuromuscular Stabilization (DNS) Certified",
    ],
    availability: "accepting",
    bio: "Dr. Meera Joshi brings 12 years of specialized clinical experience leading anterior cruciate ligament reconstruction rehabilitation and joint angular telemetry. She works closely with competitive athletes to rebuild explosive quad control, restore symmetric kinematics, and eliminate re-injury risk.",
    initials: "MJ",
    avatarBg: "bg-emerald-100 border-emerald-300",
    avatarText: "text-emerald-800",
    sampleDataLabel: "Sample Data",
  },
  {
    id: "therapist_marcus_vance",
    name: "Dr. Marcus Vance, PT",
    title: "Sports Biomechanics & Knee Specialist",
    rating: 4.8,
    reviewCount: 34,
    experienceYears: 8,
    areaOfPractice: "Sports Biomechanics & Post-Op Training",
    qualifications: "PT, DPT, CSCS",
    certifications: [
      "Certified Strength & Conditioning Specialist (CSCS)",
      "Functional Movement Screen (FMS) Certified",
      "Vestibular & Neuromuscular Integration Specialist",
    ],
    availability: "accepting",
    bio: "Dr. Marcus Vance specializes in closed-chain joint kinematics, return-to-sport testing, and eccentric quadriceps loading. He uses bio-telemetry feedback to guide athletes through graded flexion arcs, restoring confidence and joint stability.",
    initials: "MV",
    avatarBg: "bg-teal-100 border-teal-300",
    avatarText: "text-teal-800",
    sampleDataLabel: "Sample Data",
  },
  {
    id: "therapist_sarah_jenkins",
    name: "Sarah Jenkins, MSPT",
    title: "Orthopaedic Manual Physical Therapist",
    rating: 4.7,
    reviewCount: 19,
    experienceYears: 15,
    areaOfPractice: "Spinal & Lower Extremity Mechanics",
    qualifications: "MSPT, CMPT",
    certifications: [
      "Certified Manual Physical Therapist (CMPT)",
      "Maitland Australian Physiotherapy Certified",
    ],
    availability: "next_available",
    nextAvailableDate: "Dec 1, 2026",
    bio: "Sarah Jenkins brings 15 years of orthopaedic manual therapy practice, addressing complex lower extremity imbalances, patellofemoral tracking dysfunctions, and chronic tendon loading syndromes.",
    initials: "SJ",
    avatarBg: "bg-blue-100 border-blue-300",
    avatarText: "text-blue-800",
    sampleDataLabel: "Sample Data",
  },
  {
    id: "therapist_david_chen",
    name: "Dr. David Chen, PT",
    title: "Clinical Specialist in Sports Physical Therapy",
    rating: 0,
    reviewCount: 0,
    experienceYears: 6,
    areaOfPractice: "Overhead Athletes & Lower Kinetic Chain",
    qualifications: "PT, SCS",
    certifications: [
      "Sports Certified Specialist (SCS)",
      "Emergency Medical Responder for Athletes",
    ],
    availability: "unavailable",
    unavailableReason: "Caseload full",
    bio: "Dr. David Chen specializes in kinetic chain load transfer and adolescent sports injury mitigation. Currently leading an active clinical trial and unable to accept new patient consultations at this time.",
    initials: "DC",
    avatarBg: "bg-slate-100 border-slate-300",
    avatarText: "text-slate-600",
    sampleDataLabel: "Sample Data",
  },
];

// ---------------------------------------------------------------------------
// Directory Sorting Engine
// Accepts requests first, ranked by average rating desc, review count tie-breaker
// ---------------------------------------------------------------------------
export function getDirectoryPhysiotherapists(): PhysiotherapistDirectoryEntry[] {
  return [...SEED_DIRECTORY_PHYSIOTHERAPISTS].sort((a, b) => {
    // 1. Accepting requests first
    const aAccepting = a.availability === "accepting" ? 1 : 0;
    const bAccepting = b.availability === "accepting" ? 1 : 0;
    if (aAccepting !== bAccepting) {
      return bAccepting - aAccepting;
    }

    // 2. Average rating highest to lowest
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }

    // 3. Review count tie-breaker
    return b.reviewCount - a.reviewCount;
  });
}

export function getPhysiotherapistById(id: string): PhysiotherapistDirectoryEntry | undefined {
  return SEED_DIRECTORY_PHYSIOTHERAPISTS.find((p) => p.id === id);
}

// Helper to extract first name or familiar name for buttons like "Send request to Meera"
export function getRecipientFirstName(fullName: string): string {
  const clean = fullName.replace(/^Dr\.\s+/i, "").split(",")[0].trim();
  const parts = clean.split(" ");
  return parts[0] || clean;
}

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------
const STORAGE_REQUESTS_KEY = "athletemind_consultation_requests";
const STORAGE_DRAFT_KEY = "athletemind_consultation_draft";

function notifyConsultationsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("athletemind_consultations_updated"));
  }
}

// ---------------------------------------------------------------------------
// Consultation Requests API
// ---------------------------------------------------------------------------
export function getAllConsultationRequests(): ConsultationRequestRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_REQUESTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed reading consultation requests", e);
  }
  return [];
}

function saveConsultationRequests(requests: ConsultationRequestRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_REQUESTS_KEY, JSON.stringify(requests));
    notifyConsultationsUpdated();
  } catch (e) {
    console.warn("Failed saving consultation requests", e);
  }
}

export function getPatientConsultationRequest(patientId: string): ConsultationRequestRecord | null {
  const all = getAllConsultationRequests();
  // Return the most recent pending or active request for this patient
  const patientRequests = all.filter((r) => r.patientId === patientId);
  if (patientRequests.length === 0) return null;
  // Sort by submittedAt desc
  return patientRequests[patientRequests.length - 1];
}

export function getTherapistConsultationRequests(therapistId: string): ConsultationRequestRecord[] {
  const all = getAllConsultationRequests();
  // Filter strictly by the recipient therapistId
  const targeted = all.filter((r) => r.therapistId === therapistId);

  // If Meera and no user-submitted requests exist yet, populate initial sample demo requests
  if (therapistId === "therapist_meera_joshi" && targeted.length === 0) {
    const meeraSeedRequests: ConsultationRequestRecord[] = [
      {
        id: "consult_rohan_01",
        patientId: "patient_rohan_varma",
        patientName: "Rohan Varma",
        therapistId: "therapist_meera_joshi",
        therapistName: "Dr. Meera Joshi, PT",
        aboutPatient: "34 yrs • Amateur Tennis Player",
        concern: "Post-ACL Reconstruction (Week 6) closed-chain flexion monitoring",
        affectedSide: "Right Knee",
        additionalNote: "Cleared by surgical orthopaedist for closed-chain flexion arcs up to 45°.",
        status: "pending",
        submittedAt: "2026-11-23T08:00:00.000Z",
        submittedDateFormatted: "Nov 23, 2026",
      },
      {
        id: "consult_priya_02",
        patientId: "patient_priya_nair",
        patientName: "Priya Nair",
        therapistId: "therapist_meera_joshi",
        therapistName: "Dr. Meera Joshi, PT",
        aboutPatient: "28 yrs • Track & Field",
        concern: "Patellar Tendinopathy eccentric loading protocol calibration",
        affectedSide: "Right Knee",
        additionalNote: "Infrapatellar pain with deep squats. Need isometric hold progression.",
        status: "pending",
        submittedAt: "2026-11-22T09:30:00.000Z",
        submittedDateFormatted: "Nov 22, 2026",
      },
    ];
    // Persist seed so they can be accepted/declined
    saveConsultationRequests([...all, ...meeraSeedRequests]);
    return meeraSeedRequests;
  }

  return targeted;
}

export function submitConsultationRequest(input: {
  patientId: string;
  patientName: string;
  therapistId: string;
  aboutPatient: string;
  concern: string;
  affectedSide?: string;
  additionalNote?: string;
}): { success: boolean; request?: ConsultationRequestRecord; error?: string } {
  const therapist = getPhysiotherapistById(input.therapistId);
  if (!therapist) {
    return { success: false, error: "Selected physiotherapist was not found in the directory." };
  }

  // Guard against submitting to unavailable therapist
  if (therapist.availability === "unavailable") {
    return {
      success: false,
      error: `${therapist.name} is currently unavailable to accept new requests (${
        therapist.unavailableReason || "Caseload full"
      }). Your draft has been preserved. Please select another physiotherapist.`,
    };
  }

  const all = getAllConsultationRequests();

  // Guard: repeated clicks must create only one request
  const existingPending = all.find(
    (r) => r.patientId === input.patientId && r.therapistId === input.therapistId && r.status === "pending"
  );
  if (existingPending) {
    return { success: true, request: existingPending };
  }

  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const newRequest: ConsultationRequestRecord = {
    id: `consult_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    patientId: input.patientId,
    patientName: input.patientName.trim(),
    therapistId: input.therapistId,
    therapistName: therapist.name,
    aboutPatient: input.aboutPatient.trim(),
    concern: input.concern.trim(),
    affectedSide: input.affectedSide?.trim() || undefined,
    additionalNote: input.additionalNote?.trim() || undefined,
    status: "pending",
    submittedAt: now.toISOString(),
    submittedDateFormatted: dateFormatted,
  };

  saveConsultationRequests([...all, newRequest]);
  return { success: true, request: newRequest };
}

export function withdrawConsultationRequest(requestId: string): void {
  const all = getAllConsultationRequests();
  const filtered = all.filter((r) => r.id !== requestId);
  saveConsultationRequests(filtered);
}

export async function acceptConsultationRequest(
  requestId: string
): Promise<{ success: boolean; request?: ConsultationRequestRecord; error?: string }> {
  const all = getAllConsultationRequests();
  const req = all.find((r) => r.id === requestId);
  if (!req) {
    return { success: false, error: "Consultation request not found." };
  }

  req.status = "admitted";
  saveConsultationRequests(all);

  const therapist = getPhysiotherapistById(req.therapistId);
  const clinicianName = therapist?.name || "Dr. Marcus Vance, PT";
  const clinicianTitle = therapist?.qualifications || "Verified Clinician";

  // 1. Establish care relationship in patient profile
  updateUserProfile(req.patientId, {
    assignedTherapistId: req.therapistId,
    hasActivePlan: true,
  });

  // 2. Synchronize care plan
  const existingPlan = getPublishedPlan(req.patientId);
  const updatedPlan: CarePlan = {
    ...existingPlan,
    patientId: req.patientId,
    patientName: req.patientName,
    clinicianName,
    clinicianTitle,
    planTitle: existingPlan.planTitle || "Personalized Knee Rehabilitation Protocol",
    status: "published",
    version: (existingPlan.version || 1) + 1,
    updatedAt: new Date().toISOString(),
  };
  savePublishedPlan(updatedPlan, req.patientId);

  // 3. Initialize private conversation in messages
  try {
    await sendMessage(
      req.patientId,
      {
        id: req.therapistId,
        name: clinicianName,
        role: "physiotherapist",
      },
      `Hello ${req.patientName}, I have accepted your consultation request regarding "${req.concern}". I've initialized your personalized rehabilitation protocol. Let's discuss your baseline movement goals.`
    );
  } catch (e) {
    console.warn("Could not send automated welcome message", e);
  }

  notifyConsultationsUpdated();
  return { success: true, request: req };
}

export function declineConsultationRequest(
  requestId: string,
  reason = "Practitioner schedule at maximum clinical capacity."
): { success: boolean; request?: ConsultationRequestRecord } {
  const all = getAllConsultationRequests();
  const req = all.find((r) => r.id === requestId);
  if (!req) {
    return { success: false };
  }

  req.status = "declined";
  req.declineReason = reason;
  saveConsultationRequests(all);

  return { success: true, request: req };
}

// ---------------------------------------------------------------------------
// Form Draft Management
// Preserves draft across navigation and rejection so patient doesn't re-type
// ---------------------------------------------------------------------------
export function getConsultationDraft(): ConsultationDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_DRAFT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed reading consultation draft", e);
  }
  return null;
}

export function saveConsultationDraft(draft: ConsultationDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(draft));
  } catch (e) {
    console.warn("Failed saving consultation draft", e);
  }
}

export function clearConsultationDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_DRAFT_KEY);
  } catch (e) {}
}
