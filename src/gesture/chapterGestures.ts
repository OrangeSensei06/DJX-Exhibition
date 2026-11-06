import type { ChapterAction, ChapterPhase } from '../../shared/protocol';
import { TwoHandSweeps } from './twoHandSweeps';
export { GESTURE_LIMITS } from './twoHandSweeps';

export interface TrackedHand { x: number; y: number; pinch: number; wristX?: number; wristY?: number; cursorX?: number; cursorY?: number; id?: string; }
const distance = (a: TrackedHand, b: TrackedHand) => Math.hypot(a.x - b.x, a.y - b.y);
export const PINCH_START = 0.65, PINCH_RELEASE = 0.82;

export class ChapterGestureDetector {
  private phase: ChapterPhase = 'book';
  private readonly sweeps = new TwoHandSweeps();
  private drag: TrackedHand | null = null;
  private dragTime = 0;
  private pinching = false;
  private storyReleased = false;
  private completionReleased = false;
  private storyHadHand = false;

  setAspectRatio(aspect: number) { this.sweeps.setAspectRatio(aspect); }
  get feedback() { return this.phase === 'story' ? 'Swipe left to turn the page' : ['reassembling', 'returning', 'paging'].includes(this.phase) ? 'Returning to the book…' : this.sweeps.feedback; }

  reset() {
    this.sweeps.reset();
    this.drag = null;
    this.pinching = false;
    this.storyReleased = this.completionReleased = this.storyHadHand = false;
  }

  setPhase(phase: ChapterPhase) {
    if (phase === this.phase) return;
    this.phase = phase;
    this.sweeps.setPhase(phase);
    this.drag = null;
    this.pinching = false;
    this.storyReleased = this.completionReleased = this.storyHadHand = false;
    // Different sweep axes separate stages without a precision pause requirement.
  }

  update(hands: TrackedHand[], time: number): ChapterAction | null {
    if (hands.some((hand) => ![hand.x, hand.y, hand.pinch].every(Number.isFinite))) {
      const cancelling = this.phase === 'story';
      this.reset();
      return cancelling ? { type: 'cancelGrab' } : null;
    }
    if (this.phase === 'story') return null;
    if (this.phase === 'complete' && !this.completionReleased) {
      if (hands.length === 0 || hands.every((hand) => hand.pinch >= PINCH_RELEASE)) {
        this.completionReleased = true;
        this.sweeps.reset();
      }
      return null;
    }
    if (hands.length !== 2) {
      this.sweeps.update(hands, time);
      if (hands.length !== 1 || this.phase !== 'book') { this.drag = null; this.pinching = false; return null; }
      const hand = hands[0];
      const pinch = hand.pinch < (this.pinching ? PINCH_RELEASE : PINCH_START);
      if (!pinch) { this.drag = null; this.pinching = false; return null; }
      const previous = this.drag;
      const gap = time - this.dragTime;
      this.drag = hand;
      this.dragTime = time;
      this.pinching = true;
      if (!previous || gap > 550 || distance(previous, hand) > 0.3) return null;
      if (distance(previous, hand) < 0.002) return null;
      return { type: 'move', dx: (hand.x - previous.x) * 1.3, dy: (hand.y - previous.y) * 1.1 };
    }

    this.drag = null;
    this.pinching = false;
    return this.sweeps.update(hands, time);
  }
}
