// Dominant Kong's sounds: the jump and the landing, a barrel thrown, bouncing down and broken, a
// fireball lit and put out, the drum's flare, a barrel jumped clean over, the hammer; a lock opened on
// the next link's root, a rivet pulled, home (the V7 resolving to I, on the key), Kong coming down,
// and the old game's falling death.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

GAME_SFX.kong={
  jump:    ({tone})=>tone("square",330,880,0,.18,.4),
  land:    ({tone})=>tone("square",140,90,0,.05,.35),
  hop:     ({tone})=>{ [1047,1319,1568].forEach((f,i)=>tone("square",f,0,i*.05,.06,.3)); },
  throw:   ({tone,noise})=>{ noise(0,.12,800,200,.5); tone("square",110,70,0,.12,.4); },
  bounce:  ({tone})=>tone("square",220,110,0,.06,.3),
  break:   ({tone,noise})=>{ noise(0,.25,4000,300,.7); tone("square",330,110,0,.15,.4); },
  quench:  ({noise,tone})=>{ noise(0,.4,9000,1200,.5,"highpass"); tone("triangle",880,440,0,.25,.4); },
  flare:   ({noise})=>noise(0,.5,600,3000,.5,"bandpass",2),
  fire:    ({tone})=>{ [392,466,554].forEach((f,i)=>tone("square",f,0,i*.06,.08,.25)); },
  hammer:  ({tone})=>{ [523,659,784,1047,784,1047].forEach((f,i)=>tone("square",f,0,i*.06,.07,.35)); },
  unlock:  ({tone}, pc=0)=>{ [0,4,7,10].forEach((s,i)=>tone("triangle",pcHz(pc+s),0,i*.05,.2,.5)); },
  rivet:   ({tone})=>{ tone("square",1568,784,0,.08,.4); tone("square",1047,0,.08,.08,.3); },
  home:    ({tone}, pc=0)=>{ [[7,11,14,17],[0,4,7,12]].forEach((ch,k)=>ch.forEach(s=>tone("triangle",pcHz(pc+s),0,k*.35,.5,.35))); [0,4,7,12,16].forEach((s,i)=>tone("square",pcHz(pc+s,1),0,.75+i*.07,.12,.25)); },   // V7, then I
  kongdown:({tone})=>{ for(let i=0;i<8;i++) tone("square",600-i*60,0,i*.09,.1,.4); tone("triangle",65,40,.8,.8,.8); },
  key:     ({tone}, pc=0)=>{ [0,4,7,12].forEach((s,i)=>tone("triangle",pcHz(pc+s),0,i*.07,.16,.6)); },
  die:     ({tone})=>{ [880,784,698,622,554,494,440].forEach((f,i)=>tone("square",f,0,i*.11,.1,.4)); tone("triangle",110,0,.85,.6,.6); },
};
