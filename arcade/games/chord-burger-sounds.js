// Chord Burger's sounds: a section trodden, an ingredient falling and landing, each landing on its
// plate at its own note, a plate ready, a plate served as its whole stack, low to high; the pepper
// on the notes it harmonises, and a sour shake; a sour note squashed, coming in, and catching the
// cook; the bonus food; FLIP; a combo meal's cadence home.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope, after arcade/sounds.js; see practice/boot.js.
"use strict";

const bkHz=m=>440*2**((m-69)/12);
GAME_SFX.burger={
  step:    ({tone}, s=0)=>tone("square",330+s*55,0,0,.04,.3),                                  // up a step with each section
  drop:    ({tone})=>tone("triangle",660,220,0,.3,.5),
  land:    ({tone,noise})=>{ tone("square",120,60,0,.12,.5); noise(0,.08,1200,200,.4); },
  note:    ({tone}, m=60)=>{ tone("triangle",bkHz(m),0,0,.5,.7); tone("square",bkHz(m)*2,0,0,.06,.12); },
  ready:   ({tone})=>{ tone("square",1568,0,0,.08,.35); tone("square",2093,0,.09,.16,.35); },          // a bell at the pass: order up
  serve:   ({tone}, ms=[48,52,55,60])=>{ ms.forEach((m,i)=>tone("triangle",bkHz(m),0,i*.06,.6,.55)); tone("square",bkHz(ms[ms.length-1]+12),0,.3,.25,.2); },
  pepper:  ({tone,noise}, ms=[66])=>{ noise(0,.25,9000,3000,.35,"highpass"); ms.forEach((m,i)=>tone("triangle",bkHz(m+12),0,.05+i*.04,.4,.5)); },
  sour:    ({tone})=>{ tone("square",233,220,0,.25,.4); tone("square",247,0,0,.25,.3); },            // a semitone grinding
  squash:  ({tone,noise})=>{ tone("square",400,60,0,.25,.5); noise(0,.15,3000,200,.5); },
  enter:   ({tone})=>{ tone("square",196,208,0,.12,.25); tone("square",208,196,.12,.12,.25); },
  die:     ({tone})=>{ [784,740,698,659,622,587,554,523].forEach((f,i)=>tone("square",f,0,i*.1,.12,.4)); tone("triangle",131,0,.85,.6,.6); },
  clear:   ({tone})=>{ [523,659,784,1047,784,1047,1319].forEach((f,i)=>tone("square",f,0,i*.09,.1,.35)); },
  food:    ({tone})=>{ [988,1319,988,1319].forEach((f,i)=>tone("square",f,0,i*.07,.06,.3)); },
  capsule: ({tone})=>{ [784,988,1319].forEach((f,i)=>tone("triangle",f,0,i*.07,.14,.5)); },
  flip:    ({tone})=>{ tone("square",523,1047,0,.08,.35); tone("square",1047,523,.08,.08,.35); },
  key:     ({tone}, pc=0)=>{ [0,4,7,12].forEach((s,i)=>tone("triangle",pcHz(pc+s),0,i*.07,.16,.6)); },
  meal:    ({tone}, pc=0)=>{ [7,11,14,12].forEach((s,i)=>tone("triangle",pcHz(pc+s),0,i*.09,.16,.55)); tone("triangle",pcHz(pc,1),0,.36,.5,.6); },   // the leading note home
  wrong:   ({tone})=>{ tone("square",150,140,0,.18,.45); tone("square",159,0,0,.18,.35); },
};
