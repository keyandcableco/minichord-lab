// The arcade kit (menus, option rows, demo stages, setup), the CRT look, the score multiplier, the
// arcade settings, the bezel's buttons, game over, and high scores.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- the arcade kit: what every game's title screen and demo share ----------
// A game describes its menu (title, rules, option rows, levels, what the game over line counts,
// where the modifier note goes) and arcadeMenu builds it, the same way for all of them; a demo
// asks demoShell for its stage and its clock. A fix here lands in every game at once.

// one option row: a label, and buttons of which the chosen one is lit
function arcadeRow(parent, label, list, get, set){
  const r=document.createElement("div"); r.className="optrow";
  const l=document.createElement("span"); l.className="optlabel"; l.textContent=label;
  const g=document.createElement("div"); g.className="levels";
  const mark=b=>{ [...g.children].forEach(x=>{ x.style.background=""; x.style.color=""; x.setAttribute("aria-pressed","false"); });
    b.style.background="#F1E8D2"; b.style.color="#16132A"; b.setAttribute("aria-pressed","true"); };
  list.forEach((n,i)=>{ const b=document.createElement("button"); b.textContent=n; b.setAttribute("aria-pressed","false");
    if(get()===i) mark(b); b.onclick=()=>{ set(i); mark(b); }; g.appendChild(b); });
  r.append(l,g); parent.appendChild(r);
  return r;
}
// a game's title screen or game over screen, from its description:
//   key       where its best score is kept (saved.best[key])
//   title     its name, as the title screen shows it
//   rules()   the rules, as paragraphs
//   stat()    what the game over line counts beside the score (the level, unless it says otherwise)
//   rows(row) its option rows: row(label, list, get, set) for each
//   levels    its levels (objects with n, or plain names); ok(i) whether this minichord can play one,
//             and needs, what to say when it can't; sig(), anything else its title screen depends on
//   begin(i)  start at level i; demo(), its demo
//   modNote   where the modifier note shows: "always", "title" (not at game over) or false
function arcadeMenu(g, over){
  if(over && hsOffer(()=>arcadeMenu(g,true))) return;
  if(!over) newRun();                                          // back at the title: nothing from before carries on
  const ov=document.createElement("div"); ov.className="overlay";
  const best=saved.best[g.key]||0;
  if(over){
    ov.innerHTML=`<h3 class="over">GAME OVER</h3><p>SCORE ${blast.score} · ${g.stat ? g.stat() : `LEVEL ${blast.level+1}`} · BEST ${best}</p>`;
    const again=document.createElement("button"); again.className="go"; again.innerHTML=`PLAY AGAIN<small>from level ${blast.startLevel+1}</small>`;
    again.onclick=()=>g.begin(blast.startLevel); ov.appendChild(again);
    sfx("over");
  } else {
    ov.innerHTML=`<h3>${g.title}</h3>${g.rules()}`;
    const how=document.createElement("button"); how.className="howto"; how.textContent="▶ HOW TO PLAY"; how.onclick=()=>g.demo(); ov.appendChild(how);
  }
  if(g.rows) g.rows((...a)=>arcadeRow(ov,...a));
  const lp=document.createElement("p"); lp.className = over ? "" : "blink"; lp.textContent = over ? "OR START FROM" : "CHOOSE A LEVEL"; ov.appendChild(lp);
  const lv=document.createElement("div"); lv.className="levels";
  g.levels.forEach((L,i)=>{ const b=document.createElement("button"), ok=g.ok ? g.ok(i) : true, n=typeof L==="string" ? L : L.n;
    b.innerHTML=`${i+1}<small>${n}${ok?"":`<br>${g.needs}`}</small>`; b.disabled=!ok; b.onclick=()=>g.begin(i); lv.appendChild(b); });
  ov.appendChild(lv);
  if(g.ok) blast.menuSig=g.levels.map((_,i)=>g.ok(i)).join()+(g.sig ? g.sig() : "");
  if(!over && best){ const p=document.createElement("p"); p.textContent=`BEST ${best}`; ov.appendChild(p); }
  if(g.modNote==="always" || (g.modNote==="title" && !over)) arcadeModNote(ov);
  arcadeKeys(ov);
  if(!over) arcadeCredit(ov);
  if(over) hsGameOverLine(ov);
  blast.field.appendChild(ov); blast.overlay=ov;
  if(over) overTimeout(ov, ()=>arcadeMenu(g));
  else cabinet(ov);
}
// a demo's stage: the DEMO banner with its title and caption, a skip button, the token that stops it,
// and its clock (step throws once the demo has been stopped, which ends the script)
function demoShell(end){
  newRun();
  const el=document.createElement("div"); el.className="demo"; blast.field.appendChild(el); blast.field.classList.add("demoing");
  const token={run:true, el}; blast.demo=token;
  el.innerHTML=`<div class="demohead"><span class="demotag blink">DEMO</span><span class="demotitle"></span><button class="demoskip">SKIP ▶</button></div><p class="democap"></p>`;
  el.querySelector(".demoskip").onclick=()=>end(token);
  const say=(t,c)=>{ el.querySelector(".demotitle").textContent=t||""; el.querySelector(".democap").textContent=c; };
  const sleep=ms=>new Promise(r=>setTimeout(r,ms)), step=async ms=>{ await sleep(ms); if(!token.run) throw 0; };
  return {el, token, say, sleep, step};
}
// a demo's chord, heard on the page's piano
function demoPlay(notes){ if(settings.sounds && piano.ctx){ const go=()=>piano.play(notes,{when:.02,dur:1}); piano.ctx.state==="running"?go():piano.ctx.resume().then(go).catch(()=>{}); } }
// Every stretch of a game, a play from level start to game over, a demo, a title screen, is a run
// of its own. A timer set with gameLater belongs to the run that set it, and only fires if that run is
// still going: a timer from a game that's over can't reach into the next one (Play Again pressed at
// once, say, while the old game still had a wave or a radio call on its way).
function newRun(){ if(blast) blast.gen=(blast.gen||0)+1; }
function gameLater(fn, ms){ const b=blast, g=b && b.gen;
  const run=()=>{ if(!(b && blast===b && b.gen===g)) return; if(b.phase==="bonus"){ setTimeout(run,200); return; } fn(); };   // a bonus playing: wait for it
  return setTimeout(run, ms||0); }
// A title screen rebuilt because the minichord's settings changed what it offers (once they first
// arrive, usually). Only at a quiet moment: not while the title loop is mid-way through its rules,
// points or scores, which it would redraw under the player; and if they were choosing options, they
// stay on that page.
function menuRebuild(build){
  const old=blast.overlay, hid=old.hidden, st=old.dataset.stage, pg=old.dataset.optpage;
  if(st && st!=="title" && st!=="options") return false;            // mid-loop: the next device update tries again
  old.remove(); blast.overlay=null; build(); blast.overlay.hidden=hid;
  if(st==="options" && blast.overlay.dataset.stage){ cabStage(blast.overlay,"options"); blast.overlay.dataset.optpage=pg||"options"; }
  return true;
}
// setting up for the minichord, once per game: its settings read regularly, and whatever it borrows
function arcadeSetup(fn){ if(blast.setupDone) return; blast.setupDone=true; poll(true); arcadeVolumes(); if(fn) fn(); }
// The minichord's chord and harp volumes (addresses 3 and 2, on the knobs by default) are also its MIDI
// velocities: turned right down, it sends notes a game can't hear. So a game turns up whichever it
// listens to, if it's down, for as long as it plays, and says so; and if one goes down mid-game, it says that.
const ARCADE_HARP=new Set(["command","snake","asteroids","stack","fifths","breakout","fleet","sweeper"]);
const ARCADE_CHORDS=k=>k!=="command";
function arcadeVolumes(){
  const up=[];
  if(ARCADE_CHORDS(blast.kind) && hasSetting(3) && (mc.params[3]??100)<25){ borrow(3,70); up.push("CHORD"); }
  if(ARCADE_HARP.has(blast.kind) && hasSetting(2) && (mc.params[2]??100)<25){ borrow(2,70); up.push("HARP"); }
  if(up.length) banner(`${up.join(" AND ")} VOLUME UP`, "IT WAS DOWN, SO THE GAME COULDN'T HEAR IT");
}
function arcadeVolumeWatch(){
  if(!blast || blast.phase!=="play" || !canWrite()) return;
  const down=[]; if(ARCADE_CHORDS(blast.kind) && (mc.params[3]??100)<5) down.push("CHORD"); if(ARCADE_HARP.has(blast.kind) && (mc.params[2]??100)<5) down.push("HARP");
  const key=down.join(); if(key===blast.volWarned) return; blast.volWarned=key;
  if(down.length) banner(`TURN THE ${down.join(" AND ")} VOLUME UP`, "AT ZERO THE GAME CAN'T HEAR YOU");
}

// ---------- the CRT look ----------
// An optional old-monitor look for the arcade: scanlines, a soft glow, the picture's corners
// darkened and rounded as a tube's are, a faint roll and flicker, and a slight colour fringe on the
// lettering. All of it is drawn over the field by the browser's own compositor, so it costs next to
// nothing, even on a slow machine. Switched on the title screens' options, and remembered.
function crtSync(){ document.querySelectorAll(".field.arcade").forEach(f=>f.classList.toggle("crt", !!saved.crt)); }
function crtRow(opts){
  const r=document.createElement("div"); r.className="optrow"; const l=document.createElement("span"); l.className="optlabel"; l.textContent="SCREEN";
  const g=document.createElement("div"); g.className="levels";
  const mark=b=>{ [...g.children].forEach(x=>{ x.style.background=""; x.style.color=""; }); b.style.background="#F1E8D2"; b.style.color="#16132A"; };
  [["FLAT",false],["CRT",true]].forEach(([t,v])=>{ const b=document.createElement("button"); b.textContent=t; if(!!saved.crt===v) mark(b);
    b.onclick=()=>{ saved.crt=v; save(); mark(b); crtSync(); }; g.appendChild(b); });
  r.append(l,g);
  const before=opts.querySelector("p.blink") || [...opts.querySelectorAll(".levels")].pop();
  opts.insertBefore(r, before);
}
new MutationObserver(()=>{ if(saved.crt) crtSync(); }).observe(document.getElementById("special")||document.body, {childList:true});


// ---------- the score multiplier ----------
// Harder settings score more: every point a game awards is multiplied by the speed's factor, and
// in Harp Command by how many notes fall at once, in Chord Breakout by the paddle's width. Set when
// a game begins, shown beside the score, on the options screen as it's chosen, and on its own screen
// in the title loop, with what each thing in the game is worth, the way Pac-Man listed its ghosts.
const MULT_SPEED=[1,1.25,1.5,1.75,2];                      // Relaxed … Wild
const MULT_DENSITY=[.8,1,1.25,1.5];                        // Harp Command: few, some, many, swarm
const MULT_PADDLE=[1.3,1,.8];                              // Chord Breakout: narrow, normal, wide
function diffMult(kind=cabKind()){
  let m = kind==="sweeper" ? 1 : MULT_SPEED[+saved.speed||0]||1;            // Chord Sweeper has no speed
  if(kind==="command") m*=MULT_DENSITY[saved.hcDensity??1]??1;
  if(kind==="breakout") m*=MULT_PADDLE[saved.boPaddle??1]??1;
  return Math.round(m*100)/100;
}
const mulPts=p=>Math.round(p*(blast.mult||1));
const multTag=()=> blast && blast.mult && blast.mult!==1 ? ` ×${blast.mult}` : "";
// what each game's things are worth at level 1 (all of it times the level)
const POINTS_FOR={
  blaster:()=>[...BLAST_TIERS.map(([,n,sp,v])=>[n,String(v),sp]), ["NEEDS THE MODIFIER","× 1.5"], ["SLASH CHORD","× 1.5"], ["★ CHORD","× 5"], ["KEY SET","25"]],
  command:[["NOTE","10"],["★ NOTE","50"]],
  snake:[["CHORD CASHED IN","15 A NOTE"],["★ NOTE","50"],["NOTE DROPPED","−5"]],
  asteroids:()=>[...BLAST_TIERS.map(([,n,sp,v])=>[n,String(v),sp]), ["NEEDS THE MODIFIER","× 1.5"], ["★ ROCK","× 3"], ["NOTE SHOT","10"], ["CHORD CLEARED","25"], ["MANUAL AIM","NOTES × 2"]],
  stack:()=>[...BLAST_TIERS.map(([,n,sp,v])=>[n,`${v} A NOTE`,sp]), ["A WHOLE ROW OF ONE CHORD","× 5"], ["CHORDS AT ONCE","× CHORDS"]],
  breakout:()=>[...BLAST_TIERS.map(([,n,sp,v])=>[n,String(v),sp]), ["NEEDS THE MODIFIER","× 1.5"], ["SLASH CHORD","× 1.5"], ["★ BRICK","× 5"], ["RALLY","UP TO × 4"], ["CHORD TONE SHOT","20"], ["WHOLE CHORD SHOT","× 2"]],
  fifths:[["ENEMY","10"],["HIT FAR OUT","UP TO +10"],["★ ENEMY","50"]],
  sight:[["NOTE READ","10"],["DEAD ON THE LINE","× 2"],["STREAK","UP TO × 4"],["A TUNE READ","100"]],
  frets:[["RIGHT BY EAR","20"],["FOUND IT WITH THE MODIFIER","30"]],
  sweeper:[["SQUARE SWEPT","5"],["MINE DEFUSED","100"],["SQUARES LEFT UNSWEPT","+2 EACH"],["QUICK CLEAR","UP TO +270"]],
  fleet:[["HIT","10"],["SHIP SUNK","50 A CHORD"],["SUNK BY DEDUCTION","+40 A CHORD UNHIT"],["NO MISSES","× 2"],["TORPEDO LEFT OVER","20"]],
  chopper:[["RESCUE","20"],["FAST RESCUE","UP TO +30"],["WAYPOINT","15"],["WHOLE ROUTE","× 2"],["WRONG PLACE","−2 SECONDS"]],
};
function multRows(kind){
  const rows = kind==="sweeper" ? [] : [["SPEED", SPEEDS.map((x,i)=>`${x[0].toUpperCase()} ×${MULT_SPEED[i]}`)]];
  if(kind==="command") rows.push(["NOTES AT ONCE", ["FEW","SOME","MANY","SWARM"].map((n,i)=>`${n} ×${MULT_DENSITY[i]}`)]);
  if(kind==="breakout") rows.push(["PADDLE", ["NARROW","NORMAL","WIDE"].map((n,i)=>`${n} ×${MULT_PADDLE[i]}`)]);
  return rows;
}
// the points screen in the title loop: the table filling in line by line, then the multipliers
const pointsFor=k=>{ const p=POINTS_FOR[k]; return typeof p==="function" ? p() : (p||[]); };
function pointsRender(el){
  const k=cabKind(), pts=pointsFor(k), long=pts.length>6;
  let i=0; const d=()=>`style="animation-delay:${(i++)*(long?.28:.45)}s"`;
  el.innerHTML=`<h3>POINTS</h3><ul class="ptable${long?" long":""}">${pts.map(([a,b,sp])=>`<li ${d()}><span>${a}</span>${sp?`<em class="pspell">${sp}</em>`:""}<i></i><b>${b}</b></li>`).join("")}<li class="ptnote" ${d()}>ALL TIMES THE LEVEL</li></ul>
    ${multRows(k).length?`<p class="ptsub" ${d()}>HARDER PLAY SCORES MORE</p>`:""}<ul class="ptable mult">${multRows(k).map(([n,list])=>`<li ${d()}><span>${n}</span><em>${list.join(" · ")}</em></li>`).join("")}</ul>`;
}
// the options screen: the multiplier for what's chosen, as it's chosen
function multLine(opts){
  const p=document.createElement("p"); p.className="multline";
  const upd=()=>{ p.textContent=`SCORE ×${diffMult()} FOR THESE SETTINGS`; };
  upd(); opts.addEventListener("click", ()=>setTimeout(upd));
  const before=opts.querySelector("p.blink") || [...opts.querySelectorAll(".levels")].pop();
  opts.insertBefore(p, before);
}


// ---------- an arcade game's own settings ----------
// On an arcade game's page the settings button opens the arcade's settings, not the Practice Room's:
// sounds, speed, beginner mode, the screen, the harp's layout and sound, the steering knob, the size
// of the lettering, the game's own options, and the double tap on the modifier. Everything is saved
// and shared with the title screens' options; the speed and the game's options apply from the next
// game, with the score multiplier they give.
function arcadeSettings(){
  const k=settings.mode, dlg=document.createElement("dialog"); dlg.id="arcadeDlg"; dlg.className="arcadedlg";
  const rows=[];
  const choice=(label, list, get, set, note)=>rows.push({label, list, get, set, note});
  choice("SOUNDS", ["ON","OFF"], ()=>settings.sounds?0:1, i=>{ settings.sounds=!i; save(); });
  if(k!=="sweeper") choice("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); }, "FROM THE NEXT GAME");
  if(k==="command") choice("NOTES AT ONCE", ["FEW","SOME","MANY","SWARM"], ()=>saved.hcDensity??1, i=>{ saved.hcDensity=i; save(); }, "FROM THE NEXT GAME");
  if(k==="breakout") choice("PADDLE", ["NARROW","NORMAL","WIDE"], ()=>saved.boPaddle??1, i=>{ saved.boPaddle=i; save(); }, "FROM THE NEXT GAME");
  choice("BEGINNER", ["OFF","SHOW WHAT TO PRESS"], ()=>saved.beginner?1:0, i=>{ saved.beginner=!!i; save(); helperSync(true); }, "NO HIGH SCORES WITH IT ON");
  choice("SCREEN", ["FLAT","CRT"], ()=>saved.crt?1:0, i=>{ saved.crt=!!i; save(); crtSync(); });
  choice("BONUS ROUNDS", ["ON","OFF"], ()=>saved.bonus===false?1:0, i=>{ saved.bonus=!i; save(); }, "A MINI-GAME EVERY TWO LEVELS");
  if(["blaster","asteroids","breakout","fifths","command"].includes(k))
    choice("LETTERING", SIZES.map(x=>x[0]), ()=>saved.chordSize??1, i=>{ saved.chordSize=i; save(); applyChordSize(); });
  if(["snake","stack","command","asteroids","fifths","sweeper","sight"].includes(k))
    choice("HARP", ["STANDARD STRIP","KEYMASTER"], ()=>saved.harpLayout==="keymaster"?1:0, i=>{ saved.harpLayout=i?"keymaster":"strip"; save(); if(["snake","stack"].includes(k)) kmRestrip(); else helperSync(true); });
  if(["snake","stack","sweeper"].includes(k))
    choice("HARP SOUND", ["NORMAL","QUIET","OFF"], ()=>saved.harpSound??1, i=>{ saved.harpSound=i; save(); if(blast && blast.setupDone) kmHarp(); });
  if(["breakout","fifths","stack"].includes(k))
    choice("STEER WITH", ["CHORD KNOB","HARP KNOB","MOD KNOB"], ()=>steerKnob(), i=>{ saved.steerKnob=i; save(); });
  choice("DOUBLE TAP", ["FLIPS THE MODIFIER","AS MY PRESET HAS IT"], ()=>settings.modTap==="off"?1:0, i=>{ settings.modTap=i?"off":"on"; save(); if(!i) modTap(); });
  dlg.innerHTML=`<h2>${LABELS[k].toUpperCase()} · SETTINGS</h2><div class="arows"></div><p class="amult"></p><div class="aend"><button type="button" class="aclose">DONE</button></div>`;
  const box=dlg.querySelector(".arows"), mult=dlg.querySelector(".amult");
  const upd=()=>{ mult.textContent=`SCORE ×${diffMult()} FOR THESE SETTINGS`; };
  rows.forEach(r=>{
    const row=document.createElement("div"); row.className="arow";
    row.innerHTML=`<span class="alabel">${r.label}${r.note?`<small>${r.note}</small>`:""}</span><div class="achoices"></div>`;
    const g=row.querySelector(".achoices");
    const mark=()=>[...g.children].forEach((b,i)=>b.classList.toggle("on", i===r.get()));
    r.list.forEach((t,i)=>{ const b=document.createElement("button"); b.type="button"; b.textContent=t; b.onclick=()=>{ r.set(i); mark(); upd(); }; g.appendChild(b); });
    mark(); box.appendChild(row);
  });
  upd();
  dlg.querySelector(".aclose").onclick=()=>dlg.close();
  dlg.addEventListener("click", e=>{ if(e.target===dlg) dlg.close(); });   // a click outside closes it
  document.body.appendChild(dlg);
  return dlg;
}


// ---------- the bezel's buttons: reset and sound ----------
// Top right of the cabinet's bezel, across from the modifier pill: a RESET button like the old
// console's, a plain dark rectangle, and a sound button with a speaker that shows whether it's on.
// Reset starts the game afresh, from a cold boot: the screen fills with garbage, a RAM check runs,
// the ROMs are counted and the minichord looked for, and then the game's title comes up.
const SPEAKER_ON='<svg viewBox="0 0 16 14" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 5h3v4H1zM4 4h1v6H4zM5 3h1v8H5zM6 2h1v10H6zM9 5h1v4H9zM11 3h1v8h-1zM13 1h1v12h-1z"/></svg>';
const SPEAKER_OFF='<svg viewBox="0 0 16 14" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M1 5h3v4H1zM4 4h1v6H4zM5 3h1v8H5zM6 2h1v10H6z"/><path fill="#FF4B3E" d="M9 4h1v1H9zM10 5h1v1h-1zM11 6h1v2h-1zM12 5h1v1h-1zM13 4h1v1h-1zM10 8h1v1h-1zM9 9h1v1H9zM12 8h1v1h-1zM13 9h1v1h-1z"/></svg>';
function bezelButtons(){
  const box=document.createElement("div"); box.className="bezelctl";
  box.innerHTML=`<div class="nesbtn"><span>SOUND</span><button type="button" id="muteBtn"></button></div>
    <div class="nesbtn"><span>RESET</span><button type="button" id="resetBtn" aria-label="Reset: start the game afresh"></button></div>`;
  document.querySelector("section.game .gamebar").appendChild(box);
  const mute=box.querySelector("#muteBtn");
  const draw=()=>{ mute.innerHTML = settings.sounds ? SPEAKER_ON : SPEAKER_OFF; mute.classList.toggle("off", !settings.sounds);
    mute.setAttribute("aria-label", settings.sounds ? "Sound on: turn it off" : "Sound off: turn it on"); mute.title = settings.sounds ? "Sound on" : "Sound off"; };
  mute.onclick=()=>{ settings.sounds=!settings.sounds; save(); soundButton(); draw(); if(settings.sounds){ piano.start(); sfx("press"); } };
  draw();
  box.querySelector("#resetBtn").onclick=()=>coldBoot();
}
function coldBoot(){
  if(!blast || !blast.field || blast.booting) return;
  const field=blast.field; blast.booting=true;
  stopDemo(); cancelAnimationFrame(blast.raf);
  const el=document.createElement("div"); el.className="boot"; field.appendChild(el);
  const glyphs="▓▒░█▄▀■□▪◘◙♠♣♥♦•○◊¤§¶ABCDEF0123456789@#$%&*+=?";
  const cols=[ "#FF4B3E","#7FE9FF","#FFD35A","#F1E8D2","#FF5AA0","#6FA7D8","#7FBF6A" ];
  const garbage=()=>{ let h=""; for(let r=0;r<22;r++){ let line=""; for(let c=0;c<46;c++) line+= Math.random()<.18 ? " " : glyphs[Math.floor(Math.random()*glyphs.length)];
    h+=`<div style="color:${cols[Math.floor(Math.random()*cols.length)]}">${line}</div>`; } return h; };
  const hex=n=>Math.floor(Math.random()*16**n).toString(16).toUpperCase().padStart(n,"0");
  const lines=[
    "MINICHORD ARCADE SYSTEM  REV 3.1",
    "(C) THE KEY & CABLE CO.",
    "",
    `RAM CHECK  0000-7FFF ... <b>OK</b>`,
    `ROM CHECK  ${ARCADE_GAMES.length}/${ARCADE_GAMES.length}  SUM ${hex(4)} ... <b>OK</b>`,
    `SOUND .............. <b>${settings.sounds?"OK":"MUTED"}</b>`,
    `MIDI ............... <b>${canWrite()?"MINICHORD FOUND":"NO MINICHORD"}</b>`,
    "",
    `LOADING ${LABELS[settings.mode].toUpperCase()} …`,
  ];
  sfx("attract");
  let t=0; const tick=()=>{
    if(!el.isConnected) return;
    t++;
    if(t<=12){ el.innerHTML=`<pre class="garbage">${garbage()}</pre>`; setTimeout(tick, 75); return; }   // the screen full of rubbish, most of a second
    if(t===13){ el.innerHTML='<div class="bootlines"></div>'; }
    const box=el.querySelector(".bootlines"), i=t-13;
    if(i<lines.length){ const d=document.createElement("div"); d.innerHTML=lines[i]||"&nbsp;"; box.appendChild(d); if(/OK|FOUND/.test(lines[i])) sfx("press"); setTimeout(tick, i<2?220:320); return; }
    setTimeout(()=>{ el.remove(); if(blast) blast.booting=false; stopBlaster(); nextQuestion(); fsAdopt(); sfx("start"); }, 700);
  };
  tick();
}

// ---------- game over, then back to the title loop ----------
// Left alone, a game over screen goes back to the title, rules, board and demo after a while, as a
// cabinet does. Not while initials are being entered, and not once the player has started again.
function overTimeout(ov, toTitle){
  clearTimeout(blast.overT);
  blast.overT=setTimeout(()=>{
    if(!blast || blast.overlay!==ov || blast.phase!=="over" || blast.hsEntry) return;
    ov.remove(); blast.overlay=null; blast.phase="menu"; toTitle();
  }, 25000);
}

// ---------- high scores ----------
// Every arcade game keeps a board of the ten best, shown in the title loop after the rules, and
// entered arcade-style at game over: three initials picked with the arrow keys, the harp's d-pad or
// the steering knob, confirmed with a chord or Enter. Scores count only when a minichord was
// connected and played through the game. They go to the shared board (arcade-scores on the
// flask-stack, reached through Tailscale Funnel) and to this browser's own board, which is also
// what's shown if the shared one can't be reached.
const SCORES_API=String(SCORES_HOST||"").replace(/\/+$/,"");   // the Funnel address of arcade-scores (core/scores.js), no trailing slash
const scoresOnline=()=> !!SCORES_API && !SCORES_API.includes("SCORES-HOST");
const HS_SLUG={blaster:"invaders", command:"harp-command", snake:"chord-snake", asteroids:"chord-asteroids", stack:"chord-stack", breakout:"chord-breakout", fifths:"fifths-defender", chopper:"chopper-rescue", fleet:"key-fleet", sweeper:"chord-sweeper", frets:"between-the-frets", sight:"sight-line"};
const HS_CHARS="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const hsCache={};                                        // the shared boards, as last fetched
const hsSlug=()=> HS_SLUG[cabKind()];
const hsLocal=slug=> (saved.hiscores && saved.hiscores[slug]) || [];
function hsFetch(slug, force){
  const c=hsCache[slug];
  if(!scoresOnline()) return Promise.resolve(null);
  if(c && !force && performance.now()-c.at<60000) return Promise.resolve(c.scores);
  const ctl=new AbortController(); const t=setTimeout(()=>ctl.abort(),4000);
  return fetch(`${SCORES_API}/api/scores/${slug}`,{signal:ctl.signal}).then(r=>r.ok?r.json():null).then(j=>{ clearTimeout(t); if(j){ hsCache[slug]={at:performance.now(), scores:j.scores}; return j.scores; } return null; }).catch(()=>{ clearTimeout(t); return null; });
}
// the board to show: the shared one if it answered, otherwise this browser's
async function hsBoard(slug){ const g=await hsFetch(slug); return g ? {scores:g, shared:true} : {scores:hsLocal(slug), shared:false}; }
// a score counts when a minichord was connected and played through the game
function hsEligible(){ return !!(blast && canWrite() && !blast.helped && (blast.midiIn||0)>=5 && blast.score>0); }
const hsSeconds=()=> Math.round((performance.now()-(blast.startedAt||performance.now()))/1000);
// at game over: offer the initials entry if the score makes the board; next() shows the game over screen
function hsOffer(next){
  if(!blast || blast.hsDone) return false;
  blast.hsDone=true;
  if(!hsEligible()){ blast.hsNote = !canWrite() ? "CONNECT A MINICHORD TO PUT SCORES ON THE BOARD" : blast.helped ? "BEGINNER MODE WAS ON: THIS ONE STAYS OFF THE BOARD" : ""; return false; }
  const slug=hsSlug(), score=blast.score;
  hsBoard(slug).then(({scores})=>{
    if(!blast || blast.phase!=="over") return;
    const makes = scores.length<10 || score>scores[scores.length-1].score;
    if(!makes){ next(); return; }
    gameOverSplash(score, ()=>hsEntry(slug, score, next));
  });
  return true;
}
// Before the initials: GAME OVER, the final score and level, held for a few seconds while nothing the
// player does counts, so the chord or knob turn still in their hands when they lost can't set a letter.
function gameOverSplash(score, then){
  const ov=document.createElement("div"); ov.className="overlay hssplash";
  ov.innerHTML=`<h3 class="over">GAME OVER</h3><p class="hsfinal">${score.toLocaleString("en-US")}</p><p>LEVEL ${blast.level+1}</p><p class="hsnext">…</p>`;
  blast.field.appendChild(ov); sfx("over");
  gameLater(()=>{ if(blast && blast.phase==="over"){ const n=ov.querySelector(".hsnext"); n.textContent="NEW HIGH SCORE!"; n.classList.add("blink"); sfx("bonus"); } }, 1800);
  setTimeout(()=>{ ov.remove(); if(blast && blast.phase==="over") then(); }, 3600);
}
function hsEntry(slug, score, next){
  const ov=document.createElement("div"); ov.className="overlay hsentry";
  const letters=(saved.hsInitials||"AAA").split("");
  ov.innerHTML=`<h3>NEW HIGH SCORE!</h3><p class="hsscore">${score.toLocaleString("en-US")}</p><p>ENTER YOUR INITIALS</p><div class="hsletters">${letters.map(()=>"<span></span>").join("")}</div>
    <p class="padhint">▲▼, A KNOB OR THE HARP PICKS A LETTER · ◀▶ MOVES · A CHORD OR ENTER SETS IT</p>`;
  blast.field.appendChild(ov);
  const st={letters, pos:0, ov, done:false};
  const draw=()=>{ [...ov.querySelectorAll(".hsletters span")].forEach((e,i)=>{ e.textContent=st.letters[i]; e.classList.toggle("on", i===st.pos); }); };
  const step=d=>{ if(!settled()) return; const i=HS_CHARS.indexOf(st.letters[st.pos]); st.letters[st.pos]=HS_CHARS[mod(i+d, HS_CHARS.length)]; sfx("press"); draw(); };
  const move=d=>{ if(!settled()) return; st.pos=Math.max(0,Math.min(2,st.pos+d)); draw(); };
  const opened=performance.now(), settled=()=>performance.now()-opened>700;   // a moment's grace before input counts
  const set=()=>{ if(!settled()) return; sfx("key"); if(st.pos<2){ st.pos++; draw(); } else finish(); };
  const finish=async()=>{
    if(st.done) return; st.done=true; blast.hsEntry=null;
    const initials=st.letters.join(""); saved.hsInitials=initials;
    const entry={initials, score, level:blast.level+1, speed:+saved.speed||0, created:Date.now()/1000};
    // this browser's board
    const local=[...hsLocal(slug), entry].sort((a,b)=>b.score-a.score).slice(0,10);
    (saved.hiscores||(saved.hiscores={}))[slug]=local; save();
    // the shared board
    let rank=local.indexOf(entry)+1, shared=false;
    if(scoresOnline()){
      ov.querySelector(".padhint").textContent="SENDING…";
      try{
        const r=await fetch(`${SCORES_API}/api/scores/${slug}`,{method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({initials, score, level:blast.level+1, speed:+saved.speed||0, seconds:hsSeconds(), firmware:mc.params[7]??null, mult:blast.mult||1})});
        const j=await r.json().catch(()=>({}));
        if(r.ok){ rank=j.rank; shared=true; hsCache[slug]={at:performance.now(), scores:j.scores}; } else blast.hsNote=(j.error||"").toUpperCase();
      }catch(e){ blast.hsNote="THE SHARED BOARD COULDN'T BE REACHED: KEPT ON THIS COMPUTER"; }
    }
    blast.hsResult=`${initials} · #${rank} ON ${shared?"THE BOARD":"THIS COMPUTER'S BOARD"}`;
    sfx("level"); ov.remove(); next();
  };
  blast.hsEntry={step, move, set, finish, back:()=>move(-1), knob:v=>{   // relative: where the knob rests when a letter comes up is that letter; a sixth of a turn either way is six letters
    if(!settled()) return;
    if(st.knobBase==null || st.knobPos!==st.pos){ st.knobBase=v; st.knobPos=st.pos; st.knobFrom=HS_CHARS.indexOf(st.letters[st.pos]); return; }
    const d=Math.round((v-st.knobBase)*36); if(!d) return;
    st.letters[st.pos]=HS_CHARS[mod(st.knobFrom+d, HS_CHARS.length)]; draw(); }, type:ch=>{ if(!settled()) return; st.letters[st.pos]=ch; draw(); set(); }};
  draw(); sfx("bonus");
}
// the game over screen says what became of the score
function hsGameOverLine(ov){
  const t=blast.hsResult || blast.hsNote; if(!t) return;
  const p=document.createElement("p"); p.className="hsresult"; p.textContent=t;
  const h=ov.querySelector("h3"); h && h.nextSibling ? ov.insertBefore(p, h.nextSibling.nextSibling) : ov.appendChild(p);
}
document.addEventListener("keydown", e=>{
  const h=blast && blast.hsEntry; if(!h || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if(e.code==="ArrowUp") h.step(1); else if(e.code==="ArrowDown") h.step(-1);
  else if(e.code==="ArrowLeft" || e.code==="Backspace") h.move(-1); else if(e.code==="ArrowRight") h.move(1);
  else if(e.code==="Enter" || e.code==="Space") h.set();
  else if(/^Key[A-Z]$|^Digit[0-9]$/.test(e.code)) h.type(e.code.slice(-1));
}, true);
// the board, drawn for the title loop
function hsRender(el, {scores, shared}, highlight){
  const ord=n=>n+(["TH","ST","ND","RD"][(n%100>10&&n%100<14)?0:Math.min(n%10,4)%4]||"TH");
  el.innerHTML=`<h3>HIGH SCORES</h3><p class="hswhere">${shared?"":"ON THIS COMPUTER"}</p>`+
    (scores.length ? `<ol class="hsboard">${scores.map((r,i)=>`<li class="${i===0?"top":""}${highlight&&r.initials===highlight?" me":""}"><span>${ord(i+1)}</span><b>${r.initials}</b><span>${r.score.toLocaleString("en-US")}</span><small>L${r.level}</small></li>`).join("")}</ol>`
      : `<p>NO SCORES YET. BE THE FIRST.</p>`)+`<p class="padhint">SCORES COUNT WHEN A MINICHORD IS PLAYED</p>`;
}
