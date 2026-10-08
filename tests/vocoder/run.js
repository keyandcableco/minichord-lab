// The Vocoder page's tests: the page by hand (no minichord needed), and, with a minichord plugged in,
// against the real one (skipped, not failed, when it can't be reached). npm run vocoder
const { spawnSync } = require("child_process"), fs = require("fs"), path = require("path");
const live = fs.existsSync("/proc/asound") && fs.readdirSync("/proc/asound").some(c => { try { return /minichord/i.test(fs.readFileSync(`/proc/asound/${c}/id`, "utf8")); } catch (e) { return false; } });
let bad = 0;
for (const [name, file] of [["page", "ui.test.js"], ...(live || process.env.MINICHORD_MIDI ? [["minichord", "live.test.js"]] : [])]) {
  console.log(`vocoder ${name}:`);
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: "inherit", timeout: 240000 });
  if (r.status === 2) console.log("(skipped)");
  else if (r.status !== 0) bad++;
}
if (!live && !process.env.MINICHORD_MIDI) console.log("(no minichord plugged in: its own test skipped)");
console.log(bad ? `FAILED ${bad}` : "ok"); process.exit(bad ? 1 : 0);
