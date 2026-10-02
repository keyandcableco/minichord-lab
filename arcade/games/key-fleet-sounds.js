// Key Fleet's sounds: underwater, low-passed: a bubbling torpedo, a splash for a miss, a muffled
// blast for a hit, a clang for a crippled ship, and a long rumble when one goes down.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

const kfBubbles=(tone,at,n,vol=.3)=>{ for(let i=0;i<n;i++){ const f=300+Math.random()*500; tone("sine",f,f*1.6,at+i*.06+Math.random()*.03,.04,vol); } };
GAME_SFX.fleet={
  shoot: ({tone,noise})=>{ noise(0,.5,1200,200,.6); kfBubbles(tone,0,5); },
  boom:  ({tone,noise})=>{ noise(0,.6,600,60,1); tone("sine",70,35,0,.5,1); },
  clang: ({tone,noise})=>{ tone("sine",523,0,0,.6,.5); tone("sine",1397,0,0,.4,.35); tone("sine",2156,0,0,.3,.2); noise(0,.05,6000,6000,.5,"highpass"); },
  splash:({noise})=>{ noise(0,.35,2500,500,.8,"bandpass",1.5); noise(.05,.3,6000,1500,.3,"highpass"); },
  sunk:  ({tone,noise})=>{ noise(0,1.2,500,40,1); tone("sine",60,30,0,1,.8); kfBubbles(tone,.3,10,.25); },
  miss:  ({tone,noise})=>{ tone("sine",160,80,0,.3,.6); noise(0,.2,600,100,.4); },
  level: ({tone})=>{ [196,262,330,392,523].forEach((f,i)=>tone("triangle",f,0,i*.1,.16,.7)); tone("triangle",523,0,.5,.5,.6); },
};
