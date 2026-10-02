// Fux, Parallel Patrol: the harp set chromatic, so a string is a cannon; every level makes lines whose
// wrong bars are only of its kinds; a wrong bar shot from the cannon under it scores and is named, and
// keeps its shell; a good bar shot spends one; a wrong bar that scrolls off costs a life.
const t=require("./harness").load("fux");
(async()=>{
  const {w, sleep, check, note, writes}=t;
  await sleep(200); t.connect(); await sleep(100);
  check("the rules are loaded as CP, on Fux's page", typeof w.CP==="object" && typeof w.CP.check==="function");
  // every level's lines: something wrong in each, and nothing outside its rules
  const levels=w.eval(`FU_LEVELS.map((L,i)=>{ blast.fuBags=null; const ln=fuMakeLine(L); if(!ln) return {i, ok:false};
    const bad=ln.findings.filter(CP.forbidden); return {i, ok: bad.length>0 && bad.every(f=>L.rules.includes(f.rule)) && (!L.below || !ln.above) && ln.species===L.species, rules:[...new Set(bad.map(f=>f.rule))]}; })`);
  check("every level makes a line, wrong only in its own ways", levels.every(x=>x.ok), JSON.stringify(levels.filter(x=>!x.ok)));
  const a=await t.start(0);
  check("the harp chromatic, a cannon a string", writes.some(([k,v])=>k===98 && v===1));
  await sleep(2400);
  check("a line comes on, with wrong bars in it", a.line && a.bars.length>=10 && a.bars.some(b=>b.bad.length), a.bars && a.bars.filter(b=>b.bad.length).map(b=>b.i).join());
  // put a bar over a cannon, and pluck that cannon's string
  const over=(bar, k)=>w.eval(`(()=>{ const b=blast.bars[${bar}], L=blast.L; blast.scroll=L.W+L.barW*(b.i+.5)-blast.cannons[${k}].x; blast.bars.forEach(fuBarPlace); })()`);
  a.line.secs=1000;                                                    // hold the line still while it's aimed at
  const bad=a.bars.find(b=>b.bad.length), good=a.bars.find(b=>!b.bad.length && Math.abs(b.i-bad.i)>1);
  const s0=a.score, sh0=a.line.shells;
  over(good.i, 3); note(3); await sleep(400);
  check("a good bar shot spends a shell", good.wrong && a.line.shells===sh0-1 && /A GOOD BAR/.test(t.heard()), t.heard());
  over(bad.i, 5); note(5); await sleep(400);
  check("a wrong bar, shot from the string under it, is down and named", bad.shot && a.score>s0 && /HEARD/.test(t.heard()) && bad.el.querySelector(".futag"), t.heard());
  check("and its shell comes back", a.line.shells===sh0-1);
  // the rest of the faults found: the line hurries off, and the next one comes
  for(const b of a.bars.filter(b=>b.bad.length && !b.shot)){ over(b.i, 6); note(6); await sleep(400); }
  const was=a.lineNo; a.line.secs=1.2; await sleep(1200);
  check("every fault found, the rest of the line rushes off", a.line && a.line.rush, `${a.line && a.line.caught} of ${a.line && a.line.wrong}`);
  for(let k=0;k<60 && a.lineNo===was;k++) await sleep(100);
  check("and the next line comes on, without waiting out the scroll", a.lineNo===was+1, `line ${a.lineNo}`);
  check("and nothing of the old line is left at the edge", a.bars.every(b=>!b.el.isConnected || !b.el.hidden) && t.d.querySelectorAll(".fubar").length===a.bars.length);
  await sleep(1200);
  const lives=a.lives, left=a.bars.find(b=>b.bad.length && !b.shot);
  if(left){ w.eval(`blast.scroll=blast.L.W+blast.L.barW*(${left.i}+.5)-blast.L.m+blast.L.barW`); await sleep(200);
    check("a wrong bar that gets away costs a life, and says what it was", a.lives===lives-1 && /GOT PAST/.test(t.heard()), t.heard()); }
  // a bar past the cannons keeps going, and is gone once it's off the left
  a.line.secs=.2; await sleep(1500);
  const past=a.bars.filter(b=>b.gone);
  check("bars past the edge scroll off and go, not pile up there", past.length && past.every(b=>b.el.hidden || b.x<a.L.m), `${past.length} past, ${past.filter(b=>!b.el.hidden).length} still showing`);
  t.done();
})();
