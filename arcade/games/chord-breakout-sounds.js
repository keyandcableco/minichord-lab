// Chord Breakout's sounds: clean sine pings, the paddle low and the bricks high, a glassy crack,
// a shatter, and a falling note when the ball gets past.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

GAME_SFX.breakout={
  serve: ({tone})=>tone("sine",660,1320,0,.08,.6),
  paddle:({tone})=>{ tone("sine",440,0,0,.07,.8); tone("triangle",880,0,0,.04,.3); },
  glance:({tone})=>tone("sine",330,0,0,.06,.6),                                                // knocked aside by the paddle's end
  crack: ({tone,noise})=>{ tone("sine",1760,0,0,.05,.6); noise(0,.08,9000,4000,.5,"highpass"); },
  ping:  ({tone})=>tone("sine",1175,0,0,.06,.6),                                               // a brick already cracked
  boom:  ({tone,noise})=>{ noise(0,.25,9000,2000,.8,"highpass"); [2093,2637,3136].forEach((f,i)=>tone("sine",f*(1+Math.random()*.03),0,i*.03,.1,.3)); },   // shattered
  tink:  ({tone})=>tone("sine",2093,0,0,.12,.5),                                               // an arpeggio's note shot
  lost:  ({tone})=>tone("sine",880,110,0,.6,.7),
  miss:  ({tone})=>{ tone("sine",233,220,0,.2,.6); tone("sine",247,0,0,.2,.4); },
  level: ({tone})=>{ [1047,1319,1568,2093].forEach((f,i)=>tone("sine",f,0,i*.06,.1,.6)); tone("triangle",2093,0,.26,.4,.5); },
};
