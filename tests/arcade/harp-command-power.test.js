// Harp Command's power-ups: a capsule is taken by plucking its string; MULTISHOT shoots down every note
// in the sky, scoring them; SLOW TIME halves the fall; a SHIELD saves a life and is spent; a capsule
// that lands costs nothing; the bonus round's pause moves a power's end on; the title screen's pages.
const t=require("./harness").load("harp-command");
(async()=>{
  const {w, d, sleep, note, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(0, {speed:0});
  const reset=()=>{ a.items.forEach(i=>{ i.done=true; i.el.remove(); }); a.items=[]; a.next=w.performance.now()+1e9; a.hcPower=null; };
  // a note of our own over a string, the spawning held off
  const place=(string, extra={})=>{ const el=d.createElement("span"); el.className="fchord fnote"; el.textContent=w.eval(`SHARP_NAMES[${string}]`); a.field.appendChild(el);
    const it={el, string, pc:string, name:el.textContent, label:el.textContent, bonus:false, power:null, t0:w.performance.now(), y:60, ...extra}; a.items.push(it); return it; };
  reset(); await sleep(50);
  // MULTISHOT, taken by plucking the capsule's string
  const cap=place(3, {power:"multi"}); note(3); await sleep(60);
  check("a power-up is taken by plucking its string", cap.done && w.eval("hcPowerOn('multi')"));
  const score0=a.score, n1=place(0), n2=place(7), n3=place(11); await sleep(400);
  check("MULTISHOT: every note in the sky is shot down, and scores", n1.done && n2.done && n3.done && a.score>score0, `score ${score0} → ${a.score}`);
  check("its name and time in the HUD", /MULTISHOT \d/.test(a.hud.textContent), a.hud.textContent);
  const n4=place(5); await sleep(400);
  check("and every note that comes while it runs", n4.done);
  a.hcPower.powerUntil=w.performance.now()-1; await sleep(60);
  const n5=place(6); await sleep(400);
  check("when it's over, the cannons wait for their strings again", !w.eval("hcPowerOn('multi')") && !n5.done);
  // SLOW TIME
  reset(); place(2, {power:"slow"}); note(2); await sleep(60);
  const s1=place(9), t0=s1.t0; await sleep(500);
  check("SLOW TIME: what falls takes longer", w.eval("hcPowerOn('slow')") && s1.t0>t0+150, `${Math.round(s1.t0-t0)} ms later`);
  // SHIELD
  reset(); place(4, {power:"shield"}); note(4); await sleep(60);
  check("SHIELD is taken, and drawn over the cannons until spent", w.eval("hcPowerOn('shield')"));
  const lives=a.lives, landing=place(8); w.eval("hcMiss(blast.items[blast.items.length-1])");
  check("SHIELD: the next note that lands costs no life, and the shield is spent", a.lives===lives && !w.eval("hcPowerOn('shield')"));
  const l2=place(10); w.eval("hcMiss(blast.items[blast.items.length-1])");
  check("the one after costs as ever", a.lives===lives-1);
  const capLands=place(1, {power:"slow"}), l3=a.lives; w.eval("hcMiss(blast.items[blast.items.length-1])");
  check("a power-up that lands costs nothing", a.lives===l3 && !w.eval("blast.hcPower"));
  // the bonus round's pause moves a power's end on
  reset(); a.hcPower={k:"slow", powerUntil:w.performance.now()+5000}; const end=a.hcPower.powerUntil;
  w.eval("bonusShift(blast, 3000)");
  check("a bonus round's pause moves a power's end on", Math.round(a.hcPower.powerUntil-end)===3000);
  // spawned capsules turn up now and then, never two, never while one runs
  reset(); w.eval("Math._r=Math.random; Math.random=()=>0.01"); w.eval("hcSpawn(performance.now())"); w.eval("Math.random=Math._r");
  const spawned=a.items.find(i=>!i.done);
  check("a spawned capsule carries its power, drawn as a capsule", spawned && spawned.power && spawned.el.classList.contains("power") && !!spawned.el.querySelector(".puicon"));
  a.hcPower={k:"shield", powerUntil:0};
  check("none falls while one runs", w.eval("hcPowerChance()")===null);
  // the title screen
  w.eval("blast.phase='menu'; blast.items.forEach(i=>i.el.remove()); blast.items=[]; commandMenu(); cabStage(blast.overlay,'powers')"); await sleep(50);
  check("the title screen's POWER-UPS page lists all three, as they look", d.querySelectorAll(".cab-powers .pwtable li").length===3 && /MULTISHOT/.test(d.querySelector(".cab-powers").textContent) && !!d.querySelector(".cab-powers .fchord.pu-multi") && /PLUCK/.test(d.querySelector(".cab-powers").textContent));
  check("and the POINTS page names them", w.eval("pointsFor('command').some(r=>/MULTISHOT/.test(r[1]))"));
  t.done();
})();
