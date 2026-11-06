// Synthetic end-to-end test of TrackManager + GestureEngine (no camera, no MediaPipe).
// Builds fake hands with real metric geometry, projects them at different distances
// and checks the right gesture (and nothing else) fires.
import assert from 'node:assert/strict';
import { buildDetection } from '../../src/gesture/gestureLab/gestures/features.js';
import { TrackManager } from '../../src/gesture/gestureLab/vision/tracker.js';
import { GestureEngine } from '../../src/gesture/gestureLab/gestures/engine.js';
import { CONFIG } from '../../src/gesture/gestureLab/gestures/config.js';

const AR = 16 / 9;
const FPS = 60;
const DT = 1000 / FPS;

// ---- synthetic hand (meters, y down) -----------------------------------------
const OPEN = [
  [0, 0.06], [-0.03, 0.04], [-0.05, 0.02], [-0.065, 0], [-0.08, -0.02],
  [-0.03, -0.01], [-0.03, -0.05], [-0.03, -0.075], [-0.03, -0.095],
  [0, -0.015], [0, -0.055], [0, -0.08], [0, -0.105],
  [0.03, -0.01], [0.03, -0.05], [0.03, -0.075], [0.03, -0.095],
  [0.05, 0], [0.05, -0.03], [0.05, -0.05], [0.05, -0.065],
];
const FINGERS = { index: [5, 6, 7, 8], middle: [9, 10, 11, 12], ring: [13, 14, 15, 16], pinky: [17, 18, 19, 20] };

function worldPose(pose) {
  const w = OPEN.map(([x, y]) => ({ x, y, z: 0 }));
  const curl = (name) => {
    const [m, p, d, t] = FINGERS[name];
    const x = w[m].x;
    const my = w[m].y;
    w[p] = { x, y: my - 0.02, z: 0 };
    w[d] = { x, y: my, z: 0 };
    w[t] = { x, y: my + 0.02, z: 0 };
  };
  const which = {
    open: [],
    edge: [], // hand rotated 90 degrees about the vertical axis: only the edge/fingers face the camera
    tilt: [], // hand tilted ~80 degrees toward the camera: fingers point at the lens
    point: ['middle', 'ring', 'pinky'],
    pinch: ['index', 'ring', 'pinky'],
    snapped: ['index', 'ring', 'pinky'],
  }[pose];
  which.forEach(curl);
  if (pose === 'edge') w.forEach((p) => ((p.z = p.x), (p.x = 0)));
  if (pose === 'tilt') {
    const c = Math.cos((80 * Math.PI) / 180);
    const s = Math.sin((80 * Math.PI) / 180);
    w.forEach((p) => ((p.z = p.y * s), (p.y = p.y * c)));
  }
  if (pose === 'pinch') {
    w[11] = { x: -0.005, y: -0.05, z: 0 };
    w[12] = { x: -0.01, y: -0.05, z: 0 };
    w[10] = { x: 0, y: -0.04, z: 0 };
    w[4] = { x: -0.01, y: -0.05, z: 0 };
  }
  if (pose === 'snapped') {
    w[12] = { x: 0, y: 0.02, z: 0 };
    w[11] = { x: 0, y: 0.0, z: 0 };
    w[10] = { x: 0, y: -0.02, z: 0 };
  }
  return w;
}

/** hand centre (cx, cy) in normalized image coords, ppm = frame heights per meter */
function det(pose, cx, cy, ppm) {
  const world = worldPose(pose);
  const lm = world.map((p) => ({ x: cx + (p.x * ppm) / AR, y: cy + p.y * ppm, z: 0 }));
  return buildDetection(lm, world, AR, CONFIG.pose.extended);
}

// ---- harness ------------------------------------------------------------------
function run(durationMs, hands, opts = {}) {
  const events = [];
  const tm = new TrackManager(CONFIG.tracker);
  const eng = new GestureEngine((e) => events.push(e), opts.cfg);
  const ids = new Set();
  for (let t = 0; t <= durationMs; t += DT) {
    const specs = hands(t) || [];
    const dets = specs.map((s) => det(s.pose || 'open', s.cx, s.cy, s.ppm));
    const out = tm.update(dets, 1000 + t);
    out.forEach((h) => ids.add(h.id));
    eng.update(out, 1000 + t);
  }
  return { events, names: events.map((e) => e.name), ids };
}

const ease = (u) => u * u * (3 - 2 * u);
// meters moved by user-space delta -> raw image x delta (mirror: user right = raw x decreasing)
const toRawX = (mUser, ppm) => (-mUser * ppm) / AR;

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok  ', name);
  } catch (e) {
    console.error('  FAIL', name, '\n      ', e.message);
    process.exitCode = 1;
  }
}

// ---- tests --------------------------------------------------------------------
for (const [label, ppm] of [['near (1 m)', 1.5], ['far (3 m)', 0.5]]) {
  test(`swipe right, ${label}`, () => {
    const r = run(1200, (t) => {
      const u = Math.min(Math.max((t - 300) / 260, 0), 1);
      return [{ cx: 0.7 + toRawX(0.32 * ease(u), ppm), cy: 0.5, ppm }];
    });
    assert.deepEqual(r.names, ['swipe-right']);
  });

  test(`swipe left then hand returns, ${label}: only one event`, () => {
    const r = run(2000, (t) => {
      const u = Math.min(Math.max((t - 300) / 240, 0), 1);
      const back = Math.min(Math.max((t - 800) / 500, 0), 1);
      const m = -0.32 * ease(u) + 0.32 * ease(back);
      return [{ cx: 0.5 + toRawX(m, ppm), cy: 0.5, ppm }];
    });
    assert.deepEqual(r.names, ['swipe-left']);
  });
}

for (const pose of ['edge', 'tilt', 'point']) {
  for (const dir of [1, -1]) {
    test(`swipe ${dir > 0 ? 'right' : 'left'} with rotated hand (${pose}), far`, () => {
      const ppm = 0.6;
      const r = run(1400, (t) => {
        const u = Math.min(Math.max((t - 300) / 220, 0), 1); // ~1.6 m/s
        return [{ pose, cx: 0.5 + toRawX(dir * 0.34 * ease(u), ppm), cy: 0.5, ppm }];
      });
      assert.deepEqual(r.names, [dir > 0 ? 'swipe-right' : 'swipe-left']);
    });
  }
}

for (const [label, ppm] of [['near', 1.5], ['far', 0.5]]) {
  for (const pose of ['open', 'edge']) {
    test(`swipe up, ${label}, ${pose} hand`, () => {
      const r = run(1600, (t) => {
        const u = Math.min(Math.max((t - 300) / 240, 0), 1);
        const down = Math.min(Math.max((t - 900) / 600, 0), 1); // slow hand drop afterwards
        return [{ pose, cx: 0.5, cy: 0.7 - 0.3 * ppm * ease(u) + 0.3 * ppm * ease(down), ppm }];
      });
      assert.deepEqual(r.names, ['swipe-up']);
    });
  }
}

test('slowly raising the hand is not a swipe up', () => {
  const r = run(2000, (t) => [{ cx: 0.5, cy: 0.8 - 0.35 * Math.min(Math.max((t - 200) / 1200, 0), 1), ppm: 1.2 }]);
  assert.deepEqual(r.names, []);
});

test('swipe up, then swipe left, are independent events', () => {
  const ppm = 1.2;
  const r = run(2600, (t) => {
    const u = Math.min(Math.max((t - 300) / 240, 0), 1);
    const down = Math.min(Math.max((t - 800) / 500, 0), 1);
    const l = Math.min(Math.max((t - 1700) / 240, 0), 1);
    return [{ cx: 0.5 + toRawX(-0.32 * ease(l), ppm), cy: 0.7 - 0.3 * ppm * ease(u) + 0.3 * ppm * ease(down), ppm }];
  });
  assert.deepEqual(r.names, ['swipe-up', 'swipe-left']);
});

test('deliberate fast swipe left then fast swipe right = two events', () => {
  const ppm = 1.2;
  const r = run(2400, (t) => {
    const u = Math.min(Math.max((t - 300) / 240, 0), 1);
    const back = Math.min(Math.max((t - 1100) / 220, 0), 1);
    return [{ cx: 0.5 + toRawX(-0.32 * ease(u) + 0.32 * ease(back), ppm), cy: 0.5, ppm }];
  });
  assert.deepEqual(r.names, ['swipe-left', 'swipe-right']);
});

test('swipe survives hand lost mid-stroke (motion blur), same track id', () => {
  const ppm = 1.2;
  const r = run(1400, (t) => {
    const u = Math.min(Math.max((t - 300) / 300, 0), 1);
    if (t > 420 && t < 520) return null; // 100 ms dropout in the middle of the stroke
    return [{ cx: 0.7 + toRawX(0.34 * ease(u), ppm), cy: 0.5, ppm }];
  });
  assert.deepEqual(r.names, ['swipe-right']);
  assert.equal(r.ids.size, 1);
});

test('swipe fires even if the hand never comes back after the stroke', () => {
  const ppm = 1.2;
  const r = run(1400, (t) => {
    if (t > 520) return null;
    const u = Math.min(Math.max((t - 300) / 300, 0), 1);
    return [{ cx: 0.7 + toRawX(0.34 * ease(u), ppm), cy: 0.5, ppm }];
  });
  assert.deepEqual(r.names, ['swipe-right']);
});

test('slow drift / stationary jitter produce nothing', () => {
  const r = run(4000, (t) => [{ cx: 0.5 + 0.004 * Math.sin(t / 70) + t * 0.00004, cy: 0.5 + 0.004 * Math.cos(t / 90), ppm: 1.2 }]);
  assert.deepEqual(r.names, []);
});

test('mostly-vertical motion is not a swipe', () => {
  const r = run(1200, (t) => {
    const u = Math.min(Math.max((t - 300) / 260, 0), 1);
    return [{ cx: 0.5 + toRawX(0.1 * ease(u), 1.2), cy: 0.5 + 0.3 * ease(u), ppm: 1.2 }];
  });
  assert.deepEqual(r.names, []);
});

test('snap: pinch then middle finger lands on palm', () => {
  const r = run(1400, (t) => [{ pose: t < 500 ? 'open' : t < 760 ? 'pinch' : 'snapped', cx: 0.5, cy: 0.5, ppm: 1.2 }]);
  assert.deepEqual(r.names, ['snap']);
});

test('snap works small and far', () => {
  const r = run(1400, (t) => [{ pose: t < 500 ? 'open' : t < 760 ? 'pinch' : 'snapped', cx: 0.5, cy: 0.5, ppm: 0.45 }]);
  assert.deepEqual(r.names, ['snap']);
});

test('opening and closing a hand does not snap', () => {
  const r = run(2000, (t) => [{ pose: Math.floor(t / 400) % 2 ? 'open' : 'point', cx: 0.5, cy: 0.5, ppm: 1.2 }]);
  assert.ok(!r.names.includes('snap'), r.names.join());
});

for (const [label, ppm] of [['near', 1.4], ['far', 0.5]]) {
  test(`opposite vertical, ${label}`, () => {
    const r = run(1400, (t) => {
      const u = Math.min(Math.max((t - 300) / 350, 0), 1);
      const m = 0.17 * ease(u);
      return [
        { cx: 0.35, cy: 0.5 - m * ppm, ppm },
        { cx: 0.65, cy: 0.5 + m * ppm, ppm },
      ];
    });
    assert.deepEqual(r.names, ['vertical-opposite']);
  });

  test(`hands apart, ${label} (with vertical leeway)`, () => {
    const r = run(1400, (t) => {
      const u = Math.min(Math.max((t - 300) / 350, 0), 1);
      const m = 0.16 * ease(u);
      // mirrored: the user's left hand has the larger raw x
      return [
        { cx: 0.6 + toRawX(-m, ppm), cy: 0.5 + 0.03 * ease(u), ppm }, // user-left hand moves left
        { cx: 0.4 + toRawX(m, ppm), cy: 0.5, ppm }, // user-right hand moves right
      ];
    });
    assert.deepEqual(r.names, ['hands-apart']);
  });
}

test('hands together', () => {
  const ppm = 1.2;
  const r = run(1400, (t) => {
    const u = Math.min(Math.max((t - 300) / 350, 0), 1);
    const m = 0.16 * ease(u);
    // raw image: left-of-screen (mirrored => user right) hand sits at small raw x
    return [
      { cx: 0.75 + toRawX(m, ppm), cy: 0.5, ppm },
      { cx: 0.25 + toRawX(-m, ppm), cy: 0.5, ppm },
    ];
  });
  assert.deepEqual(r.names, ['hands-together']);
});

test('push: both hands grow toward camera', () => {
  const r = run(1400, (t) => {
    const u = Math.min(Math.max((t - 300) / 350, 0), 1);
    const ppm = 1.0 * (1 + 0.45 * ease(u));
    return [
      { cx: 0.35, cy: 0.5, ppm },
      { cx: 0.65, cy: 0.5, ppm },
    ];
  });
  assert.deepEqual(r.names, ['push']);
});

test('finger sweep right (pointing) is a finger gesture, not a swipe', () => {
  const ppm = 1.2;
  const r = run(1500, (t) => {
    const u = Math.min(Math.max((t - 300) / 500, 0), 1);
    return [{ pose: 'point', cx: 0.6 + toRawX(0.2 * ease(u), ppm), cy: 0.5, ppm }];
  });
  assert.deepEqual(r.names, ['finger-right']);
});

test('finger swirl clockwise => Finger Right, counter-clockwise => Finger Left', () => {
  const ppm = 1.2;
  const circle = (sign) =>
    run(2200, (t) => {
      const th = sign * Math.max(t - 300, 0) * 0.0045 + 0.3;
      const R = 0.04;
      return [{ pose: 'point', cx: 0.5 + toRawX(R * Math.cos(th), ppm), cy: 0.5 + R * Math.sin(th) * ppm, ppm }];
    });
  assert.equal(circle(+1).names[0], 'finger-right');
  assert.equal(circle(-1).names[0], 'finger-left');
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);
