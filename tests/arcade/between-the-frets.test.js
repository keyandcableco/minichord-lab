// Between the Frets: the minichord's own speaker is silenced and the key held at C (the page makes the
// sounds, retuned); every question asks only for quarter-tones the page can tell by the modifier
// (sharpened C D F G A, flattened D E G A B); the right row by ear scores, then the letter and the
// modifier finds the note in between; a wrong answer costs a life; riffs are answered by column.
const t=require("./harness").load("between-the-frets");
(async()=>{
  const {w, sb, sleep, chord, check, mc}=t;
  await sleep(150); t.connect({key:2, extra:{97:150}}); await sleep(100);
  check("the minichord's speaker is silenced, the key held at C", mc.params[97]===0 && mc.params[35]===0);
  let bad=0; const kinds=["note","interval","neutral","riff"];
  for(const k of kinds) for(let n=0;n<150;n++){ const q=w.eval(`frQuestion("${k}")`);
    if(q.off>0 && !w.eval("FR_SHARPABLE").includes(q.letter)) bad++;
    if(q.off<0 && !w.eval("FR_FLATTABLE").includes(q.letter)) bad++; }
  check("every quarter-tone asked for is one the modifier can make recognisably", bad===0, `${bad} not`);
  const a=await t.start(0);
  const ROW=["","m","7"], NAT={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const answer=async()=>{ for(let i=0;i<80 && !(a.q && a.q.step==="answer");i++) await sleep(50); const q=a.q; await sleep(Math.max(0,q.at-w.performance.now()));
    if(q.kind==="riff") chord("FCGD"[q.answer]); else chord("C", ROW[q.answer]); await sleep(40); return q; };
  let rights=0, finds=0;
  for(let n=0;n<5;n++){ const s0=a.score, q=await answer(); if(a.score>s0) rights++;
    if(q.step==="find"){ const s1=a.score; chord((NAT[q.letter]+Math.sign(q.off)+12)%12); await sleep(40); if(a.score>s1) finds++; }
    await sleep(1800); }
  check("the right row by ear scores", rights===5, `${rights} of 5`);
  check("the letter and the modifier finds the note between the frets", finds>=1, `${finds} found`);
  for(let i=0;i<80 && !(a.q && a.q.step==="answer");i++) await sleep(50);
  const q=a.q; await sleep(Math.max(0,q.at-w.performance.now())); const lives=a.lives;
  chord("C", ROW[(q.answer+1)%3]); await sleep(40);
  check("a wrong answer costs a life", a.lives===lives-1, t.heard());
  // a riff: which note bent, by column
  const r=w.eval(`frQuestion("riff")`);
  // the staff spells a third from its root's letter: F minor's third is A-flat, not G-sharp
  const third=(letter,ans)=>{ const r=60+NAT[letter], n=w.eval(`frStaffNotes({kind:"neutral", letter:"${letter}", ref:[[${r}]], answer:${ans}, show:{}}, true)`)[1];
    const sp=w.eval(`frSpell(${n.m}, ${n.li})`); return w.eval("FR_LETTERS")[sp.li][0]+sp.acc; };
  check("thirds are spelled from their root's letter: F minor's is A♭, C minor's E♭, G minor's B♭", third("F",1)==="A-1" && third("C",1)==="E-1" && third("G",1)==="B-1" && third("F",2)==="A-0.5",
    [third("F",1),third("C",1),third("G",1),third("F",2)].join(" "));
  check("a riff bends one note, a quarter-tone", r.test[r.idx][0]-r.ref[r.idx][0]===r.off/100 && r.test.every((n,i)=>i===r.idx || n[0]===r.ref[i][0]));
  sb.restoreAll();
  check("leaving gives the speaker and the key back", mc.params[97]===150 && mc.params[35]===2);
  t.done();
})();
