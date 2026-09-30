// The Practice Room itself: borrowing settings and giving them back, remembered settings and scores,
// rounds, answers, pickers, modes, your minichord, and connecting. Runs last, and starts whatever the
// page opened on.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- borrowing settings, and always giving them back ----------
const borrowed={};
// what the games have set, so it can be set again if a preset is loaded on the instrument mid-game
const wanted={};
// everything the current round has set, so switching games never gives back what the new
// game just borrowed (the key signature, Barry Harris mode, slash voice…)
const roundBorrows=new Set();
/** set addr to value for this round: borrowed if it differs, and kept if an earlier round already set it */
function ensure(addr,value){
  if(!canWrite()) return;
  wanted[addr]=value;
  if((mc.params[addr]??0)!==value) borrow(addr,value);
  else if(addr in borrowed) roundBorrows.add(addr);
}
function borrow(addr,value){
  if(!canWrite()) return;
  roundBorrows.add(addr); wanted[addr]=value;
  if(!(addr in borrowed)) borrowed[addr]=mc.params[addr] ?? 0;
  mc.writeParam(addr,value);
  $("restore").hidden=false; mine();
  if(addr===31) modTap();
}
// The double tap, two quick taps of the modifier, flips it between sharp and flat, so a player can
// switch without reaching for the mouse. The firmware's double tap sets one setting (address 200)
// to a value (201), and a second double tap puts it back: so the game points it at the modifier and
// gives it the other direction from the one set now, again whenever it sets the modifier. The
// player's own double tap goes back when they leave.
function modTap(){
  if(settings.modTap==="off" || !canWrite() || !hasSetting(200) || !hasSetting(31)) return;
  if(mc.params[200]!==31) borrow(200,31);
  const flip=mc.params[31]===1 ? 0 : 1;
  if(mc.params[201]!==flip) borrow(201,flip);
  // the double tap does this one job here: a preset's other pairs (firmware 19) would switch its B side
  // too, the alternate chord layout among it, and then no chord a game asks for could be played
  for(const a of [209,211]) if(hasSetting(a) && mc.params[a]) borrow(a,0);
}
function restoreAll(){
  const back=Object.entries(borrowed);
  for(const [a] of back) delete borrowed[a];            // clear first, so the panel redraws without them
  for(const a of Object.keys(wanted)) delete wanted[a];
  for(const [a,v] of back) mc.writeParam(+a, v);
  $("restore").hidden=true; stopTones(); mine();
  if(mc.out) setTimeout(()=>mc.requestDump(),200);
}
function restoreExcept(keep){
  const back=Object.entries(borrowed).filter(([a])=>!keep.has(+a));
  if(!back.length) return [];
  for(const [a] of back) delete borrowed[a];
  for(const [a,v] of back) mc.writeParam(+a, v);
  $("restore").hidden=!Object.keys(borrowed).length; stopTones(); mine();
  if(mc.out) setTimeout(()=>mc.requestDump(),200);
  return back.map(([a])=>+a);
}
$("restore").onclick=()=>{ userRestored=true; restoreAll(); needs(); feedback("Your settings are back as they were.",""); };
addEventListener("pagehide", restoreAll);

// ---------- settings and scores (remembered) ----------
const settings={mode:"spell", set:"standard", order:"ordered", doubles:"off", secondary:"off", keysrc:"follow", scaleset:"everyday", dirset:"steps", sounds:true, tuneWave:"sine", blastStart:"1", advance:"slow", textSize:"1", promptFont:"serif", reshapeLevel:"1", hiddenPool:"basic", shadesMode:"order", modTap:"on"};
const saved={best:{}, sprint:{}};
// saved under its old name, so settings and best scores carry over from when it was Spellbound
try{ const s=JSON.parse(localStorage.getItem("lab-spellbound")||"{}"); Object.assign(settings,s.settings||{}); Object.assign(saved,s.saved||{}); }catch(e){}
if(!LABELS[settings.mode]) settings.mode="spell";
// A link can open one game directly, ?game=invaders (or any game's name, like ?game=reshape),
// and ?solo shows that game on its own, without the menu, the settings or the answer area.
const urlParams=new URLSearchParams(location.search);
const GAME_SLUGS={invaders:"blaster", "chord-invaders":"blaster", "harp-command":"command", harpcommand:"command", "chord-snake":"snake", "chord-asteroids":"asteroids", asteroids:"asteroids", "chord-stack":"stack", "chord-breakout":"breakout", breakout:"breakout", "fifths-defender":"fifths", fifths:"fifths", "chopper-rescue":"chopper", chopper:"chopper", "key-fleet":"fleet", fleet:"fleet", "chord-sweeper":"sweeper", sweeper:"sweeper", "between-the-frets":"frets", frets:"frets", "sight-line":"sight", sight:"sight", sevenchords:"diatonic", layout:"hidden"};
{ const g=(urlParams.get("game")||"").toLowerCase(), k=GAME_SLUGS[g]||g; if(LABELS[k]) settings.mode=k; }
const solo=urlParams.has("solo") && LABELS[settings.mode] && !!urlParams.get("game");
if(!SETS[settings.set] || settings.set==="alt") settings.set="standard";
const save=()=>{ try{ localStorage.setItem("lab-spellbound",JSON.stringify({settings,saved})); }catch(e){} };
for(const id of ["set","order","doubles","secondary","keysrc","scaleset","dirset","advance","textSize","promptFont","reshapeLevel","hiddenPool","shadesMode","modTap"]){ $(id).value=settings[id]; $(id).onchange=e=>{ settings[id]=e.target.value; save(); buildPicker(); applyDisplay(); }; }
// Display: the whole page scales with the text size, and the plain font swaps the serif of
// prompts and chord names for Atkinson Hyperlegible
function applyDisplay(){
  document.querySelector("main").style.zoom = settings.textSize==="1" ? "" : settings.textSize;
  document.documentElement.classList.toggle("plainfont", settings.promptFont==="plain");
}
applyDisplay();
const stats={streak:0, asked:0, clean:0, times:[]};   // times: seconds to a first-time right answer, recent ones
function scoreboard(){
  $("streak").textContent=stats.streak; $("best").textContent=saved.best[settings.mode]||0;
  $("acc").textContent= stats.asked ? `${Math.round(stats.clean/stats.asked*100)}%` : "–";
  const t=stats.times.slice(-10); $("avg").textContent = t.length ? `${(t.reduce((a,b)=>a+b,0)/t.length).toFixed(1)} s` : "–";
}

// ---------- chimes ----------
// Soft sine bells, quiet and high enough to sit above the minichord without clashing:
// a single short note for each right step of a path, scale or chord, and a rising pair for
// a right answer. Off with the Sounds button.
function chime(kind){
  if(!settings.sounds || !piano.ctx) return;
  if(piano.ctx.state!=="running"){ piano.ctx.resume().then(()=>{ if(piano.ctx.state==="running") chime(kind); }).catch(()=>{}); return; }
  const ctx=piano.ctx, t0=ctx.currentTime+.01;
  const bell=(freq,at,level,dur)=>{
    for(const [mult,amp] of [[1,1],[2.76,.12],[5.4,.04]]){          // a bell's inharmonic partials, faint
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type="sine"; o.frequency.value=freq*mult;
      g.gain.setValueAtTime(0,at); g.gain.linearRampToValueAtTime(level*amp,at+.008);
      g.gain.exponentialRampToValueAtTime(.0001,at+dur);
      o.connect(g).connect(ctx.destination); o.start(at); o.stop(at+dur+.05);
    }
  };
  if(kind==="step") bell(1318.5,t0,.05,.35);                       // E6
  else { bell(1046.5,t0,.06,.7); bell(1568,t0+.11,.06,.9); }       // C6 then G6
}
function soundButton(){ const b=$("soundBtn"); b.setAttribute("aria-pressed",settings.sounds); b.textContent = settings.sounds ? "Sounds on" : "Sounds off"; }
$("soundBtn").onclick=()=>{ settings.sounds=!settings.sounds; save(); soundButton(); if(settings.sounds){ piano.start(); chime("step"); } };
soundButton();

// ---------- the answer on a keyboard ----------
// Once a round is answered or revealed, its notes light up on a piano: a chord from its root
// up, a slash chord with its bass below, a scale up to its octave, a note among the scale or
// chord it belongs to. The root is in the accent colour, the rest in blue, and context notes
// paler. Each lit key carries its name as the round spells it.
const WHITE_PC=[0,2,4,5,7,9,11], BLACK_PC=[1,3,6,8,10];
/** names in order, stacked upward from `start` (a MIDI note), each above the one before */
function stackUp(names, start){
  const out=[]; let prev=start-1;
  for(const n of names){ let m=start-mod(start,12)+pcOfName(n); while(m<=prev) m+=12; out.push({midi:m,name:n}); prev=m; }
  return out;
}
function keyNotes(){
  if(!q) return null;
  const a=q.answer, lit=(list,rootName)=>list.map(x=>({...x, root: rootName!=null && pcOfName(x.name)===pcOfName(rootName)}));
  if(a.type==="chord" && a.tones) return lit(stackUp(a.tones,48+pcOfName(a.tones[0])),a.spellRoot);
  if(a.type==="slash" && a.tones){ const b={midi:36+a.bass,name:a.bassName,root:false}; return [b, ...lit(stackUp(a.tones,48+a.root),a.spellRoot)]; }
  if(a.type==="key"){ const t=a.tonicName, sc=[0,1,2,3,4,5,6].map(i=>above(t,i,MAJOR[i])).concat([t]); return lit(stackUp(sc,48+a.tonic),t); }
  if(a.type==="collect" && a.tones) return lit(stackUp(a.tones,48+pcOfName(a.tones[0])),a.tones[0]);
  if(q.kind==="diatonic"){ const t=diat.name, sc=[0,1,2,3,4,5,6].map(i=>above(t,i,MAJOR[i])).concat([t]); return lit(stackUp(sc,48+pcOfName(t)),t); }
  if(q.scaleNames){ const r=q.scaleNames[0]; return lit(stackUp(q.scaleNames.concat([r]),48+pcOfName(r)),r); }
  if(a.type==="reshape" && reshape){ const tn=reshape.names; const list=[...tn.entries()].map(([pc,name])=>({midi:48+pc,name})); const r=pcOfName(reshape.root);
    return stackUp(list.sort((x,y)=>mod(pcOfName(x.name)-r,12)-mod(pcOfName(y.name)-r,12)).map(x=>x.name), 48+r).map(x=>({...x, root:false, dim:!reshape.newPcs.includes(pcOfName(x.name)) && reshape.bassPc==null}));
  }
  if(a.type==="sequence" && q.nameOf){ const names=a.pcs.map(pc=>q.nameOf(pc)); return lit(stackUp(names,48+a.pcs[0]),names[0]); }
  if(a.type==="note"){
    // the note among its scale (Harp hunt) or chord (Missing note)
    let ctx=null;
    if(q.kind==="harp" && q.pressRoot){ const t=q.pressRoot; ctx=[0,1,2,3,4,5,6].map(i=>above(t,i,MAJOR[i])); }
    if(q.kind==="missing"){ const m=q.prompt.match(/^(\S+) = /); const sym=m&&m[1]; const qq=Object.keys(FORM).sort((x,y)=>y.length-x.length).find(x=>sym.endsWith(x)); const root=sym.slice(0,sym.length-(qq||"").length); ctx=spellChord(root,qq||""); }
    if(!ctx) return [{midi:60+a.pc,name:a.name,root:true}];
    return stackUp(ctx,48+pcOfName(ctx[0])).map(x=>({...x, root:pcOfName(x.name)===a.pc, dim:pcOfName(x.name)!==a.pc}));
  }
  return null;
}
function drawKeys(notes){
  const svg=$("keys");
  if(!notes || !notes.length){ svg.setAttribute("hidden",""); return; }
  const lo=Math.min(...notes.map(n=>n.midi)), hi=Math.max(...notes.map(n=>n.midi));
  const start=lo-mod(lo,12), octs=Math.max(2,Math.ceil((hi-start+1)/12)), end=start+12*octs;
  const W=22, H=86, BH=54, BW=14, NS="http://www.w3.org/2000/svg";
  const whites=[]; for(let m=start;m<end;m++) if(WHITE_PC.includes(mod(m,12))) whites.push(m);
  svg.innerHTML=""; svg.setAttribute("viewBox",`0 0 ${whites.length*W+2} ${H+3}`); svg.removeAttribute("hidden");
  const el=(t,a,txt)=>{ const e=document.createElementNS(NS,t); for(const k in a) e.setAttribute(k,a[k]); if(txt!=null) e.textContent=txt; svg.appendChild(e); return e; };
  const at=new Map(notes.map(n=>[n.midi,n])), cls=n=> n ? (n.dim ? " dim" : n.root ? " root" : " on") : "";
  const xOf=m=>{ const i=whites.indexOf(m); return i>=0 ? 1+i*W : null; };
  whites.forEach((m,i)=>el("rect",{class:"w"+cls(at.get(m)),x:1+i*W,y:1,width:W,height:H,rx:2}));
  for(let m=start;m<end;m++) if(BLACK_PC.includes(mod(m,12))){ const x=xOf(m-1)+W-BW/2; el("rect",{class:"b"+cls(at.get(m)),x,y:1,width:BW,height:BH,rx:1.5}); }
  // names inside the keyboard: a white key's at the foot of the key, a black key's just below it,
  // so neighbours a semitone apart never collide
  for(const n of notes){ if(n.dim) continue; const white=WHITE_PC.includes(mod(n.midi,12));
    const x = white ? xOf(n.midi)+W/2 : xOf(n.midi-1)+W, y = white ? H-7 : BH+13, w=[...n.name].length*7+5;
    el("rect",{class:"lab",x:x-w/2,y:y-11,width:w,height:14,rx:4}); el("text",{x,y},n.name); }
}
function showKeys(){ try{ drawKeys(keyNotes()); }catch(e){ $("keys").setAttribute("hidden",""); } }
// Key detective: the numerals under the chords, once you've guessed wrong or it's answered
function showNumerals(){ if(q && q.kind==="key") $("prompt").classList.add("shownum"); }

// ---------- a round ----------
let simonShow=false, rebuilding=false;   // by ear; the numbers are an opt-in help
let q=null, solved=false, firstTry=true, keyAtStart=null, sprint=null, tuneState=null, qStart=0;
function modeFor(){ return settings.mode==="mix" ? rnd(["spell","numeral","staff","key"]) : settings.mode; }
const TIMED=new Set(["reshape","diatonic","spell","numeral","staff","slash","key","harp","missing","chordscale","pluckchord","buildscale","directions"]);
// Each question sets the modifier the way its answer needs: a sharp the key signature
// doesn't give needs "sharpen", a flat needs "flatten". Given back with the other borrowed settings.
function modifierFor(name){
  if(!name || !canWrite()) return;
  const {li,acc}=parse(name), ka=keyAcc(li,devFifths());
  if(acc===ka) return;
  const want = acc>ka ? 0 : 1;
  q.usesMod=true;
  ensure(31,want);
}
// The modifier pill: which way the modifier goes right now, whether the game set it, and a
// pulse whenever it changes, so a question that needs it never catches you out.
let lastMod=null;
function modPill(){
  const el=$("modpill");
  if(mc.params[31]===undefined || !canWrite()){ el.hidden=true; return; }
  el.hidden=false;
  const sharp=mc.params[31]!==1, set=31 in borrowed;
  el.textContent=`Modifier ${sharp?"♯ sharpens":"♭ flattens"}${set?" · set for you":""}${q && q.usesMod && !solved?" · this one needs it":""}`;
  el.title = (set ? "The game switched the modifier this way so every answer is one button plus the modifier. It goes back when you leave." : "The modifier as your minichord has it.")
    + (settings.modTap!=="off" ? " Double-tap the modifier to flip it between sharp and flat." : "");
  if(settings.modTap!=="off" && mc.params[200]===31) el.textContent+=" · double-tap flips";
  if(lastMod!==null && lastMod!==mc.params[31]){ el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
  lastMod=mc.params[31];
  // Barry Harris mode: shown whenever it's on or the game has set it either way
  const bh=$("bhpill"), on=mc.params[33]===1, bset=33 in borrowed;
  bh.hidden = !(on || bset);
  bh.textContent = on ? `Barry Harris on: major, minor and dim play 6, m6 and °7${bset?" · set for you":""}` : "Barry Harris off · set for you";
  bh.title = "Barry Harris mode (address 33). The game sets it for each chord it asks for, and it goes back when you leave.";
  if(lastBarry!==null && lastBarry!==mc.params[33]){ bh.classList.remove("pulse"); void bh.offsetWidth; bh.classList.add("pulse"); }
  lastBarry=mc.params[33];
  altPill();
}
let lastBarry=null, lastAlt=null;
// the alternate chord layout: shown whenever it's on, so the switch the games make is never a surprise
function altPill(){
  const el=$("altpill"), on=mc.params[39]===1, set=39 in borrowed;
  el.hidden=!(on || set);
  el.textContent = on ? `Alternate chord layout on${set?" · set for you":""}` : "Standard chord layout · set for you";
  el.title="The chord layout (address 39). The alternate layout's games switch it on and load its chords, and it goes back when you leave.";
  if(lastAlt!==null && lastAlt!==mc.params[39]){ el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
  lastAlt=mc.params[39];
}
// Every game but the temperament taster runs in equal temperament: in 19 and 31 the chromatic
// harp steps by the division's own steps and MIDI rounds to the nearest semitone, and the
// twelve-note temperaments would colour every listening round.
const EQUAL={addr:237,value:0,what:"equal temperament"};
const STANDARD_LAYOUT={addr:39,value:0,what:""};   // said aloud only by the layout pill, not in the list
// Barry Harris mode (address 33) turns the major, minor and diminished buttons into 6, m6
// and diminished 7, so each question sets it the way its chord needs, like the modifier:
// on for those three, off for plain major, minor and diminished, and left alone otherwise.
const BARRY_ON=new Set(["6","m6","°7"]), BARRY_OFF=new Set(["","m","°"]);
function barryFor(qq){
  if(qq==null || !canWrite()) return;
  const want = BARRY_ON.has(qq) ? 1 : BARRY_OFF.has(qq) ? 0 : null;
  if(want!=null) ensure(33,want);
  modPill();
}
/** apply what the round needs, borrowing it so it goes back when you leave the game */
let building=false, userRestored=false;   // don't apply while a round is being built, or after "Put my settings back"
// A need for a setting the minichord's firmware doesn't report is already met: stock firmware has
// no temperament setting, so it's always in equal temperament, and asking for it would only write
// to an address it ignores and ask again, round and round.
const hasSetting=a=>Number.isFinite(mc.params[a]);   // the dump fills every address; ones this firmware lacks come back as NaN
const unmet=n=> hasSetting(n.addr) && (n.ok ? !n.ok(mc.params[n.addr]) : mc.params[n.addr]!==n.value);
function applyNeeds(){
  if(!q || !q.needs || !canWrite() || building || userRestored) return;
  const missing=q.needs.filter(unmet);
  if(missing.length){ missing.forEach(n=>borrow(n.addr,n.value)); setTimeout(()=>mc.requestDump(),200); }
}
// The last round, kept when a new one starts: its prompt and everything its answer showed
// (the explanation, the keyboard, the layout's buttons), for the Last answer button.
let lastRound=null;
function keepLastRound(){
  if(!q || !(solved || revealedThis)) return;
  const fb=$("feedback").cloneNode(true); fb.removeAttribute("id");
  const keys=$("keys"); const k = keys.hasAttribute("hidden") ? null : keys.cloneNode(true);
  if(k) k.removeAttribute("id");
  lastRound={prompt:$("prompt").textContent, what:$("what").textContent, fb, keys:k};
  $("lastBtn").disabled=false;
}
function showLastRound(){
  const box=$("lastRound");
  if(!lastRound || !box.hidden){ box.hidden=true; $("lastBtn").setAttribute("aria-pressed","false"); return; }
  box.innerHTML=""; const h=document.createElement("p"); h.className="lastprompt"; h.textContent=`Last round (${lastRound.what}): ${lastRound.prompt}`;
  box.append(h, lastRound.fb.cloneNode(true)); if(lastRound.keys){ const k=lastRound.keys.cloneNode(true); k.style.display="block"; box.append(k); }
  box.hidden=false; $("lastBtn").setAttribute("aria-pressed","true");
}
let revealedThis=false;
function nextQuestion(){
  keepLastRound(); revealedThis=false; $("lastRound").hidden=true; $("lastBtn").setAttribute("aria-pressed","false");
  userRestored=false; roundBorrows.clear(); heldVoices=[]; alt=null;
  stopTones(); stopBlaster(); clearTimeout(pendingWrong); pendingWrong=null;
  harpQuietUntil=performance.now()+150;
  building=true; try{ q=GENS[modeFor()](); } finally { building=false; } solved=false; firstTry=true; keyAtStart=mc.keyIndex; pick={root:null,q:null,bass:null}; qStart=performance.now();
  $("what").textContent = settings.mode==="mix" ? `Mix · ${LABELS[q.kind]}` : LABELS[q.kind];
  const pr=$("prompt");
  pr.classList.remove("shownum"); $("keys").setAttribute("hidden","");
  if(q.promptHtml){ pr.innerHTML=q.promptHtml; }
  else if(q.gapPrompt){ pr.innerHTML=q.prompt.replace("?", '<span class="gap">?</span>'); } else pr.textContent=q.prompt;
  pr.style.wordSpacing = ["spell","key","missing"].includes(q.kind) ? ".25em" : "normal";
  pr.classList.toggle("long", q.prompt.length>26);          // sentences get a smaller size than a chord's letters   // wide gaps between letters, not words
  $("staff").toggleAttribute("hidden", q.kind!=="staff" && q.kind!=="diatonic");   // an SVG element: toggle the attribute, not a property
  if(q.kind==="staff"){ FORM_STEPS=FORM[q.answer.q].map(f=>f[0]); drawStaff(q.staff); }
  if(q.kind==="diatonic") drawKeySig(q.keysig, diat.name);
  $("sub").textContent=q.sub;
  buildSpecial(); needs(); feedback("");
  ["hint","hear","reveal"].forEach(id=>$(id).disabled=false);
  $("hear").disabled = q.kind==="tune";
  $("next").textContent = sprint ? "Skip" : "Next";
  buildPicker();
  if(q.answer.type==="key") poll(true);
  if(q.kind!=="temper" && q.kind!=="frets" && !(q.needs||[]).some(n=>n.addr===237)) q.needs=[...(q.needs||[]), EQUAL];   // (Between the Frets sets 24-EDO itself, where it can)
  // every other game plays the standard chords, whether a layout game or the double tap left the alternate on
  if(!(q.needs||[]).some(n=>n.addr===39) && canWrite() && mc.params[39]!==undefined) q.needs=[...(q.needs||[]), STANDARD_LAYOUT];   // the temperament taster has no needs of its own
  applyNeeds();
  modTap();                                   // the double tap flips the modifier in every game
  modifierFor(q.answer.spellRoot || q.answer.tonicName || q.pressRoot);
  modPill();
  barryFor(q.answer.q!=null ? q.answer.q : (q.answer.type==="key" || q.pressRoot) ? "" : q.barry);
  needs();
  if(q.kind==="blaster") startBlaster();
  if(q.kind==="command") startCommand();
  if(q.kind==="snake") startSnake();
  if(q.kind==="asteroids") startAsteroids();
  if(q.kind==="stack") startStack();
  if(q.kind==="breakout") startBreakout();
  if(q.kind==="fifths") startFifths();
  if(q.kind==="chopper") startChopper();
  if(q.kind==="fleet") startFleet();
  if(q.kind==="sweeper") startSweeper();
  if(q.kind==="frets") startFrets();
  if(q.kind==="sight") startSight();
  if(q.kind==="simon") setTimeout(simonPlay,700);
}
function feedback(text,kind="",small=""){ const f=$("feedback"); f.className="feedback "+kind; f.textContent=text; if(small){ const s=document.createElement("small"); s.textContent=small; f.appendChild(s); } }
function reveal(a){
  if(q && q.learn) return q.learn;
  if(a.type==="chord") return `${a.tones.join(" ")} · on your minichord: ${howTo(a.spellRoot,a.q)}.`;
  if(a.type==="slash") return `Hold ${howTo(a.spellRoot,a.q)}, then press ${pressRoot(a.bassName)} as well.`;
  if(a.type==="key") return `Key signature: ${sigText(a.fifths)}. Its home chord is ${pressRoot(a.tonicName)}, with the major button.`;
  if(a.type==="smooth" && smooth.last) return moveText(smooth.last.f, smooth.last.v);
  if(a.type==="blaster"){ const l=lowestBlast(); return l ? `On your minichord: ${howTo(l.root,l.q)}${l.bass?`, then press ${pressRoot(l.bass)} as well`:""}.` : ""; }
  return "";
}
function correct(extra){
  solved=true; stats.asked++; if(firstTry){ stats.clean++; stats.streak++; } else stats.streak=0;
  if(firstTry && TIMED.has(q.kind)){ stats.times.push((performance.now()-qStart)/1000); if(stats.times.length>50) stats.times.shift(); }
  if(stats.streak>(saved.best[settings.mode]||0)){ saved.best[settings.mode]=stats.streak; save(); }
  if(sprint) sprint.right++;
  const a=q.answer;
  chime("done"); showNumerals(); showKeys();
  feedback(extra || `Right: ${a.name}.`, "good", reveal(a));
  // how it's built: always for scales, and for chords when the first try missed
  const learn = q.learn || (!firstTry && (a.type==="chord"||a.type==="slash") ? chordLearn(a.spellRoot,a.q) : "");
  if(learn && learn!==reveal(a)){ const s2=document.createElement("small"); s2.className="learn"; s2.textContent=learn; $("feedback").appendChild(s2); }
  if(q.layout && alt){ const L=q.layout(); $("feedback").appendChild(layoutDiagram(L.labels, L.target, L.shown)); }
  else if(learn){ const sm=$("feedback").querySelector("small"); if(sm) sm.className="learn"; }
  scoreboard(); poll(false);
  // Right first time, the game moves on by itself; after a miss it waits for Next, so there's
  // time to read how the answer is built. Tune up always waits: locking in is the end.
  if(firstTry && q.kind!=="tune" && (sprint || settings.advance!=="wait")){
    const dwell = sprint ? 450 : settings.advance==="slow" ? 4500 : q.kind==="melody" ? 2200 : q.learn ? 3200 : 1800;
    setTimeout(()=>{ if(solved && q) nextQuestion(); }, dwell);
  } else if(!sprint){
    const f=$("feedback"), s3=document.createElement("small"); s3.textContent="Press Next when you're ready."; f.appendChild(s3);
  }
}
function wrong(text){ firstTry=false; stats.streak=0; buzz(); feedback(text,"bad"); scoreboard(); showNumerals(); }
// A wrong answer flashes the game card red and, with sounds on, plays two soft low notes
// falling a minor third: noticeable, not a klaxon.
function buzz(target, silent){
  const g=target || document.querySelector(".game"); g.classList.remove("flash"); void g.offsetWidth; g.classList.add("flash");
  if(silent || !settings.sounds || !piano.ctx || piano.ctx.state!=="running") return;
  const ctx=piano.ctx, t0=ctx.currentTime+.01;
  [[311.1,0],[261.6,.12]].forEach(([f,at])=>{
    const o=ctx.createOscillator(), g2=ctx.createGain(), lp=ctx.createBiquadFilter();
    o.type="triangle"; o.frequency.value=f; lp.type="lowpass"; lp.frequency.value=900;
    g2.gain.setValueAtTime(0,t0+at); g2.gain.linearRampToValueAtTime(.09,t0+at+.01); g2.gain.exponentialRampToValueAtTime(.0001,t0+at+.28);
    o.connect(lp).connect(g2).connect(ctx.destination); o.start(t0+at); o.stop(t0+at+.32);
  });
}

// ---------- answers ----------
/** a harp note as this round spells it */
const nameOf=pc=> q && q.nameOf ? q.nameOf(pc) : spell(pc, q ? (q.context||0) : 0);
function orderedVoices(voices){
  const byVoice=voices.length===4 && voices.every(v=>v.voice!=null);
  return (byVoice ? [...voices].sort((a,b)=>a.voice-b.voice) : [...voices].sort((a,b)=>a.pitch-b.pitch)).map(v=>v.pitch);
}
function moveText(f,v){
  return VOICE_NAMES.map((n,i)=>{ const d=Math.round(v[i])-Math.round(f[i]); return `${n} ${spell(mod(Math.round(f[i]),12),devFifths())}${d? ` → ${spell(mod(Math.round(v[i]),12),devFifths())} (${d>0?"+":"−"}${Math.abs(d)})` : " stays"}`; }).join(" · ");
}
function answerSmooth(voices){
  const v=orderedVoices(voices); if(v.length<4) return;
  const name=chordName(voices.map(x=>x.pitch), devFifths()) || "that chord";
  if(q.answer.start){ smooth.from={v,name}; smooth.last=null; nextQuestion(); return; }
  const f=smooth.from.v, ok=CHALLENGES[q.answer.challenge].test(f,v,q.answer.target);
  smooth.last={f,v}; smooth.from={v,name}; buildSpecial();
  if(ok) return correct(`Right: ${name}.`);
  firstTry=false; stats.streak=0; scoreboard(); buzz();
  feedback(`${name} doesn't do it.`, "bad", moveText(f,v)+". Here's a new challenge from there.");
  setTimeout(()=>{ if(!solved && q && q.kind==="smooth") nextQuestion(); }, 2600);
}
function answerChoiceByChord(voices){
  const pitches=voices.map(v=>v.pitch), id=chordId(pitches); if(!id) return;
  const name=chordName(pitches, devFifths());
  // the first press of the chord to listen over is listening, not answering
  if(q.listenRoot!=null && !q.listened && id.root===q.listenRoot){ q.listened=true; feedback("Listen to the harp, then answer.",""); return; }
  if(q.parent!=null){
    if(id.quality!=="") return wrong(`Answer with a major chord: the one whose scale has these notes.`);
    if(id.root===q.parent) return answerChoice(q.answer.value);
    return wrong(`${name} major's scale doesn't have these notes. Listen for where the half steps fall.`);
  }
  if(q.keypad){
    const letter=spell(id.root,devFifths())[0], hit=q.keypad.find(k=>k.letter===letter);
    if(hit) answerChoice(hit.value);
  }
}
// A chord of two or three buttons (maj7, m7, diminished, augmented, a slash) passes
// through a simpler chord on the way: the first button sounds before the others land.
// A right answer counts at once; a wrong one waits to see whether more buttons follow.
let pendingWrong=null;
function later(fn){
  clearTimeout(pendingWrong);
  pendingWrong=setTimeout(()=>{ pendingWrong=null; if(q && !solved) fn(); }, q && q.answer.type==="slash" ? 800 : 500);
}
function answerChord(voices){
  clearTimeout(pendingWrong); pendingWrong=null;
  if(!q || solved) return;
  if(blast && blast.hsEntry){ blast.hsEntry.set(); return; }                     // initials: a chord sets the letter
  if(blast && blast.bonus){ bonusChord(voices); return; }                      // a bonus round
  if(blast && blast.phase==="play") blast.midiIn=(blast.midiIn||0)+1;
  if(arcadeMenuChord(voices)) return;            // an arcade title screen, played from the buttons
  if(q.answer.type==="blaster") return blasterChord(voices);
  if(q.answer.type==="command") return;                  // the harp answers Harp Command, not the chords
  if(q.answer.type==="snake") return snakeChord(voices);
  if(q.answer.type==="asteroids") return asteroidsChord(voices);
  if(q.answer.type==="stack") return stackChord(voices);
  if(q.answer.type==="breakout") return breakoutChord(voices);
  if(q.answer.type==="fifths") return fifthsChord(voices);
  if(q.answer.type==="chopper") return chopperChord(voices);
  if(q.answer.type==="fleet") return fleetChord(voices);
  if(q.answer.type==="sweeper") return sweeperChord(voices);
  if(q.answer.type==="frets") return fretsChord(voices);
  if(q.answer.type==="sight") return sightChord(voices);
  if(q.answer.type==="diatonic") return answerDiatonic(voices);
  if(q.answer.type==="reshape") return answerReshape(voices);
  if(q.answer.type==="alt") return answerAltChord(voices);
  if(q.answer.type==="choice" && (q.keypad || q.parent!=null)) return answerChoiceByChord(voices);
  if(q.answer.type==="smooth") return answerSmooth(voices);
  const pitches=voices.map(v=>v.pitch), a=q.answer, got=chordId(pitches), said=got ? chordName(pitches, q.context||0) : "that";
  if(a.type==="chord"){
    if(isChord(pitches,a.root,a.q)) return correct();
    if(got && got.root===a.root) return later(()=>wrong(`You played ${said}: right root, but a different kind of chord.`));
    if(got && got.quality===a.q) return later(()=>wrong(`You played ${said}: the right kind of chord on a different root.`));
    return later(()=>wrong(`You played ${said}. Not quite.`));
  }
  if(a.type==="key"){
    if(isChord(pitches,a.tonic,"")) return correct();
    return later(()=>wrong(`${said} isn't the home chord of the key these belong to.`));
  }
  if(a.type==="slash"){
    // the slash note sings on the voice "Slash replaces" names; with Root, that's voice 0, the bass
    const tones=FORM[a.q].map(f=>mod(a.root+f[1],12)), pcs=voices.map(v=>mod(Math.round(v.pitch),12));
    // firmware 13's slash voice puts the slash note at the bottom; before it, "slash replaces: root" put it on voice 0
    const slashVoice = (mc.params[7]??0)>=13 ? null : voices.find(v=>v.voice===0);
    const bassOk = slashVoice ? mod(Math.round(slashVoice.pitch),12)===a.bass : mod(Math.round(Math.min(...pitches)),12)===a.bass;
    const restOk = pcs.every(p=>p===a.bass || tones.includes(p)) && pcs.includes(tones[1]);
    if(bassOk && restOk) return correct();
    if(restOk) return later(()=>wrong(`Right chord, but the slash note isn't ${a.bassName}. Hold the chord and press the ${a.bassName[0]} button too.`));
    return later(()=>wrong(`You played ${said}. Hold ${a.name.split("/")[0]} first, then add the slash.`));
  }
}
function answerNote(pc, pickedName){
  if(blast && blast.bonus){ bonusNote(pc); return; }                           // a bonus round
  if(blast && blast.hsEntry){ const c=kmControl(pc), h=blast.hsEntry;               // initials: the harp as a d-pad
    if(!c) return;                                                               // a dead corner of the keymaster
    if(c==="up") h.step(1); else if(c==="down") h.step(-1); else if(c==="left"||c==="B") h.move(-1); else if(c==="right") h.move(1); else h.set(); return; }
  if(cabWaiting()){ cabWake(); return; }
  if(blast && blast.phase==="play") blast.midiIn=(blast.midiIn||0)+1;
  if(q && q.kind==="command") return commandNote(pc);
  if(q && q.kind==="snake") return snakeHarp(pc);
  if(q && q.kind==="asteroids") return asteroidsNote(pc);
  if(q && q.kind==="stack") return stackHarp(pc);
  if(q && q.kind==="fifths") return fifthsNote(pc);
  if(q && q.kind==="fleet") return fleetNote(pc);
  if(q && q.kind==="sweeper") return sweeperNote(pc);
  if(q && q.kind==="breakout") return breakoutNote(pc);
  if(q && q.kind==="chopper") return chopperNote(pc);
  if(q && q.kind==="frets") return fretsNote(pc);
  if(q && q.kind==="sight") return sightNote(pc);
  if(!q || solved) return;
  if(q.answer.type==="note" && pc===q.answer.pc && pickedName && q.answer.name && pickedName!==q.answer.name)
    return correct(`Right note: ${q.answer.name}. Here it's spelled ${q.answer.name}, not ${pickedName}.`);
  const a=q.answer;
  if(a.type==="reshape"){ if(!cantusOk()) answerReshapeNote(pc); return; }   // with a minichord, the chord tells the story
  if(a.type==="simon"){
    const want=mod(pcOfName(simon.key.name)+MAJOR[(simon.seq[simon.pos]-1)%7],12);
    if(pc!==want){
      const len=simon.seq.length-1;
      if(len>(saved.best.simonLen||0)){ saved.best.simonLen=len; saved.best.simon=len; save(); }
      solved=true; stats.streak=0; scoreboard(); buzz();
      feedback(`That's ${spell(pc,q.context)}. The melody reached ${len} note${len===1?"":"s"}.`,"bad",`Your best: ${saved.best.simonLen||0}. Press Next to start again.`);
      return;
    }
    simon.pos++; buildSpecial();
    if(simon.pos===simon.seq.length){
      stats.streak=simon.seq.length; scoreboard();
      chime("done"); feedback(`${simon.seq.length} note${simon.seq.length>1?"s":""}. Here's the next one.`,"good");
      simonGrow(); buildSpecial(); setTimeout(simonPlay,900);
    }
    return;
  }
  if(a.type==="dirs"){
    const want=dirs.path[dirs.pos];
    if(pc!==want){ firstTry=false; buzz(); feedback(`That's ${nameOf(pc)}. ${dirs.pos ? `From ${dirName(dirs.pos-1)}, ${dirsPrompt().toLowerCase()} is somewhere else.` : "Find the starting note."}`,"bad"); return; }
    dirs.pos++;
    if(dirs.pos===dirs.path.length) return correct(`Made it: ${dirs.path.map((p,k)=>dirName(k)).join(" → ")}.`);
    chime("step");
    $("prompt").textContent=dirsPrompt(); buildSpecial(); buildPicker(); feedback(`${dirName(dirs.pos-1)}.`,"good");
    return;
  }
  if(a.type==="collect"){
    if(!a.pcs.includes(pc)){ firstTry=false; buzz(); feedback(`${nameOf(pc)} isn't in ${q.prompt}.`,"bad"); return; }
    const fresh=!a.got.has(pc); a.got.add(pc); buildSpecial();
    if(a.got.size===a.pcs.length) return correct(`All there: ${a.name}.`);
    if(fresh) chime("step");
    feedback(`${nameOf(pc)}: ${a.pcs.length-a.got.size} to go.`,"good"); return;
  }
  if(a.type==="sequence"){
    if(pc!==a.pcs[a.pos]){ firstTry=false; buzz(); feedback(`That's ${nameOf(pc)}. Not the next note of the scale.`,"bad"); return; }
    a.pos++; buildSpecial();
    if(a.pos===a.pcs.length) return correct(`That's ${a.name}.`);
    chime("step"); feedback(""); return;
  }
  if(q.answer.type==="melody"){
    const a=q.answer;
    if(pc===a.pcs[a.pos]){ a.pos++; buildSpecial(); if(a.pos===a.pcs.length) correct(`That's ${a.name}!`); else feedback(""); }
    else { firstTry=false; buzz(); feedback(`That's ${spell(pc,q.context||0)}; the next number is ${a.degrees[a.pos]}.`,"bad"); }
    return;
  }
  if(q.answer.type!=="note") return;
  if(pc===q.answer.pc) return correct();
  wrong(`That's ${spell(pc,q.context||0)}. Try another string.`);
}
function answerKey(tonicPc){
  if(!q || solved || q.answer.type!=="key") return;
  if(tonicPc===q.answer.tonic) return correct();
  const f=Object.keys(KEY_BY_FIFTHS).find(g=>mod(7*g,12)===tonicPc);
  wrong(`Not ${f!=null?KEY_BY_FIFTHS[f]:"that"} major: one of these chords doesn't belong to it.`);
}
function answerChoice(v){
  if(!q || solved || q.answer.type!=="choice") return;
  const parentNote = q.parent!=null && q.parent!==q.rootPc ? ` It has the notes of ${spell(q.parent,devFifths())} major.` : "";
  if(v===q.answer.value) return correct(`Right: ${q.answer.name}.${parentNote}`);
  const c=q.choices.find(c=>c.value===v);
  wrong(`Not ${c?c.label:"that"}. Listen again, or try a hint.`);
}
mc.addEventListener("chord", e=>answerChord(e.detail));
// A string can fire twice for one pluck. The same note again within 180 ms is the same
// pluck, and would otherwise answer the next step of a path, a scale or a melody.
let lastHarp={pc:-1,t:0}, harpQuietUntil=0;
mc.addEventListener("harp", e=>{
  mc.lastHarp=e.detail;                                                         // its exact pitch, for a game that needs the steps between
  const pc=mod(e.detail.note,12), now=performance.now();
  if(pc===lastHarp.pc && now-lastHarp.t<180) return;
  lastHarp={pc,t:now};
  if(now<harpQuietUntil) return;
  answerNote(pc);
});
let pollT=null;
function poll(on){ clearInterval(pollT); pollT=null; if(on && mc.sysex && mc.out) pollT=setInterval(()=>mc.requestDump(),900); }

// ---------- what a round needs from the minichord ----------
const HARP_MODES=["Follow chord","Major","Major pentatonic","Minor pentatonic","Diminished 6th","Relative natural minor","Relative harmonic minor","Relative minor pentatonic","Scale per chord","Scale per chord · pentatonic","Custom · on the key","Custom · on the chord"];
function needs(){
  const box=$("needs");
  if(!q || !q.needs){ box.hidden=true; return; }
  box.hidden=false;
  const hold = q.holdHint ? ` ${q.holdHint()}` : "";      // worked out now, after the modifier is set
  // once connected, only name what this firmware can actually be set to
  const what=q.needs.filter(n=> mc.params[35]===undefined || hasSetting(n.addr)).map(n=>n.what).filter(Boolean).join(", ");
  if(!what && mc.params[35]!==undefined){ box.hidden=true; return; }
  if(mc.params[35]===undefined){ box.textContent=`This one needs ${what}. Connect the minichord and the game sets it for you.`; return; }
  if(!canWrite()){ box.textContent=`This one needs ${what}, and the game can't change your minichord's settings: see the line under the title.`; return; }
  const missing=q.needs.filter(unmet);
  if(userRestored && missing.length){ box.textContent=`Your settings are back as they were. Press Next and the game sets ${what} again.`; return; }
  // before firmware 16 the harp only changes over to (or out of) chromatic on the next chord press
  const wake = q.needs.some(n=>n.addr===98) && (mc.params[7]??0)<16 ? " Press any chord once so the harp changes over; your firmware waits for a chord before it retunes the strings." : "";
  box.textContent = missing.length ? `Setting your minichord to ${what}…` : `For this game your minichord is set to ${what}; it goes back when you leave.${hold}${wake}`;
}

// ---------- pickers ----------
let pick={root:null,q:null,bass:null};
function buildPicker(){
  const body=$("pickBody"); body.innerHTML="";
  const type = q ? q.answer.type : "chord", ctx = q ? (q.context||0) : 0;
  $("pickTitle").textContent = {key:"Pick the key", note:"Pick the note", choice:"Your answer", tune:"Your answer", slash:"Pick the slash chord"}[type] || "Pick the chord";
  const row=(cls)=>{ const d=document.createElement("div"); d.className=cls; body.appendChild(d); return d; };
  const btn=(parent,text,fn,pressed=false)=>{ const b=document.createElement("button"); b.textContent=text; b.setAttribute("aria-pressed",pressed); b.onclick=fn; parent.appendChild(b); return b; };
  if(type==="tune"){ const p=document.createElement("p"); p.className="fine"; p.textContent="Use the slider in the game card, then lock it in."; body.append(p); return; }
  if(type==="choice"){ const r=row(q.choices.length>8?"row6":"row2"); q.choices.forEach(c=>btn(r,c.label,()=>answerChoice(c.value))); return; }   // keypad rounds list C to B
  if(type==="key"){ const r=row("row6"); [0,1,2,3,4,5,6,-1,-2,-3,-4,-5].forEach(f=>btn(r,KEY_BY_FIFTHS[f],()=>answerKey(mod(7*f,12)))); return; }
  // every letter from double flat to double sharp, so a note can be picked the way it's spelled: G♯ in C♯m, not A♭
  if(["note","melody","simon","dirs","collect","sequence"].includes(type)){
    for(const [acc,sign] of [[-2,"𝄫"],[-1,"♭"],[0,""],[1,"♯"],[2,"𝄪"]]){ const r=row("row7");
      for(let li=0;li<7;li++){ const name=LETTERS[li]+sign; btn(r,name,()=>answerNote(mod(NAT[li]+acc,12), name)); } }
    return;
  }
  if(type==="smooth"){
    $("pickTitle").textContent="Pick the next chord";
    const roots=row("row6"), quals=row("row4");
    roots.remove();
    for(const [acc,sign] of [[-1,"♭"],[0,""],[1,"♯"]]){ const r=row("row7"); body.insertBefore(r,quals);
      for(let li=0;li<7;li++){ const name=LETTERS[li]+sign, pc=mod(NAT[li]+acc,12); btn(r,name,()=>{ pick.root=pc; pick.rootName=name; buildPicker(); }, pick.rootName===name); } }
    for(const qq of ["","m","7","maj7","m7"]) btn(quals,QNAME[qq]??qq,()=>{ pick.q=qq; buildPicker(); },pick.q===qq);
    const go=row("row4"); btn(go,"Play it",()=>{
      if(pick.root==null || pick.q==null) return feedback("Choose a root and a kind of chord first.","bad");
      // voiced the way the minichord's voice leading would voice it from the chord you hold
      const prev=smooth.from ? smooth.from.v.map(x=>Math.round(x)-48) : null;
      const v=firmwareVoicing(pick.root,VL_TONES[pick.q],prev,mc.params[112]??12).map(x=>x+48);
      answerChord(v.map((pitch,voice)=>({pitch,voice})));
    });
    return;
  }
  // roots as letters with flat, natural and sharp, so C♯ and D♭ are both there
  const quals=row("row4");
  for(const [acc,sign] of [[-1,"♭"],[0,""],[1,"♯"]]){ const r=row("row7"); body.insertBefore(r,quals);
    for(let li=0;li<7;li++){ const name=LETTERS[li]+sign, pc=mod(NAT[li]+acc,12); btn(r,name,()=>{ pick.root=pc; pick.rootName=name; buildPicker(); }, pick.rootName===name); } }
  const qs = type==="slash" ? ["","m","°"] : SETS[settings.set];
  for(const qq of qs) btn(quals,QNAME[qq]??qq,()=>{ pick.q=qq; buildPicker(); },pick.q===qq);
  if(type==="slash"){
    const l=document.createElement("label"); l.textContent="Slash note ";
    const s=document.createElement("select"); s.add(new Option("choose",""));
    for(const [acc,sign] of [[0,""],[-1,"♭"],[1,"♯"]]) for(let li=0;li<7;li++){ const name=LETTERS[li]+sign; s.add(new Option(name, `${mod(NAT[li]+acc,12)}|${name}`)); }
    s.value = pick.bassName ? `${pick.bass}|${pick.bassName}` : ""; s.onchange=()=>{ if(!s.value){ pick.bass=null; pick.bassName=null; return; } const [pc,name]=s.value.split("|"); pick.bass=+pc; pick.bassName=name; }; l.append(s); body.append(l);
  }
  const go=row("row4"); btn(go,"Answer",()=>{
    if(pick.root==null || pick.q==null || (type==="slash" && pick.bass==null)) return feedback("Choose every part of the chord first.","bad");
    const iv=FORM[pick.q].map(f=>f[1]);
    const voices = type==="slash" ? [{pitch:36+pick.bass,voice:0}, ...iv.slice(1).map((s,k)=>({pitch:48+pick.root+s,voice:k+1}))] : iv.map((s,k)=>({pitch:48+pick.root+s,voice:k}));
    answerChord(voices);
  });
}

// ---------- the tune-up slider and its tones ----------
let tones=null;
function stopTones(){ if(tones){ tones.forEach(o=>{ try{ o.stop(); }catch(e){} }); tones=null; } const b=$("refBtn"); if(b) b.setAttribute("aria-pressed","false"); }
async function startTones(){
  await piano.start(); const ctx=piano.ctx, t0=ctx.currentTime;
  const make=(freq,level,type)=>{ const o=ctx.createOscillator(), g=ctx.createGain(); o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(level,t0+.15); o.connect(g).connect(ctx.destination); o.start(); return o; };
  // the reference is a pure A in three octaves, so it beats against whichever A the chord voices sound
  tones=[make(220,.05,"sine"), make(440,.08,"sine"), make(880,.04,"sine")];
  if(!canWrite()){ tones.sim=make((tuneState.secret+tuneState.nudge)/10,.1,settings.tuneWave); tones.push(tones.sim); }   // no minichord: simulate it
}
function buildSpecial(){
  const box=$("special"); box.innerHTML=""; box.hidden = !(q && ["tune","melody","smooth","simon","directions","pluckchord","buildscale","blaster","command","snake","asteroids","stack","breakout","fifths","chopper","fleet","sweeper","frets","sight","diatonic","reshape","hidden","oddone","shades"].includes(q.kind)); if(box.hidden) return;
  if(q.kind==="command"){ buildCommandField(box); return; }
  if(q.kind==="snake"){ buildSnakeField(box); return; }
  if(q.kind==="asteroids"){ buildAsteroidsField(box); return; }
  if(q.kind==="stack"){ buildStackField(box); return; }
  if(q.kind==="breakout"){ buildBreakoutField(box); return; }
  if(q.kind==="fifths"){ buildFifthsField(box); return; }
  if(q.kind==="chopper"){ buildChopperField(box); return; }
  if(q.kind==="fleet"){ buildFleetField(box); return; }
  if(q.kind==="sweeper"){ buildSweeperField(box); return; }
  if(q.kind==="frets"){ buildFretsField(box); return; }
  if(q.kind==="sight"){ buildSightField(box); return; }
  if(q.kind==="blaster"){
    const field=document.createElement("div"); field.className="field arcade"; field.setAttribute("aria-label","Falling chords");
    const ground=document.createElement("div"); ground.className="ground"; field.appendChild(ground);
    const hud=document.createElement("div"); hud.className="hud"; field.appendChild(hud); fullButton(field);
    const hd=document.createElement("div"); hd.className="heard"; field.appendChild(hd);
    box.append(field);
    if(blast){ blast.items.filter(i=>!i.done).forEach(i=>field.appendChild(i.el)); blast.field=field; setTimeout(applyChordSize); blast.hud=hud; blast.heard=hd; blast.fx=fxInit(field); if(blast.overlay) field.appendChild(blast.overlay); }
    blastBar(); setTimeout(helperSync); return;
  }
  const chip=(text,state)=>{ const b=document.createElement("span"); b.textContent=text;
    b.style.cssText=`font:600 1.5rem var(--hand);min-width:1.4em;padding:0 .15em;text-align:center;border-bottom:3px solid ${state==="now"?"var(--accent)":"transparent"};color:${state==="done"?"var(--v1)":state==="now"?"var(--ink)":"var(--muted)"}`;
    box.appendChild(b); return b; };
  if(q.kind==="simon"){
    simon.seq.forEach((d,i)=>chip(simonShow ? String(d) : "●", i<simon.pos?"done":i===simon.pos?"now":""));
    const t=document.createElement("label"); t.className="fine"; t.style.marginLeft="auto";
    const c=document.createElement("input"); c.type="checkbox"; c.checked=simonShow; c.onchange=()=>{ simonShow=c.checked; buildSpecial(); };
    t.append(c," Show the numbers"); box.appendChild(t); return;
  }
  if(q.kind==="directions"){ dirs.path.slice(0,dirs.pos).forEach((p,k)=>chip(dirName(k),"done")); chip("?","now"); return; }
  if(q.kind==="pluckchord"){ q.answer.pcs.forEach(p=>chip(q.answer.got.has(p)?nameOf(p):"?", q.answer.got.has(p)?"done":"")); return; }
  if(q.kind==="buildscale"){ q.answer.pcs.forEach((p,i)=>chip(i<q.answer.pos?nameOf(p):"·", i<q.answer.pos?"done":i===q.answer.pos?"now":"")); return; }
  if(["hidden","oddone","shades"].includes(q.kind) && alt && alt.kind===q.kind){
    if(q.kind==="shades" && alt.mode==="order") SHADES.forEach((sh,i)=>chip(i<alt.pos ? sh.n : "?", i<alt.pos?"done":i===alt.pos?"now":""));
    { const b=document.createElement("button"); b.className="primary"; b.textContent = q.kind==="shades" && alt.mode==="order" ? "Add it (spacebar)" : "Found it (spacebar)"; b.onclick=submitAlt; box.appendChild(b); }
    return;
  }
  if(q.kind==="reshape"){
    const r=reshape;
    if(!cantusOk()){ r.newPcs.forEach(pc=>chip(r.got.has(pc) ? (r.names.get(pc)||spell(pc,0)) : "?", r.got.has(pc)?"done":"")); return; }
    if(!r.voices.length){ chip(`Hold ${r.startSym}`,"now"); return; }
    // the four voices, bass to soprano, with the one the cantus is on marked
    const names=spellTones(r.voices, 0, r.root), m=reshapeNext();
    r.voices.forEach((p,i)=>{ const pc=mod(Math.round(p),12), nm=r.tset.includes(pc) && !r.startSet.includes(pc) ? (r.names.get(pc)||names.get(pc)) : (names.get(pc)||spell(pc,0));
      // which voice moves is the puzzle, so it's only marked after a wrong note or a hint
      const aim = r.showAim && m && m.rank===i;
      chip(`${VOICE_WORDS[i]}: ${nm}${aim ? " · this one moves" : ""}`, aim ? "now" : ""); });
    return;
  }
  if(q.kind==="diatonic"){ diat.chords.forEach((c,i)=>chip(i<diat.pos ? `${c.label} ${c.root}${c.q}` : c.label, i<diat.pos?"done":i===diat.pos?"now":"")); return; }
  if(q.kind==="melody"){
    const a=q.answer;
    a.degrees.forEach((d,i)=>{ const b=document.createElement("span"); b.textContent = q.solfa ? SOLFA[d-1] : d;
      b.style.cssText=`font:700 1.7rem var(--hand);min-width:1.4em;text-align:center;border-bottom:3px solid ${i===a.pos?"var(--accent)":"transparent"};color:${i<a.pos?"var(--v1)":i===a.pos?"var(--ink)":"var(--muted)"}`;
      box.appendChild(b); });
    return;
  }
  if(q.kind==="smooth"){
    const t=document.createElement("div"); t.className="fine";
    if(smooth.last){ const f=smooth.last.f, v=smooth.last.v;
      t.innerHTML = VOICE_NAMES.map((n,i)=>{ const d=Math.round(v[i])-Math.round(f[i]); return `<b>${n}</b> ${spell(mod(Math.round(f[i]),12),devFifths())}${d?` → ${spell(mod(Math.round(v[i]),12),devFifths())} <span style="color:var(--accent)">${d>0?"+":"−"}${Math.abs(d)}</span>`:" stays"}`; }).join("&nbsp;&nbsp; ");
    } else if(smooth.from) t.textContent = `Holding ${smooth.from.name}: ${smooth.from.v.map(p=>spell(mod(Math.round(p),12),devFifths())).join(" ")}, bass to top.`;
    box.appendChild(t); return;
  }
  const wl=document.createElement("label"); wl.textContent="Tone ";
  const ws=document.createElement("select"); ws.setAttribute("aria-label","The minichord's tone for tuning");
  for(const w of Object.keys(WAVES)) ws.add(new Option(w[0].toUpperCase()+w.slice(1), w));
  ws.value=settings.tuneWave;
  ws.onchange=async()=>{ settings.tuneWave=ws.value; save(); if(canWrite()) borrow(122, WAVES[ws.value]);
    if(tones){ stopTones(); await startTones(); $("refBtn").setAttribute("aria-pressed","true"); } };
  wl.append(ws); box.append(wl);
  const ref=document.createElement("button"); ref.id="refBtn"; ref.textContent= canWrite() ? "Reference A" : "Play both tones"; ref.setAttribute("aria-pressed","false");
  ref.onclick=async()=>{ if(tones){ stopTones(); } else { await startTones(); ref.setAttribute("aria-pressed","true"); } };
  const sl=document.createElement("input"); sl.type="range"; sl.min=-90; sl.max=90; sl.step=1; sl.value=0; sl.setAttribute("aria-label","Tuning");
  let last=0;
  sl.oninput=()=>{ tuneState.nudge=+sl.value; const v=Math.max(4320,Math.min(4460,tuneState.secret+tuneState.nudge));
    if(canWrite()){ const now=performance.now(); if(now-last>60){ last=now; mc.writeParam(109,v); } }
    else if(tones && tones.sim) tones.sim.frequency.setTargetAtTime(v/10, piano.ctx.currentTime, .02); };
  sl.onchange=()=>{ if(canWrite()) mc.writeParam(109,Math.max(4320,Math.min(4460,tuneState.secret+tuneState.nudge))); };
  const lock=document.createElement("button"); lock.className="primary"; lock.textContent="Lock it in";
  lock.onclick=()=>{
    if(!q || solved) return;
    const hz=Math.max(4320,Math.min(4460,tuneState.secret+tuneState.nudge))/10, cents=1200*Math.log2(hz/440), c=Math.abs(cents);
    const verdict = c<1.5 ? "Spot on" : c<4 ? "Very close" : c<8 ? "Close" : "Still out";
    const off = c<0.05 ? "right on 440" : `${c.toFixed(1)} cents ${cents>0?"sharp":"flat"}, A = ${hz.toFixed(1)} Hz`;
    if(c<4){ correct(`${verdict}: ${off}.`); }
    else { firstTry=false; feedback(`${verdict}: ${c.toFixed(1)} cents ${cents>0?"sharp":"flat"}. Keep sliding and lock it in again.`,"bad"); }
  };
  box.append(ref,sl,lock);
}

// ---------- help buttons ----------
async function hear(){
  if(!q) return; await piano.start();
  if(q.hearFn){ const pts=q.hearFn(); pts.forEach(([p,t])=>piano.play([p],{when:.05+t,dur: q.kind==="scale"?.5:1.3})); return; }
  const midiOf=name=>{ const {li,acc}=parse(name); return 60+NAT[li]+acc; };
  if(q.hearChords){ q.hearChords.forEach((c,k)=>{ const iv=FORM[c.q].map(f=>f[1]); piano.play(iv.map(s=>48+c.root+s),{when:.1+k*1.1,dur:1}); }); return; }
  let prev=-1; const notes=q.hear.map((n,i)=>{ let m=midiOf(n)-12-(q.kind==="slash"&&i===0?12:0); while(m<=prev) m+=12; prev=m; return m; });
  piano.play(notes,{when:.05,dur:1.4});
}
$("hear").onclick=hear;
$("hint").onclick=()=>{ if(q){ firstTry=false; if(q.kind==="reshape" && reshape){ reshape.showAim=true; buildSpecial(); } feedback(q.hint,""); } };
$("lastBtn").onclick=showLastRound;
$("settingsBtn").onclick=()=>$("settingsDlg").showModal();
$("settingsClose").onclick=()=>$("settingsDlg").close();
$("settingsDlg").addEventListener("click",e=>{ if(e.target===$("settingsDlg")) $("settingsDlg").close(); });   // a click outside closes it
$("reveal").onclick=()=>{
  if(!q) return; firstTry=false; stats.streak=0; scoreboard(); revealedThis=true;
  const a=q.answer;
  if(a.type==="tune"){ const hz=tuneState.secret/10; feedback(`It was set to A = ${hz.toFixed(1)} Hz, ${Math.abs(1200*Math.log2(hz/440)).toFixed(1)} cents ${hz>440?"sharp":"flat"}.`,"bad","Slide the other way from there, or press Next."); return; }
  feedback(`It's ${a.name}.`, "bad", reveal(a) || (a.type==="choice" ? "Press Next for another." : "Answer it to go on."));
  showNumerals(); showKeys();
  if(q.layout && alt){ const L=q.layout(); $("feedback").appendChild(layoutDiagram(L.labels, L.target, L.shown)); }
};
$("next").onclick=()=>{ piano.start(); if(q && !solved && !sprint){ stats.asked++; stats.streak=0; scoreboard(); } nextQuestion(); };

// ---------- modes ----------
function setMode(m){
  const switching = settings.mode!==m;
  $("nowPlaying").textContent = `Playing: ${LABELS[m]||m}`;
  settings.mode=m; save();
  document.querySelectorAll(".modes button[data-mode]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.mode===m));
  $("sprint").disabled = MYSTERY.has(m) || m==="blaster" || m==="command" || m==="snake" || m==="asteroids" || m==="stack" || m==="breakout" || m==="fifths" || m==="chopper" || m==="fleet" || m==="sweeper" || m==="frets" || m==="sight";
  stats.streak=0; scoreboard(); nextQuestion();
  if(switching){
    const back=restoreExcept(new Set([...(q.needs||[]).map(n=>n.addr), ...(q.borrows||[]), ...roundBorrows, 31]));   // keep what the new game uses
    // The round was built in the old game's key signature (Seven chords, or a key set in Sight
    // reader). With the player's own key back, build it again, so its modifier and spelling fit.
    if(back.includes(35)) nextQuestion();
  }
}
document.querySelectorAll(".modes button[data-mode]").forEach(b=>{ b.setAttribute("aria-pressed", b.dataset.mode===settings.mode); b.onclick=()=>setMode(b.dataset.mode); });
$("sprint").disabled = MYSTERY.has(settings.mode) || settings.mode==="blaster" || settings.mode==="command" || settings.mode==="snake" || settings.mode==="asteroids" || settings.mode==="stack" || settings.mode==="breakout" || settings.mode==="fifths" || settings.mode==="chopper" || settings.mode==="fleet" || settings.mode==="sweeper" || settings.mode==="frets" || settings.mode==="sight";
$("nowPlaying").textContent = `Playing: ${LABELS[settings.mode]||settings.mode}`;
for(const [id,key] of [["gameMenu","menuOpen"]]){
  const d=$(id); if(saved[key]===false) d.open=false;
  d.addEventListener("toggle",()=>{ saved[key]=d.open; save(); });
}

// ---------- sprint ----------
$("sprint").onclick=()=>{
  if(sprint){ endSprint(); return; }
  sprint={right:0, end:performance.now()+60000}; $("sprint").textContent="Stop the sprint"; $("timer").hidden=false;
  nextQuestion(); tick();
};
function tick(){
  if(!sprint) return;
  const left=Math.max(0,Math.ceil((sprint.end-performance.now())/1000));
  $("timer").textContent=`${left} s · ${sprint.right} right`;
  if(left<=0) return endSprint();
  requestAnimationFrame(tick);
}
function endSprint(){
  const n=sprint.right, key=settings.mode, prev=saved.sprint[key]||0;
  if(n>prev){ saved.sprint[key]=n; save(); }
  sprint=null; $("timer").hidden=true; $("sprint").textContent="60-second sprint"; $("next").textContent="Next";
  solved=true; poll(false);
  feedback(`Time: ${n} right in 60 seconds.`, "good", n>prev ? (prev ? `A new best for ${LABELS[key]}, beating ${prev}.` : `Your first sprint at ${LABELS[key]}.`) : `Best for ${LABELS[key]}: ${prev}.`);
}

// ---------- your minichord ----------
const ADDR_NAMES={35:"key signature",23:"slash replaces",33:"Barry Harris mode",30:"transpose",31:"modifier",36:"harp scale mode",98:"chromatic harp",109:"tuning",110:"MPE",111:"voice leading",113:"slash voice",114:"slash re-voice",115:"cantus",116:"harp rank",39:"chord layout",
  202:"alt chord 1",203:"alt chord 2",204:"alt chord 3",205:"alt chord 4",206:"alt chord 5",207:"alt chord 6",208:"alt chord 7",236:"custom scale",237:"temperament"};
function mine(){
  const strip=$("mystrip");
  if(mc.params[35]===undefined){ strip.hidden=true; return; }
  strip.hidden=false;
  const f=devFifths(), name=KEY_BY_FIFTHS[f] || mc.keyName || "?";
  $("myKey").textContent=`${name} major`;
  const parts=[sigText(f), `modifier ${modWord()==="sharp"?"sharpens":"flattens"}`];
  // the alt layout's seven chords read as one item
  const altN=Object.keys(borrowed).filter(a=>a>=202 && a<=208).length;
  const b=[...new Set(Object.keys(borrowed).filter(a=>!(a>=202 && a<=208)).map(a=> TONE_ADDRS.has(+a) ? "a plain tone" : ADDR_NAMES[a]||`address ${a}`))];
  if(altN) b.push(altN===7 ? "alt chords 1–7" : `${altN} alt chords`);
  if(b.length) parts.push(`borrowed for this game: ${b.join(", ")}`);
  $("myInfo").textContent=parts.join(" · ");
  modPill();
  $("restore").hidden=!b.length;
}

// ---------- connection ----------
mc.addEventListener("device", ()=>{
  // A preset loaded on the instrument mid-game (its preset buttons) sets everything anew: what the
  // game had set goes back on, and the new preset's own values become what's given back after
  // So can a double tap: anything unasked (but the key change combo, whose key a game reads) that
  // changes what the game holds is put straight back.
  if(mc.unasked && !mc.comboPick && Object.keys(wanted).length && canWrite()){
    const preset=mc.presetLoaded;
    for(const [a,v] of Object.entries(wanted)){ if(mc.params[a]!==v){ if(preset){ borrowed[a]=mc.params[a]; roundBorrows.add(+a); } mc.writeParam(+a, v); } } }
  if(q && settings.modTap!=="off" && canWrite() && mc.params[200]!==31) modTap();   // set it up once connected
  if(blast && blast.kind==="command") commandDevice();
  else if(blast && blast.kind==="snake") snDevice();
  else if(blast && blast.kind==="asteroids") asDevice();
  else if(blast && blast.kind==="stack") stDevice();
  else if(blast && blast.kind==="breakout") boDevice();
  else if(blast && blast.kind==="fifths") fdDevice();
  else if(blast && blast.kind==="chopper") chDevice();
  else if(blast && blast.kind==="fleet") kfDevice();
  else if(blast && blast.kind==="sweeper") swDevice();
  else if(blast && blast.kind==="frets") frDevice();
  else if(blast && blast.kind==="sight") slDevice();
  else if(blast){ blastSetup(); if(blast.phase!=="play") blastHomeKey(); blastKey(); }
  arcadeVolumeWatch();
  if(q && !solved && !rebuilding) applyNeeds();
  mine(); needs();
  // a round built before the minichord's settings arrived is rebuilt now, on the minichord
  if(q && q.wantsWrite && !solved && canWrite() && !rebuilding){
    q.wantsWrite=false; rebuilding=true;                 // writing settings fires this event again: build once
    try{ nextQuestion(); } finally { rebuilding=false; }
    feedback("Your minichord is set for this round.","");
  }
  if(q && !solved && q.answer.type==="key" && mc.keyIndex!=null && mc.keyIndex!==keyAtStart){ keyAtStart=mc.keyIndex; answerKey(mod(7*KEY_FIFTHS[mc.keyIndex],12)); }
});
mc.addEventListener("status", e=>$("status").textContent=e.detail);
mc.addEventListener("ports", ()=>{
  const sel=$("input"), ins=mc.inputs; sel.innerHTML=""; sel.disabled=false;
  sel.add(new Option("Minichord chord port (auto)","auto")); sel.add(new Option("All MIDI inputs","all"));
  ins.forEach(i=>sel.add(new Option(i.name,i.id)));
  sel.value=[...sel.options].some(o=>o.value===mc.inputChoice)?mc.inputChoice:"auto";
});
$("input").onchange=e=>mc.selectInput(e.target.value);
$("connect").onclick=async e=>{ e.target.disabled=true; piano.start(); if(await mc.connect()) e.target.textContent="Connected"; else e.target.disabled=false; };
window.__sb={get q(){ return q; }, get arcade(){ return blast; }, get snakeReady(){ return snReady(); }, get stackReady(){ return stReadyRows(); }, stackDraw:()=>stDraw(), kfWave:()=>kfWave(), kmControl:pc=>kmControl(pc), next:nextQuestion,
  draw:(r,qq)=>{ const t=spellChord(r,qq); if(!t) return null; FORM_STEPS=FORM[qq].map(f=>f[0]); $("staff").removeAttribute("hidden"); drawStaff(t); return t; },
  get smooth(){ return smooth; }, get simon(){ return simon; }, get dirs(){ return dirs; }, pcOf:pcOfName, answerChord, answerNote, answerKey, answerChoice, borrowed, restoreAll, pressRoot, get tune(){ return tuneState; }};
$("prompt").textContent="Press Start";
$("what").textContent=LABELS[settings.mode];
$("sub").textContent="Choose a game above, then press Start. Answer on the minichord's chord buttons or harp, or with the pickers.";
buildPicker(); scoreboard(); mine();
// one game on its own page: named for the game, and started straight away
if(solo){
  document.documentElement.classList.add("solo");
  $("pageTitle").textContent=LABELS[settings.mode]; document.title=`${LABELS[settings.mode]} · Minichord Lab`;
  $("moreLink").hidden=false;
  $("gameMenu").open=false;
  if(ARCADE_GAMES.includes(settings.mode)) arcadePage();
  nextQuestion();
}
// an arcade game's own page wears the arcade: back to the lobby, a marquee, a lit connect button,
// the cabinet, and the other games along the bottom
function arcadePage(){
  document.documentElement.classList.add("arcadepage");
  document.title=`${LABELS[settings.mode]} · Minichord Arcade`;
  $("pageTitle").textContent=LABELS[settings.mode].toUpperCase();
  const crumb=document.querySelector(".labbar .crumb"); crumb.href="../arcade/"; crumb.textContent="← MINICHORD ARCADE";
  const more=$("moreLink").querySelector("a"); more.href="../arcade/"; more.textContent="MORE GAMES IN THE MINICHORD ARCADE →";
  const c=$("connect"); if(!c.disabled){ c.textContent="CONNECT MINICHORD"; $("status").textContent="PLUG IN A MINICHORD AND PRESS CONNECT."; }
  // the settings: the button beside the connect button, clear of the marquee, and the dialog moved out
  // of the answer area (hidden on these pages), where it couldn't show
  const sb=$("settingsBtn"); sb.textContent="⚙ SETTINGS"; document.querySelector(".labbar .connect").appendChild(sb);
  bezelButtons();
  // the arcade's own settings, rebuilt each time it opens so it shows what the title screens changed
  sb.onclick=()=>{ document.getElementById("arcadeDlg")?.remove(); arcadeSettings().showModal(); };
  const others=ARCADE_GAMES.filter(g=>g!==settings.mode);
  const box=document.createElement("section"); box.className="moregames"; box.setAttribute("aria-label","More arcade games");
  box.innerHTML=`<h2>MORE IN THE ARCADE</h2><div class="row">${others.map(g=>`<a href="../${HS_SLUG[g]}/"><img src="../${HS_SLUG[g]}/card.png" alt="" loading="lazy" width="1200" height="630"><span>${LABELS[g].toUpperCase()}</span></a>`).join("")}</div>`;
  document.querySelector("section.game").after(box);
  requestAnimationFrame(()=>document.documentElement.classList.remove("arcadeboot"));   // set up: show it
}
