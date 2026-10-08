// The Vocoder page with no minichord needed: a stand-in Web MIDI answers for its settings, and what
// the page sends it is checked. The settings borrowed (pushed first) and given back (popped), the
// page's chord sound taken away again, USB audio's own handling (not in a push), firmware without a
// vocoder left alone, and the loops played in time.
//   node vocoder/ui.test.js
const fs = require("fs"), path = require("path"), http = require("http");
const { chromium } = require("playwright-core");
const ROOT = path.resolve(__dirname, "../..");
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
const dumpOf = vals => { const d = [0xF0]; for (let a = 0; a < 256; a++) { const v = { 35: 0, ...vals }[a] || 0; d.push(v & 127, v >> 7); } d.push(0xF7); return d; };
const MOCK = fs.readFileSync(path.join(__dirname, "../looper/live.test.js"), "utf8").match(/const MOCK = `([\s\S]*?)`;/)[1];
// what the page sent: control commands by number, and settings as address -> the last value
const sent = page => page.evaluate(() => window.__sent.map(s => s.data).filter(d => d[0] === 0xF0 && d.length === 6));
const controls = msgs => msgs.filter(d => !d[1] && !d[2]).map(d => d[3]);
const writes = msgs => { const w = {}; for (const d of msgs) if (d[1] || d[2]) w[d[1] + 128 * d[2]] = d[3] + 128 * d[4]; return w; };

(async () => {
  const server = await serve(), port = server.address().port;
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
  const open = async vals => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    page.on("pageerror", e => { fails++; console.log("  ✗ page error: " + e.message); });
    await page.addInitScript(`window.__dump=${JSON.stringify(dumpOf(vals))};` + MOCK);
    await page.goto(`http://127.0.0.1:${port}/vocoder/`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.click("#connect");
    await sleep(400);
    return page;
  };
  try {
    // firmware 37, USB audio 0: the vocoder and its chord sound, borrowed
    let page = await open({ 7: 37, 244: 0, 122: 8, 143: 600 });
    let m = await sent(page), w = writes(m);
    check("pushed before anything changes", controls(m)[1] === 5 && m.findIndex(d => d[3] === 5 && !d[1] && !d[2]) < m.findIndex(d => d[1] || d[2]), JSON.stringify(controls(m)));
    check("the vocoder on, on the chords, consonants at 30", w[260] === 100 && w[261] === 0 && w[262] === 30, JSON.stringify([w[260], w[261], w[262]]));
    check("a chord sound for it: sawtooths, held, the filter open", w[122] === 9 && w[140] === 100 && w[143] === 5000 && w[119] === 0 && w[265] === 0);
    check("USB audio left as it is", !(244 in w));
    check("Give everything back offered", await page.isVisible("#giveback"));

    await page.evaluate(() => { window.__sent.length = 0; });
    await page.fill("#amount", "60"); await page.dispatchEvent("#amount", "input");
    await page.click("#carrier button[data-v='2']");
    await page.fill("#consonants", "0"); await page.dispatchEvent("#consonants", "input");
    await page.check("#hear");
    w = writes(await sent(page));
    check("the controls reach the minichord", w[260] === 60 && w[261] === 2 && w[262] === 0 && w[244] === 1, JSON.stringify(w));

    // the page's chord sound unticked: everything back, pushed again, and only the vocoder set
    await page.evaluate(() => { window.__sent.length = 0; });
    await page.uncheck("#voice");
    m = await sent(page); w = writes(m);
    check("unticking the chord sound pops, pushes again, sets only the vocoder", controls(m).join() === "6,5" && w[260] === 60 && !(122 in w), JSON.stringify({ c: controls(m), w }));

    // given back: popped, and USB audio (which a pop leaves) written back by hand
    await page.evaluate(() => { window.__sent.length = 0; });
    await page.click("#giveback");
    m = await sent(page); w = writes(m);
    check("given back: popped, USB audio back to 0", controls(m).includes(6) && w[244] === 0, JSON.stringify({ c: controls(m), w }));
    check("and nothing taken again till something changes", !(await page.isVisible("#giveback")));

    // the loops: played, a bar at a time, and a loop chosen while one plays waits for the bar
    await page.click("#loops button:nth-child(3)");
    await page.click("#play");
    await sleep(3400);
    const where = await page.textContent("#where");
    check("a loop plays, its bar and beat shown", /Four lines: bar 2 of 4/.test(where), where);
    const words = await page.textContent("#words");
    check("the sentence being spoken written under the bars", words === "Glue the sheet to the dark blue background.", words);
    const lit = await page.evaluate(() => [...document.querySelectorAll("#bars div")].findIndex(d => d.classList.contains("now")));
    check("the bar playing lit", lit === 1, String(lit));
    await page.click("#loops button:nth-child(1)");
    await sleep(300);
    const still = await page.textContent("#where");
    check("a loop chosen mid-bar waits for the bar", /Four lines/.test(still), still);
    await sleep(3000);
    const now = await page.textContent("#where");
    check("and then comes in", /One line: bar 1 of 1/.test(now), now);
    const level = await page.evaluate(() => { const c = document.getElementById("bands"), g = c.getContext("2d"), d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 0xD4 && d[i + 1] === 0xA0) n++; return n; });
    check("the bands meter moves with the voice", level > 200, `${level} px`);
    // the other voice, chosen mid-loop: it too waits for the bar, and it's the man's file that's fetched
    const fetched = [];
    page.on("request", q => { if (/speech\//.test(q.url())) fetched.push(q.url().split("/").pop()); });
    await page.click("#voices button[data-v='man']");
    await sleep(3200);
    check("a man's voice, fetched and playing", fetched.includes("man-one-line.flac") && /One line: bar 1 of 1/.test(await page.textContent("#where")), fetched.join(" "));
    await page.click("#play");
    check("stopped, the words go back to waiting", /a sentence a bar/.test(await page.textContent("#words")));
    await page.close();

    // USB audio 2: no speaker offered, so nothing borrowed until it's offered
    page = await open({ 7: 37, 244: 2 });
    m = await sent(page);
    check("USB audio 2: nothing borrowed", !controls(m).includes(5) && !Object.keys(writes(m)).length);
    check("and the page says why, with a way out", await page.isVisible("#speaker"));
    await page.evaluate(() => { window.__sent.length = 0; });
    await page.click("#speaker");
    await sleep(200);
    m = await sent(page); w = writes(m);
    check("offered as a speaker: 244 to 0, nothing else while it restarts", w[244] === 0 && Object.keys(w).length === 1 && !controls(m).length, JSON.stringify({ c: controls(m), w }));
    await page.close();

    // firmware before the vocoder: left alone
    page = await open({ 7: 33, 244: 0 });
    m = await sent(page);
    check("firmware 33: nothing borrowed", !controls(m).includes(5) && !Object.keys(writes(m)).length);
    check("and the page says what it needs", /version 34 or later/.test(await page.textContent("#needs")));
    await page.close();

    // the page's look, both themes, for the card and the record
    if (process.env.SHOTS) {
      page = await open({ 7: 37, 244: 0 });
      await page.click("#loops button:nth-child(2)"); await page.click("#play"); await sleep(1800);
      await page.screenshot({ path: path.join(process.env.SHOTS, "vocoder-light.png"), fullPage: true });
      await page.emulateMedia({ colorScheme: "dark" }); await sleep(600);
      await page.screenshot({ path: path.join(process.env.SHOTS, "vocoder-dark.png"), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 }); await sleep(600);
      await page.screenshot({ path: path.join(process.env.SHOTS, "vocoder-phone.png"), fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(fails ? `FAILED ${fails}` : "ok");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
