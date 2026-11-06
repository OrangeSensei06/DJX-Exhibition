import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { GesturePipeline } from './gesturePipeline';
import { PINCH_RELEASE, PINCH_START } from './chapterGestures';

const pipeline = new GesturePipeline();
let landmarker: HandLandmarker | null = null;
let previousTimestamp = 0;
let backend: 'GPU' | 'CPU' = 'CPU';
let profile: 'lite' | 'full' = 'lite';
const pinchStates = new Map<string, boolean>();

self.onmessage = async (event: MessageEvent) => {
  const data = event.data;
  if (data.type === 'init') {
    try {
      const fileset = await FilesetResolver.forVisionTasks(data.wasmURL, true);
      const options = {
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.4,
        minHandPresenceConfidence: 0.4,
        minTrackingConfidence: 0.4,
      } as const;
      profile = data.modelURL.includes('lite') ? 'lite' : 'full';
      const delegates: ('GPU' | 'CPU')[] = data.delegate === 'CPU' ? ['CPU'] : ['GPU', 'CPU'];
      let lastError: unknown;
      for (const delegate of delegates) {
        try {
          const canvas = delegate === 'GPU' ? new OffscreenCanvas(256, 256) : undefined;
          if (canvas && !canvas.getContext('webgl2')) continue;
          landmarker = await HandLandmarker.createFromOptions(fileset, { ...options, canvas,
            baseOptions: { modelAssetPath: data.modelURL, delegate } });
          backend = delegate;
          break;
        } catch (error) { lastError = error; }
      }
      if (!landmarker) throw lastError ?? new Error('No compatible hand-tracking backend found.');
      self.postMessage({ type: 'ready', backend, model: profile });
    } catch (error) {
      self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Hand model could not load.' });
    }
    return;
  }
  if (data.type === 'context') {
    pipeline.setContext(data);
    return;
  }
  if (data.type === 'reset') { pipeline.reset(); pinchStates.clear(); return; }
  if (data.type !== 'frame') return;
  const frame = data.frame as ImageBitmap;
  try {
    if (!landmarker) return;
    const time = Math.max(data.time, previousTimestamp + 1);
    previousTimestamp = time;
    const inferenceStart = performance.now();
    const result = landmarker.detectForVideo(frame, time);
    const inferenceMs = performance.now() - inferenceStart;
    if (data.capturedAt && Date.now() - data.capturedAt > 300) {
      pipeline.reset(); pinchStates.clear();
      self.postMessage({ type: 'result', visible: false, hands: 0, cursors: [], previewHands: [],
        capturedAt: Date.now(), time, inferenceMs, backend, model: profile,
        gesture: null, action: { type: 'cancelGrab' }, feedback: 'Tracking catching up…', stale: true });
      return;
    }
    const aspect = frame.width / frame.height;
    const indices = [0, 5, 9, 13, 17];
    const hands = result.landmarks.map((hand, index) => ({
      id: result.handedness[index]?.[0]?.categoryName,
      wristX: 1 - hand[0].x,
      wristY: hand[0].y,
      x: 1 - indices.reduce((sum, index) => sum + hand[index].x, 0) / indices.length,
      y: indices.reduce((sum, index) => sum + hand[index].y, 0) / indices.length,
      cursorX: 1 - (hand[4].x + hand[8].x) / 2,
      cursorY: (hand[4].y + hand[8].y) / 2,
      pinch: Math.hypot((hand[4].x - hand[8].x) * aspect, hand[4].y - hand[8].y) / Math.max(0.01, Math.hypot((hand[5].x - hand[17].x) * aspect, hand[5].y - hand[17].y)),
    }));
    const outcome = pipeline.update(hands, time, Date.now(), aspect);
    const liveIds = new Set<string>();
    const cursors = hands.map((hand, index) => {
      const id = hand.id || `Hand ${index + 1}`;
      liveIds.add(id);
      const pinching = hand.pinch < (pinchStates.get(id) ? PINCH_RELEASE : PINCH_START);
      pinchStates.set(id, pinching);
      return { id, x: hand.cursorX, y: hand.cursorY, pinching };
    });
    for (const id of pinchStates.keys()) if (!liveIds.has(id)) pinchStates.delete(id);
    const previewHands = result.landmarks.map((landmarks, index) => ({
      label: result.handedness[index]?.[0]?.categoryName,
      landmarks: landmarks.map(({ x, y }) => ({ x, y })),
    }));
    self.postMessage({ type: 'result', visible: hands.length > 0, hands: hands.length, cursors, capturedAt: data.capturedAt ?? Date.now(), time,
      inferenceMs, backend, model: profile, previewHands, ...outcome });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Tracking failed.' });
  } finally {
    frame.close();
  }
};
