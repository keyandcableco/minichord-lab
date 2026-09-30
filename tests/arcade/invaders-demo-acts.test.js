// Chord Invaders' demo shows its moves: the beam, held on A minor and swept, burns every minor chord
// and leaves the C major; the power-up is shot, OMNI BEAM comes on, and its sweep burns everything.
const t=require("./harness").load("invaders");
(async()=>{
  const {w, d, sleep, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  w.eval(`Object.defineProperty(blast.field,"clientWidth",{value:900, configurable:true})`);
  w.eval(`window.__ctx={token:{run:true}, el:document.createElement("div"), cells:[...Array(7)].map(()=>[...Array(3)].map(()=>document.createElement("div"))),
    clear:()=>{}, sleep:ms=>new Promise(r=>setTimeout(r,ms)), playChord:()=>{}, $d:()=>document.createElement("p")}`);
  // the test's page has no layout: give each dropped chord its place from its left, and a width
  const layout=()=>d.querySelectorAll(".democh").forEach(c=>{ if(c.__laid) return; c.__laid=true; const f=parseFloat(c.style.left)/100;
    Object.defineProperty(c,"offsetLeft",{get:()=>900*f}); Object.defineProperty(c,"offsetWidth",{value:40}); });
  // the game's frame loop running, as it does in the demo (the ship glides to where it's steered)
  w.eval(`blast.phase="demo"; blast.demo=__ctx.token; __ctx.token.el=__ctx.el; cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(blastTick)`);
  w.eval(`window.__beam=demoAct("beam", __ctx)`);
  let sawBeam=false, burnedMinors=false, cStood=false;
  for(let i=0;i<80;i++){ await sleep(60); layout(); if(w.eval("blast.beamOn")) sawBeam=true;
    const minors=d.querySelectorAll(".democh.minor").length, c=[...d.querySelectorAll(".democh")].some(x=>x.textContent==="C");
    if(sawBeam && !minors && c){ burnedMinors=true; cStood=true; break; } }
  check("the demo's beam fires, and sweeping it burns every minor chord", sawBeam && burnedMinors);
  check("but leaves the C major, another type", cStood);
  await w.eval("__beam");
  w.eval(`window.__omni=demoAct("omni", __ctx)`);
  let omni=false, cleared=false;
  for(let i=0;i<120;i++){ await sleep(60); layout(); if(w.eval("powerOn('omni')")) omni=true; if(omni && w.eval("blast.beamOn") ) cleared = cleared || d.querySelectorAll(".democh").length<=2; }
  check("the power-up is shot, and OMNI BEAM comes on and sweeps", omni && cleared);
  t.done();
})();
