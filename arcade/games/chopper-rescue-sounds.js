// Chopper Rescue's sounds: the radio's squelch and static, a short burst of rotor for each flight,
// chirps when survivors are found, the winch's ratchet. The signal's tick is unpitched, so it
// doesn't get in the way of the notes being picked out by ear.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

GAME_SFX.chopper={
  radio: ({tone,noise})=>{ noise(0,.12,2500,1800,.5,"bandpass",6); tone("square",1200,0,0,.03,.2); },
  signal:({noise})=>noise(0,.05,3000,3000,.8,"bandpass",10),
  tuned: ({tone,noise})=>{ noise(0,.15,1500,4000,.4,"bandpass",4); tone("sine",1760,0,.12,.12,.3); },
  fly:   ({tone,noise})=>{ for(let i=0;i<6;i++){ noise(i*.09,.06,600,150,.9-i*.1); tone("sine",90,70,i*.09,.06,.6-i*.07); } },   // rotor, once
  found: ({tone})=>{ tone("square",988,1976,0,.08,.4); tone("square",1319,2637,.1,.1,.4); },
  empty: ({tone,noise})=>{ noise(0,.5,3000,2500,.5,"bandpass",1); tone("square",200,150,0,.25,.3); },
  waypoint:({tone})=>tone("sine",1319,0,0,.08,.4),
  winch: ({noise})=>{ for(let i=0;i<8;i++) noise(i*.05,.025,4000,4000,.7,"bandpass",6); },
  miss:  ({tone,noise})=>{ noise(0,.35,1000,1000,.7,"bandpass",2); tone("square",330,165,0,.3,.4); },
  level: ({tone})=>{ [392,523,659,784,659,784].forEach((f,i)=>tone("triangle",f,0,i*.08+(i>3?.06:0),.12,.6)); },
};
