// The core reading chords from the minichord: a gentle press whose contact flickers is read as the one
// chord it is, and quickly; a firm press is read as before; a new chord is still a new chord; letting go
// still ends it; and the MPE the minichord really sends reads for every press a player makes.
const t=require("./harness").load("invaders");
(async()=>{
  const {w, sleep, check, mc}=t;
  await sleep(150); t.connect(); await sleep(100);
  const seen=[]; mc.addEventListener("chord", e=>seen.push({at:w.performance.now(), notes:e.detail.map(v=>v.note).join()}));
  const on=ns=>ns.forEach(n=>mc.handle([0x90, n, 100])), off=ns=>ns.forEach(n=>mc.handle([0x80, n, 0]));
  const C=[48,52,55,60], F=[53,57,60,65];
  // a firm press
  on(C); await sleep(120);
  check("a firm press is read as its chord", seen.length===1 && seen[0].notes==="48,52,55,60");
  off(C); await sleep(120); seen.length=0;
  // a gentle press: the contact flickers, the chord going off and on every 20 ms for a third of a second
  const t0=w.performance.now(); on(C);
  for(let i=0;i<16;i++){ await sleep(10); off(C); await sleep(10); on(C); }
  await sleep(120);
  check("a gentle, flickering press is read as the one chord it is", seen.length===1 && seen[0].notes==="48,52,55,60", `${seen.length} chords`);
  check("and quickly, not once the flicker stops", seen.length && seen[0].at-t0<200, seen.length && `${Math.round(seen[0].at-t0)} ms`);
  // What the minichord really sends, in MPE: each voice on its own channel, a bend before every note,
  // a change of chord as "off the old, on the new" voice by voice. Every press a player makes has to
  // read: the same chord again, quickly; a change without letting go; a run of changes; a bouncing
  // contact, which the firmware answers by stopping and restarting all four voices together.
  off(C); await sleep(150);
  const CH=[1,2,3,4], G=[43,47,50,55], F2=[41,45,48,53];
  const play=async(ns, prev)=>{ for(let i=0;i<4;i++){ mc.handle([0xE0|CH[i],0,64]); if(prev) mc.handle([0x80|CH[i],prev[i],0]); mc.handle([0x90|CH[i],ns[i],100]); await sleep(1); } };
  const rel=async ns=>{ for(let i=0;i<4;i++){ mc.handle([0x80|CH[i],ns[i],0]); await sleep(1); } };
  const scene=async(fn)=>{ seen.length=0; const t0=w.performance.now(); await fn(); await sleep(250); const r={n:seen.length, first:seen.length?Math.round(seen[0].at-t0):null};
    await rel(C); await rel(G); await rel(F2); await sleep(150); return r; };
  let r=await scene(async()=>{ await play(C); await sleep(150); await rel(C); await sleep(40); await play(C); await sleep(150); });
  check("MPE: the same chord twice, 40 ms apart, reads twice", r.n===2, `${r.n} read`);
  r=await scene(async()=>{ for(let k=0;k<4;k++){ await play(C); await sleep(110); await rel(C); await sleep(70); } });
  check("MPE: four quick taps read four times", r.n===4, `${r.n} read`);
  r=await scene(async()=>{ await play(C); await sleep(200); await play(G,C); await sleep(200); });
  check("MPE: C straight to G, without letting go, reads both", r.n===2, `${r.n} read`);
  r=await scene(async()=>{ await play(C); await sleep(200); await play(G,C); await sleep(200); await play(F2,G); await sleep(200); });
  check("MPE: a run of three changes reads all three", r.n===3, `${r.n} read`);
  r=await scene(async()=>{ await play(C); for(let k=0;k<15;k++){ await sleep(8); await rel(C); await sleep(8); await play(C); } await sleep(100); });
  check("MPE: a bouncing contact reads once, and at once, not when it stops bouncing", r.n===1 && r.first<150, `${r.n} read, after ${r.first} ms`);
  // a glide is a bend that moves: that chord waits for it to land, as it should
  r=await scene(async()=>{ await play(C); for(let k=0;k<10;k++){ mc.handle([0xE0|CH[0], 0, 64+k]); await sleep(15); } });
  check("MPE: a gliding chord waits for its glide to land", r.n===1 && r.first>=120, `${r.n} read, after ${r.first} ms`);

  // a real change of chord still reads as the new chord; letting go still ends it
  seen.length=0; off(C); on(F); await sleep(150);
  check("a new chord is still read as new", seen.length>=1 && seen[seen.length-1].notes==="53,57,60,65", seen.map(s=>s.notes).join(" | "));
  off(F); await sleep(80);
  check("and letting go ends it", mc.voices.length===0);
  t.done();
})();
