// All thresholds live here. Distances are in METERS at the hand's own depth
// (derived from hand size, so they hold whether the user stands 0.5 m or 3 m away),
// speeds in m/s, times in ms.

export const CONFIG = {
  // Camera image is shown mirrored (selfie view). Directions are reported from the
  // USER's point of view: "Swipe Right" = the user's right hand side.
  mirror: true,

  camera: { width: 960, height: 540, fps: 30, portrait: false },

  // Low confidences keep hands alive during fast motion / odd angles. The tracker
  // below filters out the false positives this lets in.
  model: { minDetect: 0.22, minPresence: 0.22, minTrack: 0.24, delegate: 'GPU' },

  tracker: {
    maxHands: 2,
    coastMs: 560, // survive a brief blurred or edge-on hand (not displayed as real)
    matchGate: 0.28, // initial re-association gate; tracker widens it during a dropout
    ppmAlpha: 0.45, // smoothing of the hand-scale estimate
  },

  // Zoomed second-chance detection around hands that just vanished (and tile scan when idle).
  rescue: { enabled: true, idleScan: true },

  pose: { extended: 1.45 }, // tip-to-wrist / mcp-to-wrist ratio to call a finger extended

  swipe: {
    minDist: 0.2,
    minSpeed: 0.8,
    dominance: 1.6, // |dx| must beat |dy| by this factor
    windows: [180, 260, 380, 520],
    minDtMs: 70,
    // Swipe up is a bit stricter: lifting a hand into position is also an upward move.
    up: { minDist: 0.22, minSpeed: 1.0 },
    pointingMinSpeed: 1.3, // while the pose reads as "pointing", only clearly fast strokes count as swipes
    cooldown: 380,
    returnSuppress: 1200, // right after a swipe, the opposite direction must be faster than the recovery stroke
  },

  two: {
    windows: [260, 400, 600],
    minSpeed: 0.3, // each hand
    cooldown: 700, // same gesture
    returnSuppress: 900, // apart <-> together
    lockAll: 450, // any other two-hand gesture
    lockSingle: 650, // single-hand swipes/snaps after a two-hand gesture
    vertical: { minEach: 0.1, minSum: 0.26, lean: 0.8 },
    horizontal: { minEach: 0.08, minSum: 0.22, lean: 0.8 },
    push: { growth: 1.22, maxLateral: 0.14 }, // both hands' apparent size grows by 22%+
  },

  snap: {
    pinchTm: 0.45, // thumb-tip to middle-tip / hand length => pinched
    releaseTm: 0.6, // ...and open again
    palmMp: 0.8, // middle tip to palm / hand length => finger landed on palm
    palmDrop: 0.15, // how much closer to the palm than during the pinch
    minPinchFrames: 2,
    maxGap: 280,
    maxSpeed: 0.8,
    cooldown: 600,
  },

  finger: {
    sweepWindows: [250, 400],
    sweepDist: 0.085,
    sweepSpeed: 0.20,
    maxSpeed: 1.05, // m/s; whole-hand strokes are faster
    dominance: 2,
    straight: 0.75,
    swirlWindow: 1100,
    swirlAngle: 1.5 * Math.PI,
    minRadius: 0.015,
    maxRadius: 0.16,
    cooldown: 800,
  },

  audio: { enabled: false },
};

export function mergeConfig(base, over) {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return over === undefined ? base : over;
  const out = { ...base };
  for (const k of Object.keys(over || {})) out[k] = k in base ? mergeConfig(base[k], over[k]) : over[k];
  return out;
}
