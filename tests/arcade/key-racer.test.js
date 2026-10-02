// Key Racer: every circuit's key spells its chords plainly, and its oil is out of the key; the harp
// steers (low strings left, high right) and so does a knob; a sign of the key driven through is
// collected and one out of it spins the car; from the fourth circuit a gate shuts unless its chord is
// played; a rival's chord pulls it over, one out of the key doesn't; V then I is the turbo;
// qualifying's seven chords set the grid; the line finishes the race and moves on; the clock running
// out costs a life; Endurance's checkpoint changes the key, its I played first for the long
// extension; the signature held at C, the modifier set for the key; the POWER-UPS page.
const t=require("./harness").load("key-racer");
(async()=>{
  const {w, sb, sleep, chord, note, knob, check, mc}=t;
  await sleep(150); t.connect({key:3}); await sleep(100);
  check("the harp is chromatic, the key held at C between races", mc.params[98]===1 && mc.params[35]===0);
  // every circuit's chords, and its oil
  const bad=w.eval(`(()=>{ const out=[]; for(let i=0;i<16;i++){ blast.level=i; const L=krLevel(i), k=krKey(L.key, L.minor);
      for(const n of krPool(k,L)) if(!krChord(k,n)) out.push(L.n+": "+n);
      for(let j=0;j<30;j++){ const o=krOff(k, L.out==="cone"?"near":L.out); if(KR_POOL[k.minor?"minor":"major"].concat(KR_POOL.sevenths).some(n=>{ const c=krChord(k,n); return c && c.pc===o.pc && c.q===o.q; })) out.push(L.n+": oil "+o.sym); } }
    blast.level=0; return out; })()`);
  check("every circuit's chords spell plainly, and its oil is never of the key", !bad.length, bad.slice(0,4).join(" · "));
  const circ=w.eval(`KR_CIRCLE.filter(n=>{ const k=krKey(n,false); return !krPool(k,KR_LEVELS[0]).every(m=>krChord(k,m)); })`);
  check("Endurance's circle of fifths spells in every key", !circ.length, circ.join(" "));

  const a=await t.start(3, {speed:2});                                // D Circuit: gates to play open
  for(let i=0;i<60 && !a.qual;i++) await sleep(50);
  check("a Grand Prix circuit opens with qualifying, in its key", !!a.qual && a.key.label==="D MAJOR", a.key && a.key.label);
  check("the signature stays at C, the modifier sharpening for D", mc.params[35]===0 && mc.params[31]===0);
  // qualifying: the seven chords in order
  const q=a.qual; chord("E","m"); await sleep(20);
  check("qualifying wants the chords in order", q.i===0);
  for(const c of q.chords){ chord(c.pc, c.q); await sleep(15); }
  check("the seven played in order set a place on the grid", !a.qual && a.cars.length===7, `P${w.eval("krPlace()")}`);
  for(let i=0;i<200 && a.st!=="race";i++) await sleep(50);
  check("the lights go out and the race is on", a.st==="race");
  // steering: the harp's strings across the road, the low ones left
  note(0); const left=a.targetX; note(11); const right=a.targetX; note(6);
  check("the harp steers: its low strings left, its high ones right", left<-1 && right>1 && Math.abs(a.targetX)<.15, `${left.toFixed(2)} ${right.toFixed(2)}`);
  // a row driven through, staged: the car put just before it, in a lane
  const stage=(signs, lane)=>w.eval(`(()=>{ const s=blast.segs.length-400, row={seg:s, signs:${JSON.stringify(signs)}.map(x=>({lane:x[0], chord: x[1]==="cone" ? undefined : x[2] ? krChord(blast.key,x[1]) : krOff(blast.key,"near"), cone:x[1]==="cone"})), key:blast.key};
    blast.rows.push(row); blast.rowAt.set(s,row); blast.cars=[]; blast.pos=s*KR_SEG-KR_PLAYER_Z-4*KR_SEG; blast.x=blast.targetX=KR_LANES[${lane}]; blast.spinUntil=0; blast.speed=blast.max; blast.finishZ=0; return row; })()`);
  const drive=async()=>{ for(let i=0;i<10;i++){ w.eval("krStep(.05)"); } await sleep(10); };
  let s0=a.score; stage([[1,"vi",true],[0,"x",false]], 1); w.eval("blast.rows[blast.rows.length-1].signs[0].open=true"); await drive();
  check("an open gate of the key, driven through, is collected", a.score>s0 && w.eval("blast.rows[blast.rows.length-1].signs[0].hit")==="good", t.heard());
  stage([[1,"IV",true]], 1); await drive();
  check("from the fourth circuit, a gate not played open shuts in your face", w.eval("blast.rows[blast.rows.length-1].signs[0].hit")==="shut", t.heard());
  stage([[2,"x",false]], 2); await drive();
  check("a chord out of the key, driven through, spins the car", a.spinUntil>a.clock && /NOT IN D MAJOR/.test(t.heard()), t.heard());
  // a gate played open on the way in
  const row=stage([[0,"V",true],[2,"x",false]], 0); w.eval("blast.pos-=30*KR_SEG"); w.eval("blast.st='race'");
  chord("A",""); await sleep(20);
  check("its chord, played on the way in, opens the gate", w.eval("blast.rows[blast.rows.length-1].signs[0].open")===true, t.heard());
  // rivals: one of the key pulls over for its chord; one out of the key won't
  w.eval(`blast.cars=[{z:blast.pos+KR_PLAYER_Z+20*KR_SEG, x:0, speed:blast.max*.5, chord:krChord(blast.key,"ii"), hue:2, yield:0, ahead:true},{z:blast.pos+KR_PLAYER_Z+30*KR_SEG, x:.66, speed:blast.max*.5, chord:krOff(blast.key,"near"), hue:3, yield:0, ahead:true}]`);
  chord("E","m"); await sleep(20);
  check("a rival's chord, in the key, pulls it over", w.eval("blast.cars[0].yield")===1);
  const off=w.eval("blast.cars[1].chord"); chord(off.pc, off.q); await sleep(20);
  check("a rival out of the key won't pull over for its chord", !w.eval("blast.cars[1].yield") && /OUT OF THE KEY/.test(t.heard()), t.heard());
  // the turbo: V then I
  w.eval("blast.turboAt=0; blast.boostUntil=0"); chord("A",""); await sleep(20); chord("D",""); await sleep(20);
  check("V then I is the turbo", a.turboOn && a.boostUntil>a.clock);
  // the line: the race finished, the next circuit
  w.eval("blast.finishZ=blast.pos+KR_PLAYER_Z+KR_SEG; blast.cars=[]; blast.st='race'"); const lv=a.level; await drive();
  check("over the line: the race is finished, in first", a.st==="done" && /YOU WIN/.test(w.document.querySelector(".krflag").textContent), w.document.querySelector(".krflag").textContent);
  for(let i=0;i<120 && a.level===lv;i++) await sleep(50);
  check("and the next circuit comes up", a.level===lv+1, `level ${a.level+1}`);
  // the clock: run out, a life
  for(let i=0;i<80 && !a.qual;i++) await sleep(50);
  w.eval("krQualified(null)"); for(let i=0;i<200 && a.st!=="race";i++) await sleep(50);
  const lives=a.lives; w.eval("blast.time=.01"); await drive();
  check("the clock running out costs a life and the circuit's raced again", a.lives===lives-1, `${lives} → ${a.lives}`);
  // the knob steers, with knob steering chosen
  w.eval("saved.krSteer=1"); for(let i=0;i<80 && !a.qual;i++) await sleep(50); w.eval("krQualified(null)"); for(let i=0;i<200 && a.st!=="race";i++) await sleep(50);
  knob(0,22); await sleep(10); const kl=a.targetX; knob(127,22); await sleep(10);
  check("with knob steering chosen, the knob steers", kl<-1 && a.targetX>1, `${kl.toFixed(2)} ${a.targetX.toFixed(2)}`);
  note(0); await sleep(10);
  check("and the harp doesn't", a.targetX>1);
  w.eval("saved.krSteer=0");
  check("the POWER-UPS page lists them", w.eval("powersFor('racer').map(p=>p.name).join(' ')")==="SLIPSTREAM ROLL CAGE YELLOW FLAG DA CAPO");
  // Endurance: a checkpoint changes the key; its I played first, the long extension
  w.eval("newRun(); saved.krMode=1; blast.level=0; blast.phase='play'; blast.mode='endurance'; krEndurance()");
  for(let i=0;i<120 && a.st!=="race";i++) await sleep(50);
  check("Endurance starts in C, round the circle", a.key.label==="C MAJOR" && a.checks.length>=1 && a.checks[0].key.label==="G MAJOR");
  w.eval(`blast.pos=blast.checks[0].seg*KR_SEG-KR_PLAYER_Z-20*KR_SEG; blast.cars=[]`);
  chord("G",""); await sleep(20);
  const t0=a.time; await drive(); for(let i=0;i<20 && !a.checks[0].done;i++){ w.eval("krStep(.05)"); }
  check("its I played before the checkpoint: the key changes, the clock's extended a long way", a.checks[0].done && a.key.label==="G MAJOR" && a.time>t0+25, `${t0.toFixed(1)} → ${a.time.toFixed(1)}`);
  w.eval("saved.krMode=0");
  sb.restoreAll();
  check("leaving gives the key back", mc.params[35]===3);
  t.done();
})();
