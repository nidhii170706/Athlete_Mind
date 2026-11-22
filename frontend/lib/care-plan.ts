// ---------------------------------------------------------------------------
// AthleteMind - Care Plan & Prescription Data Model
// Shared between Therapist Editor, Patient Today, Mission Hangar, Arena & Reports
// ---------------------------------------------------------------------------

export interface ExerciseItem {
  id: string;
  name: string;
  targetRegion: string;
  affectedSide: "left" | "right" | "bilateral";
  observedSide: "left" | "right" | "front";
  targetMinFlexionDeg: number;
  targetMaxFlexionDeg: number;
  holdDurationSec: number;
  sets: number;
  reps: number;
  restSec: number;
  instructions: string;
  cameraSetupNote?: string;
}

export interface CarePlan {
  id: string;
  patientId?: string;
  patientName: string;
  patientAvatar?: string;
  clinicianName: string;
  clinicianTitle: string;
  planTitle: string;
  scheduleDesc: string;
  status: "draft" | "published";
  version: number;
  updatedAt: string;
  exercises: ExerciseItem[];
  activeExerciseId: string;
}

export interface DayScheduleItem {
  dayName: string;
  dayNumber: number;
  dateStr: string;
  isToday: boolean;
  isRestDay: boolean;
  label: string;
  subLabel: string;
  exerciseName?: string;
  repsCount?: number;
}

export interface MovementDetail {
  movementNum: number;
  observedPeakDeg?: number;
  holdDurationSec?: number;
  outcome: "met_target" | "early_release" | "skipped";
  gameEvent: string;
}

export interface TrackingInterruption {
  afterMovementNum: number;
  durationSec: number;
  reason: string;
}

export interface SessionReport {
  id: string;
  dateStr?: string;
  patientId?: string;
  sessionDate: string;
  sessionTitle: string;
  prescriptionSnapshot: ExerciseItem;
  planVersion: number;
  plannedMovements: number;
  performedMovements: number;
  metTargetAndHold: number;
  earlyReleases: number;
  trackingPauses: number;
  observedMinDeg: number;
  observedMaxDeg: number;
  narrativeHeadline: string;
  narrativeSubtext: string;
  movements: MovementDetail[];
  interruptions: TrackingInterruption[];
  patientNote: string;
  syncStatus: "synced";
}

// ---------------------------------------------------------------------------
// Angle Convention Translation
// Therapist Editor uses KNEE FLEXION (straight knee = 0°, deep flexion = 90°)
// Vector Kinematics Engine measures INCLUDED ANGLE (straight knee = 180°, bent = 90°)
// ---------------------------------------------------------------------------
export function flexionToIncludedAngle(flexionDeg: number): number {
  return Math.round(180 - flexionDeg);
}

export function includedAngleToFlexion(includedDeg: number): number {
  return Math.max(0, Math.round(180 - includedDeg));
}

// ---------------------------------------------------------------------------
// Default Seed Plan (Aanya Rao - 4-Week Left Knee Plan by Meera Joshi, PT)
// Matches design-reference screenshots exactly
// ---------------------------------------------------------------------------
export const SEED_PUBLISHED_PLAN: CarePlan = {
  id: "plan_aanya_week1",
  patientName: "Aanya Rao",
  patientAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  clinicianName: "Meera Joshi, PT",
  clinicianTitle: "Verified clinician",
  planTitle: "4-Week Left Knee Plan",
  scheduleDesc: "Mon - Wed - Fri schedule • Nov 24 - Dec 19 • English / Hindi",
  status: "published",
  version: 1,
  updatedAt: "2026-11-22T05:00:00.000Z",
  activeExerciseId: "squats",
  exercises: [
    {
      id: "squats",
      name: "Side-view therapeutic squat",
      targetRegion: "LOWER_BODY",
      affectedSide: "left",
      observedSide: "left",
      targetMinFlexionDeg: 35,
      targetMaxFlexionDeg: 45,
      holdDurationSec: 1.0,
      sets: 1,
      reps: 5,
      restSec: 30,
      instructions:
        "Stand sideways with your left side facing the camera. Bend your left knee smoothly into the 35–45° zone, hold steady for 1 second to arm your shield, then return upright to deflect.",
      cameraSetupNote: "Side-view squats require left hip, knee, and ankle visibility.",
    },
    {
      id: "high_knee_march",
      name: "High-knee march",
      targetRegion: "LOWER_BODY",
      affectedSide: "left",
      observedSide: "left",
      targetMinFlexionDeg: 65,
      targetMaxFlexionDeg: 90,
      holdDurationSec: 1.0,
      sets: 1,
      reps: 8,
      restSec: 30,
      instructions:
        "Drive left knee upwards into parallel hip alignment, hold control, then step softly.",
      cameraSetupNote: "Full frontal or sagittal torso visibility required.",
    },
    {
      id: "single_leg_balance",
      name: "Single-leg balance",
      targetRegion: "BALANCE",
      affectedSide: "left",
      observedSide: "left",
      targetMinFlexionDeg: 15,
      targetMaxFlexionDeg: 25,
      holdDurationSec: 15.0,
      sets: 1,
      reps: 3,
      restSec: 45,
      instructions:
        "Elevate right foot slightly off the floor, balancing on left leg while engaging core stability.",
      cameraSetupNote: "Ankle and foot must be in full view of camera.",
    },
  ],
};

export const SEED_WEEKLY_SCHEDULE: DayScheduleItem[] = [
  {
    dayName: "Mon",
    dayNumber: 24,
    dateStr: "2026-11-24",
    isToday: true,
    isRestDay: false,
    label: "Squat • 5 reps",
    subLabel: "Today",
    exerciseName: "Side-view therapeutic squat",
    repsCount: 5,
  },
  {
    dayName: "Tue",
    dayNumber: 25,
    dateStr: "2026-11-25",
    isToday: false,
    isRestDay: true,
    label: "Rest day",
    subLabel: "Recovery",
  },
  {
    dayName: "Wed",
    dayNumber: 26,
    dateStr: "2026-11-26",
    isToday: false,
    isRestDay: false,
    label: "Squat • 5 reps",
    subLabel: "Scheduled",
    exerciseName: "Side-view therapeutic squat",
    repsCount: 5,
  },
  {
    dayName: "Thu",
    dayNumber: 27,
    dateStr: "2026-11-27",
    isToday: false,
    isRestDay: true,
    label: "Rest day",
    subLabel: "Recovery",
  },
  {
    dayName: "Fri",
    dayNumber: 28,
    dateStr: "2026-11-28",
    isToday: false,
    isRestDay: false,
    label: "Squat • 5 reps",
    subLabel: "Scheduled",
    exerciseName: "Side-view therapeutic squat",
    repsCount: 5,
  },
  {
    dayName: "Sat",
    dayNumber: 29,
    dateStr: "2026-11-29",
    isToday: false,
    isRestDay: true,
    label: "Rest day",
    subLabel: "Recovery",
  },
  {
    dayName: "Sun",
    dayNumber: 30,
    dateStr: "2026-11-30",
    isToday: false,
    isRestDay: true,
    label: "Rest day",
    subLabel: "Recovery",
  },
];

export const SEED_SESSION_REPORT: SessionReport = {
  id: "rep_monday_nov24",
  dateStr: "2026-11-24",
  patientId: "patient_aanya_rao",
  sessionDate: "Nov 24",
  sessionTitle: "Tuesday Session Report • Nov 24",
  prescriptionSnapshot: SEED_PUBLISHED_PLAN.exercises[0],
  planVersion: 1,
  plannedMovements: 5,
  performedMovements: 4,
  metTargetAndHold: 3,
  earlyReleases: 1,
  trackingPauses: 1,
  observedMinDeg: 38,
  observedMaxDeg: 43,
  narrativeHeadline:
    "You performed four of five planned movements. Three met both your range and hold target.",
  narrativeSubtext:
    "Three successful deflections were recorded in Aegis Run. Movement 4 reached the target angle but released early at 0.5 s. Tracking paused once after Movement 2 when your left ankle left view.",
  movements: [
    {
      movementNum: 1,
      observedPeakDeg: 41,
      holdDurationSec: 1.0,
      outcome: "met_target",
      gameEvent: "Successful deflection",
    },
    {
      movementNum: 2,
      observedPeakDeg: 43,
      holdDurationSec: 1.0,
      outcome: "met_target",
      gameEvent: "Successful deflection",
    },
    {
      movementNum: 3,
      observedPeakDeg: 38,
      holdDurationSec: 1.0,
      outcome: "met_target",
      gameEvent: "Successful deflection",
    },
    {
      movementNum: 4,
      observedPeakDeg: 39,
      holdDurationSec: 0.5,
      outcome: "early_release",
      gameEvent: "Partial shield dissolved",
    },
    {
      movementNum: 5,
      observedPeakDeg: undefined,
      holdDurationSec: undefined,
      outcome: "skipped",
      gameEvent: "Session ended early",
    },
  ],
  interruptions: [
    {
      afterMovementNum: 2,
      durationSec: 4,
      reason: "Left ankle left view. Previous 2 completed movements preserved.",
    },
  ],
  patientNote: "The last hold felt difficult.",
  syncStatus: "synced",
};

export const SEED_AANYA_COMPLETED_REPORT: SessionReport = {
  id: "rep_aanya_mon_nov23",
  dateStr: "2026-11-23",
  patientId: "patient_aanya_rao",
  sessionDate: "Nov 23",
  sessionTitle: "Monday Session Report • Nov 23",
  prescriptionSnapshot: SEED_PUBLISHED_PLAN.exercises[0],
  planVersion: 1,
  plannedMovements: 5,
  performedMovements: 5,
  metTargetAndHold: 5,
  earlyReleases: 0,
  trackingPauses: 0,
  observedMinDeg: 37,
  observedMaxDeg: 44,
  narrativeHeadline:
    "You completed all five planned movements. All five met your target range and hold duration.",
  narrativeSubtext:
    "Five successful deflections recorded in Aegis Run. Stable knee kinematics throughout all reps.",
  movements: [
    { movementNum: 1, observedPeakDeg: 40, holdDurationSec: 1.0, outcome: "met_target", gameEvent: "Successful deflection" },
    { movementNum: 2, observedPeakDeg: 42, holdDurationSec: 1.0, outcome: "met_target", gameEvent: "Successful deflection" },
    { movementNum: 3, observedPeakDeg: 39, holdDurationSec: 1.0, outcome: "met_target", gameEvent: "Successful deflection" },
    { movementNum: 4, observedPeakDeg: 41, holdDurationSec: 1.0, outcome: "met_target", gameEvent: "Successful deflection" },
    { movementNum: 5, observedPeakDeg: 43, holdDurationSec: 1.0, outcome: "met_target", gameEvent: "Successful deflection" },
  ],
  interruptions: [],
  patientNote: "Felt very smooth and controlled.",
  syncStatus: "synced",
};

export const SEED_BASELINE_REPORT: SessionReport = {
  id: "rep_baseline_nov17",
  dateStr: "2026-11-17",
  patientId: "patient_aanya_rao",
  sessionDate: "Nov 17",
  sessionTitle: "Initial Calibration Session • Nov 17",
  prescriptionSnapshot: {
    ...SEED_PUBLISHED_PLAN.exercises[0],
    targetMinFlexionDeg: 30,
    targetMaxFlexionDeg: 40,
    reps: 5,
  },
  planVersion: 1,
  plannedMovements: 5,
  performedMovements: 2,
  metTargetAndHold: 1,
  earlyReleases: 1,
  trackingPauses: 2,
  observedMinDeg: 48,
  observedMaxDeg: 52,
  narrativeHeadline:
    "You performed two of five planned movements. One met both your range and hold target.",
  narrativeSubtext:
    "Baseline session completed. Joint stiffness was observed during concentric ascension.",
  movements: [
    {
      movementNum: 1,
      observedPeakDeg: 50,
      holdDurationSec: 1.0,
      outcome: "met_target",
      gameEvent: "Successful deflection",
    },
    {
      movementNum: 2,
      observedPeakDeg: 48,
      holdDurationSec: 0.4,
      outcome: "early_release",
      gameEvent: "Early release",
    },
    {
      movementNum: 3,
      outcome: "skipped",
      gameEvent: "Session paused",
    },
    {
      movementNum: 4,
      outcome: "skipped",
      gameEvent: "Session paused",
    },
    {
      movementNum: 5,
      outcome: "skipped",
      gameEvent: "Session ended early",
    },
  ],
  interruptions: [
    {
      afterMovementNum: 1,
      durationSec: 3.2,
      reason: "Patient paused for hydration",
    },
  ],
  patientNote: "Left knee felt slightly tight during initial movement.",
  syncStatus: "synced",
};

export const INITIAL_SEED_REPORTS: SessionReport[] = [
  SEED_SESSION_REPORT,
  SEED_AANYA_COMPLETED_REPORT,
  SEED_BASELINE_REPORT,
];

// ---------------------------------------------------------------------------
// Dev Patel Seed Plan & Session Reports
// ---------------------------------------------------------------------------
export const SEED_DEV_PATEL_PLAN: CarePlan = {
  id: "plan_dev_week1",
  patientId: "sample_dev_patel",
  patientName: "Dev Patel",
  clinicianName: "Dr. Meera Joshi, PT",
  clinicianTitle: "Verified clinician",
  planTitle: "Post-Meniscectomy Knee Rehab",
  scheduleDesc: "Tue - Thu - Sat schedule • Nov 24 - Dec 19 • English",
  status: "published",
  version: 1,
  updatedAt: "2026-11-22T05:00:00.000Z",
  activeExerciseId: "terminal_knee_extension",
  exercises: [
    {
      id: "terminal_knee_extension",
      name: "Controlled Terminal Knee Extension",
      targetRegion: "LOWER_BODY",
      affectedSide: "left",
      observedSide: "left",
      targetMinFlexionDeg: 10,
      targetMaxFlexionDeg: 25,
      holdDurationSec: 2.0,
      sets: 1,
      reps: 6,
      restSec: 30,
      instructions:
        "Extend the knee against light resistance into the 10–25° terminal arc, hold steady for 2 seconds, then control the descent.",
      cameraSetupNote: "Sagittal side-view of left knee required.",
    },
  ],
};

export const SEED_DEV_SESSION_REPORT: SessionReport = {
  id: "rep_dev_nov24",
  dateStr: "2026-11-24",
  patientId: "sample_dev_patel",
  sessionDate: "Nov 24",
  sessionTitle: "Tuesday Session Report • Nov 24",
  prescriptionSnapshot: SEED_DEV_PATEL_PLAN.exercises[0],
  planVersion: 1,
  plannedMovements: 6,
  performedMovements: 6,
  metTargetAndHold: 6,
  earlyReleases: 0,
  trackingPauses: 0,
  observedMinDeg: 12,
  observedMaxDeg: 24,
  narrativeHeadline:
    "You completed all six planned movements. All six met your range and hold target.",
  narrativeSubtext:
    "Flawless biomechanical execution in terminal extension. Six clean deflections recorded.",
  movements: [
    { movementNum: 1, observedPeakDeg: 22, holdDurationSec: 2.0, outcome: "met_target", gameEvent: "Clean extension" },
    { movementNum: 2, observedPeakDeg: 20, holdDurationSec: 2.0, outcome: "met_target", gameEvent: "Clean extension" },
    { movementNum: 3, observedPeakDeg: 24, holdDurationSec: 2.0, outcome: "met_target", gameEvent: "Clean extension" },
    { movementNum: 4, observedPeakDeg: 19, holdDurationSec: 2.0, outcome: "met_target", gameEvent: "Clean extension" },
    { movementNum: 5, observedPeakDeg: 23, holdDurationSec: 2.0, outcome: "met_target", gameEvent: "Clean extension" },
    { movementNum: 6, observedPeakDeg: 21, holdDurationSec: 2.0, outcome: "met_target", gameEvent: "Clean extension" },
  ],
  interruptions: [],
  patientNote: "Felt strong quad activation with no joint effusion.",
  syncStatus: "synced",
};

// ---------------------------------------------------------------------------
// Local Persistence API (Scoped by patient ID for multi-clinician local demo)
// ---------------------------------------------------------------------------
const STORAGE_KEY_PUBLISHED = "athletemind_care_plan_published";
const STORAGE_KEY_DRAFT = "athletemind_care_plan_draft";
const STORAGE_KEY_REPORT = "athletemind_latest_session_report";

export function getScopedPatientId(therapistId?: string): string {
  if (!therapistId || therapistId === "therapist_meera_joshi" || therapistId === "therapist_marcus_vance") {
    return "patient_aanya_rao";
  }
  return `patient_aanya_${therapistId}`;
}

export function cloneCarePlan(plan: CarePlan): CarePlan {
  return JSON.parse(JSON.stringify(plan));
}

export function getPublishedPlan(patientId?: string): CarePlan {
  if (typeof window === "undefined") {
    if (patientId === "sample_dev_patel") return cloneCarePlan(SEED_DEV_PATEL_PLAN);
    return cloneCarePlan(SEED_PUBLISHED_PLAN);
  }
  const pid = patientId || "patient_aanya_rao";
  const scopedKey = `${STORAGE_KEY_PUBLISHED}_${pid}`;

  try {
    const rawScoped = localStorage.getItem(scopedKey);
    if (rawScoped) return JSON.parse(rawScoped);

    // Fallback to global published key if patient_aanya_rao
    if (pid === "patient_aanya_rao") {
      const rawGlobal = localStorage.getItem(STORAGE_KEY_PUBLISHED);
      if (rawGlobal) return JSON.parse(rawGlobal);
    }
  } catch (e) {
    console.warn("Failed reading published plan from storage", e);
  }

  if (pid === "sample_dev_patel") {
    return cloneCarePlan(SEED_DEV_PATEL_PLAN);
  }

  const initial = cloneCarePlan({ ...SEED_PUBLISHED_PLAN, patientId: pid });
  return initial;
}

export function savePublishedPlan(plan: CarePlan, patientId?: string): void {
  if (typeof window === "undefined") return;
  const pid = patientId || plan.patientId || "patient_aanya_rao";
  const scopedKey = `${STORAGE_KEY_PUBLISHED}_${pid}`;
  const scopedDraftKey = `${STORAGE_KEY_DRAFT}_${pid}`;

  try {
    const updated: CarePlan = {
      ...cloneCarePlan(plan),
      patientId: pid,
      status: "published" as const,
      version: (plan.version || 1) + 1,
      updatedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(updated);
    localStorage.setItem(scopedKey, json);
    localStorage.setItem(scopedDraftKey, json);

    // Keep global legacy keys in sync for primary demo patient
    if (pid === "patient_aanya_rao") {
      localStorage.setItem(STORAGE_KEY_PUBLISHED, json);
      localStorage.setItem(STORAGE_KEY_DRAFT, json);
    }
  } catch (e) {
    console.warn("Failed saving published plan", e);
  }
}

export const SEED_DRAFT_PLAN: CarePlan = {
  ...SEED_PUBLISHED_PLAN,
  status: "draft",
};

export function getDraftPlan(patientId?: string): CarePlan {
  if (typeof window === "undefined") return cloneCarePlan(SEED_DRAFT_PLAN);
  const pid = patientId || "patient_aanya_rao";
  const scopedDraftKey = `${STORAGE_KEY_DRAFT}_${pid}`;

  try {
    const rawScoped = localStorage.getItem(scopedDraftKey);
    if (rawScoped) return JSON.parse(rawScoped);

    if (pid === "patient_aanya_rao") {
      const rawGlobal = localStorage.getItem(STORAGE_KEY_DRAFT);
      if (rawGlobal) return JSON.parse(rawGlobal);
    }
  } catch (e) {
    console.warn("Failed reading draft plan from storage", e);
  }
  return cloneCarePlan({ ...getPublishedPlan(pid), status: "draft" });
}

export function saveDraftPlan(plan: CarePlan, patientId?: string): void {
  if (typeof window === "undefined") return;
  const pid = patientId || plan.patientId || "patient_aanya_rao";
  const scopedDraftKey = `${STORAGE_KEY_DRAFT}_${pid}`;

  try {
    const updated: CarePlan = {
      ...plan,
      patientId: pid,
      status: "draft" as const,
      updatedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(updated);
    localStorage.setItem(scopedDraftKey, json);

    if (pid === "patient_aanya_rao") {
      localStorage.setItem(STORAGE_KEY_DRAFT, json);
    }
  } catch (e) {
    console.warn("Failed saving draft plan", e);
  }
}

export function getAllSessionReports(patientId?: string): SessionReport[] {
  const pid = patientId || "patient_aanya_rao";
  if (typeof window === "undefined") {
    if (pid === "sample_dev_patel") return [SEED_DEV_SESSION_REPORT];
    return INITIAL_SEED_REPORTS;
  }
  const listKey = `athletemind_session_reports_list_${pid}`;

  try {
    const raw = localStorage.getItem(listKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Failed reading reports list", e);
  }

  // Fallback to patient-specific initial seeds
  if (pid === "sample_dev_patel") {
    return [SEED_DEV_SESSION_REPORT];
  }

  // Fallback to latest single report plus baseline
  const latest = getLatestSessionReport(patientId);
  const reports = [latest];
  if (latest.id !== SEED_AANYA_COMPLETED_REPORT.id) {
    reports.push(SEED_AANYA_COMPLETED_REPORT);
  }
  if (latest.id !== SEED_BASELINE_REPORT.id) {
    reports.push(SEED_BASELINE_REPORT);
  }
  return reports;
}

export function getSessionReportById(sessionId?: string | null, patientId?: string): SessionReport {
  if (!sessionId) return getLatestSessionReport(patientId);
  const reports = getAllSessionReports(patientId);
  const found = reports.find((r) => r.id === sessionId);
  if (found) return found;
  if (sessionId === SEED_SESSION_REPORT.id) return SEED_SESSION_REPORT;
  if (sessionId === SEED_AANYA_COMPLETED_REPORT.id) return SEED_AANYA_COMPLETED_REPORT;
  if (sessionId === SEED_BASELINE_REPORT.id) return SEED_BASELINE_REPORT;
  if (sessionId === SEED_DEV_SESSION_REPORT.id) return SEED_DEV_SESSION_REPORT;
  return getLatestSessionReport(patientId);
}

export function getLatestSessionReport(patientId?: string): SessionReport {
  const pid = patientId || "patient_aanya_rao";
  if (typeof window === "undefined") {
    return pid === "sample_dev_patel" ? SEED_DEV_SESSION_REPORT : SEED_SESSION_REPORT;
  }
  const scopedKey = `${STORAGE_KEY_REPORT}_${pid}`;

  try {
    const rawScoped = localStorage.getItem(scopedKey);
    if (rawScoped) return JSON.parse(rawScoped);

    if (pid === "patient_aanya_rao") {
      const rawGlobal = localStorage.getItem(STORAGE_KEY_REPORT);
      if (rawGlobal) return JSON.parse(rawGlobal);
    }
  } catch (e) {
    console.warn("Failed reading session report", e);
  }
  return pid === "sample_dev_patel" ? SEED_DEV_SESSION_REPORT : SEED_SESSION_REPORT;
}

export function saveSessionReport(report: SessionReport, patientId?: string): void {
  if (typeof window === "undefined") return;
  const pid = patientId || report.patientId || "patient_aanya_rao";
  const scopedKey = `${STORAGE_KEY_REPORT}_${pid}`;
  const listKey = `athletemind_session_reports_list_${pid}`;

  try {
    const reportToSave: SessionReport = {
      ...report,
      patientId: pid,
    };
    const json = JSON.stringify(reportToSave);
    localStorage.setItem(scopedKey, json);
    if (pid === "patient_aanya_rao") {
      localStorage.setItem(STORAGE_KEY_REPORT, json);
    }
    // Update or prepend in reports list
    const currentList = getAllSessionReports(patientId).filter((r) => r.id !== report.id);
    const updatedList = [reportToSave, ...currentList];
    localStorage.setItem(listKey, JSON.stringify(updatedList));
  } catch (e) {
    console.warn("Failed saving session report", e);
  }
}

export function updatePatientNote(note: string, patientId?: string, sessionId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const report = sessionId ? getSessionReportById(sessionId, patientId) : getLatestSessionReport(patientId);
    report.patientNote = note;
    saveSessionReport(report, patientId);
  } catch (e) {
    console.warn("Failed updating patient note", e);
  }
}

// ---------------------------------------------------------------------------
// Unified Calendar & Date Utilities
// Accurate calendar calculations matching actual day of week
// ---------------------------------------------------------------------------

export function parseDateString(dateStr: string): Date {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2] || 1;
  return new Date(y, m - 1, d, 12, 0, 0); // midday avoids any timezone/DST shift
}

export function formatDateToYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getWeekdayName(dateStr: string, format: "short" | "long" = "short"): string {
  const dt = parseDateString(dateStr);
  return dt.toLocaleDateString("en-US", { weekday: format });
}

export function formatDetailHeadingDate(dateStr: string): string {
  const dt = parseDateString(dateStr);
  const weekday = dt.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const year = dt.getFullYear();
  return `${weekday}, ${monthDay}, ${year}`;
}

export interface WeekDayCardInfo {
  dateStr: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
  state: "completed" | "partial" | "no_session" | "due_today" | "upcoming" | "rest_day";
  statusLabel: string;
  countLabel?: string;
  sessions: SessionReport[];
  isRestDay: boolean;
}

export function getPatientScheduledWeekdays(plan: CarePlan): string[] {
  const desc = plan.scheduleDesc?.toLowerCase() || "";
  if (desc.includes("tue") && desc.includes("thu") && desc.includes("sat")) {
    return ["Tue", "Thu", "Sat"];
  }
  // Default Mon-Wed-Fri
  return ["Mon", "Wed", "Fri"];
}

export function getWeekDaysForAnchor(
  anchorDateStr: string,
  patientPlan: CarePlan,
  sessions: SessionReport[],
  todayDateStr: string = "2026-11-24"
): {
  weekRangeLabel: string;
  days: WeekDayCardInfo[];
} {
  const dt = parseDateString(anchorDateStr);
  const dayOfWeek = dt.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + diffToMonday, 12, 0, 0);

  const scheduledWeekdays = getPatientScheduledWeekdays(patientPlan);

  const days: WeekDayCardInfo[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12, 0, 0);
    const dateStr = formatDateToYYYYMMDD(d);
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNumber = d.getDate();
    const monthName = d.toLocaleDateString("en-US", { month: "short" });
    const isToday = dateStr === todayDateStr;

    // Check if weekday is in schedule
    const isScheduled = scheduledWeekdays.includes(dayName);
    const isRestDay = !isScheduled;

    // Find sessions for this date
    // Session matches either by dateStr or by sessionDate (e.g. "Nov 24")
    const dateMonthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const daySessions = sessions.filter(
      (s) => s.dateStr === dateStr || s.sessionDate === dateMonthDay || s.sessionDate === `${monthName} ${dayNumber}`
    );

    // Compute day state
    let state: WeekDayCardInfo["state"] = "rest_day";
    let statusLabel = "Rest day";
    let countLabel: string | undefined = undefined;

    if (daySessions.length > 0) {
      // We have recorded session(s)
      let totalPlanned = 0;
      let totalPerformed = 0;
      let totalMetTarget = 0;
      daySessions.forEach((s) => {
        totalPlanned += s.plannedMovements;
        totalPerformed += s.performedMovements;
        totalMetTarget += s.metTargetAndHold;
      });

      if (isRestDay) {
        state = "rest_day";
        statusLabel = "Rest day";
        countLabel = `Logged · ${totalPerformed} reps`;
      } else if (totalPerformed >= totalPlanned) {
        state = "completed";
        statusLabel = "Completed";
        countLabel = `${totalPerformed} of ${totalPlanned} reps`;
      } else {
        state = "partial";
        statusLabel = "Partial";
        countLabel = `${totalPerformed} of ${totalPlanned} reps`;
      }
    } else {
      // No recorded sessions
      if (isRestDay) {
        state = "rest_day";
        statusLabel = "Rest day";
      } else {
        // Compare with todayDateStr
        if (dateStr > todayDateStr) {
          state = "upcoming";
          statusLabel = "Upcoming";
        } else if (dateStr === todayDateStr) {
          state = "due_today";
          statusLabel = "Due today";
        } else {
          state = "no_session";
          statusLabel = "No session recorded";
        }
      }
    }

    days.push({
      dateStr,
      dayName,
      dayNumber,
      monthName,
      isToday,
      state,
      statusLabel,
      countLabel,
      sessions: daySessions,
      isRestDay,
    });
  }

  const startDay = days[0];
  const endDay = days[6];
  const weekRangeLabel = `${startDay.monthName} ${startDay.dayNumber} – ${endDay.monthName} ${endDay.dayNumber}, ${monday.getFullYear()}`;

  return { weekRangeLabel, days };
}
