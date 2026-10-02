// Every game's title screen moves on by itself (title, rules, points …), before and after its demo:
// nothing keeps rebuilding it back to the start.
const {spawnSync}=require("child_process");
const SLUGS=["invaders","harp-command","chord-snake","chord-asteroids","chord-stack","chord-breakout","fifths-defender","chopper-rescue","key-fleet","chord-sweeper","between-the-frets","sight-line","chord-hunt","key-racer"];
if(process.argv[2]){
  const t=require("./harness").load(process.argv[2]);
  (async()=>{
    await t.sleep(150); t.connect(); await t.sleep(100);
    t.key("KeyJ"); await t.sleep(30); t.overlay().querySelector("button.howto").click(); await t.sleep(600);
    const skip=t.d.querySelector(".field .demo .demoskip"); if(skip) skip.click(); await t.sleep(100);
    let moved=false; for(let i=0;i<30 && !moved;i++){ await t.sleep(200); const ov=t.overlay(); moved=!!ov && ov.dataset.stage && ov.dataset.stage!=="title"; }
    console.log(JSON.stringify({moved})); process.exit(0);
  })();
} else {
  let bad=0;
  for(const s of SLUGS){
    const r=spawnSync(process.execPath,[__filename,s],{encoding:"utf8",timeout:40000});
    let j={}; try{ j=JSON.parse((r.stdout||"").trim().split("\\n").pop()); }catch(e){}
    if(!j.moved) bad++;
    console.log(`${j.moved?"  ✓":"  ✗"} ${s}: after its demo, the title screen moves on by itself`);
  }
  console.log(bad?`FAILED ${bad} of ${SLUGS.length}`:`ok ${SLUGS.length}`); process.exit(bad?1:0);
}
