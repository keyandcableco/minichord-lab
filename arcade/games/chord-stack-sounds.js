// Chord Stack's sounds: a click to rotate, a thud to lock, a rising sweep when a row clears, and a
// level jingle in the level's key.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

GAME_SFX.stack={
  rotate:({tone})=>{ tone("square",1200,0,0,.025,.3); tone("square",1600,0,.03,.025,.3); },
  lock:  ({tone,noise})=>{ tone("sine",180,90,0,.1,.8); noise(0,.07,800,200,.5); },
  ready: ({tone})=>{ [523,659,784,1047].forEach((f,i)=>tone("triangle",f,0,i*.04,.08,.5)); },     // a row spells a chord
  boom:  ({tone,noise})=>{ noise(0,.45,300,8000,.5,"bandpass",2); tone("triangle",784,1568,0,.3,.5); },   // a row cleared
  miss:  ({tone})=>{ tone("triangle",196,185,0,.25,.6); tone("triangle",208,0,0,.25,.5); },
  level: ({tone}, pc=0)=>{ [0,4,7,12,7,12].forEach((s,i)=>tone("square",pcHz(pc+s,-1),0,i*.07,.11,.4)); tone("triangle",pcHz(pc+12,-1),0,.42,.4,.6); },
};
