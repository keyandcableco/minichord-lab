// Sight Line: a note plucked on the harp as it reaches the playhead scores (dead on, double); a wrong
// string breaks the streak; a note that slips past costs a life; a key signature's sharp applies to
// every note on its letter; ledger lines are drawn; a chord at the line is played on the buttons; an
// inversion needs its bass, swung by the arrows (or a knob); a key change asks for the combo and pays
// when the minichord is set; a tune read to the end is named; the demo scrolls as play does.
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
  // the harp follows the register: middle C, the C in the third space, and two ledger lines up
  check("the harp's octave follows the staff: C4, C5 and C6 on three settings", w.eval("[60,72,84,43].map(slHarpOctave).join()")==="1,2,3,0");
  { const m=await atLine(); check("as a note becomes next, the harp is set to its octave", t.mc.params[99]===w.eval(`slHarpOctave(${m.midi})`), `note ${m.name}${m.midi}, octave ${t.mc.params[99]}`); }
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
  // chords: the chord at the line, on the buttons (as the minichord would voice it)
  const {sb}=t; const play=(n,bassPc)=>{ const root=48+n.rootPc, tones=[root, root+(n.q?3:4), root+7]; let v=tones;
    if(bassPc!=null){ while(((v[0]%12)+12)%12!==bassPc) v=[...v.slice(1), v[0]+12]; } sb.answerChord(v.map((p,i)=>({pitch:p, voice:i}))); };
  a.level=5; w.eval("slLevelStart()"); a.lives=9;
  let chordHit=false; for(let k=0;k<30 && !chordHit;k++){ const m=await atLine(); if(!m) break; if(m.chord){ const s0=a.score; play(m); await sleep(20); chordHit=a.score>s0 && m.done; } else { note(m.pc); await sleep(20); } }
  check("a chord at the line is played on the buttons", chordHit);
  // inversions: the written bass is needed; the arrows swing the minichord's voicing
  a.level=7; w.eval("slLevelStart()"); a.lives=9; t.key("ArrowUp"); await sleep(30);
  check("the arrows swing the minichord's chord inversion", t.mc.params[37]===1 && a.inv===1);
  let invOk=false, invWrong=false;
  for(let k=0;k<40 && !(invOk && invWrong);k++){ const m=await atLine(); if(!m) break;
    if(m.chord && m.inv && !invWrong){ play(m, m.rootPc);
      for(let i=0;i<15 && !/BASS/.test(t.heard());i++) await sleep(20);          // however long this machine takes to say so
      invWrong = !m.done && /BASS/.test(t.heard());
      play(m, m.bassPc); for(let i=0;i<15 && !m.done;i++) await sleep(20); invOk = invOk || m.done; }
    else if(m.chord){ play(m, m.bassPc); await sleep(20); } else { note(m.pc); await sleep(20); } }
  check("an inversion played in root position isn't it; with its bass, it is", invOk && invWrong, t.heard());
  // a key change: asks for the combo, and pays once the minichord is in the new key
  const ch=w.eval("(()=>{ const n={change:true, f:2, x:blast.ph+2}; blast.notes.push(n); slNoteEl(n); return n; })()");
  for(let i=0;i<60 && a.keyWant!==2;i++) await sleep(50);                     // until it reaches the line, however slowly
  check("a key change reaching the line puts the staff in the new key and asks for it", a.keyF===2 && a.keyWant===2);
  const s1=a.score; t.mc.params[35]=w.eval("keyIndexOf(2)"); t.mc.dispatchEvent(new w.Event("device"));
  for(let i=0;i<20 && !(a.score>s1);i++) await sleep(25);
  check("setting the minichord to it pays", a.score>s1 && a.keyWant==null);
  // tunes: read one to the end and it's named
  a.level=9; w.eval("slLevelStart()"); a.lives=9;
  let named=false; for(let k=0;k<40 && !named;k++){ const m=await atLine(); if(!m) break; note(m.pc); await sleep(20); if(m.last){ await sleep(50); named = !!w.eval("blast.tune") && /ODE|TWINKLE|FRÈRE|MARY|AMAZING|SAINTS/.test(d.querySelector(".field .banner")?.textContent||""); } }
  check("a tune read to the end is named", named, d.querySelector(".field .banner")?.textContent);
  // the demo scrolls as play does, reading each note and chord at the line and letting it carry on past
  a.phase="menu"; a.lives=3; for(const n of a.notes) n.el && n.el.remove(); a.notes=[]; w.eval("slMenu(); slDemo()"); await sleep(50);
  const caps=new Set(); let carried=false;
  for(let i=0;i<220;i++){ await sleep(120); const cap=d.querySelector(".field .demo .demotitle")?.textContent||""; if(cap) caps.add(cap);
    if(a.notes.some(n=>n.done && !n.change && n.x<a.ph-40)) carried=true; if(!d.querySelector(".field .demo")) break; }
  check("the demo scrolls like play: notes read at the line carry on past it", carried);
  check("the demo shows chords, a key change and an inversion", ["CHORDS","KEY CHANGE","INVERSIONS"].every(c=>caps.has(c)), [...caps].join(" | "));
  t.done();
})();
