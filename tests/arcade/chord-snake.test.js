// Chord Snake: steered by keys and the harp, it eats notes and cashes them in with their chord.
const t=require("./harness").load("chord-snake");
(async()=>{
  const {sb, sleep, key, note, chord, check, d}=t;
  await sleep(150); t.connect({key:2, extra:{2:0, 3:0}}); await sleep(100);      // both volumes right down
  check("a volume that's down is turned up for the game", t.mc.params[2]===70 && t.mc.params[3]===70);
  const a=await t.start(2); await sleep(900);
  const DIRK={up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight"};
  function route(){   // breadth-first to the nearest tile, round walls and body
    const [hx,hy]=a.body[0], block=new Set(a.body.slice(0,-1).map(([x,y])=>x+","+y)), Q=[[hx,hy,null]], seen=new Set([hx+","+hy]);
    while(Q.length){ const [x,y,first]=Q.shift();
      for(const [dn,[dx,dy]] of Object.entries({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]})){
        const nx=x+dx, ny=y+dy, k=nx+","+ny; if(nx<0||ny<0||nx>=a.cols||ny>=a.rows||block.has(k)||seen.has(k)) continue;
        seen.add(k); const f=first||dn; if(a.tiles.some(tl=>tl.x===nx&&tl.y===ny)) return f; Q.push([nx,ny,f]); } }
    return null; }
  let cashes=0;
  for(let i=0;i<1400 && a.phase==="play" && cashes<3;i++){ await sleep(60);
    const ready=sb.snakeReady; if(ready.length){ const c=ready[0]; chord(c.root, c.q); cashes++; await sleep(60); continue; }
    if(a.tail.length>=6) key("KeyX");
    const dir=route(); if(dir && dir!==a.dir) key(DIRK[dir]); }
  check("it eats notes and cashes chords in", cashes>=2 && a.score>0, `${cashes} cashed, score ${a.score}`);
  note(11); await sleep(20);
  check("the harp steers", !!d.querySelector(".kmstrip .km.hit"));
  sb.restoreAll();
  check("leaving gives back the harp's level, and the volumes", t.mc.params[97]===150 && t.mc.params[2]===0 && t.mc.params[3]===0);
  // the keymaster's corners do nothing, so the directions stand clearly apart
  t.w.eval("saved.harpLayout='keymaster'");
  check("on the keymaster, the four corners do nothing", [0,2,9,11].every(pc=>t.w.eval(`kmControl(${pc})`)==null) && t.w.eval("kmControl(10)")==="up" && t.w.eval("kmControl(1)")==="down");
  const q0=a.queue.length; t.w.eval("snTurn(kmControl(0))");
  check("and a corner doesn't turn the snake", a.queue.length===q0);
  t.w.eval("saved.harpLayout='strip'");
  t.done();
})();
