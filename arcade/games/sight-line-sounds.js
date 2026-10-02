// Sight Line's sounds: woodblock for each note read, brighter dead on, a little climb each time the
// streak's multiplier goes up, and a flubbed note for a miss.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

GAME_SFX.sight={
  hit:   ({tone,noise}, dead)=>{ tone("sine",dead?1600:1100,0,0,.05,.9); noise(0,.02,dead?6000:3000,dead?6000:3000,.5,"bandpass",4);
    if(dead) tone("sine",2400,0,.04,.04,.4); },
  streak:({tone}, m=2)=>{ for(let i=0;i<m;i++) tone("sine",1200+i*300,0,.08+i*.05,.04,.5); },
  miss:  ({tone,noise})=>{ tone("sawtooth",196,185,0,.22,.35); tone("sawtooth",203,190,0,.22,.3); noise(0,.1,800,200,.3); },
  level: ({tone})=>{ [1100,1100,1600,1100,1600,2200].forEach((f,i)=>tone("sine",f,0,i*.09,.05,.8)); tone("triangle",1047,0,.55,.4,.5); },
};
