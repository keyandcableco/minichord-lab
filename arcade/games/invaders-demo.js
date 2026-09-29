// Chord Invaders' demo, with its minichord drawn from the real outline.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- the demo: how to play the minichord ----------
// An arcade attract mode that teaches the instrument. A pixel minichord sits at the foot of the
// field: the modifier, the preset buttons with their light, and the 21 chord buttons, seven
// columns F C G D A E B, three rows major, minor and 7. Each scene drops a chord, lights the
// buttons that play it, and the pressed buttons shoot it down. Then the slash chord, and last
// the key change combo: both preset buttons held, the rows turning into sharp, natural and flat
// keys, one pressed. It runs from HOW TO PLAY, and on its own after a while on the title screen.
const DEMO_COLS=["F","C","G","D","A","E","B"];
const DEMO_SHIP=.28;                      // where the ship sits in the demo, as a share of the field's width: under the chords
// where the parts sit on the minichord, as percentages of its outline (from its layout drawing):
// the 21 chord buttons row by row, the modifier, the two preset buttons and the light
const MC_PARTS={"buttons": [[12.59, 17.03, 5.31, 9.74], [19.62, 17.03, 5.3, 9.74], [26.66, 17.03, 5.34, 9.74], [33.74, 17.03, 5.27, 9.74], [40.77, 17.03, 5.31, 9.74], [47.79, 17.03, 5.31, 9.74], [54.82, 17.03, 5.3, 9.74], [15.17, 30.28, 5.31, 9.89], [22.22, 30.28, 5.26, 9.89], [29.24, 30.28, 5.26, 9.89], [36.27, 30.28, 5.26, 9.89], [43.29, 30.28, 5.31, 9.89], [50.31, 30.28, 5.29, 9.89], [57.42, 30.28, 5.29, 9.89], [17.69, 43.6, 5.31, 9.88], [24.72, 43.6, 5.31, 9.88], [31.79, 43.6, 5.29, 9.88], [38.84, 43.6, 5.31, 9.88], [45.87, 43.6, 5.31, 9.88], [52.9, 43.6, 5.31, 9.88], [59.93, 43.6, 5.31, 9.88]], "mod": [8.34, 16.99, 2.58, 4.96], "presets": [[89.36, 64.89, 3.45, 5.98], [89.36, 72.98, 3.45, 5.97]], "led": [63.44, 63.27, 2.77, 5.27]};
const DEMO_ROWS=[["MAJ",""],["MIN","m"],["7","7"]];
const DEMO_SCENES=[
  {title:"THE MINICHORD", text:"SEVEN COLUMNS, ONE FOR EACH NOTE. THREE ROWS: MAJOR, MINOR AND 7.", hold:3600},
  {chord:"C",     col:1, rows:[0], text:"A MAJOR CHORD: ITS COLUMN'S TOP BUTTON"},
  {chord:"Am",    col:4, rows:[1], text:"A MINOR CHORD: THE MIDDLE ROW"},
  {chord:"G7",    col:2, rows:[2], text:"A 7 CHORD: THE BOTTOM ROW"},
  {chord:"Fmaj7", col:0, rows:[0,2], text:"MAJ7: MAJOR AND 7 TOGETHER"},
  {chord:"Dm7",   col:3, rows:[1,2], text:"M7: MINOR AND 7 TOGETHER"},
  {chord:"B°",    col:6, rows:[0,1], text:"DIMINISHED: MAJOR AND MINOR TOGETHER"},
  {chord:"C+",    col:1, rows:[0,1,2], text:"AUGMENTED: ALL THREE"},
  {chord:"F♯m",   col:0, rows:[1], mod:true, text:"SHARPS AND FLATS: HOLD THE MODIFIER TOO"},
  {flip:true, title:"SHARP OR FLAT?", text:"THE GAME SETS THE MODIFIER FOR THE NEXT CHORD. DOUBLE-TAP IT TO FLIP IT YOURSELF.", hold:4200},
  {chord:"C/E",   col:1, rows:[0], slash:5, text:"SLASH CHORDS: HOLD THE CHORD, THEN ANY BUTTON IN THE BASS NOTE'S COLUMN"},
  {key:true, title:"SETTING THE KEY", text:"HOLD BOTH PRESET BUTTONS. THE LIGHT BLINKS.", hold:3200},
  {key:true, keyPress:[3,1], text:"THE ROWS ARE NOW SHARP, NATURAL AND FLAT KEYS. PRESS ONE.", hold:3400},
  {key:false, keyDone:"D", text:"LET GO: YOU'RE IN D MAJOR. ITS F AND C BUTTONS NOW PLAY F♯ AND C♯.", hold:3800},
  {title:"READY?", text:"CHOOSE A LEVEL. PLAY EACH CHORD BEFORE IT LANDS.", hold:2800},
];
function stopDemo(){ if(blast && blast.demo){ blast.demo.run=false; blast.demo.el.remove(); blast.demo=null; } if(blast && blast.field) blast.field.classList.remove("demoing"); }
function runDemo(attract){
  if(!blast) return;
  newRun(); stopDemo(); clearTimeout(blast.attract);
  piano.start();
  if(blast.overlay) blast.overlay.hidden=true;
  blast.phase="demo";
  const el=document.createElement("div"); el.className="demo"; blast.field.appendChild(el);
  blast.field.classList.add("demoing");
  const token={run:true, el}; blast.demo=token;
  el.innerHTML=`<div class="demohead"><span class="demotag blink">DEMO</span><span class="demotitle"></span><button class="demoskip">SKIP ▶</button></div>
    <p class="democap"></p>
    <div class="board">
      <div class="mod" title="the modifier">♯</div><div class="pre">▲</div><div class="pre">▼</div><span class="led"></span>
      <div class="grid"></div>
    </div>`;
  el.querySelector(".demoskip").onclick=()=>endDemo(token);
  const grid=el.querySelector(".grid");
  const cells=[];
  // each part placed where it sits on the case, from the minichord's outline, as percentages of it
  const place=(el,[x,y,w,h])=>{ el.style.left=x+"%"; el.style.top=y+"%"; el.style.width=w+"%"; el.style.height=h+"%"; };
  const MOD_UP=[MC_PARTS.mod[0], MC_PARTS.mod[1]-2.6, MC_PARTS.mod[2], MC_PARTS.mod[3]];   // a touch higher, for balance
  place(el.querySelector(".mod"), MOD_UP);
  el.querySelectorAll(".pre").forEach((p,i)=>place(p, MC_PARTS.presets[i]));
  place(el.querySelector(".led"), MC_PARTS.led);
  DEMO_ROWS.forEach(([tag],r)=>{ const t=document.createElement("span"); t.className="rowtag"; t.textContent=tag;
    const first=MC_PARTS.buttons[r*7];
    if(r===0){ t.classList.add("undermod"); t.style.left=(MOD_UP[0]+MOD_UP[2]/2)+"%"; t.style.top=(MOD_UP[1]+MOD_UP[3]+1.4)+"%"; }   // the top row's tag sits under the modifier
    else { t.style.left=(first[0]-.8)+"%"; t.style.top=(first[1]+first[3]/2)+"%"; }
    grid.appendChild(t);
    DEMO_COLS.forEach((c,ci)=>{ const b=document.createElement("div"); b.className="cell"; place(b, MC_PARTS.buttons[r*7+ci]); (cells[ci]||=[])[r]=b; grid.appendChild(b); }); });
  const label=keyMode=>{ DEMO_ROWS.forEach(([tag,suf],r)=>{ grid.children[r*8].innerHTML = keyMode ? ["♯<br>KEYS","♮ KEYS","♭ KEYS"][r] : tag;   // under the modifier, KEYS beneath its ♯
    DEMO_COLS.forEach((c,ci)=>cells[ci][r].textContent = keyMode ? c+["♯","","♭"][r] : c+suf); }); };
  label(false);
  const $d=s=>el.querySelector(s), sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const clear=()=>{ el.querySelectorAll(".lit").forEach(x=>x.classList.remove("lit")); el.querySelectorAll(".slashlit").forEach(x=>x.classList.remove("slashlit")); };
  sfx("attract");
  // the chord a scene teaches, as it sounds: its notes on the piano, a slash chord with its bass below
  const chordNotes=sc=>{ const m=sc.chord.match(/^([A-G][♯♭]?)([^/]*)(?:\/(.+))?$/); if(!m) return [];
    const r=pcOfName(m[1]), qq=m[2], iv=(FORM[qq]||FORM[""]).map(f=>f[1]);
    return [...(m[3]?[36+pcOfName(m[3])]:[]), ...iv.map(x=>48+r+x)]; };
  const playChord=sc=>{ if(!settings.sounds || !piano.ctx) return; const go=()=>piano.play(chordNotes(sc),{when:.02,dur:1.3,vel:80});
    if(piano.ctx.state==="running") go(); else piano.ctx.resume().then(go).catch(()=>{}); };
  (async()=>{
    for(const sc of DEMO_SCENES){
      if(!token.run) return;
      clear(); $d(".demotitle").textContent=sc.title||""; $d(".democap").textContent=sc.text;
      el.classList.toggle("keymode", !!sc.key);
      $d(".led").classList.toggle("blinking", !!sc.key);
      el.querySelectorAll(".pre").forEach(p=>p.classList.toggle("lit", !!sc.key));
      label(!!sc.key || !!sc.keyPress);
      if(sc.key && !sc.keyPress){ sfx("combo"); setTimeout(()=>token.run && sfx("blinks"), 450); }
      if(sc.flip){   // the modifier tapped twice: its ♯ turns to ♭
        const m=$d(".mod");
        for(let k=0;k<2;k++){ await sleep(420); if(!token.run) return; m.classList.add("lit"); sfx("press"); await sleep(140); m.classList.remove("lit"); }
        m.textContent="♭"; sfx("letgo"); await sleep(sc.hold-1400); m.textContent="♯"; continue;
      }
      if(sc.keyPress){ await sleep(900); if(!token.run) return; cells[sc.keyPress[0]][sc.keyPress[1]].classList.add("lit"); sfx("press"); setTimeout(()=>token.run && sfx("key"), 120); }
      if(sc.keyDone){ label(false); sfx("letgo"); banner(`KEY OF ${sc.keyDone}`, "D MAJOR: F♯ AND C♯"); }
      if(sc.title==="READY?") sfx("level");
      if(sc.chord){
        // the chord falls, the buttons light one after another, and they shoot it down
        const ch=document.createElement("span"); ch.className="fchord democh"; ch.textContent=sc.chord; ch.style.left=`calc(${DEMO_SHIP*100}% - 2.2em)`; ch.style.top="92px";
        blast.field.appendChild(ch);
        requestAnimationFrame(()=>{ ch.style.transition="top 2.2s linear"; ch.style.top="210px"; });
        await sleep(700); if(!token.run){ ch.remove(); return; }
        if(sc.mod){ $d(".mod").classList.add("lit"); sfx("press"); await sleep(350); }
        for(const r of sc.rows){ cells[sc.col][r].classList.add("lit"); sfx("press"); await sleep(330); if(!token.run){ ch.remove(); return; } }
        if(sc.slash!=null){ await sleep(350); cells[sc.slash][0].classList.add("slashlit"); sfx("press"); }   // any button in the bass note's column
        playChord(sc);                                   // what those buttons play
        await sleep(450); if(!token.run){ ch.remove(); return; }
        // the ship fires, as it does in the game
        const fld=blast.field, x0=fld.clientWidth*(blast.shipF??DEMO_SHIP), y0=fld.clientHeight-22, x1=ch.offsetLeft+ch.offsetWidth/2, y1=ch.offsetTop+ch.offsetHeight/2;
        sfx("shoot");
        blast.fx.missiles.push({x0:x0/PX, y0:y0/PX, x1:x1/PX, y1:y1/PX, t0:performance.now(), dur:220,
          hit:()=>{ sfx("boom"); explode(x1,y1); ch.remove(); }});
        await sleep(1300);
      } else await sleep(sc.hold||3000);
    }
    if(token.run) endDemo(token);
  })();
}
function endDemo(token){
  if(!blast || blast.demo!==token) return;
  stopDemo(); blast.phase="menu";
  if(blast.overlay){ blast.overlay.hidden=false; }
  // back on the title screen, the attract loop runs again after a while
  clearTimeout(blast.attract);
  blast.attract=gameLater(()=>{ if(blast && blast.phase==="menu" && blast.overlay && !blast.overlay.hidden) runDemo(true); }, 25000);
  cabRestart();
}

function beginBlast(level){
  newRun();
  piano.start();
  cancelAnimationFrame(blast.raf); blast.last=performance.now(); blast.raf=requestAnimationFrame(blastTick);   // one loop, running, whatever happened before
  if(blast.overlay){ blast.overlay.remove(); blast.overlay=null; }
  stopDemo();
  blast.items.forEach(i=>i.el.remove()); if(blast.keyBar) blast.keyBar.el.remove();
  Object.assign(blast,{items:[], score:0, lives:3, level, startLevel:level, hits:0, next:performance.now()+900,
    fall:9000*Math.pow(.92,level)*speedMul(), gap:2600*Math.pow(.92,level)*speedMul(), over:false, phase:"play", keyBar:null, keyTarget:null, keyPaid:null, pauseForBarry:false, modFor:null});
  if(BLAST_LEVELS[level].barry && !blast.barry){ blast.barry=true; ensure(33,1); modPill(); }
  // every game starts in C major, whatever key the last one ended in, so the first chords are the
  // plain buttons; the player's own key goes back when they leave
  blastSetup();
  if(canWrite() && hasSetting(35)){ borrow(35, keyIndexOf(0)); blast.dir = Math.random()<.5 ? 1 : -1; ensure(31, blast.dir>0 ? 0 : 1); modPill(); }   // written every time, whatever the page last read
  settings.blastStart=String(level+1); save();
  stats.streak=0; scoreboard(); blastBar();
  banner(`LEVEL ${level+1}`, `${LEVEL_NAMES[level].toUpperCase()} · ${(SPEEDS[+saved.speed]||SPEEDS[0])[0].toUpperCase()}`);
  sfx("start");
  if(canWrite()) poll(true);
}
// The minichord's side of the game, whenever the minichord is there: when the game opens with it
// already connected, or when it connects later (the page opened on its own, then Connect). Keeps
// the player's own key signature to give back, sets the modifier and slash voice, and reads the
// settings every second so a key set with the combo is seen.
function blastSetup(){
  if(!blast || !canWrite() || blast.setupDone) return;
  blast.setupDone=true;
  if(!(35 in borrowed)) borrow(35, mc.params[35]);           // the key you change it to goes back when you leave
  ensure(31, blast.dir>0 ? 0 : 1);
  if(slashReady()) ensure(113,1);                             // for the slash levels, the slash note in the bass
  if(hasSetting(30)) ensure(30,0);                            // untransposed, so the buttons play the chords they name
  poll(true);
  modPill();
  // connected after the title screen came up: rebuild it, so levels that need the minichord appear
  if(blast.phase==="menu" && blast.overlay && !blast.overlay.hidden && blast.field){ blast.overlay.remove(); blast.overlay=null; blastMenu(); }
}
// Between games (the title screen, the demo, game over) the key signature is C major, so the
// first chords of the next game are plain buttons. During a game it's the player's to change.
function blastHomeKey(){
  if(!blast || !canWrite() || !hasSetting(35) || mc.params[35]===keyIndexOf(0)) return;
  borrow(35, keyIndexOf(0)); modPill();
}
function stopBlaster(){ if(blast){ blast.fx?.ro?.disconnect(); if(blast.kind==="chopper") chQuiet(); stopDemo(); clearTimeout(blast.attract); clearTimeout(blast.cabT); clearTimeout(blast.overT); blast.over=true; cancelAnimationFrame(blast.raf); poll(false); } blast=null; }
function blastBar(){
  if(!blast || !blast.hud) return;
  const key = blast.keyTarget ? ` · KEY ${blast.keyTarget.name}` : "";
  blast.hud.innerHTML=`<span>SCORE ${blast.score}${multTag()}</span><span class="lvl">LEVEL ${blast.level+1}${key}</span><span class="lives">${"♥".repeat(Math.max(0,blast.lives))||"-"}</span>`;
}
// a big message across the middle of the field: a new level, a key to set, Barry Harris
function banner(big, small){
  if(blast && blast.field) blast.field.querySelectorAll(".banner").forEach(b=>b.remove());
  if(!blast || !blast.field) return;
  const b=document.createElement("div"); b.className="banner"; b.innerHTML=`${big}${small?`<small>${small}</small>`:""}`;
  blast.field.appendChild(b); setTimeout(()=>b.remove(),2300);
}
function popup(x,y,text,colour){
  const p=document.createElement("div"); p.className="popup"; p.textContent=text; p.style.left=`${x}px`; p.style.top=`${y}px`; if(colour) p.style.color=colour;
  blast.field.appendChild(p); setTimeout(()=>p.remove(),950);
}
// the next chord: from the key bar's key once one has fallen, otherwise any button's
function pickBlastChord(slashNow){
  const lv=BLAST_LEVELS[blast.level], quals=blastQuals(), swap=x=> (settings.set==="barry"||blast.barry) ? (BARRY_SWAP[x]??x) : x;
  if(blast.keyTarget){
    const K=blast.keyTarget.name, d=rnd(DEGREES), root=above(K,d.st,d.se);
    const opts=[swap(d.q), SEVENTHS[d.n]?.[1]].filter(x=>x!=null && quals.includes(x));
    if(!root || !opts.length) return null;
    let qq=rnd(opts), bass=null;
    if(slashNow){
      qq=swap(d.q); const t=spellChord(root,qq); if(!t || !["","m","6","m6"].includes(qq)) return null;
      const i=Math.floor(Math.random()*7);
      bass = lv.slash==="inversion" ? rnd([t[1],t[2]]) : above(K,i,MAJOR[i]);   // a note of the key, a plain button once it's set
      if(!bass || pcOfName(bass)===pcOfName(root)) return null;
    }
    return spellChord(root,qq) ? {root,qq,bass} : null;
  }
  const roots=blastRoots(slashNow);
  let root=rnd(roots), qq=rnd(quals), bass=null;
  if(!spellChord(root,qq)) return null;
  if(slashNow){
    if(!["","m","6","m6"].includes(qq)) qq=rnd((settings.set==="barry"||blast.barry)?["6","m6"]:["","m"]);
    const t2=spellChord(root,qq); if(!t2) return null;
    const plain=blastRoots(true);
    bass = lv.slash==="inversion" ? rnd([t2[1],t2[2]]) : rnd(plain);
    if(!plain.includes(bass) || pcOfName(bass)===pcOfName(root)) return null;
  }
  return {root,qq,bass};
}
function spawnBlast(now){
  const lv=BLAST_LEVELS[blast.level];
  const onScreen=new Set(blast.items.filter(i=>!i.done).map(i=>i.sym));
  const slashNow = lv.slash && Math.random()<.35;        // on the slash levels about one chord in three
  const bonus = Math.random()<.13;                       // a ★ chord: five times the points, and harmless if it lands
  for(let k=0;k<40;k++){
    const c=pickBlastChord(slashNow); if(!c) continue;
    const sym=c.root+c.qq+(c.bass?`/${c.bass}`:"");
    if(onScreen.has(sym)) continue;
    const el=document.createElement("span"); el.className="fchord"+(bonus?" bonus":""); el.innerHTML=(bonus?PIXEL_STAR:""); el.append(sym);
    el.style.left=`${12+Math.random()*76}%`; el.style.top="0"; el.style.transform="translate(-50%,24px)";
    blast.field.appendChild(el);
    blast.items.push({el, sym, root:c.root, q:c.qq, bass:c.bass, bonus, rootPc:pcOfName(c.root), bassPc:c.bass?pcOfName(c.bass):null, t0:now});
    return;
  }
}
// Key bars are answered with the key change combo, which stock firmware (version 9) doesn't have,
// so they only fall for firmware that does.
const keyComboReady=()=>canWrite() && (mc.params[7]??0)>9;
function spawnKeyBar(now){
  if(!keyComboReady() || blast.keyBar) return;
  const here=devFifths(), f=rnd([-5,-4,-3,-2,-1,0,1,2,3,4,5,6].filter(x=>x!==here)), name=KEY_BY_FIFTHS[f];
  const el=document.createElement("div"); el.className="fkey";
  el.innerHTML=`KEY OF ${name} MAJOR<small>${sigText(f)}${f?`: ${sigList(f).join(" ")}`:""} · set it with the key change combo</small>`;
  el.style.top="24px"; blast.field.appendChild(el);
  blast.keyBar={el, f, name, t0:now}; blast.keyTarget={f, name};
  banner(`KEY OF ${name}`, "SET IT WITH THE KEY CHANGE COMBO");
  blastBar();
}
// called whenever the minichord reports its settings: has the key been set?
// Setting the key a bar asks for scores: while the bar is still falling, 25 points a level,
// with a banner so it's seen mid-game; once it has landed, a smaller consolation, once.
function blastKey(){
  if(!blast || blast.phase!=="play" || !canWrite()) return;
  const k=blast.keyBar, t=blast.keyTarget;
  if(k && devFifths()===k.f){
    const r=k.el.getBoundingClientRect(), fr=blast.field.getBoundingClientRect(), pts=mulPts(25*(blast.level+1));
    explode(r.left-fr.left+r.width/2, r.top-fr.top+r.height/2, 40, ["#5FA8FF","#B9E0FF","#FFFFFF"]);
    k.el.remove(); blast.keyBar=null; blast.keyPaid=t.f;
    blast.score+=pts; sfx("key"); popup(r.left-fr.left+r.width/2, r.top-fr.top, `+${pts} KEY SET`, "#B9E0FF");
    banner(`KEY SET! +${pts}`, `${k.name} MAJOR: ${k.f ? sigList(k.f).join(" ") : "NO SHARPS OR FLATS"}`);
    feedback(`Key of ${k.name} major: set. +${pts}`,"good",`${sigText(k.f)}${k.f?`, ${sigList(k.f).join(", ")}`:""}: every chord of the key is a plain button now.`);
    blastBar(); return;
  }
  if(!k && t && blast.keyPaid!==t.f && devFifths()===t.f){
    const pts=mulPts(10*(blast.level+1)); blast.keyPaid=t.f; blast.score+=pts; sfx("key");
    banner(`KEY SET +${pts}`, `${t.name} MAJOR, A LITTLE LATE`); blastBar();
  }
}
