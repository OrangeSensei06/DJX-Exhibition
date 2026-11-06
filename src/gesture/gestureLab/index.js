// Import-only module: no camera startup, exhibition actions, or event listeners.
export { CONFIG, mergeConfig } from './gestures/config.js';
export { GestureEngine, LABELS } from './gestures/engine.js';
export { buildDetection, pixelsPerMeter, palmCenter, analyzePose } from './gestures/features.js';
export { TrackManager } from './vision/tracker.js';
export { HandTracker } from './vision/handTracker.js';
export { AudioOnset } from './vision/audioOnset.js';
export { drawHands } from './draw.js';
