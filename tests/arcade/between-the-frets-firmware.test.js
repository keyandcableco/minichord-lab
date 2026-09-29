// Between the Frets on firmware 18: the minichord plays the quarter-tones itself. The game sets it to
// 24-EDO (temperament 12) and MPE, leaves its speaker on, and reads each quarter-tone from the bend on
// the chord's voices, so any letter can go either way.
const t=require("./harness").load("between-the-frets");
(async()=>{
  const {w, sb, sleep, chord, check, mc}=t;
  const NAT={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  await sleep(150); t.connect({extra:{7:18, 97:150, 237:0, 110:0}}); await sleep(100);
  check("the minichord goes to 24-EDO (temperament 11) and MPE, its speaker left on", mc.params[237]===11 && mc.params[110]===1 && mc.params[97]===150);
  check("the Lab's list reads 19, 24, 31, as firmware 18's does", w.eval("mc.division")===24 && w.eval("TEMPERAMENT_TABLE.slice(10).map(t=>t.division).join()")==="19,24,31");
  // firmware 17 had 31-EDO at 11 and no 24: the Lab translates, both ways
  check("on firmware 17, a stored 11 reads as 31-EDO", w.eval("temperIndex(11,17)")===12 && w.eval("temperIndex(11,18)")===11);
  check("and 31-EDO is written as 11 there, 24-EDO not at all", w.eval("temperValue(12,17)")===11 && w.eval("temperValue(11,17)")===null && w.eval("temperValue(12,18)")===12);
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
  // on the harp: pluck the test note itself, a quarter-tone found by ear; the game sets the rank that holds it
  let harpRight=0, rankOk=true, wrongFree=true;
  for(let n=0;n<10 && harpRight<2;n++){ for(let i=0;i<80 && !(b.q && b.q.step==="answer");i++) await sleep(50);
    const q=b.q; if(!["note","interval","riff"].includes(q.kind) || !q.off){ chord("C", ["","m","7"][q.answer]); await sleep(40); if(q.step==="find"){ const r=NAT[q.letter], d=q.off/100; sb.answerChord([0,4,7].map((x,v)=>({note:48+r+x+Math.sign(d), pitch:48+r+x+d, voice:v}))); } await sleep(1800); continue; }
    await sleep(Math.max(0,q.at-w.performance.now()));
    const step=Math.round(((q.show.test%12)+12)%12*2); if(mc.params[116]!==(step<12?1:2)) rankOk=false;
    const lives=b.lives; mc.dispatchEvent(new w.CustomEvent("harp",{detail:{note:Math.round(q.show.test)+1, ch:2, pitch:q.show.test+1}})); await sleep(30);   // a wrong string first
    if(b.lives!==lives || q.step!=="answer") wrongFree=false;
    await sleep(200); const s0=b.score;
    mc.dispatchEvent(new w.CustomEvent("harp",{detail:{note:Math.round(q.show.test), ch:3, pitch:q.show.test}})); await sleep(40);
    if(b.score>s0 && q.step!=="answer") harpRight++;
    await sleep(1800); }
  check("plucking the test note itself on the 24-EDO harp answers it and finds it", harpRight>=1, `${harpRight}`);
  check("the game sets the harp rank that holds the answer", rankOk);
  check("plucking round to find it costs nothing", wrongFree);
  sb.restoreAll();
  check("leaving gives the tuning and MPE back", mc.params[237]===0 && mc.params[110]===0);
  t.done();
})();
