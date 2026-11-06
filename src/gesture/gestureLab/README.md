# Gesture Lab import

Imported from `Z:/Projects/Kanha/gesture-lab` on 2026-11-04. This module now powers the exhibition camera through useGestureCamera. The old worker and threshold detectors are retained only as legacy code; the application no longer starts them. Gesture events go through the main-process exhibition:gesture endpoint and shared/gestureRouting.ts.

## Included

- Original gesture configuration and thresholds, metric/world-landmark features, and GestureEngine.
- TrackManager with stable identities, 350 ms coasting, and scale smoothing.
- HandTracker with GPU/CPU fallback, two-hand detection, crop rescue, idle scanning, and camera frame scheduling.
- Optional AudioOnset snap assistance (inactive by default) and hand skeleton drawing.
- The exact full `hand_landmarker.task` model and WASM files from Gesture Lab.
- The original synthetic recognition tests, with paths adjusted for this project.

Only HandTracker's package import and asset base path were adapted. Recognition logic and thresholds are copied unchanged. `provenance.json` records imported file hashes. The source project is untouched.

## Runtime and assets

Gesture Lab's installed runtime is MediaPipe **0.10.35**. It is pinned as the npm alias `gesture-lab-vision`, independently of DJX's existing `@mediapipe/tasks-vision` dependency. Its assets live under `public/vision/gesture-lab/`, so its runtime and weights stay together without replacing existing vision files. No CDN is used at runtime.

After `npm install`, run `npm run setup:gesture-lab` to refresh this module's WASM from its pinned dependency. The full model is already included. Run `npm run test:gesture-lab` for near/far, rotated hands, swipes, snap, pointing sweeps/swirl, two-hand motions, push, and dropout recovery.

## Application integration

The pure engine is available from `./gestures/engine.js`; it consumes the hand snapshots returned by `TrackManager`. The browser-facing exports are available from `./index.js`:

```js
import { CONFIG, GestureEngine, HandTracker } from './gesture/gestureLab/index.js';

// Minimal standalone usage; the exhibition hook owns its actual lifecycle.
const engine = new GestureEngine(event => console.log(event.name, event.detail));
const tracker = new HandTracker(videoElement, CONFIG, ({ hands, t }) => engine.update(hands, t));
// Explicitly call tracker.start() and tracker.stop() when wiring a future camera lifecycle.
```

Names emitted: `swipe-left`, `swipe-right`, `swipe-up`, `snap`, `vertical-opposite`, `hands-apart`, `hands-together`, `push`, `finger-left`, `finger-right`. Directions use the source's mirrored user view. Chapter mappings and navigation locks are defined in shared/gestureRouting.ts. Finger sweeps are excluded from jewellery rotation; circular swirls are required.

Do not run both camera pipelines together when integrating. Adapt camera ownership and async startup/cleanup to the app lifecycle then. Optional microphone assistance also needs an explicit UI and Electron permission decision; this import does not enable it.

The tracker adapter now also supports camera selection, cancellation-safe startup, complete GPU/CPU fallback, error forwarding, and duplicate-video-frame skipping. Recognition thresholds, features, TrackManager, and GestureEngine remain unchanged. The import-time hashes in provenance.json are historical source hashes, not hashes of these later adapter changes.

## Exhibition controls

| Context | Gesture | Result |
| --- | --- | --- |
| Before lifting a chapter | Swipe left / right | Next / previous spread |
| Waiting on a spread | Swipe up | Lift once into the gallery |
| Biryani: IDLE | Hands move vertically in opposite directions | Explode into layers |
| Biryani: STACKED | Hands move apart horizontally | Separate into ingredient descriptions |
| Dresses: reveal complete | Snap | Change the dress |
| Doors: outside / inside | Both hands push toward the camera | Enter / return |
| Scroll: SCROLL_READY | Hands move vertically in opposite directions | Open and reveal the scroll |
| Jewellery: READY | Pointing-finger swirl left / right | Rotate left / right |
| Reversal prompt | Swipe left / right | Reverse, then next / previous spread |

Page turns lock at lift and during transitions. They unlock after the ingredient list, a completed dress change, a doorway round trip, revealed scroll content, or a completed jewellery rotation. The on-screen guidance uses the same rules as main-process routing. Operator controls remain available for rehearsal/recovery. Automatic playback ignores camera gestures.

`npm run check` runs all unit and recognition tests and builds production assets. `npm run test:gestures` tests the new camera using Chromium's fake camera and exercises every chapter mapping, navigation lock, and reversal in real Electron renderers. This does not validate physical hand recognition or lighting at the installation.
