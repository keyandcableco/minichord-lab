// Playing on a touch screen (practice/touch.js): the minichord drawn under the game and played with
// the fingers. Each game shows what it needs (chord buttons, the harp's strings or a d-pad, a knob). A
// finger plays the buttons under it, and one on the line between two rows plays both; sliding moves
// to the next chord without a slash on the way; two fingers make the rest. The modifier is held. The
// strings strum, the d-pad plucks the string the harp layout gives each direction, and the knob turns
// by how far it's dragged. Chord Sweeper flags with a long press.
const harness=require("./harness");
const [inv, sn, bo, sw, as]=["invaders","chord-snake","chord-breakout","chord-sweeper","chord-asteroids"].map(s=>harness.load(s));
const t=sw, {check, sleep}=t;
// a pointer event, as a finger sends it (jsdom has no PointerEvent of its own)
const finger=(g, el, type, id, x, y)=>{ const e=new g.w.MouseEvent(type, {clientX:x, clientY:y, bubbles:true, cancelable:true});
  Object.defineProperty(e, "pointerId", {value:id}); Object.defineProperty(e, "pointerType", {value:"touch"}); el.dispatchEvent(e); };
// jsdom lays nothing out: each part of the deck is given a size
const size=(el, w, h)=>{ el.getBoundingClientRect=()=>({left:0, top:0, right:w, bottom:h, width:w, height:h}); };
(async()=>{
  await sleep(250);
  // ---------- Chord Invaders: the chord buttons ----------
  { const {w, d, mc}=inv;
    await inv.start(0); w.eval("touchMinichord(true)"); await sleep(80);
    const deck=d.getElementById("tdeck");
    check("touch play puts the minichord on the screen", !!deck && w.eval("vmOn()") && mc.virtual===true);
    check("and it isn't keyboard play: the letters stay the games'", w.eval("kbOn()")===false);
    check("Chord Invaders shows the chord buttons and the modifier, no harp or knob",
      !!d.querySelector(".tdgrid") && d.querySelectorAll(".tdcell").length===21 && !!d.querySelector(".tdmod") && !d.querySelector(".tdharp") && !d.querySelector(".tdknob"));
    check("each button is labelled with its chord", d.querySelector('.tdcell[data-r="1"][data-c="1"]').textContent==="Cm", d.querySelector('.tdcell[data-r="1"][data-c="1"]').textContent);
    // the zones: 7 columns of 100, 3 rows of 50
    const z=(x,y)=>JSON.stringify(w.eval(`tdZone({left:0,top:0,width:700,height:150}, ${x}, ${y})`));
    check("a finger in the middle of a button presses that button", z(150,25)==='{"c":1,"rows":[0]}', z(150,25));
    check("on the line between major and minor, both", z(150,48)==='{"c":1,"rows":[0,1]}' && z(150,53)==='{"c":1,"rows":[0,1]}', z(150,48)+" "+z(150,53));
    check("on the line between minor and seventh, both", z(150,99)==='{"c":1,"rows":[1,2]}', z(150,99));
    check("the deck's outer edges press one row", z(150,2)==='{"c":1,"rows":[0]}' && z(150,148)==='{"c":1,"rows":[2]}');
    const g=d.querySelector(".tdgrid"); size(g, 700, 150);
    w.eval("window.__heard=[]; mc.addEventListener('chord', ()=>window.__heard.push(vmChordName()))");
    const heard=()=>w.eval("window.__heard.join(' ')"), clear=()=>w.eval("window.__heard=[]");
    // a press warms the piano up first (slow under jsdom)
    finger(inv, g, "pointerdown", 9, 650, 25); await sleep(120); finger(inv, g, "pointerup", 9, 650, 25); await sleep(150); clear();
    finger(inv, g, "pointerdown", 1, 150, 25); await sleep(120);
    check("a finger on C plays C", heard()==="C", heard());
    finger(inv, g, "pointerup", 1, 150, 25); await sleep(150); clear();
    finger(inv, g, "pointerdown", 1, 150, 50); await sleep(120);
    check("a thumb on the line between C and Cm plays C diminished", heard()==="C°", heard());
    finger(inv, g, "pointerup", 1, 150, 50); await sleep(150); clear();
    finger(inv, g, "pointerdown", 1, 150, 100); await sleep(120);
    check("and between Cm and C7, Cm7", heard()==="Cm7", heard());
    finger(inv, g, "pointerup", 1, 150, 100); await sleep(150); clear();
    // two fingers: C and C7, a major seventh
    finger(inv, g, "pointerdown", 1, 150, 25); finger(inv, g, "pointerdown", 2, 150, 125); await sleep(150);
    check("two fingers in a column: C and C7 make Cmaj7", heard()==="Cmaj7", heard());
    finger(inv, g, "pointerup", 1, 150, 25); finger(inv, g, "pointerup", 2, 150, 125); await sleep(150); clear();
    // sliding to the next chord
    finger(inv, g, "pointerdown", 1, 150, 25); await sleep(150); clear();
    finger(inv, g, "pointermove", 1, 250, 25); await sleep(200);
    check("sliding from C to G plays G, and no slash on the way", heard()==="G", heard());
    finger(inv, g, "pointerup", 1, 250, 25); await sleep(150); clear();
    // a slash: C held, F's button under it
    finger(inv, g, "pointerdown", 1, 150, 25); await sleep(150); clear();
    finger(inv, g, "pointerdown", 2, 50, 25); await sleep(200);
    check("C held and F pressed with another finger: C/F", heard()==="C/F", heard());
    finger(inv, g, "pointerup", 1, 150, 25); finger(inv, g, "pointerup", 2, 50, 25); await sleep(150); clear();
    check("the buttons held are lit, and none once let go", !d.querySelector(".tdcell.on"));
    // the modifier, held
    const m=d.querySelector(".tdmod");
    finger(inv, m, "pointerdown", 3, 5, 5); finger(inv, g, "pointerdown", 1, 150, 25); await sleep(150);
    const flat=w.eval("mc.params[31]")===1;
    check(`the modifier held ${flat?"flattens":"sharpens"} the chord`, heard()===(flat?"B":"C♯"), heard());
    finger(inv, g, "pointerup", 1, 150, 25); finger(inv, m, "pointerup", 3, 5, 5); await sleep(150);
    check("and let go, it's let go", w.eval("vmSharp()")===false);
    w.eval("touchMinichord(false)"); await sleep(50);
    check("put away, the screen is as it was", !d.getElementById("tdeck") && mc.virtual===false); }

  // ---------- Chord Snake: the d-pad ----------
  { const {w, d}=sn;
    w.eval("touchMinichord(true)"); await sleep(50); const a=await sn.start(0); await sleep(500);
    check("Chord Snake shows a d-pad and A and B, and the chord buttons", !!d.querySelector(".tddpad") && d.querySelectorAll(".tdz").length===6 && !!d.querySelector(".tdgrid"));
    const turn=a.dir==="up"||a.dir==="down" ? "left" : "up";
    a.queue.length=0;
    finger(sn, d.querySelector(`.tdz-${turn}`), "pointerdown", 4, 5, 5); await sleep(30); finger(sn, d.querySelector(`.tdz-${turn}`), "pointerup", 4, 5, 5);
    let ok=false; for(let i=0;i<20 && !ok;i++){ await sleep(40); ok=a.queue.includes(turn) || a.dir===turn; }
    check("the d-pad steers the snake", ok, `${turn}: ${a.dir} ${a.queue}`);
    // a bonus round played on the harp's notes: the strings while it plays, the d-pad after
    w.eval('arcadeBonus("missing")'); await sleep(600);
    check("MISSING NOTE in Chord Snake puts the strings on the deck in place of the d-pad", !!d.querySelector(".tdharp") && !d.querySelector(".tddpad"));
    const b=w.eval("blast.bonus"); for(let i=0;i<80 && !b.ready;i++) await sleep(100);
    const h=d.querySelector(".tdharp"); size(h, 1200, 40); const x=w.eval(`pcOfName(blast.bonus.ans)`)*100+50;
    finger(sn, h, "pointerdown", 11, x, 20); finger(sn, h, "pointerup", 11, x, 20); await sleep(50);
    check("and a string plucked there finds the missing note", b.n===1, `${b.n} found`);
    w.eval("clearInterval(blast.bonus.timer); blast.bonus.over=true; blast.bonus.el.remove(); blast.bonus=null; blast.phase='play'"); await sleep(600);
    check("the round over, the d-pad is back", !!d.querySelector(".tddpad") && !d.querySelector(".tdharp")); }

  // ---------- Chord Breakout: the strings and the knob ----------
  { const {w, d, mc}=bo;
    w.eval("touchMinichord(true)"); await sleep(50); await bo.start(0); await sleep(200);
    check("Chord Breakout shows the strings and a knob, and the chord buttons", !!d.querySelector(".tdharp") && !!d.querySelector(".tdknob") && !!d.querySelector(".tdgrid"));
    check("its knob steers, as a minichord's knob does", w.eval("knobsReady()")===true);
    const h=d.querySelector(".tdharp"); size(h, 1200, 40);
    w.eval("window.__harp=[]; mc.addEventListener('harp', e=>window.__harp.push('+'+e.detail.note)); mc.addEventListener('harpoff', e=>window.__harp.push('-'+e.detail.note))");
    finger(bo, h, "pointerdown", 5, 50, 20); finger(bo, h, "pointermove", 5, 150, 20); finger(bo, h, "pointermove", 5, 160, 20); finger(bo, h, "pointermove", 5, 250, 20); finger(bo, h, "pointerup", 5, 250, 20); await sleep(30);
    check("a finger strummed across three strings plucks each and lets each go", w.eval("window.__harp.join()")==="+60,-60,+61,-61,+62,-62", w.eval("window.__harp.join()"));
    const k=d.querySelector(".tdknob"); size(k, 200, 40);
    w.eval("window.__knob=[]; mc.addEventListener('knob', e=>window.__knob.push(Math.round(e.detail.value*100)))");
    finger(bo, k, "pointerdown", 6, 150, 20); finger(bo, k, "pointermove", 6, 170, 20); finger(bo, k, "pointermove", 6, 110, 20); finger(bo, k, "pointerup", 6, 110, 20); await sleep(30);
    check("the knob turns by how far it's dragged, from where it was", w.eval("window.__knob.join()")==="60,30", w.eval("window.__knob.join()"));
    // the harp as a piano's keys: an octave, the black keys over the white
    w.eval("saved.tdPiano=true; tdSync()"); await sleep(30);
    const p=d.querySelector(".tdharp.tdpiano");
    check("chosen, the harp is a piano's keys: seven white and five black", !!p && p.querySelectorAll("span.w").length===7 && p.querySelectorAll("span.b").length===5);
    check("the knob and chord buttons stay", !!d.querySelector(".tdknob") && !!d.querySelector(".tdgrid"));
    size(p, 700, 60); w.eval("window.__harp=[]");                      // white keys 100 wide, black keys over the top 36
    finger(bo, p, "pointerdown", 8, 50, 50); finger(bo, p, "pointermove", 8, 100, 10); finger(bo, p, "pointermove", 8, 150, 50); finger(bo, p, "pointermove", 8, 150, 10); finger(bo, p, "pointerup", 8, 150, 10); await sleep(30);
    check("a finger slid from C up over C♯ to D plays each key and lets each go; a white key's top, between black keys, is white", w.eval("window.__harp.join()")==="+60,-60,+61,-61,+62,-62", w.eval("window.__harp.join()"));
    finger(bo, p, "pointerdown", 9, 690, 50); finger(bo, p, "pointerup", 9, 690, 50); await sleep(30);
    check("the last key is B", w.eval("window.__harp.slice(-2).join()")==="+71,-71", w.eval("window.__harp.join()"));
    size(p, 40, 700); w.eval("window.__harp=[]");                     // standing beside the game: low at the bottom, the black keys on the left
    finger(bo, p, "pointerdown", 10, 30, 650); finger(bo, p, "pointermove", 10, 5, 600); finger(bo, p, "pointerup", 10, 5, 600); await sleep(30);
    check("standing, C is at the bottom and C♯ over it on the left", w.eval("window.__harp.join()")==="+60,-60,+61,-61", w.eval("window.__harp.join()"));
    w.eval("saved.tdPiano=false; tdSync()"); await sleep(30);
    check("and back to the strings", !!d.querySelector(".tdharp") && !d.querySelector(".tdpiano")); }

  // ---------- Chord Asteroids in manual aim: two knobs ----------
  { const {w, d}=as;
    w.eval("saved.asAim=true; touchMinichord(true)"); await sleep(50); await as.start(0); await sleep(600);
    const ks=[...d.querySelectorAll(".tdknob")];
    check("Chord Asteroids in manual aim has two knobs, to orbit and to aim", ks.map(k=>k.dataset.name).join()==="ORBIT,AIM", ks.map(k=>k.dataset.name).join());
    w.eval("window.__k=[]; mc.addEventListener('knob', e=>window.__k.push(e.detail.knob))");
    ks.forEach((k,i)=>{ size(k, 200, 40); finger(as, k, "pointerdown", 30+i, 100, 20); finger(as, k, "pointermove", 30+i, 140, 20); finger(as, k, "pointerup", 30+i, 140, 20); });
    await sleep(30);
    check("each turns its own knob: the steering one, and the other to aim", w.eval("window.__k.join()")===`${w.eval("steerKnob()")},${w.eval("asAimKnob()")}`, w.eval("window.__k.join()")); }

  // ---------- Chord Sweeper: a long press flags ----------
  { const {w, d}=sw;
    await sw.start(0); await sleep(300);
    const cell=d.querySelector(".swcell"), flags=()=>w.eval("blast.flags.size"), opened=()=>w.eval("blast.open.size"), f0=flags(), o0=opened();
    finger(sw, cell, "pointerdown", 7, 5, 5); await sleep(550); finger(sw, cell, "pointerup", 7, 5, 5);
    cell.dispatchEvent(new w.MouseEvent("click", {bubbles:true}));
    check("in Chord Sweeper a long press flags a square", flags()===f0+1, `${f0} → ${flags()}`);
    check("and the tap that ends it doesn't sweep it", opened()===o0, `${o0} → ${opened()}`); }
  t.done();
})();
