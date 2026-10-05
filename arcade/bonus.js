// Bonus rounds: a mini-game every two levels, in every arcade game.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- bonus rounds ----------
// Every two levels a game goes up, a bonus round takes over the field for twenty seconds or so: one
// of five mini-games, chosen at random (never the same twice running), with nothing to lose, only
// points to win. Then the game carries on exactly where it was: while the bonus plays the game's
// phase is "bonus", which stops its clock, its timers wait (gameLater holds them), and when it's over
// every timestamp the game keeps is moved on by the time the bonus took.
//   TUNE IT        a piano tech's job: a note a little off from A 440; tune it until the beats stop
//   MISSING NOTE   a chord spelled with one note hidden; pluck the missing one on the harp
//   ODD ONE OUT    four chords, three from one key; play the one that doesn't belong
//   KEY DETECTIVE  a short progression; play the chord of the key it's in
//   SIMON SAYS     a sequence of chords flashes up; play it back
// Switched off in the arcade settings (BONUS ROUNDS), and off in the tests unless a test wants it.
const BONUS_EVERY=2;
const bonusOn=()=> saved.bonus!==false;
// the games whose harp is chromatic while they play, so any note can be plucked
const BONUS_HARP_OK=new Set(["snake","stack","sweeper","asteroids","fifths","breakout","fleet","chopper","sight","chomp","burger","kong","bros"]);
// every timestamp a game keeps, moved on by the bonus's length when the game resumes
const BONUS_TIME_KEYS=new Set(["t0","born","next","nextMove","nextFall","deadAt","serveAt","jamUntil","frozenUntil","edgeAt","shieldAt","hurtAt","crackedAt","callAt","deadline","fieldAt","fallAt","stepAt","powerUntil","sprayAt","releaseAt","boTouchAt","codaUntil"]);
function bonusShift(o, d, depth=0){
  if(!o || typeof o!=="object" || depth>2 || o.nodeType) return;
  for(const [k,v] of Object.entries(o)){
    if(typeof v==="number" && BONUS_TIME_KEYS.has(k) && v>0) o[k]=v+d;
    else if(Array.isArray(v)) v.forEach(x=>bonusShift(x,d,depth+1));
    else if(v && typeof v==="object" && !(v instanceof Map) && !(v instanceof Set) && !v.nodeType && k!=="fx" && k!=="bonus" && depth<1) bonusShift(v,d,depth+1);
  }
  if(depth===0 && o.fx && o.fx.missiles) o.fx.missiles.forEach(m=>{ if(m.t0) m.t0+=d; });
}
const bonusDue=()=> !!(blast && blast.phase==="play" && bonusOn() && !blast.bonus && blast.bonusAt!=null && blast.level>=blast.bonusAt);
// A round marked inField is played with the game itself: its own things in its own field, steered and
// shot the way the game is, with the bonus frame only around the edges. The game's input keeps
// working while it runs (its spawning and its clock don't), and the round watches what the game does.
const bonusInField=()=> !!(blast && blast.bonus && !blast.bonus.over && blast.bonus.g.inField);
const bonusPlaying=()=> bonusInField() && blast.bonus.ready;
const BONUS_KEYS_MAJ=["C","G","D","F","A","B♭","E"];
const bonusDiatonic=key=>[[0,""],[1,"m"],[2,"m"],[3,""],[4,""],[5,"m"]].map(([deg,q])=>({root:above(key,deg,[0,2,4,5,7,9][deg]), q}));
const bSym=c=>c.root+c.q;
// A game's own bonus rounds, which come before the shared ones: they use that game's controls and
// get harder as the game does, so a player who reaches level nine meets a harder round than one who
// reached level three.
const BONUS_OWN={blaster:["oddout"], command:["spell"], asteroids:["salvage"], breakout:["catch"], hunt:["clay"]};
function arcadeBonus(id){
  if(!blast || blast.bonus) return;
  blast.bonusAt=blast.level+BONUS_EVERY;
  const mine=(BONUS_OWN[blast.kind]||[]).map(x=>BONUS_GAMES.find(g=>g.id===x)).filter(Boolean);
  const owned=new Set(Object.values(BONUS_OWN).flat());              // a game's own round is that game's alone
  const pool=(mine.length ? mine : BONUS_GAMES.filter(g=>!owned.has(g.id))).filter(g=>!g.harp || BONUS_HARP_OK.has(blast.kind));
  const g = BONUS_GAMES.find(x=>x.id===id) || rnd(pool.filter(x=>x.id!==blast.lastBonus)) || rnd(pool);
  blast.lastBonus=g.id; blast.bonusPhase=blast.phase; blast.phase="bonus"; blast.bonusStart=performance.now();
  helpChord(null);
  const el=document.createElement("div"); el.className="bonusround"+(g.inField?" infield":"");
  el.innerHTML=`<div class="bohead"><span class="rainbow">BONUS ROUND</span><b>${g.name}</b></div><p class="boinstr">${g.instr}</p><div class="bostage"></div>
    <div class="botime"><i></i></div><p class="boscore">BONUS <b>0</b></p>`;
  blast.field.appendChild(el);
  const b={g, el, stage:el.querySelector(".bostage"), score:0, secs:g.secs||20, t0:performance.now(), over:false};
  b.add=(pts, x)=>{ b.score+=Math.max(0,Math.round(pts)); el.querySelector(".boscore b").textContent=b.score; sfx("bonus"); if(x) popup(...x, `+${Math.round(pts)}`, "#FFD35A"); };
  b.say=t=>{ el.querySelector(".boinstr").textContent=t; };
  b.finish=()=>bonusEnd(b);
  blast.bonus=b; sfx("level");
  if(g.inField){
    blast.field.classList.add("bonusfield");
    // its chords are the standard ones, so an alternate or custom layout is put aside for the round
    if(canWrite() && hasSetting(39) && mc.params[39]){ b.layoutWas=mc.params[39]; borrow(39,0); }
  }
  // first the warning: what's coming, its rules, and a count down; then the mini-game and its clock
  el.classList.add("intro"); b.stage.innerHTML=`<p class="bocount">3</p>`;
  let n=3; b.countT=setInterval(()=>{ n--; const c=b.stage.querySelector(".bocount");
    if(n>0){ if(c) c.textContent=n; sfx("press"); return; }
    clearInterval(b.countT); if(b.over) return;
    if(c) c.remove();                                         // the count goes as the round starts (an in-field round draws nothing over it)
    el.classList.remove("intro"); b.ready=true; b.t0=performance.now(); sfx("start");
    b.timer=setInterval(()=>{ const left=1-(performance.now()-b.t0)/(b.secs*1000);
      el.querySelector(".botime i").style.transform=`scaleX(${Math.max(0,left)})`;
      if(left<=0) bonusEnd(b); else if(b.g.tick) b.g.tick(b, .1); }, 100);
    g.start(b); }, BONUS_WARN/3);
}
const BONUS_WARN=4200;
function bonusEnd(b){
  if(b.over) return; b.over=true; clearInterval(b.timer); clearInterval(b.countT); if(b.g.stop) b.g.stop(b);
  if(b.g.inField && blast.field) blast.field.classList.remove("bonusfield");
  if(b.layoutWas!=null && canWrite()){ borrow(39, b.layoutWas); b.layoutWas=null; }   // the player's own layout back
  const pts=mulPts(b.score*(blast.level+1));
  // the tally: what was caught, what it scored and what the level multiplied it by, held long enough to read
  const lines=(b.tally||[]).map(([what,n])=>`<span>${what}</span><b>${n}</b>`).join("");
  b.el.classList.add("over");
  b.el.querySelector(".bostage").innerHTML=`<p class="boresult">${b.result||(b.score?"TIME!":"NO LUCK THIS TIME")}</p>
    ${lines?`<div class="botally">${lines}</div>`:""}
    <p class="bototal">BONUS ${b.score} × LEVEL ${blast.level+1} = <b>+${pts}</b></p>
    <p class="boback">THE GAME CARRIES ON…</p>`;
  blast.score+=pts; sfx("level");
  setTimeout(()=>{
    b.el.remove();
    if(!blast || blast.bonus!==b) return;
    bonusShift(blast, performance.now()-blast.bonusStart);
    blast.bonus=null; blast.phase=blast.bonusPhase||"play"; blast.last=performance.now();
    const bar=window[({blaster:"blastBar", command:"blastBarCommand", snake:"snBar", asteroids:"asBar", stack:"stBar", breakout:"boBar", fifths:"fdBar", chopper:"chBar", fleet:"kfBar", sweeper:"swBar", hunt:"hdBar", racer:"krBar", chomp:"ccBar", burger:"bkBar", kong:"dkBar", bros:"sbBar"})[blast.kind]];
    if(typeof bar==="function") bar();                        // the score, with the bonus in it
    stats.streak=stats.streak; scoreboard();
  }, b.tally && b.tally.length ? 3400 : 1800);
}
// input, while a bonus plays: it goes to the mini-game, not the game underneath
function bonusChord(voices){ const b=blast.bonus; if(!b || b.over || !b.ready || !b.g.chord) return; b.g.chord(b, voices.map(v=>v.pitch)); }
function bonusNote(pc){ const b=blast.bonus; if(!b || b.over || !b.ready || !b.g.note) return; b.g.note(b, mod(pc,12)); }
function bonusKnob(v, knob){ const b=blast.bonus; if(!b || b.over || !b.ready || !b.g.knob) return; b.g.knob(b, v, knob); }
document.addEventListener("keydown", e=>{
  const b=blast && blast.bonus; if(!b || b.over || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  if(!b.ready){ e.preventDefault(); e.stopImmediatePropagation(); return; }     // the warning: keys wait
  if(b.g.key && b.g.key(b, e.code, e.shiftKey)!==false){ e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
const bCard=(t,cls="")=>`<span class="bocard ${cls}">${t}</span>`;

const BONUS_GAMES=[
  // a piano tech's job: A 440 and a second note a little off, beating against it; tune the second
  // until the beats stop. The beats show as a pulsing ring, as fast as they sound.
  {id:"tune", name:"TUNE IT", secs:16,
   get instr(){ return `A 440 SOUNDS, AND A SECOND A A LITTLE OFF. ${typeof playOnScreen==="function" && playOnScreen() ? "DRAG THE KNOB UNDER THE GAME" : "TURN A KNOB, OR PRESS THE ARROW KEYS,"} UNTIL THE BEATING STOPS. PLAY A CHORD TO LOCK IT IN.`; },
   start(b){
     b.cents=(Math.random()<.5?-1:1)*(18+Math.random()*27); b.base=null; b.startCents=b.cents;
     b.stage.innerHTML=`<div class="bobeat"><i></i></div><p class="bosmall">THE RING PULSES WITH THE BEATS</p>`;
     // any knob tunes it: the minichord has to be sending them, which a game without knobs may not have asked for
     if(canWrite() && knobsReady() && mc.params[238]!==1) borrow(238,1);
     const ctx=piano.ctx;
     if(ctx && ctx.state!=="running") ctx.resume().catch(()=>{});   // a suspended context makes no sound at all
     if(ctx && settings.sounds){ try{
       const g=ctx.createGain(); g.gain.value=.07; g.connect(ctx.destination);
       const o1=ctx.createOscillator(), o2=ctx.createOscillator(); o1.type=o2.type="sine"; o1.frequency.value=440; o2.frequency.value=440;
       o1.connect(g); o2.connect(g); o1.start(); o2.start(); b.osc=[o1,o2,g]; }catch(e){} }
     this.set(b, b.cents);
   },
   set(b, c){ b.cents=Math.max(-60,Math.min(60,c)); const f=440*Math.pow(2,b.cents/1200), beats=Math.abs(f-440);
     if(b.osc) b.osc[1].frequency.value=f;
     const ring=b.stage.querySelector(".bobeat i"); if(ring) ring.style.animationDuration = beats<.05 ? "0s" : `${Math.min(8,1/beats)}s`; },
   // whichever knob turns: where it rests when first touched is where the tuning starts from
   knob(b, v, k){ b.kv=v; if(b.base==null || b.knobId!==k){ b.knobId=k; b.base=v; b.at=b.cents; return; } this.set(b, b.at+(v-b.base)*120); },
   // endless, as Fifths Defender's knob is: held against a stop, the tuning keeps going that way (after
   // a moment), and the knob's reckoning moves with it, so turning back carries on from there
   tick(b, dt){
     const v=b.kv; if(v==null || b.base==null){ b.edgeAt=null; return; }
     const dir = v<=.025 ? -1 : v>=.975 ? 1 : 0;
     if(!dir){ b.edgeAt=null; return; }
     const now=performance.now(); if(b.edgeAt==null){ b.edgeAt=now+420; return; } if(now<b.edgeAt) return;
     this.set(b, b.cents+dir*9*dt); b.at=b.cents; b.base=v;
   },
   key(b, code, shift){ const d={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1}[code]; if(d){ this.set(b, b.cents+d*(shift?5:1)); return; }
     if(code==="Enter"||code==="Space"){ this.lock(b); return; } return false; },
   note(b, pc){ const c=kmControl(pc); if(!c) return; if(c==="up"||c==="right") this.set(b,b.cents+2); else if(c==="down"||c==="left") this.set(b,b.cents-2); else this.lock(b); },
   chord(b){ this.lock(b); },
   lock(b){ const off=Math.abs(b.cents); b.add(Math.max(0,160-off*6)); b.result=off<1 ? "DEAD ON: NO BEATS AT ALL" : `OFF BY ${off.toFixed(1)} CENTS`; b.finish(); },
   stop(b){ if(b.osc){ try{ b.osc[0].stop(); b.osc[1].stop(); b.osc[2].disconnect(); }catch(e){} b.osc=null; } } },

  // a chord spelled out with one of its notes hidden: pluck the missing one
  {id:"missing", name:"MISSING NOTE", harp:true, secs:20,
   instr:"ONE NOTE OF THE CHORD IS MISSING. PLUCK IT ON THE HARP.",
   start(b){ b.n=0; this.next(b); },
   next(b){
     const root=rnd(["C","D","E","F","G","A","B","B♭","E♭","F♯"]), q=rnd(["","m","7","maj7","m7"]), t=spellChord(root,q);
     if(!t){ return this.next(b); }
     b.hide=Math.floor(Math.random()*t.length); b.ans=t[b.hide];
     b.stage.innerHTML=`<p class="bosym">${root}${q}</p><div class="bocards">${t.map((n,i)=>bCard(i===b.hide?"?":n, i===b.hide?"q":"")).join("")}</div>`;
   },
   note(b, pc){ if(pc===pcOfName(b.ans)){ b.add(60); b.n++; if(b.n>=4){ b.result="ALL FOUR FOUND"; b.finish(); } else this.next(b); }
     else { sfx("miss"); buzz(b.stage,true); } } },

  // four chords, three from one major key: play the one that doesn't belong
  // Chord Invaders' own, played with the game itself: four chords fall as they always do and stop,
  // three of them from one key. Steer under the one that doesn't belong and play it, exactly as in the
  // game; shoot a chord that belongs and it costs. Its company gets harder as the game goes on.
  {id:"oddout", name:"ODD ONE OUT", secs:22, inField:true,
   instr:"THREE OF THESE BELONG TO ONE KEY. SHOOT THE ONE THAT DOESN'T.",
   start(b){
     b.n=0; b.hits=0; b.misses=0; b.tally=[]; b.mine=[];
     const lv=Math.min(4, Math.floor((blast.level||0)/2));            // how far the game has got
     b.tier=[{n:4, qs:[""],        say:"MAJOR CHORDS"},
             {n:4, qs:["","m"],    say:"MAJOR AND MINOR"},
             {n:4, qs:["","m"],    say:"HARDER KEYS"},
             {n:5, qs:["","m","7"],say:"SEVENTHS IN THE MIX"},
             {n:5, qs:["","m","7","maj7","m7"], say:"EVERY CHORD THE GAME DROPS"}][lv];
     b.say(`${this.instr} · ${b.tier.say}`);
     this.next(b);
   },
   // the chords of this round, dropped into the game's field and left hanging where they stop
   next(b){
     const T=b.tier, key=rnd(BONUS_KEYS_MAJ), dia=bonusDiatonic(key).filter(c=>T.qs.includes(c.q));
     const inKey=new Set(dia.map(c=>pcOfName(c.root)+c.q));
     const belong=[...dia].sort(()=>Math.random()-.5).slice(0, T.n-1);
     let odd; for(let k=0;k<60;k++){ const c={root:rnd(ROOTS), q:rnd(T.qs)};
       if(!inKey.has(pcOfName(c.root)+c.q) && spellChord(c.root,c.q) && !belong.some(x=>pcOfName(x.root)===pcOfName(c.root) && x.q===c.q)){ odd=c; break; } }
     if(!odd) return this.next(b);
     b.ans=odd; b.key=key;
     const cards=[...belong, odd].sort(()=>Math.random()-.5);
     const H=blast.field.clientHeight||420, top=Math.round(H*.3);
     b.mine=cards.map((c,i)=>{
       const el=document.createElement("span"); el.className="fchord bonuschord"; el.textContent=bSym(c);
       el.style.left=`${12+(76/(cards.length-1))*i}%`; el.style.top="0";
       blast.field.appendChild(el);
       const it={el, sym:bSym(c), root:c.root, q:c.q, bass:null, bonus:false, rootPc:pcOfName(c.root), bassPc:null,
                 t0:performance.now(), y:top, odd:c===odd};
       blast.items.push(it);
       // it falls in, then hangs there: the game's own clock is stopped during a bonus round
       el.style.transform="translate(-50%,24px)"; void el.offsetWidth;
       el.style.transition="transform .9s ease-out"; el.style.transform=`translate(-50%,${top}px)`;
       setTimeout(()=>{ el.style.transition=""; }, 950);
       return it;
     });
   },
   // the game shot something: right or wrong, the round says so, and the game's own explosion has run
   shot(b, hit, how){
     const right=!!hit.odd;
     hit.done=true; hit.el.classList.add(right?"gone":"wrongshot");
     const x=hit.el.offsetLeft, y=(hit.y||0)+hit.el.offsetHeight/2;
     if(right){
       b.hits++; b.add(60+b.hits*20, [x,y]);
       sfx("bonus"); explode(x,y,36,["#FFD35A","#FFFFFF","#7FE9FF"]);
       setTimeout(()=>hit.el.remove(), 60);
       b.say(`${hit.sym} ISN'T IN ${b.key} MAJOR`);
       this.clear(b);
       if(b.hits>=4){ b.result="EVERY INTRUDER CAUGHT"; b.finish(); return; }
       setTimeout(()=>{ if(!b.over) this.next(b); }, 800);
     } else {
       b.misses++; b.score=Math.max(0, b.score-15); b.el.querySelector(".boscore b").textContent=b.score;
       sfx("miss"); buzz(blast.field, true); popup(x, y-10, "−15", "#FF4B3E");
       hit.done=false; hit.el.classList.remove("wrongshot");                 // it stays: try another
       b.say(`${hit.sym} BELONGS TO ${b.key} MAJOR`);
     }
   },
   // this round's chords, taken out of the game's field
   clear(b){ (b.mine||[]).forEach(it=>{ it.done=true; it.el.remove(); const i=blast.items.indexOf(it); if(i>=0) blast.items.splice(i,1); }); b.mine=[]; },
   stop(b){
     this.clear(b);
     b.tally=[["INTRUDERS CAUGHT", b.hits], ...(b.misses?[["WRONG SHOTS", `−${b.misses*15}`]]:[])];
     if(!b.result) b.result = b.hits ? `${b.hits} OF 4 CAUGHT` : "NONE CAUGHT";
   } },
  // Harp Command's own, played with its cannons: four notes stop in the sky above their strings, all but
  // one spelling a chord. Pluck the odd note's string and its cannon shoots it down; or play the chord
  // the others spell and every cannon fires at once, which is worth more. The harp is chromatic for
  // the round, so every note has a string; the chords and the odd note get harder as the game does.
  {id:"spell", name:"SPELL IT", secs:24, inField:true,
   instr:"ALL BUT ONE NOTE SPELL A CHORD. PLUCK THE ODD ONE, OR PLAY THE CHORD FOR THE REST.",
   start(b){
     b.hits=0; b.chords=0; b.misses=0; b.mine=[];
     const lv=Math.min(4, Math.round((blast.level||0)*4/Math.max(1, HC_LEVELS.length-1)));   // the five steps across Harp Command's levels
     b.tier=[{qs:[""],                           say:"MAJOR CHORDS"},
             {qs:["","m"],                       say:"MAJOR AND MINOR"},
             {qs:["","m","°","+"],               say:"DIMINISHED AND AUGMENTED TOO"},
             {qs:["7","maj7","m7"],              say:"SEVENTHS: FIVE NOTES"},
             {qs:["","m","7","maj7","m7","°","+"], near:true, say:"THE ODD NOTE A SEMITONE AWAY"}][lv];
     // every note has a string for the round
     b.waveWas=blast.wave; blast.wave={kind:"chrom"}; hcTuneHarp(); hcLabels();
     b.say(`${this.instr} · ${b.tier.say}`);
     this.next(b);
   },
   next(b){
     const T=b.tier;
     let root, q, tones;
     for(let k=0;k<40;k++){ root=rnd(ROOTS); q=rnd(T.qs); tones=spellChord(root,q); if(tones && !tones.some(t=>/𝄪|𝄫/.test(t))) break; }
     const pcs=new Set(tones.map(pcOfName));
     // the odd note: anywhere off the chord, or (at the top) a semitone from one of its notes
     const near=[...pcs].flatMap(p=>[mod(p+1,12),mod(p-1,12)]).filter(p=>!pcs.has(p));
     const pool = T.near ? near : [...Array(12).keys()].filter(p=>!pcs.has(p));
     // only an odd note that leaves one answer: with it in, no other set of the notes may make a chord of
     // this round's kinds (E♭ G B♭ with C would also be C minor, leaving B♭ odd)
     const iv=q=>(VL_TONES[q]||FORM[q].map(f=>f[1]));
     const isTierChord=set=>[...Array(12).keys()].some(r=>T.qs.some(qq=>{ const c=new Set(iv(qq).map(x=>mod(r+x,12))); return c.size===set.size && [...set].every(p=>c.has(p)); }));
     const unique=p=>{ const all=[...pcs,p]; return all.every(x=>x===p || !isTierChord(new Set(all.filter(y=>y!==x)))); };
     const fair=pool.filter(unique);
     if(!fair.length) return this.next(b);                        // this chord has no fair odd note: deal another
     const oddPc=rnd(fair), flats=tones.some(t=>t.includes("♭"));
     const oddName=(flats ? FLAT_NAMES : SHARP_NAMES)[oddPc];
     b.ans={root, q, oddPc, oddName};
     const notes=[...tones.map(n=>({name:n, pc:pcOfName(n), odd:false})), {name:oddName, pc:oddPc, odd:true}];
     const H=blast.field.clientHeight||420, top=Math.round(H*.32);
     b.mine=notes.map((n,i)=>{
       const el=document.createElement("span"); el.className="fchord fnote bonuschord"; el.textContent=n.name;
       el.style.left=`${blast.cannons[n.pc].x}px`; el.style.top="0";
       blast.field.appendChild(el);
       const y=top+(i%2)*28;                                     // alternate heights, so neighbours don't touch
       const it={el, string:n.pc, pc:n.pc, name:n.name, label:n.name, t0:performance.now(), y, odd:n.odd};
       blast.items.push(it);
       el.style.transform="translate(-50%,24px)"; void el.offsetWidth;
       el.style.transition="transform .9s ease-out"; el.style.transform=`translate(-50%,${y}px)`;
       setTimeout(()=>{ el.style.transition=""; }, 950);
       return it;
     });
   },
   won(b, how){
     const sym=`${b.ans.root}${b.ans.q}`;
     b.say(how==="chord" ? `${sym}: ${spellChord(b.ans.root,b.ans.q).join(" ")}` : `${b.ans.oddName} ISN'T IN ${sym}`);
     setTimeout(()=>{ this.clear(b); if(b.hits+b.chords>=4){ b.result="EVERY CHORD SPELLED"; b.finish(); } else if(!b.over) this.next(b); }, 700);
   },
   // a cannon has hit a note
   shot(b, hit){
     const x=hit.el.offsetLeft, y=(hit.y||0)+hit.el.offsetHeight/2;
     if(hit.odd){
       b.hits++; b.add(60+(b.hits+b.chords)*20, [x,y]);
       sfx("bonus"); explode(x,y,30,["#FFD35A","#FFFFFF","#7FE9FF"]); hit.el.remove();
       b.mine.filter(i=>!i.odd).forEach(i=>i.el.classList.add("spelled"));
       this.won(b, "pluck");
     } else {
       b.misses++; b.score=Math.max(0,b.score-15); b.el.querySelector(".boscore b").textContent=b.score;
       sfx("miss"); buzz(blast.field,true); popup(x, y-10, "−15", "#FF4B3E");
       hit.done=false;                                            // it stays: it belongs
       b.say(`${hit.name} IS IN THE CHORD`);
     }
   },
   // the chord the notes spell, played on the buttons: every one of its notes shot down at once
   chord(b, pitches){
     if(!b.ready || b.over || !b.ans) return;
     if(isChord(pitches, pcOfName(b.ans.root), b.ans.q)){
       b.chords++; b.add(100+(b.hits+b.chords)*20);
       const fr=blast.field;
       b.mine.filter(i=>!i.odd && !i.done).forEach((it,k)=>{ it.done=true; const c=blast.cannons[it.string]; c.fired=performance.now();
         const x=it.el.offsetLeft, y=(it.y||0)+it.el.offsetHeight/2;
         blast.fx.missiles.push({x0:c.x/PX, y0:(fr.clientHeight-30)/PX, x1:x/PX, y1:y/PX, t0:performance.now()+k*40, dur:170,
           hit:()=>{ sfx("boom"); explode(x,y,26); it.el.remove(); }}); });
       sfx("shoot");
       const odd=b.mine.find(i=>i.odd); if(odd) odd.el.classList.add("exposed");
       this.won(b, "chord");
     } else if(chordId(pitches)){
       b.misses++; b.score=Math.max(0,b.score-15); b.el.querySelector(".boscore b").textContent=b.score;
       sfx("miss"); buzz(blast.field,true); b.say("THAT ISN'T THE CHORD THEY SPELL");
     }
   },
   clear(b){ (b.mine||[]).forEach(it=>{ it.done=true; it.el.remove(); const i=blast.items.indexOf(it); if(i>=0) blast.items.splice(i,1); }); b.mine=[]; },
   stop(b){
     this.clear(b);
     if(b.waveWas){ blast.wave=b.waveWas; b.waveWas=null; hcTuneHarp(); hcLabels(); }    // the harp back to its key
     b.tally=[["ODD NOTES SHOT", b.hits], ["CHORDS PLAYED", b.chords], ...(b.misses?[["WRONG", `−${b.misses*15}`]]:[])];
     if(!b.result) b.result = (b.hits+b.chords) ? `${b.hits+b.chords} OF 4 SPELLED` : "NONE SPELLED";
   } },
  // Chord Asteroids' own, played in its field: the game's rocks stop, and a field of wreckage drifts
  // round the ship, loose notes the size of the notes a chord rock cracks into. A call names a chord;
  // pluck each of its notes on the harp and the ship's tractor beam hauls that one in, filling its slot.
  // When every slot is full the chord is rebuilt and the next call comes. Junk (a note that isn't in the
  // chord) is hauled in too and thrown out, costing two seconds of the round's clock, never a life; and a
  // string with nothing of its note out there jams the beam for a moment, as it jams the gun in the game,
  // so a sweep across the harp hauls in a piece or two and stalls instead of emptying the field. The
  // chords are the game's own level's, and the junk thickens, then sits a semitone from the real parts,
  // as the game goes on.
  {id:"salvage", name:"SALVAGE RUN", secs:26, inField:true,
   instr:"REBUILD THE CHORD FROM THE WRECKAGE: PLUCK EACH OF ITS NOTES TO HAUL IT IN. JUNK COSTS TIME, AND AN EMPTY STRING JAMS THE BEAM.",
   start(b){
     b.built=0; b.parts=0; b.junk=0; b.mine=[];
     const lv=Math.min(AS_LEVELS.length-1, blast.level||0);
     b.level=AS_LEVELS[lv];
     b.tier=[{junk:3}, {junk:4}, {junk:4}, {junk:5, near:true}, {junk:5, near:true}][lv];
     b.say(`${b.level.n.toUpperCase()}${b.tier.near?" · THE JUNK A SEMITONE OFF":""}`);   // the rules were read in the warning; the field needs the room
     this.next(b);
   },
   next(b){
     const L=b.level;
     let root, q, tones;
     for(let k=0;k<60;k++){ root=rnd(L.roots==="natural" ? ["C","D","E","F","G","A","B"] : ROOTS); q=rnd(L.qs); tones=spellChord(root,q);
       if(tones && !tones.some(t=>/𝄪|𝄫/.test(t))) break; tones=null; }
     if(!tones) return this.next(b);
     const pcs=new Set(tones.map(pcOfName));
     // the junk: notes out of the chord, all different; at the top, a semitone from one of its notes
     const near=[...new Set([...pcs].flatMap(p=>[mod(p+1,12),mod(p-1,12)]))].filter(p=>!pcs.has(p));
     const pool=(b.tier.near ? near : [...Array(12).keys()].filter(p=>!pcs.has(p))).sort(()=>Math.random()-.5);
     const flats=tones.some(t=>t.includes("♭")), junk=pool.slice(0, b.tier.junk).map(p=>({name:(flats?FLAT_NAMES:SHARP_NAMES)[p], pc:p, part:false}));
     b.ans={root, q, tones, pcs, sym:root+q}; b.got=new Set();
     this.tray(b);
     // the wreckage, spread round the ship outside its orbit, drifting slowly
     const W=blast.field.clientWidth||900, H=blast.field.clientHeight||420, cx=blast.hx??W/2, cy=blast.hy??H/2;
     const all=[...tones.map(n=>({name:n, pc:pcOfName(n), part:true})), ...junk].sort(()=>Math.random()-.5);
     const R0=(blast.orbitR||100)+50, a0=Math.random()*Math.PI*2;
     b.mine=all.map((n,i)=>{
       const a=a0+i/all.length*Math.PI*2+(Math.random()-.5)*.3, R=R0+Math.random()*Math.max(20, Math.min(W,H)*.5-R0-30);
       const x=Math.max(30, Math.min(W-30, cx+Math.cos(a)*R*(W/H>1.4?1.6:1))), y=Math.max(40, Math.min(H-40, cy+Math.sin(a)*R));
       const r=asRock("note", x, y, n.name, {name:n.name, pc:n.pc, part:n.part});
       r.kind="salvage"; r.el.classList.add("salvage","bonuschord");
       const da=Math.random()*Math.PI*2, sp=14+Math.random()*16; r.vx=Math.cos(da)*sp; r.vy=Math.sin(da)*sp;
       r.el.style.transform=`translate(${r.x}px,${r.y}px) translate(-50%,-50%)`;
       return r;
     });
   },
   // the chord being rebuilt: its name and a slot for each note, filled as its parts come in
   tray(b){
     b.stage.innerHTML=`<p class="bosym small">${b.ans.sym}</p><div class="bocards tray">${b.ans.tones.map(n=>bCard(b.got.has(pcOfName(n))?n:"?", b.got.has(pcOfName(n))?"done":"q")).join("")}</div>`;
   },
   // every frame: the wreckage drifts and wraps; what's being hauled comes in fast, and lands
   move(b, now, dt){
     const W=blast.field.clientWidth||900, H=blast.field.clientHeight||420;
     for(const r of b.mine){
       if(r.dead) continue;
       if(r.towed){
         const ax=blast.cx-r.x, ay=blast.cy-r.y, d=Math.hypot(ax,ay)||1;
         if(d<16){ this.land(b, r); continue; }
         const sp=Math.min(420, 160+(now-r.towed)*.6); r.vx=ax/d*sp; r.vy=ay/d*sp;
       }
       r.x+=r.vx*dt; r.y+=r.vy*dt; r.ang+=r.spin*dt;
       if(!r.towed){ if(r.x<-20) r.x=W+19; else if(r.x>W+20) r.x=-19; if(r.y<-20) r.y=H+19; else if(r.y>H+20) r.y=-19; }
       r.el.style.transform=`translate(${r.x}px,${r.y}px) translate(-50%,-50%)`;
     }
   },
   // a string plucked: the nearest piece of wreckage of that note is caught in the tractor beam; a
   // string with none jams it, so the rest of a sweep finds it jammed
   pluck(b, pc){
     if(b.over || !b.ans || b.between) return;
     const now=performance.now();
     if(now<(b.jamUntil||0)){ heard("", false, "JAMMED"); return; }
     const r=b.mine.filter(x=>!x.dead && !x.towed && x.pc===pc).sort((p,q)=>Math.hypot(p.x-blast.cx,p.y-blast.cy)-Math.hypot(q.x-blast.cx,q.y-blast.cy))[0];
     const nm=r ? r.name : (b.ans.tones.find(t=>pcOfName(t)===pc) || SHARP_NAMES[pc]);
     if(!r){ heard(nm, false, b.got.has(pc) ? "ALREADY IN" : "NOTHING THERE"); sfx("freeze"); buzz(blast.field, true);
       b.jamUntil=now+1000; popup(blast.cx, blast.cy+40, "BEAM JAMMED", "#7FE9FF"); return; }
     heard(nm, true); sfx("press");
     r.towed=performance.now(); r.el.classList.add("towed");
     if(!asManual()) blast.shipAng=Math.atan2(r.y-blast.cy, r.x-blast.cx);
   },
   // a piece hauled in: a part fills its slot, junk is thrown out and costs time
   land(b, r){
     asKill(r);
     if(r.part){
       b.parts++; b.got.add(r.pc); b.add(10, [blast.cx, blast.cy-24]); this.tray(b);
       if(b.ans.tones.every(t=>b.got.has(pcOfName(t)))) this.rebuilt(b);
     } else {
       b.junk++; b.t0-=2000; sfx("miss"); buzz(blast.field, true);
       explode(blast.cx, blast.cy, 18, ["#FF4B3E","#FF8A3D"]); popup(blast.cx, blast.cy-24, "JUNK −2 SECONDS", "#FF4B3E");
       b.say(`${r.name} ISN'T IN ${b.ans.sym}`);
     }
   },
   rebuilt(b){
     b.built++; b.between=true; b.add(60+b.built*20, [blast.cx, blast.cy-44]);
     explode(blast.cx, blast.cy, 40, ["#FFD35A","#FFFFFF","#7FE9FF"]);
     b.say(`${b.ans.sym} REBUILT: ${b.ans.tones.join(" ")}`);
     b.stage.querySelector(".bosym")?.classList.add("lit");
     setTimeout(()=>{ if(b.over) return; this.clear(b); b.between=false;
       if(b.built>=4){ b.result="EVERY CHORD REBUILT"; b.finish(); } else this.next(b); }, 800);
   },
   clear(b){ (b.mine||[]).forEach(r=>{ if(!r.dead) asKill(r); }); blast.rocks=blast.rocks.filter(r=>!(b.mine||[]).includes(r)); b.mine=[]; },
   stop(b){
     this.clear(b);
     b.tally=[["CHORDS REBUILT", b.built], ["PARTS HAULED IN", b.parts], ...(b.junk?[["JUNK", `−${b.junk*2} SECONDS`]]:[])];
     if(!b.result) b.result = b.built ? `${b.built} OF 4 REBUILT` : "NONE REBUILT";
   } },
  // Chord Breakout's own, played in its field with the paddle: the wall and the ball hold still and dim,
  // a chord is called with a slot for each of its notes, and notes fall from the top, spelled. Catch the
  // chord's notes with the paddle, steered as in the game, and let the others fall: a wrong one caught
  // costs two seconds of the round's clock, never a life. Every slot full scores the chord and calls the
  // next, up to four. The chords are the game's own level's; as the game goes on the notes fall faster
  // and the wrong ones come thicker, and at the top they sit a semitone from the right ones.
  {id:"catch", name:"CHORD CATCH", secs:24, inField:true,
   instr:"CATCH THE CHORD'S NOTES WITH THE PADDLE. LET THE OTHERS FALL: A WRONG ONE COSTS TIME.",
   start(b){
     b.built=0; b.caught=0; b.junk=0; b.drops=[];
     const lv=Math.min(BO_LEVELS.length-1, blast.level||0);
     b.level=BO_LEVELS[lv];
     b.tier=[{vy:85, gap:950, junk:.4}, {vy:100, gap:850, junk:.45}, {vy:115, gap:780, junk:.5}, {vy:130, gap:720, junk:.55, near:true}][Math.min(3, Math.floor(lv/2))];
     b.say(`${boLevelName(lv).toUpperCase()}${b.tier.near?" · THE WRONG ONES A SEMITONE OFF":""}`);
     this.next(b);
   },
   next(b){
     const L=b.level;
     let root, q, tones;
     for(let k=0;k<60;k++){ root=rnd(L.roots==="natural" ? ["C","D","E","F","G","A","B"] : ROOTS); q=rnd(L.qs); tones=spellChord(root,q);
       if(tones && !tones.some(t=>/𝄪|𝄫/.test(t))) break; tones=null; }
     if(!tones){ root="C"; q=""; tones=spellChord("C",""); }
     const pcs=new Set(tones.map(pcOfName));
     // the wrong notes: out of the chord; at the top, a semitone from one of its notes
     const near=[...new Set([...pcs].flatMap(p=>[mod(p+1,12),mod(p-1,12)]))].filter(p=>!pcs.has(p));
     b.pool=b.tier.near ? near : [...Array(12).keys()].filter(p=>!pcs.has(p));
     b.flats=tones.some(t=>t.includes("♭"));
     b.ans={root, q, tones, pcs, sym:root+q}; b.got=new Set(); b.dropAt=performance.now()+400;
     this.tray(b);
   },
   // the chord being caught: its name and a slot for each note, filled as its notes come in
   tray(b){
     b.stage.innerHTML=`<p class="bosym small">${b.ans.sym}</p><div class="bocards tray">${b.ans.tones.map(n=>bCard(b.got.has(pcOfName(n))?n:"?", b.got.has(pcOfName(n))?"done":"q")).join("")}</div>`;
   },
   // every frame: a note now and then from the top, the notes falling, the paddle catching them
   move(b, now, dt){
     if(b.over || !b.ans) return;
     const W=blast.W||blast.field.clientWidth||900, H=blast.H||blast.field.clientHeight||420, p=blast.paddle;
     if(!b.between && now>=b.dropAt && b.drops.length<5){
       b.dropAt=now+b.tier.gap*(.8+Math.random()*.4);
       const need=b.ans.tones.filter(t=>!b.got.has(pcOfName(t)) && !b.drops.some(d=>d.part && d.pc===pcOfName(t)));
       const part=need.length>0 && Math.random()>=b.tier.junk;
       const name=part ? rnd(need) : (b.flats?FLAT_NAMES:SHARP_NAMES)[rnd(b.pool)];
       const el=document.createElement("div"); el.className="botone bocatch"; el.textContent=name; blast.field.appendChild(el);
       b.drops.push({name, pc:pcOfName(name), part, x:40+Math.random()*(W-80), y:60, vy:b.tier.vy*(.9+Math.random()*.2)/speedMul(), el});
     }
     for(const d of [...b.drops]){
       d.y+=d.vy*dt; d.el.style.transform=`translate(${d.x}px,${d.y}px) translate(-50%,-50%)`;
       if(d.y+12>=blast.padY-2 && d.y-12<=blast.padY+16 && Math.abs(d.x-(p.x+p.w/2))<p.w/2+16){ this.land(b, d); continue; }
       if(d.y>H+20){ d.el.remove(); b.drops=b.drops.filter(x=>x!==d); }
     }
   },
   // a note caught: one of the chord's fills its slot; a wrong one costs time
   land(b, d){
     d.el.remove(); b.drops=b.drops.filter(x=>x!==d);
     const p=blast.paddle, cx=p.x+p.w/2;
     if(d.part && !b.got.has(d.pc)){
       b.got.add(d.pc); b.caught++; heard(d.name, true); b.add(10, [cx, blast.padY-24]); this.tray(b);
       if(b.ans.tones.every(t=>b.got.has(pcOfName(t)))) this.rebuilt(b);
     } else if(d.part){ popup(cx, blast.padY-24, "ALREADY IN", "#9A93B5"); }
     else {
       b.junk++; b.t0-=2000; sfx("miss"); buzz(blast.field, true); heard(d.name, false, "NOT IN THE CHORD");
       popup(cx, blast.padY-24, "WRONG −2 SECONDS", "#FF4B3E");
       b.say(`${d.name} ISN'T IN ${b.ans.sym}`);
     }
   },
   rebuilt(b){
     const p=blast.paddle;
     b.built++; b.between=true; b.add(60+b.built*20, [p.x+p.w/2, blast.padY-44]);
     explode(p.x+p.w/2, blast.padY-10, 34, ["#FFD35A","#FFFFFF","#7FE9FF"]);
     b.say(`${b.ans.sym} CAUGHT: ${b.ans.tones.join(" ")}`);
     b.stage.querySelector(".bosym")?.classList.add("lit");
     this.clear(b);
     setTimeout(()=>{ if(b.over) return; b.between=false;
       if(b.built>=4){ b.result="EVERY CHORD CAUGHT"; b.finish(); } else this.next(b); }, 800);
   },
   clear(b){ (b.drops||[]).forEach(d=>d.el.remove()); b.drops=[]; },
   stop(b){
     this.clear(b);
     b.tally=[["CHORDS CAUGHT", b.built], ["NOTES CAUGHT", b.caught], ...(b.junk?[["WRONG NOTES", `−${b.junk*2} SECONDS`]]:[])];
     if(!b.result) b.result = b.built ? `${b.built} OF 4 CAUGHT` : "NONE CAUGHT";
   } },
  // Chord Hunt' own: clay pigeons, two at a time, and each pair a cadence. Home sounds, then the
  // cadence's two chords; shoot both clays by playing them in order, and the cadence is named:
  // authentic, plagal, half or deceptive. A wrong chord and the pair's lost (it's said what it was).
  // Later in the game the keys widen, and V7, the minor iv and the deceptive V7 come in.
  {id:"clay", name:"CLAY SHOOTING", secs:24,
   instr:"HOME SOUNDS, THEN A CADENCE: TWO CHORDS. SHOOT BOTH CLAYS BY PLAYING THEM IN ORDER.",
   start(b){ b.pairs=0; b.named={}; this.next(b); },
   next(b){
     const late=(blast.level||0)>=4, key=hdKey(rnd(late ? ["C","G","F","D","B♭","A","E♭"] : ["C","G","F"]));
     const C=[["V","I","AUTHENTIC"],["IV","I","PLAGAL"],["I","V","HALF"],["IV","V","HALF"],["ii","V","HALF"],["V","vi","DECEPTIVE"],
       ...(late ? [["V7","I","AUTHENTIC"],["iv","I","PLAGAL, MINOR iv"],["V7","vi","DECEPTIVE"]] : [])];
     const c=rnd(C.filter(x=>x!==b.last)); b.last=c;
     b.pair=[hdChord(key,c[0]), hdChord(key,c[1])]; b.kind=c[2]; b.i=0; b.listen=false; b.key=key;
     const lean=hdLean(key, ["I","ii","IV","V","vi",c[0],c[1]]);                 // the modifier's way for the key, as in the game
     if(lean && autoMod() && canWrite() && hasSetting(31)) ensure(31, lean>0 ? 0 : 1);
     b.stage.innerHTML=`<p class="bosmall">KEY OF ${key.label}</p><div class="hdclays">${b.pair.map(()=>`<span class="hdclay">?</span>`).join("")}</div>
       <div class="hdguide inbonus">${["I","ii","IV","V","vi"].map(n=>`<span><b>${n}</b><i>${hdChord(key,n).sym}</i></span>`).join("")}</div><p class="bosmall hdcadence">LISTEN…</p>`;
     const home=hdChord(key,"I"), hv=hdVoice(home.pc, home.q), v1=hdVoice(b.pair[0].pc, b.pair[0].q, {near:hv.upper}), v2=hdVoice(b.pair[1].pc, b.pair[1].q, {near:v1.upper});
     b.voiced=[hv,v1,v2];
     const ms=hdPlay([{at:0, notes:hv.notes, dur:.8},{at:1.05, notes:v1.notes, dur:.8},{at:1.95, notes:v2.notes, dur:1.1}]);
     const pair=b.pair; setTimeout(()=>{ if(b.over || b.pair!==pair) return; b.listen=true; const p=b.stage.querySelector(".hdcadence"); if(p) p.textContent="SHOOT!"; }, Math.min(ms, 1100));
   },
   chord(b, pitches){
     if(!b.listen) return; clearTimeout(b.pend);
     const c=b.pair[b.i], clays=b.stage.querySelectorAll(".hdclay");
     if(isChord(pitches, c.pc, c.q)){ clays[b.i].textContent=c.num; clays[b.i].classList.add("hit"); b.i++; b.add(30);
       if(b.i<2) return;
       b.listen=false; b.pairs++; b.named[b.kind]=(b.named[b.kind]||0)+1; b.add(40);
       b.stage.querySelector(".hdcadence").innerHTML=`<b>${b.kind}</b> · ${b.pair.map(x=>x.num).join("–")} · ${b.pair.map(x=>x.sym).join(" ")}`;
       const pair=b.pair; setTimeout(()=>{ if(!b.over && b.pair===pair) this.next(b); }, 1500); return; }
     if(!chordId(pitches)) return;
     const pair=b.pair;
     b.pend=setTimeout(()=>{ if(b.over || b.pair!==pair || !b.listen) return;            // a chord of two buttons passes through one: wait for it
       b.listen=false; sfx("miss"); buzz(b.stage,true);
       clays.forEach((x,i)=>{ if(i>=b.i){ x.textContent=b.pair[i].num; x.classList.add("lost"); } });
       b.stage.querySelector(".hdcadence").innerHTML=`MISSED: <b>${b.kind}</b> · ${b.pair.map(x=>x.num).join("–")} · ${b.pair.map(x=>x.sym).join(" ")}`;
       hdPlay([{at:0, notes:b.voiced[0].notes, dur:.7},{at:.9, notes:b.voiced[1].notes, dur:.7},{at:1.7, notes:b.voiced[2].notes, dur:1}]);
       setTimeout(()=>{ if(!b.over && b.pair===pair) this.next(b); }, 2900); }, 450);
   },
   stop(b){ clearTimeout(b.pend);
     b.tally=[["CADENCES SHOT", b.pairs], ...Object.entries(b.named).map(([k,n])=>[k, n])];
     if(!b.result) b.result = b.pairs ? `${b.pairs} CADENCE${b.pairs>1?"S":""} NAMED` : "NO CADENCES THIS TIME"; } },

  {id:"odd", name:"ODD ONE OUT", secs:20,
   instr:"THREE OF THESE CHORDS ARE FROM ONE KEY. PLAY THE ONE THAT DOESN'T BELONG.",
   start(b){ b.n=0; this.next(b); },
   next(b){
     const key=rnd(BONUS_KEYS_MAJ), dia=bonusDiatonic(key), three=[...dia].sort(()=>Math.random()-.5).slice(0,3);
     const inKey=new Set(dia.map(c=>pcOfName(c.root)+c.q));
     let odd; for(let k=0;k<40;k++){ const c={root:rnd(ROOTS), q:rnd(["","m"])}; if(!inKey.has(pcOfName(c.root)+c.q) && spellChord(c.root,c.q)){ odd=c; break; } }
     b.ans=odd; const cards=[...three, odd].sort(()=>Math.random()-.5);
     b.stage.innerHTML=`<div class="bocards big">${cards.map(c=>bCard(bSym(c))).join("")}</div>`;
   },
   chord(b, pitches){ if(isChord(pitches, pcOfName(b.ans.root), b.ans.q)){ b.add(70); b.n++; if(b.n>=3){ b.result="THREE INTRUDERS CAUGHT"; b.finish(); } else this.next(b); }
     else if(chordId(pitches)){ sfx("miss"); buzz(b.stage,true); } } },

  // a short progression: play the chord of the key it's in
  {id:"detective", name:"KEY DETECTIVE", secs:20,
   instr:"WHAT KEY IS THIS IN? PLAY ITS HOME CHORD.",
   start(b){ b.n=0; this.next(b); },
   next(b){
     const key=rnd(BONUS_KEYS_MAJ), d=bonusDiatonic(key), shapes=[[1,4,0],[3,4,0],[5,3,4],[0,5,1],[3,0,4]], s=rnd(shapes);
     b.ans={root:key, q:""}; const prog=s.map(i=>d[i]); if(s[1]===4) prog[1]={root:d[4].root, q:"7"};
     b.stage.innerHTML=`<div class="bocards big">${prog.map(c=>bCard(bSym(c))).join('<span class="boarrow">→</span>')}</div>`;
   },
   chord(b, pitches){ if(isChord(pitches, pcOfName(b.ans.root), "")){ b.add(80); b.n++; if(b.n>=3){ b.result="THREE KEYS CRACKED"; b.finish(); } else this.next(b); }
     else if(chordId(pitches)){ sfx("miss"); buzz(b.stage,true); } } },

  // a sequence of chords flashes up, one more each time: play it back
  {id:"simon", name:"SIMON SAYS", secs:24,
   instr:"WATCH THE CHORDS, THEN PLAY THEM BACK IN ORDER.",
   start(b){ const key=rnd(["C","G","F","D"]); b.pool=bonusDiatonic(key); b.seq=[rnd(b.pool),rnd(b.pool)]; this.show(b); },
   show(b){
     b.seq.push(rnd(b.pool)); b.pos=0; b.listening=false;
     b.stage.innerHTML=`<div class="bocards big">${b.seq.map(()=>bCard("·","dim")).join("")}</div><p class="bosmall">WATCH…</p>`;
     const cards=[...b.stage.querySelectorAll(".bocard")];
     b.seq.forEach((c,i)=>setTimeout(()=>{ if(b.over) return; cards.forEach(x=>x.textContent="·"); cards[i].textContent=bSym(c); cards[i].classList.add("lit");
       const t=spellChord(c.root,c.q); if(t && settings.sounds && piano.ctx) piano.play(t.map((n,k)=>48+pcOfName(n)+(k&&pcOfName(n)<pcOfName(t[0])?12:0)),{when:.02,dur:.6});
       setTimeout(()=>{ cards[i].classList.remove("lit"); if(i===b.seq.length-1 && !b.over){ cards.forEach(x=>x.textContent="·"); b.stage.querySelector(".bosmall").textContent="YOUR TURN"; b.listening=true; } }, 600); }, 250+i*800));
   },
   chord(b, pitches){ if(!b.listening) return; const c=b.seq[b.pos]; if(!c) return;
     if(isChord(pitches, pcOfName(c.root), c.q)){ const cards=b.stage.querySelectorAll(".bocard"); cards[b.pos].textContent=bSym(c); cards[b.pos].classList.add("done"); b.pos++;
       if(b.pos>=b.seq.length){ b.listening=false; b.add(25*b.seq.length); if(b.seq.length>=6){ b.result=`${b.seq.length} IN A ROW`; b.finish(); } else setTimeout(()=>{ if(!b.over) this.show(b); }, 500); } }
     else if(chordId(pitches)){ sfx("miss"); buzz(b.stage,true); b.result=`${b.seq.length-1} IN A ROW`; b.finish(); } } },
];
