// The chord matrix, in Chord Stack: chosen at the start, ALTERNATE sets the minichord to its alternate
// layout with the stock chords and deals sus chords, which light and clear; the helper lights the
// buttons that play them; CUSTOM follows the preset's own slots, leaving them as they are.
const t=require("./harness").load("chord-stack");
(async()=>{
  const {w, sb, sleep, check, mc}=t;
  const slots={}; for(let i=0;i<7;i++) slots[202+i]=0;
  await sleep(150); t.connect({extra:{7:19, 39:0, 33:0, ...slots}}); await sleep(100);
  w.eval("saved.chordMatrix='alternate'");
  const a=await t.start(0);
  check("ALTERNATE puts the minichord on its alternate layout, with the stock chords", mc.params[39]===1 && [0,1,2,3,4,5,6].every(i=>mc.params[202+i]===0));
  check("and the first level, major and minor, is dealt sus4 and sus2", w.eval("stQs().join()")==="sus4,sus2" && w.eval("stKeyChords(0, stQs()).every(c=>['sus4','sus2'].includes(c.q))"));
  a.piece=null; a.grid=w.eval("stEmpty()"); const F=17; [0,5,7].forEach((pc,x)=>a.grid[F][x]={pc}); sb.stackDraw();
  check("C, F and G in a row light as Csus4", sb.stackReady.map(r=>r.name).join()==="Csus4", sb.stackReady.map(r=>r.name).join());
  const s0=a.score; sb.answerChord([48,53,55,60].map((p,i)=>({pitch:p, voice:i}))); await sleep(40);
  check("and Csus4 clears them", a.score>s0 && !a.grid[F][0]);
  check("the helper lights the buttons that play each: sus4 the major button, sus2 the minor", JSON.stringify(w.eval("mxRows('sus4')"))==="[0]" && JSON.stringify(w.eval("mxRows('sus2')"))==="[1]");
  check("the HUD says which chords", /ALTERNATE/.test(a.hud.textContent));
  // CUSTOM: the preset's own slots, as they are
  mc.params[202]=15; mc.params[203]=16; w.eval("saved.chordMatrix='custom'; mxApply()");
  check("CUSTOM follows the preset's slots (maj9 and m9 here), leaving them be", w.eval("stQs().join()")==="maj9,m9" && mc.params[202]===15 && mc.params[203]===16 && mc.params[39]===1, w.eval("stQs().join()"));
  w.eval("saved.chordMatrix='standard'");
  t.done();
})();
