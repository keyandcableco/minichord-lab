// The Vocoder page against a real minichord: the page sets it up (over a stand-in Web MIDI that passes
// what it sends on to the minichord over raw MIDI, /dev/snd/midiC*D0: Chrome never opens the ALSA
// sequencer, whose release with the minichord plugged in can wedge kernel 6.1), finds its speaker and
// plays a loop into it, a chord is held (MIDI in plays, switched on for the test), and the minichord's
// own sound is recorded back over USB audio with parecord.
//
//   node vocoder/live.test.js           (the minichord plugged in; set MINICHORD_MIDI to its rawmidi device)
//   TAKES=<folder> node vocoder/live.test.js   also keeps what was recorded, as WAVs
//
// Checks: the page finds the minichord's speaker; the held chord talks, its loudness following the
// voice's sentence by sentence and near silent between them; without the voice it's silent (the
// vocoder at 100 lets none of the dry chord through); given back, the chord sounds as before.
const fs = require("fs"), path = require("path"), http = require("http"), { spawn, execFileSync } = require("child_process");
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
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".flac": "audio/flac", ".woff2": "font/woff2" };
  return new Promise(done => {
    const s = http.createServer((q, r) => {
      const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
    }).listen(0, "127.0.0.1", () => done(s));
  });
}
function dump(fd) {
  const buf = Buffer.alloc(4096);
  for (let k = 0; k < 20; k++) try { fs.readSync(fd, buf, 0, buf.length, null); } catch (e) {}   // anything left waiting
  fs.writeSync(fd, Buffer.from([0xF0, 0, 0, 0, 0, 0xF7])); let got = Buffer.alloc(0); const t0 = Date.now();
  while (Date.now() - t0 < 2000) {
    let n = 0; try { n = fs.readSync(fd, buf, 0, buf.length, null); } catch (e) { if (e.code !== "EAGAIN") throw e; }
    if (n) got = Buffer.concat([got, buf.subarray(0, n)]);
    const i = got.indexOf(0xF0); if (i >= 0 && got.length - i >= 514) return [...got.subarray(i, i + 514)];
  }
  return null;
}
const param = (d, a) => d[1 + 2 * a] + 128 * d[2 + 2 * a];
const write = (fd, a, v) => fs.writeSync(fd, Buffer.from([0xF0, a & 127, a >> 7, v & 127, (v >> 7) & 127, 0xF7]));
const MOCK = fs.readFileSync(path.join(__dirname, "../looper/live.test.js"), "utf8").match(/const MOCK = `([\s\S]*?)`;/)[1];

// the minichord's sound, as it comes in over USB: mono 16-bit samples at 44.1 kHz
const SOURCE = () => execFileSync("pactl", ["list", "short", "sources"], { encoding: "utf8" }).split("\n").map(l => l.split("\t")[1]).find(n => n && /minichord/i.test(n) && !/monitor/.test(n));
function record(seconds, keep) {
  return new Promise((done, fail) => {
    const p = spawn("parecord", ["-d", SOURCE(), "--raw", "--format=s16le", "--rate=44100", "--channels=1", "--latency-msec=20"]);
    const chunks = []; p.stdout.on("data", c => chunks.push(c)); p.on("error", fail);
    setTimeout(() => p.kill("SIGINT"), seconds * 1000);
    p.on("close", () => {
      const b = Buffer.concat(chunks), x = new Float32Array(b.length >> 1);
      for (let i = 0; i < x.length; i++) x[i] = b.readInt16LE(i * 2) / 32768;
      if (keep) { const h = Buffer.alloc(44); h.write("RIFF", 0); h.writeUInt32LE(36 + b.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16);
        h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(44100, 24); h.writeUInt32LE(88200, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
        h.write("data", 36); h.writeUInt32LE(b.length, 40); fs.writeFileSync(keep, Buffer.concat([h, b])); }
      done(x);
    });
  });
}
// loudness every 20 ms
const env = (x, sr = 44100) => { const w = Math.round(sr * 0.02), e = []; for (let i = 0; i + w <= x.length; i += w) { let s = 0; for (let j = i; j < i + w; j++) s += x[j] * x[j]; e.push(Math.sqrt(s / w)); } return e; };
const rms = x => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / Math.max(1, x.length));
const dB = v => 20 * Math.log10(Math.max(v, 1e-6));
// the voice's own loudness every 20 ms, from the loop file
const voiceEnv = file => { const raw = execFileSync("sox", [file, "-t", "raw", "-e", "signed", "-b", "16", "-r", "44100", "-c", "1", "-"]);
  const x = new Float32Array(raw.length >> 1); for (let i = 0; i < x.length; i++) x[i] = raw.readInt16LE(i * 2) / 32768; return env(x); };
// how closely the minichord's loudness (in dB) follows the voice's, at the best lag round the loop
function follow(rec, voice) {
  const a = rec.map(v => dB(v)), b = voice.map(v => dB(v)), n = b.length;
  let best = { r: -1, lag: 0 };
  for (let lag = 0; lag < n; lag++) {
    let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0, m = 0;
    for (let i = 0; i < a.length; i++) { const x = a[i], y = b[(i + lag) % n]; sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y; m++; }
    const r = (sab - sa * sb / m) / Math.sqrt((saa - sa * sa / m) * (sbb - sb * sb / m));
    if (r > best.r) best = { r, lag };
  }
  return best;
}

(async () => {
  if (!DEV) { console.log("No minichord found: plug it in (or set MINICHORD_MIDI)."); process.exit(2); }
  let fd;
  try { fd = fs.openSync(DEV, fs.constants.O_RDWR | fs.constants.O_NONBLOCK); }
  catch (e) { if (e.code !== "EBUSY") throw e; console.log(`${DEV} is busy: something else (a browser tab with MIDI open?) holds the minichord.`); process.exit(2); }
  const d = dump(fd);
  if (!d) { console.log("The minichord didn't answer for its settings."); process.exit(2); }
  const was8 = param(d, 8), fw = param(d, 7), usb = param(d, 244);
  console.log(`minichord firmware ${fw}, usb audio ${usb}, MIDI in plays ${was8}`);
  if (fw < 34 || usb === 2) { console.log("This minichord can't vocode: it needs firmware 34 or later and USB audio 0 or 1."); process.exit(2); }
  const keep = process.env.TAKES; if (keep) fs.mkdirSync(keep, { recursive: true });
  const take = name => keep && path.join(keep, name);
  const CHORD = [48, 52, 55, 60];   // C major, held
  const hold = on => { for (const n of CHORD) fs.writeSync(fd, Buffer.from(on ? [0x90, n, 100] : [0x80, n, 0])); };

  const server = await serve(), port = server.address().port;
  const browser = await chromium.launch({ channel: "chrome", headless: true, ignoreDefaultArgs: ["--mute-audio"],   // Playwright mutes Chrome otherwise
    args: ["--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
  try {
    const page = await browser.newPage();
    page.on("pageerror", e => { fails++; console.log("  ✗ page error: " + e.message); });
    await page.exposeFunction("__hw", data => { try { fs.writeSync(fd, Buffer.from(data)); } catch (e) {} });
    await page.addInitScript(`window.__dump=${JSON.stringify(d)};` + MOCK);
    await page.goto(`http://127.0.0.1:${port}/vocoder/`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.click("#connect");
    await sleep(500);
    write(fd, 8, 1);   // after the page's push, so its pop puts it back too

    if (await page.isVisible("#find")) await page.click("#find");   // hidden when the browser already names its speakers
    await sleep(800);
    const out = await page.evaluate(() => { const s = document.getElementById("out"); return s.options[s.selectedIndex].text; });
    check("the page finds the minichord's speaker", /found by itself/.test(out), out);

    // the dry chord, before the voice: nothing (the vocoder at 100 lets none of it through)
    hold(true); await sleep(400);
    const quiet = rms(await record(1.5, take("chord-no-voice.wav")));
    hold(false);

    // the voice, two lines a pass, played twice through while the chord is held: the woman, then the man
    let sentence = -99;
    for (const who of ["woman", "man"]) {
      await page.click(`#voices button[data-v='${who}']`);
      await page.click("#loops button:nth-child(2)");
      hold(true); await sleep(300);
      await page.click("#play");
      await sleep(300);
      const talk = await record(12.5, take(`chord-with-${who}.wav`));
      await page.click("#play");
      await sleep(300);
      hold(false);
      const e = env(talk), v = voiceEnv(path.join(ROOT, `samples/speech/${who}-two-lines.flac`));
      const f = follow(e, v);
      check(`the held chord follows the ${who}'s loudness`, f.r > 0.6, `r ${f.r.toFixed(2)}`);
      // sentence against gap, by where the voice is loud and quiet at that lag
      const loud = [], gap = []; const vmax = Math.max(...v);
      e.forEach((x, i) => { const y = v[(i + f.lag) % v.length]; if (y > vmax * 0.2) loud.push(x); else if (y < vmax * 0.002) gap.push(x); });
      const said = dB(rms(loud)), between = dB(rms(gap));
      check("it talks: loud in the sentences, near silent between them", said - between > 15, `${said.toFixed(1)} dB against ${between.toFixed(1)} dB`);
      sentence = Math.max(sentence, said);
    }
    check("and silent with no voice coming in", dB(quiet) < sentence - 20, `${dB(quiet).toFixed(1)} dB`);

    // given back: the chord sounds dry again
    await page.click("#giveback");
    await sleep(400);
    write(fd, 8, 1);
    hold(true); await sleep(500);
    const dry = rms(await record(1.2, take("chord-given-back.wav")));
    hold(false);
    check("given back, the chord sounds as it did", dB(dry) > dB(quiet) + 15, `${dB(dry).toFixed(1)} dB`);
    const after = dump(fd);
    check("and its settings are as they were", after && [122, 140, 143, 119, 197].every(a => param(after, a) === param(d, a)) && param(after, 244) === usb,
      after ? [122, 140, 143, 119, 244].map(a => `${a}:${param(after, a)}`).join(" ") : "no dump");
    await page.close();
  } finally {
    await browser.close();
    server.close();
    for (const n of CHORD) try { fs.writeSync(fd, Buffer.from([0x80, n, 0])); } catch (e) {}
    // the page's settings popped, in case it never got to (a pop with nothing pushed does nothing)
    fs.writeSync(fd, Buffer.from([0xF0, 0, 0, 6, 0, 0xF7]));
    await sleep(200);
    write(fd, 8, was8);
    write(fd, 244, usb);
    await sleep(300);
    fs.closeSync(fd);
  }
  console.log(fails ? `FAILED ${fails}` : "ok");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
