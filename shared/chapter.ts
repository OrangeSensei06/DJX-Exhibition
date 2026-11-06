import type { ChapterAction, ChapterPhase, ChapterState, SurfaceMetrics, WindowRole } from './protocol';
import { BOWL_HOME, emptyReconstruction, ingredientHome, INGREDIENT_IDS } from './reconstruction';

export const CHAPTER_TIMING = { opening: 1450, transferring: 2400, exploding: 1600, clearing: 1900, storyReveal: 2100, reassembling: 1500, returning: 2400, paging: 1450 } as const;
export function canAdvanceChapter(state: ChapterState, now: number) {
  return state.phase === 'book' && now >= state.openedAt + CHAPTER_TIMING.opening
    || state.phase === 'story' && now >= state.startedAt + CHAPTER_TIMING.storyReveal;
}
export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
export const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

export function freshChapter(now = 0): ChapterState {
  return {
    phase: 'book', startedAt: now, openedAt: now,
    position: { x: 0.75, y: 0.56 }, transferOrigin: { x: 0.75, y: 0.56 },
    actions: 0, lastAction: null, reconstruction: emptyReconstruction(),
  };
}

export function chapterDeadline(state: ChapterState): number | null {
  if (state.phase === 'transferring' || state.phase === 'exploding' || state.phase === 'clearing' || state.phase === 'reassembling' || state.phase === 'returning' || state.phase === 'paging') {
    return state.startedAt + CHAPTER_TIMING[state.phase];
  }
  return null;
}

export function settleChapter(state: ChapterState, now: number): ChapterState {
  // Catch up from one shared clock, including after a renderer reload or delayed timer.
  let result = state;
  for (let i = 0; i < 4; i++) {
    const deadline = chapterDeadline(result);
    if (deadline === null || now < deadline) break;
    if (result.phase === 'paging') {
      result = { ...freshChapter(result.startedAt), startedAt: deadline };
      break;
    }
    const next: Partial<Record<ChapterPhase, ChapterPhase>> = { transferring: 'presented', exploding: 'exploded', clearing: 'story', reassembling: 'returning', returning: 'paging' };
    result = { ...result, phase: next[result.phase]!, startedAt: deadline };
  }
  return result;
}

export function reduceChapter(current: ChapterState, action: ChapterAction, now: number): ChapterState {
  if (action.type === 'restart') return freshChapter(now);
  const state = settleChapter(current, now);
  if (action.type === 'advance' || action.type === 'return') {
    if (!canAdvanceChapter(state, now)) return state;
    // A bowl still on the book needs no gallery round trip.
    if (state.phase === 'book') return { ...state, phase: 'paging', startedAt: now,
      actions: state.actions + 1, lastAction: 'advance' };
    return { ...state, phase: 'reassembling', startedAt: now, actions: state.actions + 1, lastAction: 'advance',
      reconstruction: { collected: [...INGREDIENT_IDS], held: null, cursor: null,
        placements: Object.fromEntries(INGREDIENT_IDS.map(id => [id, { ...ingredientHome(id), at: now }])) } };
  }
  // The ingredient display is now read-only, including for old input packets.
  if (['point', 'grab', 'dragIngredient', 'drop', 'cancelGrab'].includes(action.type)) return state;
  if (now < state.openedAt + CHAPTER_TIMING.opening) return state;
  if (action.type === 'move') {
    if (state.phase !== 'book' || !Number.isFinite(action.dx) || !Number.isFinite(action.dy)) return state;
    return { ...state, position: {
      x: clamp(state.position.x + clamp(action.dx, -0.15, 0.15), 0.59, 0.9),
      y: clamp(state.position.y + clamp(action.dy, -0.15, 0.15), 0.35, 0.76),
    } };
  }
  const next: Partial<Record<ChapterPhase, ChapterAction['type']>> = { book: 'lift', presented: 'explode', exploded: 'clear' };
  if (next[state.phase] !== action.type) return state;
  const phases = { lift: 'transferring', explode: 'exploding', clear: 'clearing' } as const;
  return {
    ...state, phase: phases[action.type as keyof typeof phases], startedAt: now,
    reconstruction: action.type === 'clear' ? emptyReconstruction() : state.reconstruction,
    transferOrigin: action.type === 'lift' ? { ...state.position } : state.transferOrigin,
    actions: state.actions + 1, lastAction: action.type,
  };
}

export interface ChapterVisual {
  x: number; y: number; visible: boolean; transfer: number; explosion: number; clearing: number;
}

// The two views sample one trajectory and one wall clock. The seam is book y=0 /
// gallery y=1: no delayed second animation or window-to-window timeout is involved.
export function sampleChapter(state: ChapterState, role: WindowRole, now: number, surfaces: SurfaceMetrics): ChapterVisual {
  const elapsed = now - state.startedAt;
  if (state.phase === 'returning' || state.phase === 'paging') {
    const progress = state.phase === 'paging' ? 1 : smooth(elapsed / CHAPTER_TIMING.returning);
    const home = freshChapter().position;
    const virtualY = mix((1 - BOWL_HOME.y) * surfaces.vertical.height, -home.y * surfaces.book.height, progress);
    const virtualX = mix(0, (home.x - 0.5) * surfaces.book.width, progress);
    return { x: 0.5 + virtualX / surfaces[role].width,
      y: role === 'book' ? -virtualY / surfaces.book.height : 1 - virtualY / surfaces.vertical.height,
      visible: state.phase !== 'paging' || role === 'book', transfer: 1 - progress, explosion: 0, clearing: 0 };
  }
  const transfer = state.phase === 'book' ? 0 : state.phase === 'transferring' ? smooth(elapsed / CHAPTER_TIMING.transferring) : 1;
  const explosion = ['exploded', 'clearing', 'story'].includes(state.phase) ? 1
    : state.phase === 'exploding' ? smooth(elapsed / CHAPTER_TIMING.exploding) : 0;
  const clearing = state.phase === 'story' || state.phase === 'complete' ? 1 : state.phase === 'clearing' ? smooth(elapsed / CHAPTER_TIMING.clearing) : 0;
  const origin = state.phase === 'book' ? state.position : state.transferOrigin;
  const virtualY = mix(-origin.y * surfaces.book.height, 0.48 * surfaces.vertical.height, transfer);
  const virtualX = mix((origin.x - 0.5) * surfaces.book.width, 0, transfer);
  return {
    x: 0.5 + virtualX / surfaces[role].width,
    y: role === 'book' ? -virtualY / surfaces.book.height : mix(1 - virtualY / surfaces.vertical.height, BOWL_HOME.y, clearing),
    visible: role === 'book' ? state.phase === 'book' || state.phase === 'transferring' : state.phase !== 'book',
    transfer, explosion, clearing,
  };
}
