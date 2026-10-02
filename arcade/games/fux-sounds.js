// Fux's sounds: quiet, since the line itself is the music. A soft pluck for a shot, a bright little
// chord for a fault found, a sour pair for a good bar shot, a falling sigh for one that got away.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

GAME_SFX.fux={
  shoot: ({tone})=>tone("triangle",1800,900,0,.08,.4),
  hit:   ({tone})=>{ [1047,1319,1568].forEach((f,i)=>tone("triangle",f,0,i*.03,.18,.45)); },
  miss:  ({tone})=>{ tone("square",233,220,0,.25,.3); tone("square",247,233,0,.25,.25); },
  away:  ({tone})=>{ tone("triangle",660,330,0,.5,.5); tone("triangle",440,220,.1,.5,.35); },
  level: ({tone})=>{ [523,784,659,1047].forEach((f,i)=>tone("triangle",f,0,i*.12,.2,.55)); tone("triangle",1568,0,.5,.5,.4); },
};
