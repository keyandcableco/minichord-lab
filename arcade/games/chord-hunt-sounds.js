// Chord Hunt's sounds: outdoors and mostly noise, so nothing gets in the way of the chords being
// named by ear: a shotgun, wing flaps, the dog sniffing and barking. Only the round's jingle has
// pitches, and it's in the round's key.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

const hdFlaps=(noise,n,vol)=>{ for(let i=0;i<n;i++) noise(i*.11,.06,1500,600,vol*(1-i/(n+1)),"bandpass",1.5); };
GAME_SFX.hunt={
  bang:  ({tone,noise})=>{ noise(0,.25,8000,300,1); noise(0,.04,3000,3000,.9,"bandpass",1); tone("sine",120,50,0,.12,.6); },
  hit:   ({tone,noise})=>{ noise(0,.25,8000,300,1); tone("sine",120,50,0,.12,.6); hdFlaps(noise,3,.3); noise(.7,.1,400,100,.6); },   // down it comes
  flap:  ({noise})=>hdFlaps(noise,3,.2),
  away:  ({noise})=>hdFlaps(noise,6,.3),
  sniff: ({noise})=>{ [0,.12,.5,.62].forEach(at=>noise(at,.05,2500,1800,.15,"bandpass",3)); },
  fetch: ({tone,noise})=>{ [0,.16].forEach(at=>{ tone("sawtooth",450,250,at,.08,.4); noise(at,.08,1200,600,.4,"bandpass",2); }); },   // ruff ruff
  miss:  ({tone})=>{ tone("triangle",392,370,0,.3,.6); tone("triangle",330,262,.32,.5,.6); },
  level: ({tone}, k)=>{ const pc=k ? k.pc : 0, third=k && k.minor ? 3 : 4;
    [0,third,7,12].forEach((s,i)=>tone("triangle",pcHz(pc+s,-1),0,i*.09,.14,.7)); tone("square",pcHz(pc+12,-1),0,.4,.35,.25); },
};
