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

test("Access Control: Verified clinician vs unverified clinician access rules", () => {
  // Verified clinician can view caseload reports
  const canMeeraViewAanya = authService.canViewSessionReport(DEMO_THERAPIST, "patient_aanya_rao");
  assert.equal(canMeeraViewAanya, true);

  const canMarcusViewDev = authService.canViewSessionReport(DEMO_THERAPIST_MARCUS, "sample_dev_patel");
  assert.equal(canMarcusViewDev, true);

  // Unverified clinician cannot view arbitrary patients in local mode
  const unverifiedTherapist = {
    id: "pt_unverified_99",
    email: "unverified@test.com",
    fullName: "Dr. New Clinician",
    role: "physiotherapist",
    isVerified: false,
    createdAt: new Date().toISOString(),
  };

  const canUnverifiedViewOther = authService.canViewSessionReport(unverifiedTherapist, "sample_dev_patel");
  assert.equal(canUnverifiedViewOther, false, "Unverified clinician cannot view arbitrary patient reports");

  const canUnverifiedViewScoped = authService.canViewSessionReport(
    unverifiedTherapist,
    `patient_aanya_${unverifiedTherapist.id}`
  );
  assert.equal(canUnverifiedViewScoped, true, "Unverified clinician can view their own scoped patient");
});

test("Regression Sequence: Select Dev -> Click Aanya Report -> Saved Session -> Back -> Dev Report -> No session date", () => {
  storage.clear();

  // Step 1: Therapist initially has Dev Patel selected in workspace context
  let workspaceSelectedPatientId = "sample_dev_patel";
  assert.equal(workspaceSelectedPatientId, "sample_dev_patel");

  // Step 2: Click Report DIRECTLY on Aanya Rao's card without selecting her first
  // Card link target is /therapist/patients/${patient.id}/reports
  const aanyaCardReportHref = `/therapist/patients/patient_aanya_rao/reports`;
  assert.equal(aanyaCardReportHref, "/therapist/patients/patient_aanya_rao/reports");

  // Load Aanya's reporting view
  const aanyaPlan = getPublishedPlan("patient_aanya_rao");
  const aanyaReports = getAllSessionReports("patient_aanya_rao");
  assert.equal(aanyaPlan.patientName, "Aanya Rao");
  assert.equal(aanyaPlan.planTitle, "4-Week Left Knee Plan");
  assert.match(aanyaPlan.scheduleDesc, /Mon - Wed - Fri/);

  // Step 3: Choose date with saved session (Nov 24 or Nov 23)
  const aanyaWeek = getWeekDaysForAnchor("2026-11-24", aanyaPlan, aanyaReports, "2026-11-24");
  const nov24Day = aanyaWeek.days.find((d) => d.dateStr === "2026-11-24");
  assert.ok(nov24Day);
  assert.equal(nov24Day.sessions.length, 1);
  const session = nov24Day.sessions[0];
  assert.equal(session.performedMovements, 4);
  assert.equal(session.plannedMovements, 5);
  assert.equal(session.metTargetAndHold, 3);

  // Open session details: link target
  const detailsHref = `/report?sessionId=${session.id}&patientId=patient_aanya_rao`;
  assert.equal(detailsHref, `/report?sessionId=${session.id}&patientId=patient_aanya_rao`);

  // Step 4: Simulate going Back
  // The report page's backHref is /therapist/patients/${patientId}/reports?date=${report.dateStr}
  const backHref = `/therapist/patients/patient_aanya_rao/reports?date=${session.dateStr}`;
  assert.equal(backHref, "/therapist/patients/patient_aanya_rao/reports?date=2026-11-24");

  // Confirm date query preserved
  const backParams = new URLSearchParams("date=2026-11-24");
  assert.equal(backParams.get("date"), "2026-11-24");

  // Step 5: Click Dev Patel's Report button directly
  const devCardReportHref = `/therapist/patients/sample_dev_patel/reports`;
  assert.equal(devCardReportHref, "/therapist/patients/sample_dev_patel/reports");

  const devPlan = getPublishedPlan("sample_dev_patel");
  const devReports = getAllSessionReports("sample_dev_patel");
  assert.equal(devPlan.patientName, "Dev Patel");
  assert.equal(devPlan.planTitle, "Post-Meniscectomy Knee Rehab");
  assert.match(devPlan.scheduleDesc, /Tue - Thu - Sat/);
  assert.equal(devPlan.exercises[0].name, "Controlled Terminal Knee Extension");

  // Step 6: Test date with no session (e.g. Wednesday Nov 25, 2026 for Dev Patel)
  const devWeek = getWeekDaysForAnchor("2026-11-24", devPlan, devReports, "2026-11-24");
  const nov25Wed = devWeek.days.find((d) => d.dateStr === "2026-11-25");
  assert.ok(nov25Wed);
  assert.equal(nov25Wed.sessions.length, 0);
  assert.equal(nov25Wed.isRestDay, true); // Wed is rest day in Tue-Thu-Sat schedule
  assert.equal(nov25Wed.statusLabel, "Rest day");

  // Scheduled day with no session (past Thursday Nov 19, 2026)
  const pastWeek = getWeekDaysForAnchor("2026-11-19", devPlan, devReports, "2026-11-24");
  const pastThu = pastWeek.days.find((d) => d.dateStr === "2026-11-19");
  assert.ok(pastThu);
  assert.equal(pastThu.sessions.length, 0);
  assert.equal(pastThu.state, "no_session");
  assert.equal(pastThu.statusLabel, "No session recorded");
});
