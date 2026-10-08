// The looper's page by hand, with no minichord needed: Chrome's fake audio input (a beep) stands in
// for its sound and a stand-in Web MIDI for its notes. Clips dragged, trimmed and copied, the loop
// set on the ruler, the keys, a MIDI track played by the piano and by the minichord (MIDI in plays
// switched on while it does, and back off), recording on into the next track, and the exports and
// a project file opened again.
//   node looper/ui.test.js
const fs = require("fs"), path = require("path"), http = require("http"), os = require("os");
const { chromium } = require("playwright-core");
const ROOT = path.resolve(__dirname, "../..");
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
// a minichord's settings: firmware 36, MPE on, chords and harp on channel 1
const DUMP = [0xF0]; for (let a = 0; a < 256; a++) { const v = { 7: 36, 110: 1, 35: 0 }[a] || 0; DUMP.push(v & 127, v >> 7); } DUMP.push(0xF7);
const MOCK = fs.readFileSync(path.join(__dirname, "live.test.js"), "utf8").match(/const MOCK = `([\s\S]*?)`;/)[1];

(async () => {
  const server = await serve(), port = server.address().port;
  const dl = fs.mkdtempSync(path.join(os.tmpdir(), "looper-"));
  const browser = await chromium.launch({ channel: "chrome", headless: true,
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
  try {
    const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 1000 } });
    const page = await ctx.newPage();
    page.on("pageerror", e => { fails++; console.log("  ✗ page error: " + e.message); });
    await page.addInitScript(`window.__dump=${JSON.stringify(DUMP)};` + MOCK);
    await page.goto(`http://127.0.0.1:${port}/looper/`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.click("#connect");
    await page.click("#startBtn");
    await page.waitForSelector("#transport:not(.hidden)");
    await sleep(500);
    await page.evaluate(() => {
      window.__note = (t, note, len = 0.2) => {
        const eng = window.looper, at = eng.perfAt(t) - performance.now();
        setTimeout(() => window.__mini.i1.fire([0x91, note, 100]), Math.max(0, at));
        setTimeout(() => window.__mini.i1.fire([0x81, note, 0]), Math.max(0, at + len * 1000));
      };
    });
    await page.fill("#bpm", "150"); await page.dispatchEvent("#bpm", "change");
    await page.selectOption("#countIn", "0");

    // a first take, from the R key, closed by it a bar later
    const first = await page.evaluate(async () => {
      const eng = window.looper;
      dispatchEvent(new KeyboardEvent("keydown", { key: "r" }));
      for (let b = 0; b < 4; b++) window.__note(eng.tAt(b), 60 + b * 2);
      await new Promise(r => setTimeout(r, eng.perfAt(eng.tAt(3.8)) - performance.now()));
      dispatchEvent(new KeyboardEvent("keydown", { key: "r" }));
      await new Promise(r => setTimeout(r, 900));
      const s = window.looperSong();
      return { clips: s.clips.length, loop: [s.loop.start, s.loop.end], notes: s.clips[0] && s.sources[s.clips[0].sourceId].midi.length };
    });
    check("R records and closes a one-bar loop", first.clips === 1 && first.loop[0] === 0 && first.loop[1] === 4 && first.notes === 8, JSON.stringify(first));

    // one undo takes away the first take and the loop it set, and redo brings both back
    const u1 = await page.evaluate(() => { document.getElementById("undoBtn").click(); const s = window.looperSong(); const r = { clips: s.clips.length, loop: s.loop.end }; document.getElementById("redoBtn").click(); return { ...r, back: s.clips.length, loopBack: s.loop.end }; });
    check("one undo takes the first take and its loop", u1.clips === 0 && u1.loop === 0 && u1.back === 1 && u1.loopBack === 4, JSON.stringify(u1));

    // the clip dragged two bars on, snapped to the beat; undone
    const tl = await page.locator("#tl").boundingBox(), ppb = await page.evaluate(() => +document.getElementById("zoom").value);
    const cy = tl.y + 30 + 20, cx = tl.x + 2 * ppb;
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 8.3 * ppb, cy, { steps: 6 }); await page.mouse.up();
    let start = await page.evaluate(() => window.looperSong().clips[0].start);
    check("a clip drags, snapped to the beat", start === 8, `start ${start}`);
    await page.keyboard.press("Control+z");
    start = await page.evaluate(() => window.looperSong().clips[0].start);
    check("undo puts it back", start === 0, `start ${start}`);

    // Alt-drag copies; its right edge trims
    await page.keyboard.down("Alt");
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 4 * ppb, cy, { steps: 6 }); await page.mouse.up();
    await page.keyboard.up("Alt");
    const copies = await page.evaluate(() => window.looperSong().clips.map(c => c.start).sort((a, b) => a - b));
    check("Alt-drag copies", copies.length === 2 && copies[1] === 4, JSON.stringify(copies));
    const ex = tl.x + 8 * ppb - 3;
    await page.mouse.move(ex, cy); await page.mouse.down(); await page.mouse.move(ex - 2 * ppb, cy, { steps: 5 }); await page.mouse.up();
    const len = await page.evaluate(() => window.looperSong().clips.find(c => c.start === 4).length);
    check("its right edge trims", len === 2, `length ${len}`);

    // the loop, dragged along the ruler: bars 1 to 3
    await page.mouse.move(tl.x + 2, tl.y + 12); await page.mouse.down(); await page.mouse.move(tl.x + 8 * ppb + 2, tl.y + 12, { steps: 6 }); await page.mouse.up();
    const loop = await page.evaluate(() => window.looperSong().loop);
    check("the ruler sets the loop", loop.start === 0 && loop.end === 8, JSON.stringify(loop));

    // Delete deletes the selected clip (the copy, last touched)
    await page.keyboard.press("Delete");
    const left = await page.evaluate(() => window.looperSong().clips.length);
    check("Delete deletes the clip", left === 1);

    // the track plays its MIDI through the piano
    await page.selectOption(".head .play", "piano");
    const piano = await page.evaluate(async () => {
      window.looper.seek(0); window.looper.play();
      await new Promise(r => setTimeout(r, 700));
      const n = window.looper.live.filter(s => s.kind === "note").length;
      window.looper.stop(); return n;
    });
    check("a MIDI track plays through the piano", piano >= 1, `${piano} notes placed`);

    // through the minichord: MIDI in plays switched on, notes on its chord channel, then back off
    await page.selectOption(".head .play", "minichord");
    const mini = await page.evaluate(async () => {
      window.__sent.length = 0;
      window.looper.seek(0); window.looper.play();
      await new Promise(r => setTimeout(r, 1200));
      window.looper.stop();
      const s = window.__sent.map(x => x.data);
      return { on: s.some(d => d.join() === "240,8,0,1,0,247"), notes: s.filter(d => d[0] === 0x90).length, off: s[s.length - 1].join() };
    });
    check("a MIDI track plays through the minichord", mini.on && mini.notes >= 2 && mini.off === "240,8,0,0,0,247", JSON.stringify(mini));
    await page.selectOption(".head .play", "audio");

    // recording on into the next track: a pass on track 1, the next on a new track 2; stopped a moment
    // into a third pass, its sliver and the track made for it are let go
    await page.selectOption("#passEnd", "next");
    await page.selectOption("#punch", "now");
    const next = await page.evaluate(async () => {
      const eng = window.looper, s = window.looperSong();
      eng.seek(0);
      document.getElementById("recBtn").click();
      for (let b = 0; b < 16; b++) window.__note(eng.tAt(b + 0.25), 70 + (b % 4));
      await new Promise(r => setTimeout(r, eng.perfAt(eng.tAt(16.2)) - performance.now()));
      document.getElementById("playBtn").click();
      await new Promise(r => setTimeout(r, 300));
      return { tracks: s.tracks.length, perTrack: s.tracks.map(t => s.clips.filter(c => c.trackId === t.id).length), armed: s.tracks.findIndex(t => t.armed) };
    });
    check("at the loop's end it records on into the next track", next.tracks === 2 && next.perTrack[0] === 2 && next.perTrack[1] === 1 && next.armed === 1, JSON.stringify(next));

    // exports
    const save = async (sel) => { const [d] = await Promise.all([page.waitForEvent("download", { timeout: 20000 }), page.click(sel)]); const f = path.join(dl, d.suggestedFilename()); await d.saveAs(f); return f; };
    await sleep(3500);   // the last take's tail
    const wavF = await save("#exMix");
    const wh = fs.readFileSync(wavF);
    check("the mix saves as a WAV", wh.toString("ascii", 0, 4) === "RIFF" && wh.toString("ascii", 8, 12) === "WAVE" && wh.length > 1000, `${path.basename(wavF)} ${wh.length} bytes`);
    const midF = await save("#exMidi");
    check("the MIDI file saves", fs.readFileSync(midF).toString("ascii", 0, 4) === "MThd");
    const projF = await save("#exProj");
    check("the project file saves", fs.readFileSync(projF).toString("ascii", 0, 7) === "MCLOOP1");

    // and opens again, as a song of its own
    const before = await page.evaluate(() => ({ id: window.looperSong().id, clips: window.looperSong().clips.length }));
    await page.setInputFiles("#imProj", projF);
    await sleep(1200);
    const after = await page.evaluate(() => { const s = window.looperSong(); return { id: s.id, clips: s.clips.length, audio: s.clips.filter(c => window.looper.audio.has(c.sourceId)).length }; });
    check("a project file opens as a song of its own", after.id !== before.id && after.clips === before.clips && after.audio === after.clips, JSON.stringify({ before, after }));
    const songs = await page.locator("#songs li").count();
    check("both songs are listed", songs === 2, `${songs}`);

    // with the loop off, a take runs straight on and leaves the loop alone
    const off = await page.evaluate(async () => {
      const eng = window.looper, s = window.looperSong();
      document.getElementById("loopOn").click();
      const loop = JSON.stringify(s.loop), n = s.clips.length;
      eng.seek(40);
      document.getElementById("recBtn").click();
      for (let b = 0; b < 10; b++) window.__note(eng.tAt(b + 0.1), 62);
      await new Promise(r => setTimeout(r, eng.perfAt(eng.tAt(10)) - performance.now()));
      document.getElementById("playBtn").click();
      await new Promise(r => setTimeout(r, 300));
      const c = s.clips[s.clips.length - 1];
      return { added: s.clips.length - n, start: c.start, length: c.length, same: JSON.stringify(s.loop) === loop };
    });
    check("with the loop off, a take runs straight on", off.added === 1 && off.start === 40 && Math.abs(off.length - 10) < 0.2 && off.same, JSON.stringify(off));
    await page.evaluate(() => { document.getElementById("loopOn").click(); window.looper.stop(); });

    // the minichord's double tap: control change 90 on its own port, its value the tap's delay; the
    // first loop closes where the tap landed, 200 ms before the message (value 127 - 50)
    const tap = await page.evaluate(async () => {
      const eng = window.looper, s = window.looperSong();
      document.getElementById("newSong").click();
      await new Promise(r => setTimeout(r, 300));
      const song = window.looperSong();
      song.countIn = 0; song.bpm = 120;
      window.__mini.i1.fire([0xB0, 90, 127]);                      // a tap: record
      await new Promise(r => setTimeout(r, 200));
      const t0 = eng.tAt(0);
      // the second tap lands at 5.9 beats, under a bar and a half, and the minichord says so 200 ms
      // (0.4 beats) later: read as when it arrived, at 6.3 beats, it would round to two bars
      await new Promise(r => setTimeout(r, eng.perfAt(t0 + 5.9 * 0.5) - performance.now() + 200));
      window.__mini.i1.fire([0xB0, 90, 127 - 50]);
      await new Promise(r => setTimeout(r, 600));
      const sg = window.looperSong();
      return { loop: [sg.loop.start, sg.loop.end], clips: sg.clips.length, state: eng.state, rec: !!eng.rec, recorded: sg.clips[0] && sg.sources[sg.clips[0].sourceId].midi.some(e => (e.d[0] & 0xF0) === 0xB0) };
    });
    check("the minichord's double tap records and closes the loop where the tap landed", tap.loop[0] === 0 && tap.loop[1] === 4 && tap.clips === 1 && tap.state === "playing" && !tap.rec && !tap.recorded, JSON.stringify(tap));
    await page.evaluate(() => window.looper.stop());

    // space plays and stops
    await page.keyboard.press("Space"); await sleep(300);
    const playing = await page.evaluate(() => window.looper.state);
    await page.keyboard.press("Space"); await sleep(100);
    const stopped = await page.evaluate(() => window.looper.state);
    check("Space plays and stops", playing === "playing" && stopped === "stopped");
  } finally {
    await browser.close(); server.close();
    fs.rmSync(dl, { recursive: true, force: true });
  }
  console.log(fails ? `FAILED ${fails}` : "ok");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
