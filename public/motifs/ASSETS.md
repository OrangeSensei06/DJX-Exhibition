# Chapter 04 · Patterns of Paradise

Updated botanical visuals come from the user-supplied `Mughal_Times_Ch4_Patterns_of_Paradise_new_visuals.html`, archived as `new-visuals.html`. Only its bud, flower, two central vine and two border vine textures are imported; the existing background, scroll, rollers and replacement corners remain unchanged. The intro uses 12 central vines plus two permanent border vines, arriving in pairs spaced 0.2 seconds apart over a six-second growth phase. Setup controls, blooms, replay and the center/pause/clear exit remain intact.

The user-supplied `Mughal Times · Ch.4 Patterns of Paradise.html` is preserved in `original.html`. `scripts/prepare-motifs.mjs` packages it as an offline audience document without changing the original growth shaders, scroll geometry, texture mapping, camera, timings, drifting background, particles, and flower animation.

The ten embedded optimized image textures correspond to the supplied background, corner, roller, parchment, border vines, full vines, lotus and bud artwork. They remain embedded to preserve the original framing and transparency. The separately attached full-resolution source images remain in the user's Exhibition Materials folder.

The original audience button row is removed from the rendered document, and its keyboard controls are disabled. All commands go through Setup → Chapter 04 and the existing Electron snapshot/IPC mechanism. Start and Replay mount a fresh document; Open Scroll and Bloom commands are guarded by the chapter phase. Blooming remains limited to three actions as in the source.

Local runtime dependencies reuse the exact React 18.3.1 and Three.js r128 files bundled for Chapter 3. Fonts use the existing local Cormorant Garamond and Jost assets. No external network requests are required.

The original sequence runs automatically: intro → idle → vine growth → vines part → scroll ready. Setup opens the scroll and reveals its content, then can add flowers or replay. The horizontal screen provides a chapter companion; no Chapter 4 horizontal Figma layout was supplied for this iteration.
