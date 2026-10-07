// The arcade's preset: a game takes glide off (a gliding chord can't be read until it lands), stops
// chords retriggering and turns voice leading off, always; it takes vibrato and delay off too unless the player keeps their own
// sound; and everything is given back when they're done.
const {spawnSync}=require("child_process");
if(process.argv[2]){
  const mine=process.argv[2]==="mine";
  const t=require("./harness").load("invaders",{storage:{saved:{arcadeSound:mine?"mine":"clean"}}});
  (async()=>{
    const {w, mc, sleep}=t;
    await sleep(150);
    t.connect({extra:{199:300, 21:1, 111:1, 175:40, 76:30, 183:50}});  // a preset with glide, retrigger, voice leading, vibrato and delay
    await sleep(120);
    await t.start(0); await sleep(150);
    const during={glide:mc.params[199], retrig:mc.params[21], vl:mc.params[111], vib:mc.params[175], harpVib:mc.params[76], delay:mc.params[183]};
    w.eval("restoreAll()"); await sleep(100);
    const after={glide:mc.params[199], retrig:mc.params[21], vl:mc.params[111], vib:mc.params[175], harpVib:mc.params[76], delay:mc.params[183]};
    console.log(JSON.stringify({during, after})); process.exit(0);
  })();
} else {
  let bad=0; const say=(ok,txt,det)=>{ if(!ok) bad++; console.log(`${ok?"  ✓":"  ✗"} ${txt}${det?`  (${det})`:""}`); };
  const run=m=>{ const r=spawnSync(process.execPath,[__filename,m],{encoding:"utf8",timeout:60000}); try{ return JSON.parse((r.stdout||"").trim().split("\n").pop()); }catch(e){ return {err:(r.stderr||"").slice(0,200)}; } };
  const c=run("clean"), m=run("mine");
  say(c.during && c.during.glide===0 && c.during.retrig===0 && c.during.vl===0, "a game takes glide off, stops chords retriggering and turns voice leading off", c.err||JSON.stringify(c.during));
  say(c.during && c.during.vib===0 && c.during.harpVib===0 && c.during.delay===0, "and, for a clean sound, vibrato and delay", c.err||JSON.stringify(c.during));
  say(m.during && m.during.glide===0 && m.during.vl===0 && m.during.vib===40 && m.during.delay===50, "keeping my preset's sound: glide and voice leading still off, the rest left alone", m.err||JSON.stringify(m.during));
  say(c.after && c.after.glide===300 && c.after.retrig===1 && c.after.vl===1 && c.after.vib===40 && c.after.harpVib===30 && c.after.delay===50, "everything is given back afterwards", c.err||JSON.stringify(c.after));
  console.log(bad?`FAILED ${bad} of 4`:"ok 4"); process.exit(bad?1:0);
}
