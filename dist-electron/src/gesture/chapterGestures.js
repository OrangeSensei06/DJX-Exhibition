"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChapterGestureDetector = exports.PINCH_RELEASE = exports.PINCH_START = exports.GESTURE_LIMITS = void 0;
const twoHandSweeps_1 = require("./twoHandSweeps");
var twoHandSweeps_2 = require("./twoHandSweeps");
Object.defineProperty(exports, "GESTURE_LIMITS", { enumerable: true, get: function () { return twoHandSweeps_2.GESTURE_LIMITS; } });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
exports.PINCH_START = 0.65, exports.PINCH_RELEASE = 0.82;
class ChapterGestureDetector {
    phase = 'book';
    sweeps = new twoHandSweeps_1.TwoHandSweeps();
    drag = null;
    dragTime = 0;
    pinching = false;
    storyReleased = false;
    completionReleased = false;
    storyHadHand = false;
    setAspectRatio(aspect) { this.sweeps.setAspectRatio(aspect); }
    get feedback() { return this.phase === 'story' ? 'Swipe left to turn the page' : ['reassembling', 'returning', 'paging'].includes(this.phase) ? 'Returning to the book…' : this.sweeps.feedback; }
    reset() {
        this.sweeps.reset();
        this.drag = null;
        this.pinching = false;
        this.storyReleased = this.completionReleased = this.storyHadHand = false;
    }
    setPhase(phase) {
        if (phase === this.phase)
            return;
        this.phase = phase;
        this.sweeps.setPhase(phase);
        this.drag = null;
        this.pinching = false;
        this.storyReleased = this.completionReleased = this.storyHadHand = false;
        // Different sweep axes separate stages without a precision pause requirement.
    }
    update(hands, time) {
        if (hands.some((hand) => ![hand.x, hand.y, hand.pinch].every(Number.isFinite))) {
            const cancelling = this.phase === 'story';
            this.reset();
            return cancelling ? { type: 'cancelGrab' } : null;
        }
        if (this.phase === 'story')
            return null;
        if (this.phase === 'complete' && !this.completionReleased) {
            if (hands.length === 0 || hands.every((hand) => hand.pinch >= exports.PINCH_RELEASE)) {
                this.completionReleased = true;
                this.sweeps.reset();
            }
            return null;
        }
        if (hands.length !== 2) {
            this.sweeps.update(hands, time);
            if (hands.length !== 1 || this.phase !== 'book') {
                this.drag = null;
                this.pinching = false;
                return null;
            }
            const hand = hands[0];
            const pinch = hand.pinch < (this.pinching ? exports.PINCH_RELEASE : exports.PINCH_START);
            if (!pinch) {
                this.drag = null;
                this.pinching = false;
                return null;
            }
            const previous = this.drag;
            const gap = time - this.dragTime;
            this.drag = hand;
            this.dragTime = time;
            this.pinching = true;
            if (!previous || gap > 550 || distance(previous, hand) > 0.3)
                return null;
            if (distance(previous, hand) < 0.002)
                return null;
            return { type: 'move', dx: (hand.x - previous.x) * 1.3, dy: (hand.y - previous.y) * 1.1 };
        }
        this.drag = null;
        this.pinching = false;
        return this.sweeps.update(hands, time);
    }
}
exports.ChapterGestureDetector = ChapterGestureDetector;
