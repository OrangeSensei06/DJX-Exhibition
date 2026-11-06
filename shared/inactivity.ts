/** Presence is refreshed only by a validated, recent camera detection. */
export class InactivityTimer {
  private lastSeen: number;
  constructor(now: number, readonly timeoutMs = 60_000) { this.lastSeen = now; }
  touch(now: number) { this.lastSeen = now; }
  expired(now: number) { return now - this.lastSeen >= this.timeoutMs; }
}
