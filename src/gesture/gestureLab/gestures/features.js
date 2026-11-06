// Per-hand geometry. The key idea for distance and tilt robustness:
// MediaPipe returns two coordinate sets per hand:
//   landmarks      normalized image coordinates (shrink when the user is far away)
//   worldLandmarks metric 3D coordinates, hand-centred (do NOT depend on distance, little on tilt)
// Shape questions (finger extended? pinched?) use world landmarks.
// Motion is measured in image space and converted to meters with a per-hand
// "pixels per meter" scale, so a swipe of 30 cm reads the same at any distance.

const HAND_LEN_M = 0.095; // wrist -> middle MCP, used to size hands in image space

const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// Vertical bones (wrist -> knuckles) and horizontal ones (across the knuckles). When the
// hand is rotated edge-on or tilted towards the camera, one family collapses in the
// image but the other keeps its length.
const SCALE_PAIRS = [
  [0, 5],
  [0, 9],
  [0, 13],
  [0, 17],
  [5, 17],
  [5, 9],
  [9, 13],
  [13, 17],
];

/** Image-space length per meter (units: frame heights per meter). Foreshortening from
 *  hand rotation/tilt only ever SHORTENS image lengths, so a high ratio is the least
 *  affected one. The 2nd largest is used rather than the largest so one noisy bone
 *  cannot inflate the scale. */
export function pixelsPerMeter(lm, wl, ar) {
  const ratios = [];
  for (const [i, j] of SCALE_PAIRS) {
    const img = Math.hypot((lm[i].x - lm[j].x) * ar, lm[i].y - lm[j].y);
    const w = d3(wl[i], wl[j]);
    if (w > 0.02) ratios.push(img / w);
  }
  ratios.sort((a, b) => b - a);
  return ratios.length > 1 ? ratios[1] : ratios[0] || 0;
}

export function palmCenter(lm, ar) {
  let x = 0;
  let y = 0;
  for (const i of [0, 5, 9, 13, 17]) {
    x += lm[i].x;
    y += lm[i].y;
  }
  return { x: (x / 5) * ar, y: y / 5 };
}

function worldPalm(wl) {
  const p = { x: 0, y: 0, z: 0 };
  for (const i of [0, 5, 9, 13, 17]) {
    p.x += wl[i].x / 5;
    p.y += wl[i].y / 5;
    p.z += wl[i].z / 5;
  }
  return p;
}

export function analyzePose(wl, extendedRatio = 1.5) {
  const L = d3(wl[0], wl[9]) || 1e-6;
  const ratio = (tip, mcp) => d3(wl[0], wl[tip]) / (d3(wl[0], wl[mcp]) || 1e-6);
  const index = ratio(8, 5) > extendedRatio;
  const middle = ratio(12, 9) > extendedRatio;
  const ring = ratio(16, 13) > extendedRatio;
  const pinky = ratio(20, 17) > extendedRatio;
  const pc = worldPalm(wl);
  return {
    index,
    middle,
    ring,
    pinky,
    // Permit one ambiguous non-index finger when the hand is slanted, but
    // reject open palms, which remain reserved for page turning.
    pointing: index && Number(middle) + Number(ring) + Number(pinky) <= 1,
    tm: d3(wl[4], wl[12]) / L, // thumb tip <-> middle tip (snap)
    mp: d3(wl[12], pc) / L, // middle tip <-> palm centre (snap)
  };
}

/** Everything the tracker/engine need, computed once per detected hand. */
export function buildDetection(landmarks, world, ar, extendedRatio) {
  const ppm = pixelsPerMeter(landmarks, world, ar);
  return {
    landmarks,
    world,
    ar,
    ppm,
    hs: ppm * HAND_LEN_M, // hand size in frame heights
    c: palmCenter(landmarks, ar),
    tip: { x: landmarks[8].x * ar, y: landmarks[8].y },
    pose: analyzePose(world, extendedRatio),
  };
}
