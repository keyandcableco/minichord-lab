// Every game's demo starts from HOW TO PLAY, shows its captions as it plays, shows the on-screen
// minichord (beginner mode off), and SKIP brings the title screen back, the minichord gone again.
const {spawnSync}=require("child_process");
const SLUGS=["invaders","harp-command","chord-snake","chord-asteroids","chord-stack","chord-breakout","fifths-defender","chopper-rescue","key-fleet","chord-sweeper","between-the-frets","sight-line","chord-hunt","key-racer","chord-chomp","chord-burger","dominant-kong","sus-bros"];
if(process.argv[2]){
  const t=require("./harness").load(process.argv[2]);
  (async()=>{
    const errors=[]; t.w.addEventListener("error", e=>errors.push(e.message));
    await t.sleep(150); t.connect(); await t.sleep(100);
    t.key("KeyJ"); await t.sleep(30);
    t.overlay().querySelector("button.howto").click();
    const caps=new Set();
    for(let i=0;i<16;i++){ await t.sleep(250); const c=t.d.querySelector(".field .demo .democap"); if(c && c.textContent) caps.add(c.textContent); }
    const demo=!!t.d.querySelector(".field .demo");
    const helper = process.argv[2]==="invaders" ? t.d.querySelectorAll(".field .demo .board .knob").length===3
      : process.argv[2]==="harp-command" ? !!t.d.querySelector(".field .helper") : t.d.querySelectorAll(".field .helper .knob").length===3;
    const ship = process.argv[2]!=="invaders" || Math.abs((t.w.eval("blast.shipF")??.5)-t.w.eval("DEMO_SHIP"))<.05;   // Invaders' ship, off to the left
    const skip=t.d.querySelector(".field .demo .demoskip"); if(skip) skip.click(); await t.sleep(200);
    const ov=t.overlay(), gone=!t.d.querySelector(".field .helper");
    console.log(JSON.stringify({demo, ship, helper, gone, captions:caps.size, back:!!ov && !ov.hidden && !t.d.querySelector(".field .demo"), errors}));
    process.exit(0);
  })();
} else {
  let bad=0;
  for(const s of SLUGS){
    const r=spawnSync(process.execPath,[__filename,s],{encoding:"utf8",timeout:60000});
    let j={}; try{ j=JSON.parse((r.stdout||"").trim().split("\n").pop()); }catch(e){}
    const ok=j.demo && j.ship && j.helper && j.gone && j.captions>=1 && j.back && !(j.errors||[]).length;
    if(!ok) bad++;
    console.log(`${ok?"  ✓":"  ✗"} ${s}: ${j.captions||0} caption${j.captions===1?"":"s"} in four seconds, the minichord shown, skip back to the title${ok?"":"  "+JSON.stringify(j)+(r.stderr||"").slice(0,300)}`);
  }
  console.log(bad?`FAILED ${bad} of ${SLUGS.length}`:`ok ${SLUGS.length}`); process.exit(bad?1:0);
}
