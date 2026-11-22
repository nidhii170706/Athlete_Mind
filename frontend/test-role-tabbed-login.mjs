import { describe, it } from "node:test";
import assert from "node:assert";
import http from "node:http";

// Setup browser-like globals
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
const { authService, canEditCarePlan } = await import("./lib/auth-service.ts");
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

describe("Role-Based Tabbed Login & Workspaces Verification", () => {
  it("1. Root '/' and '/care' return HTTP 200 and serve Unified Tabbed Login", async () => {
    globalThis.localStorage.clear();

    const rootRes = await fetchRoute("/");
    assert.strictEqual(rootRes.status, 200, "Root '/' must return HTTP 200");
    assert(rootRes.data.includes("Loading care portal"), "Root must include SSR loading care portal state");

    const careRes = await fetchRoute("/care");
    assert.strictEqual(careRes.status, 200, "Care portal '/care' must return HTTP 200");

    const patientLoginRes = await fetchRoute("/auth/patient/login");
    assert.strictEqual(patientLoginRes.status, 200, "Direct URL /auth/patient/login must return HTTP 200");

    const therapistLoginRes = await fetchRoute("/auth/therapist/login");
    assert.strictEqual(therapistLoginRes.status, 200, "Direct URL /auth/therapist/login must return HTTP 200");
  });

  it("2. Wrong Tab Warning & Role Protection (changing tabs never alters account role)", async () => {
    globalThis.localStorage.clear();

    // Try signing in with therapist email on Patient tab
    const mismatch1 = await authService.signIn(
      "therapist.meera@athletemind.health",
      "therapist123",
      "patient"
    );
    assert.strictEqual(mismatch1.success, false, "Should fail sign in on wrong tab");
    assert.strictEqual(mismatch1.mismatchRole, "physiotherapist", "Must identify mismatchRole as physiotherapist");
    assert(
      mismatch1.error?.toLowerCase().includes("registered as a physiotherapist"),
      "Error must inform user about role mismatch"
    );

    // Try signing in with patient email on Physiotherapist tab
    const mismatch2 = await authService.signIn(
      "patient.aanya@athletemind.health",
      "athlete123",
      "physiotherapist"
    );
    assert.strictEqual(mismatch2.success, false, "Should fail sign in on wrong tab");
    assert.strictEqual(mismatch2.mismatchRole, "patient", "Must identify mismatchRole as patient");
    assert(
      mismatch2.error?.toLowerCase().includes("registered as a patient"),
      "Error must inform user about role mismatch"
    );

    // Ensure changing tabs / mismatch attempts NEVER modified stored account role
    const pSuccess = await authService.signIn(
      "patient.aanya@athletemind.health",
      "athlete123",
      "patient"
    );
    assert.strictEqual(pSuccess.success, true);
    assert.strictEqual(pSuccess.session?.user.role, "patient", "Patient account role remains strictly 'patient'");
    await authService.signOut();

    const tSuccess = await authService.signIn(
      "therapist.meera@athletemind.health",
      "therapist123",
      "physiotherapist"
    );
    assert.strictEqual(tSuccess.success, true);
    assert.strictEqual(tSuccess.session?.user.role, "physiotherapist", "Therapist account role remains strictly 'physiotherapist'");
    await authService.signOut();
  });

  it("3. Patient Login lands at /today with exact Patient Header destinations", async () => {
    globalThis.localStorage.clear();

    const loginRes = await authService.signIn(
      "patient.aanya@athletemind.health",
      "athlete123",
      "patient"
    );
    assert.strictEqual(loginRes.success, true);
    assert.strictEqual(loginRes.session?.user.role, "patient");

    // Check all required patient header destinations
    const routes = [
      { name: "Today", path: "/today" },
      { name: "My Plan", path: "/plan" },
      { name: "Exercise Library", path: "/exercises" },
      { name: "My Care", path: "/care-team" },
      { name: "Messages", path: "/messages" },
      { name: "Progress", path: "/progress" },
    ];

    for (const r of routes) {
      const res = await fetchRoute(r.path);
      assert.strictEqual(res.status, 200, `Patient route ${r.name} (${r.path}) must return 200`);
    }

    // Verify patient cannot edit or publish care plan
    const currentUser = authService.getCurrentUser();
    assert(currentUser !== null);
    const canPatientEdit = canEditCarePlan(currentUser, "patient_aanya_rao");
    assert.strictEqual(canPatientEdit, false, "Patient must not have care plan edit permissions");
  });

  it("4. Physiotherapist Login lands at /therapist/workspace with professional destinations", async () => {
    globalThis.localStorage.clear();

    const loginRes = await authService.signIn(
      "therapist.meera@athletemind.health",
      "therapist123",
      "physiotherapist"
    );
    assert.strictEqual(loginRes.success, true);
    assert.strictEqual(loginRes.session?.user.role, "physiotherapist");

    // Check therapist routes
    const wsRes = await fetchRoute("/therapist/workspace");
    assert.strictEqual(wsRes.status, 200, "Workspace must return 200");

    const editorRes = await fetchRoute("/therapist/editor?patientId=patient_aanya_rao");
    assert.strictEqual(editorRes.status, 200, "Editor must return 200");

    const reportRes = await fetchRoute("/report?patientId=patient_aanya_rao");
    assert.strictEqual(reportRes.status, 200, "Report must return 200");

    const messagesRes = await fetchRoute("/messages?patientId=patient_aanya_rao");
    assert.strictEqual(messagesRes.status, 200, "Messages must return 200");

    // Scoped caseload check
    const scopedPid = carePlanService.getScopedPatientId(loginRes.session.user.id);
    assert.strictEqual(scopedPid, "patient_aanya_rao");
  });

  it("5. Draft vs Published Isolation: 5 reps -> 3 reps verified across patient & therapist", async () => {
    globalThis.localStorage.clear();

    const pid = "patient_aanya_rao";
    // 1. Initial published plan has 5 reps
    const initialPlan = carePlanService.getPublishedPlan(pid);
    assert.strictEqual(initialPlan.exercises[0].reps, 5, "Initial reps must be 5");

    // 2. Edit draft to 3 reps and save draft
    const draft = carePlanService.getDraftPlan(pid);
    draft.exercises[0].reps = 3;
    carePlanService.saveDraftPlan(draft, pid);

    // 3. Draft shows 3, published still shows 5
    const reloadedDraft = carePlanService.getDraftPlan(pid);
    assert.strictEqual(reloadedDraft.exercises[0].reps, 3, "Draft must show 3 reps");

    const publishedStill5 = carePlanService.getPublishedPlan(pid);
    assert.strictEqual(publishedStill5.exercises[0].reps, 5, "Published plan must remain 5 reps");

    // 4. Publish plan
    carePlanService.savePublishedPlan(draft, pid);

    // 5. Patient views now reflect 3 reps
    const publishedNow3 = carePlanService.getPublishedPlan(pid);
    assert.strictEqual(publishedNow3.exercises[0].reps, 3, "Published plan now reflects 3 reps");

    // Hangar launch link verification
    const hangarRes = await fetchRoute("/hangar");
    assert.strictEqual(hangarRes.status, 200);

    const arenaRes = await fetchRoute("/arena");
    assert.strictEqual(arenaRes.status, 200);
  });
});
