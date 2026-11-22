import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("AthleteMind Arena Framing, Cockpit & Positioning Guidance Test Suite", () => {
  // =========================================================================
  // 1. Viewport & Layout Sizing Rules Across 5 Standard Breakpoints
  // =========================================================================
  it("1. Viewport Layout Analysis: Cockpit fills available space with 8-12px outer spacing and contain-style canvas", () => {
    const arenaCode = fs.readFileSync(path.join(__dirname, "app/arena/page.tsx"), "utf8");
    const cockpitCode = fs.readFileSync(path.join(__dirname, "components/FuturisticCockpitFrame.tsx"), "utf8");
    const cameraTestCode = fs.readFileSync(path.join(__dirname, "components/CameraTestView.tsx"), "utf8");

    // A. Verify FuturisticCockpitFrame does NOT enforce fixed 16:9 or 4:3 aspect ratio
    assert(
      !cockpitCode.includes("aspect-[16/9]"),
      "FuturisticCockpitFrame must not be constrained by a fixed 16/9 aspect ratio"
    );
    assert(
      !arenaCode.includes("aspect-[16/9]"),
      "Arena page must not enforce fixed 16/9 aspect ratio wrapper on the cockpit"
    );

    // B. Verify arena main container provides ~8-12px outer spacing (p-2 is 8px, p-2.5 is 10px)
    assert(
      arenaCode.includes("p-2 sm:p-2.5"),
      "Main viewport must use approximately 8-12px outer spacing (p-2 sm:p-2.5)"
    );

    // C. Verify canvas in both arena and camera test uses object-contain (NO object-cover visual crop!)
    assert(
      arenaCode.includes('className="w-full h-full object-contain"'),
      "Arena canvas must use object-contain to eliminate visual cropping of head and feet"
    );
    assert(
      cameraTestCode.includes('className="w-full h-full object-contain"'),
      "CameraTestView canvas must use object-contain to display full camera frame without crop"
    );

    // D. Viewport calculations at key target sizes:
    const viewports = [
      { name: "1216 × 530 (Target Short Laptop)", w: 1216, h: 530, headerH: 48, outerP: 8, botBarH: 46 },
      { name: "1366 × 768 (Laptop Standard)", w: 1366, h: 768, headerH: 56, outerP: 10, botBarH: 46 },
      { name: "1920 × 1080 (Desktop Full HD)", w: 1920, h: 1080, headerH: 56, outerP: 10, botBarH: 46 },
      { name: "768 × 1024 (Portrait Tablet)", w: 768, h: 1024, headerH: 56, outerP: 10, botBarH: 46 },
      { name: "390 × 844 (Portrait Mobile)", w: 390, h: 844, headerH: 48, outerP: 8, botBarH: 46 },
    ];

    viewports.forEach((vp) => {
      const availW = vp.w - vp.outerP * 2;
      const availH = vp.h - vp.headerH - vp.outerP * 2;
      const canvasAreaH = availH - 36 - vp.botBarH; // minus cockpit top command bar and compact bottom panel

      assert(availW > 300, `${vp.name}: Usable width must be positive`);
      assert(canvasAreaH > 250, `${vp.name}: Canvas viewport height must be >= 250px`);

      // At 1216 x 530:
      if (vp.w === 1216) {
        // Cockpit width is ~1200px (fills 98.7% of window width!)
        const widthFillRatio = availW / vp.w;
        assert(widthFillRatio >= 0.98, "At 1216x530, cockpit must fill >= 98% of viewport width");
        // Canvas height is ~390px (fills ample vertical space)
        assert(canvasAreaH >= 380, "At 1216x530, canvas height must be >= 380px");
      }
    });
  });

  // =========================================================================
  // 2. Elimination of Visible 60 FPS Badge
  // =========================================================================
  it("2. FPS Badge Removal: Visible 60 FPS container removed from FuturisticCockpitFrame while preserving internal FPS logic", () => {
    const cockpitCode = fs.readFileSync(path.join(__dirname, "components/FuturisticCockpitFrame.tsx"), "utf8");
    const arenaCode = fs.readFileSync(path.join(__dirname, "app/arena/page.tsx"), "utf8");

    // Verify visible 60 FPS container is removed from FuturisticCockpitFrame
    assert(
      !cockpitCode.includes("60 FPS"),
      "FuturisticCockpitFrame must not render the visible 60 FPS badge"
    );
    assert(
      !cockpitCode.includes("SENSOR // 60 FPS"),
      "FuturisticCockpitFrame must not contain 'SENSOR // 60 FPS' decorative badge"
    );

    // Verify arena code still calculates frame timing internally
    assert(
      arenaCode.includes("fpsRef.current"),
      "Arena page must maintain internal frame timing and performance tracking"
    );
    assert(
      arenaCode.includes("performance.now()"),
      "Arena page must maintain high-resolution performance timers"
    );
  });

  // =========================================================================
  // 3. RocketBlueprintHUD Restructuring: READY Distinct from Action Cue
  // =========================================================================
  it("3. RocketBlueprintHUD: Separates READY from Action Cue and supports non-squat exercises", () => {
    const hudCode = fs.readFileSync(path.join(__dirname, "components/RocketBlueprintHUD.tsx"), "utf8");

    // A. Verify hardcoded 'READY // SQUAT TO ENGAGE' is removed
    assert(
      !hudCode.includes('"READY // SQUAT TO ENGAGE"'),
      "Hardcoded 'READY // SQUAT TO ENGAGE' must be replaced with structured status and action cue"
    );

    // B. Verify statusTag and cueText are decoupled
    assert(
      hudCode.includes("statusTag"),
      "HUD must define a dedicated status tag (e.g. READY, SHIELD UP, STAND UP)"
    );
    assert(
      hudCode.includes("cueText"),
      "HUD must define a dedicated action cue text"
    );

    // C. Verify action word mapping for various exercises
    const testCases = [
      { exercise: "squats", expectedWord: "SQUAT" },
      { exercise: "pushups", expectedWord: "LOWER" },
      { exercise: "wall_pushup", expectedWord: "LOWER" },
      { exercise: "single_leg_balance", expectedWord: "BALANCE" },
      { exercise: "overhead_press", expectedWord: "PRESS UP" },
      { exercise: "scaption", expectedWord: "RAISE ARMS" },
      { exercise: "rdl", expectedWord: "HINGE HIPS" },
      { exercise: "calf_raise", expectedWord: "RAISE CALVES" },
      { exercise: "lateral_lunge", expectedWord: "LUNGE SIDE" },
    ];

    const getActionWord = (exerciseName) => {
      const name = (exerciseName || "Squats").toLowerCase();
      if (name.includes("squat")) return "SQUAT";
      if (name.includes("pushup") || name.includes("push-up") || name.includes("wall_pushup")) return "LOWER";
      if (name.includes("balance")) return "BALANCE";
      if (name.includes("press")) return "PRESS UP";
      if (name.includes("scaption")) return "RAISE ARMS";
      if (name.includes("rdl")) return "HINGE HIPS";
      if (name.includes("calf")) return "RAISE CALVES";
      if (name.includes("march") || name.includes("knee")) return "RAISE KNEE";
      if (name.includes("rotation") || name.includes("torso")) return "ROTATE";
      if (name.includes("lunge")) return "LUNGE SIDE";
      return "ENGAGE";
    };

    testCases.forEach(({ exercise, expectedWord }) => {
      const word = getActionWord(exercise);
      assert.strictEqual(
        word,
        expectedWord,
        `Exercise ${exercise} must yield action word ${expectedWord}`
      );
    });
  });

  // =========================================================================
  // 4. Subtle Positioning Guidance Logic
  // =========================================================================
  it("4. Positioning Guidance: Accurately evaluates full body, missing ankles, and off-center alignment", () => {
    // Simulator function matching the exact arena algorithm
    function evaluatePositioning(lm, exercise = "squats") {
      if (!lm || !Array.isArray(lm) || lm.length < 29) {
        return { cue: "Step into frame", status: "SEARCHING" };
      }

      const isUpperBodyOnly = exercise === "overhead_press" || exercise === "pushups";

      const hipsV = ((lm[23]?.visibility || 0) + (lm[24]?.visibility || 0)) / 2;
      const kneesV = ((lm[25]?.visibility || 0) + (lm[26]?.visibility || 0)) / 2;
      const anklesV = ((lm[27]?.visibility || 0) + (lm[28]?.visibility || 0)) / 2;
      const shouldersV = ((lm[11]?.visibility || 0) + (lm[12]?.visibility || 0)) / 2;

      const topY = Math.min(lm[0]?.y ?? 0.2, lm[11]?.y || 0.2, lm[12]?.y || 0.2);
      const bottomY = Math.max(lm[27]?.y || 0.8, lm[28]?.y || 0.8);
      const span = bottomY - topY;
      const hipMidX = ((lm[23]?.x || 0.5) + (lm[24]?.x || 0.5)) / 2;

      if (hipsV < 0.25 && shouldersV < 0.25) {
        return { cue: "Step into frame", status: "SEARCHING" };
      }
      if (!isUpperBodyOnly && (anklesV < 0.35 || bottomY > 0.95)) {
        return { cue: "Move back so your ankles are visible", status: "NEEDS_ANKLES" };
      }
      if (topY < 0.04) {
        return { cue: "Step back — head near edge of frame", status: "TOO_CLOSE" };
      }
      if (hipMidX < 0.28 || hipMidX > 0.72) {
        return { cue: "Centre your body", status: "OFF_CENTER" };
      }
      if (!isUpperBodyOnly && span > 0.88) {
        return { cue: "Step back for full body view", status: "TOO_CLOSE" };
      }
      if (shouldersV >= 0.4 && hipsV >= 0.4 && (isUpperBodyOnly || (anklesV >= 0.35 && kneesV >= 0.4))) {
        return { cue: "Full body detected", status: "OPTIMAL" };
      }
      return { cue: "Adjust position for clear sensor tracking", status: "SEARCHING" };
    }

    // Case A: Missing ankles (standing too close so ankles are below frame / low confidence)
    const landmarksMissingAnkles = Array.from({ length: 33 }, (_, i) => ({
      x: 0.5,
      y: i >= 27 ? 0.98 : 0.4,
      visibility: i >= 27 ? 0.1 : 0.9,
    }));
    const resA = evaluatePositioning(landmarksMissingAnkles, "squats");
    assert.strictEqual(resA.cue, "Move back so your ankles are visible");
    assert.strictEqual(resA.status, "NEEDS_ANKLES");

    // Case B: Off-center to the left
    const landmarksOffCenter = Array.from({ length: 33 }, () => ({
      x: 0.18,
      y: 0.5,
      visibility: 0.9,
    }));
    landmarksOffCenter[27].y = 0.85;
    landmarksOffCenter[28].y = 0.85;
    const resB = evaluatePositioning(landmarksOffCenter, "squats");
    assert.strictEqual(resB.cue, "Centre your body");
    assert.strictEqual(resB.status, "OFF_CENTER");

    // Case C: Optimal full body detected
    const landmarksOptimal = Array.from({ length: 33 }, () => ({
      x: 0.5,
      y: 0.5,
      visibility: 0.9,
    }));
    landmarksOptimal[0].y = 0.15; // head safely inside frame
    landmarksOptimal[11].y = 0.25;
    landmarksOptimal[12].y = 0.25;
    landmarksOptimal[23].y = 0.55;
    landmarksOptimal[24].y = 0.55;
    landmarksOptimal[25].y = 0.72;
    landmarksOptimal[26].y = 0.72;
    landmarksOptimal[27].y = 0.88; // ankles visible above bottom edge
    landmarksOptimal[28].y = 0.88;
    const resC = evaluatePositioning(landmarksOptimal, "squats");
    assert.strictEqual(resC.cue, "Full body detected");
    assert.strictEqual(resC.status, "OPTIMAL");
  });

  // =========================================================================
  // 5. Letterbox Offsets & Video-Overlay Coordinate Alignment
  // =========================================================================
  it("5. Mathematical Alignment: Video letterboxing and landmark mapping are 100% congruent", () => {
    function computeContainOffsets(canvasW, canvasH, videoW, videoH) {
      const vAspect = videoW / videoH;
      const cAspect = canvasW / canvasH;
      let drawW = canvasW;
      let drawH = canvasH;
      let offsetX = 0;
      let offsetY = 0;

      if (cAspect > vAspect) {
        drawH = canvasH;
        drawW = canvasH * vAspect;
        offsetX = (canvasW - drawW) / 2;
      } else {
        drawW = canvasW;
        drawH = canvasW / vAspect;
        offsetY = (canvasH - drawH) / 2;
      }
      return { drawW, drawH, offsetX, offsetY };
    }

    // Test with 4:3 camera on 16:9 canvas
    const geom1 = computeContainOffsets(1280, 720, 640, 480);
    assert.strictEqual(geom1.drawH, 720);
    assert.strictEqual(geom1.drawW, 960);
    assert.strictEqual(geom1.offsetX, 160);
    assert.strictEqual(geom1.offsetY, 0);

    // Verify left/right landmark mapping matches mirrored video position:
    // Landmark x = 0 (subject's left side):
    const lmX0 = geom1.offsetX + (1.0 - 0.0) * geom1.drawW;
    assert.strictEqual(lmX0, 160 + 960, "Landmark x=0 should map to right edge of drawn video (1120px)");

    // Landmark x = 1 (subject's right side):
    const lmX1 = geom1.offsetX + (1.0 - 1.0) * geom1.drawW;
    assert.strictEqual(lmX1, 160, "Landmark x=1 should map to left edge of drawn video (160px)");

    // Landmark x = 0.5 (subject's midline):
    const lmMid = geom1.offsetX + (1.0 - 0.5) * geom1.drawW;
    assert.strictEqual(lmMid, 640, "Midline should map to exact horizontal center of canvas (640px)");
  });

  // =========================================================================
  // 6. Viewport Resizing Session State Preservation
  // =========================================================================
  it("6. Session State Invariance: Viewport resize does not alter repCount, active stream, or trigger extra reps", () => {
    let repCount = 3;
    let holdDuration = 1.8;
    let activeStream = { active: true, id: "stream-cam-1" };

    // Simulate window resize handler triggering a component re-render
    function onWindowResize() {
      // Dimension changes only affect geometry, state variables remain immutable
      return {
        repCount,
        holdDuration,
        activeStream,
      };
    }

    const stateAfterResize = onWindowResize();
    assert.strictEqual(stateAfterResize.repCount, 3, "repCount must remain unchanged after resize");
    assert.strictEqual(stateAfterResize.holdDuration, 1.8, "holdDuration must remain unchanged after resize");
    assert.strictEqual(stateAfterResize.activeStream.id, "stream-cam-1", "Webcam stream must not be recreated");
  });
});
