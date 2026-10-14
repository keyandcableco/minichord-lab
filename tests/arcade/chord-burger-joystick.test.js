// Chord Burger on the joystick plate: the stick walks the cook through kmHeld, eight ways, the vertical
// way first (up-left walks left and takes the first ladder up); A flips; B voices the chord its next
// inversion, round from root position after the third, in MINE voicing, and does nothing in SET FOR
// ME. The strip doesn't walk. Without the plate, B on the harp does nothing.
const t=require("./harness").load("chord-burger");
const P=require("./dpad-plate").plateOf(t);
(async()=>{
  const {w, sb, sleep, check}=t;
  const E=s=>w.eval(s);
  await sleep(150); P.connect({extra:{37:0, 38:0, 120:2, 111:1, 198:2, 117:0}}); await sleep(100);
  E("saved.bkAuto=false");
  const a=await t.start(1); await sleep(100);
  P.push("left"); await sleep(20);
  check("the stick held: its way walks (kmHeld)", E("bkWays().join()")==="left", E("bkWays().join()"));
  P.stick(-.9,.9); await sleep(20);
  const ul=E("bkWays()");
  check("up-left: both ways held, up before left, so a walk left takes the first ladder up", ul.includes("up") && ul.includes("left") && ul.indexOf("up")<ul.indexOf("left"), ul.join());
  // the stick pushed up first and then up-left, as a thumb often does: still up before left (the
  // order kmHeld keeps is the newest first, left before up, and a walk that way passes every ladder)
  P.push("rest"); await sleep(20); P.push("up"); await sleep(20); P.stick(-.9,.9); await sleep(20);
  const ul2=E("bkWays()");
  check("up, then up-left: up still before left", ul2.join()==="up,left", ul2.join());
  // walked so on a floor: the cook goes left to the first ladder up and climbs it
  const lad=E(`(()=>{ const K=bkKitchen();
    for(let f=1; f<BK_NF; f++) for(const c of K.ladders[f-1]||[]){
      const x=c+3; if(x>BK_COLS-1 || !bkSeg(f, x) || bkSeg(f, x)[0]>c) continue;
      if([f-1,f].some(g=>(K.ladders[g]||[]).some(k=>k>c && k<=x))) continue;
      return {f, c, x}; }
    return null; })()`);
  if(lad){
    const walk=E(`(()=>{ const C=blast.cook, was={x:C.x, y:C.y, goal:C.goal}; C.x=${lad.x}; C.y=${lad.f}; C.goal=null;
      for(let k=0;k<40;k++) bkMove(C, .1, bkWays());
      const r={x:C.x, y:C.y}; Object.assign(C, was); return r; })()`);
    check("up-left walked on a floor: left to the first ladder, and up it", Math.abs(walk.x-lad.c)<.01 && walk.y<lad.f-.2, `ladder at ${lad.c} from floor ${lad.f}: at ${walk.x.toFixed(2)},${walk.y.toFixed(2)}`);
  } else check("a ladder to walk to in this kitchen", false);
  P.push("rest"); await sleep(20);
  check("let go, the cook stops", E("bkWays().length")===0);
  P.note(3); P.note(10); await sleep(20);
  check("the strip doesn't walk", E("bkWays().length")===0, E("bkWays().join()"));
  P.note(3,false); P.note(10,false);
  // A flips: the same as the harp's A
  let flips=0; const flip=w.bkFlip; w.bkFlip=()=>{ flips++; };
  P.press("a"); await sleep(20);
  check("A flips", flips===1);
  P.push("left"); P.push("rest"); P.push("up"); P.push("rest");
  check("the stick's pushes don't", flips===1);
  w.bkFlip=flip;
  // B: the next inversion, round again after the last the kitchen's chords have: the second with only
  // triads on the plates (a triad's third inversion is its root position an octave up)
  a.voicing={inv:0, sp:0};
  check("this kitchen's plates are triads", E("blast.plates.every(P=>!P.chord.seventh)"));
  let invs=[]; for(let k=0;k<3;k++){ P.press("b"); await sleep(10); invs.push(a.voicing.inv); }
  check("B with only triads: the next inversion each press, round to root position after the second", invs.join()==="1,2,0", invs.join());
  check("and the minichord's inversion (37) follows", t.mc.params[37]===0);
  P.press("b"); await sleep(10);
  check("…written to the minichord", t.mc.params[37]===1);
  // a seventh on a plate: round after the third
  const ch0=a.plates[0].chord; a.plates[0].chord={...ch0, seventh:true}; a.voicing={inv:0, sp:0};
  invs=[]; for(let k=0;k<4;k++){ P.press("b"); await sleep(10); invs.push(a.voicing.inv); }
  check("B with a seventh on a plate: round to root position after the third", invs.join()==="1,2,3,0", invs.join());
  a.plates[0].chord=ch0;
  // level 1 doesn't show the voicing in root position, but does once B has turned it
  const lv=a.level; a.level=0; a.voicing={inv:0, sp:0}; E("bkBar()");
  check("level 1 in root position: no voicing shown", !/ROOT|INV/.test(a.hud.textContent), a.hud.textContent);
  P.press("b"); await sleep(10);
  check("…but turned by B, it's shown (a stray press isn't hidden)", /1ST INV/.test(a.hud.textContent), a.hud.textContent);
  a.level=lv; a.voicing={inv:0, sp:0}; E("bkBar()");
  E("saved.bkAuto=true"); a.voicing={inv:0, sp:0};
  P.press("b"); await sleep(10);
  check("in SET FOR ME, B does nothing", a.voicing.inv===0);
  E("saved.bkAuto=false");
  check("the rules say the stick", /WITH THE STICK/.test(E("BKMENU_G.rules()")) && /B \(OR ONE KNOB\)/.test(E("BKMENU_G.rules()")));
  // without the plate
  P.connect({on:false, extra:{37:0, 38:0, 120:2, 111:1, 198:2, 117:0}}); await sleep(100);
  P.push("left"); await sleep(20);
  check("without the plate the stick doesn't walk", E("bkWays().length")===0);
  P.push("rest");
  a.voicing={inv:0, sp:0}; t.note(5); await sleep(10);
  check("and the harp's B leaves the voicing be", a.voicing.inv===0);
  sb.restoreAll();
  t.done();
})();
