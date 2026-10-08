/* ============================================================================
 * ui.js: the looper's page: the transport and its beat, the timeline of
 * tracks and clips, a clip's notes, the setup, songs and exports
 * ========================================================================== */
import { Minichord, portRole } from "../core/minichord.js";
import { newSong, newTrack, uid, layers, songBeat, snap, snapBeats, clipNotes, editableNotes, quantizeNotes, hasLoop, songEnd, fmtPos, History, usedSources, notesOf } from "./model.js";
import { Engine } from "./engine.js";
import * as store from "./store.js";
import { wav, render, midiFile, download, safeName, packProject, unpackProject } from "./files.js";

const $ = id => document.getElementById(id);
const mc = new Minichord(); window.mc = mc;
const eng = new Engine(); window.looper = eng;
const history = new History();
let song = newSong();
eng.song = song; eng.history = history;
window.looperSong = () => song;

const CUR = "lab-looper-current", PREFS = "lab-looper-prefs";
let prefs = {};
try { prefs = JSON.parse(localStorage.getItem(PREFS) || "{}"); } catch (e) {}
const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch (e) {} };
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
let toastT;
function toast(t, ms = 3200) {
  let el = document.querySelector(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, ms);
}

// ---------- the minichord ----------
mc.addEventListener("status", e => $("status").textContent = e.detail);
mc.addEventListener("ports", () => {
  const sel = $("input"), ins = mc.inputs; sel.innerHTML = ""; sel.disabled = false;
  const o = new Option("Automatic (minichord)", "auto"); sel.add(o);
  for (const i of ins) sel.add(new Option(i.name, i.id));
  sel.value = mc.inputChoice;
  trackTargets();
});
$("input").onchange = e => mc.selectInput(e.target.value);
$("connect").onclick = async e => { e.target.disabled = true; if (await mc.connect()) e.target.textContent = "Connected"; else e.target.disabled = false; };
eng.attachMidi(mc, portRole);
mc.addEventListener("device", () => { if ($("usbAudio1")) $("usbAudio1").disabled = !(mc.sysex && mc.out); });

// ---------- starting ----------
$("startBtn").onclick = async () => {
  $("startBtn").disabled = true;
  try {
    await eng.start();
    eng.offsetMs = prefs.nudge || 0; eng.inLat = prefs.inLat ?? null;
    if (prefs.clockOut) eng.clockOut = true;
    await pickInput(prefs.audioIn);
  } catch (e) {
    $("startBtn").disabled = false;
    $("status").textContent = "The looper couldn't start: " + (e.message || e);
    return;
  }
  $("startBox").classList.add("hidden");
  for (const id of ["transport", "timeline", "addrow", "lower"]) $(id).classList.remove("hidden");
  eng.mix(); drawAll();
  loadAudioAll();
};

async function pickInput(want) {
  // asking once with no device chosen gets the permission, and with it the devices' names
  let label = null;
  try { label = await eng.openInput(want || undefined); }
  catch (e) { if (want) label = await eng.openInput(undefined).catch(() => null); }
  const ins = await eng.inputs(), sel = $("audioIn");
  sel.innerHTML = "";
  sel.add(new Option("None (MIDI only)", "none"));
  for (const d of ins) sel.add(new Option(d.label || "Audio input", d.deviceId));
  const mini = ins.find(d => /minichord/i.test(d.label));
  if (!want && mini && eng.inputId !== mini.deviceId) { label = await eng.openInput(mini.deviceId); }
  sel.value = eng.stream ? (eng.inputId || "") : "none";
  if (sel.value === "" && eng.inputId) sel.value = [...sel.options].find(o => o.textContent === label)?.value || "";
  const note = label && !/minichord/i.test(label) ? ` Recording from ${label}: choose the minichord below if it's plugged in.` : "";
  if (note) toast(note.trim(), 6000);
  prefs.audioIn = eng.inputId; savePrefs();
  const outs = await eng.outputs(), os = $("audioOut");
  os.innerHTML = ""; os.add(new Option("The computer's default", "default"));
  for (const d of outs) if (d.deviceId !== "default") os.add(new Option(d.label || "Output", d.deviceId));
  if (!eng.ctx.setSinkId) { os.disabled = true; os.title = "This browser can't choose where sound goes"; }
  if (prefs.audioOut) { os.value = prefs.audioOut; eng.setOutput(prefs.audioOut).catch(() => {}); }
  showLatency();
}
$("audioIn").onchange = async e => {
  try { await eng.openInput(e.target.value); prefs.audioIn = e.target.value; savePrefs(); } catch (er) { toast("That input couldn't be opened: " + er.message); }
  showLatency();
};
$("audioOut").onchange = async e => {
  try { await eng.setOutput(e.target.value); prefs.audioOut = e.target.value; savePrefs(); } catch (er) { toast("That output couldn't be used: " + er.message); }
};
$("monitor").onchange = e => eng.setMonitor(e.target.checked);
$("clockOut").checked = !!prefs.clockOut;
$("clockOut").onchange = e => { eng.clockOut = prefs.clockOut = e.target.checked; savePrefs(); };
$("usbAudio1").onclick = () => {
  if (!mc.writeParam(244, 1)) { toast("Connect the minichord first (with MIDI device control allowed)."); return; }
  toast("The minichord now plays the computer's sound. Choose it as where the looper is heard.", 6000);
};
function showLatency() {
  $("latShow").textContent = Math.round(eng.inputLatency * 1000) + " ms" + (eng.inLat == null ? " (the browser's guess)" : " (measured)");
  $("outShow").textContent = Math.round(eng.outLat * 1000) + " ms";
}
$("calBtn").onclick = async () => {
  $("calBtn").disabled = true; $("calNote").textContent = "Pluck a harp string on each click…";
  const r = await eng.calibrate(8);
  $("calBtn").disabled = false;
  if (r.error) { $("calNote").textContent = r.error; return; }
  prefs.inLat = r.latency; savePrefs();
  $("calNote").textContent = `Heard ${r.found} chords: the sound arrives ${Math.round(r.latency * 1000)} ms after the MIDI (spread ${Math.round(r.spread * 1000)} ms). You played ${Math.abs(Math.round(r.playerLate * 1000))} ms ${r.playerLate >= 0 ? "behind" : "ahead of"} the click.`;
  showLatency();
};
$("nudge").value = prefs.nudge || 0; $("nudgeShow").textContent = ($("nudge").value) + " ms";
$("nudge").oninput = e => { eng.offsetMs = prefs.nudge = +e.target.value; $("nudgeShow").textContent = e.target.value + " ms"; savePrefs(); showLatency(); };

// ---------- the song: saving, opening ----------
let saveT;
function changed(redraw = true, reschedule = true) {
  song.updated = Date.now();
  clearTimeout(saveT); saveT = setTimeout(saveNow, 500);
  if (reschedule) eng.changed();
  eng.mix();
  if (redraw) drawAll();
}
async function saveNow() {
  try { await store.saveSong(song); localStorage.setItem(CUR, song.id); listSongs(); }
  catch (e) { $("storeNote").textContent = "This browser isn't keeping the song: " + e.message; }
}
eng.addEventListener("song", () => changed(true, false));
eng.addEventListener("take", e => { selected = e.detail.clip.id; });
eng.addEventListener("audio", async e => {
  const id = e.detail.id, a = eng.audio.get(id);
  peaks.delete(id);
  try { await store.putAudio(id, a.l, a.r); } catch (er) { $("storeNote").textContent = "A take couldn't be kept in the browser: " + er.message; }
  saveNow(); drawAll();
});
eng.addEventListener("state", () => { drawTransport(); drawStatic(); });
eng.addEventListener("remote", e => {
  const a = e.detail.action;
  if (a === 1 || a === 6) { if (a === 6 && eng.state === "playing" && !eng.rec && !eng.armWait) eng.stop(); else doRecord(); }
  else if (a === 2) { if (eng.state !== "playing") eng.play(); else if (eng.rec) doRecord(); }
  else if (a === 3) eng.stop();
  else if (a === 4) undo();
  else if (a === 5) { song.passEnd = song.passEnd === "overdub" ? "play" : "overdub"; $("passEnd").value = song.passEnd; changed(false, false); toast(song.passEnd === "overdub" ? "Overdubbing on" : "Overdubbing off"); }
});

async function openSong(s) {
  if (eng.state === "playing") eng.stop();
  // takes that only the history knew about go with it
  for (const id of Object.keys(s.sources || {})) if (!s.clips.some(c => c.sourceId === id)) delete s.sources[id];
  song = s; eng.song = s; history.past.length = history.future.length = 0;
  selected = null; eng.playhead = 0;
  syncControls(); drawAll(); loadAudioAll();
  localStorage.setItem(CUR, s.id);
  listSongs();
}
async function loadAudioAll() {
  for (const [id, src] of Object.entries(song.sources)) {
    if (!src.frames || eng.audio.has(id)) continue;
    try { const a = await store.getAudio(id); if (a) eng.setAudio(id, a.l, a.r); } catch (e) {}
  }
  drawAll();
}
async function listSongs() {
  let list = [];
  try { list = await store.listSongs(); } catch (e) { return; }
  const ul = $("songs"); ul.innerHTML = "";
  for (const s of list) {
    const li = document.createElement("li"); if (s.id === song.id) li.className = "cur";
    const name = document.createElement("span"); name.textContent = `${s.name} · ${s.clips} clip${s.clips === 1 ? "" : "s"}, ${s.bpm} bpm`;
    const open = document.createElement("button"); open.textContent = s.id === song.id ? "Open now" : "Open"; open.disabled = s.id === song.id;
    open.onclick = async () => { await saveNow(); const x = await store.loadSong(s.id); if (x) openSong(x); };
    const del = document.createElement("button"); del.textContent = "Delete";
    del.onclick = async () => {
      if (!confirm(`Delete "${s.name}" and its takes? This can't be undone.`)) return;
      await store.deleteSong(s.id);
      if (s.id === song.id) openSong(newSong());
      listSongs(); usage();
    };
    const b = document.createElement("span"); b.append(open, " ", del);
    li.append(name, b); ul.appendChild(li);
  }
  usage();
}
async function usage() {
  const u = await store.usage();
  if (u && u.quota) $("storeNote").textContent = `Kept in this browser: ${(u.usage / 1e6).toFixed(0)} MB of the ${(u.quota / 1e9).toFixed(1)} GB it allows. A minute of stereo takes about 23 MB.`;
}
$("newSong").onclick = async () => { await saveNow(); openSong(newSong()); };
$("songName").onchange = e => { history.mark(song, "Rename"); song.name = e.target.value || "Untitled loop"; changed(false, false); };

// ---------- the transport's controls ----------
function syncControls() {
  $("bpm").value = song.bpm; $("bpb").value = song.beatsPerBar;
  $("metOn").checked = song.metronome.on; $("metWhen").value = song.metronome.when; $("metSound").value = song.metronome.sound || "click";
  $("metSub").value = song.metronome.sub || 1; $("metLevel").value = song.metronome.level;
  $("countIn").value = song.countIn; $("punch").value = song.punch; $("passEnd").value = song.passEnd;
  $("loopOn").checked = song.loop.on; $("snap").value = song.snap; $("songName").value = song.name;
  drawDots();
}
const opt = (id, fn, resched = true) => $(id).addEventListener("change", e => { fn(e.target); changed(true, resched); });
$("bpm").addEventListener("change", e => {
  const v = Math.max(30, Math.min(300, Math.round(+e.target.value || song.bpm)));
  if (v === song.bpm) return;
  const old = song.bpm;
  history.mark(song, "Tempo");
  song.bpm = v; e.target.value = v;
  if (song.clips.some(c => song.sources[c.sourceId] && song.sources[c.sourceId].frames && t(c).play !== "midi")) toast("Takes keep their own speed: their sound doesn't stretch to a new tempo, but their MIDI does.", 5000);
  eng.retempo(old); changed(true, false);
});
const t = c => song.tracks.find(x => x.id === c.trackId) || {};
opt("bpb", el => { history.mark(song, "Beats a bar"); song.beatsPerBar = Math.max(1, Math.min(15, Math.round(+el.value || 4))); el.value = song.beatsPerBar; drawDots(); });
opt("metOn", el => song.metronome.on = el.checked);
opt("metWhen", el => song.metronome.when = el.value);
opt("metSound", el => song.metronome.sound = el.value);
opt("metSub", el => song.metronome.sub = +el.value);
$("metLevel").oninput = e => { song.metronome.level = +e.target.value; changed(false, false); };
opt("countIn", el => song.countIn = +el.value, false);
opt("punch", el => song.punch = el.value, false);
opt("passEnd", el => song.passEnd = el.value, false);
opt("loopOn", el => { history.mark(song, "Loop on or off"); song.loop.on = el.checked; });
opt("snap", el => song.snap = el.value, false);
let taps = [];
function tap() {
  const now = performance.now();
  taps = taps.filter(x => now - x < 2500); taps.push(now);
  if (taps.length < 3) { toast(`Tap ${4 - taps.length} more…`, 900); return; }
  const gaps = taps.slice(1).map((x, i) => x - taps[i]), bpm = Math.round(60000 / (gaps.reduce((a, b) => a + b) / gaps.length));
  $("bpm").value = Math.max(30, Math.min(300, bpm)); $("bpm").dispatchEvent(new Event("change"));
}
$("tapBtn").onclick = tap;
$("playBtn").onclick = () => { if (eng.state === "playing") eng.stop(); else eng.play(); };
$("homeBtn").onclick = () => eng.seek(hasLoop(song) && song.loop.on ? song.loop.start : 0);
$("recBtn").onclick = () => doRecord();
function doRecord() {
  if (!eng.ctx) return;
  if (!eng.stream && !mc.midi) toast("Nothing to record from yet: choose an audio input, or connect the minichord.");
  const armed = song.tracks.find(x => x.armed);
  if (!armed) { const tr = song.tracks[0]; if (tr) tr.armed = true; drawHeads(); }
  eng.record();
  drawTransport();
}
function undo() {
  if (eng.rec) { toast("Stop recording first."); return; }
  const l = history.undo(song); if (l == null) return;
  toast("Undid: " + l, 1600); afterHistory();
}
function redo() { const l = history.redo(song); if (l == null) return; toast("Redid: " + l, 1600); afterHistory(); }
function afterHistory() { if (!song.clips.some(c => c.id === selected)) selected = null; syncControls(); changed(); }
$("undoBtn").onclick = undo; $("redoBtn").onclick = redo;

// ---------- the beat ----------
function drawDots() {
  const d = $("dots"); d.innerHTML = "";
  for (let i = 0; i < song.beatsPerBar; i++) d.appendChild(document.createElement("i"));
}
let lastBeat = null;
function drawTransport() {
  const w = eng.where(), st = $("state"), box = $("beat");
  const recording = !!eng.rec, counting = w.countIn > 0;
  $("playBtn").textContent = eng.state === "playing" ? "■" : "▶";
  $("playBtn").setAttribute("aria-label", eng.state === "playing" ? "Stop" : "Play");
  $("recBtn").classList.toggle("on", recording || counting);
  $("recBtn").classList.toggle("wait", !!eng.armWait);
  box.classList.toggle("rec", recording || counting || !!eng.armWait);
  box.classList.toggle("count", counting);
  let beatIn;
  if (counting) {
    const left = Math.ceil(w.countIn - 1e-6), total = eng.countBeats;
    $("pos").textContent = String(left);
    st.textContent = "Count-in";
    beatIn = ((total - left) % song.beatsPerBar);
  } else {
    const rel = w.beat;
    $("pos").textContent = fmtPos(song, rel + 1e-6);
    beatIn = Math.floor(((rel % song.beatsPerBar) + song.beatsPerBar) % song.beatsPerBar + 1e-6);
    if (eng.armWait) st.textContent = `Recording in ${Math.max(1, Math.ceil((eng.armWait.u - w.u) - 1e-6))}`;
    else if (recording) {
      const tr = song.tracks.find(x => x.id === eng.rec.trackId);
      st.textContent = (eng.rec.looped ? (eng.rec.cut > eng.rec.uStart + 1e-6 ? "Overdubbing" : "Recording") : "Recording the first loop") + (tr ? " · " + tr.name : "");
    }
    else st.textContent = eng.state === "playing" ? "Playing" : "Stopped";
  }
  [...$("dots").children].forEach((el, i) => { el.classList.toggle("on", eng.state === "playing" && i === beatIn); el.classList.toggle("one", i === 0); });
  const beatNow = eng.state === "playing" ? Math.floor(w.u + 1e-6) : null;
  if (beatNow !== lastBeat && beatNow != null && beatIn === 0) { box.classList.add("flash"); setTimeout(() => box.classList.remove("flash"), 110); }
  lastBeat = beatNow;
  // how far through the loop
  const L = song.loop, prog = $("loopProg");
  if (hasLoop(song) && L.on && w.beat >= L.start && w.beat <= L.end) prog.style.width = ((w.beat - L.start) / (L.end - L.start) * 100) + "%";
  else prog.style.width = "0";
  $("loopLabel").textContent = hasLoop(song) ? `Loop: bars ${fmtPos(song, L.start).split(".")[0]}–${Math.round(L.end / song.beatsPerBar) + (L.end % song.beatsPerBar ? 1 : 0)}${L.on ? "" : " (off)"}` : "No loop yet: the first take sets it";
  $("undoBtn").disabled = !history.canUndo; $("redoBtn").disabled = !history.canRedo;
  $("undoBtn").title = history.canUndo ? "Undo " + history.undoLabel.toLowerCase() + " (Ctrl+Z)" : "Nothing to undo";
  // the input's level
  const m = $("meter"); m.style.width = Math.min(100, Math.sqrt(eng.level) * 100) + "%"; m.classList.toggle("hot", eng.level > 0.95);
}

// ---------- the timeline ----------
const RULER = 30, ROW = 44, MINLANE = 122;   // a lane is at least as tall as its track's controls
let ppb = prefs.zoom || 28;   // pixels a beat
$("zoom").value = ppb;
$("zoom").oninput = e => { ppb = prefs.zoom = +e.target.value; savePrefs(); drawAll(); };
const cv = $("tl"), g = cv.getContext("2d");
const stat = document.createElement("canvas"), sg = stat.getContext("2d");
let selected = null, lanesY = [], W = 0, H = 0, dpr = 1;
const peaks = new Map();

function laneLayout() {
  let y = RULER; lanesY = [];
  for (const tr of song.tracks) {
    const { row, rows } = layers(song, tr.id);
    const h = Math.max(MINLANE, rows * ROW + 8);
    lanesY.push({ track: tr, y, h, row });
    y += h;
  }
  return y;
}
function drawAll() { drawHeads(); drawStatic(); drawTransport(); drawInspector(); }

function drawHeads() {
  const heads = $("heads");
  heads.querySelectorAll(".head").forEach(x => x.remove());
  laneLayout();
  for (const L of lanesY) {
    const tr = L.track, el = document.createElement("div");
    el.className = "head"; el.style.height = L.h + "px"; el.style.setProperty("--tc", css("--t" + tr.colour));
    el.innerHTML = `<div class="r1"><input type="text" aria-label="Track name"><button class="arm" title="Record on this track">●</button><button class="mute" title="Mute">M</button><button class="solo" title="Solo">S</button></div>
      <div class="r2"><span>Vol</span><input type="range" class="vol" min="0" max="1.5" step="0.01" aria-label="Volume"><span>Pan</span><input type="range" class="pan" min="-1" max="1" step="0.05" aria-label="Pan"></div>
      <div class="r3"><select class="play" aria-label="What the track plays"></select></div>
      <div class="r3"><select class="recs" aria-label="What the track records"><option value="both">records sound + MIDI</option><option value="audio">records sound</option><option value="midi">records MIDI</option></select><button class="del" title="Delete the track">✕</button></div>`;
    const q = s => el.querySelector(s);
    q("input").value = tr.name;
    q("input").onchange = e => { history.mark(song, "Rename the track"); tr.name = e.target.value || tr.name; changed(true, false); };
    q(".arm").setAttribute("aria-pressed", tr.armed); q(".mute").setAttribute("aria-pressed", tr.mute); q(".solo").setAttribute("aria-pressed", tr.solo);
    q(".arm").onclick = () => armTrack(tr);
    q(".mute").onclick = () => { tr.mute = !tr.mute; changed(true, true); };
    q(".solo").onclick = () => { tr.solo = !tr.solo; changed(true, true); };
    q(".vol").value = tr.volume; q(".vol").oninput = e => { tr.volume = +e.target.value; changed(false, false); };
    q(".pan").value = tr.pan; q(".pan").oninput = e => { tr.pan = +e.target.value; changed(false, false); };
    q(".pan").ondblclick = e => { tr.pan = 0; e.target.value = 0; changed(false, false); };
    fillTargets(q(".play"), tr);
    q(".play").onchange = e => {
      history.mark(song, "What the track plays");
      const v = e.target.value;
      if (v === "audio") tr.play = "audio"; else { tr.play = "midi"; tr.target = v; }
      if (tr.play === "midi" && tr.target === "minichord" && !(mc.sysex && mc.out)) toast("Connect the minichord (with MIDI device control allowed) for it to play this track.", 5000);
      changed(true, true);
    };
    q(".recs").value = tr.record; q(".recs").onchange = e => { tr.record = e.target.value; changed(false, false); };
    q(".del").onclick = () => {
      const n = song.clips.filter(c => c.trackId === tr.id).length;
      if (n && !confirm(`Delete ${tr.name} and its ${n} clip${n === 1 ? "" : "s"}? (Undo brings it back.)`)) return;
      history.mark(song, "Delete the track");
      song.tracks = song.tracks.filter(x => x !== tr); song.clips = song.clips.filter(c => c.trackId !== tr.id);
      if (!song.tracks.some(x => x.armed) && song.tracks[0]) song.tracks[0].armed = true;
      changed();
    };
    heads.appendChild(el);
  }
}
function fillTargets(sel, tr) {
  sel.innerHTML = "";
  sel.add(new Option("plays its sound", "audio"));
  sel.add(new Option("plays its MIDI: piano", "piano"));
  sel.add(new Option("plays its MIDI: the minichord", "minichord"));
  const outs = mc.midi ? [...mc.midi.outputs.values()].filter(o => !/minichord/i.test(o.name)) : [];
  for (const o of outs) sel.add(new Option("plays its MIDI: " + o.name, o.id));
  if (tr.play === "midi" && ![...sel.options].some(o => o.value === tr.target)) sel.add(new Option("plays its MIDI: (a device not here)", tr.target));
  sel.value = tr.play === "audio" ? "audio" : tr.target;
}
function trackTargets() { document.querySelectorAll(".head .play").forEach((s, i) => lanesY[i] && fillTargets(s, lanesY[i].track)); }
function armTrack(tr) {
  if (eng.rec) { toast("Stop recording to change track."); return; }
  song.tracks.forEach(x => x.armed = x === tr); changed(true, false);
}
$("addTrack").onclick = () => addTrack();
function addTrack() {
  history.mark(song, "Add a track");
  const tr = newTrack(song.tracks.length); tr.armed = false;
  song.tracks.push(tr);
  if (!eng.rec) song.tracks.forEach(x => x.armed = x === tr);
  changed(true, false);
  return tr;
}

/** a take's loudness, binned for drawing */
function peaksOf(id) {
  const a = eng.audio.get(id); if (!a) return null;
  const have = a.complete ? a.frames : (eng.ctx ? eng.bufferOf(id).have : 0);
  const p = peaks.get(id);
  if (p && p.have === have) return p;
  const BIN = 256, n = Math.ceil(have / BIN), data = new Float32Array(n);
  let l, r;
  if (a.complete) { l = a.l; r = a.r; }
  else { const b = eng.bufferOf(id).buffer; l = b.getChannelData(0); r = b.getChannelData(1); }
  for (let k = 0; k < n; k++) {
    let m = 0; const e = Math.min(have, (k + 1) * BIN);
    for (let i = k * BIN; i < e; i++) { const v = Math.max(Math.abs(l[i]), Math.abs(r[i])); if (v > m) m = v; }
    data[k] = m;
  }
  let max = 0; for (const v of data) if (v > max) max = v;
  const q = { have, bin: BIN, data, max }; peaks.set(id, q); return q;
}

function drawStatic() {
  const totalH = laneLayout();
  const lanes = $("lanes");
  const beats = Math.max(songEnd(song) + song.beatsPerBar * 8, (lanes.clientWidth || 800) / ppb);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = Math.ceil(beats * ppb); H = totalH;
  for (const c of [cv, stat]) { c.width = W * dpr; c.height = H * dpr; }
  cv.style.width = W + "px"; cv.style.height = H + "px";
  const x = b => b * ppb;
  sg.setTransform(dpr, 0, 0, dpr, 0, 0);
  sg.clearRect(0, 0, W, H);
  // lanes, striped
  lanesY.forEach((L, i) => { sg.fillStyle = i % 2 ? css("--lane2") : css("--lane"); sg.fillRect(0, L.y, W, L.h); });
  // the loop
  const loopOn = hasLoop(song);
  if (loopOn) {
    sg.fillStyle = song.loop.on ? "rgba(139,0,0,.07)" : "rgba(127,127,127,.06)";
    sg.fillRect(x(song.loop.start), RULER, x(song.loop.end - song.loop.start), H - RULER);
  }
  // the grid
  for (let b = 0; b <= beats; b++) {
    const bar = b % song.beatsPerBar === 0;
    if (!bar && ppb < 9) continue;
    sg.strokeStyle = bar ? css("--gridbar") : css("--grid"); sg.lineWidth = 1;
    sg.beginPath(); sg.moveTo(Math.round(x(b)) + .5, RULER); sg.lineTo(Math.round(x(b)) + .5, H); sg.stroke();
  }
  // the ruler
  sg.fillStyle = css("--panel"); sg.fillRect(0, 0, W, RULER);
  if (loopOn) {
    sg.fillStyle = song.loop.on ? css("--felt") : css("--muted");
    sg.fillRect(x(song.loop.start), RULER - 9, x(song.loop.end - song.loop.start), 9);
  }
  sg.fillStyle = css("--ink"); sg.font = `600 13px ${css("--ui")}`; sg.textBaseline = "middle";
  const every = ppb * song.beatsPerBar < 34 ? 4 : ppb * song.beatsPerBar < 60 ? 2 : 1;
  for (let bar = 0; bar * song.beatsPerBar <= beats; bar++) {
    if (bar % every) continue;
    const bx = x(bar * song.beatsPerBar);
    sg.fillRect(Math.round(bx), 0, 1, RULER);
    sg.fillText(String(bar + 1), bx + 4, 11);
  }
  sg.fillStyle = css("--rule"); sg.fillRect(0, RULER - 1, W, 1);
  // the clips
  for (const L of lanesY) for (const c of song.clips) if (c.trackId === L.track.id) drawClip(sg, c, L);
  composite();
}
function clipRect(c, L) {
  const r = L.row.get(c.id) || 0;
  return { x: c.start * ppb, y: L.y + 4 + r * ROW, w: Math.max(3, c.length * ppb), h: ROW - 4 };
}
function drawClip(ctx, c, L) {
  const R = clipRect(c, L), col = css("--t" + L.track.colour), src = song.sources[c.sourceId];
  const dim = c.muted || L.track.mute;
  ctx.save();
  ctx.globalAlpha = dim ? 0.35 : 1;
  ctx.fillStyle = col; ctx.globalAlpha *= 0.22; ctx.fillRect(R.x, R.y, R.w, R.h); ctx.globalAlpha = dim ? 0.35 : 1;
  ctx.strokeStyle = col; ctx.lineWidth = c.id === selected ? 3 : 1.2;
  ctx.strokeRect(R.x + .5, R.y + .5, R.w - 1, R.h - 1);
  ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
  // its sound
  const p = src && src.frames ? peaksOf(c.sourceId) : null;
  if (p) {
    const spbSrc = 60 / (src.bpm || song.bpm), sr = src.sampleRate, spb = 60 / song.bpm;
    const f0 = (src.preroll + c.offset * spbSrc) * sr, mid = R.y + R.h * (L.track.play === "midi" ? 0.3 : 0.5), amp = R.h * (L.track.play === "midi" ? 0.25 : 0.45);
    ctx.fillStyle = col; ctx.globalAlpha *= L.track.play === "midi" ? 0.35 : 0.85;
    for (let px = 0; px < R.w; px++) {
      const f = f0 + (px / ppb) * spb * sr, k = Math.floor(f / p.bin);
      if (k < 0 || k >= p.data.length) continue;
      const v = Math.min(1, p.data[k] / Math.max(p.max, 0.01) * 0.95) * amp;   // each take drawn to its own loudest, however quiet it came in
      ctx.fillRect(R.x + px, mid - v, 1, Math.max(1, v * 2));
    }
    ctx.globalAlpha = dim ? 0.35 : 1;
  }
  // its notes
  const notes = clipNotes(song, c);
  if (notes.length) {
    let lo = Infinity, hi = -Infinity;
    for (const n of notes) { lo = Math.min(lo, n.pitch); hi = Math.max(hi, n.pitch); }
    const span = Math.max(12, hi - lo + 2), top = R.y + 13, hh = R.h - 16;
    ctx.fillStyle = css("--ink"); ctx.globalAlpha *= L.track.play === "midi" ? 0.85 : 0.35;
    for (const n of notes) {
      const y = top + hh - ((n.pitch - lo + 1) / span) * hh;
      ctx.fillRect(n.b0 * ppb, y, Math.max(2, (n.b1 - n.b0) * ppb - 1), 2.5);
    }
    ctx.globalAlpha = dim ? 0.35 : 1;
  }
  ctx.fillStyle = css("--ink"); ctx.font = `600 12px ${css("--ui")}`; ctx.textBaseline = "top";
  const label = c.name || (src && src.frames ? (notes.length ? "sound + MIDI" : "sound") : notes.length ? "MIDI" : "empty");
  ctx.fillText(label + (c.muted ? " (muted)" : ""), R.x + 4, R.y + 2);
  if (src && src.bpm && src.bpm !== song.bpm && src.frames && L.track.play !== "midi") { ctx.fillStyle = css("--felt"); ctx.fillText(`${src.bpm} bpm`, R.x + 4, R.y + R.h - 14); }
  ctx.restore();
}
function composite() {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  g.drawImage(stat, 0, 0);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = eng.where();
  // a take being recorded: its stretch so far, in red
  if (eng.rec && w.u >= eng.rec.uStart) {
    const L = lanesY.find(x => x.track.id === eng.rec.trackId);
    if (L) {
      const a = songAtU(eng.rec.cut), b = w.beat;
      g.fillStyle = css("--rec"); g.globalAlpha = 0.25;
      if (b >= a) g.fillRect(a * ppb, L.y + 2, (b - a) * ppb, L.h - 4);
      else { g.fillRect(a * ppb, L.y + 2, (song.loop.end - a) * ppb, L.h - 4); g.fillRect(song.loop.start * ppb, L.y + 2, (b - song.loop.start) * ppb, L.h - 4); }
      g.globalAlpha = 1;
    }
  }
  // drag ghost
  if (drag && drag.ghost) { g.strokeStyle = css("--brass"); g.setLineDash([4, 3]); g.lineWidth = 2; const R = drag.ghost; g.strokeRect(R.x, R.y, R.w, R.h); g.setLineDash([]); }
  if (drag && drag.kind === "loop") { g.fillStyle = css("--brass"); g.globalAlpha = .35; g.fillRect(Math.min(drag.a, drag.b) * ppb, 0, Math.abs(drag.b - drag.a) * ppb, H); g.globalAlpha = 1; }
  // the playhead
  const ph = (w.countIn ? eng.from : w.beat) * ppb;
  g.fillStyle = eng.rec ? css("--rec") : css("--ink"); g.fillRect(Math.round(ph) - 1, 0, 2, H);
  g.beginPath(); g.moveTo(ph - 6, 0); g.lineTo(ph + 6, 0); g.lineTo(ph, 8); g.fill();
}
const songAtU = u => songBeat(song, eng.from, u);

// following the playhead while playing
function follow() {
  if (eng.state !== "playing" || drag) return;
  const lanes = $("lanes"), x = eng.where().beat * ppb;
  if (x < lanes.scrollLeft || x > lanes.scrollLeft + lanes.clientWidth - 40) lanes.scrollLeft = Math.max(0, x - 60);
}

// ---------- the timeline, by hand ----------
let drag = null;
function hit(px, py) {
  for (const L of lanesY) {
    if (py < L.y || py >= L.y + L.h) continue;
    const clips = song.clips.filter(c => c.trackId === L.track.id);
    for (let i = clips.length - 1; i >= 0; i--) {
      const R = clipRect(clips[i], L);
      if (px >= R.x && px <= R.x + R.w && py >= R.y && py <= R.y + R.h) {
        const edge = px - R.x < 8 && R.w > 20 ? "left" : R.x + R.w - px < 8 && R.w > 20 ? "right" : "body";
        return { clip: clips[i], lane: L, R, edge };
      }
    }
    return { lane: L };
  }
  return null;
}
function trackAt(py) { const L = lanesY.find(L => py >= L.y && py < L.y + L.h); return L ? L.track : null; }
const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
cv.addEventListener("pointermove", e => {
  if (drag) return dragMove(e);
  const p = pos(e);
  if (p.y < RULER) { cv.style.cursor = "text"; return; }
  const h = hit(p.x, p.y);
  cv.style.cursor = h && h.clip ? (h.edge === "body" ? "grab" : "ew-resize") : "default";
});
cv.addEventListener("pointerdown", e => {
  if (e.button !== 0) return;
  lastArea = "timeline";
  const p = pos(e);
  if (p.y < RULER) {
    drag = { kind: "loop", a: snap(song, p.x / ppb, song.snap === "off" ? "beat" : "bar"), b: null, x0: p.x, moved: false };
    drag.b = drag.a;
    cv.setPointerCapture(e.pointerId);
    return;
  }
  const h = hit(p.x, p.y);
  if (!h || !h.clip) { selected = null; drawStatic(); drawInspector(); drag = { kind: "seek", x0: p.x, moved: false }; cv.setPointerCapture(e.pointerId); return; }
  selected = h.clip.id;
  drag = { kind: h.edge, clip: h.clip, x0: p.x, y0: p.y, orig: { ...h.clip }, copy: e.altKey, moved: false, lane: h.lane };
  cv.setPointerCapture(e.pointerId);
  drawStatic(); drawInspector();
});
function dragMove(e) {
  const p = pos(e), d = drag;
  if (Math.abs(p.x - d.x0) > 3 || (d.y0 != null && Math.abs(p.y - d.y0) > 3)) d.moved = true;
  if (!d.moved) return;
  const free = e.shiftKey ? "off" : song.snap;
  if (d.kind === "loop") { d.b = snap(song, p.x / ppb, free === "off" ? "beat" : free); composite(); return; }
  if (d.kind === "seek") return;
  const c = d.clip, o = d.orig, db = (p.x - d.x0) / ppb;
  if (d.kind === "body") {
    c.start = Math.max(0, snap(song, o.start + db, free));
    const tr = trackAt(p.y); if (tr) c.trackId = tr.id;
  } else if (d.kind === "left") {
    const ns = Math.min(o.start + o.length - 0.25, Math.max(0, snap(song, o.start + db, free)));
    const nOff = o.offset + (ns - o.start);
    if (nOff < -preBeats(c)) return;
    c.start = ns; c.length = o.length - (ns - o.start); c.offset = nOff;
  } else if (d.kind === "right") {
    c.length = Math.max(0.25, Math.min(maxLen(c), snap(song, o.start + o.length + db, free) - o.start));
  }
  drawStatic();
}
/** how far before its first beat a clip can reach: the preroll recorded with it */
function preBeats(c) { const s = song.sources[c.sourceId]; return s ? s.preroll / (60 / (s.bpm || song.bpm)) : 0; }
function maxLen(c) {
  const s = song.sources[c.sourceId]; if (!s) return c.length;
  const spb = 60 / (s.bpm || song.bpm);
  const secs = s.frames ? s.frames / s.sampleRate - s.preroll : (s.midi.length ? s.midi[s.midi.length - 1].t - s.preroll : c.length * spb);
  return Math.max(c.length, secs / spb - c.offset);
}
cv.addEventListener("pointerup", e => {
  const d = drag; drag = null; if (!d) return;
  if (d.kind === "loop") {
    const p = pos(e);
    if (!d.moved) { eng.seek(Math.max(0, snap(song, p.x / ppb, song.snap === "off" ? "off" : "beat"))); composite(); return; }
    const a = Math.min(d.a, d.b), b = Math.max(d.a, d.b);
    if (b - a >= 0.5) { history.mark(song, "Set the loop"); song.loop = { on: true, start: a, end: b }; $("loopOn").checked = true; changed(); }
    else composite();
    return;
  }
  if (d.kind === "seek") { if (!d.moved) eng.seek(Math.max(0, snap(song, pos(e).x / ppb, song.snap === "off" ? "off" : "beat"))); composite(); return; }
  if (!d.moved) return;
  const c = d.clip, now = { ...c };
  Object.assign(c, d.orig);
  history.mark(song, d.copy && d.kind === "body" ? "Copy the clip" : d.kind === "body" ? "Move the clip" : "Trim the clip");
  if (d.copy && d.kind === "body") {
    const copy = { ...now, id: uid("c"), created: Date.now(), notes: now.notes ? JSON.parse(JSON.stringify(now.notes)) : undefined };
    song.clips.push(copy); selected = copy.id;
  } else Object.assign(c, now);
  changed();
});
cv.addEventListener("dblclick", e => {
  const p = pos(e), h = hit(p.x, p.y);
  if (h && h.clip) { selected = h.clip.id; drawInspector(); $("inspector").scrollIntoView({ behavior: "smooth", block: "nearest" }); }
});
cv.addEventListener("wheel", e => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  ppb = Math.max(8, Math.min(120, ppb * (e.deltaY < 0 ? 1.12 : 1 / 1.12))); $("zoom").value = ppb; prefs.zoom = ppb; savePrefs();
  drawStatic();
}, { passive: false });
addEventListener("resize", () => drawStatic());
addEventListener("themechange", () => drawAll());
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => drawAll());

// ---------- a clip's panel ----------
const selClip = () => song.clips.find(c => c.id === selected) || null;
function drawInspector() {
  const c = selClip(), box = $("inspector");
  box.classList.toggle("hidden", !c);
  if (!c) return;
  const tr = t(c), src = song.sources[c.sourceId];
  $("clipTitle").textContent = `${tr.name || "Clip"}: ${fmtPos(song, c.start)} to ${fmtPos(song, c.start + c.length)}`;
  $("cStart").value = +(c.start / song.beatsPerBar + 1).toFixed(3);
  $("cLen").value = +c.length.toFixed(3);
  $("cGain").value = c.gain; $("cMute").checked = c.muted;
  const has = src && src.midi.some(e => (e.d[0] & 0xF0) === 0x90);
  $("noteTools").classList.toggle("hidden", !has); $("roll").classList.toggle("hidden", !has);
  $("noteNote").textContent = tr.play === "midi" ? "Note edits are heard: the track plays its MIDI." : "Note edits change the MIDI only (and the MIDI file); this track plays its sound, so they aren't heard until it plays its MIDI.";
  $("noteNote").classList.toggle("warn", tr.play !== "midi");
  if (has) drawRoll();
}
function editClip(label, fn, resched = true) {
  const c = selClip(); if (!c) return;
  history.mark(song, label); fn(c); changed(true, resched);
}
$("cStart").onchange = e => editClip("Move the clip", c => c.start = Math.max(0, (+e.target.value - 1) * song.beatsPerBar));
$("cLen").onchange = e => editClip("Trim the clip", c => c.length = Math.max(0.25, Math.min(maxLen(c), +e.target.value)));
$("cGain").onchange = e => editClip("Clip level", c => c.gain = +e.target.value);
$("cMute").onchange = e => editClip(e.target.checked ? "Mute the clip" : "Unmute the clip", c => c.muted = e.target.checked);
$("cDel").onclick = () => deleteClip();
function deleteClip() { const c = selClip(); if (!c) return; history.mark(song, "Delete the clip"); song.clips = song.clips.filter(x => x !== c); selected = null; changed(); }
$("cDup").onclick = () => duplicate();
function duplicate() {
  const c = selClip(); if (!c) return;
  history.mark(song, "Duplicate the clip");
  const copy = { ...c, id: uid("c"), start: c.start + c.length, created: Date.now(), notes: c.notes ? JSON.parse(JSON.stringify(c.notes)) : undefined };
  song.clips.push(copy); selected = copy.id;
  if (hasLoop(song) && copy.start + copy.length > song.loop.end && c.start + c.length <= song.loop.end) toast("The copy lies past the loop's end: widen the loop on the ruler to hear it.", 4500);
  changed();
}
$("cFill").onclick = () => {
  const c = selClip(); if (!c || !hasLoop(song)) { toast("Set a loop first."); return; }
  history.mark(song, "Fill the loop");
  let s = c.start + c.length, n = 0;
  while (s + 0.01 < song.loop.end) {
    const len = Math.min(c.length, song.loop.end - s);
    song.clips.push({ ...c, id: uid("c"), start: s, length: len, created: Date.now() + n, notes: c.notes ? JSON.parse(JSON.stringify(c.notes)) : undefined });
    s += c.length; n++;
  }
  toast(n ? `Repeated ${n} time${n === 1 ? "" : "s"}.` : "It already reaches the loop's end.");
  changed();
};
$("cSplit").onclick = () => split();
function split() {
  const c = selClip(); if (!c) return;
  const at = snap(song, eng.where().beat, song.snap === "off" ? "off" : song.snap);
  if (at <= c.start + 0.01 || at >= c.start + c.length - 0.01) { toast("Put the playhead inside the clip to split it."); return; }
  history.mark(song, "Split the clip");
  const right = { ...c, id: uid("c"), start: at, length: c.start + c.length - at, offset: c.offset + (at - c.start), created: Date.now(), notes: c.notes ? JSON.parse(JSON.stringify(c.notes)) : undefined };
  c.length = at - c.start;
  song.clips.push(right);
  changed();
}

// the notes, as a piano roll
const roll = $("roll"), rg = roll.getContext("2d");
let rollSel = null, rollDrag = null, rollView = null, lastArea = "timeline";
function drawRoll() {
  const c = selClip(); if (!c) return;
  const notes = editableView(c);
  const w = roll.clientWidth || 800, h = roll.clientHeight || 220, d = Math.min(2, devicePixelRatio || 1);
  roll.width = w * d; roll.height = h * d; rg.setTransform(d, 0, 0, d, 0, 0);
  rg.clearRect(0, 0, w, h);
  let lo = Infinity, hi = -Infinity;
  for (const n of notes) { lo = Math.min(lo, n.pitch); hi = Math.max(hi, n.pitch); }
  if (!notes.length) { lo = 48; hi = 72; }
  lo = Math.floor(lo) - 2; hi = Math.ceil(hi) + 2;
  const rows = hi - lo + 1, rh = h / rows, bw = w / c.length;
  rollView = { lo, hi, rh, bw, h, c };
  for (let p = lo; p <= hi; p++) {
    const black = [1, 3, 6, 8, 10].includes(((p % 12) + 12) % 12);
    rg.fillStyle = black ? css("--lane2") : css("--lane"); rg.fillRect(0, h - (p - lo + 1) * rh, w, rh);
    if (((p % 12) + 12) % 12 === 0) { rg.fillStyle = css("--muted"); rg.font = `11px ${css("--ui")}`; rg.fillText("C" + (Math.floor(p / 12) - 1), 2, h - (p - lo) * rh - 2); }
  }
  for (let b = 0; b <= c.length; b++) { rg.fillStyle = (Math.round(c.start + b) % song.beatsPerBar === 0) ? css("--gridbar") : css("--grid"); rg.fillRect(b * bw, 0, 1, h); }
  const col = css("--t" + t(c).colour);
  notes.forEach((n, i) => {
    const x = (n.b0 - c.offset) * bw, y = h - (n.pitch - lo + 1) * rh, ww = Math.max(3, (n.b1 - n.b0) * bw);
    rg.fillStyle = col; rg.globalAlpha = 0.4 + 0.6 * n.vel / 127; rg.fillRect(x, y + 1, ww, Math.max(3, rh - 2)); rg.globalAlpha = 1;
    if (i === rollSel) { rg.strokeStyle = css("--ink"); rg.lineWidth = 2; rg.strokeRect(x, y + 1, ww, Math.max(3, rh - 2)); }
  });
}
/** the notes the roll edits: the clip's own once edited, else the take's, uncopied until something changes */
function editableView(c) { return c.notes || notesOfClip(c); }
function notesOfClip(c) {
  const src = song.sources[c.sourceId], spb = 60 / (src.bpm || song.bpm);
  return notesOf(src).map(n => ({ b0: (n.t0 - src.preroll) / spb, b1: (n.t1 - src.preroll) / spb, port: n.port, ch: n.ch, note: n.note, vel: n.vel, pitch: n.pitch }));
}
roll.addEventListener("pointerdown", e => {
  lastArea = "roll";
  const c = selClip(); if (!c || !rollView) return;
  const r = roll.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, v = rollView;
  const notes = editableView(c);
  rollSel = null;
  notes.forEach((n, i) => { const nx = (n.b0 - c.offset) * v.bw, ny = v.h - (n.pitch - v.lo + 1) * v.rh, nw = Math.max(3, (n.b1 - n.b0) * v.bw); if (x >= nx && x <= nx + nw && y >= ny && y <= ny + v.rh) rollSel = i; });
  if (rollSel != null) { rollDrag = { x0: x, y0: y, i: rollSel, orig: { ...notes[rollSel] }, moved: false }; roll.setPointerCapture(e.pointerId); }
  drawRoll();
});
roll.addEventListener("pointermove", e => {
  const d = rollDrag, c = selClip(); if (!d || !c) return;
  const r = roll.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, v = rollView;
  if (!d.moved && Math.abs(x - d.x0) + Math.abs(y - d.y0) < 4) return;
  if (!d.moved) { history.mark(song, "Move a note"); editableNotes(song, c); d.moved = true; }
  const n = c.notes[d.i], db = (x - d.x0) / v.bw, dp = Math.round((d.y0 - y) / v.rh);
  const len = d.orig.b1 - d.orig.b0;
  n.b0 = e.shiftKey ? d.orig.b0 + db : snap(song, d.orig.b0 + db); n.b1 = n.b0 + len;
  n.note = d.orig.note + dp; n.pitch = d.orig.pitch + dp;
  drawRoll();
});
roll.addEventListener("pointerup", () => { if (rollDrag && rollDrag.moved) changed(); rollDrag = null; });
function noteEdit(label, fn) {
  const c = selClip(); if (!c) return;
  history.mark(song, label); fn(editableNotes(song, c), c); changed();
}
$("qBtn").onclick = () => noteEdit("Quantize", n => quantizeNotes(n, +$("qGrid").value, +$("qStrength").value));
const shift = k => noteEdit(k > 0 ? "Transpose up" : "Transpose down", n => n.forEach(x => { x.note += k; x.pitch += k; }));
$("tUp").onclick = () => shift(1); $("tDown").onclick = () => shift(-1); $("oUp").onclick = () => shift(12); $("oDown").onclick = () => shift(-12);
$("nRevert").onclick = () => { const c = selClip(); if (!c || !c.notes) return; history.mark(song, "Notes as played"); delete c.notes; changed(); };

// ---------- exports ----------
const exOpts = () => ({ what: $("exWhat").value, times: Math.max(1, +$("exTimes").value || 1) });
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
async function needAudio() {
  for (const c of song.clips) if (!eng.audioDone(c.sourceId)) { toast("A take is still finishing; try again in a moment."); return false; }
  if (!eng.ctx) { toast("Start the looper first."); return false; }
  return true;
}
$("exMix").onclick = async () => {
  if (!await needAudio()) return;
  toast("Mixing…", 10000);
  const r = await render(song, eng, exOpts());
  download(wav(r.l, r.r, r.sr), `${safeName(song.name)}-${stamp()}.wav`); toast("Mixed.");
};
$("exStems").onclick = async () => {
  if (!await needAudio()) return;
  toast("Rendering the stems…", 10000);
  for (const tr of song.tracks) {
    if (!song.clips.some(c => c.trackId === tr.id)) continue;
    const r = await render(song, eng, { ...exOpts(), track: tr.id });
    download(wav(r.l, r.r, r.sr), `${safeName(song.name)}-${safeName(tr.name)}-${stamp()}.wav`);
    await new Promise(z => setTimeout(z, 400));
  }
  toast("The stems are saved, one per track.");
};
$("exMidi").onclick = () => {
  const f = midiFile(song, exOpts());
  download(new Blob([f], { type: "audio/midi" }), `${safeName(song.name)}-${stamp()}.mid`);
};
$("exProj").onclick = async () => {
  for (const c of song.clips) if (!eng.audioDone(c.sourceId)) { toast("A take is still finishing; try again in a moment."); return; }
  const blob = await packProject(song, async id => { const a = eng.audio.get(id); if (a && a.complete) return a; try { return await store.getAudio(id); } catch (e) { return null; } });
  download(blob, `${safeName(song.name)}.mcloop`);
};
$("imProjBtn").onclick = () => $("imProj").click();
$("imProj").onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const { song: s, audio } = await unpackProject(f);
    // a copy of its own, so opening the same file twice doesn't overwrite the first
    s.id = uid("s"); s.updated = Date.now();
    for (const [id, a] of audio) { await store.putAudio(id, a.l, a.r); eng.setAudio(id, a.l, a.r); }
    await store.saveSong(s);
    openSong(s); toast(`Opened ${s.name}.`);
  } catch (er) { toast(er.message || "That file couldn't be opened."); }
  e.target.value = "";
};

// ---------- keys ----------
addEventListener("keydown", e => {
  if (e.target.closest && e.target.closest("input[type=text],input[type=number],select,textarea")) return;
  if (!eng.ctx) return;
  const k = e.key, mod = e.ctrlKey || e.metaKey;
  if (k === " ") { e.preventDefault(); $("playBtn").click(); }
  else if (mod && (k === "z" || k === "Z")) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && (k === "y")) { e.preventDefault(); redo(); }
  else if (mod && k === "d") { e.preventDefault(); duplicate(); }
  else if (mod) return;
  else if (k === "r" || k === "R") doRecord();
  else if (k === "Home") $("homeBtn").click();
  else if (k === "t" || k === "T") tap();
  else if (k === "c" || k === "C") { $("metOn").checked = !$("metOn").checked; $("metOn").dispatchEvent(new Event("change")); }
  else if (k === "l" || k === "L") { $("loopOn").checked = !$("loopOn").checked; $("loopOn").dispatchEvent(new Event("change")); }
  else if (k === "n" || k === "N") addTrack();
  else if (k === "s" || k === "S") split();
  else if (k === "Delete" || k === "Backspace") {
    const c = selClip(); if (!c) return;
    e.preventDefault();
    if (lastArea === "roll" && rollSel != null) { noteEdit("Delete a note", n => n.splice(rollSel, 1)); rollSel = null; }
    else deleteClip();
  }
  else if ((k === "ArrowLeft" || k === "ArrowRight") && selClip()) {
    e.preventDefault();
    const step = snapBeats(song, song.snap) || 0.25;
    editClip("Nudge the clip", c => c.start = Math.max(0, c.start + (k === "ArrowLeft" ? -step : step)));
  }
  else if (/^[1-9]$/.test(k)) { const tr = song.tracks[+k - 1]; if (tr) armTrack(tr); }
});

// ---------- the frame ----------
function frame() {
  if (eng.ctx) {
    drawTransport();
    composite();
    follow();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setInterval(() => { if (eng.ctx) showLatency(); }, 2000);

// ---------- opening ----------
(async () => {
  let id = null; try { id = localStorage.getItem(CUR); } catch (e) {}
  try {
    const s = id && await store.loadSong(id);
    if (s) { song = s; eng.song = s; for (const sid of Object.keys(s.sources || {})) if (!s.clips.some(c => c.sourceId === sid)) delete s.sources[sid]; }
    const keep = usedSources(song, history);
    store.gc(keep).catch(() => {});
  } catch (e) { $("storeNote").textContent = "This browser isn't keeping songs: " + (e.message || e); }
  syncControls(); listSongs();
})();
