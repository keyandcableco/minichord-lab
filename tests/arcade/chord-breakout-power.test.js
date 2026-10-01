// Chord Breakout's capsules: a brick holding one shows its sign, and broken by its chord it drops the
// capsule, which the paddle catches. CRESCENDO widens the paddle from its middle and narrows it back;
// RITARDANDO slows the ball; DIVISI splits it in three, and only the last one past costs a life;
// FERMATA catches the ball and holds it till a pluck lets it go (or a moment passes); a capsule that
// falls past costs nothing; losing a life ends a power; the bonus round's pause moves a power's end
// on; the title screen's POWER-UPS page and POINTS page name them.
const t=require("./harness").load("chord-breakout");
(async()=>{
  const {w, d, sleep, chord, note, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(0, {speed:0});
  const p=a.paddle, now=()=>w.performance.now();
  const park=()=>{ Object.assign(a.ball,{x:40, y:200, vx:0, vy:-80, stuck:false, caught:false, speed:80, base:80}); };   // the ball out of the way, slowly
  const drop=k=>{ const b=a.bricks.find(x=>x.alive && !x.power && x.r===0); b.cap=k; b.cracked=true; b.el.classList.add("cracked"); return b; };
  // a capsule brick
  park(); const kb=drop("crescendo");
  w.eval(`(()=>{ const b=blast.bricks.find(x=>x.cap==="crescendo" && x.alive); b.el.classList.add("capbrick","pu-crescendo"); })()`);
  chord(kb.rootPc, kb.q); await sleep(60);
  check("a capsule brick broken by its chord drops its capsule", !kb.alive && a.caps.length===1 && a.caps[0].k==="crescendo" && !!d.querySelector(".bocap.pu-crescendo"));
  const cx=a.caps[0].x; p.target=cx-p.w/2;
  for(let i=0;i<60 && a.caps.length;i++){ p.target=cx-p.w/2; await sleep(100); }
  check("caught on the paddle, it gives its power", w.eval("boPowerOn('crescendo')") && /CRESCENDO \d+/.test(a.hud.textContent), a.hud.textContent);
  w.eval("boPowersClear(); blast.paddle.x=blast.paddle.target=300; blast.boPower={k:'crescendo', powerUntil:performance.now()+8000}");
  const mid0=p.x+p.w/2; await sleep(600);
  check("CRESCENDO: the paddle half as wide again, grown from its middle", Math.abs(p.w-p.base*1.5)<1 && Math.abs((p.x+p.w/2)-mid0)<2, `${Math.round(p.w)}`);
  a.boPower.powerUntil=now()-1; await sleep(700);
  check("when it's over the paddle narrows back", Math.abs(p.w-p.base)<1 && !a.boPower);
  // a capsule that falls past
  park(); const lives=a.lives; w.eval(`(()=>{ const k=blast.bricks.find(x=>x.alive && !x.power); k.cap="ritard"; boCapDrop(k); blast.caps[0].x=blast.paddle.x>400?60:840; blast.caps[0].vy=900; })()`);
  await sleep(700);
  check("a capsule that falls past is just gone", !a.caps.length && !a.boPower && a.lives===lives);
  // RITARDANDO
  park(); a.ball.vy=-100; a.ball.speed=100; a.ball.base=100; a.ball.y=300; a.ball.x=450;
  w.eval("blast.boPower={k:'ritard', powerUntil:performance.now()+5000}");
  const y0=a.ball.y; await sleep(500); const slow=y0-a.ball.y;
  a.boPower=null; a.ball.y=300; await sleep(500); const fast=300-a.ball.y;
  check("RITARDANDO: the ball runs at two thirds speed", slow<fast*.8 && slow>fast*.5, `${Math.round(slow)} against ${Math.round(fast)}`);
  // DIVISI
  park(); Object.assign(a.ball,{x:450, y:250, vx:0, vy:-120, speed:120, base:120});
  w.eval("boCapTake({k:'divisi', x:450, y:300, el:document.createElement('div')})"); await sleep(50);
  check("DIVISI: the ball splits in three", a.balls.length===3 && d.querySelectorAll(".boball").length===3 && new Set(a.balls.map(b=>Math.round(b.vx))).size===3);
  const l0=a.lives; a.balls[1].y=a.H+30; a.balls[1].vy=200; a.balls[0].y=a.H+30; a.balls[0].vy=200; await sleep(80);
  check("losing two of them costs no life", a.balls.length===1 && a.lives===l0 && d.querySelectorAll(".boball").length===1 && a.ball.el===a.ballEl);
  a.ball.y=a.H+30; a.ball.vy=200; a.ball.stuck=false; await sleep(80);
  check("the last one past costs a life, and a new ball is served", a.lives===l0-1 && a.balls.length===1 && a.ball.stuck);
  // FERMATA
  w.eval("blast.serveAt=0"); await sleep(50);
  w.eval("blast.boPower={k:'fermata', powerUntil:performance.now()+8000}");
  p.target=p.x=300; p.vx=0; Object.assign(a.ball,{stuck:false, caught:false, x:p.x+p.w*.75, y:a.padY-60, vx:0, vy:300, speed:300, base:300}); await sleep(300);
  check("FERMATA: the paddle catches the ball and holds it where it landed", a.ball.caught && a.ball.stuck && Math.abs(a.ball.hold-p.w*.75)<3 && a.ballEl.classList.contains("caught"));
  p.target=500; await sleep(300);
  check("it moves with the paddle", Math.abs(a.ball.x-(p.x+a.ball.hold))<1);
  note(4); await sleep(60);
  check("a pluck lets it go, off to the side it was held on", !a.ball.caught && a.ball.vy<0 && a.ball.vx>0);
  p.target=p.x; Object.assign(a.ball,{x:p.x+p.w/2, y:a.padY-60, vx:0, vy:300}); await sleep(300);
  a.ball.releaseAt=now()+200; await sleep(500);
  check("and it goes by itself after a moment", a.ball.caught===false && !a.ball.stuck);
  Object.assign(a.ball,{x:p.x+p.w/2, y:a.padY-60, vx:0, vy:300}); await sleep(300);
  a.boPower.powerUntil=now()-1; await sleep(100);
  check("when FERMATA ends, a held ball goes", !a.ball.caught && !a.boPower);
  // losing a life ends a power; the bonus round's pause moves its end on
  w.eval("blast.boPower={k:'crescendo', powerUntil:performance.now()+8000}"); w.eval("boLost(100)"); await sleep(30);
  check("losing a life ends a power", !a.boPower);
  w.eval("blast.boPower={k:'ritard', powerUntil:performance.now()+5000}"); const end=a.boPower.powerUntil; w.eval("bonusShift(blast, 3000)");
  check("a bonus round's pause moves a power's end on", Math.round(a.boPower.powerUntil-end)===3000);
  // walls deal them
  const n=w.eval("(()=>{ let n=0; for(let i=0;i<20;i++){ boWall(); n+=blast.bricks.filter(b=>b.cap).length; } return n; })()");
  check("walls hold capsules now and then, each brick marked with its sign", n>10 && d.querySelectorAll(".bobrick.capbrick .puicon").length===a.bricks.filter(b=>b.cap).length, `${n} in 20 walls`);
  // the title screen
  w.eval("blast.phase='menu'; boPowersClear(); boMenu(); cabStage(blast.overlay,'powers')"); await sleep(50);
  check("the POWER-UPS page lists the arpeggio brick and the four capsules, as they look", d.querySelectorAll(".cab-powers .pwtable li").length===5 && /DIVISI/.test(d.querySelector(".cab-powers").textContent) && !!d.querySelector(".cab-powers .bocap.pu-fermata") && /CAPSULE/.test(d.querySelector(".cab-powers").textContent));
  check("and the POINTS page names them, and the coda", w.eval("pointsFor('breakout').some(r=>/RITARDANDO/.test(r[1])) && pointsFor('breakout').some(r=>r[0]==='CODA')"));
  t.done();
})();
