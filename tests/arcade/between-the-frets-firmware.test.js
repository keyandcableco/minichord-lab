// Between the Frets on firmware 18: the minichord plays the quarter-tones itself. The game sets it to
// 24-EDO (temperament 12) and MPE, leaves its speaker on, and reads each quarter-tone from the bend on
// the chord's voices, so any letter can go either way.
const t=require("./harness").load("between-the-frets");
(async()=>{
  const {w, sb, sleep, chord, check, mc}=t;
  const NAT={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  await sleep(150); t.connect({extra:{7:18, 97:150, 237:0, 110:0}}); await sleep(100);
  check("the minichord goes to 24-EDO and MPE, its speaker left on", mc.params[237]===12 && mc.params[110]===1 && mc.params[97]===150);
  check("the Lab knows temperament 12 is 24 steps", w.eval("mc.division")===24 && w.eval("TEMPERAMENT_TABLE[12].division")===24);
  let edges=0; for(let n=0;n<300;n++){ const q=w.eval(`frQuestion("note")`); if((q.off>0 && ["E","B"].includes(q.letter)) || (q.off<0 && ["C","F"].includes(q.letter))) edges++; }
  check("any letter can go either way now, E and B sharp, C and F flat", edges>0, `${edges} of 300`);
  const b=await t.start(0); let found=0, wrongLetter=false;
  for(let n=0;n<10 && found<2;n++){ for(let i=0;i<80 && !(b.q && b.q.step==="answer");i++) await sleep(50);
    const q=b.q; await sleep(Math.max(0,q.at-w.performance.now()));
    chord("C", ["","m","7"][q.answer]); await sleep(40);
    if(q.step==="find"){
      const r=NAT[q.letter], d=q.off/100, notes=[0,4,7].map(x=>48+r+x), mpe=off=>notes.map((n,v)=>({note:n+Math.sign(off), pitch:n+off, voice:v}));
      if(!wrongLetter){ const s0=b.score; sb.answerChord(mpe(d*2)); await sleep(40); wrongLetter = b.score===s0 && q.step==="find"; }   // a semitone off isn't it
      const s1=b.score; sb.answerChord(mpe(d)); await sleep(40); if(b.score>s1) found++; }            // the quarter-tone, as MPE sends it
    await sleep(1800); }
  check("a semitone isn't the note between the frets", wrongLetter);
  check("the minichord's own quarter-tone, read from its bend, finds it", found>=1, `${found} found`);
  sb.restoreAll();
  check("leaving gives the tuning and MPE back", mc.params[237]===0 && mc.params[110]===0);
  t.done();
})();
