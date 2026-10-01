// Chord Invaders' beam and power-ups: in manual aim the press that shoots the right chord down, kept
// held, fires a short beam that destroys every chord of its type it crosses (not other types, not away
// from the ship); a chord merely held earns nothing; it starts only from a full bar, which refills slowly; OMNI BEAM destroys anything, sweeping by itself in auto aim; a power-up is taken
// by playing its chord; SLOW TIME halves the fall; a SHIELD saves a life; the title screen's POWER-UPS page.
const t=require("./harness").load("invaders");
(async()=>{
  const {w, sleep, check, mc, d}=t;
  await sleep(150); t.connect({extra:{7:19, 117:0, 238:1}}); await sleep(100);
  w.eval("saved.invAim=1"); const a=await t.start(0, {speed:1});
  const W=900; Object.defineProperty(a.field,"clientWidth",{value:W, configurable:true});
  // a sky of our own: chords placed where we say, the spawning held off
  const place=(sym,root,q,x,extra={})=>{ const el=d.createElement("span"); el.className="fchord"; el.textContent=sym; a.field.appendChild(el);
    Object.defineProperty(el,"offsetLeft",{value:x, configurable:true}); Object.defineProperty(el,"offsetWidth",{value:50, configurable:true});
    const it={el, sym, root, q, bass:null, bonus:false, rootPc:w.eval(`pcOfName("${root}")`), bassPc:null, t0:w.performance.now(), ...extra}; a.items.push(it); return it; };
  const reset=()=>{ a.items.forEach(i=>{ i.done=true; i.el.remove(); }); a.items=[]; a.next=w.performance.now()+1e9; };
  let sounding=[]; Object.defineProperty(mc,"voices",{get:()=>sounding.map((p,i)=>({note:p, pitch:p, voice:i})), configurable:true});
  const hold=(root,q)=>{ const r=48+t.PC[root], iv={"":[0,4,7],"m":[0,3,7],"7":[0,4,7,10]}[q]; sounding=iv.map(x=>r+x); };
  reset(); a.shipWant=.5; a.shipF=.5;
  const cUnder=place("C","C","",450), aUnder=place("Am","A","m",455), gUnder=place("G","G","",445), cFar=place("C","C","",100);
  // a chord merely held, with no hit, earns nothing
  hold("C",""); await sleep(700);
  check("holding a chord without shooting fires no beam", !a.beamOn && !cUnder.done && !gUnder.done);
  sounding=[]; await sleep(60);
  // the press that shoots the right chord down earns the beam: keep holding it
  hold("C",""); t.chord("C",""); await sleep(600);
  check("shooting the right chord, then holding, fires the beam", cUnder.done && a.beamOn);
  check("which burns every chord of its type in its path, G major too", gUnder.done);
  check("but not a chord of another type, nor one away from the ship", !aUnder.done && !cFar.done);
  await sleep(1100);
  check("it lasts little more than a second", !a.beamOn && a.energy<.05, `energy ${a.energy.toFixed(2)}`);
  sounding=[]; await sleep(1000);
  const e2=a.energy;
  check("and it refills slowly", e2>0 && e2<.1, `energy ${e2.toFixed(2)} after a second`);
  // with the bar not full, even an earned press fires nothing
  const c2=place("C","C","",450), g2=place("G","G","",448);
  hold("C",""); t.chord("C",""); await sleep(600);
  check("it starts again only from a full bar", c2.done && !a.beamOn && !g2.done, `energy ${a.energy.toFixed(2)}`);
  sounding=[]; reset();
  // OMNI BEAM: any chord held blasts whatever it touches
  reset(); a.powers={omni:w.performance.now()+8000};
  const g7=place("G7","G","7",450); hold("A","m"); await sleep(700);
  check("OMNI BEAM: any chord held destroys whatever the beam touches", g7.done);
  sounding=[];
  // in auto aim the omni beam sweeps by itself: watch where the ship is sent over a second
  a.aimManual=false; let lo=1, hi=0;
  for(let k=0;k<25;k++){ await sleep(40); lo=Math.min(lo,a.shipWant); hi=Math.max(hi,a.shipWant); }
  check("in auto aim, the omni beam sweeps the ship by itself", hi-lo>.2, `${lo.toFixed(2)} to ${hi.toFixed(2)}`);
  a.aimManual=true; a.powers={};
  // a power-up taken by playing its chord: SLOW TIME halves the fall
  reset(); a.shipWant=.5; a.shipF=.5; await sleep(100);
  const pu=place("F","F","",450,{power:"slow"}); t.chord("F"); await sleep(400);
  check("a power-up is taken by playing its chord", pu.done && w.eval("powerOn('slow')"));
  const it=place("Dm","D","m",200), t0=it.t0; await sleep(400);
  check("SLOW TIME: what falls takes longer", it.t0>t0+100, `${Math.round(it.t0-t0)} ms later`);
  // SHIELD: the next landing costs nothing
  a.powers={shield:true}; const lives=a.lives, landing=place("E","E","",300);
  w.eval("blastMiss(blast.items[blast.items.length-1])");
  check("SHIELD: the next chord that lands costs no life, and the shield is spent", a.lives===lives && !w.eval("powerOn('shield')"));
  w.eval("blast.phase='menu'; blast.items.forEach(i=>i.el.remove()); blast.items=[]; blastMenu(); cabStage(blast.overlay,'powers')"); await sleep(50);
  check("the title screen has a POWER-UPS page: each power-up as it looks, its name, what it does", d.querySelectorAll(".cab-powers .pwtable li").length===3 && /OMNI BEAM/.test(d.querySelector(".cab-powers").textContent) && !!d.querySelector(".cab-powers .fchord.pu-slow"));
  check("a game without power-ups skips it", w.eval("powersFor('snake').length")===0 && w.eval("powersFor('breakout').length")===1);
  t.done();
})();
