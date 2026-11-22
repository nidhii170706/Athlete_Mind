import test from "node:test";
import assert from "node:assert/strict";

// Setup mock browser environment for Node.js test runner
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
  getDirectoryPhysiotherapists,
  getPhysiotherapistById,
  getRecipientFirstName,
  submitConsultationRequest,
  getPatientConsultationRequest,
  getTherapistConsultationRequests,
  acceptConsultationRequest,
  declineConsultationRequest,
  withdrawConsultationRequest,
  saveConsultationDraft,
  getConsultationDraft,
  clearConsultationDraft,
} = await import("./lib/consultations.ts");

const {
  authService,
  DEMO_PATIENT,
  DEMO_PATIENT_UNLINKED,
  DEMO_THERAPIST,
  DEMO_THERAPIST_MARCUS,
} = await import("./lib/auth-service.ts");

const { getPublishedPlan } = await import("./lib/care-plan.ts");
const { getMessages } = await import("./lib/messages.ts");

test("Care Team Directory: Sorting & Ranking Rules", () => {
  const directory = getDirectoryPhysiotherapists();
  assert.equal(directory.length >= 4, true, "Should have at least 4 physiotherapists in directory");

  // Rule 1: Accepting requests first
  assert.equal(directory[0].availability, "accepting");
  assert.equal(directory[1].availability, "accepting");

  // Rule 2: Ranked by average rating from highest to lowest
  assert.equal(directory[0].rating >= directory[1].rating, true);
  assert.equal(directory[0].id, "therapist_meera_joshi", "Meera (4.9) should be first");
  assert.equal(directory[1].id, "therapist_marcus_vance", "Marcus (4.8) should be the SECOND therapist");

  // Rule 3: Unavailable profiles follow and are identifiable
  const unavailable = directory.find((p) => p.availability === "unavailable");
  assert.ok(unavailable, "Should contain an unavailable profile");
  assert.equal(unavailable.id, "therapist_david_chen");
  assert.equal(unavailable.unavailableReason, "Caseload full");
  assert.equal(unavailable.rating, 0, "Unrated clinician has 0 rating");

  // Rule 4: Sample data labels
  assert.equal(directory[0].sampleDataLabel, "Sample Data");
  assert.equal(directory[1].sampleDataLabel, "Sample Data");
});

test("Recipient Name Formatter", () => {
  assert.equal(getRecipientFirstName("Dr. Meera Joshi, PT"), "Meera");
  assert.equal(getRecipientFirstName("Dr. Marcus Vance, PT"), "Marcus");
  assert.equal(getRecipientFirstName("Sarah Jenkins, MSPT"), "Sarah");
  assert.equal(getRecipientFirstName("Dr. David Chen, PT"), "David");
});

test("Consultation Flow: Unlinked Patient selects SECOND therapist (Dr. Marcus Vance)", async () => {
  storage.clear();

  // 1. Sign in as unlinked patient Karan Sharma
  const patientSignIn = await authService.signIn(
    DEMO_PATIENT_UNLINKED.email,
    "athlete123",
    "patient"
  );
  assert.equal(patientSignIn.success, true);
  assert.equal(patientSignIn.session.user.hasActivePlan, false, "Karan Sharma initially has no active plan");
  assert.equal(patientSignIn.session.user.assignedTherapistId, undefined);

  // 2. Patient visits directory and selects the SECOND therapist (Dr. Marcus Vance)
  const directory = getDirectoryPhysiotherapists();
  const secondTherapist = directory[1];
  assert.equal(secondTherapist.id, "therapist_marcus_vance");
  assert.equal(secondTherapist.name, "Dr. Marcus Vance, PT");

  // 3. Draft preservation before sending
  saveConsultationDraft({
    patientName: "Karan Sharma",
    aboutPatient: "27 yrs • Basketball Guard",
    concern: "Post-op ACL reconstruction graft protection and knee flexion arc restoration",
    affectedSide: "Left Knee",
    additionalNote: "Cleared by surgeon for closed-chain flexion exercises.",
    therapistId: secondTherapist.id,
  });

  const draft = getConsultationDraft();
  assert.ok(draft);
  assert.equal(draft.concern, "Post-op ACL reconstruction graft protection and knee flexion arc restoration");
  assert.equal(draft.therapistId, "therapist_marcus_vance");

  // Button wording test
  const buttonText = `Send request to ${getRecipientFirstName(secondTherapist.name)}`;
  assert.equal(buttonText, "Send request to Marcus");

  // 4. Submit consultation request
  const submitRes = submitConsultationRequest({
    patientId: DEMO_PATIENT_UNLINKED.id,
    patientName: "Karan Sharma",
    therapistId: secondTherapist.id,
    aboutPatient: draft.aboutPatient,
    concern: draft.concern,
    affectedSide: draft.affectedSide,
    additionalNote: draft.additionalNote,
  });

  assert.equal(submitRes.success, true);
  assert.ok(submitRes.request);
  assert.equal(submitRes.request.status, "pending");
  assert.equal(submitRes.request.therapistId, "therapist_marcus_vance");
  assert.equal(submitRes.request.patientId, DEMO_PATIENT_UNLINKED.id);

  // 5. Verify repeated clicks create ONLY one request (no duplicates)
  const duplicateSubmit = submitConsultationRequest({
    patientId: DEMO_PATIENT_UNLINKED.id,
    patientName: "Karan Sharma",
    therapistId: secondTherapist.id,
    aboutPatient: draft.aboutPatient,
    concern: draft.concern,
    affectedSide: draft.affectedSide,
    additionalNote: draft.additionalNote,
  });
  assert.equal(duplicateSubmit.success, true);
  assert.equal(duplicateSubmit.request?.id, submitRes.request.id, "Must return existing request without duplicating");

  // 6. Verify Workspace Isolation:
  // Marcus's requests inbox MUST contain Karan's request
  const marcusRequests = getTherapistConsultationRequests("therapist_marcus_vance");
  assert.equal(marcusRequests.length, 1);
  assert.equal(marcusRequests[0].patientName, "Karan Sharma");
  assert.equal(marcusRequests[0].therapistId, "therapist_marcus_vance");

  // Meera's inbox MUST NOT contain Karan's request!
  const meeraRequests = getTherapistConsultationRequests("therapist_meera_joshi");
  const karanInMeera = meeraRequests.some((r) => r.patientId === DEMO_PATIENT_UNLINKED.id);
  assert.equal(karanInMeera, false, "Meera's requests must NOT contain Karan's request");

  // 7. Verify patient's pending view
  const patientPending = getPatientConsultationRequest(DEMO_PATIENT_UNLINKED.id);
  assert.ok(patientPending);
  assert.equal(patientPending.status, "pending");
  assert.equal(patientPending.therapistName, "Dr. Marcus Vance, PT");

  // 8. Marcus accepts the request
  const acceptRes = await acceptConsultationRequest(submitRes.request.id);
  assert.equal(acceptRes.success, true);
  assert.equal(acceptRes.request?.status, "admitted");

  // 9. Verify care relationship is established
  const updatedUser = authService.getCurrentUser();
  assert.equal(updatedUser?.assignedTherapistId, "therapist_marcus_vance", "Patient assignedTherapistId updated to Marcus");
  assert.equal(updatedUser?.hasActivePlan, true, "Patient hasActivePlan set to true");

  // 10. Verify published plan is synchronized with Dr. Marcus Vance
  const patientPlan = getPublishedPlan(DEMO_PATIENT_UNLINKED.id);
  assert.equal(patientPlan.clinicianName, "Dr. Marcus Vance, PT");
  assert.equal(patientPlan.patientName, "Karan Sharma");

  // 11. Verify private conversation is opened in messages
  const messages = getMessages(DEMO_PATIENT_UNLINKED.id);
  assert.equal(messages.length >= 1, true, "Should have private message thread");
  const welcomeMsg = messages.find((m) => m.senderId === "therapist_marcus_vance");
  assert.ok(welcomeMsg, "Should have automated welcome message from Dr. Marcus Vance");
  assert.match(welcomeMsg.text, /accepted your consultation request/);

  // 12. Re-login / Refresh check: relationship persists
  await authService.signOut();
  const reLogin = await authService.signIn(
    DEMO_PATIENT_UNLINKED.email,
    "athlete123",
    "patient"
  );
  assert.equal(reLogin.session.user.assignedTherapistId, "therapist_marcus_vance");
  assert.equal(reLogin.session.user.hasActivePlan, true);
});

test("Unavailable Therapist Protection: Cannot submit to unavailable therapist", () => {
  storage.clear();

  const unavailable = getPhysiotherapistById("therapist_david_chen");
  assert.ok(unavailable);
  assert.equal(unavailable.availability, "unavailable");

  // Save draft
  saveConsultationDraft({
    patientName: "Karan Sharma",
    aboutPatient: "27 yrs",
    concern: "Shoulder impingement rehab",
    affectedSide: "Right Shoulder",
    additionalNote: "Need tele-rehab guidance",
    therapistId: "therapist_david_chen",
  });

  const res = submitConsultationRequest({
    patientId: "patient_karan_sharma",
    patientName: "Karan Sharma",
    therapistId: "therapist_david_chen",
    aboutPatient: "27 yrs",
    concern: "Shoulder impingement rehab",
  });

  assert.equal(res.success, false, "Submission to unavailable therapist must fail");
  assert.match(res.error, /currently unavailable/i);

  // Verify draft is preserved
  const draft = getConsultationDraft();
  assert.ok(draft);
  assert.equal(draft.concern, "Shoulder impingement rehab", "Draft preserved after rejection");
});

test("Withdrawal Flow: Withdrawing pending request returns patient to directory", () => {
  storage.clear();

  const submitRes = submitConsultationRequest({
    patientId: "patient_test_withdraw",
    patientName: "Test Patient",
    therapistId: "therapist_meera_joshi",
    aboutPatient: "Active runner",
    concern: "Hamstring strain",
  });

  assert.equal(submitRes.success, true);
  assert.ok(getPatientConsultationRequest("patient_test_withdraw"));

  withdrawConsultationRequest(submitRes.request.id);
  assert.equal(getPatientConsultationRequest("patient_test_withdraw"), null, "Request successfully withdrawn");
});

test("Decline Flow: Therapist declines request, draft preserved for choosing another professional", async () => {
  storage.clear();

  // Patient drafts and sends request to Dr. Marcus Vance
  saveConsultationDraft({
    patientName: "Ritu Kapoor",
    aboutPatient: "Distance runner",
    concern: "Achilles tendon stiffness and eccentric load rehab",
    affectedSide: "Right Ankle",
    additionalNote: "Looking for tele-rehab guidance on cadence.",
    therapistId: "therapist_marcus_vance",
  });

  const submitRes = submitConsultationRequest({
    patientId: "patient_ritu_kapoor",
    patientName: "Ritu Kapoor",
    therapistId: "therapist_marcus_vance",
    aboutPatient: "Distance runner",
    concern: "Achilles tendon stiffness and eccentric load rehab",
    affectedSide: "Right Ankle",
    additionalNote: "Looking for tele-rehab guidance on cadence.",
  });

  assert.equal(submitRes.success, true);

  // Marcus declines with reason
  const declineRes = declineConsultationRequest(
    submitRes.request.id,
    "Caseload at maximum sports quota."
  );
  assert.equal(declineRes.success, true);
  assert.equal(declineRes.request?.status, "declined");
  assert.equal(declineRes.request?.declineReason, "Caseload at maximum sports quota.");

  // Check patient's request record shows declined
  const patientReq = getPatientConsultationRequest("patient_ritu_kapoor");
  assert.ok(patientReq);
  assert.equal(patientReq.status, "declined");

  // Check that draft was preserved so Ritu can choose another clinician (e.g. Meera)
  const preservedDraft = getConsultationDraft();
  assert.ok(preservedDraft);
  assert.equal(preservedDraft.concern, "Achilles tendon stiffness and eccentric load rehab");

  // Ritu re-submits to Dr. Meera Joshi using preserved draft
  const resubmission = submitConsultationRequest({
    patientId: "patient_ritu_kapoor",
    patientName: "Ritu Kapoor",
    therapistId: "therapist_meera_joshi",
    aboutPatient: preservedDraft.aboutPatient,
    concern: preservedDraft.concern,
    affectedSide: preservedDraft.affectedSide,
    additionalNote: preservedDraft.additionalNote,
  });

  assert.equal(resubmission.success, true);
  assert.equal(resubmission.request?.therapistId, "therapist_meera_joshi");
  assert.equal(resubmission.request?.status, "pending");
});

test("Fresh Patient Signup -> First Visit Directory Flow", async () => {
  storage.clear();

  // Fresh self-registered patient
  const signup = await authService.signUpPatient({
    fullName: "Arjun Mehta",
    email: "arjun.mehta@athletemind.health",
    password: "Password123!",
    confirmPassword: "Password123!",
  });

  assert.equal(signup.success, true);
  const patient = signup.session.user;
  assert.equal(patient.hasActivePlan, false, "Fresh patient starts with hasActivePlan: false");
  assert.equal(patient.assignedTherapistId, undefined);

  // Checks consultations on first visit
  const existingReq = getPatientConsultationRequest(patient.id);
  assert.equal(existingReq, null, "No consultation request yet -> Directory shown immediately");

  // Directory lists professionals ready for comparison
  const directory = getDirectoryPhysiotherapists();
  assert.equal(directory[0].id, "therapist_meera_joshi");
  assert.equal(directory[1].id, "therapist_marcus_vance");
});

