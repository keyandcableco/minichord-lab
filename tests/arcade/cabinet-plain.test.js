// Full screen on old graphics: the light mode is judged by time, long frames counted, never by a fast
// machine or a tab coming back. In full screen on AUTO its first step is the plain cabinet (no CRT,
// square, black, still), remembered for this screen so the next full screen starts plain; still slow,
// the field goes light too. FULL SCREEN in the settings: CABINET never goes plain, PLAIN always is,
// AUTO again forgets the screen. The player's own CRT choice can't bring the scanlines back into a
// plain cabinet, and leaving puts the field back as the player had it.
const t=require("./harness").load("chord-breakout");
(async()=>{
  const {w, d, sleep, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(0);
  w.eval("cancelAnimationFrame(blast.raf)"); await sleep(50);           // the game's own frames stopped: these are fed by hand
  let now=w.performance.now()+100000;
  const frames=(n, gap)=>{ for(let i=0;i<n;i++){ now+=gap; w.eval(`fxDraw(${now}, ${Math.min(.1,gap/1000)})`); } };
  const cab=()=>d.querySelector(".fscab"), plain=()=>!!(cab() && cab().classList.contains("plain"));
  // in the page: the light mode
  frames(300, 16.7);
  check("a fast machine never goes light", !a.fx.light);
  frames(60, 16.7); now+=5000; w.eval(`fxDraw(${now}, .1)`); frames(30, 16.7);
  check("a tab coming back after a while doesn't count", !a.fx.light);
  frames(10, 80);
  check("a second of slow frames isn't enough", !a.fx.light);
  frames(30, 250);
  check("long frames, a quarter of a second each, turn it on within a few seconds", a.fx.light && a.field.classList.contains("lowfx"));
  // full screen, AUTO
  w.eval("toggleFull(blast.field)"); await sleep(30);
  check("full screen judges afresh, and starts as the full cabinet", !a.fx.light && !plain() && a.field.classList.contains("crt") && w.eval("fsMode()")==="auto");
  frames(12, 250);                                                     // three seconds: past the two it takes, short of two more
  check("slow in full screen: the plain cabinet first, the CRT gone", plain() && !a.field.classList.contains("crt") && !a.fx.light);
  check("and this screen is remembered", w.eval("!!saved.fsSlow[fsScreenKey()]"));
  frames(30, 250);
  check("still slow: the field goes light too", a.fx.light && plain());
  w.eval("saved.crt=true; crtSync()");
  check("the player's own CRT choice doesn't bring the scanlines back into it", !a.field.classList.contains("crt"));
  w.eval("fsExit()"); await sleep(30);
  check("leaving puts the field back as the player has it, not light", !cab() && a.field.classList.contains("crt") && !a.fx.light);
  w.eval("saved.crt=false; crtSync(); toggleFull(blast.field)"); await sleep(30);
  check("next time, this screen starts plain straight away", plain() && !a.field.classList.contains("crt"));
  // the setting
  const dlg=w.eval("arcadeSettings()"), row=()=>dlg.querySelector('.opt[data-opt="full"]'), shown=()=>row().querySelector(".ov b").textContent;
  const pick=name=>{ for(let i=0;i<3 && shown()!==name;i++) row().click(); };
  check("FULL SCREEN is in the arcade's settings, on AUTO", !!row() && /FULL SCREEN/.test(row().textContent) && shown()==="AUTO");
  pick("CABINET");
  check("CABINET puts the full one back at once", !plain() && a.field.classList.contains("crt"));
  frames(30, 250);
  check("and never goes plain: only the field goes light", !plain() && a.fx.light);
  pick("PLAIN");
  check("PLAIN is plain", plain());
  pick("AUTO");
  check("AUTO again forgets this screen, the full cabinet back to try", !plain() && !w.eval("!!saved.fsSlow[fsScreenKey()]"));
  w.eval("fsExit()"); await sleep(30);
  check("all of it goes when full screen does", !cab() && !d.querySelector(".plain"));
  t.done();
})();
