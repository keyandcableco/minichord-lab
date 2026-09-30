// Borrowing the instrument and giving it back: where the firmware has push and pop (commands 5 and 6)
// the Lab pushes before anything is borrowed and gives everything back in one message, including a
// setting it never touched; where it hasn't, it writes back every address it borrowed, as before.
const {spawnSync}=require("child_process");
if(process.argv[2]){
  const pushPop=process.argv[2]==="pushpop";
  const t=require("./harness").load("chord-snake");
  (async()=>{
    const {w, mc, sleep, writes}=t;
    await sleep(150); t.connect({firmware:21, key:0, pushPop}); await sleep(900);   // time for the probe
    const probed=mc.pushPop===pushPop;
    await t.start(0);                                    // a game borrows: the key, volumes, the double tap…
    await sleep(200);
    const borrowed=Object.keys(w.eval("borrowed")).length;
    // something the Lab never touched changes on the instrument, as a knob or a combo would
    mc.params[41]=77;
    writes.length=0;
    w.eval("restoreAll()"); await sleep(200);
    console.log(JSON.stringify({probed, pushPop:!!mc.pushPop, borrowed, wrote:writes.length, stray:mc.params[41], key:mc.params[35]}));
    process.exit(0);
  })();
} else {
  let bad=0;
  const say=(ok,txt,det)=>{ if(!ok) bad++; console.log(`${ok?"  ✓":"  ✗"} ${txt}${det?`  (${det})`:""}`); };
  const run=m=>{ const r=spawnSync(process.execPath,[__filename,m],{encoding:"utf8",timeout:60000});
    try{ return JSON.parse((r.stdout||"").trim().split("\n").pop()); }catch(e){ return {err:(r.stderr||"").slice(0,200)}; } };
  const a=run("pushpop");
  say(a.probed && a.pushPop, "a minichord with push and pop is found by asking it", a.err||`pushPop ${a.pushPop}`);
  say(a.borrowed>0, "a game still borrows what it needs", `${a.borrowed} settings`);
  say(a.wrote===0, "giving them back is one message, not a write per setting", `${a.wrote} writes`);
  say(a.stray===0, "and it puts back even what the Lab never touched", `address 41 came back to ${a.stray}`);
  const b=run("plain");
  say(b.probed && !b.pushPop, "an older minichord says nothing, and isn't used that way", b.err||`pushPop ${b.pushPop}`);
  say(b.wrote>0, "there, every borrowed setting is written back as before", `${b.wrote} writes`);
  say(b.stray===77, "and what the Lab never touched is left as it is", `address 41 still ${b.stray}`);
  console.log(bad?`FAILED ${bad} of 7`:"ok 7"); process.exit(bad?1:0);
}
