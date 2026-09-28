// Harp Command: plucking the string of a falling note shoots it down; a wrong string freezes the harp.
const t=require("./harness").load("harp-command");
(async()=>{
  const {sb, sleep, note, check}=t;
  await sleep(150); t.connect({key:2, extra:{30:3}}); await sleep(100);
  const a=await t.start(0, {speed:3});
  let hits=0;
  for(let i=0;i<250 && hits<14;i++){ await sleep(120);
    const it=a.items.filter(x=>!x.done).sort((x,y)=>x.t0-y.t0)[0]; if(!it) continue;
    note(it.pc); hits++; await sleep(150); }
  check("plucking falling notes scores", a.score>0 && hits>=10, `${hits} plucked, score ${a.score}`);
  check("no lives lost playing right", a.lives===3, `${a.lives} lives`);
  for(let i=0;i<60 && !a.items.some(x=>!x.done);i++) await sleep(100);
  const falling=new Set(a.items.filter(x=>!x.done).map(x=>x.pc)), wrong=[...Array(12).keys()].find(pc=>!falling.has(pc));
  note(wrong); await sleep(50);
  check("a wrong string freezes the harp", /NOT FALLING|FROZEN/.test(t.heard()), t.heard());
  sb.restoreAll();
  check("leaving gives back the key and transpose", t.mc.params[35]===2 && t.mc.params[30]===3, `35=${t.mc.params[35]} 30=${t.mc.params[30]}`);
  t.done();
})();
