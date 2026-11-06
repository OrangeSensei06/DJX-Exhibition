import type { Snapshot } from './protocol';

export const GESTURES = ['swipe-left', 'swipe-right', 'swipe-up', 'snap', 'vertical-opposite', 'hands-apart', 'hands-together', 'push', 'finger-left', 'finger-right'] as const;
export type LabGestureName = typeof GESTURES[number];
export interface LabGesture { name: LabGestureName; detail: string; }
export type GestureCommand = { channel: 'navigate'; action: 'next' | 'previous' }
  | { channel: 'lift'; action: 'lift' }
  | { channel: 'biryani-video'; action: 'separate' | 'list' }
  | { channel: 'fashion'; action: 'switch' }
  | { channel: 'architecture'; action: 'open' | 'return' }
  | { channel: 'motifs'; action: 'open' }
  | { channel: 'jewels'; action: 'left' | 'right' };

export const activeChapter = (s: Snapshot) => s.jewels.active ? 5 : s.motifs.active ? 4 : s.architecture.active ? 3 : s.fashion.nextChapter ? 1 : 2;
export function waitingForLift(s: Snapshot) {
  if (s.welcome || s.handoff.phase !== 'idle') return false;
  switch (activeChapter(s)) {
    case 1: return s.biryaniVideo.phase === 'book';
    case 2: return !s.fashion.startedAt && !s.fashion.exitingAt;
    case 3: return s.architecture.phase === 'WAIT';
    case 4: return s.motifs.phase === 'WAIT';
    default: return s.jewels.phase === 'WAIT';
  }
}
export function reversalReady(s: Snapshot, now: number) {
  if (s.handoff.phase !== 'away') return false;
  switch (activeChapter(s)) {
    case 1: return s.biryaniVideo.phase === 'LIST';
    case 2: return !!s.interaction.completed && !s.fashion.exitingAt && now >= s.fashion.startedAt + 4700 && now >= s.fashion.switchedAt + 900;
    case 3: return !!s.interaction.completed && s.architecture.phase === 'idle';
    case 4: return ['CONTENT_VISIBLE', 'BLOOM_OPTIONAL'].includes(s.motifs.phase);
    default: return !!s.interaction.completed && s.jewels.phase === 'READY';
  }
}
export function canTurnPage(s: Snapshot, now: number) {
  return !s.auto.active && now >= s.interaction.pageReadyAt && (!!s.welcome || waitingForLift(s) || reversalReady(s, now));
}
// Vision/status broadcasts do not change this key. A chapter, animation stage,
// restart, or accepted interaction does, invalidating recognition in flight.
export function gestureContextKey(s: Snapshot) {
  return JSON.stringify([s.welcome, s.auto.active, s.auto.runId, s.handoff,
    s.fashion, s.biryaniVideo.phase, s.biryaniVideo.generation, s.biryaniVideo.startedAt,
    s.architecture.active, s.architecture.phase, s.architecture.generation,
    s.motifs.active, s.motifs.phase, s.motifs.generation,
    s.jewels.active, s.jewels.phase, s.jewels.generation, s.interaction]);
}
export function routeGesture(s: Snapshot, event: LabGesture, now: number): GestureCommand | null {
  if (s.auto.active || now < s.interaction.pageReadyAt) return null;
  if (event.name === 'swipe-left' || event.name === 'swipe-right') {
    return canTurnPage(s, now) ? { channel: 'navigate', action: event.name === 'swipe-left' ? 'next' : 'previous' } : null;
  }
  if (event.name === 'swipe-up') return waitingForLift(s) ? { channel: 'lift', action: 'lift' } : null;
  if (s.welcome || s.handoff.phase !== 'away') return null;
  switch (activeChapter(s)) {
    case 1:
      if (event.name === 'vertical-opposite' && s.biryaniVideo.phase === 'IDLE') return { channel: 'biryani-video', action: 'separate' };
      if (event.name === 'hands-apart' && s.biryaniVideo.phase === 'STACKED') return { channel: 'biryani-video', action: 'list' };
      return null;
    case 2:
      return event.name === 'snap' && !s.fashion.exitingAt && now >= s.fashion.startedAt + 4700 && now >= s.fashion.switchedAt + 900 ? { channel: 'fashion', action: 'switch' } : null;
    case 3:
      return event.name === 'push' && ['idle', 'inside'].includes(s.architecture.phase) ? { channel: 'architecture', action: s.architecture.phase === 'idle' ? 'open' : 'return' } : null;
    case 4:
      return event.name === 'vertical-opposite' && s.motifs.phase === 'SCROLL_READY' ? { channel: 'motifs', action: 'open' } : null;
    default:
      // The source engine also emits finger-left/right for straight sweeps;
      // this chapter deliberately accepts circular swirls only.
      return s.jewels.phase === 'READY' && event.detail.startsWith('swirl ') && (event.name === 'finger-left' || event.name === 'finger-right') ? { channel: 'jewels', action: event.name === 'finger-left' ? 'left' : 'right' } : null;
  }
}
export function gestureHint(s: Snapshot, now: number) {
  if (s.auto.active) return 'Automatic sequence running';
  if (s.welcome) return 'Swipe left to open the book';
  if (waitingForLift(s)) return 'Swipe up to begin · swipe left / right to browse';
  if (s.handoff.phase === 'lifting' || s.handoff.phase === 'returning') return 'Moving between the book and gallery…';
  const reverse = reversalReady(s, now) ? ' · swipe left / right to reverse and turn the page' : '';
  switch (activeChapter(s)) {
    case 1: return s.biryaniVideo.phase === 'IDLE' ? 'Move hands vertically in opposite directions to explode the biryani' : s.biryaniVideo.phase === 'STACKED' ? 'Move hands apart horizontally to separate the ingredients' : s.biryaniVideo.phase === 'LIST' ? 'Swipe left / right to reverse and turn the page' : 'Wait for the biryani animation…';
    case 2: return now < s.fashion.startedAt + 4700 || now < s.fashion.switchedAt + 900 || s.fashion.exitingAt ? 'Wait for the dress reveal…' : 'Snap to change dresses' + reverse;
    case 3: return s.architecture.phase === 'idle' ? 'Push both hands forward to enter the doors' + reverse : s.architecture.phase === 'inside' ? 'Push both hands forward to go back' : 'Wait for the doorway animation…';
    case 4: return s.motifs.phase === 'SCROLL_READY' ? 'Move hands vertically in opposite directions to open the scroll' : reverse ? 'Swipe left / right to reverse and turn the page' : 'Wait for the scroll animation…';
    default: return s.jewels.phase === 'READY' ? 'Swirl one pointing finger left / right to rotate the jewellery' + reverse : 'Wait for the jewellery animation…';
  }
}
