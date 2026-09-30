// Chord Stack: Tetris, where the blocks are notes. Pieces move and rotate; blocks side by side in a
// row spelling a chord light up, and playing it clears them, the blocks above falling in; a whole row
// of one chord scores five times; notes scattered across a row don't count; the stack reaching the
// top ends it.
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
  // a chord side by side on the floor lights up and clears; a block above falls in
  a.piece=null; a.grid=w.eval("stEmpty()"); const F=17;
  a.grid[F][2]={pc:0}; a.grid[F][3]={pc:4}; a.grid[F][4]={pc:7}; a.grid[F-1][3]={pc:9}; sb.stackDraw();
  check("C, E and G side by side light up as C major", sb.stackReady.some(r=>r.name==="C" && r.xs.join()==="2,3,4"));
  const before=a.score; chord("C"); await sleep(40);
  check("playing C clears them, and the block above falls in", a.score>before && !a.grid[F][2] && a.grid[F][3] && a.grid[F][3].pc===9, `score ${before} → ${a.score}`);
  // scattered across a row, it doesn't count
  a.grid=w.eval("stEmpty()"); a.grid[F][0]={pc:0}; a.grid[F][4]={pc:4}; a.grid[F][8]={pc:7}; sb.stackDraw();
  check("C, E and G scattered across a row don't count", !sb.stackReady.length);
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
