// The chord matrix, in Chord Invaders: the CHORDS option is offered once the firmware says it can,
// and ALTERNATE drops the stock alternate chords, which shoot down when played.
const t=require("./harness").load("invaders");
(async()=>{
  const {w, sleep, check, mc, d}=t;
  const slots={}; for(let i=0;i<7;i++) slots[202+i]=0;
  await sleep(150); t.connect({extra:{7:19, 39:0, 33:0, ...slots}}); await sleep(200);
  check("the menu offers the chords: standard, alternate or custom", /CHORDS/.test(d.body.textContent) && /CUSTOM/.test(d.body.textContent));
  w.eval("saved.chordMatrix='alternate'");
  const a=await t.start(0, {speed:1});
  check("the first level's major and minor become sus4 and sus2", w.eval("blastQuals().join()")==="sus4,sus2", w.eval("blastQuals().join()"));
  for(let i=0;i<80 && !a.items.some(x=>!x.done);i++) await sleep(100);
  const it=a.items.find(x=>!x.done);
  check("what falls is one of them", it && ["sus4","sus2"].includes(it.q), it && it.sym);
  const tones=w.eval(`MX_TONES["${it.q}"]`), s0=a.score;
  t.sb.answerChord(tones.map((x,i)=>({pitch:48+it.rootPc+x, voice:i}))); await sleep(400);
  check("and playing it shoots it down", it.done && a.score>s0, t.heard());
  w.eval("saved.chordMatrix='standard'");
  t.done();
})();
