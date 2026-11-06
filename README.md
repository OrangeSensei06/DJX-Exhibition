# Mughal Times

A local, two-window exhibition for **India Through Time**. The opening uses quiet
monochrome invitation cards. Chapter 1 opens as a doodle-style book with a turning
right leaf, a rotating biryani model and an interactive gallery screen.

## Run

Requires Node.js 22.12+ (Node 24 recommended) and Windows 10+.

```powershell
cd Z:\Projects\DJX-Exhibition
npm install
npm exec -- install-electron
npm run setup:vision
npm run dev
```

`npm run dev` compiles Electron, starts Vite, and opens **Book** and **Vertical**.
Renderer edits update live. Restart the command after editing Electron/shared
controller code. Close both windows to stop the development server.

For a built local app without the development server:

```powershell
npm run build
npm start
```

Dependencies, lockfile, local tracking model, and WASM assets are installed in this
project. After setup, the built app does not need a network connection. This is a
local runnable application; an installer is not produced in this milestone.

## Test the installation

1. Use extended displays in Windows. With one monitor the app tiles both windows.
2. Open **Setup** on either window to assign the book and vertical display. The
   choices are saved locally under `.runtime/`. Use fullscreen after assignment.
3. On the **Book** window, click **Enable camera**. Only this window captures video.
   If access is denied, the app reports it; use the operating system settings yourself.
4. Sweep one hand from right to left to open Chapter 1. Wait for the page to settle.
5. Pinch thumb and index finger with one hand to move the bowl on the book. You can
   also drag it with a mouse. Lift both hands upward together to send it to the gallery.
6. Sweep **one hand up and the other down** to separate the ingredients. Either hand
   can go up; short sweeps work even when the hands start far apart.
7. Sweep **left and right, away from each other**, with generous diagonal leeway.
   No precise pause or hold-still pose is required. The bowl settles and the ingredient
   descriptions reveal under **What made this bowl rich**, alternating left/right.
8. Read the ingredient display. After all descriptions have appeared, **Swipe left
   to turn the page** appears at the top of the vertical screen.
9. Swipe one hand left. All seven ingredient groups fall into the bowl together
   (1.5 seconds). The assembled bowl returns across both screens to its original
   book position (2.4 seconds), then the right leaf turns (1.45 seconds).
10. Chapter 1 repeats with fresh interaction state until more chapters are added.
    Additional swipes during reconstruction, return and page turning are ignored.

The controller enforces this sequence. Page swipes are enabled at the final
ingredient display, after its reveal, and one continued spread cannot both reveal
and clear the ingredients. The ending is read-only; no ingredient pickup is required.
Tracking loss cancels unfinished gestures and releases pinch ownership. Angles are
corrected for camera aspect ratio. Operator actions do not count as camera gestures.

Exhibition sensitivity: two-hand movements need roughly 5% of the camera view,
accumulate over a rolling 1.8-second window, and work with two camera samples.
Both-hand detection is more tolerant; the footer shows missing hands and the next
sweep. The final page swipe uses the same one-hand motion as the invitation.

Setup includes a mirrored camera preview, video-device selection, processing rate,
window connection count, last input source, and ordinary previous/next/reset
controls. Camera recognition and actual monitor placement must be checked with the
physical hardware; synthetic tests alone do not validate them.

Keyboard controls (when a setup form control is not focused):

| Key | Action |
| --- | --- |
| Right arrow / Enter | Open Chapter 1; at the ingredient ending, advance to the next page |
| Left arrow | Return to cover |
| U | Lift to the gallery |
| E | Separate ingredient tiers |
| C | Reveal the ingredient descriptions |
| R | Reset to invitation |
| D | Toggle setup |
| F11 | Toggle this window's fullscreen |
| Esc | Close setup and exit fullscreen |

Wait for each animation to finish before triggering the next stage. Setup also has
stage buttons and **Replay chapter**. Ingredient descriptions and research links
are in **`src/content/biryani.ts`**. Ghee is an informational eighth entry attached
to the rice. Seven physical ingredient groups use the supplied geometry. The cashew
mesh is separated into a runtime nut group without editing the GLB. All groups
share one reconstruction start time, then both windows sample the same reverse
handoff trajectory. Reloading a window resumes the current phase from that clock.

## Visuals and screen handoff

Chapter 1 loads the supplied `Models/Mughal_Times_Biryani.glb` and uses the manifest
to order its ingredient groups. The source GLB is unchanged. Runtime material
grading, warm key/rim lighting, restrained fill and lower exposure bring out copper
and gold. The gallery has a quiet midnight-blue backdrop. Ingredient tiers retain
volume and use measured projected bounds to maintain genuine gaps between groups.

Both windows sample a single timed trajectory in common pixel units, using their
measured canvas sizes. The physical assumption is a gallery above the book with
their centres aligned. Monitor DPI, bezel/gap, physical mounting and real hand
recognition still need an installation check; synchronized rendering alone does
not validate seamless physical alignment.

## Structure

- `electron/`: secure window creation, display assignment, camera permissions, IPC.
- `shared/`: typed protocol and centrally owned navigation state.
- `src/`: two responsive layouts, operator controls, persistent camera owner.
- `src/gesture/`: worker-based MediaPipe tracking and temporal swipe detector.
- `src/chapter/`: page fold, 3D model, cinematic lighting, projected tier layout.
- `src/content/biryani.ts`: editable ingredient descriptions and research sources.
- `public/vision/`: local model and WASM; refresh with `npm run setup:vision` after
  changing the MediaPipe dependency. Model source: Google's version 1 hand landmarker
  at `storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`.
- `Models/`: supplied GLB, layer offsets and model provenance README.
- `tests/`: gesture rejection, tracking loss, cooldown, navigation boundaries, reset.

The Electron controller is the single source of truth. Camera frames stay in the
book window and its worker; only state/status messages reach the controller. No
video recording, analytics, backend, or runtime CDN requests are implemented.

React Three Fiber / Three.js render the model in both windows. Model loading,
chapter timing and object manipulation run locally. The separate asset inspector
under `src/asset-preview/` is retained independently of the exhibition.

## Checks

```powershell
npm run check
npm run test:desktop
npm run test:chapter
npm run test:gestures
```

Runs meaningful synthetic swipe/navigation tests, TypeScript checks and the
production build. `npm run dev:web` is a layout preview only: Electron IPC and
camera controls require launching the desktop app.

`npm run test:desktop` runs the built app with Chromium's **synthetic camera**,
checks native window sync, reload recovery, keyboard input, worker/model startup,
camera release and camera/microphone restrictions. It saves screenshots and a
report in `output/`, then closes. Native checks use `.runtime/smoke/` separately
from normal application preferences.

`npm run test:chapter` exercises native pointer dragging, the complete staged
handoff, reload recovery, actual ingredient transforms, measured tier gaps and the
story reveal, the read-only ending and top swipe prompt, automatic reconstruction,
return to the original book position, page turn and playable chapter loop. It captures each stage in `output/chapter-one/`. These checks use
synthetic motion tests and operator inputs, not real hands or a physical two-screen
installation.

`npm run test:gestures` replays short hand movements through the same recognition
pipeline as the camera worker and sends the detected actions through actual
gesture IPC. It checks up/up, up/down, left/right, and arrival at the prepared
ingredients story sheet, then the ending swipe and complete chapter loop. This
verifies software routing, not live body recognition.
