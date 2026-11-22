import test from "node:test";
import assert from "node:assert/strict";

// Mock localStorage for Node environment
const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, val) => storage.set(key, String(val)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};
global.window = {};

const { authService } = await import("./lib/auth-service.ts");
const {
  getScopedPatientId,
  getDraftPlan,
  saveDraftPlan,
  getPublishedPlan,
  savePublishedPlan,
} = await import("./lib/care-plan.ts");

test("Therapist Demo Workflow: Draft vs Published Scoped Flow", async (t) => {
  // 1. Sign up a new physiotherapist (pending verification)
  const signup = await authService.signUpTherapist({
    fullName: "Dr. Vikram Patel",
    email: "dr.vikram.patel@ortho.test",
    password: "Password123#",
    confirmPassword: "Password123#",
    qualification: "PT, DPT",
    areaOfPractice: "Sports Knee Recovery",
  });

  assert.equal(signup.success, true);
  const user = signup.session.user;
  assert.equal(user.isVerified, false); // Pending audit

  // 2. Compute scoped patient ID
  const scopedPatientId = getScopedPatientId(user.id);
  assert.equal(scopedPatientId, `patient_aanya_${user.id}`);

  // Can this unverified therapist edit their scoped demo patient? YES!
  const canEditScoped = authService.canEditCarePlan(user, scopedPatientId);
  assert.equal(canEditScoped, true, "Unverified clinician can edit scoped demo patient");

  // Cannot edit someone else's patient
  const canEditOther = authService.canEditCarePlan(user, "patient_other_clinician");
  assert.equal(canEditOther, false, "Cannot edit other clinician's patient");

  // 3. Check initial published plan for this scoped patient
  const initialPublished = getPublishedPlan(scopedPatientId);
  assert.equal(initialPublished.exercises[0].reps, 5, "Initial squat reps should be 5");

  // 4. Load draft plan, modify squat reps from 5 to 3
  const draft = getDraftPlan(scopedPatientId);
  assert.equal(draft.exercises[0].reps, 5);
  draft.exercises[0].reps = 3;

  // 5. Save draft only
  saveDraftPlan(draft, scopedPatientId);

  // 6. Verify Patient Today & My Plan still read 5 published reps!
  const publishedAfterDraft = getPublishedPlan(scopedPatientId);
  assert.equal(publishedAfterDraft.exercises[0].reps, 5, "Published plan must remain 5 while draft is 3");

  const draftAfterDraft = getDraftPlan(scopedPatientId);
  assert.equal(draftAfterDraft.exercises[0].reps, 3, "Draft plan must show modified 3 reps");

  // 7. Publish the modified plan
  savePublishedPlan(draft, scopedPatientId);

  // 8. Verify Patient Today, My Plan, and Mission Hangar now see 3 reps!
  const publishedAfterPublish = getPublishedPlan(scopedPatientId);
  assert.equal(publishedAfterPublish.exercises[0].reps, 3, "Published plan must now reflect 3 reps");

  // 9. Re-sign in with the same physiotherapist account
  await authService.signOut();
  const relogin = await authService.signIn(
    "dr.vikram.patel@ortho.test",
    "Password123#",
    "physiotherapist"
  );
  assert.equal(relogin.success, true);
  assert.equal(relogin.session?.user.fullName, "Dr. Vikram Patel");

  // 10. Confirm persistence across re-login
  const reloadedPublished = getPublishedPlan(scopedPatientId);
  assert.equal(reloadedPublished.exercises[0].reps, 3, "Published plan must remain 3 across re-login");
});
