"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InactivityTimer = void 0;
/** Presence is refreshed only by a validated, recent camera detection. */
class InactivityTimer {
    timeoutMs;
    lastSeen;
    constructor(now, timeoutMs = 60_000) {
        this.timeoutMs = timeoutMs;
        this.lastSeen = now;
    }
    touch(now) { this.lastSeen = now; }
    expired(now) { return now - this.lastSeen >= this.timeoutMs; }
}
exports.InactivityTimer = InactivityTimer;
