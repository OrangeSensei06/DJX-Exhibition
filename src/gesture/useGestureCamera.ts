import { useCallback, useEffect, useRef, useState } from 'react';
import type { Snapshot, VisionStatus, WindowRole } from '../../shared/protocol';
import { gestureContextKey, gestureHint } from '../../shared/gestureRouting';
import { CONFIG, GestureEngine, HandTracker } from './gestureLab/index.js';

export function useGestureCamera(role: WindowRole, snapshot: Snapshot, previewVisible: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const previewWorker = useRef<Worker | null>(null);
  const previewPending = useRef(false);
  const trackerRef = useRef<HandTracker | null>(null);
  const generation = useRef(0);
  const contextRef = useRef(snapshot);
  contextRef.current = snapshot;
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const report = useCallback((status: VisionStatus) => window.exhibition?.reportVision(status), []);
  const stop = useCallback((announce = true) => {
    generation.current++;
    trackerRef.current?.stop();
    trackerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    previewWorker.current?.postMessage({ type: 'frame', hands: [], videoWidth: 0, videoHeight: 0 });
    window.exhibition?.reportHands({ capturedAt: Date.now(), hands: [] });
    if (announce) report({ camera: 'off', hand: 'none', message: 'Camera off', fps: 0 });
  }, [report]);
  const refreshDevices = useCallback(async () => {
    try { setDevices((await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput')); }
    catch { /* Startup reports capture errors. */ }
  }, []);
  const start = useCallback(async () => {
    if (role !== 'book' || !window.exhibition) return;
    stop(false);
    const token = generation.current;
    const active = () => generation.current === token;
    report({ camera: 'starting', hand: 'none', message: 'Loading Gesture Lab full hand tracking…', fps: 0 });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fail = (error: unknown) => {
      if (!active()) return;
      clearTimeout(timer);
      stop(false);
      report({ camera: 'error', hand: 'none', message: error instanceof Error ? error.message : 'Hand tracking failed', fps: 0 });
    };
    timer = setTimeout(() => fail(new Error('Camera startup timed out. Check camera access and retry.')), 45_000);
    try {
      if (!videoRef.current) throw new Error('Camera preview is not mounted');
      let engine: GestureEngine | null = null;
      let engineKey = '';
      let lastReport = 0;
      let lastHandsReport = 0;
      const tracker = new HandTracker(videoRef.current, { ...CONFIG, camera: { ...CONFIG.camera, deviceId } }, frame => {
        if (!active()) return;
        const state = contextRef.current;
        const key = gestureContextKey(state);
        const now = Date.now();
        if (key !== engineKey) { engine = null; engineKey = key; }
        if (state.auto.active || now < state.interaction.pageReadyAt || performance.now() - frame.t > 350 || document.querySelector('[data-book-turning="true"]')) {
          engine = null;
        } else {
          engine ??= new GestureEngine(event => {
            if (active()) void window.exhibition?.recognizeGesture({ name: event.name, detail: event.detail }, key, Date.now()).catch(fail);
          });
          engine.update(frame.hands, frame.t);
        }
        // Predicted hands help recognition bridge dropouts; cursors and the
        // preview show only actual observations, never a stale pinch.
        const hands = frame.hands.filter(hand => !hand.coasting);
        // Cursor IPC is separate from recognition; a 15 FPS cursor update avoids
        // flooding Electron and the vertical renderer while tracking runs at full speed.
        if (frame.t - lastHandsReport >= 65) {
          window.exhibition?.reportHands({ capturedAt: now, hands: hands.map(hand => ({
            id: String(hand.id), x: 1 - hand.landmarks[8].x, y: hand.landmarks[8].y, pinching: false,
          })) });
          lastHandsReport = frame.t;
        }
        // Video plays at the camera's native FPS. The skeleton is rendered on
        // its own worker at the REAL inference FPS, never an arbitrary 12 FPS cap.
        const worker = previewWorker.current;
        if (worker && !previewPending.current && videoRef.current) {
          previewPending.current = true;
          worker.postMessage({
            type: 'frame', videoWidth: videoRef.current.videoWidth,
            videoHeight: videoRef.current.videoHeight,
            hands: hands.map((hand, index) => ({
              label: index ? 'Right' : 'Left',
              landmarks: hand.landmarks.map(p => ({ x: p.x, y: p.y })),
            })),
          });
        }
        if (frame.t - lastReport >= 180) {
          report({ camera: 'ready', hand: hands.length ? 'visible' : 'none', hands: hands.length,
            fps: Math.round(frame.fps), backend: tracker.delegate, model: 'full', inferenceMs: Math.round(frame.ms),
            frameAgeMs: Math.round(performance.now() - frame.t), message: gestureHint(state, now) });
          lastReport = frame.t;
        }
      }, fail);
      trackerRef.current = tracker;
      await tracker.start();
      if (!active()) { tracker.stop(); return; }
      clearTimeout(timer);
      tracker.stream?.getVideoTracks()[0]?.addEventListener('ended', () => fail(new Error('Camera disconnected. Reconnect it and retry.')));
      report({ camera: 'ready', hand: 'none', hands: 0, fps: 0, backend: tracker.delegate, model: 'full', message: gestureHint(contextRef.current, Date.now()) });
      void refreshDevices();
    } catch (error) { fail(error); }
  }, [deviceId, refreshDevices, report, role, stop]);
  useEffect(() => {
    if (role !== 'book' || !previewVisible || !overlayRef.current) return;
    const canvas = overlayRef.current;
    // OffscreenCanvas removes all landmark drawing from the tracking renderer.
    // No worker exists at all while the Tab preview is closed.
    if (typeof canvas.transferControlToOffscreen !== 'function') return;
    const worker = new Worker(new URL('./previewOverlay.worker.ts', import.meta.url), { type: 'module' });
    previewWorker.current = worker;
    previewPending.current = false;
    worker.onmessage = event => { if (event.data?.type === 'rendered') previewPending.current = false; };
    worker.onerror = () => {
      if (previewWorker.current === worker) previewWorker.current = null;
      previewPending.current = false;
      worker.terminate(); // Never let a preview error stop actual gesture detection.
    };
    const offscreen = canvas.transferControlToOffscreen();
    worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);
    const resize = () => worker.postMessage({
      type: 'resize',
      width: canvas.clientWidth, height: canvas.clientHeight,
      pixelRatio: window.devicePixelRatio || 1,
    });
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => {
      observer.disconnect();
      worker.terminate();
      if (previewWorker.current === worker) previewWorker.current = null;
      previewPending.current = false;
    };
  }, [role, previewVisible]);

  useEffect(() => {
    if (role !== 'book') return;
    void refreshDevices();
    navigator.mediaDevices?.addEventListener('devicechange', refreshDevices);
    return () => { navigator.mediaDevices?.removeEventListener('devicechange', refreshDevices); stop(false); };
  }, [role, refreshDevices, stop]);
  return { videoRef, overlayRef, devices, deviceId, setDeviceId, start, stop };
}
