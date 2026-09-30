// Chord Invaders' beam and power-ups: in manual aim a chord kept sounding fires a beam that destroys
// that chord wherever the beam crosses it (not other chords, not away from the ship), on energy that
// drains and refills; OMNI BEAM destroys anything, sweeping by itself in auto aim; a power-up is taken
// by playing its chord; SLOW TIME halves the fall; a SHIELD saves a life.
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
  const cUnder=place("C","C","",450), aUnder=place("Am","A","m",455), cFar=place("C","C","",100);
  hold("C",""); await sleep(700);
  check("a chord kept sounding fires the beam, and C major above the ship is destroyed", a.beamOn && cUnder.done);
  check("but not a different chord in the beam, nor the same chord away from the ship", !aUnder.done && !cFar.done);
  const e1=a.energy; check("the beam spends energy", e1<1, `${e1.toFixed(2)}`);
  sounding=[]; await sleep(600);
  check("and it refills when the chord stops", a.energy>e1 && !a.beamOn, `${e1.toFixed(2)} → ${a.energy.toFixed(2)}`);
  // OMNI BEAM: any chord held blasts whatever it touches
  reset(); a.powers={omni:w.performance.now()+8000};
  const g7=place("G7","G","7",450); hold("A","m"); await sleep(700);
  check("OMNI BEAM: any chord held destroys whatever the beam touches", g7.done);
  sounding=[];
  a.aimManual=false; const s0=a.shipWant; await sleep(500);
  check("in auto aim, the omni beam sweeps the ship by itself", Math.abs(a.shipWant-s0)>.05, `${s0.toFixed(2)} → ${a.shipWant.toFixed(2)}`);
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
  t.done();
})();
