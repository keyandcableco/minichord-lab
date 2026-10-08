// The looper's arithmetic: the loop folded onto the song, overdubs stacked, a take's MIDI as notes,
// undo, and the MIDI file it writes. Plain node: node looper/model.test.mjs
import assert from "node:assert/strict";
import { newSong, passes, songBeat, layers, notesOf, clipNotes, History, quantizeNotes, editableNotes, snap } from "../../looper/model.js";
import { midiFile } from "../../looper/files.js";
let n = 0; const ok = (name, fn) => { fn(); n++; console.log("  ✓ " + name); };

ok("no loop: straight on", () => {
  const s = newSong();
  assert.deepEqual(passes(s, 2, 0, 4), [{ u0: 0, u1: 4, s0: 2, pass: 0 }]);
});
ok("a loop folds back to its start", () => {
  const s = newSong(); s.loop = { on: true, start: 4, end: 12 };
  const p = passes(s, 4, 6, 14);
  assert.equal(p.length, 2);
  assert.deepEqual([p[0].u0, p[0].u1, p[0].s0], [6, 8, 10]);
  assert.deepEqual([p[1].u0, p[1].u1, p[1].s0, p[1].pass], [8, 14, 4, 1]);
  assert.equal(songBeat(s, 4, 9), 5);
  assert.equal(songBeat(s, 4, 8 + 8 * 3 + 1), 5);       // three passes later
});
ok("begun before the loop, plays into it and round", () => {
  const s = newSong(); s.loop = { on: true, start: 8, end: 16 };
  assert.equal(songBeat(s, 0, 7), 7);
  assert.equal(songBeat(s, 0, 16), 8);
  assert.equal(songBeat(s, 0, 23), 15);
  assert.equal(songBeat(s, 0, 24), 8);
});
ok("begun after the loop: straight on", () => {
  const s = newSong(); s.loop = { on: true, start: 0, end: 8 };
  assert.equal(songBeat(s, 10, 5), 15);
});
ok("the loop off: straight on", () => {
  const s = newSong(); s.loop = { on: false, start: 0, end: 8 };
  assert.equal(songBeat(s, 0, 12), 12);
});
ok("overdubs stack on rows", () => {
  const s = newSong(), t = s.tracks[0].id;
  s.clips = [{ id: "a", trackId: t, start: 0, length: 8, created: 1 }, { id: "b", trackId: t, start: 0, length: 8, created: 2 }, { id: "c", trackId: t, start: 8, length: 4, created: 3 }];
  const L = layers(s, t);
  assert.equal(L.rows, 2); assert.equal(L.row.get("a"), 0); assert.equal(L.row.get("b"), 1); assert.equal(L.row.get("c"), 0);
});
ok("a take's MIDI as notes, with MPE bends", () => {
  const src = { preroll: 0, bpm: 120, mpe: { on: true, master: 0 }, midi: [
    { t: 0.0, p: "chord", d: [0xE1, 0, 72] },            // a bend up on channel 2, before its note
    { t: 0.0, p: "chord", d: [0x91, 60, 100] },
    { t: 0.5, p: "harp", d: [0x92, 67, 80] },
    { t: 1.0, p: "chord", d: [0x81, 60, 0] },
  ] };
  const notes = notesOf(src, 2);
  assert.equal(notes.length, 2);
  const c = notes.find(x => x.port === "chord");
  assert.equal(c.t1, 1);
  assert.ok(Math.abs(c.pitch - (60 + ((72 << 7) - 8192) / 8192 * 48)) < 1e-9);
  assert.equal(notes.find(x => x.port === "harp").t1, 2);   // still held: to the end
});
ok("a clip's notes are cut to it and placed on the song", () => {
  const s = newSong(); s.bpm = 120;
  s.sources.x = { id: "x", preroll: 0.25, bpm: 120, mpe: null, midi: [
    { t: 0.25, p: "chord", d: [0x90, 60, 100] }, { t: 0.75, p: "chord", d: [0x80, 60, 0] },
    { t: 1.25, p: "chord", d: [0x90, 62, 100] }, { t: 2.25, p: "chord", d: [0x80, 62, 0] }] };
  const clip = { id: "c", trackId: s.tracks[0].id, sourceId: "x", start: 4, length: 3, offset: 0, transpose: 2 };
  const ns = clipNotes(s, clip);
  assert.equal(ns.length, 2);
  assert.deepEqual([ns[0].b0, ns[0].b1, ns[0].note], [4, 5, 62]);
  assert.deepEqual([ns[1].b0, ns[1].b1], [6, 7]);       // held past the clip's end: cut there
});
ok("quantize and undo", () => {
  const s = newSong(); s.bpm = 60;
  s.sources.x = { id: "x", preroll: 0, bpm: 60, mpe: null, midi: [{ t: 0.1, p: "chord", d: [0x90, 60, 100] }, { t: 0.6, p: "chord", d: [0x80, 60, 0] }] };
  const clip = { id: "c", trackId: s.tracks[0].id, sourceId: "x", start: 0, length: 4, offset: 0 };
  s.clips.push(clip);
  const h = new History();
  h.mark(s, "Quantize");
  quantizeNotes(editableNotes(s, clip), 0.5, 1);
  assert.ok(Math.abs(clip.notes[0].b0) < 1e-9);
  assert.equal(h.undo(s), "Quantize");
  assert.equal(s.clips[0].notes, undefined);
  assert.ok(s.sources.x, "takes survive an undo");
  assert.equal(h.redo(s), "Quantize");
  assert.ok(Math.abs(s.clips[0].notes[0].b0) < 1e-9);
});
ok("snap", () => {
  const s = newSong();
  assert.equal(snap(s, 5.4, "bar"), 4); assert.equal(snap(s, 5.4, "beat"), 5); assert.equal(snap(s, 5.4, "off"), 5.4);
});
ok("the MIDI file", () => {
  const s = newSong(); s.bpm = 120;
  s.sources.x = { id: "x", preroll: 0, bpm: 120, mpe: null, midi: [{ t: 0, p: "chord", d: [0x90, 60, 100] }, { t: 0.5, p: "chord", d: [0x80, 60, 0] }] };
  s.clips.push({ id: "c", trackId: s.tracks[0].id, sourceId: "x", start: 0, length: 4, offset: 0, gain: 1 });
  s.loop = { on: true, start: 0, end: 4 };
  const f = midiFile(s, { what: "loop", times: 2 });
  assert.equal(String.fromCharCode(...f.slice(0, 4)), "MThd");
  assert.equal(f[11], 2);                                 // conductor + one track
  // two note-ons, a loop (four beats = 1920 ticks) apart
  const ons = []; for (let i = 0; i < f.length - 2; i++) if (f[i] === 0x90 && f[i + 1] === 60) ons.push(i);
  assert.equal(ons.length, 2);
});

// a long overdub's tape lets go of what no take needs any more, and still copies true
const { Engine, copyTape } = await import("../../looper/engine.js");
{
  const eng = new Engine(); eng.song = newSong(); eng.song.bpm = 120; eng.t0 = 0;
  const sr = 48000, rec = { tape: null, cut: 0, mode: "both" };
  rec.tape = { t0: null, l: [], r: [], frames: 0, want: 0 };
  for (let k = 0; k < 700; k++) {
    const l = new Float32Array(2048).map((_, i) => k * 2048 + i), r = l.slice();
    eng._tape(rec, { t: k * 2048 / sr, l, r, peak: 0.5 });
    if (k === 650) rec.cut = 40;           // the take has moved on to beat 40, 20 s in
  }
  const tp = rec.tape;
  ok("a long tape lets go of its start", () => { assert.ok(tp.dropped > 0 && tp.l.length < 700, `dropped ${tp.dropped}`); });
  ok("and still copies the right frames", () => {
    const from = Math.round(19.5 * sr), l = new Float32Array(100), r = new Float32Array(100);
    copyTape(tp, from, 100, l, r);
    assert.equal(l[0], from); assert.equal(l[99], from + 99);
  });
  console.log(`ok ${n}`);
}
