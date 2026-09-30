// Chord Stack: Tetris, where the blocks are notes. Pieces move and rotate; a row holding a chord's
// notes lights them up, and playing it clears them, the blocks above falling in; side by side scores
// double, a whole row of one chord five times; the stack reaching the top ends it.
const t=require("./harness").load("chord-stack");
(async()=>{
  const {w, sb, sleep, key, chord, note, knob, check}=t;
  await sleep(150); t.connect({key:2}); await sleep(100);
  const a=await t.start(0);
  check("the minichord is set to the level's key", t.mc.params[35]===w.eval("keyIndexOf(blast.keyF)"));
  const x0=a.piece.x; key("ArrowRight");
  check("the arrow keys move the piece", a.piece.x===x0+1);
  const c0=JSON.stringify(a.piece.cells); key("ArrowUp");
  check("up rotates it", a.piece.kind==="O" || JSON.stringify(a.piece.cells)!==c0);
  // the square rotates too: its outline stays, its notes turn round
  a.piece={kind:"O", cells:[[0,0],[1,0],[0,1],[1,1]], notes:[0,4,7,9], x:4, y:3};
  const at=()=>{ const m={}; a.piece.cells.forEach(([x,y],i)=>m[x+","+y]=a.piece.notes[i]); return JSON.stringify(m); };
  const o0=at(); key("ArrowUp"); await sleep(10);
  check("the square rotates: same outline, its notes turned round", at()!==o0 && a.piece.x===4, `${o0} → ${at()}`);
  // a chord side by side on the floor lights up and clears; a block above falls in
  a.piece=null; a.grid=w.eval("stEmpty()"); const F=17;
  a.grid[F][2]={pc:0}; a.grid[F][3]={pc:4}; a.grid[F][4]={pc:7}; a.grid[F-1][3]={pc:9}; sb.stackDraw();
  check("C, E and G side by side light up as C major, side by side", sb.stackReady.some(r=>r.name==="C" && r.xs.join()==="2,3,4" && r.tight));
  const before=a.score; chord("C"); await sleep(40);
  check("playing C clears them for double, and the block above falls in", a.score-before===w.eval("mulPts(10*3*2)") && !a.grid[F][2] && a.grid[F][3] && a.grid[F][3].pc===9, `+${a.score-before}`);
  // scattered across a row, it counts too, for the plain score
  a.grid=w.eval("stEmpty()"); a.grid[F][0]={pc:0}; a.grid[F][1]={pc:2}; a.grid[F][4]={pc:4}; a.grid[F][8]={pc:7}; sb.stackDraw();
  const sc=sb.stackReady.find(r=>r.name==="C");
  check("C, E and G scattered across a row light up too, not as side by side", !!sc && !sc.tight && sc.xs.join()==="0,4,8");
  const s2=a.score; chord("C"); await sleep(40);
  check("playing C clears just those notes, for the plain score", a.score-s2===w.eval("mulPts(10*3)") && !a.grid[F][0] && a.grid[F][1] && a.grid[F][1].pc===2 && !a.grid[F][4], `+${a.score-s2}`);
  // a whole row of one chord: five times
  a.grid=w.eval("stEmpty()"); [0,4,7,0,4,7,0,4,7,0].forEach((pc,x)=>a.grid[F][x]={pc}); sb.stackDraw();
  const whole=sb.stackReady.find(r=>r.whole), s1=a.score; chord("C"); await sleep(40);
  check("a whole row of C major clears for five times", !!whole && a.score-s1===w.eval("mulPts(10*3*5)"), `+${a.score-s1}`);
  // the harp and a knob steer
  a.grid=w.eval("stEmpty()"); a.next=w.eval("stRandPiece()"); w.eval("stSpawn()"); await sleep(20);
  const dirPc=d=>[...Array(12).keys()].find(pc=>w.eval(`kmControl(${pc})`)===d);
  const xb=a.piece.x; note(dirPc("left")); await sleep(20);
  check("the harp moves the piece left", a.piece.x===xb-1);
  knob(0); await sleep(20); const k0=a.piece.x; knob(127); await sleep(20);
  check("a knob slides the piece across the well", k0===0 && a.piece.x>=6, `${k0} → ${a.piece.x}`);
  // dropped without a care, the stack reaches the top
  let pieces=0; for(let i=0;i<400 && a.phase==="play";i++){ key("Space"); pieces++; await sleep(4); }
  check("the stack reaching the top ends the game", a.phase==="over" || a.phase==="menu", `after ${pieces} pieces: ${a.phase}`);
  t.done();
})();
