// What a demo presses is lit on the on-screen minichord: Fifths Defender's knob turns as it aims,
// Chord Stack's d-pad and the buttons of the chord it plays light, Chord Sweeper's d-pad as the cursor
// walks.
const {spawnSync}=require("child_process");
const CASES={
  "fifths-defender":{secs:7, test:`[...d.querySelectorAll(".field .helper .knob")].some(k=>k.classList.contains("lit") && k.style.getPropertyValue("--turn"))`},
  "chord-stack":{secs:10, test:`!!d.querySelector(".field .helper .grid .cell.lit") || window.__sawLit`},
  "chord-sweeper":{secs:6, test:`window.__sawZone`},
  "chord-snake":{secs:24, storage:{saved:{chordMatrix:"alternate"}}, test:`d.querySelectorAll(".snseg.ready").length>=3`},
  "between-the-frets":{secs:16, test:`!!d.querySelector(".field .helper .mod.lit") || window.__sawMod`},
};
if(process.argv[2]){
  const slug=process.argv[2], C=CASES[slug], t=require("./harness").load(slug, C.storage ? {storage:C.storage} : undefined);
  (async()=>{
    await t.sleep(150); t.connect(); await t.sleep(100);
    t.key("KeyJ"); await t.sleep(30); t.overlay().querySelector("button.howto").click();
    // note anything lit along the way: a button or a d-pad zone
    const d=t.d, w=t.w;
    const iv=setInterval(()=>{ if(d.querySelector(".field .helper .grid .cell.lit")) w.__sawLit=true; if(d.querySelector(".field .helper .hbpad .hit, .field .helper .kdot.hit")) w.__sawZone=true; if(d.querySelector(".field .helper .mod.lit")) w.__sawMod=true; }, 40);
    let ok=false; for(let i=0;i<C.secs*10 && !ok;i++){ await t.sleep(100); ok=!!w.eval(C.test.replace(/\bd\./g,"document.")); }
    clearInterval(iv); console.log(JSON.stringify({ok})); process.exit(0);
  })();
} else {
  let bad=0;
  const say={"fifths-defender":"Fifths Defender's demo turns the knob as it aims", "chord-stack":"Chord Stack's demo lights the buttons of the chord it plays", "chord-sweeper":"Chord Sweeper's demo lights the d-pad as the cursor walks",
    "chord-snake":"Chord Snake's demo glows E G♯ B as E major, even with the alternate chords chosen", "between-the-frets":"Between the Frets' demo lights the modifier for the quarter-tone"};
  for(const s of Object.keys(CASES)){
    const r=spawnSync(process.execPath,[__filename,s],{encoding:"utf8",timeout:60000});
    let j={}; try{ j=JSON.parse((r.stdout||"").trim().split("\\n").pop()); }catch(e){}
    if(!j.ok) bad++;
    console.log(`${j.ok?"  ✓":"  ✗"} ${say[s]}${j.ok?"":"  "+(r.stderr||"").slice(0,300)}`);
  }
  const n=Object.keys(CASES).length; console.log(bad?`FAILED ${bad} of ${n}`:`ok ${n}`); process.exit(bad?1:0);
}
