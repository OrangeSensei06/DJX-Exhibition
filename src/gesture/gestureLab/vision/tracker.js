// Hand identity + dropout survival.
// MediaPipe drops hands on motion blur, odd angles and small (far) hands. Instead of
// reporting "no hand", every hand becomes a track that:
//   - keeps its id across gaps (re-associated by predicted position),
//   - keeps coasting on a decaying-velocity prediction for `coastMs`,
//   - keeps its scale estimate, so gesture windows can bridge the gap.

const TAU = 0.20; // s: retain velocity a little longer through brief motion blur

export class TrackManager {
  constructor(cfg) {
    this.cfg = cfg;
    this.tracks = [];
    this.nextId = 1;
  }

  predicted(tr, now) {
    const dt = Math.min((now - tr.t) / 1000, 0.6);
    const k = TAU * (1 - Math.exp(-dt / TAU));
    return { x: tr.c.x + tr.vel.x * k, y: tr.c.y + tr.vel.y * k };
  }

  /** Tracks that were not seen in the latest frame but are still alive. */
  lost(now) {
    return this.tracks.filter((t) => t.missed > 0 && now - t.t <= this.cfg.coastMs).map((t) => ({ track: t, pos: this.predicted(t, now) }));
  }

  update(dets, now) {
    dets = dedupe(dets);
    const { matched, freeDets, freeTracks } = this.assign(dets, this.tracks, now);
    for (const [tr, d] of matched) this.apply(tr, d, now);
    for (const tr of freeTracks) tr.missed++;
    this.spawn(freeDets, now);
    this.tracks = this.tracks.filter((t) => now - t.t <= this.cfg.coastMs);
    return this.snapshot(now);
  }

  /** Second chance for tracks that the main pass lost (rescue-crop detections). */
  reinforce(dets, now) {
    const live = this.tracks.filter((t) => t.missed === 0);
    dets = dedupe(dets).filter((d) => !live.some((t) => Math.hypot(d.c.x - t.c.x, d.c.y - t.c.y) < 0.6 * Math.max(d.hs, t.hs)));
    const lost = this.tracks.filter((t) => t.missed > 0);
    const { matched, freeDets } = this.assign(dets, lost, now);
    for (const [tr, d] of matched) this.apply(tr, d, now);
    this.spawn(freeDets, now);
    return this.snapshot(now);
  }

  assign(dets, tracks, now) {
    const pairs = [];
    tracks.forEach((tr, i) => {
      const p = this.predicted(tr, now);
      dets.forEach((d, j) => {
        const dist = Math.hypot(d.c.x - p.x, d.c.y - p.y);
        // When a hand is briefly lost, widen the gate gradually so its real
        // reappearance can be associated with the predicted trajectory.
        // This stays spatially bounded to avoid matching the other hand.
        const missingFor = tr.missed > 0 ? Math.min((now - tr.t) / this.cfg.coastMs, 1) : 0;
        const gate = Math.max(this.cfg.matchGate + 0.13 * missingFor, 2.5 * Math.max(tr.hs, d.hs));
        if (dist <= gate) pairs.push({ i, j, dist });
      });
    });
    pairs.sort((a, b) => a.dist - b.dist);
    const usedT = new Set();
    const usedD = new Set();
    const matched = [];
    for (const { i, j } of pairs) {
      if (usedT.has(i) || usedD.has(j)) continue;
      usedT.add(i);
      usedD.add(j);
      matched.push([tracks[i], dets[j]]);
    }
    return {
      matched,
      freeDets: dets.filter((_, j) => !usedD.has(j)),
      freeTracks: tracks.filter((_, i) => !usedT.has(i)),
    };
  }

  apply(tr, d, now) {
    // Expose one recovery marker to the gesture engine. It can then replace
    // stale coast predictions with an interpolated observed-to-observed path.
    tr.recoveredMs = tr.missed > 0 ? now - tr.t : 0;
    const dt = Math.min(Math.max((now - tr.t) / 1000, 0.008), 0.6);
    const vx = (d.c.x - tr.c.x) / dt;
    const vy = (d.c.y - tr.c.y) / dt;
    tr.vel = { x: 0.55 * vx + 0.45 * tr.vel.x, y: 0.55 * vy + 0.45 * tr.vel.y };
    tr.c = d.c;
    tr.t = now;
    tr.missed = 0;
    // Grow fast, shrink slowly: a hand turning edge-on looks smaller for a moment
    // without actually being further away.
    tr.ppm += (d.ppm - tr.ppm) * (d.ppm > tr.ppm ? this.cfg.ppmAlpha : this.cfg.ppmAlpha * 0.3);
    tr.hs = tr.ppm * (d.hs / d.ppm);
    tr.det = d;
  }

  spawn(dets, now) {
    for (const d of dets) {
      if (this.tracks.length >= this.cfg.maxHands) {
        const stale = this.tracks.filter((t) => t.missed > 0).sort((a, b) => a.t - b.t)[0];
        if (!stale) break;
        this.tracks.splice(this.tracks.indexOf(stale), 1);
      }
      this.tracks.push({ id: this.nextId++, c: d.c, t: now, vel: { x: 0, y: 0 }, ppm: d.ppm, hs: d.hs, missed: 0, recoveredMs: 0, det: d });
    }
  }

  snapshot(now) {
    return this.tracks
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((tr) => {
        const coasting = tr.missed > 0;
        const d = tr.det;
        let c = tr.c;
        let landmarks = d.landmarks;
        let tip = d.tip;
        if (coasting) {
          c = this.predicted(tr, now);
          const ox = c.x - tr.c.x;
          const oy = c.y - tr.c.y;
          landmarks = d.landmarks.map((p) => ({ x: p.x + ox / d.ar, y: p.y + oy, z: p.z }));
          tip = { x: d.tip.x + ox, y: d.tip.y + oy };
        }
        return { id: tr.id, coasting, lostMs: now - tr.t, recoveredMs: coasting ? 0 : tr.recoveredMs || 0, c, tip, ppm: tr.ppm, hs: tr.hs, pose: d.pose, landmarks, world: d.world };
      });
  }
}

function dedupe(dets) {
  const out = [];
  for (const d of dets) {
    if (!out.some((o) => Math.hypot(o.c.x - d.c.x, o.c.y - d.c.y) < 0.6 * Math.max(o.hs, d.hs))) out.push(d);
  }
  return out;
}
