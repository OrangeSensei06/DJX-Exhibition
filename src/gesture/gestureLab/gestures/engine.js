import { CONFIG, mergeConfig } from './config.js';

export const LABELS = {
  'swipe-right': 'Swipe Right',
  'swipe-left': 'Swipe Left',
  'swipe-up': 'Swipe Up',
  snap: 'Snap',
  'vertical-opposite': 'Opposite Vertical',
  'hands-apart': 'Hands Apart',
  'hands-together': 'Hands Together',
  push: 'Push',
  'finger-right': 'Finger Right',
  'finger-left': 'Finger Left',
};

const BUF_MS = 1300;
const OPPOSITE = { left: 'right', right: 'left' };
const REVERSE = { 'hands-apart': 'hands-together', 'hands-together': 'hands-apart' };
const sum = (a) => a.reduce((s, v) => s + v, 0);

/**
 * Pure gesture logic. Feed it the hands from TrackManager once per camera frame:
 *     engine.update(hands, performance.now())
 * It calls onGesture({ id, name, label, detail, t, at }) when something fires.
 *
 * All motion is in meters (see features.js) and all windows are time-based, so
 * results do not depend on frame rate, camera distance, or a hand being lost for a
 * few frames in the middle of a fast stroke.
 */
export class GestureEngine {
  constructor(onGesture, overrides) {
    this.cfg = mergeConfig(CONFIG, overrides || {});
    this.onGesture = onGesture || (() => {});
    this.hs = new Map();
    this.seq = 0;
    this.lock = { single: 0, two: 0 };
    this.lastTwo = { name: null, t: -1e9 };
    this.debug = [];
  }

  newState() {
    return {
      buf: [],
      tipBuf: [],
      snap: [],
      pointHist: [],
      pointing: false,
      speed: 0,
      since: -1e9,
      lastSwipeT: -1e9,
      lastSwipeDir: null,
      lastSwipeSpeed: 0,
      hold: null,
      retract: false,
      lastSnap: -1e9,
      fingerLock: -1e9,
      seen: 0,
    };
  }

  update(hands, now) {
    const sgn = this.cfg.mirror ? -1 : 1; // user-space x
    const items = [];

    for (const h of hands) {
      let st = this.hs.get(h.id);
      if (!st) this.hs.set(h.id, (st = this.newState()));
      st.seen = now;
      st.buf.push({ t: now, x: sgn * h.c.x, y: h.c.y, ppm: h.ppm, lppm: Math.log(h.ppm), virtual: h.coasting });
      trim(st.buf, now, BUF_MS);

      if (!h.coasting) {
        st.pointHist.push(h.pose.pointing ? 1 : 0);
        if (st.pointHist.length > 6) st.pointHist.shift();
        st.pointing = st.pointHist.length >= 4 && sum(st.pointHist) / st.pointHist.length >= 0.66;
        if (st.pointing) st.tipBuf.push({ t: now, tx: sgn * h.tip.x, ty: h.tip.y, ppm: h.ppm });
        else st.tipBuf.length = 0;
        trim(st.tipBuf, now, BUF_MS);
        st.snap.push({ t: now, tm: h.pose.tm, mp: h.pose.mp });
        trim(st.snap, now, 700);
      }
      const w = this.win(st.buf, now, 200, {});
      st.speed = w ? w.speed : 0;
      if (st.speed < 0.3) {
        st.hold = null;
        st.retract = false;
      }
      items.push({ h, st });
    }

    for (const [id, st] of this.hs) if (now - st.seen > 1500) this.hs.delete(id);

    this.checkTwoHand(items, now);

    const bothFast = items.length >= 2 && items.every((i) => i.st.speed > 0.5);
    for (const { h, st } of items) {
      this.checkSnap(h, st, now);
      this.checkFinger(h, st, now);
      if (!bothFast) this.checkSwipe(h, st, now);
    }

    this.debug = items.map(({ h, st }) => ({
      id: h.id,
      coasting: h.coasting,
      speed: st.speed,
      pointing: st.pointing,
      tm: h.pose.tm,
      mp: h.pose.mp,
      ppm: h.ppm,
    }));
  }

  /** Called by the optional microphone detector. */
  audioOnset(now) {
    for (const [, st] of this.hs) {
      if (now - st.lastSnap < this.cfg.snap.cooldown) continue;
      const ready = st.snap.some((s) => now - s.t < 500 && s.tm < this.cfg.snap.pinchTm + 0.1);
      if (ready) {
        st.lastSnap = now;
        st.snap.length = 0;
        this.emit('snap', 'audio + hand pose', now);
        return;
      }
    }
  }

  // ------------------------------------------------------------------ helpers

  /** Motion over the last `ms` of a buffer, in meters. */
  win(buf, now, ms, { since = -1e9, virtual = false }) {
    const t0 = Math.max(now - ms, since);
    let a = null;
    let b = null;
    let n = 0;
    for (const s of buf) {
      if (s.t < t0 || s.t <= since) continue;
      if (s.virtual && !virtual) continue;
      if (!a) a = s;
      b = s;
      if (!s.virtual) n++;
    }
    if (!a || a === b) return null;
    const dt = b.t - a.t;
    if (dt <= 0) return null;
    const ppm = (a.ppm + b.ppm) / 2;
    const dx = (b.x - a.x) / ppm;
    const dy = (b.y - a.y) / ppm;
    return { a, b, dt, dx, dy, n, ppm, speed: (Math.hypot(dx, dy) / dt) * 1000 };
  }

  emit(name, detail, now) {
    this.onGesture({ id: ++this.seq, name, label: LABELS[name], detail, t: now, at: Date.now() });
  }

  // -------------------------------------------------------------------- swipe

  checkSwipe(h, st, now) {
    const sw = this.cfg.swipe;
    if (now < this.lock.single) return;
    if (now - st.lastSwipeT < sw.cooldown) return;
    for (const ms of sw.windows) {
      // `virtual: true` lets the motion extrapolated while the hand is momentarily
      // lost count, so a swipe that blurs out the tracker mid-stroke still fires.
      const w = this.win(st.buf, now, ms, { since: st.since, virtual: true });
      if (!w || w.n < 2 || w.dt < sw.minDtMs) continue;
      const ax = Math.abs(w.dx);
      const ay = Math.abs(w.dy);
      let dir = null;
      let dist = 0;
      let speed = 0;
      if (ax >= sw.minDist && ax >= sw.dominance * ay && (ax / w.dt) * 1000 >= sw.minSpeed) {
        dir = w.dx > 0 ? 'right' : 'left';
        dist = ax;
        speed = (ax / w.dt) * 1000;
      } else if (w.dy < 0 && ay >= sw.up.minDist && ay >= sw.dominance * ax && (ay / w.dt) * 1000 >= sw.up.minSpeed) {
        dir = 'up';
        dist = ay;
        speed = (ay / w.dt) * 1000;
      }
      if (!dir) continue;
      // A finger-pointing pose normally means a finger gesture, but when the hand is
      // rotated edge-on the pose is often misread, so a clearly fast stroke still counts.
      if (st.pointing && speed < sw.pointingMinSpeed) continue;
      if (st.hold === dir) return; // same stroke still in progress
      if (OPPOSITE[dir] && st.lastSwipeDir === OPPOSITE[dir]) {
        // Right after a swipe the hand comes back the other way. That recovery is
        // normally slower than the stroke, so it must be clearly faster than that to count.
        const recent = now - st.lastSwipeT < sw.returnSuppress;
        if (st.retract || (recent && speed < Math.max(1.4 * sw.minSpeed, 0.85 * st.lastSwipeSpeed))) {
          st.retract = true; // stays suppressed until the hand pauses
          return;
        }
      }
      st.lastSwipeT = now;
      st.lastSwipeSpeed = speed;
      st.lastSwipeDir = dir;
      st.hold = dir;
      st.since = now;
      st.fingerLock = now + 600; // the tail of a swipe is not a finger sweep
      st.tipBuf.length = 0;
      this.emit(`swipe-${dir}`, `${dist.toFixed(2)} m @ ${speed.toFixed(1)} m/s`, now);
      return;
    }
  }

  // --------------------------------------------------------------------- snap

  checkSnap(h, st, now) {
    const sn = this.cfg.snap;
    if (h.coasting || now < this.lock.single) return;
    if (now - st.lastSnap < sn.cooldown || st.speed > sn.maxSpeed) return;
    const cur = st.snap[st.snap.length - 1];
    if (!cur || !(cur.tm > sn.releaseTm && cur.mp < sn.palmMp)) return;
    const pin = st.snap.filter((s) => now - s.t <= sn.maxGap && s.tm < sn.pinchTm);
    if (pin.length < sn.minPinchFrames) return;
    const peak = Math.max(...pin.map((s) => s.mp));
    if (peak - cur.mp < sn.palmDrop) return;
    st.lastSnap = now;
    st.snap.length = 0;
    this.emit('snap', 'pinch released onto palm', now);
  }

  // ------------------------------------------------------------ finger gestures

  checkFinger(h, st, now) {
    const f = this.cfg.finger;
    if (h.coasting || !st.pointing || now < st.fingerLock || st.tipBuf.length < 4) return;
    const recent = this.win(st.buf, now, 90, {});
    if (recent && recent.speed > f.maxSpeed) return; // far too fast for a finger gesture: it is a swipe
    const buf = st.tipBuf;
    const fire = (dir, detail) => {
      st.fingerLock = now + f.cooldown;
      st.tipBuf.length = 0;
      this.emit(`finger-${dir}`, detail, now);
    };

    // swirl: accumulated angle of the fingertip around its own path centre
    const seg = buf.filter((s) => s.t >= now - f.swirlWindow);
    if (seg.length >= 8) {
      const ppm = sum(seg.map((s) => s.ppm)) / seg.length;
      const pts = seg.map((s) => ({ x: s.tx / ppm, y: s.ty / ppm }));
      const cx = sum(pts.map((p) => p.x)) / pts.length;
      const cy = sum(pts.map((p) => p.y)) / pts.length;
      const rs = pts.map((p) => Math.hypot(p.x - cx, p.y - cy));
      const R = sum(rs) / rs.length;
      if (R >= f.minRadius && R <= f.maxRadius && Math.min(...rs) > 0.35 * R) {
        let total = 0;
        let pos = 0;
        let neg = 0;
        let prev = Math.atan2(pts[0].y - cy, pts[0].x - cx);
        for (let i = 1; i < pts.length; i++) {
          const a = Math.atan2(pts[i].y - cy, pts[i].x - cx);
          let d = a - prev;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d <= -Math.PI) d += 2 * Math.PI;
          total += d;
          if (d > 0) pos++;
          else if (d < 0) neg++;
          prev = a;
        }
        if (Math.abs(total) >= f.swirlAngle && Math.max(pos, neg) / Math.max(pos + neg, 1) >= 0.75) {
          // y points down on screen, so positive angle = clockwise as the user sees it
          return fire(total > 0 ? 'right' : 'left', `swirl ${total > 0 ? 'clockwise' : 'counter-clockwise'}`);
        }
      }
    }

    // sweep: fingertip travels in a mostly straight horizontal line
    for (const ms of f.sweepWindows) {
      const s = buf.filter((p) => p.t >= now - ms);
      if (s.length < 3) continue;
      const a = s[0];
      const b = s[s.length - 1];
      const dt = b.t - a.t;
      if (dt < 100) continue;
      const ppm = sum(s.map((p) => p.ppm)) / s.length;
      const dx = (b.tx - a.tx) / ppm;
      const dy = (b.ty - a.ty) / ppm;
      let path = 0;
      for (let i = 1; i < s.length; i++) path += Math.hypot(s[i].tx - s[i - 1].tx, s[i].ty - s[i - 1].ty) / ppm;
      const ax = Math.abs(dx);
      if (ax >= f.sweepDist && ax >= f.dominance * Math.abs(dy) && (ax / dt) * 1000 >= f.sweepSpeed && ax / path >= f.straight) {
        return fire(dx > 0 ? 'right' : 'left', `sweep ${ax.toFixed(2)} m`);
      }
    }
  }

  // ---------------------------------------------------------------- two hands

  checkTwoHand(items, now) {
    const tw = this.cfg.two;
    if (items.length < 2 || now < this.lock.two) return;
    const pair = items.slice(0, 2).sort((p, q) => lastX(p.st) - lastX(q.st)); // user's left, user's right
    const [A, B] = pair;
    const since = this.lastTwo.t;

    for (const ms of tw.windows) {
      const wa = this.win(A.st.buf, now, ms, { since });
      const wb = this.win(B.st.buf, now, ms, { since });
      if (!wa || !wb || wa.n < 2 || wb.n < 2) continue;
      if (now - wa.b.t > 250 || now - wb.b.t > 250) continue;
      const moving = wa.speed >= tw.minSpeed && wb.speed >= tw.minSpeed;

      let name = null;
      let detail = '';

      // push: both hands grow in the image (moving toward the camera)
      const gA = Math.exp(wa.b.lppm - wa.a.lppm);
      const gB = Math.exp(wb.b.lppm - wb.a.lppm);
      const p = tw.push;
      if (gA >= p.growth && gB >= p.growth && [wa, wb].every((w) => Math.abs(w.dx) < p.maxLateral && Math.abs(w.dy) < p.maxLateral)) {
        name = 'push';
        detail = `size x${Math.min(gA, gB).toFixed(2)}`;
      }

      // vertical, opposite directions
      const v = tw.vertical;
      if (!name && moving && wa.dy * wb.dy < 0 && Math.min(Math.abs(wa.dy), Math.abs(wb.dy)) >= v.minEach && Math.abs(wa.dy) + Math.abs(wb.dy) >= v.minSum && [wa, wb].every((w) => Math.abs(w.dy) >= v.lean * Math.abs(w.dx))) {
        name = 'vertical-opposite';
        detail = `left hand ${wa.dy < 0 ? 'up' : 'down'}, right hand ${wb.dy < 0 ? 'up' : 'down'}`;
      }

      // horizontal, opposite directions
      const hz = tw.horizontal;
      if (!name && moving && [wa, wb].every((w) => Math.abs(w.dx) >= hz.lean * Math.abs(w.dy)) && Math.abs(wa.dx) + Math.abs(wb.dx) >= hz.minSum && Math.min(Math.abs(wa.dx), Math.abs(wb.dx)) >= hz.minEach) {
        if (wa.dx < 0 && wb.dx > 0) name = 'hands-apart';
        else if (wa.dx > 0 && wb.dx < 0) name = 'hands-together';
        if (name) detail = `${(Math.abs(wa.dx) + Math.abs(wb.dx)).toFixed(2)} m`;
      }

      if (!name) continue;
      if (REVERSE[this.lastTwo.name] === name && now - this.lastTwo.t < tw.returnSuppress) {
        this.lastTwo.t = now; // hands retracting after the previous gesture
        return;
      }
      if (name === this.lastTwo.name && now - this.lastTwo.t < tw.cooldown) return;

      this.lastTwo = { name, t: now };
      this.lock.two = now + tw.lockAll;
      this.lock.single = now + tw.lockSingle;
      this.emit(name, detail, now);
      return;
    }
  }
}

function trim(arr, now, ms) {
  while (arr.length && now - arr[0].t > ms) arr.shift();
}

function lastX(st) {
  for (let i = st.buf.length - 1; i >= 0; i--) if (!st.buf[i].virtual) return st.buf[i].x;
  return st.buf.length ? st.buf[st.buf.length - 1].x : 0;
}
