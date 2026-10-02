// Sound on a phone: the piano's samples arrive while the page settles, before any sound is asked
// for; the first touch starts the sound, and says it's music to be played, so an iPhone's silent
// switch doesn't silence it; and a touch brings the sound back after a call or an alarm took it away.
// A page that isn't showing starts nothing.
const harness=require("./harness");
const t=harness.load("invaders"), {w, sleep, check}=t;
(async()=>{
  // the samples, from a stand-in for the network; the iPhone's audio session, stood in for
  const asked=[];
  w.fetch=url=>{ asked.push(String(url)); return Promise.resolve({ok:true, arrayBuffer:()=>Promise.resolve(new ArrayBuffer(8))}); };
  w.navigator.audioSession={type:"auto"};
  await sleep(2400);
  check("the piano's samples are fetched while the page settles", asked.filter(u=>u.endsWith(".mp3")).length===27, `${asked.length} asked`);
  check("before any sound is asked for", w.eval("piano.ctx")===null);
  // a page that isn't showing starts nothing
  Object.defineProperty(w.document, "hidden", {configurable:true, get:()=>true});
  w.document.body.dispatchEvent(new w.MouseEvent("pointerup", {bubbles:true})); await sleep(20);
  check("a touch on a page that isn't showing starts nothing", w.eval("piano.ctx")===null);
  Object.defineProperty(w.document, "hidden", {configurable:true, get:()=>false});
  // the first touch
  w.document.body.dispatchEvent(new w.MouseEvent("pointerup", {bubbles:true})); await sleep(50);
  check("the first touch starts the sound", !!w.eval("piano.ctx"));
  check("as music to be played, which an iPhone's silent switch leaves alone", w.navigator.audioSession.type==="playback");
  // the decoding of what was fetched (the stand-in context can't decode, so the stand-in tone stays)
  check("and the samples fetched are the ones it decodes, not fetched again", asked.filter(u=>u.endsWith(".mp3")).length===27, `${asked.length} asked`);
  // a call or an alarm takes the sound away: the next touch brings it back
  w.eval("(()=>{ const c=piano.ctx; c.state='interrupted'; c.resume=()=>{ c.state='running'; return Promise.resolve(); }; })()");
  w.document.dispatchEvent(new w.KeyboardEvent("keydown", {code:"KeyQ", bubbles:true})); await sleep(20);
  check("after a call or an alarm, the next touch or key brings the sound back", w.eval("piano.ctx.state")==="running");
  t.done();
})();
