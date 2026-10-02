// Chord Snake's sounds: tiny square blips, a chomp that climbs as the tail grows, a zip down the
// segments when a chord's cashed in, and a crunch for a crash.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

GAME_SFX.snake={
  chomp: ({tone}, len=3)=>{ const f=330+Math.min(len,20)*25; tone("square",f,f*1.5,0,.04,.4); tone("square",f*1.5,f,.045,.04,.35); },
  star:  ({tone})=>{ tone("triangle",1047,2093,0,.15,.5); [2637,3136,3951].forEach((f,i)=>tone("square",f,0,.08+i*.04,.06,.25)); },
  ready: ({tone})=>{ tone("square",659,0,0,.06,.3); tone("square",988,0,.07,.1,.3); },              // some of the tail spells a chord
  cash:  ({tone})=>{ for(let i=0;i<6;i++) tone("square",1568-i*180,0,i*.035,.05,.4); tone("triangle",1568,2093,.22,.15,.5); },
  drop:  ({tone})=>tone("square",660,165,0,.25,.4),
  crash: ({tone,noise})=>{ noise(0,.4,3000,100,1); tone("square",300,60,0,.4,.6); },
  miss:  ({tone})=>{ tone("square",150,140,0,.18,.5); tone("square",159,0,0,.18,.4); },          // not in the tail: a buzz
  level: ({tone})=>{ [392,494,587,784,988].forEach((f,i)=>tone("square",f,0,i*.05,.07,.4)); },
};
