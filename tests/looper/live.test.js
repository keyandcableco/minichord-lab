// The looper against a real minichord: its sound comes in over USB audio as it would for a player,
// and a stand-in "player" plays it on the beat by sending it notes over raw MIDI (/dev/snd/midiC*D0,
// MIDI in plays switched on for the test and back off after) while the same notes reach the page
// as the minichord's MIDI would. Web MIDI itself is stood in for: Chrome never opens the ALSA
// sequencer, whose release with the minichord plugged in can wedge kernel 6.1.
//
//   node looper/live.test.js            (the minichord plugged in; set MINICHORD_MIDI to its rawmidi device)
//
// Checks: calibration finds the input's latency; a first take with a count-in closes a loop of
// whole bars; its sound and its MIDI land on the beat the player played to; an overdub stacks on a
// row; undo takes it away; the mix renders the notes where they were played; the MIDI file writes.
const fs = require("fs"), path = require("path"), http = require("http");
const { chromium } = require("playwright-core");
const ROOT = path.resolve(__dirname, "../..");
const DEV = process.env.MINICHORD_MIDI || findDev();
function findDev() {
  for (const card of fs.readdirSync("/proc/asound").filter(x => /^card\d+$/.test(x))) {
    try { if (/minichord/i.test(fs.readFileSync(`/proc/asound/${card}/id`, "utf8"))) return `/dev/snd/midiC${card.slice(4)}D0`; } catch (e) {}
  }
  return null;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, more = "") => { if (!ok) fails++; console.log(`  ${ok ? "✓" : "✗"} ${name}${more ? "  " + more : ""}`); };

function serve() {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".woff2": "font/woff2" };
  return new Promise(done => {
    const s = http.createServer((q, r) => {
      const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
    }).listen(0, "127.0.0.1", () => done(s));
  });
}

/** reads the minichord's settings over raw MIDI */
function dump(fd) {
  fs.writeSync(fd, Buffer.from([0xF0, 0, 0, 0, 0, 0xF7]));
  const buf = Buffer.alloc(4096); let got = Buffer.alloc(0); const t0 = Date.now();
  while (Date.now() - t0 < 2000) {
    let n = 0; try { n = fs.readSync(fd, buf, 0, buf.length, null); } catch (e) { if (e.code !== "EAGAIN") throw e; }
    if (n) got = Buffer.concat([got, buf.subarray(0, n)]);
    const i = got.indexOf(0xF0); if (i >= 0 && got.length - i >= 514) return [...got.subarray(i, i + 514)];
  }
  return null;
}
const param = (d, a) => d[1 + 2 * a] + 128 * d[2 + 2 * a];
const write = (fd, a, v) => fs.writeSync(fd, Buffer.from([0xF0, a & 127, a >> 7, v & 127, (v >> 7) & 127, 0xF7]));

// Web MIDI, stood in for: a minichord's two ports, answering a request for its settings with the real
// one's, and passing what the page sends it on to the real one
const MOCK = `(() => {
  class Port extends EventTarget {
    constructor(id, name, type){ super(); this.id=id; this.name=name; this.type=type; this.state="connected"; this.connection="open"; this.manufacturer="minichord"; this._on=null; }
    set onmidimessage(f){ this._on=f; } get onmidimessage(){ return this._on; }
    fire(data){ const e=new Event("midimessage"); Object.defineProperty(e,"data",{value:new Uint8Array(data)}); if(this._on) this._on(e); this.dispatchEvent(e); }
    send(data, ts){ window.__sent.push({data:[...data], ts}); if(data[0]===0xF0 && data.length===6 && !data[1] && !data[2] && !data[3]) setTimeout(()=>this._in.fire(window.__dump),5); else window.__hw && window.__hw([...data], ts||0); }
    open(){ return Promise.resolve(this); } close(){ return Promise.resolve(this); }
  }
  window.__sent=[];
  const i1=new Port("i1","minichord MIDI 1","input"), i2=new Port("i2","minichord MIDI 2","input");
  const o1=new Port("o1","minichord MIDI 1","output"), o2=new Port("o2","minichord MIDI 2","output");
  o1._in=i1; o2._in=i1;
  window.__mini={i1,i2,o1,o2};
  const access={inputs:new Map([["i1",i1],["i2",i2]]), outputs:new Map([["o1",o1],["o2",o2]]), sysexEnabled:true, onstatechange:null, addEventListener(){}};
  navigator.requestMIDIAccess=()=>Promise.resolve(access);
})();`;

(async () => {
  if (!DEV) { console.log("No minichord found: plug it in (or set MINICHORD_MIDI)."); process.exit(2); }
  const fd = fs.openSync(DEV, fs.constants.O_RDWR | fs.constants.O_NONBLOCK);
  const d = dump(fd);
  if (!d) { console.log("The minichord didn't answer for its settings."); process.exit(2); }
  const was8 = param(d, 8);
  console.log(`minichord firmware ${param(d, 7)}, MPE ${param(d, 110)}, usb audio ${param(d, 244)}, MIDI in plays ${was8}`);
  // the preset as it is, pushed, then sharp chords for timing by: a quick attack and a short decay, loud
  fs.writeSync(fd, Buffer.from([0xF0, 0, 0, 5, 0, 0xF7]));
  await sleep(100);
  write(fd, 8, 1);
  for (const [a, v] of [[137, 1], [138, 120], [140, 0], [141, 30], [3, 100]]) write(fd, a, v);
  const server = await serve(), port = server.address().port;
  const browser = await chromium.launch({ channel: "chrome", headless: true,
    args: ["--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
  try {
    const page = await browser.newPage();
    page.on("pageerror", e => { fails++; console.log("  ✗ page error: " + e.message); });
    page.on("console", m => { if (m.type() === "error") console.log("  (console) " + m.text()); });
    let hwN = 0, hwErr = 0;
    await page.exposeFunction("__hw", data => { try { fs.writeSync(fd, Buffer.from(data)); hwN++; } catch (e) { hwErr++; if (process.env.DEBUG) console.log("    hw write: " + e.code); } });
    await page.addInitScript(`window.__dump=${JSON.stringify(d)};` + MOCK);
    await page.goto(`http://127.0.0.1:${port}/looper/`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.click("#connect");
    await page.click("#startBtn");
    await page.waitForSelector("#transport:not(.hidden)", { timeout: 8000 });
    const label = await page.evaluate(() => window.looper.inputLabel);
    check("the minichord's audio is the input", /minichord/i.test(label), label);
    await sleep(800);

    // the stand-in player: plays a chord note on the minichord at a heard time, and its MIDI comes in
    await page.evaluate(() => {
      window.__play = (t, note = 60, len = 0.25) => {
        const eng = window.looper, at = eng.perfAt(t) - performance.now();
        setTimeout(() => { window.__hw([0x90, note, 100]); window.__mini.i1.fire([0x91, note, 100]); }, Math.max(0, at));
        setTimeout(() => { window.__hw([0x80, note, 0]); window.__mini.i1.fire([0x81, note, 0]); }, Math.max(0, at + len * 1000));
      };
    });

    // calibrating: the player plays on each click, as it's heard
    const cal = await page.evaluate(async () => {
      const eng = window.looper, ctx = eng.ctx, t0 = ctx.currentTime + 0.3;
      const p = eng.calibrate(8);
      for (let i = 1; i <= 8; i++) window.__play(t0 + i * 0.6, 60, 0.2);
      return await p;
    });
    check("calibration measures the input's latency", !cal.error && cal.latency > 0.002 && cal.latency < 0.2,
      cal.error || `${(cal.latency * 1000).toFixed(1)} ms, ${cal.found} chords, spread ${(cal.spread * 1000).toFixed(1)} ms`);

    // a first take: 120 bpm, a bar's count-in, two bars played on every beat, closed by pressing record
    await page.fill("#bpm", "120"); await page.dispatchEvent("#bpm", "change");
    await page.selectOption("#countIn", "1");
    const take = await page.evaluate(async () => {
      const eng = window.looper;
      document.getElementById("recBtn").click();
      const notes = [60, 64, 67, 72, 60, 64, 67, 72];
      for (let b = 0; b < 8; b++) window.__play(eng.tAt(b), notes[b], 0.2);
      // pressed a little late, as a player would: the loop still closes at two bars
      await new Promise(r => setTimeout(r, eng.perfAt(eng.tAt(8.15)) - performance.now()));
      document.getElementById("recBtn").click();
      await new Promise(r => setTimeout(r, 4000));      // its sound rings on, then the take completes
      const s = window.looperSong(), c = s.clips[0], src = c && s.sources[c.sourceId], a = c && eng.audio.get(c.sourceId);
      // where the sound starts after each note's beat, in the take
      const ons = [];
      if (a && a.complete) {
        const { onsetAfter } = await import("/looper/engine.js");
        const tape = [{ t: -src.preroll, l: a.l, r: a.r }];
        for (let b = 0; b < 8; b++) { const o = onsetAfter(tape, b * 0.5 - 0.04, b * 0.5 + 0.12, src.sampleRate); ons.push(o == null ? null : o - b * 0.5); }
      }
      const midiOns = src ? src.midi.filter(e => (e.d[0] & 0xF0) === 0x90).map(e => e.t - src.preroll) : [];
      return { clips: s.clips.length, loop: s.loop, length: c && c.length, frames: src && src.frames, tail: src && src.tail, ons, midiOns, state: eng.state, rec: !!eng.rec };
    });
    check("the first take makes a clip and a two-bar loop", take.clips === 1 && take.loop.start === 0 && take.loop.end === 8 && take.length === 8, JSON.stringify(take.loop));
    check("still playing, no longer recording", take.state === "playing" && !take.rec);
    check("the take has its sound, kept on past its end until it dies away", take.frames > 0 && take.tail >= 0 && take.tail < 3, `tail ${take.tail && take.tail.toFixed(2)} s`);
    const midiOff = take.midiOns.map((t, i) => t - i * 0.5);
    check("its MIDI lands on the beats played", take.midiOns.length === 8 && midiOff.every(x => Math.abs(x) < 0.012), midiOff.map(x => (x * 1000).toFixed(1)).join(" "));
    // a note now and then sounds late on the minichord itself (a voice still releasing retriggers first):
    // one is allowed, as long as its MIDI was on time
    const audioOff = take.ons.filter(x => x != null);
    check("its sound lands on the beats played", audioOff.length >= 6 && audioOff.filter(x => Math.abs(x) > 0.015).length <= 1, take.ons.map(x => x == null ? "–" : (x * 1000).toFixed(1)).join(" ") + " ms");

    // an overdub: punched in at the loop, one pass, then playing
    await page.selectOption("#punch", "loop");
    const over = await page.evaluate(async () => {
      const eng = window.looper;
      document.getElementById("recBtn").click();
      const at = eng.armWait && eng.armWait.u;
      for (let b = 0; b < 8; b += 2) window.__play(eng.tAt(at + b + 0.5), 79, 0.15);
      await new Promise(r => setTimeout(r, eng.perfAt(eng.tAt(at + 8)) - performance.now() + 3500));
      const s = window.looperSong();
      const { layers } = await import("/looper/model.js");
      return { clips: s.clips.length, rows: layers(s, s.tracks[0].id).rows, starts: s.clips.map(c => c.start), rec: !!eng.rec, wait: !!eng.armWait };
    });
    check("the overdub stacks on a row of its own", over.clips === 2 && over.rows === 2 && over.starts.every(x => x === 0) && !over.rec && !over.wait, JSON.stringify(over));

    // playing on: the scheduler has both takes placed
    const placed = await page.evaluate(() => window.looper.live.filter(s => s.kind === "audio").length);
    check("both takes are playing", placed >= 2, `${placed} sources`);

    // the mix, rendered: the first take's notes where they were played
    const mix = await page.evaluate(async () => {
      const { render } = await import("/looper/files.js");
      // the first take alone: the overdub's off-beat notes ring into the beats
      const s = window.looperSong(), over = s.clips[1]; if (over) over.muted = true;
      const r = await render(s, window.looper, { what: "loop", times: 2 });
      if (over) over.muted = false;
      const { onsetAfter } = await import("/looper/engine.js");
      const tape = [{ t: 0, l: r.l, r: r.r }], hits = [];
      for (let b = 0; b < 16; b++) { const o = onsetAfter(tape, b * 0.5 - 0.04, b * 0.5 + 0.12, r.sr); hits.push(o == null ? null : o - b * 0.5); }
      return { seconds: r.l.length / r.sr, hits };
    });
    const mh = mix.hits.filter(x => x != null);
    check("the mix renders the loop twice, notes on the beat", mix.seconds >= 8 && mh.length >= 10 && mh.filter(x => Math.abs(x) > 0.02).length <= 2,
      mix.hits.map(x => x == null ? "–" : (x * 1000).toFixed(0)).join(" ") + " ms");

    // pictures of it, for looking at: SHOTS=<folder>
    if (process.env.SHOTS) {
      const dir = process.env.SHOTS; fs.mkdirSync(dir, { recursive: true });
      await page.setViewportSize({ width: 1400, height: 1000 });
      await page.evaluate(() => { const s = window.looperSong(); document.querySelector("#tl").dispatchEvent(new Event("pointerleave")); });
      // the first clip selected, for its panel and notes
      const box = await page.locator("#tl").boundingBox();
      await page.mouse.click(box.x + 60, box.y + 30 + 20);
      await sleep(300);
      await page.screenshot({ path: path.join(dir, "looper-light.png"), fullPage: true });
      await page.emulateMedia({ colorScheme: "dark" }); await page.evaluate(() => dispatchEvent(new CustomEvent("themechange"))); await sleep(300);
      await page.screenshot({ path: path.join(dir, "looper-dark.png"), fullPage: true });
      await page.emulateMedia({ colorScheme: "light" });
      await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => dispatchEvent(new Event("resize"))); await sleep(300);
      await page.screenshot({ path: path.join(dir, "looper-phone.png"), fullPage: true });
      const wide = await page.evaluate(() => document.documentElement.scrollWidth);
      check("no sideways scroll on a phone", wide <= 390, `${wide}px`);
      await page.setViewportSize({ width: 1280, height: 900 });
    }

    // undo takes the overdub away; stop
    const undone = await page.evaluate(async () => {
      document.getElementById("undoBtn").click();
      const n = window.looperSong().clips.length;
      document.getElementById("playBtn").click();
      return { n, state: window.looper.state };
    });
    check("undo takes the overdub away", undone.n === 1);
    check("stop stops", undone.state === "stopped");

    // the MIDI file
    const midi = await page.evaluate(async () => { const { midiFile } = await import("/looper/files.js"); const f = midiFile(window.looperSong(), { what: "loop", times: 1 }); return [...f.slice(0, 4)].map(c => String.fromCharCode(c)).join("") + f.length; });
    check("the MIDI file writes", midi.startsWith("MThd"), midi);

    // kept: reloaded, the song and its take come back
    await sleep(800);
    await page.reload();
    await page.click("#startBtn");
    await page.waitForSelector("#transport:not(.hidden)");
    await sleep(800);
    const back = await page.evaluate(() => { const s = window.looperSong(), c = s.clips[0]; return { clips: s.clips.length, audio: c && window.looper.audio.has(c.sourceId) }; });
    check("kept in the browser: the song and its take come back", back.clips === 1 && back.audio, JSON.stringify(back));
  } finally {
    await browser.close();
    server.close();
    // every note off, and MIDI in plays back as it was
    for (const n of [60, 64, 67, 72, 79]) try { fs.writeSync(fd, Buffer.from([0x80, n, 0])); } catch (e) {}
    write(fd, 8, was8);
    fs.writeSync(fd, Buffer.from([0xF0, 0, 0, 6, 0, 0xF7]));   // and the preset popped back, exactly as it was
    await sleep(300);
    fs.closeSync(fd);
  }
  console.log(fails ? `FAILED ${fails}` : "ok");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
