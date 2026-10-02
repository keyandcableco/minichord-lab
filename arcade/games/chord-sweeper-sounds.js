// Chord Sweeper's sounds: dry clicks for the cursor and each sweep, a flag planted, a wire snipped
// and a sigh of relief for a defused mine, and a big boom for the rest.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

GAME_SFX.sweeper={
  tick:  ({tone})=>tone("square",2600,0,0,.012,.25),
  sweep: ({tone,noise})=>{ noise(0,.03,5000,5000,.8,"bandpass",3); tone("triangle",1500,0,0,.02,.3); },
  flag:  ({tone,noise})=>{ noise(0,.08,3000,800,.6,"bandpass",2); tone("square",880,1320,0,.05,.3); },
  defuse:({tone,noise})=>{ noise(0,.03,8000,8000,.9,"highpass"); tone("sine",784,0,.12,.15,.5); tone("sine",1047,0,.22,.3,.5); },
  boom:  ({tone,noise})=>{ noise(0,1,4000,50,1); tone("square",120,30,0,.6,.6); noise(.1,.7,1500,80,.6); },
  miss:  ({tone})=>{ tone("square",140,0,0,.12,.5); tone("square",140,0,.15,.12,.5); },
  level: ({tone})=>{ [659,784,1047,1319].forEach((f,i)=>tone("square",f,0,i*.06,.1,.4)); },
};
