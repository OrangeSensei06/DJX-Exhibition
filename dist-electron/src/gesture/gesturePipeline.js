"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GesturePipeline = void 0;
const swipe_1 = require("./swipe");
const chapterGestures_1 = require("./chapterGestures");
// Used by the real camera worker and the native motion-replay check, including
// context/phase changes. Tests do not bypass recognition with operator commands.
class GesturePipeline {
    swipe = new swipe_1.SwipeDetector();
    chapter = new chapterGestures_1.ChapterGestureDetector();
    context = { page: 0, phase: 'book', openedAt: 0, notBefore: 0 };
    setContext(next) {
        if (next.page !== this.context.page || next.openedAt !== this.context.openedAt || next.phase !== this.context.phase)
            this.reset();
        this.context = next;
        this.chapter.setPhase(next.phase);
    }
    reset() { this.swipe.reset(); this.chapter.reset(); }
    update(hands, time, wallTime, aspect = 1) {
        this.chapter.setAspectRatio(aspect);
        // Page turns follow landmark 0 (the wrist); finger poses cannot create a swipe.
        const hand = hands.length === 1 ? hands[0] : null;
        const point = hand ? { x: hand.wristX ?? hand.x, y: hand.wristY ?? hand.y, time } : null;
        const opening = wallTime < this.context.notBefore;
        const pageSwipe = this.context.page === 0 || !opening && (this.context.phase === 'story' || this.context.phase === 'book' && !!hand && hand.pinch >= 0.82);
        const swipe = pageSwipe ? this.swipe.update(point, time) : null;
        const gesture = this.context.page === 1 && swipe !== 'left' ? null : swipe;
        const action = this.context.page === 1 && !opening ? this.chapter.update(hands, time) : null;
        return { gesture, action, armed: this.context.page === 0 && this.swipe.armed,
            feedback: opening ? this.context.phase === 'story' ? 'Revealing the ingredients…' : 'Opening the book…' : this.context.page === 1 ? this.chapter.feedback : 'Sweep one hand left to begin' };
    }
}
exports.GesturePipeline = GesturePipeline;
