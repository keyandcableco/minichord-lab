// Harp Command's demo: when it shows a key (D major), the cannons' labels read that key's scale and
// stay that way while the minichord keeps reporting in, rather than flicking back to chromatic; and
// its multishot scene fires every cannon at once.
const t=require("./harness").load("harp-command");
(async()=>{
  const {w, d, mc, sleep, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  t.key("KeyJ"); await sleep(30);
  t.overlay().querySelector("button.howto").click();
  const labels=()=>[...d.querySelectorAll(".field .strings span")].map(s=>s.textContent).join(" ");
  for(let i=0;i<250 && !/D MAJOR/.test((d.querySelector(".field .demo .democap")||{}).textContent||""); i++) await sleep(100);
  await sleep(200);
  const first=labels();
  check("the demo's KEYS scene labels the strings in D major", /^D E F♯ G A B C♯ D/.test(first), first);
  // the minichord reports in, many times over, as it does in a browser
  let flicked=0;
  for(let i=0;i<20;i++){ mc.dispatchEvent(new w.Event("device")); await sleep(40); if(labels()!==first) flicked++; }
  check("and they stay D major while the minichord reports in", flicked===0 && w.eval("blast.wave.kind")==="scale", `${flicked} of 20 flicked`);
  w.eval("arcadeRelayout()"); await sleep(20);
  check("a resize keeps them too", labels()===first);
  let sprayed=false;
  for(let i=0;i<200 && !sprayed;i++){ await sleep(100); sprayed=/MULTISHOT/.test((d.querySelector(".field .banner")||d.body).textContent) || w.eval("blast.cannons.filter(c=>performance.now()-c.fired<300).length")>=4; }
  check("the demo shows MULTISHOT firing every cannon", sprayed);
  t.done();
})();
