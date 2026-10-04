// Chord Hunt on the screen's minichord: while a round opens, a chord button held sets the key, for
// points, and plays no chord at the game; while a duck's up, a chord held is a shot, never a key change.
const t=require("./harness").load("chord-hunt");
const finger=(el, type, id, x, y)=>{ const e=new t.w.MouseEvent(type, {clientX:x, clientY:y, bubbles:true, cancelable:true});
  Object.defineProperty(e, "pointerId", {value:id}); Object.defineProperty(e, "pointerType", {value:"touch"}); el.dispatchEvent(e); };
(async()=>{
  const {w, d, sleep, check, mc}=t;
  await sleep(150);
  w.eval("touchMinichord(true)"); await sleep(80);
  const a=await t.start(0, {speed:4});
  w.eval("hdFetchMaybe=()=>false");
  for(let i=0;i<100 && !a.key;i++) await sleep(50);
  const g=d.querySelector(".tdgrid"); g.getBoundingClientRect=()=>({left:0, top:0, right:700, bottom:150, width:700, height:150});
  // a button's middle: the columns F C G D A E B, 100 wide; the rows major, minor, seventh, 50 high
  const at=(letter, r)=>[w.eval("VM_COLS").indexOf(letter)*100+50, r*50+25];
  const sig=w.eval("KEY_BY_FIFTHS[blast.key.f]");
  check("the sign says how to set the key on the screen", a.keyAsk && w.document.querySelector(".hdkey small")?.textContent===`SET IT: HOLD ${sig}, MIDDLE ROW`, w.document.querySelector(".hdkey")?.textContent);
  const s0=a.score, [x,y]=at(sig, 1);
  finger(g, "pointerdown", 1, x, y); await sleep(1150); finger(g, "pointerup", 1, x, y); await sleep(60);
  check("held a second while the round opens, its button sets the key, and scores", mc.params[35]===w.eval(`keyIndexOf(${a.key.f})`) && a.score>s0 && !a.keyAsk, `35=${mc.params[35]} +${a.score-s0}`);
  check("and the chord held to do it played nothing at the game", !/WAIT FOR THE DUCK/.test(t.heard()), t.heard());
  for(let i=0;i<300 && !(a.duck && a.duck.open && !a.duck.done);i++) await sleep(50);
  const tg=a.duck.targets[0], key35=mc.params[35], [dx,dy]=at(tg.root[0], 0);
  finger(g, "pointerdown", 2, dx, dy); await sleep(1150);
  check("a duck up, a chord held is a shot at once", tg.hit, t.heard());
  check("and never a key change", mc.params[35]===key35 && !d.querySelector(".tdcell.keying"), `35=${mc.params[35]}`);
  finger(g, "pointerup", 2, dx, dy);
  w.eval("touchMinichord(false)");
  t.done();
})();
