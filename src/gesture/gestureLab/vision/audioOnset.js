// Optional "Mic assist" for snaps. A finger snap lasts a few ms, which a 30-60 fps
// camera can easily miss; the sound cannot be missed. The engine only accepts an
// audio onset as a snap when a thumb-middle pinch was just seen, so claps and
// desk knocks without that hand pose are ignored.

export class AudioOnset {
  constructor(onOnset) {
    this.onOnset = onOnset;
    this.base = 0.004;
    this.last = 0;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0;
    src.connect(this.analyser);
    this.buf = new Float32Array(this.analyser.fftSize);
    this.timer = setInterval(() => this.tick(), 8);
  }

  tick() {
    this.analyser.getFloatTimeDomainData(this.buf);
    // RMS of the first difference = cheap high-pass; snaps are broadband and sharp.
    let e = 0;
    for (let i = 1; i < this.buf.length; i++) {
      const d = this.buf[i] - this.buf[i - 1];
      e += d * d;
    }
    e = Math.sqrt(e / this.buf.length);
    const now = performance.now();
    if (e > Math.max(this.base * 5, 0.03) && now - this.last > 250) {
      this.last = now;
      this.onOnset(now);
    } else {
      this.base += (e - this.base) * 0.02;
    }
  }

  stop() {
    clearInterval(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
  }
}
