// Help for a player on a touch screen: the rules speak of what's under the game, not the keys and the
// mouse; a knob is on the screen whenever the game wants one (Chord Invaders' manual aim, a bonus
// round tuned by a knob); beginner mode lights what to press on the deck itself; and the first time,
// a word on the thumb between two rows and the double tap.
const harness=require("./harness");
const [bo, inv]=["chord-breakout","invaders"].map(s=>harness.load(s));
const t=inv, {check, sleep}=t;
(async()=>{
  await sleep(250);
  // ---------- the words ----------
  { const {w}=bo;
    const rules=()=>w.eval("BOMENU_G.rules()"), press=()=>w.eval("cabPress()"), tune=()=>w.eval("BONUS_GAMES.find(g=>g.id==='tune').instr");
    check("with a minichord, the rules speak of the mouse and the keys", /MOUSE|ARROW|KNOB ON THE MINICHORD/.test(rules()) && /ANY KEY/.test(press()));
    w.eval("touchMinichord(true)"); await sleep(50);
    check("on the screen, of what's under the game", /UNDER THE GAME/.test(rules()) && !/MOUSE|ARROW KEYS/.test(rules()), rules().slice(0,90));
    check("and a title screen wakes with a tap", /TAP THE SCREEN/.test(press()) && !/ANY KEY/.test(press()), press());
    check("TUNE IT too", /UNDER THE GAME/.test(tune()) && !/ARROW/.test(tune()), tune());
    w.eval("touchMinichord(false)"); }

  // ---------- a knob when the game wants one ----------
  { const {w, d}=inv;
    w.eval("touchMinichord(true)"); await sleep(50);
    check("Chord Invaders on the screen: no knob, since it aims itself", !d.querySelector(".tdknob"));
    w.eval("saved.invAim=true; tdSync()"); await sleep(20);
    check("in manual aim, a knob to steer the ship", d.querySelectorAll(".tdknob").length===1);
    w.eval("saved.invAim=false; tdSync()"); await sleep(20);
    check("and none again when it's back to aiming itself", !d.querySelector(".tdknob"));
    w.eval("blast.bonus={over:false, g:BONUS_GAMES.find(g=>g.id==='tune')}; tdSync()"); await sleep(20);
    check("a bonus round tuned by a knob has one while it plays", d.querySelectorAll(".tdknob").length===1);
    w.eval("blast.bonus.over=true; tdSync(); blast.bonus=null"); await sleep(20);
    check("and it goes when the round's over", !d.querySelector(".tdknob")); }

  // ---------- beginner mode, on the deck ----------
  { const {w, d}=inv;
    w.eval("saved.beginner=true"); await inv.start(0); await sleep(300); w.eval("helperSync(); tdSync()"); await sleep(50);
    // the game lights its own minichord's buttons (helpChord, for the chord falling lowest); the deck follows
    const light=(c,r,cls="lit")=>w.eval(`blast.helpBoard.cells[${c}][${r}].classList.add("${cls}")`);
    const clear=()=>w.eval(`blast.helpBoard.el.querySelectorAll(".lit,.slashlit").forEach(e=>e.classList.remove("lit","slashlit"))`);
    clear(); light(5,1); w.eval(`blast.helpBoard.mod.classList.add("lit")`); await sleep(80);    // E♭m in C: the E column's minor, and the modifier
    const hinted=()=>[...d.querySelectorAll(".tdcell.hint")].map(c=>c.dataset.r+":"+c.dataset.c).join();
    check("beginner mode lights the chord's buttons on the deck", hinted()==="1:5", hinted());
    check("and the modifier, when the key doesn't give that root", d.querySelector(".tdmod").classList.contains("hint"));
    clear(); w.eval(`blast.helpBoard.mod.classList.remove("lit")`); light(2,2); light(6,0,"slashlit"); await sleep(80);   // G7/B
    check("a new chord moves the light, and a slash's bass is shown", hinted()==="2:2" && d.querySelector('.tdcell[data-r="0"][data-c="6"]').classList.contains("slashhint") && !d.querySelector(".tdmod").classList.contains("hint"), hinted());
    w.eval("saved.beginner=false"); }

  // ---------- the modifier's way, and the buttons bare ----------
  { const {w, d}=inv;
    w.eval("mc.params[31]=0; mc.dispatchEvent(new Event('device'))"); await sleep(20);
    check("the modifier on the screen shows ♯ when it sharpens", d.querySelector(".tdmod").textContent==="♯");
    w.eval("mc.params[31]=1; mc.dispatchEvent(new Event('device'))"); await sleep(20);
    check("and ♭ when it flattens", d.querySelector(".tdmod").textContent==="♭");
    const m0=w.eval("diffMult('blaster')");
    w.eval("saved.tdBare=true; tdDraw()"); await sleep(20);
    check("the chord buttons played bare show nothing, as on the instrument", [...d.querySelectorAll(".tdcell")].every(c=>c.textContent===""));
    check("and score a quarter more", Math.abs(w.eval("diffMult('blaster')")-m0*1.25)<.02, `${m0} → ${w.eval("diffMult('blaster')")}`);
    w.eval("saved.tdBare=false; tdDraw()"); await sleep(20);
    check("labelled again, they say their chords", d.querySelector('.tdcell[data-r="1"][data-c="1"]').textContent==="Cm");
    // the choice, on a title screen's options
    const opts=d.createElement("div"); opts.innerHTML='<div class="levels"></div>'; w.eval("window.__opts=null"); w.__opts=opts;
    w.eval("beginnerRow(window.__opts)");
    check("the options offer the buttons labelled or bare", [...opts.querySelectorAll(".optlabel")].some(l=>l.textContent==="BUTTONS") && /BARE ×1.25/.test(opts.textContent));
    check("but not the strings, with no harp on the deck", ![...opts.querySelectorAll(".optlabel")].some(l=>l.textContent==="STRINGS")); }

  // ---------- the harp's strings bare ----------
  { const {w, d}=bo;
    w.eval("touchMinichord(true)"); await sleep(50);
    const strings=()=>[...d.querySelectorAll(".tdharp span")].map(s=>s.textContent);
    check("the harp's strings on the screen are named, C to B", strings().join()===w.eval("SHARP_NAMES.join()"), strings().join());
    const m0=w.eval("diffMult('breakout')");
    w.eval("saved.tdHarpBare=true; tdDraw()"); await sleep(20);
    check("played bare, they show nothing, as on the instrument", strings().length===12 && strings().every(t=>t===""));
    check("and score a quarter more", Math.abs(w.eval("diffMult('breakout')")-m0*1.25)<.02, `${m0} → ${w.eval("diffMult('breakout')")}`);
    check("but not in Chord Hunt, whose harp is only low or high", w.eval("HARP_BY_NAME.has('hunt')")===false && w.eval("harpBareWord('hunt')")==="BARE");
    const opts=d.createElement("div"); opts.innerHTML='<div class="levels"></div>'; w.__opts=opts;
    w.eval("beginnerRow(window.__opts)");
    check("the options offer the strings labelled or bare", [...opts.querySelectorAll(".optlabel")].some(l=>l.textContent==="STRINGS"));
    check("the points page lists it", w.eval("multRows('breakout').some(([n])=>n==='STRINGS')"));
    w.eval("saved.tdHarpBare=false; tdDraw()"); await sleep(20);
    check("labelled again, they say their notes", strings()[0]==="C");
    w.eval("touchMinichord(false)"); }

  // ---------- the first time ----------
  { const {w, d}=inv;
    w.eval("touchMinichord(false); delete saved.tdTip2; touchMinichord(true)"); await sleep(30);
    check("the first time on a device, a word on what isn't plain to see", /BETWEEN TWO ROWS/.test((d.querySelector(".tdtip")||{}).textContent||""));
    d.dispatchEvent(new inv.w.MouseEvent("pointerdown", {bubbles:true})); await sleep(500);
    w.eval("touchMinichord(false); touchMinichord(true)"); await sleep(30);
    check("a touch puts it away, and it isn't said again", !d.querySelector(".tdtip")); }
  t.done();
})();
