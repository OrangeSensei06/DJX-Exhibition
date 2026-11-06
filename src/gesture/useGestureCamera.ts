import { useCallback, useEffect, useRef, useState } from 'react';
import type { Snapshot, VisionStatus, WindowRole } from '../../shared/protocol';
import { gestureContextKey, gestureHint } from '../../shared/gestureRouting';
import { CONFIG, GestureEngine, HandTracker } from './gestureLab/index.js';
import { drawHandOverlay } from './handOverlay';

export function useGestureCamera(role: WindowRole, snapshot: Snapshot) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
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
    const canvas = overlayRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
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
        window.exhibition?.reportHands({ capturedAt: now, hands: hands.map(hand => ({
          id: String(hand.id), x: 1 - hand.landmarks[8].x, y: hand.landmarks[8].y, pinching: false,
        })) });
        if (overlayRef.current?.offsetParent && videoRef.current) drawHandOverlay(overlayRef.current, videoRef.current,
          hands.map((hand, index) => ({ label: index === 0 ? 'Left' : 'Right', landmarks: hand.landmarks })));
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
    if (role !== 'book') return;
    void refreshDevices();
    navigator.mediaDevices?.addEventListener('devicechange', refreshDevices);
    return () => { navigator.mediaDevices?.removeEventListener('devicechange', refreshDevices); stop(false); };
  }, [role, refreshDevices, stop]);
  return { videoRef, overlayRef, devices, deviceId, setDeviceId, start, stop };
}
