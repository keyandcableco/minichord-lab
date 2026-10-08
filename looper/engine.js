/* ============================================================================
 * engine.js: the looper's clock, metronome, recorder and players
 *
 * Time. Everything is placed on the audio context's clock as it is HEARD: a
 * sound started at context time T comes out of the speakers (or the
 * minichord's headphones, with its USB audio set to play the computer's
 * sound) when the clock heard there reads T. A note played on the minichord
 * at the moment a click is heard gets that click's time:
 *   - MIDI from the minichord comes stamped in performance time, which the
 *     context's output timestamp turns into heard context time;
 *   - the minichord's sound over USB audio reaches the page later than it
 *     was played, by the output's latency (the click had to come out first)
 *     and the input's (the sound has to come back in): what the page heard
 *     at processing time p was played at p - outLat - inLat.
 * The input latency is measured (calibrate), or taken from the browser.
 *
 * The transport counts unwrapped beats from where playing began (negative
 * through a count-in); model.passes() folds them onto the song's loop.
 * A scheduler, every 25 ms, places what falls due in the next 120 ms:
 * metronome clicks, clip audio (one source per clip per pass), MIDI clips
 * (the browser's piano, the minichord, or any MIDI output) and MIDI clock.
 * Any change to the song while playing cancels what was placed and places it
 * again from the moment heard, the old and new sources crossfading.
 *
 * Recording keeps a tape: the input from a little before the take's first
 * beat, and the MIDI with it. Each pass of the loop the take crosses becomes
 * a take (a source) of its own and a clip, once the loop's end has been heard;
 * the last few hundredths of a second are still arriving then, so a clip
 * playing straight after places what it has and the rest when it comes.
 * ========================================================================== */
import { passes, songBeat, notesOf, clipNotes, newSource, newTrack, uid, hasLoop, layers } from "./model.js";
import { Piano } from "../core/sound.js";

const LOOKAHEAD = 0.12, TICK = 25, PREROLL = 0.35, TAIL_MAX = 3, RING = 12;

export class Engine extends EventTarget {
  constructor() {
    super();
    this.ctx = null; this.song = null; this.history = null;
    this.state = "stopped";            // stopped, playing
    this.playhead = 0;                 // song beat, while stopped
    this.audio = new Map();            // source id -> {l, r, frames, complete, buffer, built}
    this.inLat = null;                 // measured input latency, s (null: the browser's)
    this.offsetMs = 0;                 // the player's own nudge
    this.level = 0; this.midiSeen = 0;
    this.ring = [];                    // recent input chunks
    this.midiRing = [];                // recent MIDI from the minichord
    this.rec = null;                   // the take being recorded
    this.armWait = null;               // a punch in waiting for its beat
    this.live = [];                    // placed sources: {node, gain, start, stop, kind}
    this.pending = [];                 // clip pieces waiting for their take's last samples
    this.held = new Map();             // MIDI notes sent and not yet ended: "out|status|note" -> {out, data}
    this.clockA = null; this.outLat = 0.03;
    this.mc = null; this.clockOut = false;
    this.monitorOn = false;
  }

  // ---------- setting up ----------
  /** from a click: browsers only allow sound after one */
  async start() {
    if (this.ctx) { await this.ctx.resume(); return; }
    const linux = /Linux/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent);
    const ctx = this.ctx = new AudioContext({ latencyHint: linux ? "playback" : "interactive" });
    this.master = ctx.createGain(); this.master.connect(ctx.destination);
    this.clickBus = ctx.createGain(); this.clickBus.connect(ctx.destination);
    this.monitor = ctx.createGain(); this.monitor.gain.value = 0; this.monitor.connect(ctx.destination);
    this.buses = new Map();
    await ctx.audioWorklet.addModule(new URL("./capture-worklet.js", import.meta.url));
    this.piano = new Piano(); this.piano.ctx = ctx; this.piano.out = this.master; this.piano._load();
    await ctx.resume();
    this._timer = setInterval(() => this._tick(), TICK);
    this._clock();
  }
  get sampleRate() { return this.ctx ? this.ctx.sampleRate : 48000; }

  /** the minichord's sound (or any input): echo cancelling, noise suppression and gain control all off */
  async openInput(deviceId) {
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    if (this.inNode) { this.inNode.disconnect(); this.inNode = null; }
    if (deviceId === "none") { this.inputLabel = ""; return null; }
    const audio = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 2, latency: 0 };
    if (deviceId) audio.deviceId = { exact: deviceId };
    const stream = this.stream = await navigator.mediaDevices.getUserMedia({ audio });
    const track = stream.getAudioTracks()[0], set = track.getSettings ? track.getSettings() : {};
    this.inputLabel = track.label; this.inputId = set.deviceId;
    this.browserInLat = typeof set.latency === "number" ? set.latency : 0.01;
    const src = this.ctx.createMediaStreamSource(stream);
    const cap = this.capture || (this.capture = new AudioWorkletNode(this.ctx, "looper-capture", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 2, channelCountMode: "explicit" }));
    if (!this._capWired) {
      cap.port.onmessage = e => this._chunk(e.data);
      const sink = this.ctx.createGain(); sink.gain.value = 0; cap.connect(sink).connect(this.ctx.destination);
      this._capWired = true;
    }
    src.connect(cap); src.connect(this.monitor);
    this.inNode = src;
    return track.label;
  }
  setMonitor(on) { this.monitorOn = on; if (this.monitor) this.monitor.gain.value = on ? 1 : 0; }
  async inputs() {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter(d => d.kind === "audioinput");
  }
  async outputs() {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter(d => d.kind === "audiooutput");
  }
  async setOutput(id) { if (this.ctx && this.ctx.setSinkId) await this.ctx.setSinkId(id === "default" ? "" : id); }

  /** the input's latency in use, s */
  get inputLatency() { return (this.inLat ?? this.browserInLat ?? 0.01) + this.offsetMs / 1000; }

  // ---------- the clock as heard ----------
  _clock() {
    const ctx = this.ctx; if (!ctx) return;
    const ts = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
    if (ts && ts.contextTime > 0 && ts.performanceTime > 0) {
      const a = ts.contextTime - ts.performanceTime / 1000;
      this.clockA = this.clockA == null || Math.abs(a - this.clockA) > 0.05 ? a : this.clockA + (a - this.clockA) * 0.1;
    } else if (this.clockA == null) {
      return;
    }
    const lat = ctx.currentTime - this.heardAt(performance.now());
    if (lat > 0 && lat < 1) this.outLat += (lat - this.outLat) * 0.1;
  }
  /** heard context time at a performance time (ms) */
  heardAt(perf) {
    if (this.clockA == null) return this.ctx.currentTime - (this.ctx.baseLatency || 0) - (this.ctx.outputLatency || 0) + (perf - performance.now()) / 1000;
    return this.clockA + perf / 1000;
  }
  perfAt(t) { return this.clockA == null ? performance.now() + (t - this.ctx.currentTime) * 1000 : (t - this.clockA) * 1000; }
  get heardNow() { return this.ctx ? this.heardAt(performance.now()) : 0; }

  // ---------- transport ----------
  get spb() { return 60 / this.song.bpm; }
  uAt(t) { return (t - this.t0) / this.spb; }
  tAt(u) { return this.t0 + u * this.spb; }
  /** where the song is, as heard: {u, beat, countIn} */
  where() {
    if (this.state !== "playing") return { u: 0, beat: this.playhead, countIn: 0 };
    const u = this.uAt(this.heardNow);
    return { u, beat: u < 0 ? this.from : songBeat(this.song, this.from, u), countIn: u < 0 ? -u : 0 };
  }

  /** play from a song beat, after a count-in of so many beats */
  play(from = this.playhead, countIn = 0) {
    if (!this.ctx) return;
    if (this.state === "playing") this._silence();
    this.from = from; this.state = "playing";
    const lead = Math.max(0.08, this.outLat + 0.05);
    this.t0 = this.ctx.currentTime + lead + countIn * this.spb;
    this.placedU = -countIn; this.countBeats = countIn;
    this._midiInOn();
    if (this.clockOut) this._send(this._clockPort(), [0xFA], this.tAt(0));
    this._tick();
    this._emit("state");
  }
  stop() {
    if (this.state !== "playing") return;
    const w = this.where();
    if (this.rec) this._endTake(Math.max(this.rec.uStart, w.u), true);
    this.armWait = null;
    this._silence();
    if (this.clockOut) this._send(this._clockPort(), [0xFC]);
    this.state = "stopped";
    this.playhead = w.countIn ? this.from : w.beat;
    this._midiInRestore();
    this._emit("state");
  }
  seek(beat) {
    if (this.state === "playing") { this._silence(); this.from = beat; this.t0 = this.ctx.currentTime + 0.05; this.placedU = 0; this._tick(); }
    else this.playhead = beat;
    this._emit("state");
  }
  /** the song changed while playing: place everything again from now */
  changed() {
    if (this.state !== "playing" || !this.ctx) return;
    const t = this.ctx.currentTime + 0.03;
    this._silence(t);
    this.placedU = Math.max(this.uAt(t), -this.countBeats);
    this._restart = true;
    this._tick();
  }
  /** the tempo changed: keep the place, re-anchor the beats */
  retempo(oldBpm) {
    if (this.state !== "playing") return;
    const t = this.ctx.currentTime + 0.03, u = (t - this.t0) / (60 / oldBpm);
    this.t0 = t - u * this.spb;
    this.changed();
  }

  // ---------- recording ----------
  get armedTrack() { return this.song.tracks.find(t => t.armed) || null; }
  /** where the song was, as heard, at a performance time (ms) */
  whereAt(perf) {
    if (this.state !== "playing") return this.where();
    const u = this.uAt(this.heardAt(perf));
    return { u, beat: u < 0 ? this.from : songBeat(this.song, this.from, u), countIn: u < 0 ? -u : 0 };
  }
  /** the record button (pressed at performance time `at`, or now): start, punch in, punch out, or close the first loop */
  record(at) {
    const song = this.song;
    if (!this.armedTrack) { const t = song.tracks[0] || newTrack(0); if (!song.tracks.length) song.tracks.push(t); t.armed = true; }
    if (this.state !== "playing") {
      const from = hasLoop(song) && song.loop.on ? song.loop.start : this.playhead;
      this.play(from, song.countIn * song.beatsPerBar);
      this._beginTake(0);
      return "count";
    }
    if (this.armWait) { this.armWait = null; this._emit("state"); return "cancel"; }
    const w = at != null ? this.whereAt(at) : this.where();
    if (this.rec) {
      if (this.rec.uEnd != null) return "closing";
      if (this.rec.first && !this.rec.looped) {
        // the first take sets the loop: its length rounds to whole bars
        const bar = song.beatsPerBar, len = Math.max(bar, Math.round((w.u - this.rec.uStart) / bar) * bar);
        this.rec.uEnd = this.rec.uStart + len;
        this.rec.closesLoop = true;
        this._closeLoop(this.rec, len);
      } else {
        this.rec.uEnd = Math.max(w.u, this._punchAt(w.u, true));
      }
      this._emit("state");
      return "out";
    }
    const punch = w.u < 0 ? 0 : this._punchAt(w.u, false);
    if (punch - w.u < 0.05 && song.punch === "now") { this._beginTake(w.u); return "in"; }
    this.armWait = { u: punch };
    this._emit("state");
    return "wait";
  }
  /** the unwrapped beat a punch lands on, after u */
  _punchAt(u, out) {
    const song = this.song, mode = song.punch;
    if (mode === "now") return u;
    const step = mode === "beat" ? 1 : mode === "bar" ? song.beatsPerBar : 0;
    if (mode === "loop") {
      const p = passes(song, this.from, u, u + 1e-6)[0];
      return p && p.whole ? p.whole.u1 : Math.ceil(u / song.beatsPerBar) * song.beatsPerBar;
    }
    // the next grid line in song beats, from this pass
    const s = songBeat(song, this.from, u), next = Math.ceil((s + (out ? 0.1 : 0.05)) / step) * step;
    return u + (next - s);
  }
  _beginTake(u) {
    const track = this.armedTrack;
    const rec = this.rec = {
      trackId: track.id, mode: track.record, uStart: u, uEnd: null, looped: hasLoop(this.song) && this.song.loop.on,
      tape: null, midi: [], cut: u, tracks: [track.id],
      first: !hasLoop(this.song),             // no loop yet: this take sets it
    };
    // the tape starts a little before the take, from the input heard so far, and the MIDI with it
    rec.tStart = this.tAt(u);
    this._tapeFrom(rec, rec.tStart - PREROLL);
    rec.midi = this.midiRing.filter(e => e.t >= rec.tStart - PREROLL);
    this.armWait = null;
    this._emit("state");
  }
  _tapeFrom(rec, t) {
    rec.tape = { t0: null, l: [], r: [], frames: 0, want: t };
    for (const c of this.ring) this._tape(rec, c);
  }
  _tape(rec, c) {
    const tp = rec.tape, sr = this.sampleRate, n = c.l.length;
    if (tp.t0 == null) {
      if (c.t + n / sr <= tp.want) return;
      tp.peak = 0;
      const skip = Math.max(0, Math.round((tp.want - c.t) * sr));
      tp.t0 = c.t + skip / sr;
      tp.l.push(c.l.subarray(skip)); tp.r.push(c.r.subarray(skip)); tp.frames += n - skip;
      return;
    }
    tp.l.push(c.l); tp.r.push(c.r); tp.frames += n;
    if (c.peak > tp.peak) tp.peak = c.peak;
    if (tp.l.length > 600) this._trimTape(rec);
  }
  /** lets go of the start of a long tape, once no take still being cut from it needs it */
  _trimTape(rec) {
    const tp = rec.tape, sr = this.sampleRate;
    let need = Math.round((this.tAt(rec.cut) - PREROLL - 1 - tp.t0) * sr);
    for (const a of this.audio.values()) if (a.tape === tp && !a.complete) need = Math.min(need, a.from);
    tp.dropped = tp.dropped || 0;
    while (tp.l.length > 1 && tp.dropped + tp.l[0].length <= need) { tp.dropped += tp.l[0].length; tp.l.shift(); tp.r.shift(); }
  }
  _closeLoop(rec, len) {
    const song = this.song;
    this.history && this.history.mark(song, "Record the first loop");
    rec.marked = true;                         // the take's clip undoes with it
    const s0 = songBeat(song, this.from, rec.uStart);
    song.loop = { on: true, start: s0, end: s0 + len };
    rec.looped = true;
    this._emit("song");
    this.changed();
  }

  /** the take ends at unwrapped beat u: its last pass becomes a take, with the sound ringing on after */
  _endTake(u, stopping) {
    const rec = this.rec; if (!rec) return;
    if (rec.first && !rec.looped && !rec.closesLoop) {
      // stopped during a first take: it still makes a loop, rounded to whole bars
      const bar = this.song.beatsPerBar, len = Math.max(bar, Math.round((u - rec.uStart) / bar) * bar);
      if (u - rec.uStart < 0.25) { this.rec = null; return; }
      const s0 = songBeat(this.song, this.from, rec.uStart);
      this.history && this.history.mark(this.song, "Record the first loop");
      rec.marked = true;
      this.song.loop = { on: true, start: s0, end: s0 + len };
      u = rec.uStart + len;
      rec.closesLoop = true;
    }
    this._cut(rec, rec.cut, u, true);
    this.rec = null;
    if (stopping) this._emit("song");
  }

  /**
   * Cuts the tape from unwrapped beat a to b into a take on the track recording, and a clip of it.
   * last: nothing is recorded after it on this track, so the sound ringing on is kept with it.
   */
  _cut(rec, a, b, last) {
    if (b - a < 0.05) return;
    // stopped just after a later pass began: a sliver, not a take, and the track made for it goes too
    if (last && b - a < 0.5 && a > rec.uStart + 1e-6) {
      const song = this.song, made = rec.made && rec.made.has(rec.trackId) && !song.clips.some(c => c.trackId === rec.trackId);
      if (made) {
        const i = song.tracks.findIndex(t => t.id === rec.trackId);
        song.tracks.splice(i, 1);
        const back = song.tracks.find(t => t.id === rec.tracks[rec.tracks.length - 2]) || song.tracks[0];
        song.tracks.forEach(t => t.armed = t === back);
      }
      this._emit("song");
      return;
    }
    const song = this.song, sr = this.sampleRate, spb = this.spb;
    const trackId = rec.trackId, track = song.tracks.find(t => t.id === trackId);
    const ta = this.tAt(a), tb = this.tAt(b), t0 = ta - PREROLL;
    const midi = rec.mode === "audio" ? [] : rec.midi.filter(e => e.t >= t0 && e.t < tb).map(e => ({ t: e.t - t0, p: e.p, d: e.d }));
    // notes still held at the cut end there, and start again in the next take
    const held = notesOf({ midi, mpe: null }, Infinity).filter(n => n.t1 === Infinity);
    for (const n of held) midi.push({ t: tb - t0, p: n.port, d: [0x80 | n.ch, n.note, 0] });
    if (!last) rec.midi = rec.midi.filter(e => e.t >= tb - PREROLL).concat(held.map(n => ({ t: tb, p: n.port, d: [0x90 | n.ch, n.note, n.vel] })));
    const audio = rec.mode !== "midi" && rec.tape && rec.tape.t0 != null;
    const src = newSource({ sampleRate: sr, frames: audio ? Math.round((tb - t0) * sr) : 0, preroll: PREROLL, bpm: song.bpm, midi, mpe: this._mpe() });
    src.trackName = track ? track.name : "";
    song.sources[src.id] = src;
    if (audio) {
      const from = Math.round((t0 - rec.tape.t0) * sr);
      const a0 = { tape: rec.tape, from, frames: src.frames, tail: last ? Math.round(TAIL_MAX * sr) : 0, complete: false };
      this.audio.set(src.id, a0);
      this.pendingTakes = (this.pendingTakes || []).concat([{ id: src.id, until: tb + (last ? TAIL_MAX : 0) }]);
    }
    const s0 = songBeat(song, this.from, a);
    if (!rec.marked) this.history && this.history.mark(song, "Record");
    rec.marked = false;
    const clip = { id: uid("c"), trackId, sourceId: src.id, start: s0, length: b - a, offset: 0, gain: 1, muted: false, transpose: 0, created: Date.now(), name: "" };
    song.clips.push(clip);
    if (track && !audio && track.play === "audio") track.play = "midi";
    rec.cut = b;
    this._emit("take", { clip, source: src });
    this._emit("song");
    if (this.state === "playing") this.changed();
  }
  _mpe() {
    const mc = this.mc; if (!mc) return null;
    return { on: !!mc.mpe, master: mc.masterCh };
  }

  // ---------- the input ----------
  _chunk(c) {
    const sr = this.sampleRate;
    // processed at frame c.frame; played that long before, through the output and back in
    c.t = c.frame / sr - this.outLat - this.inputLatency;
    this.level = Math.max(c.peak, this.level * 0.85);
    this.ring.push(c);
    while (this.ring.length && this.ring[0].t < c.t - RING) this.ring.shift();
    if (this.rec && this.rec.mode !== "midi" && this.rec.tape) this._tape(this.rec, c);
    if (this.calib) this.calib.chunks.push(c);
    this._grow();
  }
  /** takes whose last samples have now arrived */
  _grow() {
    if (!this.pendingTakes || !this.pendingTakes.length) return;
    const now = this.ring.length ? this.ring[this.ring.length - 1].t + 2048 / this.sampleRate : 0;
    const left = [];
    for (const p of this.pendingTakes) {
      const a = this.audio.get(p.id); if (!a || a.complete) continue;
      const quiet = a.tail && now > p.until - TAIL_MAX + 0.4 && this._quietSince(p.until - TAIL_MAX, Math.max(0.0005, (a.tape.peak || 0) / 60));
      if (now >= p.until || quiet) this._finish(p.id, quiet ? now : p.until);
      else left.push(p);
    }
    this.pendingTakes = left;
    if (this.pending.length) this._tickPending();
  }
  /** the input has been quiet (under level, 36 dB down on the take's loudest) for the last 0.3 s after time t */
  _quietSince(t, level) {
    const ring = this.ring, end = ring.length ? ring[ring.length - 1].t : 0;
    if (end < t + 0.3) return false;
    for (let i = ring.length - 1; i >= 0 && ring[i].t > end - 0.3; i--) if (ring[i].peak > level) return false;
    return true;
  }
  _finish(id, until) {
    const a = this.audio.get(id), tp = a.tape, sr = this.sampleRate, src = this.song.sources[id];
    const end = Math.min(tp.frames, Math.round((until - tp.t0) * sr));
    const frames = Math.max(a.frames, end - a.from);
    const l = new Float32Array(frames), r = new Float32Array(frames);
    copyTape(tp, a.from, frames, l, r);
    const tail = (frames - a.frames) / sr;
    // fade the tail's last 50 ms, so a take cut while still sounding doesn't click
    const f = Math.min(frames - a.frames, Math.round(0.05 * sr));
    for (let i = 0; i < f; i++) { const g = i / f; l[frames - 1 - i] *= g; r[frames - 1 - i] *= g; }
    this.audio.set(id, { l, r, frames, complete: true, buffer: null });
    if (src) { src.frames = frames; src.tail = Math.max(0, tail); }
    this._emit("audio", { id });
  }
  /** a take's audio as an AudioBuffer, built from what has arrived */
  bufferOf(id) {
    const a = this.audio.get(id); if (!a) return null;
    if (a.complete) {
      if (!a.buffer) { a.buffer = this.ctx.createBuffer(2, Math.max(1, a.frames), this.sampleRate); a.buffer.copyToChannel(a.l, 0); a.buffer.copyToChannel(a.r, 1); }
      return { buffer: a.buffer, have: a.frames, complete: true };
    }
    const have = Math.max(0, Math.min(a.frames, a.tape.frames - a.from));
    if (a.built && a.built.have === have) return a.built;
    const l = new Float32Array(Math.max(1, have)), r = new Float32Array(Math.max(1, have));
    copyTape(a.tape, a.from, have, l, r);
    const buffer = this.ctx.createBuffer(2, Math.max(1, have), this.sampleRate);
    buffer.copyToChannel(l, 0); buffer.copyToChannel(r, 1);
    return a.built = { buffer, have, complete: false };
  }
  /** a take's audio, loaded from the store */
  setAudio(id, l, r) { this.audio.set(id, { l, r: r || l, frames: l.length, complete: true, buffer: null }); }
  audioDone(id) { const a = this.audio.get(id); return !a || a.complete; }

  // ---------- MIDI in ----------
  attachMidi(mc, role) {
    this.mc = mc; this.portRole = role;
    const seen = new WeakSet();
    const wire = () => {
      for (const i of mc.inputs) {
        if (seen.has(i)) continue; seen.add(i);
        i.addEventListener("midimessage", e => this._midi(role(i, mc.inputs), e.data, e.timeStamp));
      }
    };
    mc.addEventListener("ports", wire); wire();
  }
  _midi(role, d, stamp) {
    const st = d[0];
    if (st >= 0xF0) return;
    const type = st & 0xF0;
    // control changes 85 to 90 work the looper, as they work the firmware's own: from a foot
    // controller, or from the minichord's double tap (double tap value 7, firmware 37 on), whose
    // value says how long ago the second tap landed, 4 ms a step down from 127
    if (type === 0xB0 && d[1] >= 85 && d[1] <= 90) {
      if (d[2] < 64) return;
      const at = (stamp || performance.now()) - (role ? (127 - d[2]) * 4 : 0);
      this._emit("remote", { action: d[1] - 84, at });
      return;
    }
    if (!role) return;
    if (type === 0x90 && d[2] > 0) this.midiSeen = performance.now();
    const t = this.heardAt(stamp || performance.now());
    if (this.calib) this.calib.notes.push({ t, d: [...d] });
    const e = { t, p: role, d: [...d] };
    // the last few seconds, for a take that begins a moment ago (a punch in placed at the tap that made it)
    this.midiRing.push(e);
    while (this.midiRing.length && this.midiRing[0].t < t - 3) this.midiRing.shift();
    if (this.rec && this.rec.mode !== "audio") this.rec.midi.push(e);
  }

  // ---------- calibrating the input ----------
  /**
   * Plays clicks; the player plays a chord on each. Every note's MIDI arrives on time; its sound,
   * over USB audio, arrives later by the input's latency: the median gap is it.
   */
  async calibrate(beats = 8) {
    if (!this.ctx || !this.inNode) return { error: "Choose the minichord's audio input first." };
    const old = this.inLat; this.inLat = 0;
    this.calib = { chunks: [], notes: [] };
    const t0 = this.ctx.currentTime + 0.3, gap = 0.6;
    for (let i = 0; i < beats + 1; i++) this._click(t0 + i * gap, i === 0, 1);
    await new Promise(r => setTimeout(r, (0.3 + (beats + 1.5) * gap) * 1000));
    const { chunks, notes } = this.calib; this.calib = null;
    const ons = notes.filter(n => (n.d[0] & 0xF0) === 0x90 && n.d[2] > 0).map(n => n.t);
    const firsts = ons.filter((t, i) => i === 0 || t - ons[i - 1] > 0.15);
    const gaps = [];
    for (const t of firsts) { const o = onsetAfter(chunks, t - 0.02, t + 0.3, this.sampleRate); if (o != null) gaps.push(o - t); }
    if (gaps.length < 3) { this.inLat = old; return { error: gaps.length ? "Too few notes were heard on the audio input. Pluck a harp string on each click, letting it die away." : "Nothing was heard on the audio input. Is it the minichord, turned up?", found: gaps.length }; }
    gaps.sort((a, b) => a - b);
    const m = gaps[gaps.length >> 1];
    this.inLat = Math.max(0, m);
    const late = firsts.map(t => { const k = Math.round((t - t0) / gap); return t - (t0 + k * gap); }).sort((a, b) => a - b);
    return { latency: this.inLat, found: gaps.length, spread: gaps[gaps.length - 1] - gaps[0], playerLate: late[late.length >> 1] };
  }

  // ---------- the scheduler ----------
  _tick() {
    if (!this.ctx) return;
    this._clock();
    const song = this.song;
    if (this.state !== "playing" || !song) { this._emit("tick"); return; }
    const w = this.where();
    // a punch in reached
    if (this.armWait && w.u >= this.armWait.u - 0.001) this._beginTake(this.armWait.u);
    // the take crossing the loop's end, or reaching where it was told to stop
    if (this.rec && w.u >= 0) this._recProgress(w.u);
    const ub = this.uAt(this.ctx.currentTime + LOOKAHEAD), ua = this.placedU;
    if (ub > ua) {
      this._place(ua, ub, this._restart);
      this._restart = false;
      this.placedU = ub;
    }
    this._emit("tick");
  }
  _recProgress(u) {
    const rec = this.rec, song = this.song;
    // where this pass of the take ends: where it was told to (a punch out, or the first loop
    // closing), or the loop's end
    let end = null, forced = false;
    if (rec.uEnd != null && u >= rec.uEnd) { end = rec.uEnd; forced = !rec.closesLoop; }
    else if (rec.looped && !rec.closesLoop) {
      const p = passes(song, this.from, rec.cut, rec.cut + 1e-6)[0];
      if (p && p.whole && u >= p.whole.u1 && !(rec.uEnd != null && rec.uEnd <= p.whole.u1)) end = p.whole.u1;
    }
    if (end == null) return;
    rec.uEnd = null; rec.closesLoop = false;
    const mode = forced ? "play" : song.passEnd;
    if (mode === "play") { this._cut(rec, rec.cut, end, true); this.rec = null; this._emit("state"); return; }
    if (mode === "next") {
      this._cut(rec, rec.cut, end, true);
      const i = song.tracks.findIndex(t => t.id === rec.trackId);
      let next = song.tracks[i + 1];
      if (!next) { next = newTrack(song.tracks.length); song.tracks.push(next); (rec.made || (rec.made = new Set())).add(next.id); }
      song.tracks.forEach(t => t.armed = t === next);
      rec.trackId = next.id; rec.mode = next.record; rec.tracks.push(next.id);
      this._emit("song"); this._emit("state");
      return;
    }
    this._cut(rec, rec.cut, end, false);            // overdub: the next pass is another layer
  }

  /** places what falls between unwrapped beats ua and ub */
  _place(ua, ub, restart) {
    const song = this.song, spb = this.spb, met = song.metronome;
    const recording = !!this.rec || !!this.armWait || ua < 0;
    // the metronome, and the count-in
    if (met.on && (met.when === "always" || recording)) {
      const sub = met.sub || 1;
      for (let k = Math.ceil(ua * sub - 1e-9); k < ub * sub - 1e-9; k++) {
        const u = k / sub, t = this.tAt(u);
        if (t < this.ctx.currentTime) continue;
        if (k % sub) { this._click(t, false, 0.45); continue; }
        const beat = u < 0 ? u + this.countBeats : Math.round(songBeat(song, this.from, u) - song.loop.start * (hasLoop(song) && song.loop.on ? 1 : 0));
        const accent = met.accent && ((beat % song.beatsPerBar) + song.beatsPerBar) % song.beatsPerBar === 0;
        this._click(t, accent, 1);
      }
    }
    // MIDI clock, 24 a beat
    if (this.clockOut) {
      const port = this._clockPort();
      for (let k = Math.ceil(Math.max(0, ua) * 24 - 1e-9); k < ub * 24 - 1e-9; k++) this._send(port, [0xF8], this.tAt(k / 24));
    }
    if (ub <= 0) return;
    const a = Math.max(0, ua);
    const audible = this._audible();
    for (const p of passes(song, this.from, a, ub)) {
      // in this pass, song beat s plays at unwrapped p.u0 + (s - p.s0); the pass runs lo to hi
      const lo = p.whole ? p.whole.u0 : 0, hi = p.whole ? p.whole.u1 : Infinity;
      const under = restart && p.u0 === a;          // a restart places what's already under way
      for (const c of song.clips) {
        const track = song.tracks.find(t => t.id === c.trackId);
        if (!track || c.muted || !audible.has(track.id)) continue;
        const end = p.u0 + (c.start + c.length - p.s0);
        const cu0 = p.u0 + (c.start - p.s0), cu1 = Math.min(end, hi), startU = Math.max(cu0, lo);
        if (cu1 <= startU) continue;
        let at;
        if (startU >= p.u0 && startU < p.u1) at = startU;
        else if (under && startU < p.u0 && cu1 > p.u0) at = p.u0;
        else continue;
        if (track.play === "midi") this._placeMidi(c, track, at, cu1, p);
        else this._placeAudio(c, track, at, cu0, cu1, end <= hi + 1e-9);
      }
    }
  }
  _audible() {
    const tr = this.song.tracks, solo = tr.some(t => t.solo);
    return new Set(tr.filter(t => !t.mute && (!solo || t.solo)).map(t => t.id));
  }
  bus(track) {
    let b = this.buses.get(track.id);
    if (!b) {
      const g = this.ctx.createGain(), pan = this.ctx.createStereoPanner();
      g.connect(pan).connect(this.master);
      b = { g, pan }; this.buses.set(track.id, b);
    }
    return b;
  }
  /** track volumes, pans, mutes and solos, at once */
  mix() {
    if (!this.ctx) return;
    const audible = this._audible();
    for (const t of this.song.tracks) {
      const b = this.bus(t), v = audible.has(t.id) ? t.volume : 0;
      b.g.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01);
      b.pan.pan.setTargetAtTime(t.pan, this.ctx.currentTime, 0.01);
    }
  }

  _placeAudio(c, track, at, cu0, cu1, ringsOn) {
    const src = this.song.sources[c.sourceId]; if (!src || !src.frames) return;
    const got = this.bufferOf(c.sourceId); if (!got) return;
    const sr = src.sampleRate, srcSpb = 60 / (src.bpm || this.song.bpm);
    // seconds into the take: its preroll, then the clip's offset, then how far into the clip this starts
    const into = src.preroll + c.offset * srcSpb + (at - cu0) * this.spb;
    const when = this.tAt(at), dur = (cu1 - at) * this.spb;
    let t = when, off = into;
    if (t < this.ctx.currentTime) { off += this.ctx.currentTime - t; t = this.ctx.currentTime; }
    const end = when + dur;
    if (off >= src.frames / sr) return;
    const out = this.bus(track).g;
    const tail = ringsOn && track.tail ? Math.min(src.tail || 0, TAIL_MAX) : 0;
    this._source(got, t, off, end - t, out, c.gain, tail, c.sourceId);
  }
  _source(got, t, off, dur, out, gain, tail, sourceId) {
    const ctx = this.ctx, sr = got.buffer.sampleRate;
    const haveS = got.have / sr;
    const play = Math.min(dur + tail, haveS - off);
    if (play > 0.001) {
      const n = ctx.createBufferSource(); n.buffer = got.buffer;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.004);
      // at the clip's end: a quick fade, or the take's tail ringing on
      const stopAt = t + Math.min(dur, play);
      if (tail > 0 && play > dur) { g.gain.setValueAtTime(gain, stopAt); g.gain.linearRampToValueAtTime(0, t + play); }
      else { g.gain.setValueAtTime(gain, Math.max(t + 0.004, stopAt - 0.004)); g.gain.linearRampToValueAtTime(0, stopAt); }
      n.connect(g).connect(out);
      n.start(t, off, play + 0.01);
      const rec = { node: n, gain: g, start: t, stop: t + play, kind: "audio" };
      this.live.push(rec);
      n.onended = () => { const i = this.live.indexOf(rec); if (i >= 0) this.live.splice(i, 1); };
    }
    // the take is still arriving: the rest follows when it has
    if (!got.complete && off + dur > haveS) {
      const from = Math.max(off, haveS);
      this.pending.push({ sourceId, t: t + (from - off), off: from, dur: off + dur - from, out, gain, tail });
    }
  }
  _tickPending() {
    const keep = [];
    for (const p of this.pending) {
      if (this.state !== "playing") continue;
      const got = this.bufferOf(p.sourceId); if (!got) continue;
      const sr = got.buffer.sampleRate;
      if (got.have / sr <= p.off + 0.001 && !got.complete) { keep.push(p); continue; }
      let { t, off, dur } = p;
      if (t < this.ctx.currentTime) { const late = this.ctx.currentTime - t; t += late; off += late; dur -= late; }
      if (dur + p.tail > 0) this._source(got, t, off, dur, p.out, p.gain, got.complete ? p.tail : 0, p.sourceId);
    }
    this.pending = keep;
  }

  _placeMidi(c, track, at, cu1, p) {
    for (const n of clipNotes(this.song, c)) {
      const nu0 = p.u0 + (n.b0 - p.s0), nu1 = Math.min(p.u0 + (n.b1 - p.s0), cu1);
      if (nu0 < at - 1e-9 || nu0 >= cu1) continue;                // under way already: left out
      const t0 = this.tAt(nu0), t1 = this.tAt(nu1);
      if (t0 < this.ctx.currentTime - 0.01) continue;
      this._note(track, n, t0, t1, c.gain);
    }
  }
  /** a MIDI clip's note, to where its track plays */
  _note(track, n, t0, t1, gain) {
    if (track.target === "piano") {
      this._pianoNote(this.bus(track).g, n.pitch, t0, Math.max(0.05, t1 - t0), n.vel * gain, n.port === "harp");
      return;
    }
    const outs = this.mc && this.mc.midi ? [...this.mc.midi.outputs.values()] : [];
    if (track.target === "minichord") {
      const mc = this.mc; if (!mc) return;
      const single = mc.params[108] === 1;
      const name = n.port === "harp" && !single ? "2" : "1";
      const out = outs.find(o => /minichord/i.test(o.name) && o.name.includes(name)) || outs.find(o => /minichord/i.test(o.name));
      if (!out) return;
      const ch = ((n.port === "harp" ? mc.params[107] : mc.params[106]) || 1) - 1;
      const vel = Math.max(1, Math.min(127, Math.round(n.vel * gain)));
      this._send(out, [0x90 | ch, n.note, vel], t0, true);
      this._send(out, [0x80 | ch, n.note, 0], t1, true);
      return;
    }
    const out = outs.find(o => o.id === track.target); if (!out) return;
    const vel = Math.max(1, Math.min(127, Math.round(n.vel * gain)));
    // as recorded: its channel, with its bend first, so an MPE synth plays the exact pitch
    const range = n.port === "harp" || (this.mc && this.mc.mpe && n.ch !== (this.mc.masterCh)) ? 48 : 2;
    const bend = Math.max(0, Math.min(16383, Math.round(8192 + (n.pitch - n.note) / range * 8192)));
    if (n.pitch !== n.note) this._send(out, [0xE0 | n.ch, bend & 127, bend >> 7], t0 - 0.001);
    this._send(out, [0x90 | n.ch, n.note, vel], t0, true);
    this._send(out, [0x80 | n.ch, n.note, 0], t1, true);
  }
  _send(out, data, t, track) {
    if (!out) return;
    const when = t == null ? undefined : this.perfAt(t);
    try { out.send(data, when); } catch (e) { return; }
    if (!track) return;
    const key = out.id + "|" + (data[0] & 15) + "|" + data[1];
    if ((data[0] & 0xF0) === 0x90) this.held.set(key, { out, ch: data[0] & 15, note: data[1] });
    else this.held.delete(key);
  }
  _clockPort() {
    const outs = this.mc && this.mc.midi ? [...this.mc.midi.outputs.values()] : [];
    return outs.find(o => /minichord/i.test(o.name) && !o.name.includes("2")) || null;
  }
  _pianoNote(out, pitch, t, dur, vel, harp) {
    const p = this.piano, ctx = this.ctx;
    const level = (0.25 + 0.6 * vel / 127) * (harp ? 0.8 : 0.55);
    const env = ctx.createGain(); env.connect(out);
    env.gain.setValueAtTime(level, t); env.gain.setValueAtTime(level, t + dur); env.gain.setTargetAtTime(0, t + dur, 0.08);
    let node;
    if (p.ready) {
      const m = [...p.buffers.keys()].reduce((a, b) => Math.abs(b - pitch) < Math.abs(a - pitch) ? b : a);
      node = ctx.createBufferSource(); node.buffer = p.buffers.get(m); node.playbackRate.value = Math.pow(2, (pitch - m) / 12);
    } else {
      node = ctx.createOscillator(); node.type = "triangle"; node.frequency.value = 440 * Math.pow(2, (pitch - 69) / 12);
    }
    node.connect(env); node.start(t); node.stop(t + dur + 0.6);
    const rec = { node, gain: env, start: t, stop: t + dur + 0.6, kind: "note" };
    this.live.push(rec);
    node.onended = () => { const i = this.live.indexOf(rec); if (i >= 0) this.live.splice(i, 1); };
  }

  /** the metronome's click: a short pitched knock, higher on the bar */
  _click(t, accent, level) {
    const ctx = this.ctx, met = this.song.metronome, vol = met.level * level;
    const g = ctx.createGain(), o = ctx.createOscillator();
    const sound = met.sound || "click";
    const f = sound === "beep" ? (accent ? 1760 : 880) : sound === "wood" ? (accent ? 1250 : 800) : (accent ? 2000 : 1300);
    o.type = sound === "beep" ? "sine" : "triangle"; o.frequency.setValueAtTime(f, t);
    const len = sound === "beep" ? 0.08 : sound === "wood" ? 0.05 : 0.025;
    if (sound === "wood") o.frequency.exponentialRampToValueAtTime(f * 0.7, t + len);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * (accent ? 1 : 0.7), t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0008, t + len);
    o.connect(g).connect(this.clickBus);
    o.start(t); o.stop(t + len + 0.01);
    const rec = { node: o, gain: g, start: t, stop: t + len, kind: "click" };
    this.live.push(rec);
    o.onended = () => { const i = this.live.indexOf(rec); if (i >= 0) this.live.splice(i, 1); };
    this.clickBus.gain.value = 1;
  }

  /** everything placed fades out (from time t), and held MIDI notes end */
  _silence(t = this.ctx.currentTime) {
    for (const s of this.live) {
      try {
        if (s.start >= t) { s.node.stop(); continue; }
        s.gain.gain.cancelScheduledValues(t);
        s.gain.gain.setValueAtTime(s.gain.gain.value, t);
        s.gain.gain.linearRampToValueAtTime(0, t + 0.006);
        s.node.stop(t + 0.01);
      } catch (e) {}
    }
    this.live = []; this.pending = [];
    for (const h of this.held.values()) try { h.out.send([0x80 | h.ch, h.note, 0]); } catch (e) {}
    this.held.clear();
  }

  // ---------- the minichord playing MIDI tracks ----------
  _midiInOn() {
    const mc = this.mc;
    if (!mc || !mc.sysex || !mc.out) return;
    if (!this.song.tracks.some(t => t.play === "midi" && t.target === "minichord")) return;
    if (mc.params[8] === 1) return;
    this._midiInWas = mc.params[8] ?? 0;
    mc.writeParam(8, 1);
  }
  _midiInRestore() {
    if (this._midiInWas == null || !this.mc) return;
    this.mc.writeParam(8, this._midiInWas); this._midiInWas = null;
  }

  _emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
}

/** copies frames of a tape from frame `from` into l and r */
export function copyTape(tp, from, frames, l, r) {
  let pos = tp.dropped || 0, out = 0;   // frames let go of from the tape's start
  if (from < 0) { out = Math.min(frames, -from); from = 0; }   // the tape began after the take did: silence first
  for (let k = 0; k < tp.l.length && out < frames; k++) {
    const cl = tp.l[k], cr = tp.r[k], n = cl.length;
    if (pos + n <= from) { pos += n; continue; }
    const s = Math.max(0, from - pos), m = Math.min(n - s, frames - out);
    l.set(cl.subarray(s, s + m), out); r.set(cr.subarray(s, s + m), out);
    out += m; pos += n;
  }
}

/**
 * The first moment after a, up to b, where the sound rises: past a seventh of the loudest it gets
 * there, and well over the quiet just before a. Relative, since a minichord turned down sends its
 * sound over USB that much quieter.
 */
export function onsetAfter(chunks, a, b, sr) {
  let floor = 0, max = 0;
  const each = fn => { for (const c of chunks) { const n = c.l.length; for (let i = 0; i < n; i++) { const t = c.t + i / sr; if (t < a - 0.03 || t > b) continue; if (fn(t, Math.max(Math.abs(c.l[i]), Math.abs(c.r[i])))) return; } } };
  each((t, v) => { if (t < a) floor = Math.max(floor, v); else max = Math.max(max, v); });
  if (max < Math.max(0.0005, floor * 3)) return null;
  const th = Math.max(floor * 3, max / 7, 0.0005);
  let hit = null;
  each((t, v) => { if (t >= a && v > th) { hit = t; return true; } });
  return hit;
}
