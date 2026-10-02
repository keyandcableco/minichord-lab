// Light on a phone: the sharp canvases (Chord Asteroids, Fifths Defender) are drawn at most twice the
// field's pixels each way, however dense the screen; and a page put away goes quiet, its sound paused
// where it is and picked up again when it comes back.
const t=require("./harness").load("fifths-defender");
(async()=>{
  const {w, sleep, check}=t;
  await sleep(200); t.connect(); await t.start(0); await sleep(300);
  const size=dpr=>{ w.devicePixelRatio=dpr; return w.eval("(()=>{ const cv=document.createElement('canvas'); blast.fx.light=false; sharpBegin(cv); return [cv.width, cv.height, blast.fx.fw, blast.fx.fh]; })()"); };
  const [w3,h3,fw,fh]=size(3);
  check("a screen three times as dense draws the sharp canvas at twice the field's pixels", w3===fw*2 && h3===fh*2, `${w3}×${h3} for ${fw}×${fh}`);
  const [w15]=size(1.5);
  check("a less dense one, at its own density", w15===Math.round(fw*1.5), `${w15}`);
  // the sound: one context, paused when the page is put away
  w.eval("piano.start()"); await sleep(20);
  w.eval("(()=>{ const c=piano.ctx; c.state='running'; c.suspend=()=>{ c.state='suspended'; return Promise.resolve(); }; c.resume=()=>{ c.state='running'; return Promise.resolve(); }; })()");
  const away=hidden=>{ Object.defineProperty(w.document, "hidden", {configurable:true, get:()=>hidden}); w.document.dispatchEvent(new w.Event("visibilitychange")); };
  away(true); await sleep(20);
  check("a page put away goes quiet", w.eval("piano.ctx.state")==="suspended");
  away(false); await sleep(20);
  check("and picks up again when it comes back", w.eval("piano.ctx.state")==="running");
  w.eval("piano.ctx.suspend()"); away(true); away(false); await sleep(20);
  check("but sound that was already off stays off", w.eval("piano.ctx.state")==="suspended");
  t.done();
})();
