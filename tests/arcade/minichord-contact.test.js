// The core reading chords from the minichord: a gentle press whose contact flickers (the chord's
// notes off and straight back on, over and over) is read as the one chord it is, and quickly; a firm
// press is read as before; a new chord is still a new chord; letting go still ends it.
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
  // a real change of chord still reads as the new chord; letting go still ends it
  seen.length=0; off(C); on(F); await sleep(150);
  check("a new chord is still read as new", seen.length>=1 && seen[seen.length-1].notes==="53,57,60,65", seen.map(s=>s.notes).join(" | "));
  off(F); await sleep(80);
  check("and letting go ends it", mc.voices.length===0);
  t.done();
})();
