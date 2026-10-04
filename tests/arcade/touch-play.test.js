// Playing on a touch screen (practice/touch.js): the minichord drawn under the game and played with
// the fingers. Each game shows what it needs (chord buttons, the harp's strings or a d-pad, a knob). A
// finger plays the buttons under it, and one on the line between two rows plays both; sliding moves
// to the next chord without a slash on the way; two fingers make the rest. The modifier is held. The
// modifier latches with a long press, and a chord button held sets the key from it. The
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
    // one hand: a long press latches the modifier, another lets it go; a double tap still flips it
    finger(inv, m, "pointerdown", 4, 5, 5); await sleep(600); finger(inv, m, "pointerup", 4, 5, 5); await sleep(50);
    check("a long press on the modifier latches it, lit as such", w.eval("vmSharp() && td.latched") && m.classList.contains("latched")); clear();
    finger(inv, g, "pointerdown", 1, 150, 25); await sleep(150);
    check("latched, a chord's played as if it were held", heard()===(flat?"B":"C♯"), heard());
    finger(inv, g, "pointerup", 1, 150, 25); await sleep(150); clear();
    const dir=w.eval("mc.params[31]"); w.eval("mc.params[200]=31; mc.params[201]=1-mc.params[31]");   // as a game points the double tap
    for(let i=0;i<2;i++){ finger(inv, m, "pointerdown", 5, 5, 5); await sleep(60); finger(inv, m, "pointerup", 5, 5, 5); await sleep(60); }
    check("a double tap still flips it, latched", w.eval("mc.params[31]")===1-dir && w.eval("td.latched && vmSharp()"), w.eval("mc.params[31]"));
    await sleep(450); finger(inv, m, "pointerdown", 6, 5, 5); await sleep(600); finger(inv, m, "pointerup", 6, 5, 5); await sleep(50);
    check("another long press lets it go, however many fingers held it", w.eval("vmSharp()")===false && !m.classList.contains("latched"));
    finger(inv, m, "pointerdown", 7, 5, 5); await sleep(100); finger(inv, g, "pointerdown", 1, 150, 25); await sleep(600);
    finger(inv, g, "pointerup", 1, 150, 25); finger(inv, m, "pointerup", 7, 5, 5); await sleep(150); clear();
    check("held long with a chord under it, it's only held", w.eval("vmSharp() || td.latched")===false);
    // one hand: a chord button held sets the key from it, the rows sharp, natural and flat
    const keyAfter=async(x,y,ms)=>{ finger(inv, g, "pointerdown", 20, x, y); await sleep(ms); finger(inv, g, "pointerup", 20, x, y); await sleep(80); return w.eval("mc.keyName"); };
    check("a chord button let go before the key's set changes nothing", await keyAfter(350, 75, 500)==="C");
    finger(inv, g, "pointerdown", 21, 350, 75); await sleep(500);
    check("held, it fills, naming the key it'll set", d.querySelector('.tdcell[data-c="3"][data-r="1"]').classList.contains("keying") && d.querySelector('.tdcell[data-c="3"][data-r="1"]').dataset.key==="D");
    await sleep(650);
    check("held a second, D's natural button sets D major", w.eval("mc.keyName")==="D", w.eval("mc.keyName"));
    check("and says so over the game", /KEY OF D/.test(d.querySelector(".tdkey")?.textContent||""), d.querySelector(".tdkey")?.textContent);
    check("the press is spent: its chord let go", !d.querySelector(".tdcell.on") && w.eval("vmChordName()")==="");
    finger(inv, g, "pointerup", 21, 350, 75); await sleep(80);
    check("F's top button sets F♯, B's bottom B♭, F's bottom F♭, B's top B♯",
      [await keyAfter(50,25,1100), await keyAfter(650,125,1100), await keyAfter(50,125,1100), await keyAfter(650,25,1100)].join()==="F♯,B♭,F♭,B♯");
    finger(inv, g, "pointerdown", 22, 150, 75); await sleep(300); finger(inv, g, "pointermove", 22, 250, 75); await sleep(900); finger(inv, g, "pointerup", 22, 250, 75); await sleep(80);
    check("a finger slid to another chord sets no key", w.eval("mc.keyName")==="B♯");
    finger(inv, g, "pointerdown", 23, 150, 25); finger(inv, g, "pointerdown", 24, 450, 25); await sleep(1100);
    finger(inv, g, "pointerup", 23, 150, 25); finger(inv, g, "pointerup", 24, 450, 25); await sleep(80); clear();
    check("nor two held together (a slash chord)", w.eval("mc.keyName")==="B♯");
    w.eval("mc.writeParam(35,0)");
    w.eval("touchMinichord(false)"); await sleep(50);
    check("put away, the screen is as it was", !d.getElementById("tdeck") && mc.virtual===false); }

  // ---------- Chord Snake: the d-pad ----------
  { const {w, d}=sn;
    w.eval("touchMinichord(true)"); await sleep(50); const a=await sn.start(0); await sleep(500);
    check("Chord Snake shows a d-pad and A and B, and the chord buttons", !!d.querySelector(".tddpad") && d.querySelectorAll(".tdz").length===6 && !!d.querySelector(".tdgrid"));
    const turn=a.dir==="up"||a.dir==="down" ? "left" : "up";
    a.queue.length=0; w.eval("window.__notes=0; { const play=piano.play; piano.play=function(...x){ window.__notes++; return play.apply(this, x); }; }");
    finger(sn, d.querySelector(`.tdz-${turn}`), "pointerdown", 4, 5, 5); await sleep(30); finger(sn, d.querySelector(`.tdz-${turn}`), "pointerup", 4, 5, 5);
    let ok=false; for(let i=0;i<20 && !ok;i++){ await sleep(40); ok=a.queue.includes(turn) || a.dir===turn; }
    check("the d-pad steers the snake", ok, `${turn}: ${a.dir} ${a.queue}`);
    check("silently: the d-pad steers, it plays no note", w.eval("window.__notes")===0, w.eval("window.__notes")+" notes");
    // the d-pad is a thumb stick: the way from where the thumb is, changing as it slides, steady by the
    // diagonal, nothing in the middle. The arrows laid out as a 150-pixel square, centred on (75, 75).
    { const pad=d.querySelector(".tddpad"), at={up:[50,0], left:[0,50], right:[100,50], down:[50,100]};
      for(const [z,[x,y]] of Object.entries(at)){ const el=d.querySelector(`.tdz-${z}`); el.getBoundingClientRect=()=>({left:x, top:y, right:x+50, bottom:y+50, width:50, height:50}); }
      size(pad, 400, 150);
      w.eval("window.__ways=[]; mc.addEventListener('harp', e=>__ways.push(kmControl(e.detail.note)))");
      const ways=()=>w.eval("__ways.join(' ')"), slide=(x,y)=>finger(sn, pad, "pointermove", 7, x, y);
      finger(sn, pad, "pointerdown", 7, 75, 20);
      check("a thumb landing above the middle is up, at once", ways()==="up", ways());
      slide(35, 40); check("held past the diagonal only a little, it stays up", ways()==="up", ways());
      slide(20, 70); check("slid round to the left, without lifting, it's left", ways()==="up left", ways());
      check("the arrow showing the way lit, and a dot under the thumb", d.querySelector(".tdz-left").classList.contains("on") && !d.querySelector(".tdz-up").classList.contains("on") && !d.querySelector(".tdstickdot").hidden);
      slide(75, 78); slide(75, 20); check("back to the middle and out again: up again, a second pluck", ways()==="up left up", ways());
      slide(130, 70); slide(75, 140);
      finger(sn, pad, "pointerup", 7, 75, 140);
      check("right and down; let go, nothing lit and the dot gone", ways()==="up left up right down" && !d.querySelector(".tdz.on") && d.querySelector(".tdstickdot").hidden, ways());
      w.eval("__ways.length=0"); finger(sn, pad, "pointerdown", 8, 360, 75); finger(sn, pad, "pointerup", 8, 360, 75);
      check("a touch off the pad (by A and B) steers nothing", ways()==="", ways()); }
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
