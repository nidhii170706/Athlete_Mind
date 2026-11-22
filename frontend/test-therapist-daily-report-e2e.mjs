import test from "node:test";
import assert from "node:assert/strict";

// Setup mock environment for Node.js test runner
const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};

const listeners = new Map();
global.window = {
  dispatchEvent: (event) => {
    const list = listeners.get(event.type) || [];
    list.forEach((cb) => cb(event));
    return true;
  },
  addEventListener: (type, cb) => {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(cb);
  },
  removeEventListener: (type, cb) => {
    const list = listeners.get(type) || [];
    listeners.set(type, list.filter((f) => f !== cb));
  },
};
global.CustomEvent = class CustomEvent {
  constructor(type, eventInitDict) {
    this.type = type;
    this.detail = eventInitDict?.detail;
  }
};

const {
  getPublishedPlan,
  getAllSessionReports,
  getSessionReportById,
  getLatestSessionReport,
  getWeekDaysForAnchor,
  getWeekdayName,
  formatDetailHeadingDate,
  formatDateToYYYYMMDD,
  parseDateString,
  SEED_PUBLISHED_PLAN,
  SEED_DEV_PATEL_PLAN,
} = await import("./lib/care-plan.ts");

const {
  authService,
  DEMO_THERAPIST,
  DEMO_THERAPIST_MARCUS,
  DEMO_PATIENT,
} = await import("./lib/auth-service.ts");

test("Calendar Calculations: 2026-11-24 is Tuesday and unified with heading", () => {
  // Requirement 2: 2026-11-24 is Tuesday, NOT Monday
  const weekday = getWeekdayName("2026-11-24");
  assert.equal(weekday, "Tue", "2026-11-24 must be Tue (Tuesday)");

  const headingDate = formatDetailHeadingDate("2026-11-24");
  assert.match(headingDate, /^Tuesday, Nov 24, 2026/);

  // 2026-11-23 is Monday
  const monWeekday = getWeekdayName("2026-11-23");
  assert.equal(monWeekday, "Mon", "2026-11-23 must be Mon (Monday)");
  const monHeading = formatDetailHeadingDate("2026-11-23");
  assert.match(monHeading, /^Monday, Nov 23, 2026/);
});

test("Patient Isolation: Aanya Rao vs Dev Patel plans and schedules", () => {
  storage.clear();

  // Aanya's plan
  const aanyaPlan = getPublishedPlan("patient_aanya_rao");
  assert.equal(aanyaPlan.patientName, "Aanya Rao");
  assert.equal(aanyaPlan.planTitle, "4-Week Left Knee Plan");
  assert.match(aanyaPlan.scheduleDesc, /Mon - Wed - Fri/);
  assert.equal(aanyaPlan.exercises[0].name, "Side-view therapeutic squat");

  // Dev's plan
  const devPlan = getPublishedPlan("sample_dev_patel");
  assert.equal(devPlan.patientName, "Dev Patel");
  assert.equal(devPlan.planTitle, "Post-Meniscectomy Knee Rehab");
  assert.match(devPlan.scheduleDesc, /Tue - Thu - Sat/);
  assert.equal(devPlan.exercises[0].name, "Controlled Terminal Knee Extension");

  // Verify schedule days are distinct
  const { days: aanyaDays } = getWeekDaysForAnchor("2026-11-24", aanyaPlan, [], "2026-11-24");
  const { days: devDays } = getWeekDaysForAnchor("2026-11-24", devPlan, [], "2026-11-24");

  // Monday (Nov 23): Aanya scheduled, Dev rest day
  const aanyaMon = aanyaDays.find((d) => d.dateStr === "2026-11-23");
  const devMon = devDays.find((d) => d.dateStr === "2026-11-23");
  assert.equal(aanyaMon?.isRestDay, false, "Monday is scheduled exercise day for Aanya");
  assert.equal(devMon?.isRestDay, true, "Monday is rest day for Dev");

  // Tuesday (Nov 24): Aanya rest day, Dev scheduled
  const aanyaTue = aanyaDays.find((d) => d.dateStr === "2026-11-24");
  const devTue = devDays.find((d) => d.dateStr === "2026-11-24");
  assert.equal(aanyaTue?.isRestDay, true, "Tuesday is rest day in Aanya's schedule");
  assert.equal(devTue?.isRestDay, false, "Tuesday is scheduled exercise day for Dev");
});

test("Day States: Completed, Partial, No session recorded, Due today, Upcoming, Rest day", () => {
  storage.clear();

  const aanyaPlan = getPublishedPlan("patient_aanya_rao");
  const aanyaReports = getAllSessionReports("patient_aanya_rao");

  // Anchor at week of Nov 23 - Nov 29, 2026, with focal today = 2026-11-24
  const { days } = getWeekDaysForAnchor("2026-11-24", aanyaPlan, aanyaReports, "2026-11-24");
  assert.equal(days.length, 7);

  // 1. Monday Nov 23: Completed session (5 of 5 performed)
  const mon = days.find((d) => d.dateStr === "2026-11-23");
  assert.ok(mon);
  assert.equal(mon.state, "completed");
  assert.equal(mon.statusLabel, "Completed");
  assert.equal(mon.countLabel, "5 of 5 reps");
  assert.equal(mon.sessions.length, 1);
  assert.equal(mon.sessions[0].performedMovements, 5);

  // 2. Tuesday Nov 24: Rest day in plan, but logged 4 of 5 reps session
  const tue = days.find((d) => d.dateStr === "2026-11-24");
  assert.ok(tue);
  assert.equal(tue.state, "rest_day");
  assert.equal(tue.countLabel, "Logged · 4 reps");
  assert.equal(tue.sessions.length, 1);
  assert.equal(tue.sessions[0].performedMovements, 4);
  assert.equal(tue.sessions[0].metTargetAndHold, 3);

  // 3. Thursday Nov 26: Rest day with no sessions
  const thu = days.find((d) => d.dateStr === "2026-11-26");
  assert.ok(thu);
  assert.equal(thu.state, "rest_day");
  assert.equal(thu.statusLabel, "Rest day");
  assert.equal(thu.sessions.length, 0);

  // 4. Friday Nov 27: Future scheduled day (Upcoming)
  const fri = days.find((d) => d.dateStr === "2026-11-27");
  assert.ok(fri);
  assert.equal(fri.state, "upcoming");
  assert.equal(fri.statusLabel, "Upcoming");

  // 5. Past scheduled day with NO session:
  // Check previous week Friday Nov 20, 2026 (Mon-Wed-Fri schedule)
  const prevWeek = getWeekDaysForAnchor("2026-11-20", aanyaPlan, aanyaReports, "2026-11-24");
  const pastFri = prevWeek.days.find((d) => d.dateStr === "2026-11-20");
  assert.ok(pastFri);
  assert.equal(pastFri.state, "no_session");
  assert.equal(pastFri.statusLabel, "No session recorded");

  // 6. Due today state test:
  // If focal date is Wed Nov 25 and today is Nov 25 with no session yet:
  const wedWeek = getWeekDaysForAnchor("2026-11-25", aanyaPlan, aanyaReports, "2026-11-25");
  const wed = wedWeek.days.find((d) => d.dateStr === "2026-11-25");
  assert.ok(wed);
  assert.equal(wed.state, "due_today");
  assert.equal(wed.statusLabel, "Due today");
});

test("Dev Patel Day States: Tuesday Nov 24 Completed Session", () => {
  storage.clear();

  const devPlan = getPublishedPlan("sample_dev_patel");
  const devReports = getAllSessionReports("sample_dev_patel");

  const { days } = getWeekDaysForAnchor("2026-11-24", devPlan, devReports, "2026-11-24");

  // Tuesday Nov 24 for Dev: Scheduled and Completed (6 of 6 reps)
  const tue = days.find((d) => d.dateStr === "2026-11-24");
  assert.ok(tue);
  assert.equal(tue.state, "completed");
  assert.equal(tue.statusLabel, "Completed");
  assert.equal(tue.countLabel, "6 of 6 reps");
  assert.equal(tue.sessions.length, 1);
  assert.equal(tue.sessions[0].prescriptionSnapshot.name, "Controlled Terminal Knee Extension");
  assert.equal(tue.sessions[0].metTargetAndHold, 6);
});

test("Session Report Details: Preserves historical prescription version and separates volume from quality", () => {
  const aanyaReports = getAllSessionReports("patient_aanya_rao");
  const nov24Session = aanyaReports.find((r) => r.dateStr === "2026-11-24" || r.sessionDate === "Nov 24");
  assert.ok(nov24Session);

  // Volume vs Quality Separation
  assert.equal(nov24Session.performedMovements, 4);
  assert.equal(nov24Session.plannedMovements, 5);
  assert.equal(nov24Session.metTargetAndHold, 3);
  assert.equal(nov24Session.earlyReleases, 1);

  // Summary statement: "4 of 5 performed · 3 met target"
  const summary = `${nov24Session.performedMovements} of ${nov24Session.plannedMovements} performed · ${nov24Session.metTargetAndHold} met target`;
  assert.equal(summary, "4 of 5 performed · 3 met target");

  // Tracking interruptions & note
  assert.equal(nov24Session.trackingPauses, 1);
  assert.equal(nov24Session.interruptions[0].reason, "Left ankle left view. Previous 2 completed movements preserved.");
  assert.equal(nov24Session.patientNote, "The last hold felt difficult.");
});

test("Access Control: Authoritative caseload care relationships and isolation", () => {
  // Pre-verified clinicians (Dr. Meera Joshi, Dr. Marcus Vance)
  const canMeeraViewAanya = authService.canViewSessionReport(DEMO_THERAPIST, "patient_aanya_rao");
  assert.equal(canMeeraViewAanya, true);

  const canMarcusViewDev = authService.canViewSessionReport(DEMO_THERAPIST_MARCUS, "sample_dev_patel");
  assert.equal(canMarcusViewDev, true);

  // Local demo physiotherapist account (e.g. pt_46tzt682)
  const localTherapist = {
    id: "pt_46tzt682",
    email: "local.therapist@athletemind.health",
    fullName: "Dr. Local Practitioner, PT",
    role: "physiotherapist",
    isVerified: false,
    createdAt: new Date().toISOString(),
  };

  // 1. Can view their own scoped Aanya Rao card patient
  const canViewOwnScopedAanya = authService.canViewSessionReport(localTherapist, "patient_aanya_pt_46tzt682");
  assert.equal(canViewOwnScopedAanya, true, "Authorised local therapist must access their scoped Aanya Rao card");

  // 2. Can view standard caseload patient Dev Patel
  const canViewDev = authService.canViewSessionReport(localTherapist, "sample_dev_patel");
  assert.equal(canViewDev, true, "Authorised local therapist must access Dev Patel in their caseload");

  // 3. Unrelated therapist CANNOT view patient_aanya_pt_46tzt682
  const unrelatedTherapist = {
    id: "pt_unrelated_stranger",
    email: "stranger@athletemind.health",
    fullName: "Dr. Unrelated Clinician, PT",
    role: "physiotherapist",
    isVerified: false,
    createdAt: new Date().toISOString(),
  };
  const canUnrelatedView = authService.canViewSessionReport(unrelatedTherapist, "patient_aanya_pt_46tzt682");
  assert.equal(canUnrelatedView, false, "Unrelated therapist MUST NOT access another therapist's scoped patient");

  // 4. Patient role CANNOT view therapist reports
  const patientUser = {
    id: "patient_aanya_rao",
    email: "patient.aanya@athletemind.health",
    fullName: "Aanya Rao",
    role: "patient",
    isVerified: true,
    createdAt: new Date().toISOString(),
  };
  assert.equal(
    authService.canViewSessionReport(patientUser, "sample_dev_patel"),
    false,
    "Patient role cannot access therapist clinical report"
  );
});

test("Zero Sessions Handling: Authorised therapist can open report with 0 sessions", () => {
  storage.clear();

  const therapist = {
    id: "pt_46tzt682",
    email: "local.therapist@athletemind.health",
    fullName: "Dr. Local Practitioner, PT",
    role: "physiotherapist",
    isVerified: false,
    createdAt: new Date().toISOString(),
  };

  // Fictional admitted patient with zero saved sessions
  const zeroSessionPatientId = "patient_zero_sessions_123";
  // Admitted consultation
  const consultation = {
    id: "consult_zero_1",
    patientId: zeroSessionPatientId,
    patientName: "Karan Sharma",
    therapistId: therapist.id,
    therapistName: therapist.fullName,
    status: "admitted",
    concern: "Knee rehab",
  };
  storage.set("athletemind_consultations", JSON.stringify([consultation]));

  // 1. Authorised
  assert.equal(authService.canViewSessionReport(therapist, zeroSessionPatientId), true);

  // 2. Reports list is genuinely empty (no fake Aanya reports injected)
  const reports = getAllSessionReports(zeroSessionPatientId);
  assert.equal(reports.length, 0, "Patient with no sessions must return empty array");

  // 3. Weekly calendar renders accurately with plan schedule
  const plan = getPublishedPlan(zeroSessionPatientId);
  assert.ok(plan);
  const { days } = getWeekDaysForAnchor("2026-11-24", plan, reports, "2026-11-24");
  assert.equal(days.length, 7);

  // Scheduled past day Nov 23 has no_session state
  const mon = days.find((d) => d.dateStr === "2026-11-23");
  assert.ok(mon);
  assert.equal(mon.state, "no_session");
  assert.equal(mon.statusLabel, "No session recorded");
  assert.equal(mon.sessions.length, 0);

  // Rest day Nov 24
  const tue = days.find((d) => d.dateStr === "2026-11-24");
  assert.ok(tue);
  assert.equal(tue.state, "rest_day");
  assert.equal(tue.statusLabel, "Rest day");
  assert.equal(tue.sessions.length, 0);
});
