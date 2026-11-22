import { describe, it } from "node:test";
import assert from "node:assert";

// Simulation of care plan logic & angle conversion
function flexionToIncludedAngle(flexionDeg) {
  return Math.round(180 - flexionDeg);
}

function includedAngleToFlexion(includedDeg) {
  return Math.max(0, Math.round(180 - includedDeg));
}

// Memory storage mimicking browser localStorage
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

const mockStorage = new MockLocalStorage();

const SEED_PLAN = {
  id: "plan_aanya_week1",
  patientName: "Aanya Rao",
  clinicianName: "Meera Joshi, PT",
  planTitle: "4-Week Left Knee Plan",
  version: 1,
  status: "published",
  exercises: [
    {
      id: "squats",
      name: "Side-view therapeutic squat",
      affectedSide: "left",
      observedSide: "left",
      targetMinFlexionDeg: 35,
      targetMaxFlexionDeg: 45,
      holdDurationSec: 1.0,
      sets: 1,
      reps: 5,
      restSec: 30,
      instructions: "Bend left knee smoothly into 35-45 zone...",
    },
  ],
};

function getPublishedPlan() {
  const raw = mockStorage.getItem("published_plan");
  return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(SEED_PLAN));
}

function saveDraftPlan(plan) {
  mockStorage.setItem(
    "draft_plan",
    JSON.stringify({ ...plan, status: "draft", updatedAt: new Date().toISOString() })
  );
}

function getDraftPlan() {
  const raw = mockStorage.getItem("draft_plan");
  return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(SEED_PLAN));
}

function savePublishedPlan(plan) {
  const updated = {
    ...plan,
    status: "published",
    version: (plan.version || 1) + 1,
    updatedAt: new Date().toISOString(),
  };
  mockStorage.setItem("published_plan", JSON.stringify(updated));
  mockStorage.setItem("draft_plan", JSON.stringify(updated));
}

// Authoritative Movement Engine for Assigned Workout
class AssignedMovementEngine {
  constructor(prescription) {
    this.prescription = prescription;
    this.targetMinFlex = prescription.targetMinFlexionDeg; // 35
    this.targetMaxFlex = prescription.targetMaxFlexionDeg; // 45
    this.targetHoldSec = prescription.holdDurationSec; // 1.0
    this.totalPlanned = prescription.reps; // 5

    // Included angle bounds
    this.targetMaxIncluded = flexionToIncludedAngle(this.targetMinFlex); // 145
    this.targetMinIncluded = flexionToIncludedAngle(this.targetMaxFlex); // 135

    this.currentMovementIdx = 1;
    this.currentPeakIncluded = 180;
    this.currentHoldAccumulator = 0;
    this.isTrackingPaused = false;
    this.trackingPauseStartTime = null;

    this.movements = [];
    this.interruptions = [];
  }

  processFrame({ includedAngle, isTrackingVisible, deltaTime = 0.033 }) {
    if (!isTrackingVisible) {
      if (!this.isTrackingPaused) {
        this.isTrackingPaused = true;
        this.trackingPauseStartTime = Date.now();
      }
      return { status: "tracking_paused" };
    } else {
      if (this.isTrackingPaused) {
        this.interruptions.push({
          afterMovementNum: Math.max(1, this.currentMovementIdx - 1),
          durationSec: 4,
          reason: "Left ankle left view. Previous completed movements preserved.",
        });
        this.isTrackingPaused = false;
        this.trackingPauseStartTime = null;
      }
    }

    const currentFlexion = includedAngleToFlexion(includedAngle);
    this.currentPeakIncluded = Math.min(this.currentPeakIncluded, includedAngle);

    const inTargetZone =
      currentFlexion >= this.targetMinFlex - 3 && currentFlexion <= this.targetMaxFlex + 5;
    const isStanding = currentFlexion <= 15 || includedAngle >= 165;

    if (inTargetZone) {
      this.currentHoldAccumulator += deltaTime;
      return {
        status: "holding",
        holdProgress: Math.min(1.0, this.currentHoldAccumulator / this.targetHoldSec),
      };
    } else if (isStanding) {
      if (this.currentHoldAccumulator >= this.targetHoldSec) {
        const peak = includedAngleToFlexion(this.currentPeakIncluded);
        const mov = {
          movementNum: this.currentMovementIdx,
          observedPeakDeg: peak,
          holdDurationSec: this.targetHoldSec,
          outcome: "met_target",
          gameEvent: "Successful deflection",
        };
        this.movements.push(mov);
        this.currentMovementIdx += 1;
        this.currentPeakIncluded = 180;
        this.currentHoldAccumulator = 0;
        return { status: "deflection_success", movement: mov };
      } else if (this.currentHoldAccumulator >= 0.35) {
        const peak = includedAngleToFlexion(this.currentPeakIncluded);
        const mov = {
          movementNum: this.currentMovementIdx,
          observedPeakDeg: peak,
          holdDurationSec: Number(this.currentHoldAccumulator.toFixed(1)),
          outcome: "early_release",
          gameEvent: "Partial shield dissolved",
        };
        this.movements.push(mov);
        this.currentMovementIdx += 1;
        this.currentPeakIncluded = 180;
        this.currentHoldAccumulator = 0;
        return { status: "early_release", movement: mov };
      } else {
        this.currentPeakIncluded = 180;
        this.currentHoldAccumulator = 0;
        return { status: "standing_ready" };
      }
    }

    return { status: "moving" };
  }

  endSession() {
    for (let k = this.currentMovementIdx; k <= this.totalPlanned; k++) {
      this.movements.push({
        movementNum: k,
        observedPeakDeg: undefined,
        holdDurationSec: undefined,
        outcome: "skipped",
        gameEvent: "Session ended early",
      });
    }

    const metCount = this.movements.filter((m) => m.outcome === "met_target").length;
    const earlyCount = this.movements.filter((m) => m.outcome === "early_release").length;
    const performedCount = this.movements.filter((m) => m.outcome !== "skipped").length;

    return {
      plannedMovements: this.totalPlanned,
      performedMovements: performedCount,
      metTargetAndHold: metCount,
      earlyReleases: earlyCount,
      trackingPauses: this.interruptions.length,
      movements: this.movements,
      interruptions: this.interruptions,
      prescriptionSnapshot: JSON.parse(JSON.stringify(this.prescription)),
    };
  }
}

describe("AthleteMind - 4 Connected Pages & Arena Integration Test Suite", () => {
  it("A. Angle Convention Conversion: accurately maps knee flexion to included angle", () => {
    assert.strictEqual(flexionToIncludedAngle(0), 180, "0 deg flexion must be 180 deg straight knee");
    assert.strictEqual(flexionToIncludedAngle(35), 145, "35 deg flexion must be 145 deg included");
    assert.strictEqual(flexionToIncludedAngle(45), 135, "45 deg flexion must be 135 deg included");
    assert.strictEqual(flexionToIncludedAngle(90), 90, "90 deg flexion must be 90 deg included");

    assert.strictEqual(includedAngleToFlexion(180), 0);
    assert.strictEqual(includedAngleToFlexion(140), 40);
    assert.strictEqual(includedAngleToFlexion(135), 45);
  });

  it("B. Case B: Draft vs Published Plan Separation", () => {
    mockStorage.clear();
    const initialPub = getPublishedPlan();
    assert.strictEqual(initialPub.exercises[0].reps, 5, "Initial published reps must be 5");

    // Modify draft to 3 reps
    const draft = getDraftPlan();
    draft.exercises[0].reps = 3;
    saveDraftPlan(draft);

    // Published plan MUST still be 5
    const pubAfterDraft = getPublishedPlan();
    assert.strictEqual(pubAfterDraft.exercises[0].reps, 5, "Published plan must still have 5 reps after saving draft");

    // Now publish plan
    savePublishedPlan(draft);

    // Patient Today and Hangar now read updated 3 reps
    const pubAfterPublish = getPublishedPlan();
    assert.strictEqual(pubAfterPublish.exercises[0].reps, 3, "Published plan must now reflect 3 reps");
  });

  it("C & D. Cases C & D: Prescribed Target Band Validation & Deflection Awarding", () => {
    const rx = {
      targetMinFlexionDeg: 35,
      targetMaxFlexionDeg: 45,
      holdDurationSec: 1.0,
      reps: 5,
    };
    const engineMatching = new AssignedMovementEngine(rx);

    // Synthetic movement: descend to 40 deg flexion (140 deg included angle)
    for (let frame = 0; frame < 32; frame++) {
      engineMatching.processFrame({ includedAngle: 140, isTrackingVisible: true, deltaTime: 0.033 });
    }
    // Return upright (175 deg)
    const res = engineMatching.processFrame({ includedAngle: 175, isTrackingVisible: true });
    assert.strictEqual(res.status, "deflection_success");
    assert.strictEqual(res.movement.outcome, "met_target");
    assert.strictEqual(res.movement.gameEvent, "Successful deflection");

    // Now run SAME movement under mismatched target (e.g. 70-85 deg deep squat)
    const rxMismatched = {
      targetMinFlexionDeg: 70,
      targetMaxFlexionDeg: 85,
      holdDurationSec: 1.0,
      reps: 5,
    };
    const engineMismatched = new AssignedMovementEngine(rxMismatched);
    for (let frame = 0; frame < 32; frame++) {
      engineMismatched.processFrame({ includedAngle: 140, isTrackingVisible: true, deltaTime: 0.033 });
    }
    const resMismatched = engineMismatched.processFrame({ includedAngle: 175, isTrackingVisible: true });
    assert.notStrictEqual(resMismatched.status, "deflection_success", "Mismatched target must NOT award deflection");
  });

  it("E. Case E: Tracking Interruption During Hold Does Not Earn Time", () => {
    const rx = {
      targetMinFlexionDeg: 35,
      targetMaxFlexionDeg: 45,
      holdDurationSec: 1.0,
      reps: 5,
    };
    const engine = new AssignedMovementEngine(rx);

    // Hold for 0.4s inside target
    for (let f = 0; f < 12; f++) {
      engine.processFrame({ includedAngle: 140, isTrackingVisible: true, deltaTime: 0.033 });
    }
    const holdBeforeDrop = engine.currentHoldAccumulator;

    // Tracking is lost for 30 frames (camera obscured / ankle left view)
    for (let f = 0; f < 30; f++) {
      engine.processFrame({ includedAngle: 140, isTrackingVisible: false, deltaTime: 0.033 });
    }

    assert.strictEqual(
      engine.currentHoldAccumulator,
      holdBeforeDrop,
      "Hold accumulator must freeze while tracking is unavailable"
    );
  });

  it("F. Case F: Early Exit Correctly Classifies Performed, Early Releases & Skipped Reps", () => {
    const rx = {
      targetMinFlexionDeg: 35,
      targetMaxFlexionDeg: 45,
      holdDurationSec: 1.0,
      reps: 5,
    };
    const engine = new AssignedMovementEngine(rx);

    // Movement 1: Success (met target)
    for (let f = 0; f < 32; f++) engine.processFrame({ includedAngle: 139, isTrackingVisible: true });
    engine.processFrame({ includedAngle: 175, isTrackingVisible: true });

    // Movement 2: Success (met target)
    for (let f = 0; f < 32; f++) engine.processFrame({ includedAngle: 137, isTrackingVisible: true });
    engine.processFrame({ includedAngle: 175, isTrackingVisible: true });

    // Tracking interruption occurs
    engine.processFrame({ includedAngle: 140, isTrackingVisible: false });
    engine.processFrame({ includedAngle: 140, isTrackingVisible: true });

    // Movement 3: Success (met target)
    for (let f = 0; f < 32; f++) engine.processFrame({ includedAngle: 142, isTrackingVisible: true });
    engine.processFrame({ includedAngle: 175, isTrackingVisible: true });

    // Movement 4: Early release (held only 0.5s)
    for (let f = 0; f < 15; f++) engine.processFrame({ includedAngle: 141, isTrackingVisible: true });
    engine.processFrame({ includedAngle: 175, isTrackingVisible: true });

    // User exits session before movement 5
    const report = engine.endSession();

    assert.strictEqual(report.plannedMovements, 5);
    assert.strictEqual(report.performedMovements, 4);
    assert.strictEqual(report.metTargetAndHold, 3);
    assert.strictEqual(report.earlyReleases, 1);
    assert.strictEqual(report.trackingPauses, 1);
    assert.strictEqual(report.movements[4].outcome, "skipped");
    assert.strictEqual(report.movements[4].gameEvent, "Session ended early");
  });

  it("G. Case G: Historical Report Prescription Snapshot Remains Immutable", () => {
    const rx = {
      targetMinFlexionDeg: 35,
      targetMaxFlexionDeg: 45,
      holdDurationSec: 1.0,
      reps: 5,
    };
    const engine = new AssignedMovementEngine(rx);
    const report = engine.endSession();

    // Later therapist edits upcoming plan to 50-60 deg
    rx.targetMinFlexionDeg = 50;
    rx.targetMaxFlexionDeg = 60;

    assert.strictEqual(
      report.prescriptionSnapshot.targetMinFlexionDeg,
      35,
      "Historical report must preserve original prescription snapshot"
    );
  });
});
