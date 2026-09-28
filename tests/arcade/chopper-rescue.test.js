// Chopper Rescue: the radio's theory decodes to the right chord; the right chord rescues, a wrong one
// finds nobody (or a decoy); emergencies show with decoys; calls don't repeat.
const t=require("./harness").load("chopper-rescue");
(async()=>{
  const {sleep, chord, check, d}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(4); await sleep(1500);
  const texts=[]; let ok=true, decoysShown=true;
  for(let i=0;i<10;i++){
    for(let k=0;k<50 && !a.call;k++) await sleep(100);
    const c=a.call; if(!c) break; texts.push(c.text);
    if(c.legs.length===1 && a.emerg.filter(e=>e.real).length!==1) decoysShown=false;
    if(i===2){ const dec=a.emerg.find(e=>!e.real); if(dec){ chord([5,0,7,2,9,4,11][dec.col], ["","m","7"][dec.row]); await sleep(700);
      check("flying to a decoy finds the wrong emergency", /NOT THIS ONE/.test(t.heard()), t.heard()); await sleep(900); } }
    for(const l of c.legs){ chord(l.root, l.q); await sleep(700); }
    await sleep(1800);
  }
  check("every call answered is a rescue", a.rescues>=8, `${a.rescues} rescues of ${texts.length}`);
  check("no call repeats the one before", texts.every((x,i)=>i===0 || x!==texts[i-1]));
  check("one real emergency among the decoys", decoysShown);
  check("nothing on the map marks a landing zone", d.querySelectorAll(".chpad").length===0);
  check("lives intact", a.lives===3);
  t.done();
})();
