// Chopper Rescue: each call comes through static until the radio's tuned in (the knob, the keys, or
// the station's note on the harp); the radio's theory decodes to the right chord; the right chord
// finds them, a wrong one finds nobody (or a decoy); they come up only when their chord is plucked in
// order; emergencies show with decoys; calls don't repeat.
const t=require("./harness").load("chopper-rescue");
(async()=>{
  const {sleep, chord, note, knob, key, check, d, w}=t;
  await sleep(150); t.connect({extra:{7:17}}); await sleep(100);               // firmware whose knobs can send MIDI
  check("the game switches the knobs on, so a knob can turn the dial", t.mc.params[238]===1);
  const a=await t.start(4); await sleep(1500);
  const texts=[]; let decoysShown=true, tunedEach=true, signalOrder=true;
  const tuneIn=async how=>{ for(let k=0;k<80 && !a.tune;k++) await sleep(100); const tn=a.tune; if(!tn) return false;
    if(how==="harp") note(tn.pc);
    else if(how==="knob") knob(Math.round(tn.target*127), 20);                  // any knob turns the dial
    else if(how==="keys"){ for(let i=0;i<200 && a.tune && Math.abs(w.eval("chCents()"))>8;i++){ key(w.eval("chCents()")<0?"ArrowRight":"ArrowLeft"); await sleep(3); } }
    await sleep(700); return !a.tune && !!a.call; };
  for(let i=0;i<9;i++){
    if(i===0){ for(let k=0;k<50 && !a.tune;k++) await sleep(100); chord("C"); await sleep(50);
      check("a chord before tuning in is refused", /TUNE THE RADIO/.test(t.heard()), t.heard()); }
    if(!(await tuneIn(["harp","keys","knob"][i%3]))){ tunedEach=false; break; }
    const c=a.call; texts.push(c.text);
    if(c.legs.length===1 && a.emerg.filter(e=>e.real).length!==1) decoysShown=false;
    if(i===2){ const dec=a.emerg.find(e=>!e.real); if(dec){ chord([5,0,7,2,9,4,11][dec.col], ["","m","7"][dec.row]); await sleep(700);
      check("flying to a decoy finds the wrong emergency", /NOT THIS ONE/.test(t.heard()), t.heard()); await sleep(900); } }
    for(const l of c.legs){ chord(l.root, l.q); await sleep(700); }
    for(let k=0;k<120 && !a.signal;k++) await sleep(50);                   // (Ben takes a moment first)
    const sg=a.signal; if(!sg){ signalOrder=false; continue; }
    if(i===1){ note((t.PC[sg.tones[0]]+1)%12); await sleep(20); check("a wrong note isn't their signal", /NOT THEIR SIGNAL/.test(t.heard()), t.heard()); }
    // this level's signal starts from the 3rd: the first inversion
    const want=w.eval("spellChord")(c.legs[c.legs.length-1].root, c.legs[c.legs.length-1].q); if(sg.tones[0]!==want[1]) signalOrder=false;
    const wasBen=a.lastBen;
    for(const n of sg.tones){ note(t.PC[n]); await sleep(20); }
    if(i===3) a.benNext=true;                                                  // the next call: Ben
    if(i===4){ await sleep(1400); check("now and then the hikers turn out to be Ben, and he's rescued", wasBen && a.benDone, `score ${a.score}`);
      check("his card holds in the middle of the field", /MERCI, BEN/.test((t.d.querySelector(".chbencard")||{}).textContent||"")); }
    await sleep(2200);
  }
  check("every call tuned in, by the harp, the keys or a knob", tunedEach && texts.length>=8, `${texts.length} tuned`);
  check("the top level's signal starts from the 3rd", signalOrder);
  check("every call answered is a rescue", a.rescues>=8, `${a.rescues} rescues of ${texts.length}`);
  check("no call repeats the one before", texts.every((x,i)=>i===0 || x!==texts[i-1]));
  check("one real emergency among the decoys", decoysShown);
  check("nothing on the map marks a landing zone", d.querySelectorAll(".chpad").length===0);
  check("lives intact", a.lives===3, `${a.lives}`);
  t.done();
})();
