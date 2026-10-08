// The looper's ear: hands the input's samples to the page in chunks, each stamped with the context
// frame it was processed at, so the page can place every sample on the song's time. It runs from the
// moment an input is chosen, recording or not, so a take can reach back before its first beat.
class Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = 2048; this.fill = 0; this.at = 0; this.peak = 0;
    this.buf = [new Float32Array(this.size), new Float32Array(this.size)];
  }
  process(inputs) {
    const inp = inputs[0];
    if (!inp || !inp.length) return true;
    const n = inp[0].length;
    if (this.fill === 0) this.at = currentFrame;
    const L = inp[0], R = inp[1] || inp[0];
    for (let i = 0; i < n; i++) {
      const l = L[i], r = R[i];
      this.buf[0][this.fill + i] = l; this.buf[1][this.fill + i] = r;
      const a = l < 0 ? -l : l, b = r < 0 ? -r : r;
      if (a > this.peak) this.peak = a; if (b > this.peak) this.peak = b;
    }
    this.fill += n;
    if (this.fill >= this.size) {
      const [l, r] = this.buf;
      this.port.postMessage({ frame: this.at, l, r, peak: this.peak }, [l.buffer, r.buffer]);
      this.buf = [new Float32Array(this.size), new Float32Array(this.size)];
      this.fill = 0; this.peak = 0;
    }
    return true;
  }
}
registerProcessor("looper-capture", Capture);
