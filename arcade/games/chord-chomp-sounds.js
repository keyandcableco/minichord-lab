// Chord Chomp's sounds: the waka of a dot with nothing held, and with a chord held the chord's next
// note (the game picks it, chord-chomp.js); a pellet's strum; the siren-like rise of the power; a
// ghost caught, on its root; the cadence's resolution; the old game's falling death; a key turning
// up and a key set, on its home.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

const ccHz=m=>440*2**((m-69)/12);
GAME_SFX.chomp={
  waka:    ({tone}, i=0)=> i%2 ? tone("triangle",480,260,0,.08,.55) : tone("triangle",260,480,0,.08,.55),
  pellet:  ({tone})=>{ tone("triangle",260,520,0,.12,.6); tone("triangle",520,260,.1,.12,.5); },
  sing:    ({tone}, m=72)=>{ const f=ccHz(m); tone("triangle",f,0,0,.2,.75); tone("square",f*2,0,0,.05,.1); },
  strum:   ({tone}, ms=[60,64,67,72])=>ms.forEach((m,i)=>tone("triangle",ccHz(m),0,i*.035,.3,.55)),
  power:   ({tone})=>{ for(let i=0;i<4;i++) tone("square",330+i*110,660+i*110,i*.06,.08,.25); },
  catch:   ({tone}, pc=0)=>{ tone("square",pcHz(pc,-1),pcHz(pc,1),0,.25,.4); tone("triangle",pcHz(pc,1),0,.2,.2,.5); },
  cadence: ({tone}, pc=0)=>{ [7,11,14,12].forEach((s,i)=>tone("triangle",pcHz(pc+s),0,i*.09,.16,.55)); tone("triangle",pcHz(pc,1),0,.36,.5,.6); },   // the leading note home
  die:     ({tone})=>{ tone("square",880,110,0,1,.4); [0,1].forEach(k=>tone("square",220,70,1+k*.14,.12,.4)); },
  clear:   ({tone})=>{ [523,659,784,1047,784,1047,1319].forEach((f,i)=>tone("square",f,0,i*.09,.1,.35)); },
  fruit:   ({tone})=>{ [988,1319,988,1319].forEach((f,i)=>tone("square",f,0,i*.07,.06,.3)); },
  gone:    ({tone})=>tone("square",660,220,0,.3,.3),
  key:     ({tone}, pc=0)=>{ [0,4,7,12].forEach((s,i)=>tone("triangle",pcHz(pc+s),0,i*.07,.16,.6)); },
  wrong:   ({tone})=>{ tone("square",150,140,0,.18,.45); tone("square",159,0,0,.18,.35); },
  mini:    ({tone})=>{ [1047,1319,1568,2093].forEach((f,i)=>tone("square",f,0,i*.05,.05,.25)); },              // a little minichord, somewhere
  jam:     ({tone})=>{ [60,64,67,72,76,79,84].forEach((m,i)=>tone("triangle",ccHz(m),0,i*.04,.5,.45)); [0,.3,.45].forEach(at=>tone("square",ccHz(48),0,at,.12,.3)); },   // a strum, and the band counting in
  capsule: ({tone})=>{ [784,988,1319].forEach((f,i)=>tone("triangle",f,0,i*.07,.14,.5)); },
};
