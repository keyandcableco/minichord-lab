// Chopper Rescue's beginner mode: the on-screen minichord carries the harp, as the strip or the
// keymaster plate, and when the survivors are to be signalled it lights each string in turn.
const t=require("./harness").load("chopper-rescue",{storage:{saved:{beginner:true}}});
(async()=>{
  const {w, sleep, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(0);
  await sleep(300);
  check("beginner mode shows the minichord with its harp", !!(a.helpBoard && a.helpBoard.strings && a.helpBoard.strings.length===12 && a.helpHarp));
  // signal them: the first note lit, then the next as each is plucked
  w.eval(`chSignal({root:"C", q:""}, {col:3,row:3}, ()=>{})`); await sleep(50);
  const lit=()=>a.helpHarp.cells.findIndex(c=>c && c.classList.contains("lit"));
  check("signalling C major, the harp lights C first", lit()===0, `string ${lit()}`);
  t.note(0); await sleep(50);
  check("and then E", lit()===4, `string ${lit()}`);
  // the keymaster: the plate, its notes named
  w.eval("saved.harpLayout='keymaster'; helperSync(true)"); await sleep(100);
  check("on the keymaster, the plate with its notes", !!(a.helpBoard && a.helpBoard.el.querySelector(".kmplate") && a.helpBoard.strings.length===12));
  w.eval("saved.harpLayout='strip'");
  t.done();
})();
