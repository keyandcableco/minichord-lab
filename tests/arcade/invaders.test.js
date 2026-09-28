// Chord Invaders: playing a falling chord shoots it; setting the key a key bar asks for scores.
const t=require("./harness").load("invaders");
(async()=>{
  const {d, mc, sb, sleep, chord, check}=t;
  await sleep(150); t.connect({key:0}); await sleep(100);
  await t.start(2, {speed:4});
  let hits=0;
  for(let i=0;i<150 && hits<8;i++){ await sleep(120);
    const el=[...d.querySelectorAll(".field .fchord")].find(e=>!e.classList.contains("gone") && !e.classList.contains("miss")); if(!el) continue;
    const m=el.textContent.replace("★","").match(/^([A-G][♯♭]?)([^/]*)/); if(!m || !t.IV[m[2]]) continue;
    const before=sb.arcade.score; chord(m[1], m[2]); await sleep(250); if(sb.arcade.score>before) hits++; }
  check("playing a falling chord shoots it", hits>=5, `${hits} scored`);
  await sleep(2600);
  const kb=d.querySelector(".field .fkey");
  check("a key bar falls", !!kb);
  if(kb){
    const KEYN={C:0,G:1,D:2,A:3,E:4,B:5,F:6,"B♭":7,"E♭":8,"A♭":9,"D♭":10,"G♭":11,"F♯":12};
    const name=kb.textContent.match(/KEY OF (\S+) MAJOR/)[1], before=sb.arcade.score;
    mc.params[35]=KEYN[name]; mc.dispatchEvent(new t.w.Event("device")); await sleep(80);
    check("setting its key scores", sb.arcade.score>before, `${before} → ${sb.arcade.score}`);
  }
  const wrongBefore=sb.arcade.score; chord("C♯","+"); await sleep(200);
  check("a chord that isn't falling scores nothing", sb.arcade.score===wrongBefore);
  t.done();
})();
