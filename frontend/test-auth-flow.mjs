import test from "node:test";
import assert from "node:assert/strict";

// Mock localStorage for Node test runner
const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};
global.window = {
  location: { origin: "http://localhost:3000" },
};

// Import auth module
const {
  authService,
  validatePassword,
  DEMO_PATIENT,
  DEMO_THERAPIST,
} = await import("./lib/auth-service.ts");

test("AthleteMind Auth Flow Test Suite", async (t) => {
  await t.test("1. Password Security Validation Rules", () => {
    // Too short
    const short = validatePassword("abc");
    assert.equal(short.valid, false);
    assert.match(short.error, /at least 8 characters/);

    // No number
    const noNum = validatePassword("Abcdefgh!");
    assert.equal(noNum.valid, false);
    assert.match(noNum.error, /at least one number/);

    // No special character
    const noSpec = validatePassword("Abcdefgh12");
    assert.equal(noSpec.valid, false);
    assert.match(noSpec.error, /at least one special character/);

    // Valid password
    const valid = validatePassword("Athlete2026!");
    assert.equal(valid.valid, true);
  });

  await t.test("2. Seed Demo Accounts Availability", async () => {
    // Patient Aanya Rao sign in
    const patientLogin = await authService.signIn(
      "patient.aanya@athletemind.health",
      "athlete123",
      "patient"
    );
    assert.equal(patientLogin.success, true);
    assert.equal(patientLogin.session?.user.fullName, "Aanya Rao");
    assert.equal(patientLogin.session?.user.role, "patient");
    assert.equal(patientLogin.session?.user.hasActivePlan, true);

    await authService.signOut();
    assert.equal(authService.getCurrentUser(), null);

    // Physiotherapist Dr. Meera Joshi sign in
    const therapistLogin = await authService.signIn(
      "therapist.meera@athletemind.health",
      "therapist123",
      "physiotherapist"
    );
    assert.equal(therapistLogin.success, true);
    assert.equal(therapistLogin.session?.user.fullName, "Dr. Meera Joshi, PT");
    assert.equal(therapistLogin.session?.user.role, "physiotherapist");
    assert.equal(therapistLogin.session?.user.isVerified, true);

    await authService.signOut();
  });

  await t.test("3. Patient Sign-Up (New account has hasActivePlan: false)", async () => {
    const signupRes = await authService.signUpPatient({
      fullName: "Rohan Varma",
      email: "rohan.varma@example.com",
      password: "SafePassword123!",
      confirmPassword: "SafePassword123!",
    });

    assert.equal(signupRes.success, true);
    assert.equal(signupRes.session?.user.fullName, "Rohan Varma");
    assert.equal(signupRes.session?.user.role, "patient");
    // CRITICAL: Freshly registered accounts do NOT inherit Aanya demo data
    assert.equal(signupRes.session?.user.hasActivePlan, false);

    // Sign in verification
    await authService.signOut();
    const loginAgain = await authService.signIn(
      "rohan.varma@example.com",
      "SafePassword123!",
      "patient"
    );
    assert.equal(loginAgain.success, true);
    assert.equal(loginAgain.session?.user.hasActivePlan, false);
    await authService.signOut();
  });

  await t.test("4. Physiotherapist Sign-Up (Self-registration isVerified: false)", async () => {
    const ptSignup = await authService.signUpTherapist({
      fullName: "Dr. Vikram Singh",
      email: "dr.vikram@clinic.example",
      password: "DocSecure2026#",
      confirmPassword: "DocSecure2026#",
      qualification: "PT, MSPT (Sports Rehab)",
      areaOfPractice: "Spine & Core Kinematics",
    });

    assert.equal(ptSignup.success, true);
    assert.equal(ptSignup.session?.user.fullName, "Dr. Vikram Singh");
    assert.equal(ptSignup.session?.user.role, "physiotherapist");
    // CRITICAL REQUIREMENT: Self-registration alone must never mark credentials as verified
    // or grant access to patient records.
    assert.equal(ptSignup.session?.user.isVerified, false);

    // Unverified clinician CANNOT edit care plans
    const canEdit = authService.canEditCarePlan(ptSignup.session.user, "patient_aanya_rao");
    assert.equal(canEdit, false);

    await authService.signOut();
  });

  await t.test("5. Role Mismatch Prevention (Does NOT change account permissions)", async () => {
    // Attempting to sign into Patient Portal with Physiotherapist credentials
    const mismatch1 = await authService.signIn(
      "therapist.meera@athletemind.health",
      "therapist123",
      "patient" // wrong role expected
    );
    assert.equal(mismatch1.success, false);
    assert.equal(mismatch1.mismatchRole, "physiotherapist");
    assert.match(mismatch1.error, /registered as a Physiotherapist/);

    // Confirm Dr. Meera Joshi's role was NOT mutated
    const users = JSON.parse(storage.get("athletemind_registered_users"));
    assert.equal(users["therapist.meera@athletemind.health"].profile.role, "physiotherapist");

    // Attempting to sign into Physiotherapist Portal with Patient credentials
    const mismatch2 = await authService.signIn(
      "patient.aanya@athletemind.health",
      "athlete123",
      "physiotherapist" // wrong role expected
    );
    assert.equal(mismatch2.success, false);
    assert.equal(mismatch2.mismatchRole, "patient");
    assert.match(mismatch2.error, /registered as a Patient/);
  });

  await t.test("6. Authorization & Access Control Rules", () => {
    // Patient cannot access therapist workspace or edit care plans
    assert.equal(authService.canAccessTherapistWorkspace(DEMO_PATIENT), false);
    assert.equal(authService.canEditCarePlan(DEMO_PATIENT, DEMO_PATIENT.id), false);
    assert.equal(authService.canAccessPatientToday(DEMO_PATIENT), true);

    // Verified Physiotherapist Dr. Meera can access workspace & edit linked patient Aanya
    assert.equal(authService.canAccessTherapistWorkspace(DEMO_THERAPIST), true);
    assert.equal(authService.canEditCarePlan(DEMO_THERAPIST, DEMO_PATIENT.id), true);

    // Patient can view own session report
    assert.equal(authService.canViewSessionReport(DEMO_PATIENT, DEMO_PATIENT.id), true);

    // Unrelated patient cannot view another's report
    assert.equal(
      authService.canViewSessionReport(
        { ...DEMO_PATIENT, id: "patient_other" },
        DEMO_PATIENT.id
      ),
      false
    );
  });

  await t.test("7. Password Reset Preserves Role Context", async () => {
    const res = await authService.requestPasswordReset("patient.aanya@athletemind.health", "patient");
    assert.equal(res.success, true);
    assert.match(res.message, /instructions have been dispatched/);

    const resets = JSON.parse(storage.get("athletemind_pwd_resets") || "[]");
    assert.equal(resets.length >= 1, true);
    assert.equal(resets[resets.length - 1].role, "patient");
  });
});
