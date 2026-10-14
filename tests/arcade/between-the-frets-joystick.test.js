// Between the Frets on the joystick plate: the stick stands in for the chord rows: pushed up, the top
// row's answer (¼ SHARP, or MAJOR); A, the middle's (IN TUNE, MINOR); pushed down, the bottom's (¼ FLAT,
// NEUTRAL); a push counts once. Riffs keep the columns. B replays. Without the plate, nothing.
const t=require("./harness").load("between-the-frets");
const P=require("./dpad-plate").plateOf(t);
(async()=>{
  const {w, sb, sleep, check}=t;
  const E=s=>w.eval(s);
  await sleep(150); P.connect(); await sleep(100);
  const a=await t.start(0); await sleep(1800);
  const ask=(kind, answer)=>{ E(`blast.q=frQuestion("${kind}")`); Object.assign(a.q, {step:"answer", at:performance.now()-1000, limit:1e9, replays:0, answer}); if(answer===0) a.q.off=50; if(answer===2) a.q.off=-50; if(answer===1) a.q.off=0; };
  ask("note", 0); const r0=a.right; P.push("up"); await sleep(10);
  check("a note a quarter sharp: the stick up is right", a.right===r0+1, `${a.right-r0}`);
  P.push("rest");
  ask("note", 1); P.press("a"); await sleep(10);
  check("in tune: A is right", a.right===r0+2);
  ask("note", 2); P.push("down"); await sleep(10);
  check("a quarter flat: the stick down is right", a.right===r0+3);
  P.push("rest");
  const l0=a.lives; ask("note", 0); P.push("down"); await sleep(10);
  check("the wrong way loses a life", a.lives===l0-1 && a.q.step==="done");
  P.push("rest"); await sleep(3400);
  ask("neutral", 2); const r1=a.right; P.push("down"); await sleep(10);
  check("the neutral third: down is NEUTRAL", a.right===r1+1);
  P.push("rest");
  ask("note", 0); const r2=a.right; P.push("up"); P.stick(.2,.95); P.stick(0,.6); await sleep(10);
  check("a push counts once", a.right===r2+1 && a.q.step!=="answer" || a.right===r2+1);
  P.push("rest");
  ask("riff", 0); const r3=a.right, l3=a.lives; P.push("up"); P.push("rest"); P.press("a"); await sleep(10);
  check("a riff keeps the columns: the stick and A answer nothing", a.right===r3 && a.lives===l3 && a.q.step==="answer");
  const rp=a.q.replays; P.press("b"); await sleep(10);
  check("B replays", a.q.replays===rp+1);
  check("the legend shows the stick beside the rows", (()=>{ ask("note",0); E("frAsk()"); return / OR UP: /.test(a.stageEl.querySelector(".frrows").textContent); })());
  check("the rules say the stick", /THE STICK UP/.test(E("FRMENU_G.rules()")));
  P.connect({on:false}); await sleep(100);
  ask("note", 0); const r4=a.right, l4=a.lives; P.push("up"); P.push("rest"); P.press("a"); P.push("down"); P.push("rest"); await sleep(10);
  check("without the plate the stick and A answer nothing", a.right===r4 && a.lives===l4);
  sb.restoreAll();
  t.done();
})();
