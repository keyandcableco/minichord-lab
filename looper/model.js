/* ============================================================================
 * model.js: the looper's song, and the arithmetic of its time
 *
 * A song is tracks of clips laid on a timeline counted in beats. A clip shows
 * part of a take (its source): what one recording caught, the minichord's sound
 * over USB audio and the MIDI it sent, both timed in seconds from the take's
 * start. Clips on one track that overlap all play: an overdub is another layer,
 * drawn on a row of its own under the track's name.
 *
 * Playing, the transport counts beats straight on ("unwrapped"), and the loop
 * folds them back onto the song: passes() says, for a stretch of unwrapped
 * beats, which song beats each part of it plays.
 *
 * No DOM and no audio here, so the tests can load it in node.
 * ========================================================================== */

export const COLOURS = 8;            // track colours, --t0 to --t7 in the page
let seq = 0;
export const uid = p => p + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);

export function newSong(name = "Untitled loop") {
  return {
    version: 1, id: uid("s"), name, created: Date.now(), updated: Date.now(),
    bpm: 100, beatsPerBar: 4,
    loop: { on: true, start: 0, end: 0 },    // end 0: no loop yet, the first take sets it
    metronome: { on: true, level: 0.6, when: "always", accent: true, sub: 1, sound: "click" },
    countIn: 1,                              // bars before recording from a stop
    punch: "bar",                            // a take started while playing waits for: now, beat, bar, loop
    passEnd: "play",                         // a take reaching the loop's end: play, overdub, next
    snap: "beat",                            // grid for moving clips: off, bar, beat, half, quarter
    tracks: [newTrack(0)],
    clips: [],
    sources: {},                             // id -> take (see newSource)
  };
}

export function newTrack(i, name) {
  return { id: uid("t"), name: name || `Track ${i + 1}`, colour: i % COLOURS, volume: 0.9, pan: 0,
    mute: false, solo: false, armed: i === 0, play: "audio", target: "piano", record: "both", tail: true };
}

/** a take: audio is kept apart (the store, by id) and only described here */
export function newSource({ sampleRate = 48000, channels = 2, frames = 0, preroll = 0, bpm, midi = [], mpe = null, tail = 0 }) {
  return { id: uid("a"), sampleRate, channels, frames, preroll, bpm, midi, mpe, tail, created: Date.now() };
}

export const secPerBeat = song => 60 / song.bpm;
export const beatsOfSec = (song, s) => s * song.bpm / 60;
export const barLen = song => song.beatsPerBar;
export const hasLoop = song => song.loop.end > song.loop.start;
/** the song's end: the last clip's, or the loop's, in beats, at least a bar */
export function songEnd(song) {
  let e = song.loop.end;
  for (const c of song.clips) e = Math.max(e, c.start + c.length);
  return Math.max(e, barLen(song));
}

// ---------- the loop, folded ----------
/**
 * The song beats a stretch of unwrapped beats [ua, ub) plays, as pieces
 * {u0, u1, s0}: unwrapped u0 to u1 plays song beats s0 to s0+(u1-u0). Playing
 * began at song beat `from` (unwrapped 0). With the loop on and playing
 * reaching its end, it goes back to its start; begun after the loop's end, it
 * plays straight on.
 */
export function passes(song, from, ua, ub) {
  const out = [];
  if (ub <= ua) return out;
  const L0 = song.loop.start, L1 = song.loop.end, len = L1 - L0;
  if (!song.loop.on || len <= 0 || from >= L1) { out.push({ u0: ua, u1: ub, s0: from + ua, pass: 0 }); return out; }
  const first = L1 - from;                   // unwrapped beats until the loop's end is first reached
  let u = ua;
  if (u < first) { const e = Math.min(ub, first); out.push({ u0: u, u1: e, s0: from + u, pass: 0, whole: { u0: 0, u1: first } }); u = e; }
  while (u < ub) {
    const k = Math.floor((u - first) / len), p0 = first + k * len, p1 = p0 + len, e = Math.min(ub, p1);
    out.push({ u0: u, u1: e, s0: L0 + (u - p0), pass: k + 1, whole: { u0: p0, u1: p1 } });
    u = e;
  }
  return out;
}
/** the song beat an unwrapped beat plays */
export function songBeat(song, from, u) {
  const p = passes(song, from, u, u + 1e-9)[0];
  return p ? p.s0 + (u - p.u0) : from + u;
}

// ---------- clips ----------
/** the stretch of song a clip covers, and how far into its take it begins, in beats */
export const clipEnd = c => c.start + c.length;

/**
 * Layers: overlapping clips of a track go on rows of their own, first come
 * first served, so a track with overdubs reads as a stack. Returns a Map clip
 * id -> row, and the track's row count.
 */
export function layers(song, trackId) {
  const clips = song.clips.filter(c => c.trackId === trackId).sort((a, b) => a.start - b.start || a.created - b.created);
  const ends = [], row = new Map();
  for (const c of clips) {
    let r = ends.findIndex(e => e <= c.start + 1e-6);
    if (r < 0) { r = ends.length; ends.push(0); }
    ends[r] = clipEnd(c); row.set(c.id, r);
  }
  return { row, rows: Math.max(1, ends.length) };
}

export function snapBeats(song, mode) {
  return mode === "bar" ? song.beatsPerBar : mode === "beat" ? 1 : mode === "half" ? 0.5 : mode === "quarter" ? 0.25 : 0;
}
export function snap(song, b, mode = song.snap) {
  const g = snapBeats(song, mode);
  return g ? Math.round(b / g) * g : b;
}

// ---------- MIDI in a take ----------
/**
 * A take's MIDI as notes: {t0, t1, port, ch, note, vel, pitch} in seconds from the take's start, a note
 * still held at its end lasting to `end`. Pitch is the note with the bend its channel had when it began
 * (MPE: every chord voice and harp string carries its exact pitch that way), using the bend ranges the
 * take recorded.
 */
export function notesOf(src, end = Infinity) {
  const held = new Map(), bend = new Map(), out = [];
  const range = (port, ch) => {
    const m = src.mpe;
    if (!m || !m.on) return 2;
    if (port === "harp") return 48;
    return ch === m.master ? 2 : 48;
  };
  for (const e of src.midi) {
    const [st, d1, d2] = e.d, type = st & 0xF0, ch = st & 15, key = e.p + ":" + ch + ":" + d1;
    if (type === 0xE0) { bend.set(e.p + ":" + ch, (((d2 << 7) | d1) - 8192) / 8192); continue; }
    if (type === 0x90 && d2 > 0) {
      if (held.has(key)) { const n = held.get(key); n.t1 = e.t; out.push(n); }
      const b = bend.get(e.p + ":" + ch) || 0;
      held.set(key, { t0: e.t, t1: end, port: e.p, ch, note: d1, vel: d2, pitch: d1 + b * range(e.p, ch) });
    } else if (type === 0x80 || type === 0x90) {
      const n = held.get(key); if (!n) continue;
      n.t1 = e.t; out.push(n); held.delete(key);
    }
  }
  for (const n of held.values()) out.push(n);
  return out.sort((a, b) => a.t0 - b.t0);
}

/**
 * A clip's notes as they play, in song beats, after its own edits: moved, quantized, transposed or
 * removed notes (clip.notes, once edited, replaces the take's). Cut to the clip.
 */
export function clipNotes(song, clip) {
  const src = song.sources[clip.sourceId]; if (!src) return [];
  const spb = 60 / (src.bpm || song.bpm);
  const base = clip.notes || notesOf(src).map(n => ({ b0: n.t0 / spb - src.preroll / spb, b1: n.t1 / spb - src.preroll / spb,
    port: n.port, ch: n.ch, note: n.note, vel: n.vel, pitch: n.pitch }));
  const out = [];
  for (const n of base) {
    const b0 = n.b0 - clip.offset, b1 = n.b1 - clip.offset;
    if (b1 <= 0 || b0 >= clip.length) continue;
    const t = clip.transpose || 0;
    out.push({ ...n, b0: clip.start + Math.max(0, b0), b1: clip.start + Math.min(clip.length, b1), note: n.note + t, pitch: n.pitch + t });
  }
  return out;
}

/** a clip's notes, in its own beats, ready to be edited (copied the first time) */
export function editableNotes(song, clip) {
  if (clip.notes) return clip.notes;
  const src = song.sources[clip.sourceId], spb = 60 / (src.bpm || song.bpm);
  return clip.notes = notesOf(src).map(n => ({ b0: (n.t0 - src.preroll) / spb, b1: (n.t1 - src.preroll) / spb,
    port: n.port, ch: n.ch, note: n.note, vel: n.vel, pitch: n.pitch }));
}

export function quantizeNotes(notes, grid, strength = 1) {
  for (const n of notes) {
    const q = Math.round(n.b0 / grid) * grid, d = (q - n.b0) * strength;
    n.b0 += d; n.b1 += d;
  }
  return notes;
}

// ---------- undo ----------
/** the song without its takes, which never change once recorded, so a snapshot is cheap */
const shape = song => JSON.stringify({ ...song, sources: undefined });
export class History {
  constructor(limit = 100) { this.limit = limit; this.past = []; this.future = []; }
  /** call before a change, with what it is */
  mark(song, label) {
    this.past.push({ s: shape(song), label }); if (this.past.length > this.limit) this.past.shift();
    this.future.length = 0;
  }
  undo(song) { return this._swap(song, this.past, this.future); }
  redo(song) { return this._swap(song, this.future, this.past); }
  _swap(song, from, to) {
    const e = from.pop(); if (!e) return null;
    to.push({ s: shape(song), label: e.label });
    Object.assign(song, JSON.parse(e.s), { sources: song.sources });
    return e.label;
  }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  get undoLabel() { return this.past.length ? this.past[this.past.length - 1].label : ""; }
}

/** every take a song (and its history) still refers to */
export function usedSources(song, history) {
  const used = new Set(song.clips.map(c => c.sourceId));
  if (history) for (const e of [...history.past, ...history.future]) for (const c of JSON.parse(e.s).clips) used.add(c.sourceId);
  return used;
}

export function fmtPos(song, b) {
  const bar = Math.floor(b / song.beatsPerBar) + 1, beat = Math.floor(b - (bar - 1) * song.beatsPerBar) + 1;
  return `${bar}.${beat}`;
}
