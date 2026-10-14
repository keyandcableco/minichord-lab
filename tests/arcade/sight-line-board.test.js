// Sight Line and the high score board: the note coming up is lit on the on-screen minichord, and that
// isn't beginner mode. A game read on a minichord with beginner mode off goes on the board, a note on
// screen all the while; with beginner mode on it stays off, as any game's does.
const {spawnSync}=require("child_process");
// a game: a few notes read at the line on the minichord, then the rest let slip past to game over
async function game(t){
  const {w, d, sleep, note}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(0, {speed:4});
  const atLine=async()=>{ for(let i=0;i<600;i++){ const n=a.notes.find(n=>!n.done && !n.change && Math.abs(n.x-a.ph)<=20); if(n) return n; await sleep(20); } return null; };
  let hits=0;
  for(let k=0;k<6;k++){ const n=await atLine(); if(!n) break; note(n.pc); await sleep(20); if(n.done) hits++; }
  const mid={hits, midiIn:a.midiIn, score:a.score, onScreen:a.notes.some(n=>!n.done && !n.change),
    helped:w.eval("typeof blast.helped==='boolean' ? blast.helped : 'a note'"), eligible:w.eval("hsEligible()"), slug:w.eval("hsSlug()")};
  a.lives=1; for(let i=0;i<300 && a.phase==="play";i++) await sleep(20);
  await sleep(300);
  const over={phase:a.phase, splash:!!d.querySelector(".hssplash"), note:a.hsNote};
  for(let i=0;i<120 && !d.querySelector(".hsentry");i++) await sleep(50);   // the splash, then the initials
  over.entry=!!d.querySelector(".hsentry");
  if(over.entry){ await sleep(800); t.key("KeyG"); t.key("KeyK"); t.key("KeyB"); await sleep(100); }
  const board=(JSON.parse(w.localStorage.getItem("lab-spellbound")).saved.hiscores||{})[mid.slug]||[];
  over.kept=board.some(r=>r.initials==="GKB" && r.score===mid.score);
  return {mid, over};
}
if(process.argv[2]==="beginner"){
  const t=require("./harness").load("sight-line",{storage:{saved:{beginner:true}}});
  game(t).then(r=>{ console.log(JSON.stringify(r)); process.exit(0); });
} else {
  const t=require("./harness").load("sight-line");
  (async()=>{
    const {check}=t;
    const {mid, over}=await game(t);
    check("a game read on the minichord: notes hit, enough played, a score", mid.hits>=5 && mid.midiIn>=5 && mid.score>0, `${mid.hits} hit, ${mid.midiIn} in, ${mid.score}`);
    check("with a note on screen and beginner mode off, the game is still for the board", mid.onScreen && mid.helped===false && mid.eligible, `beginner flag: ${mid.helped}`);
    check("game over shows GAME OVER, with nothing about beginner mode", over.phase==="over" && over.splash && !/BEGINNER/.test(over.note||""), over.note);
    check("then the initials, and the score is on the board", over.entry && over.kept);
    const r=spawnSync(process.execPath,[__filename,"beginner"],{encoding:"utf8",timeout:60000});
    let b={}; try{ b=JSON.parse((r.stdout||"").trim().split("\n").pop()); }catch(e){ b={err:(r.stderr||r.stdout||"").slice(0,300)}; }
    check("with beginner mode on, the same game is played", b.mid && b.mid.hits>=5 && b.mid.midiIn>=5 && b.mid.score>0, b.err || (b.mid && `${b.mid.hits} hit, ${b.mid.midiIn} in, ${b.mid.score}`));
    check("but isn't for the board", b.mid && b.mid.helped===true && !b.mid.eligible);
    check("and game over says so: no initials, nothing kept", b.over && b.over.phase==="over" && !b.over.splash && !b.over.entry && !b.over.kept && /BEGINNER/.test(b.over.note||""), b.over && b.over.note);
    t.done();
  })();
}
