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
  // a soft press whose flicker drops a voice or two: never read as a half chord, and read as the whole
  // one it is (this is the press that used to need hammering)
  seen.length=0; off(C); await sleep(120); seen.length=0;
  const t1=w.performance.now(); on(C);
  for(let i=0;i<14;i++){                                    // some notes go and come back, as a poor contact does
    await sleep(12); off(C.slice(0,2)); await sleep(12); on(C.slice(0,2));
  }
  await sleep(200);
  check("a flickering press is never read as a half chord", seen.every(s=>s.notes.split(",").length===4), seen.map(s=>s.notes.split(",").length).join(" "));
  check("and it is read as the whole chord it is", seen.length>=1 && seen[0].notes==="48,52,55,60" && seen[0].at-t1<700, seen.length?`${seen.length} chord(s), ${Math.round(seen[0].at-t1)} ms`:"none");
  off(C); await sleep(150);

  // a real change of chord still reads as the new chord; letting go still ends it
  seen.length=0; off(C); on(F); await sleep(150);
  check("a new chord is still read as new", seen.length>=1 && seen[seen.length-1].notes==="53,57,60,65", seen.map(s=>s.notes).join(" | "));
  off(F); await sleep(80);
  check("and letting go ends it", mc.voices.length===0);
  t.done();
})();
