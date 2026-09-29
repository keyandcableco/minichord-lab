// Sight Line: a note plucked on the harp as it reaches the playhead scores (dead on, double); a wrong
// string breaks the streak; a note that slips past costs a life; a key signature's sharp applies to
// every note on its letter; ledger lines are drawn; a tune read to the end is named.
const t=require("./harness").load("sight-line");
(async()=>{
  const {w, sleep, note, check, d}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(0, {speed:4});
  const atLine=async()=>{ for(let i=0;i<600;i++){ const n=a.notes.find(n=>!n.done && Math.abs(n.x-a.ph)<=20); if(n) return n; await sleep(20); } return null; };
  let hits=0;
  for(let k=0;k<4;k++){ const n=await atLine(); if(!n) break; const s0=a.score; note(n.pc); await sleep(20); if(a.score>s0 && n.done) hits++; }
  check("notes plucked at the playhead score", hits===4, `${hits} of 4`);
  const n=await atLine(); const wrong=(n.pc+1)%12; const st=a.streak; note(wrong); await sleep(20);
  check("a wrong string breaks the streak", a.streak===0 && st>0 && /THAT'S/.test(t.heard()), t.heard());
  const lives=a.lives; for(let i=0;i<150 && a.lives===lives;i++) await sleep(20);
  check("a note that slips past costs a life", a.lives===lives-1);
  // a key signature: in G major (one sharp) the F line is played F♯
  w.eval("blast.keyF=1");
  check("in G major, an F on the staff is played F♯", w.eval("slPc(31,0)")===6 && w.eval("slPc(38,0)")===6 && w.eval("slPc(31,-1)")===4);
  w.eval("blast.keyF=0");
  // ledger lines: middle C on the treble staff gets one
  w.eval("blast.notes.push({dn:28,clef:'treble',acc:0,pc:0,name:'C',x:300}); slNoteEl(blast.notes[blast.notes.length-1])");
  check("middle C on the treble staff has its ledger line", d.querySelectorAll(".slstaff .snote")[d.querySelectorAll(".slstaff .snote").length-1].querySelectorAll("line").length===1);
  // tunes: read one to the end and it's named
  a.level=6; w.eval("slLevelStart()"); a.lives=9;
  let named=false; for(let k=0;k<40 && !named;k++){ const m=await atLine(); if(!m) break; note(m.pc); await sleep(20); if(m.last){ await sleep(50); named = !!w.eval("blast.tune") && /ODE|TWINKLE|FRÈRE|MARY|AMAZING|SAINTS/.test(d.querySelector(".field .banner")?.textContent||""); } }
  check("a tune read to the end is named", named, d.querySelector(".field .banner")?.textContent);
  t.done();
})();
