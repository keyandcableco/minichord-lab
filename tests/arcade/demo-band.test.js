// A demo on a phone with a minichord plugged in (the bare cabinet): its picture of the minichord in a
// band of its own under the game's screen, the screen made smaller for it, gone with the demo. Chord
// Invaders' demo close up on the chord buttons for a chord, pulled back to the whole case for the first
// scene; and played on the screen's minichord, the deck lights Chord Invaders' demo's chords too.
const harness=require("./harness");
const [a, b, c]=["chord-chomp","invaders","invaders"].map(s=>harness.load(s));
const {check, sleep, done}=a;
const phone=g=>{ g.w.matchMedia=q=>({matches: /coarse/.test(q), addEventListener(){}}); };
// a minichord on the cable, already allowed, as Android names its ports
async function plugged(g){
  const ins=new Map([["i0",{id:"i0", name:"minichord"}],["i1",{id:"i1", name:"minichord"}]]);
  const outs=new Map([["o0",{id:"o0", name:"minichord", send(){}}],["o1",{id:"o1", name:"minichord", send(){}}]]);
  g.w.navigator.requestMIDIAccess=async()=>({inputs:ins, outputs:outs});
  await g.mc.connect(); await sleep(700);
}
// HOW TO PLAY, pressed till the demo's on (the first press may only wake the title screen)
async function demo(g){
  for(let i=0;i<4 && g.w.eval("blast.phase")!=="demo";i++){
    [...g.d.querySelectorAll("button.howto")].find(x=>/HOW TO PLAY/.test(x.textContent))?.click(); await sleep(200); }
  return g.w.eval("blast.phase")==="demo";
}
(async()=>{
  await sleep(250);
  { const {d}=a; phone(a); await plugged(a);
    check("a minichord plugged into a phone: the bare cabinet, no band yet", !!d.querySelector(".fscab.phone.bare") && !d.querySelector(".fscab.mcband"));
    check("the demo starts", await demo(a)); await sleep(300);
    const cab=d.querySelector(".fscab.phone.bare");
    check("its minichord in a band of its own under the screen", !!cab && cab.classList.contains("mcband") && !!d.querySelector(".fsscreen .field .helper.hboard"), cab ? cab.className : "none");
    check("the band's size set from the screen's width", /px$/.test(d.documentElement.style.getPropertyValue("--mcb-w")) && /px$/.test(d.documentElement.style.getPropertyValue("--mcb-h")));
    const lab=d.querySelector(".field .helper .cell");
    check("each button's letters counted, for its label to fit", !!lab && lab.style.getPropertyValue("--n")===String([...lab.textContent].length), lab ? `${lab.textContent} ${lab.style.getPropertyValue("--n")}` : "none");
    d.querySelector(".demoskip").click(); await sleep(400);
    check("the demo over, the band's gone, the screen whole again", !d.querySelector(".fscab.mcband") && !!d.querySelector(".fscab.phone.bare")); }

  { const {d}=b; phone(b); await plugged(b);
    check("Chord Invaders' demo starts", await demo(b)); await sleep(300);
    const el=d.querySelector(".field .demo");
    check("its own minichord in the band", !!d.querySelector(".fscab.mcband") && !!el && !!el.querySelector(".board"));
    check("the first scene, the whole minichord: the whole case", !el.classList.contains("close"));
    await sleep(3900);
    check("a chord's scene: close up on the chord buttons", el.classList.contains("close"), el.className);
    d.querySelector(".demoskip").click(); await sleep(400);
    check("skipped: the band's gone", !d.querySelector(".fscab.mcband")); }

  { const {w, d}=c; phone(c);
    w.eval("touchMinichord(true)"); await sleep(600);
    check("Chord Invaders on the screen's minichord: its demo starts", await demo(c));
    let lit=false; for(let i=0;i<50 && !lit;i++){ await sleep(100); lit=!!d.querySelector('#tdeck .tdcell.hint[data-c="1"][data-r="0"]'); }
    check("the demo's C major lights C on the deck too", lit);
    check("and its own minichord stays, with the presets and knobs the deck hasn't got", !!d.querySelector(".field .demo .board .pre")); }
  done();
})();
