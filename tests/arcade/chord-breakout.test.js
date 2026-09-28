// Chord Breakout: the knob steers the paddle (and only the chosen knob, without a wobble); the ball
// cracks bricks and their chords break them; the ball bounces true off a brick's face.
const t=require("./harness").load("chord-breakout");
(async()=>{
  const {sb, sleep, knob, chord, check, d, w}=t;
  await sleep(150); t.connect(); await sleep(100);
  check("the game switches the knobs on", t.mc.params[238]===1);
  const a=await t.start(0);
  knob(0); await sleep(250); const xl=a.paddle.x; knob(127); await sleep(250);
  check("the mod knob moves the paddle", a.paddle.x>xl+300, `${Math.round(xl)} → ${Math.round(a.paddle.x)}`);
  const tg=a.paddle.target; knob(10,20); await sleep(30);
  check("another knob doesn't", a.paddle.target===tg);
  knob(70); await sleep(20); const t2=a.paddle.target; knob(71); await sleep(20);   // it came down to 70: a step back up is a wobble
  check("a one-step wobble back holds", a.paddle.target===t2);
  const t3=a.paddle.target; d.querySelector(".field.arcade").dispatchEvent(new w.MouseEvent("pointermove",{clientX:5,bubbles:true})); await sleep(20);
  check("the mouse doesn't fight the knob", a.paddle.target===t3);
  // the physics: straight up into a brick's underside comes straight back down
  const maxr=Math.max(...a.bricks.map(b=>b.r)), k=a.bricks.find(b=>b.alive && b.r===maxr && b.c===4) || a.bricks.find(b=>b.alive);
  a.bricks.forEach(b=>b.cracked=false); a.ball.stuck=false;
  Object.assign(a.ball,{x:k.x+k.w/2, y:k.y+k.h+40, vx:0, vy:-300, stuck:false, speed:300}); await sleep(160);
  check("the ball bounces straight back off a brick's face", a.ball.vy>0 && Math.abs(a.ball.vx)<1, `vx ${Math.round(a.ball.vx)} vy ${Math.round(a.ball.vy)}`);
  let broken=0;
  for(let i=0;i<500 && a.phase==="play" && broken<4;i++){ await sleep(20);
    if(a.ball) knob(Math.max(0,Math.min(127,Math.round((a.ball.x-a.paddle.w/2)/(a.W-a.paddle.w)*127))));
    const k=a.bricks.find(b=>b.alive && b.cracked); if(k){ const n=a.bricks.filter(b=>!b.alive).length; chord(k.rootPc, k.q); await sleep(30); if(a.bricks.filter(b=>!b.alive).length>n) broken++; } }
  check("a cracked brick's chord breaks it", broken>=2, `${broken} broken`);
  sb.restoreAll();
  check("leaving switches the knobs back off", t.mc.params[238]===0);
  t.done();
})();
