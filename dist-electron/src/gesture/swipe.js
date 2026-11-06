"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwipeDetector = void 0;
// Input coordinates use the visitor's perspective, not the raw camera image.
class SwipeDetector {
    anchor = null;
    previous = null;
    direction = null;
    lockedUntil = 0;
    releaseRequired = false;
    settledSince = null;
    samples = 0;
    get armed() { return this.anchor !== null; }
    reset() {
        this.anchor = null;
        this.previous = null;
        this.direction = null;
        this.releaseRequired = false;
        this.settledSince = null;
        this.samples = 0;
    }
    update(point, now) {
        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
            this.reset();
            return null;
        }
        const previous = this.previous;
        this.previous = point;
        if (previous && (now - previous.time > 500 || Math.hypot(point.x - previous.x, point.y - previous.y) > 0.4)) {
            this.anchor = null;
            this.direction = null;
            this.releaseRequired = true;
            this.settledSince = null;
            return null;
        }
        if (now < this.lockedUntil)
            return null;
        // The cooldown handles duplicates; visitors need no precisely timed still pose.
        if (this.releaseRequired) {
            this.releaseRequired = false;
            this.settledSince = null;
        }
        if (point.y < 0.12 || point.y > 0.88) {
            this.anchor = null;
            this.direction = null;
            return null;
        }
        if (!this.anchor) {
            if (point.x > 0.55)
                this.direction = 'left';
            else if (point.x < 0.45)
                this.direction = 'right';
            else
                return null;
            this.anchor = point;
            this.samples = 1;
            return null;
        }
        const dx = point.x - this.anchor.x;
        const dy = Math.abs(point.y - this.anchor.y);
        const elapsed = now - this.anchor.time;
        this.samples++;
        const forward = this.direction === 'left' ? -dx : dx;
        // Keep the start time fresh while the visitor is holding their hand in place.
        if (Math.abs(dx) < 0.025 && dy < 0.04) {
            this.anchor = point;
            this.samples = 1;
            return null;
        }
        if (elapsed > 1200 || dy > 0.2 || forward < -0.07) {
            this.anchor = null;
            this.direction = null;
            return null;
        }
        if (forward >= 0.18 && elapsed >= 80 && forward / elapsed >= 0.00035 && this.samples >= 2 && dy < forward * 1.2) {
            const result = this.direction;
            this.anchor = null;
            this.direction = null;
            this.lockedUntil = now + 950;
            this.releaseRequired = true;
            this.settledSince = null;
            return result;
        }
        return null;
    }
}
exports.SwipeDetector = SwipeDetector;
