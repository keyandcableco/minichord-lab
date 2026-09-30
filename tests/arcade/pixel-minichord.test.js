// The pixel minichord: its grid (arcade/pixel-minichord.txt) is the one place it's drawn, and what's
// made from it (the drawing the pages load, the favicon) is up to date with it; Ben holds it.
const {execFileSync}=require("child_process"), path=require("path");
const t=require("./harness").load("chopper-rescue");
(async()=>{
  const {w, sleep, check}=t;
  let ok=true, said="";
  try{ said=execFileSync("python3", [path.join(__dirname,"..","..","arcade","make-pixel-minichord.py"), "--check"], {encoding:"utf8"}); }
  catch(e){ ok=false; said=String(e.stderr||e.message).trim(); }
  check("what's made from pixel-minichord.txt is up to date with it", ok, said.trim());
  await sleep(100);
  check("Ben holds the pixel minichord from the grid", w.eval("CH_BEN.includes(PIXEL_MINICHORD_PATHS)") && w.eval("PIXEL_MINICHORD_W")===36);
  t.done();
})();
