// The cabinet: title screens run from the chord buttons, full screen, the modifier offered for the
// next chord, the title loop, and beginner mode's on-screen minichord.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- the title screens, from the chord buttons ----------
// An arcade game's title and game over screens can be run from the minichord alone. The chord
// buttons' columns, F C G D A E B from the left, count 1 to 7: a column's major button starts that
// level, its minor button sets that speed, and its 7 button switches to that arcade game. The key
// signature's sharps and flats don't matter; the column is read from the chord's letter.
const ARCADE_GAMES=["blaster","command","snake","asteroids","stack","breakout","fifths","chopper","fleet","sweeper"];
const COLUMN_LETTERS="FCGDAEB";
function arcadeMenuChord(voices){
  if(cabWaiting()){ cabWake(); return true; }
  if(!blast || !["menu","over"].includes(blast.phase) || !blast.overlay || blast.overlay.hidden) return false;
  const id=chordId(voices.map(v=>v.pitch)); if(!id) return true;
  const col=COLUMN_LETTERS.indexOf(spell(id.root, devFifths())[0]);   // 0 to 6
  if(col<0) return true;
  const ov=blast.overlay, rowOf=label=>[...ov.querySelectorAll(".optrow")].find(r=>r.querySelector(".optlabel")?.textContent===label);
  const row = ["","6"].includes(id.quality) ? "major" : ["m","m6"].includes(id.quality) ? "minor" : id.quality==="7" ? "seven" : null;
  if(row==="major"){ const b=[...ov.querySelectorAll(".levels")].pop().querySelectorAll("button")[col]; if(b && !b.disabled) b.click(); }
  else if(row==="minor"){ const r=rowOf("SPEED"), b=r && r.querySelectorAll("button")[col]; if(b){ b.click(); sfx("press"); } }
  else if(row==="seven"){ const g=ARCADE_GAMES[col]; if(g && g!==settings.mode) arcadeSwitch(g); }
  return true;
}
function arcadeSwitch(g){
  if(solo) location.href=`?game=${g}&solo`;       // the stand-alone page becomes the other game's; the minichord reconnects by itself
  else setMode(g);
}
// the line on each title screen that says so
function arcadeKeys(ov){
  const p=document.createElement("p"); p.className="padhint";
  p.textContent="ON THE MINICHORD: A COLUMN'S MAJOR BUTTON STARTS THAT LEVEL · MINOR SETS THE SPEED · 7 SWITCHES GAME";
  ov.appendChild(p);
}


// ---------- full screen ----------
// Any arcade game can fill the screen, from the button at the field's top right or F on the keyboard
// (not from a chord, so a chord can't do it by accident). The field
// itself goes full screen, title screens and demos with it, and each game lays itself out again for
// the new size, and again on the way back.
function fullButton(field){
  const b=document.createElement("button"); b.className="fullbtn"; b.type="button";
  const label=()=>{ const on=document.fullscreenElement===field || document.webkitFullscreenElement===field; b.textContent = on ? "✕" : "⛶"; b.title = on ? "Leave full screen (F)" : "Full screen (F)"; b.setAttribute("aria-label", b.title); };
  b.onclick=()=>toggleFull(field); label(); field.appendChild(b);
  field._fullLabel=label;
}
function toggleFull(field){
  field = field || (blast && blast.field); if(!field) return;
  const on=document.fullscreenElement || document.webkitFullscreenElement;
  if(on) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else (field.requestFullscreen || field.webkitRequestFullscreen || (()=>{})).call(field);
}
function arcadeRelayout(){
  if(!blast || !blast.field) return;
  if(blast.field._fullLabel) blast.field._fullLabel();
  const k=blast.kind;
  if(k==="snake"){ snLayout(); snDraw(); }
  else if(k==="stack"){ stLayout(); stDraw(); }
  else if(k==="asteroids") asCentre();
  else if(k==="breakout") boLayout();
  else if(k==="fifths") fdLayout();
  else if(k==="chopper"){ chLayout(); chDrawMap(); chPlace(true); }
  else if(k==="fleet"){ kfLayout(); kfDraw(); }
  else if(k==="sweeper"){ swLayout(); swDraw(); }
  else if(k==="command"){ hcLayout(); hcLabels(); }
}
for(const ev of ["fullscreenchange","webkitfullscreenchange"]) document.addEventListener(ev, ()=>setTimeout(arcadeRelayout,60));
window.addEventListener("resize", ()=>setTimeout(arcadeRelayout,60));
document.addEventListener("keydown", e=>{
  if(e.code!=="KeyF" || e.repeat || !blast || !blast.field || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  e.preventDefault(); toggleFull(blast.field);
});


// ---------- the modifier, offered for the chord you need next ----------
// The arcade chord games set the modifier's direction for the chord that matters most right now: the
// lowest falling chord, the nearest rock, a ready row or a chord the snake can cash in. A root the key
// signature doesn't give needs the modifier: a sharp one "sharpens", a flat one "flattens". It's only
// set when that chord changes, so a double tap to flip it yourself holds until the next one.
function arcadeMod(rootName){
  if(!blast || !rootName || !canWrite() || !hasSetting(31) || blast.modFor===rootName) return;
  blast.modFor=rootName;
  const {li,acc}=parse(rootName), ka=keyAcc(li,devFifths());
  if(acc===ka) return;                                   // a plain button: the modifier isn't needed
  ensure(31, acc>ka ? 0 : 1); modPill();
}
// the instruction on the chord games' title screens
function arcadeModNote(ov){
  const p=document.createElement("p"); p.className="padhint";
  p.textContent="THE MODIFIER: THE GAME SETS SHARP OR FLAT FOR THE CHORD YOU NEED NEXT. DOUBLE-TAP IT TO FLIP IT YOURSELF.";
  ov.appendChild(p);
}


// ---------- the cabinet: title, then the rules scrolling, then the options ----------
// A title screen the way arcade cabinets do it: the name first, big and animated; then the rules
// roll up the screen like credits; then the demo; then round again, until someone plays a chord,
// plucks the harp, presses a key or clicks. That brings up the options (speed, levels and the rest),
// which go back to the title if they're left alone. Game over goes straight to its options.
const DEMO_FOR={blaster:()=>runDemo(true), command:()=>commandDemo(), snake:()=>snDemo(), asteroids:()=>asDemo(), stack:()=>stDemo(), breakout:()=>boDemo(), fifths:()=>fdDemo(), chopper:()=>chDemo(), fleet:()=>kfDemo(), sweeper:()=>swDemo()};
const TITLE_FOR={blaster:"CHORD INVADERS", command:"HARP COMMAND", snake:"CHORD SNAKE", asteroids:"CHORD ASTEROIDS", stack:"CHORD STACK", breakout:"CHORD BREAKOUT", fifths:"FIFTHS DEFENDER", chopper:"CHOPPER RESCUE", fleet:"KEY FLEET", sweeper:"CHORD SWEEPER"};
const cabKind=()=> blast && (blast.kind||"blaster");
function cabinet(ov){
  const kids=[...ov.children];
  const isRule=c=> (c.tagName==="P" && !c.classList.contains("blink") && !/^BEST /.test(c.textContent)) || c.classList.contains("padhint");
  const rules=kids.filter(c=>isRule(c) && !c.classList.contains("credit")), credit=kids.find(c=>c.classList.contains("credit"));
  const title=document.createElement("div"); title.className="cab-title";
  title.innerHTML=`<h3 class="cabtitle">${TITLE_FOR[cabKind()]||"MINICHORD LAB"}</h3><p class="cabpress blink">PLAY A CHORD · PLUCK THE HARP · PRESS ANY KEY</p>`;
  const roll=document.createElement("div"); roll.className="cab-rules";
  const inner=document.createElement("div"); inner.className="cabscroll";
  inner.innerHTML=`<h3>${TITLE_FOR[cabKind()]||""}</h3><p class="cabhead">HOW TO PLAY</p>`;
  rules.forEach(r=>inner.appendChild(r));
  if(credit) inner.appendChild(credit.cloneNode(true));
  roll.appendChild(inner);
  const points=document.createElement("div"); points.className="cab-points";
  const board=document.createElement("div"); board.className="cab-scores";
  const opts=document.createElement("div"); opts.className="cab-options";
  [...ov.children].forEach(c=>opts.appendChild(c));
  opts.querySelector("h3")?.classList.add("small");
  beginnerRow(opts);
  crtRow(opts);
  multLine(opts);
  if(["breakout","fifths","stack"].includes(cabKind()) && knobsReady()) knobRow(opts);
  ov.append(title, roll, points, board, opts);
  hsFetch(hsSlug());                                        // fetched now, so it's ready when its turn comes
  ov.addEventListener("click", e=>{ if(ov.dataset.stage!=="options"){ e.stopPropagation(); cabWake(); } }, true);
  inner.addEventListener("animationend", e=>{ if(e.target===inner && blast && blast.overlay===ov && ov.dataset.stage==="rules" && blast.phase==="menu") cabStage(ov,"points"); });
  cabStage(ov, "title");
}
function cabStage(ov, stage){
  if(!blast) return;
  clearTimeout(blast.cabT); clearTimeout(blast.attract);
  ov.dataset.stage=stage;
  if(stage==="title") blast.cabT=gameLater(()=>{ if(blast && blast.overlay===ov && ov.dataset.stage==="title") cabStage(ov,"rules"); }, 3600);
  if(stage==="rules"){ const inner=ov.querySelector(".cabscroll"); if(inner){ inner.style.animation="none"; void inner.offsetWidth;
    inner.style.animation=`cabroll ${Math.max(12, inner.children.length*2.4)}s linear forwards`; } }
  if(stage==="options") blast.cabT=gameLater(()=>{ if(blast && blast.overlay===ov && ov.dataset.stage==="options" && blast.phase==="menu") cabStage(ov,"title"); }, 45000);
  if(stage==="points"){                                        // what things are worth, then the board
    pointsRender(ov.querySelector(".cab-points"));
    blast.cabT=gameLater(()=>{ if(blast && blast.overlay===ov && ov.dataset.stage==="points" && blast.phase==="menu") cabStage(ov,"scores"); }, pointsFor(cabKind()).length>6 ? 12500 : 9500);   // a longer table stays longer
  }
  if(stage==="scores"){                                        // the board, then the demo
    const el=ov.querySelector(".cab-scores"); el.innerHTML="<h3>HIGH SCORES</h3>";
    hsBoard(hsSlug()).then(b=>{ if(ov.dataset.stage==="scores") hsRender(el, b, saved.hsInitials); });
    blast.cabT=gameLater(()=>{ if(blast && blast.overlay===ov && ov.dataset.stage==="scores" && blast.phase==="menu"){ const d=DEMO_FOR[cabKind()]; if(d) d(); } }, 9000);
  }
}
// someone's here: show the options
function cabWake(){
  const ov=blast && blast.overlay; if(!ov || ov.hidden || !ov.dataset.stage || ov.dataset.stage==="options") return false;
  cabStage(ov,"options"); sfx("start"); return true;
}
const cabWaiting=()=> !!(blast && blast.overlay && !blast.overlay.hidden && blast.overlay.dataset.stage && blast.overlay.dataset.stage!=="options");
// after a demo, round to the title again
function cabRestart(){ if(blast && blast.overlay && blast.overlay.dataset.stage) cabStage(blast.overlay,"title"); }
document.addEventListener("keydown", e=>{
  if(!cabWaiting() || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName||"")) return;
  if(e.code!=="KeyF"){ e.preventDefault(); cabWake(); }
});

// ---------- beginner mode: the minichord on screen, showing what to press ----------
// For newcomers the games can keep the instrument on screen and light what to press: the chord
// buttons (and the modifier, and a slash's bass) for the chord that matters now, and in the harp
// games the string for the note that matters now, drawn as the standard strip or the keymaster's
// four rows of three. It sits behind the play, a little see-through, so nothing falling is hidden.
const helpUsesChords=k=>["blaster","snake","asteroids","stack","breakout","fifths","chopper"].includes(k);
const helpUsesHarp=k=>["command","asteroids","fifths"].includes(k);
function beginnerRow(opts){
  const r=document.createElement("div"); r.className="optrow"; const l=document.createElement("span"); l.className="optlabel"; l.textContent="BEGINNER";
  const g=document.createElement("div"); g.className="levels";
  const mark=b=>{ [...g.children].forEach(x=>{ x.style.background=""; x.style.color=""; }); b.style.background="#F1E8D2"; b.style.color="#16132A"; };
  [["OFF",false],["SHOW WHAT TO PRESS (NO HIGH SCORES)",true]].forEach(([t,v])=>{ const b=document.createElement("button"); b.textContent=t; if(!!saved.beginner===v) mark(b);
    b.onclick=()=>{ saved.beginner=v; save(); mark(b); helperSync(); }; g.appendChild(b); });
  r.append(l,g);
  // the harp games need to know which harp to draw
  let harpRow=null;
  if(helpUsesHarp(cabKind()) && ![...opts.querySelectorAll(".optlabel")].some(x=>x.textContent==="HARP")){
    harpRow=document.createElement("div"); harpRow.className="optrow"; const hl=document.createElement("span"); hl.className="optlabel"; hl.textContent="HARP";
    const hg=document.createElement("div"); hg.className="levels";
    const hmark=b=>{ [...hg.children].forEach(x=>{ x.style.background=""; x.style.color=""; }); b.style.background="#F1E8D2"; b.style.color="#16132A"; };
    [["STANDARD STRIP","strip"],["KEYMASTER GRID","keymaster"]].forEach(([t,v])=>{ const b=document.createElement("button"); b.textContent=t; if((saved.harpLayout||"strip")===v) hmark(b);
      b.onclick=()=>{ saved.harpLayout=v; save(); hmark(b); helperSync(true); }; hg.appendChild(b); });
    harpRow.append(hl,hg);
  }
  const before=opts.querySelector("p.blink") || [...opts.querySelectorAll(".levels")].pop();
  opts.insertBefore(r, before); if(harpRow) opts.insertBefore(harpRow, r);
}
function helperSync(rebuild){
  if(!blast || !blast.field) return;
  const k=cabKind(), want=!!saved.beginner;
  if(rebuild || !want){
    if(blast.stripOrig){ blast.stripOrig.style.display=""; blast.strip=blast.stripOrig; blast.stripOrig=null; }   // the controller beside the field comes back
    blast.helpBoard?.el.remove(); blast.helpHarp?.el.remove(); blast.helpBoard=null; blast.helpHarp=null; blast.helpKey=null;
  }
  if(!want) return;
  if(helpUsesChords(k) && !blast.helpBoard){ blast.helpBoard=helperBoard(k); blast.field.appendChild(blast.helpBoard.el); }
  if(blast.helpBoard && blast.helpBoard.pad && blast.strip && blast.strip!==blast.helpBoard.pad){   // the minichord's harp is the controller now
    blast.stripOrig=blast.strip; blast.stripOrig.style.display="none"; blast.strip=blast.helpBoard.pad;
  }
  if(blast.helpBoard && blast.helpBoard.strings){                         // a harp on the minichord itself: no separate one
    if(!blast.helpHarp) blast.helpHarp={el:{remove(){}}, cells:blast.helpBoard.strings, names:blast.helpBoard.names};
  } else if(helpUsesHarp(k) && !blast.helpHarp){ blast.helpHarp=helperHarp(k); blast.field.appendChild(blast.helpHarp.el); }
}
function helperBoard(k){
  const el=document.createElement("div"); el.className="helper hboard helper-"+k;
  el.innerHTML=`<div class="board"><div class="mod">♯</div><div class="pre">▲</div><div class="pre">▼</div><span class="led"></span><div class="grid"></div></div>`;
  const place=(e,[x,y,w,h])=>{ e.style.left=x+"%"; e.style.top=y+"%"; e.style.width=w+"%"; e.style.height=h+"%"; };
  place(el.querySelector(".mod"), MC_PARTS.mod); el.querySelectorAll(".pre").forEach((p,i)=>place(p, MC_PARTS.presets[i])); place(el.querySelector(".led"), MC_PARTS.led);
  const grid=el.querySelector(".grid"), cells=[];
  DEMO_ROWS.forEach((_,r)=>DEMO_COLS.forEach((c,ci)=>{ const b=document.createElement("div"); b.className="cell"; place(b, MC_PARTS.buttons[r*7+ci]); (cells[ci]||=[])[r]=b; grid.appendChild(b); }));
  const labels=()=>{ const f=devFifths(); DEMO_ROWS.forEach(([,suf],r)=>DEMO_COLS.forEach((c,ci)=>{ const li=LETTERS.indexOf(c); cells[ci][r].textContent=c+ACC[keyAcc(li,f)]+suf; })); };
  labels();
  // Chord Asteroids plays both halves of the instrument, so its minichord carries its own harp,
  // lit on the case itself: the strip in the harp's slot, or the keymaster plate where it mounts
  let strings=null, names=null;
  // Chord Snake and Chord Stack steer on the harp: their minichord's harp is the controller itself,
  // each note marked with what it does and flashing as it's touched, in place of the one beside the field
  let pad=null;
  if(k==="snake" || k==="stack"){
    const board=el.querySelector(".board"), L=kmLayout();
    if(L.cols===3){
      const cover=document.createElement("div"); cover.className="hbcover"; place(cover, MC_HARP.slot); board.appendChild(cover);
      pad=document.createElement("div"); place(pad, MC_HARP.plate); board.appendChild(pad);
      kmPlate(pad, sI=>KM_GLYPH[L.byString[sI]]).forEach((d,sI)=>{ const z=L.byString[sI]; d.classList.add("km",`km-${z}`); d.dataset.zone=z; });
      pad.classList.add("onboard");
    } else {
      pad=document.createElement("div"); pad.className="hbstrip hbpad"; place(pad, MC_HARP.strip); board.appendChild(pad);
      L.drawOrder.forEach(pc=>{ const z=L.byString[pc], c=document.createElement("span"); c.className=`km km-${z}`; c.dataset.zone=z; c.dataset.pc=pc; c.textContent=KM_GLYPH[z]; pad.appendChild(c); });
    }
  }
  if(k==="asteroids" || k==="fifths"){
    const board=el.querySelector(".board"), nameOf=i=>SHARP_NAMES[i];
    if(saved.harpLayout==="keymaster"){
      const cover=document.createElement("div"); cover.className="hbcover"; place(cover, MC_HARP.slot); board.appendChild(cover);   // no strip under the plate
      const plate=document.createElement("div"); place(plate, MC_HARP.plate); board.appendChild(plate);
      strings=kmPlate(plate, nameOf); plate.classList.add("onboard");
    } else {
      const strip=document.createElement("div"); strip.className="hbstrip"; place(strip, MC_HARP.strip); board.appendChild(strip);
      strings=[]; for(let sI=11;sI>=0;sI--){ const c=document.createElement("span"); c.textContent=nameOf(sI); strip.appendChild(c); strings[sI]=c; }   // high strings at the top
    }
    names=()=>{};
  }
  return {el, cells, mod:el.querySelector(".mod"), labels, strings, names, pad};
}
// where the harp sits on the case, as percentages of its outline: the strip in its slot; and the
// keymaster plate, centred over the slot, clear of the light on its left and the pots on its right,
// with the slot itself painted over, since the keymaster takes the strip's place
const MC_HARP={strip:[71.9,19,6.6,61], plate:[66.85,11.6,17.9,76], slot:[70.6,16.3,9.2,67]};
// which buttons play a chord: its root's column, the rows its quality presses
const HELP_ROWS={"":[0],"m":[1],"7":[2],"maj7":[0,2],"m7":[1,2],"°":[0,1],"+":[0,1,2],"6":[0],"m6":[1],"°7":[0,1]};
function helpChord(rootName, q, bass){
  const h=blast && blast.helpBoard; if(!h) return;
  const key=`${rootName}|${q}|${bass||""}|${devFifths()}`; if(blast.helpKey===key) return; blast.helpKey=key;
  h.labels(); h.el.querySelectorAll(".grid .lit,.grid .slashlit").forEach(x=>x.classList.remove("lit","slashlit")); h.mod.classList.remove("lit");   // the buttons only: the harp keeps its own light
  if(!rootName) return;
  const {li,acc}=parse(rootName), col=DEMO_COLS.indexOf(rootName[0]), f=devFifths();
  (HELP_ROWS[q]||[0]).forEach(r=>h.cells[col] && h.cells[col][r].classList.add("lit"));
  if(acc!==keyAcc(li,f)) h.mod.classList.add("lit");                        // the key doesn't give this root: the modifier too
  h.mod.textContent = mc.params[31]===1 ? "♭" : "♯";
  if(bass){ const bc=DEMO_COLS.indexOf(bass[0]); if(bc>=0) h.cells[bc][0].classList.add("slashlit"); }
}
// A demo shows the harp whether beginner mode is on or not, lighting each string as it's plucked,
// and takes it away again after unless the player has beginner mode on.
function demoHarp(k){
  if(!blast || !blast.field || blast.helpHarp) return;
  if(k==="asteroids"){ blast.helpBoard=helperBoard(k); blast.field.appendChild(blast.helpBoard.el); blast.helpHarp={el:{remove(){}}, cells:blast.helpBoard.strings, names:blast.helpBoard.names}; }
  else { blast.helpHarp=helperHarp(k); blast.field.appendChild(blast.helpHarp.el); }
  blast.demoHarp=true;
}
function demoHarpDone(){
  if(blast && blast.demoHarp){ blast.helpHarp?.el.remove(); if(cabKind()==="asteroids"){ blast.helpBoard?.el.remove(); blast.helpBoard=null; blast.helpKey=null; } blast.helpHarp=null; blast.demoHarp=false; blast.helpString=null; }
  else if(blast && blast.helpHarp) helpString(-1);
}
// the harp, drawn as the player's harp is laid out, its strings named, the one to pluck lit
function helperHarp(k){
  const grid=(saved.harpLayout==="keymaster");
  const el=document.createElement("div"); el.className="helper hharp "+(grid?"plate":"line");
  let cells=[];
  if(grid) cells=kmPlate(el, ()=>"");                                           // the keymaster's own plate
  else [11,10,9,8,7,6,5,4,3,2,1,0].forEach(sI=>{ const c=document.createElement("span"); c.className="hstring"; cells[sI]=c; el.appendChild(c); });   // the strip, high strings at the top
  const names=()=>{ const st = k==="command" ? hcStrings() : [...Array(12)].map((_,i)=>({name:SHARP_NAMES[i]})); st.forEach((x,i)=>{ if(cells[i]) cells[i].textContent=x.name; }); };
  names();
  const cap=document.createElement("small"); cap.textContent="HARP"; el.appendChild(cap);
  return {el, cells, names};
}
function helpString(sI){
  const h=blast && blast.helpHarp; if(!h) return;
  if(blast.helpString===sI && !blast.helpNamesStale) return; blast.helpString=sI; blast.helpNamesStale=false;
  h.names(); h.cells.forEach((c,i)=>c && c.classList.toggle("lit", i===sI));
}
