# Horizontal book spreads

Local assets and React components are sourced from the supplied Figma file `KWnBcAOSth2Re9hDSsQKh9`.

| Chapter | Full spread |
| --- | --- |
| 1 | 126:2098 |
| 2 | 126:2197 |
| 3 | 126:2589 |
| 4 | 126:2388 |
| 5 | 126:2803 |

The Chapter 2 and 3 URLs select background nodes 126:2198 and 126:2590. Their complete parent spreads are used above.

Right-page layers can be moved independently in `src/book/rightPageLayout.ts`. Look up their Figma IDs and labels in `src/book/design/right-page-layers.json`. Set `x`, `y` (native pixels), `rotation` (degrees), `scale`, or `opacity` per chapter and layer. All defaults preserve the Figma layout. Group settings move their children together; child settings add independent adjustments. The same settings apply during page turns. This is a code configuration, not a visitor drag interaction.

`src/book/design/chapter*.source.txt` preserves design context code. `scripts/prepare-book.mjs` converts its styling into scoped CSS and generated React components without Tailwind. Copied chapter labels are corrected to their actual chapter numbers. Images, ornament SVGs, cropping and typography remain separate layers. `asset-manifest.json` records export provenance; all runtime references point to local files.

The old flat spine is replaced with a shaded binding, page edges and a cover beneath separate left/right pages. A segmented double-sided leaf curls across the spine, showing the outgoing right page on its front and incoming left page on its back. The destination right page is visible underneath. Reverse turns use the same surfaces in the opposite direction. Reduced motion shortens the turn. Gallery exit completion chooses the destination chapter; the book animates the resulting shared state change.

Book-to-gallery travel is synchronized through `Snapshot.handoff`: lifting → away → returning → idle. Chapters 1, 2, 3 and 5 animate nodes `126:3130`, `126:2387`, `126:2802` and `126:3115`. Gallery intros start after the lift completes; gallery exits restore the book object before chapter selection/page turning. Selecting or resetting a chapter cancels pending travel timers.

Chapter 4 uses `MehndiHand.tsx` in the original `126:2588` slot. A rising mask reveals the supplied `chapter4-bare-hand.png`, registered to the Figma hand's pose and alpha outline. Small dark particles sample the actual henna pixels, lift straight upward in book coordinates, and retrace the same paths on return. The original printed hand is fully restored before the page turns. The 2.6-second animation uses the shared clock, catches up after reload, and omits particles for reduced motion. The other magazine elements and the vertical vines/scroll stay unchanged.

Auto in Setup plays Chapters 1 through 5, waiting for each actual scene phase before advancing. It includes reading pauses, both dress looks, the gate and jali return, scroll and three blooms, and all three jewellery displays. Stop cancels future automatic commands while the current animation finishes. Camera gestures cannot interrupt Auto. Chapter 4 phase reports must follow the current visit sequence; stale exit completions are ignored.
