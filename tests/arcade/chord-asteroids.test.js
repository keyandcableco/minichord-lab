// Chord Asteroids: a rock's chord cracks it into notes; its notes on the harp shoot them down.
const t=require("./harness").load("chord-asteroids");
(async()=>{
  const {sleep, chord, note, check, key}=t;
  await sleep(150); t.connect({key:2}); await sleep(100);
  const a=await t.start(2, {speed:4});
  let cracks=0, shots=0;
  for(let i=0;i<300 && a.phase==="play";i++){ await sleep(80);
    const n=a.rocks.find(r=>!r.dead && r.kind==="note" && performance.now()-r.born>300);
    if(n){ note(n.pc); shots++; continue; }
    const rock=a.rocks.find(r=>!r.dead && r.kind==="chord");
    if(rock && Math.random()<.5){ chord(rock.rootPc, rock.q); cracks++; } }
  check("rocks crack and notes are shot", cracks>=3 && shots>=6 && a.score>0, `${cracks} cracked, ${shots} shot, score ${a.score}`);
  const used=new Set(a.rocks.filter(r=>!r.dead && r.kind==="note").map(r=>r.pc)), wrong=[...Array(12).keys()].find(pc=>!used.has(pc));
  note(wrong); await sleep(30);
  check("a wrong string hits nothing", /JAM|NOT|NO SUCH/.test(t.heard()), t.heard());
  // the ship flies its orbit: the arrow keys (or the mod knob) swing it round, and the rocks re-aim at it
  const x0=a.cx, y0=a.cy; for(let i=0;i<6;i++){ key("ArrowLeft"); await sleep(20); } await sleep(400);
  check("the arrow keys fly the ship round its orbit", Math.hypot(a.cx-x0,a.cy-y0)>20 && Math.abs(Math.hypot(a.cx-a.hx,a.cy-a.hy)-a.orbitR)<2, `moved ${Math.round(Math.hypot(a.cx-x0,a.cy-y0))}`);
  t.done();
})();
