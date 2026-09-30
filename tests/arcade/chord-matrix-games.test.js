// The chord matrix across the games: on the alternate matrix every game's level names say what its
// chords are ("Sus4 and sus2", not "Major and minor"), a level that only changes roots or keys keeps
// its name, the Barry Harris and slash levels step aside, and Asteroids, Snake and Breakout deal the
// alternate chords; Asteroids, played, sets the minichord up and drops them.
const t=require("./harness").load("chord-asteroids");
(async()=>{
  const {w, sleep, check, mc}=t;
  const slots={}; for(let i=0;i<7;i++) slots[202+i]=0;
  await sleep(150); t.connect({extra:{7:19, 39:0, 33:0, ...slots}}); await sleep(150);
  w.eval("saved.chordMatrix='alternate'");
  const names=f=>w.eval(`[0,1,2,3].map(${f}).join(" | ")`);
  check("Asteroids' levels are named for their chords", names("asLevelName")==="Sus4 and sus2 | Sharps and flats | 7sus4, maj9 and m9 | Add9 and 6/9", names("asLevelName"));
  check("so are Snake's", names("snLevelName")==="Sus4 and sus2 | Sharps and flats | 7sus4, maj9 and m9 | Add9 and 6/9");
  check("Breakout's", names("boLevelName")==="Sus4 and sus2 | 7sus4 | Sharps and flats | Maj9 and m9", names("boLevelName"));
  check("Chord Stack's, keeping what changes the key", names("stLevelName")==="Sus4 and sus2 in C | In G and F | 7sus4, maj9 and m9 | Add9", names("stLevelName"));
  check("and Chord Invaders'", w.eval("blastLevelName(0)")==="Sus4 and sus2" && w.eval("blastLevelName(2)")===w.eval("LEVEL_NAMES[2]"), w.eval("blastLevelName(0)"));
  check("the Barry Harris and slash levels step aside", !w.eval("asLevelOk(4)") && !w.eval("snLevelOk(4)") && !w.eval("boLevelOk(5)") && !w.eval("boLevelOk(6)") && !w.eval("levelOk(5)") && !w.eval("levelOk(7)"));
  w.eval("saved.chordMatrix='standard'");
  check("on the standard matrix everything is as it was", w.eval("asLevelName(0)")==="Major and minor" && w.eval("asLevelOk(4)"));
  // Asteroids, played on the alternate matrix
  w.eval("saved.chordMatrix='alternate'");
  const a=await t.start(0, {speed:4});
  check("Asteroids puts the minichord on its alternate layout", mc.params[39]===1);
  for(let i=0;i<60 && !a.rocks.some(r=>r.kind==="chord");i++) await sleep(100);
  const r=a.rocks.find(x=>x.kind==="chord");
  check("and drops the alternate chords", r && ["sus4","sus2"].includes(r.q), r && r.label);
  check("its HUD says so", /ALTERNATE/.test(a.hud.textContent));
  w.eval("saved.chordMatrix='standard'");
  t.done();
})();
