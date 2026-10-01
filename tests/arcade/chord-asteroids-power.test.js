// Chord Asteroids' power-ups: a power-up rock is cracked by its chord and bursts into its power, not its
// notes; PEDAL POINT holds the last string plucked and shoots every rock of that note, a string with no
// rock moving the pedal instead of jamming; FERMATA holds every rock still and sends none; RESOLUTION
// waits for the key's home chord and blows up the screen; one that reaches the ship costs nothing;
// the bonus round's pause moves a power's end on; the title screen's pages.
const t=require("./harness").load("chord-asteroids");
(async()=>{
  const {w, d, sleep, chord, note, check}=t;
  await sleep(150); t.connect({key:1}); await sleep(100);                 // the minichord in G
  const a=await t.start(1, {speed:0});
  const reset=()=>{ a.rocks.forEach(r=>{ if(!r.dead) w.eval(`asKill(blast.rocks.find(x=>x.id===${r.id}))`); }); a.rocks=[]; a.next=w.performance.now()+1e9; a.asPower=null; a.jamUntil=0; };
  const rock=(root, q, tones, extra="")=>w.eval(`(()=>{ const r=asRock("chord", 200, 120, "${root}${q}", {root:"${root}", q:"${q}", tones:${JSON.stringify(tones)}, rootPc:pcOfName("${root}")${extra}}); r.vx=0; r.vy=0; return r.id; })()`);
  const noteRock=(name, x=600, y=100)=>w.eval(`(()=>{ const r=asRock("note", ${x}, ${y}, "${name}", {name:"${name}", pc:pcOfName("${name}"), group:{left:1, label:"${name}"}}); r.vx=0; r.vy=0; r.born=performance.now()-5000; return r.id; })()`);
  const R=id=>a.rocks.find(r=>r.id===id);
  reset(); await sleep(50);
  // a power-up rock: cracked by its chord, it bursts into its power
  const cap=rock("D","",["D","F♯","A"],", power:'pedal'"); await sleep(30);
  check("a power-up rock is drawn as a capsule", R(cap).el.classList.contains("power") && !!R(cap).el.querySelector(".puicon"));
  chord("D"); await sleep(80);
  check("cracked by its chord, it gives its power and no notes", w.eval("asPowerOn('pedal')") && !a.rocks.some(r=>!r.dead && r.kind==="note"));
  // PEDAL POINT
  const e1=noteRock("E"), e2=noteRock("E", 300, 300), b1=noteRock("B", 700, 300);
  note(4); await sleep(1200);
  check("PEDAL POINT: the plucked note is held, and every rock of it is shot down", R(e1)?.dead!==false && R(e2)?.dead!==false && a.asPower.pc===4 && !R(b1).dead);
  check("its name, time and held note in the HUD", /PEDAL POINT \d.*E HELD/.test(a.hud.textContent), a.hud.textContent);
  note(9); await sleep(60);
  check("a string with no rock moves the pedal there, and doesn't jam the gun", a.asPower.pc===9 && w.performance.now()>=a.jamUntil, t.heard());
  const late=noteRock("A", 500, 340); await sleep(700);
  check("a rock of the held note that comes later is shot too", !R(late) || R(late).dead);
  a.asPower.powerUntil=w.performance.now()-1; await sleep(60);
  note(2); await sleep(60);
  check("when it's over, a string with no rock jams the gun again", !w.eval("asPowerOn('pedal')") && w.performance.now()<a.jamUntil);
  // FERMATA
  reset(); const fz=rock("C","",["C","E","G"],", power:'fermata'"); chord("C"); await sleep(60);
  const mover=rock("A","m",["A","C","E"]); R(mover).vx=80; const x0=R(mover).x, next0=a.next=w.performance.now()+300; await sleep(600);
  check("FERMATA: the rocks hold still, and none come", w.eval("asPowerOn('fermata')") && R(mover).x===x0 && a.next>next0+400);
  a.asPower.powerUntil=w.performance.now()-1; await sleep(300);
  check("when it's over they move again", R(mover).x>x0);
  // RESOLUTION
  reset(); rock("F","",["F","A","C"],", power:'resolve'"); chord("F"); await sleep(60);
  check("RESOLUTION is held until used, the HUD naming the home chord", w.eval("asPowerOn('resolve')") && /RESOLUTION: PLAY G/.test(a.hud.textContent), a.hud.textContent);
  const r1=rock("E","m",["E","G","B"]), r2=rock("D","",["D","F♯","A"]), n1=noteRock("C"); await sleep(30);
  chord("C"); await sleep(60);
  check("a chord that isn't home leaves it held", w.eval("asPowerOn('resolve')") && !R(r1).dead);
  const s0=a.score; chord("G"); await sleep(80);
  check("the home chord blows up every rock on the screen, and scores", [r1,r2,n1].every(id=>!R(id) || R(id).dead) && a.score>s0 && !a.asPower, `+${a.score-s0}`);
  // one that reaches the ship costs nothing
  reset(); const lives=a.lives; w.eval(`asHitShip(blast.rocks.find(r=>r.id===${rock("A","",["A","C♯","E"],", power:'fermata'")}))`);
  check("a power-up rock that reaches the ship costs nothing", a.lives===lives);
  // the bonus round's pause; one at a time
  reset(); a.asPower={k:"fermata", powerUntil:w.performance.now()+5000}; const end=a.asPower.powerUntil;
  w.eval("bonusShift(blast, 3000)");
  check("a bonus round's pause moves a power's end on", Math.round(a.asPower.powerUntil-end)===3000);
  check("none comes while one runs", w.eval("asPowerChance()")===null);
  reset(); w.eval("Math._r=Math.random; Math.random=()=>0.01; asSpawn(); Math.random=Math._r");
  const spawned=a.rocks.find(r=>!r.dead && r.kind==="chord");
  check("now and then a spawned rock carries a power", spawned && spawned.power && !spawned.star);
  // the title screen
  w.eval("blast.phase='menu'; blast.rocks.forEach(r=>r.el.remove()); blast.rocks=[]; asMenu(); cabStage(blast.overlay,'powers')"); await sleep(50);
  check("the title screen's POWER-UPS page lists all three, as they look", d.querySelectorAll(".cab-powers .pwtable li").length===3 && /PEDAL POINT/.test(d.querySelector(".cab-powers").textContent) && !!d.querySelector(".cab-powers .fchord.pu-resolve") && /CRACK/.test(d.querySelector(".cab-powers").textContent));
  check("and the POINTS page names them", w.eval("pointsFor('asteroids').some(r=>/FERMATA/.test(r[1]))"));
  t.done();
})();
