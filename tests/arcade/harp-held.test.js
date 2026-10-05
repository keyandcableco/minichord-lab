// The harp held: a zone is held from a string's touch to its release, the newest arrow wins, and a zone
// with two strings stays held while either is. On firmware 22 and up the harp is set to sound at the
// touch and let go at the lift, without a palm mute, and given back after.
const t=require("./harness").load("chord-chomp");
(async()=>{
  const {sb, sleep, check, mc, w}=t;
  await sleep(150); t.connect({firmware:23, extra:{215:0, 216:1, 213:4}}); await sleep(100);
  await t.start(0); await sleep(300);
  check("a string sounds at the touch, its note ends at the lift, no palm", mc.params[216]===0 && mc.params[215]===1 && mc.params[213]===0,
    `216=${mc.params[216]} 215=${mc.params[215]} 213=${mc.params[213]}`);
  const on=pc=>mc._harp([0x90, 60+pc, 100]), off=pc=>mc._harp([0x80, 60+pc, 0]);
  const way=()=>w.eval("kmHeldWay()"), held=()=>w.eval("kmHeld()").join();
  // the strip, string by pitch class: 0-2 down, 3-4 right, 5 B, 6 A, 7-8 left, 9-11 up
  on(3);
  check("a string held holds its way", way()==="right");
  on(9);
  check("another way touched while one's held takes over", way()==="up" && held()==="up,right", held());
  off(9);
  check("let go, the way still held comes back", way()==="right");
  off(3);
  check("nothing held, no way", way()===null && held()==="");
  on(10); on(11); off(10);
  check("a zone stays held while any of its strings is", way()==="up");
  off(11);
  on(6);
  check("A held is held, but it's no way", held()==="A" && way()===null);
  w.dispatchEvent(new w.Event("blur"));
  check("a page that loses the focus lets everything go", held()==="");
  sb.restoreAll();
  check("leaving gives the harp's settings back", mc.params[216]===1 && mc.params[215]===0 && mc.params[213]===4);
  t.done();
})();
