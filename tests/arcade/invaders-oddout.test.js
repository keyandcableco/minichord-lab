// Chord Invaders' own bonus round, played with the game itself: four chords fall into its field and
// hang there, three of them from one key; the ship is steered with the knob and the odd one shot the
// way the game is shot, a chord that
// belongs costs and stays up, and the round's chords leave the game clean afterwards.
const t=require("./harness").load("invaders",{storage:{saved:{bonus:true}}});
(async()=>{
  const {w, d, sleep, check, chord}=t;
  const slots={}; for(let i=0;i<7;i++) slots[202+i]=0;
  await sleep(150); t.connect({extra:{7:19, 238:1, 39:0, ...slots}}); await sleep(150);
  w.eval("saved.chordMatrix='alternate'");                // the player's own layout: the round must still be playable
  w.eval("saved.invAim=1");                               // manual aim: the ship must be steered under the chord
  const a=await t.start(0, {speed:1});
  w.eval(`arcadeBonus("oddout")`); await sleep(80);
  const b=w.eval("blast.bonus");
  for(let i=0;i<60 && !b.ready;i++) await sleep(100);                 // the warning and its count down
  await sleep(200);
  // the test's page lays nothing out, so give each chord the place its style asks for
  const W=900; Object.defineProperty(a.field,"clientWidth",{value:W, configurable:true});
  const layout=()=>b.mine.forEach(it=>{ if(it.__laid) return; it.__laid=true; const f=parseFloat(it.el.style.left)/100;
    Object.defineProperty(it.el,"offsetLeft",{get:()=>W*f, configurable:true});
    Object.defineProperty(it.el,"offsetWidth",{value:50, configurable:true}); });
  layout();
  // the frame loop rebuilds the missile array, so watch it rather than patching it
  w.eval("window.__shots=0; setInterval(()=>{ if(blast && blast.fx && blast.fx.missiles.length) window.__shots++; }, 10)");
  check("its chords fall into the game's own field", b.mine.length>=4 && b.mine.every(it=>a.items.includes(it)) && d.querySelectorAll(".fchord.bonuschord").length>=4, `${b.mine.length} chords`);
  check("the game is still the game: its clock stopped, its input live", a.phase==="bonus" && w.eval("bonusPlaying()")===true);
  // the knob steers the ship during the round, as it does in play
  t.knob(0,22); await sleep(400); const left=a.shipF;
  t.knob(127,22); await sleep(600);
  check("the knob steers the ship during the round", left<.25 && a.shipF>.75, `${left.toFixed(2)} → ${a.shipF.toFixed(2)}`);
  check("an alternate chord layout is put aside, so the round's chords can be played", t.mc.params[39]===0 && b.layoutWas===1, `layout ${t.mc.params[39]}, was ${b.layoutWas}`);
  // the ship steered under a chord, as a player does
  const under=async it=>{ a.shipWant=Math.max(.06, Math.min(.94, parseFloat(it.el.style.left)/100));
    for(let i=0;i<40 && Math.abs((a.shipF??.5)-a.shipWant)>.02; i++) await sleep(50); };
  // in manual aim, playing the right chord from the wrong place doesn't hit it
  const odd0=b.mine.find(it=>it.odd), far=b.mine.find(it=>Math.abs(parseFloat(it.el.style.left)-parseFloat(odd0.el.style.left))>30) || b.mine[0];
  await under(far); chord(odd0.rootPc, odd0.q); await sleep(300);
  check("away from it, the right chord doesn't reach it", !odd0.done && b.hits===0, t.heard());
  // a chord that belongs, shot from under it: it costs, and stays up to try again
  const keeper=b.mine.find(it=>!it.odd), s0=b.score, miss0=b.misses;
  await under(keeper); chord(keeper.rootPc, keeper.q); await sleep(300);
  check("shooting one that belongs costs, and it stays up", b.misses===miss0+1 && !keeper.done && keeper.el.isConnected, `${s0} → ${b.score}, ${b.misses} wrong`);
  // the odd one out, shot through the game's own firing
  const odd=b.mine.find(it=>it.odd), name=odd.sym;
  await under(odd); w.eval("window.__shots=0"); chord(odd.rootPc, odd.q); await sleep(400);
  check("shooting the odd one scores, and it goes", b.hits>=1 && b.score>0 && !odd.el.isConnected, `${name}: ${b.score} points`);
  check("and the ship actually fired: a shot crossed the field", w.eval("window.__shots")>0, `${w.eval("window.__shots")} shots`);
  // play it out, then check the field is left clean
  for(let k=0;k<4 && !b.over;k++){ layout(); const o=b.mine.find(x=>x.odd); if(!o){ await sleep(200); continue; } await under(o); chord(o.rootPc, o.q); await sleep(400); }
  if(!b.over) w.eval("blast.bonus.finish()");
  for(let i=0;i<40 && a.phase!=="play";i++) await sleep(100);
  check("the tally counts what was caught", /INTRUDERS CAUGHT/.test(b.tally.map(x=>x[0]).join()) && b.tally.some(x=>x[0]==="WRONG SHOTS"));
  check("the player's own chord layout comes back afterwards", t.mc.params[39]===1, `layout ${t.mc.params[39]}`);
  check("afterwards the game carries on, its field clean", a.phase==="play" && !d.querySelector(".fchord.bonuschord") && !a.items.some(i=>i.odd!==undefined && !i.done));
  t.done();
})();
