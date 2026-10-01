// Chord Breakout's ball and paddle: the paddle is what's drawn, outline and glow included, and solid:
// a ball on its very edge is saved, one the paddle swings into from the side above its middle is sent
// back up, one below its middle only knocked aside; a ball off the paddle's middle never goes straight
// up; the paddle's swing bends the bounce; each return is a little quicker, up to a quarter; a ball
// at the seam between two bricks bounces off them as off one face; a wall cleared on the last level
// makes the next ball faster.
const t=require("./harness").load("chord-breakout");
(async()=>{
  const {w, sleep, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(0);
  const p=a.paddle, R=w.eval("BO_R"), RING=w.eval("BO_RING");
  const hold=()=>{ p.target=p.x; p.vx=0; };
  // put the ball somewhere, moving, and run it a little
  const put=(o)=>{ Object.assign(a.ball, {stuck:false, caught:false, speed:300, base:300}, o); };
  p.x=300; hold(); await sleep(60);
  check("the paddle is drawn exactly its width", p.w===parseFloat(a.padEl.style.width), `${p.w}`);
  // the very edge: just past the paddle's end, within its outline
  put({x:p.x+p.w+RING+R*.5, y:a.padY-40, vx:0, vy:300}); await sleep(220);
  check("a ball on the paddle's very edge is saved, and sent out steeply", a.ball.vy<0 && a.ball.vx>0 && Math.abs(a.ball.vx)>Math.abs(a.ball.vy)*.8, `vx ${Math.round(a.ball.vx)} vy ${Math.round(a.ball.vy)}`);
  // the middle: never straight up
  p.x=300; hold(); await sleep(30);
  put({x:p.x+p.w/2, y:a.padY-40, vx:0, vy:300}); await sleep(220);
  check("a ball off the dead middle doesn't go straight up", a.ball.vy<0 && Math.abs(a.ball.vx)>=Math.sin(w.eval("BO_MINANG"))*a.ball.speed*.99, `vx ${Math.round(a.ball.vx)}`);
  // swung into from the side: the paddle comes to a ball already level with its top
  p.x=300; hold(); await sleep(30);
  put({x:p.x+p.w+RING+R+6, y:a.padY+1, vx:0, vy:60, speed:60, base:60}); p.target=p.x+40; await sleep(120);
  check("swung into a ball level with its top, the paddle sends it back up", a.ball.vy<0, `vy ${Math.round(a.ball.vy)}`);
  // below the middle: knocked aside, still falling
  p.x=300; hold(); await sleep(30);
  put({x:p.x-RING-R+3, y:a.padY+12, vx:20, vy:200}); await sleep(30);
  check("a ball below the paddle's middle is only knocked aside", a.ball.vy>0 && a.ball.vx<0, `vx ${Math.round(a.ball.vx)} vy ${Math.round(a.ball.vy)}`);
  // the swing: the same spot, the paddle moving right, sends it further right
  const angle=async vx=>{ p.x=300; hold(); await sleep(20); put({x:p.x+p.w*.6, y:a.padY-12, vx:0, vy:300}); p.vx=vx; w.eval("boPaddleBounce(blast.ball)"); return Math.atan2(a.ball.vx,-a.ball.vy); };
  const still=await angle(0), swung=await angle(600);
  check("the paddle's swing bends the bounce", swung>still+.1, `${still.toFixed(2)} → ${swung.toFixed(2)}`);
  // the quickening
  put({speed:300, base:300}); for(let i=0;i<40;i++) w.eval("boPaddleBounce(blast.ball)");
  check("each return is a little quicker, never more than a quarter", a.ball.speed>300 && a.ball.speed<=375.01, `${Math.round(a.ball.speed)}`);
  // the seam between two bricks, from below, at an angle: off them as off one face
  const row=Math.max(...a.bricks.map(b=>b.r)), k1=a.bricks.find(b=>b.r===row && b.c===3), k2=a.bricks.find(b=>b.r===row && b.c===4);
  k1.alive=k2.alive=true; a.bricks.forEach(b=>{ b.cracked=false; });
  const seam=(k1.x+k1.w+k2.x)/2; p.x=0; hold();
  put({x:seam-10, y:k1.y+k1.h+R+20, vx:Math.sin(.4)*300, vy:-Math.cos(.4)*300}); await sleep(140);
  check("at the seam between two bricks the ball bounces as off one face", a.ball.vy>0 && a.ball.vx>0, `vx ${Math.round(a.ball.vx)} vy ${Math.round(a.ball.vy)}`);
  check("and only one of them is cracked", [k1,k2].filter(b=>b.cracked).length===1);
  // a wall cleared without a new level: the next ball is faster
  w.eval("blast.level=BO_LEVELS.length-1; blast.faster=1"); const sp0=w.eval("(300/speedMul())*Math.pow(1.05,blast.level)");
  a.bricks.forEach(b=>{ if(b.alive){ b.alive=false; b.el.remove(); } });
  const last=a.bricks[0]; last.alive=true; last.cracked=true; last.power=false; last.cap=null; w.eval("boBreak(blast.bricks[0])");
  for(let i=0;i<30 && a.bricks.filter(b=>b.alive).length===0;i++) await sleep(100);
  check("a wall cleared on the last level: the next ball really is faster", a.ball.speed>sp0*1.05, `${Math.round(sp0)} → ${Math.round(a.ball.speed)}`);
  t.done();
})();
