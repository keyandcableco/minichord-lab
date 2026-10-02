// Fifths Defender's sounds: buzzy sawtooth zaps, as in Tempest, and an aim click pitched to each
// spoke's key, so turning round the wheel plays the circle of fifths.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

GAME_SFX.fifths={
  aim:   ({tone}, pc=0)=>{ const f=pcHz(pc); tone("triangle",f,0,0,.09,.5); tone("sine",f*2,0,0,.05,.15); },
  shoot: ({tone})=>{ tone("sawtooth",2200,300,0,.15,.4); tone("sawtooth",2210,310,0,.15,.3); },
  boom:  ({tone,noise})=>{ noise(0,.3,7000,500,.8,"bandpass",5); tone("sawtooth",400,60,0,.2,.4); },
  miss:  ({tone,noise})=>{ tone("sawtooth",110,55,0,.5,.6); tone("sawtooth",116,58,0,.5,.5); noise(0,.5,4000,200,.8); },
  jam:   ({tone,noise})=>{ noise(0,.25,5000,4000,.6,"bandpass",8); tone("sawtooth",60,0,0,.25,.3); },
  level: ({tone})=>{ [262,392,587,880,1319].forEach((f,i)=>tone("sawtooth",f,0,i*.07,.12,.3)); tone("triangle",1319,0,.35,.4,.6); },   // up in fifths
};
