import test from "node:test";
import assert from "node:assert/strict";

// Mock localStorage and window
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};
globalThis.window = {
  location: { origin: "https://athlete-mind-latest.vercel.app" },
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};

const {
  authService,
  formatSupabaseAuthError,
  validatePassword,
  DEMO_PATIENT,
  DEMO_THERAPIST,
} = await import("./lib/auth-service.ts");

test("Supabase Auth & Error Handling Test Suite", async (t) => {
  await t.test("1. Error Formatter handles Supabase specific error codes", () => {
    // Email not confirmed
    const emailErr = formatSupabaseAuthError("Email not confirmed");
    assert.match(emailErr, /Your email address has not been confirmed yet/);

    // Invalid credentials
    const credErr = formatSupabaseAuthError("Invalid login credentials");
    assert.match(credErr, /Invalid email or password/);

    // User already registered
    const regErr = formatSupabaseAuthError("User already registered");
    assert.match(regErr, /An account with this email address already exists/);

    // Rate limit
    const rateErr = formatSupabaseAuthError("over_email_send_rate_limit");
    assert.match(rateErr, /Too many requests/);
  });

  await t.test("2. Seed Demo Accounts remain fully functional for local fallback", async () => {
    // Patient demo login
    const patientRes = await authService.signIn(
      DEMO_PATIENT.email,
      "athlete123",
      "patient"
    );
    assert.equal(patientRes.success, true);
    assert.equal(patientRes.session?.user.email, DEMO_PATIENT.email);
    assert.equal(patientRes.session?.user.role, "patient");

    // Check active session
    assert.equal(authService.getCurrentUser()?.email, DEMO_PATIENT.email);

    // Sign out
    await authService.signOut();
    assert.equal(authService.getCurrentUser(), null);

    // Therapist demo login
    const therapistRes = await authService.signIn(
      DEMO_THERAPIST.email,
      "therapist123",
      "physiotherapist"
    );
    assert.equal(therapistRes.success, true);
    assert.equal(therapistRes.session?.user.role, "physiotherapist");
    assert.equal(therapistRes.session?.user.isVerified, true);

    await authService.signOut();
    assert.equal(authService.getCurrentUser(), null);
  });

  await t.test("3. Role Mismatch strictly blocks access across portals", async () => {
    // Attempt to log in with patient account on physiotherapist tab
    const mismatchRes = await authService.signIn(
      DEMO_PATIENT.email,
      "athlete123",
      "physiotherapist"
    );
    assert.equal(mismatchRes.success, false);
    assert.match(mismatchRes.error || "", /registered as a Patient/);
    assert.equal(mismatchRes.mismatchRole, "patient");
    assert.equal(authService.getCurrentUser(), null);
  });

  await t.test("4. Password validation enforces clinical security requirements", () => {
    assert.equal(validatePassword("short1!").valid, false);
    assert.equal(validatePassword("NoSpecial123").valid, false);
    assert.equal(validatePassword("NoNumberChar!").valid, false);
    assert.equal(validatePassword("SecurePass2026!").valid, true);
  });

  await t.test("5. Session Persistence and Expiration Handling", () => {
    const session = authService.setSession(DEMO_PATIENT);
    assert.ok(session.token);
    assert.ok(session.expiresAt > Date.now());

    const retrieved = authService.getCurrentSession();
    assert.equal(retrieved?.user.id, DEMO_PATIENT.id);

    // Simulate expiration
    storage.set("athletemind_auth_session", JSON.stringify({ ...session, expiresAt: Date.now() - 1000 }));
    assert.equal(authService.getCurrentSession(), null);
  });
});
