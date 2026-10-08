/* ============================================================================
 * files.js: what the looper hands out and takes in
 *
 *   - the song, or the loop played so many times, mixed to a WAV, or one WAV
 *     per track (stems), rendered offline from the takes' own sound;
 *   - a standard MIDI file, a track per looper track, every note with the
 *     bend it was played with (MPE, so 19-, 24- and 31-note tunings survive);
 *   - a project file (.mcloop): the song and every take's audio, to carry a
 *     loop to another computer or keep it safe outside the browser.
 * ========================================================================== */
import { clipNotes, songEnd, hasLoop } from "./model.js";

export function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export const safeName = s => (s || "loop").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "loop";

// ---------- WAV ----------
/** 24-bit PCM, stereo */
export function wav(l, r, sr) {
  const n = l.length, bytes = 3, data = n * 2 * bytes, buf = new ArrayBuffer(44 + data), v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + data, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2 * bytes, true); v.setUint16(32, 2 * bytes, true); v.setUint16(34, 8 * bytes, true);
  str(36, "data"); v.setUint32(40, data, true);
  let o = 44;
  for (let i = 0; i < n; i++) for (const ch of [l, r]) {
    let x = Math.max(-1, Math.min(1, ch[i])); x = Math.round(x < 0 ? x * 8388608 : x * 8388607);
    v.setUint8(o, x & 255); v.setUint8(o + 1, (x >> 8) & 255); v.setUint8(o + 2, (x >> 16) & 255); o += 3;
  }
  return new Blob([buf], { type: "audio/wav" });
}

/**
 * Renders the song offline: what = "song" (start to end) or "loop" (the loop, `times` times over),
 * tracks: null for the mix, or a track id for that track alone (its own volume and pan, solo and
 * mute ignored). Takes come from the engine's audio; MIDI tracks played by the browser's piano are
 * rendered with it too (a track played by the minichord or another device has no sound here).
 */
export async function render(song, engine, { what = "song", times = 1, track = null, tail = 3 } = {}) {
  const sr = engine.sampleRate, spb = 60 / song.bpm;
  const loop = what === "loop" && hasLoop(song);
  const b0 = loop ? song.loop.start : 0, b1 = loop ? song.loop.end : songEnd(song);
  const reps = loop ? Math.max(1, times) : 1, len = (b1 - b0) * spb;
  const seconds = len * reps + tail, ctx = new OfflineAudioContext(2, Math.ceil(seconds * sr), sr);
  const solo = song.tracks.some(t => t.solo);
  const tracks = song.tracks.filter(t => track ? t.id === track : !t.mute && (!solo || t.solo));
  const piano = engine.piano && engine.piano.ready ? engine.piano.buffers : null;
  for (const t of tracks) {
    const g = ctx.createGain(), pan = ctx.createStereoPanner();
    g.gain.value = t.volume; pan.pan.value = t.pan; g.connect(pan).connect(ctx.destination);
    for (const c of song.clips) {
      if (c.trackId !== t.id || c.muted) continue;
      const cs = Math.max(c.start, b0), ce = Math.min(c.start + c.length, b1);
      if (ce <= cs) continue;
      const src = song.sources[c.sourceId]; if (!src) continue;
      for (let k = 0; k < reps; k++) {
        const at = (cs - b0) * spb + k * len;
        if (t.play === "midi") {
          if (t.target !== "piano") continue;
          for (const n of clipNotes(song, c)) {
            if (n.b0 < cs || n.b0 >= ce) continue;
            const when = (n.b0 - b0) * spb + k * len, dur = (Math.min(n.b1, ce) - n.b0) * spb;
            notePiano(ctx, g, piano, n, when, dur, c.gain);
          }
          continue;
        }
        const got = engine.bufferOf(c.sourceId); if (!got || !src.frames) continue;
        const off = src.preroll + c.offset * (60 / (src.bpm || song.bpm)) + (cs - c.start) * spb;
        const ringsOn = ce === c.start + c.length && t.tail ? (src.tail || 0) : 0;
        const dur = (ce - cs) * spb, n = ctx.createBufferSource(), e = ctx.createGain();
        n.buffer = got.buffer;
        e.gain.setValueAtTime(0, at); e.gain.linearRampToValueAtTime(c.gain, at + 0.004);
        if (ringsOn) { e.gain.setValueAtTime(c.gain, at + dur); e.gain.linearRampToValueAtTime(0, at + dur + ringsOn); }
        else { e.gain.setValueAtTime(c.gain, at + dur - 0.004); e.gain.linearRampToValueAtTime(0, at + dur); }
        n.connect(e).connect(g); n.start(at, off, dur + ringsOn);
      }
    }
  }
  const out = await ctx.startRendering();
  // trim the silence after the last sound, keeping what rings on
  const l = out.getChannelData(0), r = out.getChannelData(1);
  let end = Math.ceil(len * reps * sr);
  for (let i = l.length - 1; i > end; i--) if (Math.abs(l[i]) > 1e-4 || Math.abs(r[i]) > 1e-4) { end = i + 1; break; }
  return { l: l.subarray(0, end), r: r.subarray(0, end), sr };
}
function notePiano(ctx, out, buffers, n, when, dur, gain) {
  const env = ctx.createGain(), level = (0.25 + 0.6 * n.vel * gain / 127) * (n.port === "harp" ? 0.8 : 0.55);
  env.gain.setValueAtTime(level, when); env.gain.setValueAtTime(level, when + dur); env.gain.setTargetAtTime(0, when + dur, 0.08);
  env.connect(out);
  let node;
  if (buffers) {
    const m = [...buffers.keys()].reduce((a, b) => Math.abs(b - n.pitch) < Math.abs(a - n.pitch) ? b : a);
    node = ctx.createBufferSource(); node.buffer = buffers.get(m); node.playbackRate.value = Math.pow(2, (n.pitch - m) / 12);
  } else { node = ctx.createOscillator(); node.type = "triangle"; node.frequency.value = 440 * Math.pow(2, (n.pitch - 69) / 12); }
  node.connect(env); node.start(when); node.stop(when + dur + 0.6);
}

// ---------- MIDI ----------
const vlq = n => { const b = [n & 127]; while (n >>= 7) b.unshift((n & 127) | 128); return b; };
const chunk = (id, bytes) => [...id].map(c => c.charCodeAt(0)).concat([(bytes.length >>> 24) & 255, (bytes.length >>> 16) & 255, (bytes.length >>> 8) & 255, bytes.length & 255], bytes);

/** a type 1 standard MIDI file of the song (or the loop, so many times), 480 ticks a beat */
export function midiFile(song, { what = "song", times = 1 } = {}) {
  const PPQ = 480, loop = what === "loop" && hasLoop(song);
  const b0 = loop ? song.loop.start : 0, b1 = loop ? song.loop.end : songEnd(song), reps = loop ? Math.max(1, times) : 1, len = b1 - b0;
  const mpe = Object.values(song.sources).some(s => s.mpe && s.mpe.on);
  const tempo = Math.round(60000000 / song.bpm);
  const tracks = [];
  // the conductor: tempo and metre
  const den = 2;   // quarter notes
  tracks.push([0, 0xFF, 0x51, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255,
    0, 0xFF, 0x58, 4, song.beatsPerBar, den, 24, 8,
    0, 0xFF, 0x2F, 0]);
  for (const t of song.tracks) {
    const ev = [];
    for (const c of song.clips) {
      if (c.trackId !== t.id || c.muted) continue;
      for (const n of clipNotes(song, c)) {
        if (n.b0 < b0 || n.b0 >= b1) continue;
        for (let k = 0; k < reps; k++) {
          const s = n.b0 - b0 + k * len, e = Math.min(n.b1, b1) - b0 + k * len;
          const range = mpe && (n.port === "harp" || n.ch !== 0) ? 48 : 2;
          const vel = Math.max(1, Math.min(127, Math.round(n.vel * c.gain)));
          if (mpe || n.pitch !== n.note) {
            const b = Math.max(0, Math.min(16383, Math.round(8192 + (n.pitch - n.note) / range * 8192)));
            ev.push([Math.round(s * PPQ), 0, [0xE0 | n.ch, b & 127, b >> 7]]);
          }
          ev.push([Math.round(s * PPQ), 1, [0x90 | n.ch, n.note, vel]]);
          ev.push([Math.round(e * PPQ), -1, [0x80 | n.ch, n.note, 0]]);
        }
      }
    }
    if (!ev.length) continue;
    ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const name = [...new TextEncoder().encode(t.name)];
    const bytes = [0, 0xFF, 0x03, ...vlq(name.length), ...name];
    if (mpe && tracks.length === 1) {
      // the MPE zone (15 members on channel 1), and the members' bend range
      bytes.push(0, 0xB0, 101, 0, 0, 0xB0, 100, 6, 0, 0xB0, 6, 15);
      for (let ch = 1; ch < 16; ch++) bytes.push(0, 0xB0 | ch, 101, 0, 0, 0xB0 | ch, 100, 0, 0, 0xB0 | ch, 6, 48);
    }
    let last = 0;
    for (const [tick, , msg] of ev) { bytes.push(...vlq(tick - last), ...msg); last = tick; }
    bytes.push(0, 0xFF, 0x2F, 0);
    tracks.push(bytes);
  }
  const head = chunk("MThd", [0, 1, 0, tracks.length, PPQ >> 8, PPQ & 255]);
  return new Uint8Array(head.concat(...tracks.map(b => chunk("MTrk", b))));
}

// ---------- the project file ----------
const MAGIC = "MCLOOP1\n";
/** the song and its takes' audio, in one file */
export async function packProject(song, audioOf) {
  const used = [...new Set(song.clips.map(c => c.sourceId))];
  const head = { song: { ...song, sources: Object.fromEntries(used.filter(id => song.sources[id]).map(id => [id, song.sources[id]])) }, audio: [] };
  const parts = [];
  for (const id of used) {
    const a = await audioOf(id); if (!a) continue;
    head.audio.push({ id, frames: a.l.length });
    parts.push(a.l, a.r);
  }
  const json = new TextEncoder().encode(JSON.stringify(head));
  const len = new Uint32Array([json.length]);
  // Float32 data has to sit on a four-byte boundary to be read back in place
  const pad = new Uint8Array((4 - ((MAGIC.length + 4 + json.length) % 4)) % 4);
  return new Blob([MAGIC, len, json, pad, ...parts], { type: "application/octet-stream" });
}
export async function unpackProject(file) {
  const buf = await file.arrayBuffer(), bytes = new Uint8Array(buf);
  if (new TextDecoder().decode(bytes.subarray(0, MAGIC.length)) !== MAGIC) throw new Error("This isn't a looper project file.");
  const n = new DataView(buf).getUint32(MAGIC.length, true);
  let o = MAGIC.length + 4;
  const head = JSON.parse(new TextDecoder().decode(bytes.subarray(o, o + n)));
  o += n; o += (4 - (o % 4)) % 4;
  const audio = new Map();
  for (const a of head.audio) {
    const l = new Float32Array(buf.slice(o, o + a.frames * 4)); o += a.frames * 4;
    const r = new Float32Array(buf.slice(o, o + a.frames * 4)); o += a.frames * 4;
    audio.set(a.id, { l, r });
  }
  return { song: head.song, audio };
}
