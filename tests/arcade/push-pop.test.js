// Borrowing the instrument and giving it back: where the firmware has push and pop (commands 5 and 6)
// the Lab pushes before anything is borrowed and gives everything back with the pop, including a
// setting it never touched, then writes back what it borrowed, since a borrow made while the probe was
// still asking is in the push the probe leaves behind; where it hasn't, it writes back every address it
// borrowed, as before.
const {spawnSync}=require("child_process");
if(process.argv[2]){
  const pushPop=process.argv[2]==="pushpop";
  const t=require("./harness").load("chord-snake");
  (async()=>{
    const {w, mc, sleep, writes}=t;
    await sleep(150); t.connect({firmware:21, key:0, pushPop}); await sleep(100);
    const early=mc.pushPop===undefined ? w.eval("Object.keys(borrowed)").map(Number) : [];   // the double tap, set up as it connects
    await sleep(800);                                    // time for the probe
    const probed=mc.pushPop===pushPop;
    await t.start(0);                                    // a game borrows: the key, volumes, the double tap…
    await sleep(200);
    const was=w.eval("({...borrowed})"), borrowed=Object.keys(was).length;
    // something the Lab never touched changes on the instrument, as a knob or a combo would
    mc.params[41]=77;
    writes.length=0;
    const sent=[], send=mc.out.send; mc.out.send=m=>{ sent.push({cmd:m[3], at:writes.length}); send(m); };
    // the give-back itself, as it's sent: the round is still open, so once the dump is in the game sets
    // the double tap up again, on either minichord, and that isn't giving anything back
    w.eval("restoreAll()");
    const back=writes.slice(), pops=sent.filter(s=>s.cmd===6);
    const own=back.every(([a,v])=>a in was && was[a]===v) && new Set(back.map(([a])=>a)).size===back.length;
    const earlyBack=early.filter(a=>mc.params[a]===was[a]).length;
    mc.out.send=send; await sleep(200);
    console.log(JSON.stringify({probed, pushPop:!!mc.pushPop, borrowed, wrote:back.length, own, pops:pops.length,
      popFirst:pops.length>0 && pops[0].at===0, early:early.length, earlyBack, stray:mc.params[41], key:mc.params[35]}));
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
  say(a.pops===1 && a.popFirst, "giving them back is one message, the pop, sent before anything is written", `${a.pops} pops`);
  say(a.own && a.wrote<=a.borrowed, "after it, only what was borrowed is written, each back to what it was", `${a.wrote} writes for ${a.borrowed} borrowed`);
  say(a.early>0 && a.earlyBack===a.early, "so what was borrowed while the probe was still asking comes back too, which the pop alone would leave as the game had it", `${a.earlyBack} of ${a.early}`);
  say(a.stray===0, "and the pop puts back even what the Lab never touched", `address 41 came back to ${a.stray}`);
  const b=run("plain");
  say(b.probed && !b.pushPop, "an older minichord says nothing, and isn't used that way", b.err||`pushPop ${b.pushPop}`);
  say(b.pops===0 && b.own && b.wrote===b.borrowed && b.wrote>0, "there, every borrowed setting is written back as before", `${b.wrote} writes for ${b.borrowed} borrowed`);
  say(b.stray===77, "and what the Lab never touched is left as it is", `address 41 still ${b.stray}`);
  console.log(bad?`FAILED ${bad} of 9`:"ok 9"); process.exit(bad?1:0);
}
