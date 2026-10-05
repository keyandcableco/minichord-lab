// Every arcade game opens on its own page in the arcade's dress, with its title loop running, and its
// options screen in two pages: options, then levels.
const {spawnSync}=require("child_process");
const SLUGS=["invaders","harp-command","chord-snake","chord-asteroids","chord-stack","chord-breakout","fifths-defender","chopper-rescue","key-fleet","chord-sweeper","between-the-frets","sight-line","chord-hunt","key-racer","chord-chomp","chord-burger"];
if(process.argv[2]){
  const {load}=require("./harness");
  const t=load(process.argv[2]);
  (async()=>{ await t.sleep(200); t.connect(); await t.sleep(100);
    const ov=t.overlay();
    console.log(JSON.stringify({arcade:t.d.documentElement.classList.contains("arcadepage"), stage:ov&&ov.dataset.stage, title:ov&&ov.querySelector(".cabtitle")&&ov.querySelector(".cabtitle").textContent,
      reset:!!t.d.getElementById("resetBtn"), mute:!!t.d.getElementById("muteBtn"), more:t.d.querySelectorAll(".moregames a").length,
      pages:!!ov.querySelector(".cab-optpage .go") && !!ov.querySelector(".cab-levelpage .levels button") && !ov.querySelector(".cab-optpage > .levels")}));
    process.exit(0); })();
} else {
  let bad=0;
  for(const s of SLUGS){
    const r=spawnSync(process.execPath,[__filename,s],{encoding:"utf8",timeout:30000});
    let j={}; try{ j=JSON.parse((r.stdout||"").trim().split("\n").pop()); }catch(e){}
    const ok=j.arcade && j.stage==="title" && j.title && j.reset && j.mute && j.more===SLUGS.length-1 && j.pages;
    if(!ok) bad++;
    console.log(`${ok?"  ✓":"  ✗"} ${s}: ${j.title||"no title"}${ok?"":"  "+JSON.stringify(j)+(r.stderr||"").slice(0,200)}`);
  }
  console.log(bad?`FAILED ${bad} of ${SLUGS.length}`:`ok ${SLUGS.length}`); process.exit(bad?1:0);
}
