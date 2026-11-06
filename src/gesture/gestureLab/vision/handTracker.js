import { FilesetResolver, HandLandmarker } from 'gesture-lab-vision';
import { TrackManager } from './tracker.js';
import { buildDetection } from '../gestures/features.js';

const BASE = `${import.meta.env.BASE_URL}vision/gesture-lab/`;
const MODEL = `${BASE}models/hand_landmarker.task`;

/**
 * Camera -> MediaPipe -> stable hand tracks.
 *
 * Anti-dropout measures:
 *  1. Low detection/tracking confidences + 2 hands.
 *  2. Main pass runs in VIDEO mode on every camera frame (requestVideoFrameCallback,
 *     no queueing: if inference is slow we skip frames instead of lagging behind).
 *  3. Rescue pass: when a tracked hand disappears, re-run an IMAGE-mode detector on
 *     a zoomed crop around where the hand should be. The palm detector sees only
 *     192x192 px, so a small/far hand becomes detectable once cropped.
 *  4. Idle scan: with no hands at all, sweep zoomed tiles across the frame to
 *     pick up far-away users.
 *  5. TrackManager coasts through whatever is still missed.
 */
export class HandTracker {
  constructor(video, cfg, onFrame, onError) {
    this.onError = onError;
    this.stopped = false;
    this.lastVideoTime = -1;
    this.video = video;
    this.cfg = cfg;
    this.onFrame = onFrame;
    this.tm = new TrackManager(cfg.tracker);
    this.running = false;
    this.lastTs = 0;
    this.fps = 0;
    this.lastFrameAt = 0;
    this.lastProcessedAt = 0;
    this.lastRescueAt = -Infinity;
    this.tile = 0;
    this.rr = 0;
    this.crop = document.createElement('canvas');
    this.crop.width = this.crop.height = 256;
    this.cctx = this.crop.getContext('2d', { willReadFrequently: false });
  }

  async start() {
    const fileset = await FilesetResolver.forVisionTasks(`${BASE}wasm`);
    const make = (runningMode, delegate) =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate },
        runningMode,
        numHands: this.cfg.tracker.maxHands,
        minHandDetectionConfidence: this.cfg.model.minDetect,
        minHandPresenceConfidence: this.cfg.model.minPresence,
        minTrackingConfidence: this.cfg.model.minTrack,
      });
    if (this.stopped) return;
    const keep = model => {
      if (this.stopped) { model.close(); throw new DOMException('Camera startup cancelled', 'AbortError'); }
      return model;
    };
    const delegates = this.cfg.model.delegate === 'GPU' ? ['GPU', 'CPU'] : ['CPU'];
    let lastError;
    for (const delegate of delegates) {
      try {
        this.main = keep(await make('VIDEO', delegate));
        this.rescue = keep(await make('IMAGE', delegate));
        this.delegate = delegate;
        break;
      } catch (error) {
        this.main?.close(); this.main = null;
        this.rescue?.close(); this.rescue = null;
        if (this.stopped) return;
        lastError = error;
      }
    }
    if (!this.main || !this.rescue) throw lastError;

    const { width, height, fps, portrait } = this.cfg.camera;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        ...(this.cfg.camera.deviceId ? { deviceId: { exact: this.cfg.camera.deviceId } } : { facingMode: 'user' }),
        width: { ideal: portrait ? height : width },
        height: { ideal: portrait ? width : height },
        frameRate: { ideal: fps },
      },
    });
    if (this.stopped) { this.stream.getTracks().forEach(t => t.stop()); return; }
    this.video.srcObject = this.stream;
    await this.video.play();

    if (this.stopped) return;
    this.running = true;
    this.schedule();
  }

  stop() {
    this.stopped = true;
    this.running = false;
    if (this.handle != null) {
      this.video.cancelVideoFrameCallback?.(this.handle);
      cancelAnimationFrame(this.handle);
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.main?.close(); this.main = null;
    this.rescue?.close(); this.rescue = null;
    if (this.video.srcObject === this.stream) this.video.srcObject = null;
  }

  schedule() {
    if (!this.running) return;
    const tick = () => {
      if (!this.running) return;
      try {
        this.process();
      } catch (err) {
        this.stop();
        this.onError?.(err);
      }
      this.schedule();
    };
    this.handle = this.video.requestVideoFrameCallback ? this.video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
  }

  process() {
    const v = this.video;
    const w = v.videoWidth;
    const h = v.videoHeight;
    if (!w || !h || v.readyState < 2 || v.currentTime === this.lastVideoTime) return;
    // Bound inference to approximately 30 FPS even if the camera delivers more frames.
    // This leaves CPU/GPU time for the exhibition scenes, particularly fullscreen.
    if (performance.now() - this.lastProcessedAt < 32) return;
    this.lastProcessedAt = performance.now();
    this.lastVideoTime = v.currentTime;
    const ar = w / h;
    const t0 = performance.now();
    const ts = Math.max(t0, this.lastTs + 1);
    this.lastTs = ts;
    const ext = this.cfg.pose.extended;

    const res = this.main.detectForVideo(v, ts);
    const dets = res.landmarks.map((lm, i) => buildDetection(lm, res.worldLandmarks[i], ar, ext));
    let hands = this.tm.update(dets, t0);

    // --- rescue / idle scan -------------------------------------------------
    // The second MediaPipe model is expensive. Do not run crop rescue on every
    // frame when tracking is lost or while scanning an empty scene.
    const rescueInterval = this.tm.tracks.length ? 140 : 450;
    const mayRescue = t0 - this.lastRescueAt >= rescueInterval;
    const plan = mayRescue ? this.planCrop(t0, w, h, ar) : null;
    if (plan) this.lastRescueAt = t0;
    if (plan) {
      const { sx, sy, side } = plan;
      this.cctx.drawImage(v, sx, sy, side, side, 0, 0, this.crop.width, this.crop.height);
      const r = this.rescue.detect(this.crop);
      if (r.landmarks.length) {
        const extra = r.landmarks.map((lm, i) =>
          buildDetection(
            lm.map((p) => ({ x: (sx + p.x * side) / w, y: (sy + p.y * side) / h, z: p.z })),
            r.worldLandmarks[i],
            ar,
            ext,
          ),
        );
        hands = this.tm.reinforce(extra, t0);
      }
    }

    const t1 = performance.now();
    if (this.lastFrameAt) this.fps += (1000 / (t1 - this.lastFrameAt) - this.fps) * 0.1;
    this.lastFrameAt = t1;
    this.onFrame({ hands, w, h, t: t0, ms: t1 - t0, fps: this.fps, rescued: !!plan });
  }

  planCrop(now, w, h, ar) {
    if (!this.cfg.rescue?.enabled) return null;
    const minDim = Math.min(w, h);
    const lost = this.tm.lost(now);
    if (lost.length) {
      const { track, pos } = lost[this.rr++ % lost.length];
      const side = clamp(track.hs * h * 3.4, minDim * 0.3, minDim);
      return place(pos.x / ar * w - side / 2, pos.y * h - side / 2, side, w, h);
    }
    if (this.tm.tracks.length === 0 && this.cfg.rescue.idleScan) {
      const side = Math.round(minDim * 0.75);
      const k = this.tile++ % 3;
      return w >= h ? place(k * ((w - side) / 2), (h - side) / 2, side, w, h) : place((w - side) / 2, k * ((h - side) / 2), side, w, h);
    }
    return null;
  }
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const place = (sx, sy, side, w, h) => ({ sx: clamp(sx, 0, w - side), sy: clamp(sy, 0, h - side), side });
