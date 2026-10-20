// The harp plates by name (core/minichord.js plateName, mc.plate) and what the arcade makes of each
// (controller.js harpChoices): the firmware's numbering from 93, where 4 is framed strings and the
// joystick harp is 11 (from 101), with 4 the joystick only on 90-92; the arcade wheel drawn beside the
// field and on the beginner's minichord, its zones the strip's d-pad and a dot where the finger is;
// HARP offering what the plate fitted allows, all five with none named; the drum pads a d-pad of
// their own, drawn as their two columns of six; piano glide's keys played as the strip, fine for games;
// a plate for playing (strings, ribbons, the xy pad) named on the title screen.
const t=require("./harness").load("chord-snake");
(async()=>{
  const {w, mc, sleep, check}=t;
  await sleep(150); t.connect({firmware:99}); await sleep(100);
  const plate=(n, fw)=>{ mc.params[7]=fw; mc.params[243]=n; mc.dispatchEvent(new w.Event("device")); };
  const harp=()=>w.eval(`ARCADE_OPTS.find(o=>o.id==="harp").vals("snake").map(v=>v[0]).join()`);
  // the numbering
  const name=(n, fw)=>w.eval(`(()=>{ mc.params[7]=${fw}; mc.params[243]=${n}; return mc.plate; })()`);
  check("no plate is the stock strip", name(0,99)==="stock");
  check("4 is framed strings from firmware 93", name(4,99)==="framed" && name(4,101)==="framed");
  check("4 is the joystick on 90-92 only", name(4,90)==="joystick" && name(4,92)==="joystick" && name(4,89)==="other");
  check("11 is the joystick harp", name(11,101)==="joystick");
  check("9 is the wheel, 13 the drum pads, 7 nothing named", name(9,99)==="wheel" && name(13,100)==="drumpads" && name(7,100)==="other");
  // framed strings on a new firmware isn't the joystick
  plate(4, 101); await sleep(20);
  check("framed strings: not joystick mode", w.eval("jsOn()")===false && w.eval("rhPlate()")===false);
  check("framed strings: HARP is the strip, and says it's for playing", harp()==="STRIP" && /FRAMED STRINGS.*NOT GAMES/.test(w.eval(`ARCADE_OPTS.find(o=>o.id==="harp").vals("snake")[0][2]`)));
  plate(3, 101); await sleep(20);
  check("twin rows: the strip, named, and fine for games", harp()==="STRIP" && /TWIN ROWS: ITS TWELVE ZONES/.test(w.eval(`ARCADE_OPTS.find(o=>o.id==="harp").vals("snake")[0][2]`)));
  plate(11, 101); await sleep(20);
  check("the joystick harp: joystick mode", w.eval("jsOn()")===true && harp()==="JOYSTICK" && w.eval("blast.strip.classList.contains('jspic')"));
  // the wheel
  plate(9, 99); await sleep(20);
  check("the wheel: HARP is the wheel", harp()==="WHEEL" && w.eval("kmLayoutName()")==="wheel");
  check("drawn beside the field: ten ring zones and the hub", w.eval("blast.strip.classList.contains('whpic')") && w.eval("blast.strip.querySelectorAll('.whz').length")===12);
  check("its zones are the strip's d-pad: the top three up, the hub A and B",
    w.eval(`["9","10","11"].every(pc=>blast.strip.querySelector('[data-pc="'+pc+'"]').dataset.zone==="up")`)
    && w.eval(`blast.strip.querySelector('[data-pc="6"]').dataset.zone`)==="A" && w.eval(`blast.strip.querySelector('[data-pc="5"]').dataset.zone`)==="B");
  w.eval("kmFlash(blast.strip, 10)");
  check("a string played flashes its zone", w.eval(`blast.strip.querySelector('[data-pc="10"]').classList.contains("hit")`));
  mc._harp([0xB0,24,127]); mc._harp([0xB0,23,32]);
  const dot=w.eval(`(()=>{ const d=blast.strip.querySelector('.whdot'); return [d.classList.contains("on"), +d.getAttribute("cx"), +d.getAttribute("cy")]; })()`);
  check("a finger on the ring shows as a dot, a quarter turn round on the right", dot[0] && dot[1]>26 && Math.abs(dot[2]-28)<.5, dot.join());
  mc._harp([0xB0,24,0]);
  check("lifted, the dot goes", !w.eval(`blast.strip.querySelector('.whdot').classList.contains("on")`));
  w.eval("saved.beginner=true; helperSync(true)"); await sleep(20);
  check("beginner mode: the wheel on the minichord's harp", w.eval("!!blast.field.querySelector('.helper .whpic.onboard')"));
  w.eval("saved.beginner=false; helperSync(true)");
  // the keymaster: its two layouts
  plate(1, 99); await sleep(20);
  check("the keymaster: GRID or D-PAD", harp()==="GRID,D-PAD");
  // no plate named: the player's choice, the wheel among them
  plate(0, 99); await sleep(20);
  check("no plate named: all five", harp()==="STRIP,GRID,D-PAD,WHEEL,DRUM PADS");
  w.eval(`ARCADE_OPTS.find(o=>o.id==="harp").set(3, "snake")`);
  check("WHEEL chosen by hand draws the wheel", w.eval("kmLayoutName()")==="wheel" && w.eval("blast.strip.classList.contains('whpic')"));
  w.eval(`ARCADE_OPTS.find(o=>o.id==="harp").set(0, "snake")`);
  // the drum pads: a controller of its own
  plate(13, 100); await sleep(20);
  check("the drum pads: a controller of its own, no note", w.eval("kmLayoutName()")==="drumpads" && harp()==="DRUM PADS" && w.eval("blast.overlay.querySelector('.cabplate')?.textContent||''")==="");
  check("drawn as two columns of six", w.eval("blast.strip.classList.contains('dppic')") && w.eval("blast.strip.querySelectorAll('.whz').length")===12);
  const zone=t=>w.eval(`blast.strip.querySelector('[data-pc="${12-t}"]').dataset.zone`);
  check("top pair up, then left and right, a pair down, a dead row, A and B at the foot",
    [2,3].every(t=>zone(t)==="up") && zone(1)==="left" && zone(4)==="right" && [6,5].every(t=>zone(t)==="down") && [7,10].every(t=>zone(t)==="null")
    && [8,12].every(t=>zone(t)==="A") && [9,11].every(t=>zone(t)==="B"));
  check("a pad played reads as its way", w.eval("kmControl(10)")==="up" && w.eval("kmControl(11)")==="left" && w.eval("kmControl(0)")==="A");
  // piano glide: the piano's keys, so the strip, and fine for games
  plate(12, 100); await sleep(20);
  check("piano glide: the strip, named, and fine for games", w.eval("kmLayoutName()")==="strip" && harp()==="STRIP"
    && /PIANO GLIDE: ITS KEYS PLAY AS THE STANDARD STRIP.*KEEP OFF THE GLIDE STRIP/.test(w.eval(`ARCADE_OPTS.find(o=>o.id==="harp").vals("snake")[0][2]`))
    && w.eval("blast.overlay.querySelector('.cabplate')?.textContent||''")==="");
  // the xy pad: for playing
  plate(14, 100); await sleep(20);
  check("the xy pad: played as the strip, and the title screen says it isn't for games", w.eval("kmLayoutName()")==="strip" && harp()==="STRIP"
    && /THE XY PAD.*NOT GAMES/.test(w.eval("blast.overlay.querySelector('.cabplate')?.textContent||''")));
  // a plate for playing
  plate(8, 100); await sleep(20);
  check("zipper 24: played as the strip", w.eval("kmLayoutName()")==="strip" && harp()==="STRIP");
  check("and the title screen says it isn't for games", /ZIPPER 24.*NOT GAMES/.test(w.eval("blast.overlay.querySelector('.cabplate')?.textContent||''")));
  plate(0, 99); await sleep(20);
  check("taken off, the note goes", w.eval("blast.overlay.querySelector('.cabplate')?.textContent||''")==="");
  t.done();
})();
