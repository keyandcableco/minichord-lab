// The arcade's sounds: every game's blips, booms and jingles.
// Part of Minichord Lab's Practice Room page (practice/index.html), loaded there in order with the
// others as plain scripts sharing one scope; see practice/boot.js.
"use strict";

// ---------- Chord Invaders' own sounds ----------
// Chiptune effects from square waves and noise, only in this game and only with sounds on:
// a laser for each shot, a crunchy burst for each hit, a sparkle for a ★, a thud for a miss,
// a rising fanfare for a new level, a jingle for a key set, and a falling tune for game over.
let noiseBuf=null;
// A pixel star in the game's style, drawn as blocks: the arcade font has no ★ of its own, and
// the one the browser borrowed looked like a small asterisk.
const PIXEL_STAR=(()=>{ const rows=["....#....","...###...","#########",".#######.","..#####..","..##.##..",".##...##."];
  const r=[]; rows.forEach((row,y)=>[...row].forEach((c,x)=>{ if(c==="#") r.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`); }));
  return `<svg class="pstar" viewBox="0 0 9 7" aria-hidden="true" shape-rendering="crispEdges">${r.join("")}</svg>`; })();
// Some browsers pause a page's audio after a stretch of silence (the wait before the attract
// demo is one). A paused context is woken and the sound played once it's back, rather than skipped.
function sfx(kind){
  if(!settings.sounds || !piano.ctx) return;
  if(piano.ctx.state!=="running"){ piano.ctx.resume().then(()=>{ if(piano.ctx.state==="running") sfx(kind); }).catch(()=>{}); return; }
  const ctx=piano.ctx, t=ctx.currentTime+.005, out=ctx.createGain(); out.gain.value=.16; out.connect(ctx.destination);
  const tone=(type,f0,f1,at,dur,vol=1)=>{ const o=ctx.createOscillator(), g=ctx.createGain(); o.type=type;
    o.frequency.setValueAtTime(f0,t+at); if(f1) o.frequency.exponentialRampToValueAtTime(f1,t+at+dur);
    g.gain.setValueAtTime(vol,t+at); g.gain.exponentialRampToValueAtTime(.001,t+at+dur);
    o.connect(g).connect(out); o.start(t+at); o.stop(t+at+dur+.02); };
  const noise=(at,dur,from,to,vol=1)=>{ if(!noiseBuf){ noiseBuf=ctx.createBuffer(1,ctx.sampleRate*.6,ctx.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
    const n=ctx.createBufferSource(), f=ctx.createBiquadFilter(), g=ctx.createGain(); n.buffer=noiseBuf; f.type="lowpass";
    f.frequency.setValueAtTime(from,t+at); f.frequency.exponentialRampToValueAtTime(to,t+at+dur);
    g.gain.setValueAtTime(vol,t+at); g.gain.exponentialRampToValueAtTime(.001,t+at+dur);
    n.connect(f).connect(g).connect(out); n.start(t+at); n.stop(t+at+dur+.02); };
  if(kind==="shoot") tone("square",1400,180,0,.13,.55);
  else if(kind==="boom"){ noise(0,.35,5000,120,.9); tone("square",160,40,0,.22,.5); }
  else if(kind==="bonus"){ [1319,1568,1976,2637].forEach((f,i)=>tone("square",f,0,i*.05,.09,.35)); noise(0,.3,6000,300,.5); }
  else if(kind==="miss") { tone("square",220,70,0,.35,.7); noise(0,.2,900,100,.4); }
  else if(kind==="level"){ [523,659,784,1047,1319].forEach((f,i)=>tone("square",f,0,i*.07,.12,.45)); tone("triangle",1047,0,.36,.4,.6); }
  else if(kind==="key")  { [784,988,1175,1568].forEach((f,i)=>tone("triangle",f,0,i*.06,.14,.7)); }
  else if(kind==="over") { [392,370,349,330,311,294,262].forEach((f,i)=>tone("square",f,0,i*.16,.2,.5)); tone("triangle",131,0,1.12,.8,.8); }
  else if(kind==="start"){ [262,330,392,523].forEach((f,i)=>tone("square",f,0,i*.08,.11,.45)); }
  else if(kind==="freeze"){ tone("square",1600,200,0,.45,.35); noise(0,.5,8000,1500,.35); tone("triangle",2400,2400,.05,.3,.25); }   // an icy crackle
  else if(kind==="press"){ tone("square",1760,1320,0,.05,.35); }                                  // a button going down
  else if(kind==="combo"){ tone("square",392,784,0,.18,.4); tone("square",494,988,.02,.18,.3); }  // both preset buttons: key change mode
  else if(kind==="blinks"){ [0,.3,.6].forEach(at=>tone("square",2093,0,at,.04,.25)); }            // the light blinking
  else if(kind==="letgo"){ tone("square",988,494,0,.2,.4); }
  else if(kind==="attract"){ [523,659,784,659,523,784,1047].forEach((f,i)=>tone("square",f,0,i*.09,.1,.35)); }
}


// the maker's line at the foot of each game's title screen: who made it, and the instrument it's for
function arcadeCredit(ov){
  const p=document.createElement("p"); p.className="credit";
  p.innerHTML=`MADE BY <a href="https://keyandcable.com" target="_blank" rel="noopener">THE KEY &amp; CABLE CO.</a> FOR THE <a href="https://minichord.com" target="_blank" rel="noopener">MINICHORD</a>`;
  ov.appendChild(p);
}

// Levels, as the menu names them
// Speed: how long a chord takes to fall, and how often they come, as a multiple of the level's own.
// Relaxed is the default; Wild is for showing off.
const SPEEDS=[["Relaxed",1.8],["Steady",1.35],["Brisk",1],["Fast",.75],["Wild",.55]];
const speedMul=()=> (SPEEDS[+saved.speed]||SPEEDS[0])[1];
// how big the falling chord symbols are drawn
const SIZES=[["S",".95rem"],["M","1.25rem"],["L","1.7rem"],["XL","2.3rem"]];
const applyChordSize=()=>{ if(blast && blast.field) blast.field.style.setProperty("--chord-size", (SIZES[saved.chordSize??1]||SIZES[1])[1]); };
const LEVEL_NAMES=["Major and minor","Add 7ths","Sharps and flats","maj7 and m7","Every chord type","Inversions","Any slash chord","Barry Harris"];
function startBlaster(){
  const f=canWrite() ? devFifths() : 0;
  blast={kind:"blaster", items:[], score:0, lives:3, level:0, hits:0, dir: f<0 ? -1 : f>0 ? 1 : (Math.random()<.5?1:-1),
    next:0, fall:9000, gap:2600, over:true, phase:"menu", raf:0, field:null, hud:null,
    barry:false, pauseForBarry:false, keyBar:null, keyTarget:null, fx:null, last:performance.now()};
  blastSetup(); blastHomeKey();
  modPill();
  stats.streak=0; scoreboard(); buildSpecial();
  blastMenu();
  blast.raf=requestAnimationFrame(blastTick);
}
// the cabinet's menu, and its game over: choose a level to start from
const BLASTMENU_G={key:"blaster", title:"CHORD INVADERS",
  rules:()=>`<p>PLAY EACH CHORD BEFORE IT LANDS.</p><p>MANUAL AIM SCORES DOUBLE: STEER THE SHIP WITH A KNOB (OR ← →), AND A CHORD FIRES STRAIGHT UP. GET UNDER IT, THEN PLAY IT. KEEP A CHORD SOUNDING (THE HOLD BUTTON LATCHES IT) FOR A BEAM THAT DESTROYS EVERY CHORD OF ITS TYPE: HOLD A MINOR CHORD FOR ALL THE MINORS.</p><p>POWER-UPS FALL NOW AND THEN: PLAY THEIR CHORD TO TAKE THEM.</p><p>EVERY TWO LEVELS, A BONUS ROUND: FOUR CHORDS STOP IN THE SKY AND YOU SHOOT THE ONE THAT ISN'T IN THE KEY.</p><p class="starline">${PIXEL_STAR}CHORDS SCORE BIG AND NEVER HURT.</p>${keyComboReady() ? "<p>SET THE KEY WHEN A KEY BAR FALLS.</p>" : ""}`,
  rows:row=>{
    mxRow(row, ()=>menuRebuild(()=>blastMenu()));
    row("AIM", ["AUTO","MANUAL ×2"], ()=>saved.invAim?1:0, i=>{ saved.invAim=i; save(); });
    row("SPEED", SPEEDS.map(x=>x[0].toUpperCase()), ()=>+saved.speed||0, i=>{ saved.speed=i; save(); });
    row("CHORD SIZE", SIZES.map(x=>x[0]), ()=>saved.chordSize??1, i=>{ saved.chordSize=i; save(); applyChordSize(); });
  },
  levels:LEVEL_NAMES, ok:levelOk, levelName:blastLevelName, needs:"NEEDS THE TEST FIRMWARE",
  begin:i=>beginBlast(i), demo:()=>runDemo(), modNote:"always"};
function blastMenu(over){ arcadeMenu(BLASTMENU_G, over); }
// the settings arrived: the menu's CHORDS row offers what this firmware can play, so rebuild it once they're known
function blastDevice(){
  const sig=String(mxAvailable().length);
  if(blast.phase==="menu" && blast.overlay && blast.menuSig!==sig){ if(menuRebuild(()=>blastMenu())) blast.menuSig=sig; }
}
