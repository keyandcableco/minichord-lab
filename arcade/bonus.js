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
const BONUS_HARP_OK=new Set(["snake","stack","sweeper","asteroids","fifths","breakout","fleet","chopper","sight"]);
// every timestamp a game keeps, moved on by the bonus's length when the game resumes
const BONUS_TIME_KEYS=new Set(["t0","born","next","nextMove","nextFall","deadAt","serveAt","jamUntil","frozenUntil","edgeAt","shieldAt","hurtAt","crackedAt","callAt","deadline","fieldAt","fallAt","stepAt"]);
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
const BONUS_KEYS_MAJ=["C","G","D","F","A","B♭","E"];
const bonusDiatonic=key=>[[0,""],[1,"m"],[2,"m"],[3,""],[4,""],[5,"m"]].map(([deg,q])=>({root:above(key,deg,[0,2,4,5,7,9][deg]), q}));
const bSym=c=>c.root+c.q;
// A game's own bonus rounds, which come before the shared ones: they use that game's controls and
// get harder as the game does, so a player who reaches level nine meets a harder round than one who
// reached level three.
const BONUS_OWN={blaster:["oddout"]};
function arcadeBonus(id){
  if(!blast || blast.bonus) return;
  blast.bonusAt=blast.level+BONUS_EVERY;
  const mine=(BONUS_OWN[blast.kind]||[]).map(x=>BONUS_GAMES.find(g=>g.id===x)).filter(Boolean);
  const owned=new Set(Object.values(BONUS_OWN).flat());              // a game's own round is that game's alone
  const pool=(mine.length ? mine : BONUS_GAMES.filter(g=>!owned.has(g.id))).filter(g=>!g.harp || BONUS_HARP_OK.has(blast.kind));
  const g = BONUS_GAMES.find(x=>x.id===id) || rnd(pool.filter(x=>x.id!==blast.lastBonus)) || rnd(pool);
  blast.lastBonus=g.id; blast.bonusPhase=blast.phase; blast.phase="bonus"; blast.bonusStart=performance.now();
  helpChord(null);
  const el=document.createElement("div"); el.className="bonusround";
  el.innerHTML=`<div class="bohead"><span class="rainbow">BONUS ROUND</span><b>${g.name}</b></div><p class="boinstr">${g.instr}</p><div class="bostage"></div>
    <div class="botime"><i></i></div><p class="boscore">BONUS <b>0</b></p>`;
  blast.field.appendChild(el);
  const b={g, el, stage:el.querySelector(".bostage"), score:0, secs:g.secs||20, t0:performance.now(), over:false};
  b.add=(pts, x)=>{ b.score+=Math.max(0,Math.round(pts)); el.querySelector(".boscore b").textContent=b.score; sfx("bonus"); if(x) popup(...x, `+${Math.round(pts)}`, "#FFD35A"); };
  b.say=t=>{ el.querySelector(".boinstr").textContent=t; };
  b.finish=()=>bonusEnd(b);
  blast.bonus=b; sfx("level");
  // first the warning: what's coming, its rules, and a count down; then the mini-game and its clock
  el.classList.add("intro"); b.stage.innerHTML=`<p class="bocount">3</p>`;
  let n=3; b.countT=setInterval(()=>{ n--; const c=b.stage.querySelector(".bocount");
    if(n>0){ if(c) c.textContent=n; sfx("press"); return; }
    clearInterval(b.countT); if(b.over) return;
    el.classList.remove("intro"); b.ready=true; b.t0=performance.now(); sfx("start");
    b.timer=setInterval(()=>{ const left=1-(performance.now()-b.t0)/(b.secs*1000);
      el.querySelector(".botime i").style.transform=`scaleX(${Math.max(0,left)})`;
      if(left<=0) bonusEnd(b); else if(b.g.tick) b.g.tick(b, .1); }, 100);
    g.start(b); }, BONUS_WARN/3);
}
const BONUS_WARN=4200;
function bonusEnd(b){
  if(b.over) return; b.over=true; clearInterval(b.timer); clearInterval(b.countT); if(b.g.stop) b.g.stop(b);
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
    const bar=window[({blaster:"blastBar", command:"commandBar", snake:"snBar", asteroids:"asBar", stack:"stBar", breakout:"boBar", fifths:"fdBar", chopper:"chBar", fleet:"kfBar", sweeper:"swBar"})[blast.kind]];
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
   instr:"A 440 SOUNDS, AND A SECOND A A LITTLE OFF. TURN A KNOB, OR PRESS THE ARROW KEYS, UNTIL THE BEATING STOPS. PLAY A CHORD TO LOCK IT IN.",
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
  // Chord Invaders' own: the odd chord out, from harder company as the game goes on. The chords are
  // the ones the game is dropping at this level, so a player who has reached the sevenths meets
  // sevenths here. Each one caught is worth more than the last, and every wrong shot costs a little.
  {id:"oddout", name:"ODD ONE OUT", secs:22,
   instr:"THREE OF THESE BELONG TO ONE KEY. SHOOT THE ONE THAT DOESN'T.",
   start(b){
     b.n=0; b.hits=0; b.misses=0; b.tally=[];
     const lv=Math.min(4, Math.floor((blast.level||0)/2));            // how far the game has got
     b.tier=[{n:4, qs:[""],        say:"MAJOR CHORDS"},
             {n:4, qs:["","m"],    say:"MAJOR AND MINOR"},
             {n:5, qs:["","m"],    say:"FIVE TO CHOOSE FROM"},
             {n:5, qs:["","m","7"],say:"SEVENTHS IN THE MIX"},
             {n:6, qs:["","m","7","maj7","m7"], say:"EVERY CHORD THE GAME DROPS"}][lv];
     b.say(`${this.instr} · ${b.tier.say}`);
     this.next(b);
   },
   next(b){
     const T=b.tier, key=rnd(BONUS_KEYS_MAJ), dia=bonusDiatonic(key).filter(c=>T.qs.includes(c.q));
     const inKey=new Set(dia.map(c=>pcOfName(c.root)+c.q));
     const belong=[...dia].sort(()=>Math.random()-.5).slice(0, T.n-1);
     let odd; for(let k=0;k<60;k++){ const c={root:rnd(ROOTS), q:rnd(T.qs)};
       if(!inKey.has(pcOfName(c.root)+c.q) && spellChord(c.root,c.q) && !belong.some(x=>pcOfName(x.root)===pcOfName(c.root) && x.q===c.q)){ odd=c; break; } }
     if(!odd) return this.next(b);
     b.ans=odd; b.key=key;
     const cards=[...belong, odd].sort(()=>Math.random()-.5);
     b.stage.innerHTML=`<div class="bocards big">${cards.map(c=>bCard(bSym(c))).join("")}</div>`;
   },
   chord(b, pitches){
     if(isChord(pitches, pcOfName(b.ans.root), b.ans.q)){
       b.hits++; b.add(60+b.hits*20);                                  // each one worth more than the last
       [...b.stage.querySelectorAll(".bocard")].forEach(c=>{ if(c.textContent===bSym(b.ans)) c.classList.add("done"); });
       b.say(`${bSym(b.ans)} ISN'T IN ${b.key} MAJOR`);
       if(b.hits>=4){ b.result="EVERY INTRUDER CAUGHT"; b.finish(); return; }
       setTimeout(()=>{ if(!b.over) this.next(b); }, 700);
     } else if(chordId(pitches)){
       b.misses++; b.score=Math.max(0, b.score-15); b.el.querySelector(".boscore b").textContent=b.score;
       sfx("miss"); buzz(b.stage,true); b.say("THAT ONE BELONGS: TRY ANOTHER");
     }
   },
   stop(b){ b.tally=[["INTRUDERS CAUGHT", b.hits], ...(b.misses?[["WRONG SHOTS", `−${b.misses*15}`]]:[])];
     if(!b.result) b.result = b.hits ? `${b.hits} OF 4 CAUGHT` : "NONE CAUGHT"; } },
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
