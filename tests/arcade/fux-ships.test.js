// Fux, Two Ships: the harp tuned to the cantus's window (the custom scale on its lowest note, the harp
// mode written last); a correct line written string by string docks, and Aloysius approves; a crash
// costs a life and the note is written again; LOCK-ON warns of one with help on, and not with it off;
// the cadence raises the leading tone on the strings; and the virtual minichord's harp plays as tuned.
const t=require("./harness").load("fux");
(async()=>{
  const {w, sleep, check, writes}=t;
  await sleep(200); t.connect({firmware:17}); await sleep(100);
  const SHIPS=w.eval("FU_LEVELS.findIndex(L=>L.ships)");
  // Dorian, above: the cantus Fux starts with
  const begin=async ci=>{ w.eval(`blast.fuBags={ships:{left:[${ci}]}}`); w.eval("shClear(); blast.lineNo=0; shStart()");
    for(let i=0;i<120 && !w.eval("blast.ship && blast.ship.ready");i++) await sleep(100); };
  const a=await t.start(SHIPS);
  for(let i=0;i<60 && !w.eval("!!blast.ship");i++) await sleep(100);    // the level's own first cantus, then Fux's Dorian in its place
  await begin(0);
  const s=()=>w.eval("blast.ship");
  check("a Two Ships level begins with a cantus to write against", s() && s().ready && s().modeName==="dorian");
  // the harp: chromatic off, the key the lowest string's note, the mode's notes as the custom scale, mode 10 last
  const last=writes.slice(-8), at=k=>last.map(x=>x[0]).lastIndexOf(k);
  const win=s().window, r=((win[0]%12)+12)%12;
  const mask=win.reduce((m,p)=>m|(1<<(((p-r)%12)+12)%12),0);
  check("the harp tuned to the window: its notes as the custom scale, the harp mode written last",
    last.some(([k,v])=>k===236 && v===mask) && last.some(([k,v])=>k===98 && v===0) && at(36)>at(236) && at(36)>at(35) && w.eval("mc.params[36]")===10, JSON.stringify(last));
  // pluck by the note the string sends, then commit
  const pluck=p=>w.eval(`(()=>{ const s=blast.ship, i=shWindow(s, s.ficta).indexOf(${p}); mc.lastHarp={note:s.dev[i], ch:0}; fuxNote(i); return i; })()`);
  // a crash: a fourth over the cantus's first note
  const c0=s().cantus[0], fourth=s().window.find(p=>p-c0===5);
  const lives=a.lives;
  saved_help(0);
  pluck(fourth); await sleep(50);
  check("LOCK-ON warns of the crash before it's committed, with help on", !!t.d.querySelector(".fubar.now .futag") && /LOCK-ON/.test(t.heard()), t.heard());
  w.eval("shCommit()"); await sleep(100);
  check("committed anyway, it's a crash: a life gone, and the note to write again", a.lives===lives-1 && s().flat.length===0 && s().at===0, `${a.lives} lives, ${s().flat.length} written`);
  // help off: no warning
  saved_help(1);
  pluck(fourth); await sleep(50);
  check("with help off, no warning", !t.d.querySelector(".fubar.now .futag") && !/LOCK-ON/.test(t.heard()), t.heard());
  saved_help(0);
  // the solver's line, written string by string: through the cadence (its leading tone raised on the strings) to the dock
  const sol=w.eval(`CP.solve({cantus:blast.ship.cantus, mode:blast.ship.mode, species:1, above:true, pitches:blast.ship.window, seed:3})`);
  let fictaSeen=false;
  for(let k=0;k<sol.length;k++){
    if(k===sol.length-2){ const m=w.eval("mc.params[236]"); fictaSeen=w.eval("blast.ship.ficta") && !!(m&(1<<11)) && !(m&(1<<10)) && w.eval("shWindow(blast.ship,true)").includes(sol[k]); }
    pluck(sol[k]); await sleep(20); w.eval("shCommit()"); await sleep(40);
  }
  check("at the cadence the strings take the raised seventh (C♯ for C), no string moving", fictaSeen);
  await sleep(300);
  check("a correct line docks, and Aloysius approves", s().done && /BENE/.test(t.d.querySelector(".fureview")?.textContent||""), t.d.querySelector(".fureview")?.textContent);
  check("contrary motion built the combo, and the notes scored", s().contrary>0 && a.score>0);
  // the virtual minichord's harp, as the game tuned it
  w.eval("shClear(); fuClearBars()");
  w.eval("virtualMinichord('keys', true)"); await sleep(50);
  w.eval("blast.fuBags={ships:{left:[0]}}; blast.lineNo=0; shStart()"); await sleep(200);
  w.eval("window.__h=null; mc.addEventListener('harp', e=>window.__h=e.detail)");
  w.eval("vmPluck('t', 4)"); await sleep(30);
  check("the virtual harp plays the strings as the game tuned them", w.eval("window.__h && window.__h.note===blast.ship.dev[4] && window.__h.string===4"), JSON.stringify(w.eval("window.__h")));
  t.done();
  function saved_help(v){ w.eval(`blast.ivAt=${v}`); }                  // help is fixed for a game, as its multiplier is
})();
