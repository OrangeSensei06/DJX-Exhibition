# Chapter 03 · Beyond the Arches

The supplied `Mughal Times · Gate to the Jali.html` is preserved as `original.html`. `scripts/prepare-architecture.mjs` extracts its original styles, embedded optimized image textures, Three.js renderer, geometry, camera math, easing, timings, lighting, flash, parallax, and 140-particle system into an offline document. The animation runs only in the vertical window, in a same-origin iframe. Its exact React 18.3.1 and Three.js r128 dependencies are bundled under `vendor/`; the main application keeps its existing dependencies.

The six attached PNGs correspond to the frame, left leaf, right leaf, corridor, jali, and sunset artwork. For this first iteration the animation uses the HTML's embedded, preframed texture versions, preserving its existing projection and texture proportions. No replacement animation or generated artwork is used.

Figma file: `KWnBcAOSth2Re9hDSsQKh9`.
- Initial vertical composition: `53:16310`.
- Jali layout reference: `53:16495`.
- Horizontal spread: `53:14263`, translated to React and ordinary CSS. Its grey photo placeholder is intentional in the supplied frame. The chapter label is corrected to 03.
- Background jaali, corner artwork, and divider are downloaded from the vertical design into `figma/`. The supplied animation's arch and jali artwork take precedence over the Figma gate and jali images in this first iteration, as requested.
- The horizontal SVGs and image are original Figma exports. Typography uses locally bundled Google Fonts (SIL Open Font License).

The supplied historical paragraphs replace the leftover fashion copy. Updated entry timing is 2.3 seconds opening, 0.45 seconds pause/glow, and 2.4 seconds camera entry; returning remains 3.8 seconds travel, 0.5 seconds pause, and 1.8 seconds closing. The rectangular colour backing behind the transparent sunset is hidden to keep the jali silhouette clean. Paragraphs retain their outgoing content through a 350 ms fade before swapping while hidden.

Start with Setup → Start Chapter 3, or finish Chapter 2. Both windows share phase and commands via the existing Electron IPC snapshots. O opens, P returns, R resets. Controls also work with focus in the animation. Live door/push gesture recognition is deferred; the first iteration uses the supplied animation's click controls and synchronized book/operator controls.
