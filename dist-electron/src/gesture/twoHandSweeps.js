"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoHandSweeps = exports.GESTURE_LIMITS = void 0;
exports.GESTURE_LIMITS = {
    liftDistance: 0.055, eachHandDistance: 0.045,
    windowMs: 1800, minimumMs: 60, axisLeewayDegrees: 55,
};
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
class TwoHandSweeps {
    phase = 'book';
    history = [];
    fired = false;
    aspect = 1;
    hands = 0;
    reset() { this.history = []; this.fired = false; this.hands = 0; }
    setPhase(phase) { if (phase !== this.phase) {
        this.reset();
        this.phase = phase;
    } }
    setAspectRatio(aspect) { if (Number.isFinite(aspect) && aspect > 0)
        this.aspect = aspect; }
    get feedback() {
        const cue = this.phase === 'book' || this.phase === 'complete' ? 'Sweep both hands up ↑ ↑'
            : this.phase === 'presented' ? 'One hand up, the other down ↑ ↓'
                : this.phase === 'exploded' ? 'Sweep hands sideways, away from each other ← →' : 'Let the animation finish';
        return ['book', 'complete', 'presented', 'exploded'].includes(this.phase) && this.hands < 2 ? `Show both hands · ${cue}` : cue;
    }
    update(hands, now) {
        this.hands = hands.length;
        if (hands.length !== 2 || hands.some((hand) => !Number.isFinite(hand.x) || !Number.isFinite(hand.y))) {
            this.history = [];
            return null;
        }
        if (this.fired || !['book', 'complete', 'presented', 'exploded'].includes(this.phase))
            return null;
        const previous = this.history.at(-1);
        let pair = [...hands].sort((a, b) => a.x - b.x);
        if (previous) {
            const cost = (candidate) => distance(candidate[0], previous.hands[0]) + distance(candidate[1], previous.hands[1]);
            const reversed = [pair[1], pair[0]];
            const nearest = cost(pair) <= cost(reversed) ? pair : reversed;
            const ids = pair.map((hand) => hand.id);
            if (ids[0] && ids[1] && ids[0] !== ids[1] && previous.hands.every((hand) => hand.id && ids.includes(hand.id))) {
                const identified = previous.hands.map((hand) => pair.find((next) => next.id === hand.id));
                // Handedness can flip when a visitor rotates their palm. Prefer continuity
                // over a classification that would teleport both tracked hands.
                pair = cost(identified) <= cost(nearest) + 0.12 ? identified : nearest;
            }
            else
                pair = nearest;
            if (now - previous.time > 900 || pair.some((hand, index) => distance(hand, previous.hands[index]) > 0.85)) {
                this.history = [{ hands: pair, time: now }];
                return null;
            }
        }
        this.history = this.history.filter((sample) => now - sample.time <= exports.GESTURE_LIMITS.windowMs);
        const tangent = Math.tan(exports.GESTURE_LIMITS.axisLeewayDegrees * Math.PI / 180);
        // Small per-frame movements accumulate. Holding a hand still never erases
        // the entire starting trajectory, and no precisely timed release is required.
        for (const sample of this.history) {
            if (now - sample.time < exports.GESTURE_LIMITS.minimumMs)
                continue;
            const delta = pair.map((hand, i) => ({ x: hand.x - sample.hands[i].x, y: hand.y - sample.hands[i].y }));
            const [a, b] = delta;
            const vertical = delta.every((d) => Math.abs(d.x * this.aspect) <= Math.abs(d.y) * tangent + 0.025);
            const horizontal = delta.every((d) => Math.abs(d.y) <= Math.abs(d.x * this.aspect) * tangent + 0.025);
            let action = null;
            if (this.phase === 'book' || this.phase === 'complete') {
                if (vertical && a.y <= -exports.GESTURE_LIMITS.liftDistance && b.y <= -exports.GESTURE_LIMITS.liftDistance)
                    action = { type: this.phase === 'complete' ? 'return' : 'lift' };
            }
            else if (this.phase === 'presented') {
                // Opposite Y sweeps, independent of the initial distance between hands.
                if (vertical && Math.abs(a.y) >= exports.GESTURE_LIMITS.eachHandDistance
                    && Math.abs(b.y) >= exports.GESTURE_LIMITS.eachHandDistance && a.y * b.y < 0)
                    action = { type: 'explode' };
            }
            else if (horizontal && Math.abs(a.x) >= exports.GESTURE_LIMITS.eachHandDistance
                && Math.abs(b.x) >= exports.GESTURE_LIMITS.eachHandDistance && a.x * b.x < 0) {
                const order = Math.sign(sample.hands[1].x - sample.hands[0].x);
                if (a.x * order < 0 && b.x * order > 0)
                    action = { type: 'clear' };
            }
            if (action) {
                this.fired = true;
                this.history = [];
                return action;
            }
        }
        this.history.push({ hands: pair, time: now });
        return null;
    }
}
exports.TwoHandSweeps = TwoHandSweeps;
