// Borrowing the instrument and giving it back: where the firmware has push and pop (commands 5 and 6)
// the Lab pushes before anything is borrowed and gives everything back in one message, including a
// setting it never touched; where it hasn't, it writes back every address it borrowed, as before.
// A game sets the minichord up as soon as it connects, while the probe is still waiting for its
// answer, and every write fires "device" as the real client's does: the probe's push still comes
// first, and the writes aren't taken for its answer. A preset loaded mid-game drops the push, and
// what the game sets again over it is written back after the pop, and only that.
const {spawnSync}=require("child_process");
if(process.argv[2]){
  const mode=process.argv[2], pushPop=mode!=="plain", preset=mode==="preset";
  const t=require("./harness").load("chord-snake");
  (async()=>{
    const {w, mc, sleep, writes}=t;
    await sleep(150); t.connect({firmware:preset ? 80 : 21, key:0, pushPop, writesFire:true});
    await sleep(50);
    const early=mc.pushPop===undefined && Object.keys(w.eval("borrowed")).length;   // borrowed before the probe has its answer
    await sleep(850);                                    // time for the probe
    const probed=mc.pushPop===pushPop;
    await t.start(0);                                    // a game borrows: the key, volumes, the double tap…
    await sleep(200);
    let before=0;
    if(preset){
      // a preset loaded on the instrument: the firmware drops the push, and reports its settings unasked
      mc.out.held=null;
      const changed=Object.keys(w.eval("borrowed")).map(Number).filter(a=>a!==200 && a!==201).slice(0,3);
      for(const a of changed) mc.params[a]=(mc.params[a]||0)+5;
      mc.params[60]=9; mc.params[61]=9;
      mc.unasked=true; mc.changed=new Set([...changed,60,61]); mc.dispatchEvent(new w.Event("device")); mc.unasked=false; mc.changed=new Set();
      await sleep(100);
      before=Object.keys(w.eval("borrowed")).length;
      w.eval("borrow(45, 3)");                           // the game's next borrow pushes again
      await sleep(50);
    }
    const had=w.eval("({...borrowed})"), borrowed=Object.keys(had).length;
    // something the Lab never touched changes on the instrument, as a knob or a combo would
    mc.params[41]=77;
    writes.length=0;
    // the give-back as it's sent: each pop, and how many writes went before it
    const pops=[], send=mc.out.send;
    mc.out.send=function(m){ if(m[1]===0 && m[2]===0 && m[3]===6) pops.push(writes.length); return send.call(this,m); };
    w.eval("restoreAll()"); mc.out.send=send; await sleep(200);
    const wrong=Object.entries(had).filter(([a,v])=>mc.params[a]!==v).map(([a,v])=>`${a}: ${mc.params[a]} not ${v}`);
    console.log(JSON.stringify({early, probed, pushPop:!!mc.pushPop, borrowed, before, wrote:writes.length,
      wroteNew:writes.some(([a])=>a===45), pops:pops.length, popFirst:pops[0]===0, stray:mc.params[41], wrong}));
    process.exit(0);
  })();
} else {
  let bad=0, n=0;
  const say=(ok,txt,det)=>{ n++; if(!ok) bad++; console.log(`${ok?"  ✓":"  ✗"} ${txt}${det?`  (${det})`:""}`); };
  const run=m=>{ const r=spawnSync(process.execPath,[__filename,m],{encoding:"utf8",timeout:60000});
    try{ return JSON.parse((r.stdout||"").trim().split("\n").pop()); }catch(e){ return {err:(r.stderr||"").slice(0,200)}; } };
  const a=run("pushpop");
  say(a.probed && a.pushPop, "a minichord with push and pop is found by asking it", a.err||`pushPop ${a.pushPop}`);
  say(a.early>0, "though the game borrows as it connects, before the answer comes", `${a.early} settings`);
  say(a.borrowed>0, "a game still borrows what it needs", `${a.borrowed} settings`);
  say(a.pops===1 && a.wrote===0, "giving them back is one message, the pop, not a write per setting", `${a.pops} pops, ${a.wrote} writes`);
  say(a.wrong && !a.wrong.length, "and every one is back as it was", (a.wrong||[]).join(", "));
  say(a.stray===0, "and it puts back even what the Lab never touched", `address 41 came back to ${a.stray}`);
  const c=run("preset");
  say(c.probed && c.before>0, "a preset loaded mid-game: the game sets its settings again", c.err||`${c.before} settings`);
  say(c.wrong && !c.wrong.length, "given back, each is as the new preset had it, not as the game did", (c.wrong||[]).join(", "));
  say(c.pops===1 && c.popFirst && c.wrote===c.before && !c.wroteNew, "the pop first, then written back only what the game set before the push, not what it borrowed after", `${c.pops} pops, ${c.wrote} writes for ${c.before}`);
  say(c.stray===0, "and the pop still puts back what the Lab never touched", `address 41 came back to ${c.stray}`);
  const b=run("plain");
  say(b.probed && !b.pushPop, "an older minichord says nothing, and isn't used that way, though the game wrote meanwhile", b.err||`pushPop ${b.pushPop}`);
  say(b.pops===0 && b.wrote===b.borrowed && b.wrote>0, "there, no pop: every borrowed setting is written back as before", `${b.pops} pops, ${b.wrote} writes for ${b.borrowed} borrowed`);
  say(b.wrong && !b.wrong.length, "and each is back as it was", (b.wrong||[]).join(", "));
  say(b.stray===77, "and what the Lab never touched is left as it is", `address 41 still ${b.stray}`);
  console.log(bad?`FAILED ${bad} of ${n}`:`ok ${n}`); process.exit(bad?1:0);
}
