// The locks against a real minichord (the fork's firmware 76 on): a game borrows the locked key
// signature, the lock takes the game's value while it's borrowed, giving it back puts the lock's
// value back at once; a page killed mid-game leaves the game's value locked in, and the next visit
// to the room puts it back. Web MIDI is stood in for, as in looper/live.test.js, but through the
// ALSA sequencer (practice/midi-bridge.py, python-rtmidi) rather than the raw MIDI device, which
// can't be opened while a browser holds the minichord's ports: the page's MIDI goes to the real
// minichord and its answers come back to the page.
//
//   node practice/locks-live.test.js      (the minichord plugged in; MINICHORD_PYTHON picks the python with rtmidi)
const fs = require("fs"), path = require("path"), http = require("http"), { spawn } = require("child_process");
const { chromium } = require("playwright-core");
const ROOT = path.resolve(__dirname, "../..");
const PYTHON = process.env.MINICHORD_PYTHON || [path.join(process.env.HOME || "", "minichord-bench/.venv/bin/python3"), "python3"].find(p => fs.existsSync(p)) || "python3";
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, n = 0;
const check = (name, ok, detail = "") => { n++; if (!ok) fails++; console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? `  (${detail})` : ""}`); };

function serve() {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2" };
  return new Promise(done => {
    const s = http.createServer((q, r) => {
      const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
    }).listen(0, "127.0.0.1", () => done(s));
  });
}

// ---- the minichord over the sequencer bridge: frames in, settings and the lock report ----
let bridge, frames = [], forward = null, ready = false;
function pump() {}   // frames arrive on their own, from the bridge's stdout
function openBridge() {
  return new Promise((done, fail) => {
    bridge = spawn(PYTHON, [path.join(__dirname, "midi-bridge.py")], { stdio: ["pipe", "pipe", "inherit"] });
    let buf = "";
    bridge.stdout.on("data", d => { buf += d; const lines = buf.split("\n"); buf = lines.pop();
      for (const l of lines) { if (l === "ready") { ready = true; done(); continue; }
        const frame = l.trim().split(" ").map(h => parseInt(h, 16)); if (process.env.DEBUG) console.log(`${stamp()} < ${frame.length} bytes ${frame.slice(0, 4).join(" ")}${frame.length === 514 ? " key " + (frame[71] + 128 * frame[72]) : ""}${forward ? " -> page" : ""}`); frames.push(frame); if (forward) forward(frame); } });
    bridge.on("exit", code => { if (!ready) fail(new Error("the bridge didn't start: " + code)); });
  });
}
const T0 = Date.now(), stamp = () => String(Date.now() - T0).padStart(6);
const send = bytes => { if (process.env.DEBUG) console.log(`${stamp()} > ${bytes.slice(0, 6).join(" ")}`); bridge.stdin.write(bytes.map(b => b.toString(16).padStart(2, "0")).join(" ") + "\n"); };
const write = (a, v) => send([0xF0, a & 127, a >> 7, v & 127, (v >> 7) & 127, 0xF7]);
async function wait(want, ms = 2000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { pump(); const k = frames.findIndex(want); if (k >= 0) return frames.splice(k, 1)[0]; await sleep(10); }
  return null;
}
async function dump() { frames = []; send([0xF0, 0, 0, 0, 0, 0xF7]); const f = await wait(f => f.length === 514); return f && [...Array(256).keys()].map(a => f[1 + 2 * a] + 128 * f[2 + 2 * a]); }
async function locks() { frames = []; send([0xF0, 0, 0, 9, 0, 0xF7]); const f = await wait(f => f[1] === 0x7D && f[2] === 0x6C); return f && new Set([...Array(f[3]).keys()].map(i => f[4 + 2 * i] + 128 * f[5 + 2 * i])); }

// Web MIDI, stood in for: the page's two minichord ports; everything the page sends goes to the real
// one, and every SysEx frame the real one sends comes back on the chord port
const MOCK = `(() => {
  class Port extends EventTarget {
    constructor(id, name, type){ super(); this.id=id; this.name=name; this.type=type; this.state="connected"; this.connection="open"; this.manufacturer="minichord"; this._on=null; }
    set onmidimessage(f){ this._on=f; } get onmidimessage(){ return this._on; }
    fire(data){ const e=new Event("midimessage"); Object.defineProperty(e,"data",{value:new Uint8Array(data)}); if(this._on) this._on(e); this.dispatchEvent(e); }
    send(data){ window.__hw([...data]); }
    open(){ return Promise.resolve(this); } close(){ return Promise.resolve(this); }
  }
  const i1=new Port("i1","minichord MIDI 1","input"), i2=new Port("i2","minichord MIDI 2","input");
  const o1=new Port("o1","minichord MIDI 1","output"), o2=new Port("o2","minichord MIDI 2","output");
  window.__mini={i1,i2,o1,o2};
  const access={inputs:new Map([["i1",i1],["i2",i2]]), outputs:new Map([["o1",o1],["o2",o2]]), sysexEnabled:true, onstatechange:null, addEventListener(){}};
  navigator.requestMIDIAccess=()=>Promise.resolve(access);
})();`;

async function openRoom(browser, port, note) {
  const page = await browser.newPage();
  page.on("pageerror", e => { fails++; console.log("  ✗ page error: " + e.message); });
  await page.exposeFunction("__hw", data => { try { send(data); } catch (e) {} });
  // a fresh headless profile each launch: what the page before wrote down is carried over by hand
  await page.addInitScript(`localStorage.removeItem("lab-locked-borrows"); ${note ? `localStorage.setItem("lab-locked-borrows", ${JSON.stringify(note)});` : ""}` + MOCK);
  forward = frame => page.evaluate(d => window.__mini.i1.fire(d), frame).catch(() => {});
  await page.goto(`http://127.0.0.1:${port}/practice/`);   // Spell it: a game that leaves the key as the player set it
  await page.click("#connect").catch(() => {});
  const t0 = Date.now();
  // connected, its locks read, and the push-and-pop probe over (a borrow made during it is in the push it leaves)
  while (Date.now() - t0 < 6000) { pump(); if (await page.evaluate(() => !!mc.locks && mc.params[35] !== undefined && mc.pushPop !== undefined && pushHeld)) break; await sleep(50); }
  return page;
}

(async () => {
  try { await openBridge(); } catch (e) { console.log("No minichord found: plug it in. " + e.message); process.exit(2); }
  const d0 = await dump();
  if (!d0) { console.log("The minichord didn't answer for its settings."); process.exit(2); }
  if (d0[7] < 76) { console.log(`firmware ${d0[7]} has no locks: nothing to test`); process.exit(2); }
  const bank = d0[1], key0 = d0[35];
  const l0 = await locks();
  const keyWasLocked = l0.has(35);
  console.log(`minichord firmware ${d0[7]}, bank ${bank + 1}, key signature ${key0}, locks ${[...l0].join(" ")}`);
  if (!keyWasLocked) { write(385, 35); await sleep(200); }
  const X = (key0 + 3) % 21;
  const server = await serve(), port = server.address().port;
  let browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    let page = await openRoom(browser, port);
    const seen = await page.evaluate(() => [...(mc.locks || [])]);
    check("the room reads the minichord's locks, the key signature among them", seen.includes(35) && seen.includes(109), seen.join(" "));
    await page.evaluate(() => localStorage.removeItem("lab-locked-borrows"));
    // a game borrows the locked key
    await page.evaluate(x => borrow(35, x), X);
    await sleep(2600);                                       // the lock takes a live change for its own after 2 s
    forward = null; let d = await dump();
    const state = await page.evaluate(() => JSON.stringify({key: mc.params[35], borrowed, wanted, out: mc.out && mc.out.id, canWrite: canWrite()}));
    check("the borrowed key is on the minichord", d[35] === X, `${d[35]} wanted ${X}; page ${state}`);
    const note = await page.evaluate(() => localStorage.getItem("lab-locked-borrows"));
    check("and written down with the value it had", note && JSON.parse(note)["35"] === key0, note);
    forward = f => page.evaluate(d => window.__mini.i1.fire(d), f).catch(() => {});
    await page.evaluate(() => restoreAll());
    await sleep(600);
    forward = null; d = await dump();
    check("given back: the key is the player's again", d[35] === key0, `${d[35]} wanted ${key0}`);
    // a bank load is what a lock survives: the handed-back value must be the lock's, not just live
    send([0xF0, 0, 0, 4, bank, 0xF7]); await sleep(400); d = await dump();
    check("and it's the lock's value, not only the live one (a bank load keeps it)", d && d[35] === key0, d && `${d[35]} wanted ${key0}`);
    check("the note is cleared", !(await page.evaluate(() => localStorage.getItem("lab-locked-borrows"))));

    // a page killed mid-game: the game's value stays locked in
    forward = f => page.evaluate(d => window.__mini.i1.fire(d), f).catch(() => {});
    await page.evaluate(x => borrow(35, x), X);
    await sleep(2600);
    forward = null;
    const left = await page.evaluate(() => localStorage.getItem("lab-locked-borrows"));
    await page.evaluate(() => removeEventListener("pagehide", restoreAll));   // a page that dies hands nothing back
    await page.close(); await sleep(500);
    send([0xF0, 0, 0, 4, bank, 0xF7]); await sleep(400);      // a bank change drops what was pushed; the lock holds the game's key
    d = await dump();
    check("after a page dies the game's key is locked in, and a bank load keeps it", d && d[35] === X, d && `${d[35]} wanted ${X}`);
    browser = await chromium.launch({ channel: "chrome", headless: true });
    page = await openRoom(browser, port, left);
    await sleep(800);
    const said = await page.evaluate(() => document.getElementById("status").textContent + " | " + document.getElementById("feedback").textContent);
    forward = null; d = await dump();
    check("the next visit puts the player's key back", d && d[35] === key0, d && `${d[35]} wanted ${key0}`);
    check("and says so", /earlier game/.test(said), said);
    send([0xF0, 0, 0, 4, bank, 0xF7]); await sleep(400); d = await dump();
    check("as the lock's value: a bank load keeps it", d && d[35] === key0, d && `${d[35]} wanted ${key0}`);
    forward = f => page.evaluate(d => window.__mini.i1.fire(d), f).catch(() => {});
    await page.evaluate(() => restoreAll()); await sleep(300);
  } finally {
    forward = null;
    try { await browser.close(); } catch (e) {}
    server.close();
    if (!keyWasLocked) { write(385, 1024 + 35); await sleep(200); }
    write(35, key0); await sleep(100);
    send([0xF0, 0, 0, 4, bank, 0xF7]); await sleep(400);
    const d = await dump(), l = await locks();
    check("left as found: the key, and whether it was locked", d && d[35] === key0 && l && l.has(35) === keyWasLocked, d && `key ${d[35]}, locks ${[...(l || [])].join(" ")}`);
    bridge.stdin.end();
  }
  console.log(fails ? `FAILED ${fails} of ${n}` : `ok ${n}`);
  process.exit(fails ? 1 : 0);
})();
