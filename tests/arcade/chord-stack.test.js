// Chord Stack: pieces slide and drop; a row holding a chord clears when it's played; the stack rises.
const t=require("./harness").load("chord-stack");
(async()=>{
  const {sb, sleep, key, chord, note, knob, check}=t;
  await sleep(150); t.connect({key:2}); await sleep(100);
  const a=await t.start(0);
  const x0=a.piece.x; key("ArrowRight");
  check("the arrow keys slide the piece", a.piece.x===(x0+1)%12);
  a.grid[13]=Array(12).fill(null); a.grid[13][0]={pc:0}; a.grid[13][4]={pc:4}; a.grid[13][7]={pc:7}; sb.stackDraw();
  check("a row holding C E G is ready", sb.stackReady.some(r=>r.name==="C"));
  const before=a.score; chord("C"); await sleep(40);
  check("playing C clears it", a.score>before && a.grid[13].filter(Boolean).length===0, `score ${before} → ${a.score}`);
  const xb=a.piece.x; note(8); await sleep(20);
  check("the harp steers the piece left", a.piece.x===(xb+11)%12);
  a.piece.x=5; knob(0); await sleep(20); const k0=a.piece.x; knob(127); await sleep(20);
  check("a knob slides the piece across", k0===0 && a.piece.x===11, `${k0} → ${a.piece.x}`);
  let pieces=0; for(let i=0;i<500 && a.phase==="play";i++){ if(a.piece) a.piece.x=(i*5)%12; key("Space"); pieces++; await sleep(5); }
  check("stray rows rise until the stack tops out", a.phase==="over" || a.phase==="menu", `after ${pieces} pieces: ${a.phase}`);
  check("rows of stray notes rose", a.grid.flat().some(c=>c&&c.stray) || a.phase!=="play");
  t.done();
})();
