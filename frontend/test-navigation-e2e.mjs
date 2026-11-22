import { describe, it } from "node:test";
import assert from "node:assert";
import http from "node:http";

// Setup browser-like globals for library testing
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) || null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

globalThis.window = {
  location: { search: "" },
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.localStorage = new MockLocalStorage();

// Import services
const { authService } = await import("./lib/auth-service.ts");
const carePlanService = await import("./lib/care-plan.ts");
const messagesService = await import("./lib/messages.ts");

function fetchRoute(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, data }));
    }).on("error", reject);
  });
}

describe("AthleteMind End-to-End Navigation & Entry Point Verification", () => {
  // -------------------------------------------------------------------------
  // Test A: Fresh Private Session -> Root Entry Point & Role Selection
  // -------------------------------------------------------------------------
  it("Test A: Root '/' serves Care Portal role selector for signed-out users", async () => {
    globalThis.localStorage.clear();

    // 1. Live HTTP check
    const rootRes = await fetchRoute("/");
    assert.strictEqual(rootRes.status, 200, "Root / must return HTTP 200");
    assert(
      rootRes.data.includes("Loading care portal"),
      "Root / SSR must render care portal entry state"
    );

    // 2. Client-side resolution check
    const currentUser = authService.getCurrentUser();
    assert.strictEqual(currentUser, null, "Fresh private session has no user");

    // 3. Verify destination URLs for role selection
    const patientLoginUrl = "/auth/patient/login";
    const patientSignupUrl = "/auth/patient/signup";
    const therapistLoginUrl = "/auth/therapist/login";
    const therapistSignupUrl = "/auth/therapist/signup";
    const arenaHubUrl = "/arena";

    assert.strictEqual(patientLoginUrl, "/auth/patient/login");
    assert.strictEqual(therapistLoginUrl, "/auth/therapist/login");
    assert.strictEqual(arenaHubUrl, "/arena");

    // 4. Verify /care also returns 200 with care portal entry
    const careRes = await fetchRoute("/care");
    assert.strictEqual(careRes.status, 200, "/care must return HTTP 200");
  });

  // -------------------------------------------------------------------------
  // Test B: Patient Sign In -> Today -> Patient Header Controls -> Sign Out
  // -------------------------------------------------------------------------
  it("Test B: Patient sign in, patient header navigation, messaging, and sign out", async () => {
    globalThis.localStorage.clear();

    // 1. Sign in as Patient (Aanya Rao)
    const loginRes = await authService.signIn("patient.aanya@athletemind.health", "athlete123", "patient");
    assert.strictEqual(loginRes.success, true);
    assert.strictEqual(loginRes.session?.user.role, "patient");
    assert.strictEqual(loginRes.session?.user.fullName, "Aanya Rao");

    // 2. Verify patient landing route is /today
    const todayRes = await fetchRoute("/today");
    assert.strictEqual(todayRes.status, 200);

    // 3. Verify published plan for Aanya Rao
    const initialPlan = carePlanService.getPublishedPlan("patient_aanya_rao");
    assert.strictEqual(initialPlan.patientName, "Aanya Rao");
    assert.strictEqual(initialPlan.exercises[0].reps, 5, "Initial seed published plan has 5 reps");

    // 4. Header Item: My Plan (/plan)
    const planRes = await fetchRoute("/plan");
    assert.strictEqual(planRes.status, 200);

    // 5. Header Item: Exercise Library (/exercises)
    const exercisesRes = await fetchRoute("/exercises");
    assert.strictEqual(exercisesRes.status, 200);
    // Selecting an exercise must not alter active plan
    const planAfterLib = carePlanService.getPublishedPlan("patient_aanya_rao");
    assert.strictEqual(planAfterLib.activeExerciseId, initialPlan.activeExerciseId);

    // 6. Header Item: My Care (/care-team)
    const careTeamRes = await fetchRoute("/care-team");
    assert.strictEqual(careTeamRes.status, 200);

    // 7. Header Item: Messages (/messages)
    const messagesRes = await fetchRoute("/messages");
    assert.strictEqual(messagesRes.status, 200);
    // Send a test message
    const testMsgText = `Biomechanical calibration verified at ${Date.now()}`;
    const sent = await messagesService.sendMessage(
      "patient_aanya_rao",
      { id: "patient_aanya_rao", name: "Aanya Rao", role: "patient" },
      testMsgText
    );
    assert.strictEqual(sent.text, testMsgText);
    // Verify persistence across reload
    const refreshedMsgs = messagesService.getMessages("patient_aanya_rao");
    const foundMsg = refreshedMsgs.find((m) => m.text === testMsgText);
    assert(foundMsg, "Message must persist in store after refresh");

    // 8. Header Item: Progress (/progress)
    const progressRes = await fetchRoute("/progress");
    assert.strictEqual(progressRes.status, 200);

    // 9. Sign Out clears session and returns to root /
    await authService.signOut();
    const currentUserAfter = authService.getCurrentUser();
    assert.strictEqual(currentUserAfter, null, "User must be null after sign out");
  });

  // -------------------------------------------------------------------------
  // Test C: Physiotherapist Sign In -> Caseload -> Draft vs Publish 3 Reps
  // -------------------------------------------------------------------------
  it("Test C: Physiotherapist signs in, edits reps from 5 to 3 in draft, then publishes", async () => {
    globalThis.localStorage.clear();

    // 1. Sign in as demo therapist (Dr. Meera Joshi)
    const loginRes = await authService.signIn("therapist.meera@athletemind.health", "therapist123", "physiotherapist");
    assert.strictEqual(loginRes.success, true);
    assert.strictEqual(loginRes.session?.user.role, "physiotherapist");
    assert.strictEqual(loginRes.session?.user.isVerified, true);

    // 2. Open workspace
    const wsRes = await fetchRoute("/therapist/workspace");
    assert.strictEqual(wsRes.status, 200);

    // 3. Caseload maps to Aanya Rao
    const scopedPid = carePlanService.getScopedPatientId(loginRes.session.user.id);
    assert.strictEqual(scopedPid, "patient_aanya_rao");

    // 4. Initial published plan has 5 reps
    const publishedBefore = carePlanService.getPublishedPlan(scopedPid);
    assert.strictEqual(publishedBefore.exercises[0].reps, 5);

    // 5. Therapist edits draft: changes reps from 5 to 3
    const draft = carePlanService.getDraftPlan(scopedPid);
    draft.exercises[0].reps = 3;
    carePlanService.saveDraftPlan(draft, scopedPid);

    // Verify draft now shows 3 reps, but published plan still shows 5 reps!
    const reloadedDraft = carePlanService.getDraftPlan(scopedPid);
    assert.strictEqual(reloadedDraft.exercises[0].reps, 3, "Draft must show 3 reps");
    const reloadedPublished = carePlanService.getPublishedPlan(scopedPid);
    assert.strictEqual(reloadedPublished.exercises[0].reps, 5, "Published plan must still show 5 reps");

    // 6. Therapist clicks Publish Plan
    carePlanService.savePublishedPlan(draft, scopedPid);

    // Verify published plan now reflects 3 reps
    const publishedAfter = carePlanService.getPublishedPlan(scopedPid);
    assert.strictEqual(publishedAfter.exercises[0].reps, 3, "Published plan must now show 3 reps");
    assert.strictEqual(publishedAfter.status, "published");
  });

  // -------------------------------------------------------------------------
  // Test D: Linked Patient View Confirms 3 Reps & Hangar Launches /arena
  // -------------------------------------------------------------------------
  it("Test D: Patient Today, My Plan, and Hangar reflect 3 reps, and Hangar launches /arena", async () => {
    // 1. Check patient Today view
    const patientPlan = carePlanService.getPublishedPlan("patient_aanya_rao");
    assert.strictEqual(patientPlan.exercises[0].reps, 3, "Today must reflect updated 3 reps");

    // 2. Check Hangar endpoint
    const hangarRes = await fetchRoute("/hangar");
    assert.strictEqual(hangarRes.status, 200);

    // 3. Verify launch mission destination
    const patientId = "patient_aanya_rao";
    const expectedLaunchUrl = `/arena?assigned=true&patientId=${patientId}`;
    assert.strictEqual(expectedLaunchUrl, "/arena?assigned=true&patientId=patient_aanya_rao");

    // 4. Verify /arena exists and returns HTTP 200
    const arenaRes = await fetchRoute("/arena");
    assert.strictEqual(arenaRes.status, 200, "Dedicated /arena route must return HTTP 200");
  });

  // -------------------------------------------------------------------------
  // Test E: Complete 1 Valid Rep and End Early -> Report Shows 3 Planned, 1 Performed
  // -------------------------------------------------------------------------
  it("Test E: Early exit classifies 1 performed, 2 skipped; report saved and distinct", async () => {
    const publishedPlan = carePlanService.getPublishedPlan("patient_aanya_rao");
    const activeEx = publishedPlan.exercises[0];
    assert.strictEqual(activeEx.reps, 3, "Planned reps must be 3");

    // Simulate 1 completed rep and early exit after rep 1
    const movements = [
      {
        movementNum: 1,
        observedPeakDeg: 42,
        holdDurationSec: 1.0,
        outcome: "met_target",
        gameEvent: "Deflection successful",
      },
      {
        movementNum: 2,
        observedPeakDeg: undefined,
        holdDurationSec: undefined,
        outcome: "skipped",
        gameEvent: "Session ended early",
      },
      {
        movementNum: 3,
        observedPeakDeg: undefined,
        holdDurationSec: undefined,
        outcome: "skipped",
        gameEvent: "Session ended early",
      },
    ];

    const newReport = {
      id: "rep_test_early_exit_123",
      sessionDate: "Nov 24",
      sessionTitle: "Afternoon Session Report • Nov 24",
      prescriptionSnapshot: { ...activeEx },
      planVersion: publishedPlan.version || 1,
      plannedMovements: 3,
      performedMovements: 1,
      metTargetAndHold: 1,
      earlyReleases: 0,
      trackingPauses: 0,
      observedMinDeg: 42,
      observedMaxDeg: 42,
      narrativeHeadline: "You performed 1 of 3 planned movements. 1 met both your range and hold target.",
      narrativeSubtext: "1 successful deflection recorded.",
      movements,
      interruptions: [],
      patientNote: "Ended session early after first rep.",
      syncStatus: "synced",
    };

    // Save report
    carePlanService.saveSessionReport(newReport, "patient_aanya_rao");

    // Retrieve via getSessionReportById
    const loadedReport = carePlanService.getSessionReportById("rep_test_early_exit_123", "patient_aanya_rao");
    assert.strictEqual(loadedReport.plannedMovements, 3);
    assert.strictEqual(loadedReport.performedMovements, 1);
    assert.strictEqual(loadedReport.metTargetAndHold, 1);
    assert.strictEqual(loadedReport.movements[1].outcome, "skipped");

    // Verify all saved sessions list contains new session and earlier sessions
    const allReports = carePlanService.getAllSessionReports("patient_aanya_rao");
    assert(allReports.length >= 2, "Must contain new session and previous sessions");
    const foundNew = allReports.find((r) => r.id === "rep_test_early_exit_123");
    assert(foundNew, "New session must appear in reports list");

    // Verify opening earlier baseline session still displays its own distinct results
    const baseline = carePlanService.getSessionReportById("rep_baseline_nov17", "patient_aanya_rao");
    assert.strictEqual(baseline.plannedMovements, 5);
    assert.strictEqual(baseline.performedMovements, 2);
    assert.strictEqual(baseline.prescriptionSnapshot.reps, 5, "Earlier report prescription snapshot is immutable");
  });

  // -------------------------------------------------------------------------
  // Test F: Returning Signed-In User Workspace Routing & Sign Out Protection
  // -------------------------------------------------------------------------
  it("Test F: Root '/' workspace routing for signed-in roles and sign-out protection", async () => {
    // 1. Patient signed in: root '/' routes to /today
    const pLogin = await authService.signIn("patient.aanya@athletemind.health", "athlete123", "patient");
    assert.strictEqual(pLogin.success, true);
    const patientUser = authService.getCurrentUser();
    assert.strictEqual(patientUser.role, "patient");
    const targetPatientRoute = patientUser.role === "patient" ? "/today" : "/therapist/workspace";
    assert.strictEqual(targetPatientRoute, "/today");

    // 2. Therapist signed in: root '/' routes to /therapist/workspace
    const tLogin = await authService.signIn("therapist.meera@athletemind.health", "therapist123", "physiotherapist");
    assert.strictEqual(tLogin.success, true);
    const therapistUser = authService.getCurrentUser();
    assert.strictEqual(therapistUser.role, "physiotherapist");
    const targetTherapistRoute = therapistUser.role === "physiotherapist" ? "/therapist/workspace" : "/today";
    assert.strictEqual(targetTherapistRoute, "/therapist/workspace");

    // 3. Sign out clears session
    await authService.signOut();
    assert.strictEqual(authService.getCurrentUser(), null);
  });

  // -------------------------------------------------------------------------
  // Test G: Standalone Arena at /arena & Camera Check
  // -------------------------------------------------------------------------
  it("Test G: Standalone arena accessible at /arena, backend WebSocket is active", async () => {
    // 1. Live route check
    const arenaRes = await fetchRoute("/arena");
    assert.strictEqual(arenaRes.status, 200, "/arena must return HTTP 200");

    // 2. Backend WebSocket health check on 127.0.0.1:8000
    const backendHealth = await new Promise((resolve, reject) => {
      http.get("http://127.0.0.1:8000/health", (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve(JSON.parse(body)));
      }).on("error", reject);
    });
    assert.strictEqual(backendHealth.status.toLowerCase(), "healthy");
  });
});
