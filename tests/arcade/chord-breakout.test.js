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
  // a cracked brick's chord breaks it: three bricks cracked, each played
  let broken=0;
  for(let n=0;n<3;n++){ const k=a.bricks.find(b=>b.alive && !b.power); if(!k) break; k.cracked=true; k.crackedAt=performance.now(); k.el.classList.add("cracked");
    chord(k.rootPc, k.q); await sleep(40); if(!k.alive) broken++; }
  check("a cracked brick's chord breaks it", broken===3, `${broken} broken`);
  // the power-up: a power brick broken rains its chord's tones; the cannon, steered by the knob, shoots
  // each one when it's under it and its note is plucked; the ball keeps going meanwhile
  const pb=a.bricks.find(b=>b.alive); pb.power=true; pb.cracked=true; pb.el.classList.add("cracked");
  chord(pb.rootPc, pb.q); await sleep(60);
  check("a power brick broken rains its chord's tones, the paddle a cannon", !!a.power && a.power.tones.length>=3 && t.d.querySelector(".bopaddle.cannon"), a.power && a.power.chord);
  { const b0=a.ball && !a.ball.stuck ? [a.ball.x,a.ball.y] : null; await sleep(150);
    check("the ball keeps going while the cannon's out", !a.ball || a.ball.stuck || !b0 || Math.hypot(a.ball.x-b0[0],a.ball.y-b0[1])>2); }
  let shot=0;
  for(const tone of [...a.power.tones]){ const W=a.W-a.paddle.w; knob(Math.max(0,Math.min(127,Math.round((tone.x-a.paddle.w/2)/W*127)))); await sleep(220);
    t.note(tone.pc); await sleep(40); if(tone.gone) shot++; }
  check("steered under each tone, its note shoots it", shot===a.power?.total || shot>=3, `${shot} shot`);
  for(let i=0;i<40 && a.power;i++) await sleep(100);
  check("then the paddle is a paddle again", !a.power && !t.d.querySelector(".bopaddle.cannon"));
  // what bricks are worth: Chord Invaders' ladder
  const w1=t.w.eval("boPoints({q:'',root:'C'})"), w2=t.w.eval("boPoints({q:'m7',root:'C'})"), w3=t.w.eval("boPoints({q:'',root:'F♯'})");
  check("bricks are worth Chord Invaders' points: more for richer chords and the modifier", w2>w1 && w3>w1, `${w1} ${w2} ${w3}`);
  // a preset loaded on the instrument mid-game: the game switches its knobs back on
  const pd=[0xF0]; for(let k=0;k<256;k++){ let v=t.mc.params[k]||0; if(k>=40 && k<60) v=(v+5)%100; if(k===238) v=0; pd.push(v&127, v>>7); } pd.push(0xF7);
  t.mc._asked=0; t.mc._dump(pd); await sleep(80);
  check("after a preset change on the instrument, the knobs are switched back on", t.mc.params[238]===1);
  // A phone held upright (a Pixel 7, a minichord plugged in): the bricks taller, the wall set down from
  // the top, the run to the paddle still most of the field, the ball faster across it. On the field as
  // it was (wider than it's tall), the wall and the ball as they always were.
  const fit=t.w.eval(`(()=>{ const f=blast.field, size=(w,h)=>{ Object.defineProperty(f,"clientWidth",{value:w, configurable:true}); Object.defineProperty(f,"clientHeight",{value:h, configurable:true}); boLayout(); boWall(); const b=blast.bricks[0]; return {h:b.h, y:b.y, end:blast.wallEnd, pad:blast.padY, pace:boPace()}; };
    const tall=size(408,913), wide=(delete f.clientWidth, delete f.clientHeight, boLayout(), boWall(), {h:blast.bricks[0].h, y:blast.bricks[0].y, pace:boPace()}); return {tall, wide}; })()`);
  check("on a phone held upright: taller bricks, the wall set down from the top, the run to the paddle most of the field, the ball faster", fit.tall.h>30 && fit.tall.y>56 && fit.tall.pad-fit.tall.end>=fit.tall.pad*.45 && fit.tall.pace>1 && fit.tall.pace<=1.4, JSON.stringify(fit.tall));
  check("on a field wider than it's tall, the wall and the ball as they were", fit.wide.h===30 && fit.wide.y===56 && fit.wide.pace===1, JSON.stringify(fit.wide));
  sb.restoreAll();
  check("leaving switches the knobs back off", t.mc.params[238]===0);
  t.done();
})();
