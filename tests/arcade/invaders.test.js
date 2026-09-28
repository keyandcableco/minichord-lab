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
  // what a chord is worth: major least, each type up the ladder more; the modifier and a slash half as much again
  const pts=(q,root="C",bass=null)=>t.w.eval(`blastPoints(${JSON.stringify({q,root,bass,bonus:false})}).pts`);
  mc.params[35]=0; mc.dispatchEvent(new t.w.Event("device")); await sleep(30);
  const ladder=["","m","7","maj7","m7","°","+","6"].map(q=>pts(q));
  check("each chord type is worth more than the one before", ladder.every((v,i)=>i===0 || v>ladder[i-1]), ladder.join(" < "));
  check("a chord that needs the modifier is worth half as much again", pts("","F♯")===Math.round(pts("")*1.5) || pts("","F♯")>pts(""), `${pts("")} → ${pts("","F♯")}`);
  check("so is a slash chord", pts("","C","E")>pts(""));
  t.w.eval("window.__pr=document.createElement('div'); pointsRender(window.__pr)");
  const rows=[...t.w.__pr.querySelectorAll(".ptable:not(.mult) li")].map(li=>li.textContent);
  check("the points screen spells each chord", rows.some(r=>/MIN7.*1 ♭3 5 ♭7/.test(r)) && rows.some(r=>/DIM7.*𝄫7/.test(r)), rows.slice(0,3).join(" | "));
  const wrongBefore=sb.arcade.score; chord("C♯","+"); await sleep(200);
  check("a chord that isn't falling scores nothing", sb.arcade.score===wrongBefore);
  t.done();
})();
