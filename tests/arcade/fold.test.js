// The modifier set to fold (address 31 at 2, firmware 118): by the button's degree in the key, IV and I
// sharpen and the other five flatten. The screen's and the keyboard's minichord fold as the instrument
// does, in C, G, F♯ and E♭, each button spelled by its letter; the games that need a plain sharp or flat
// (Key Fleet, Between the Frets, Chord Hunt, Key Racer) borrow it as one and give the fold back; the
// pill, the strip, the help and the help board say fold; the double tap goes from fold to flat. Through
// the firmware's own save and restore: a fold a double tap puts back is the player's, kept if the game
// didn't borrow the modifier, and given back after if it did, the game's way flipping meanwhile.
const t=require("./harness").load("");
(async()=>{
  const {w, d, mc, sleep, check}=t;
  await sleep(150);

  // ---------- the keyboard's minichord, folding ----------
  w.eval("keyboardMinichord(true)"); await sleep(50);
  const fold=key=>{
    w.eval(`mc.params[31]=2; mc.params[35]=${key}; vmModifier('ShiftLeft', true)`);
    const out=[];
    for(let c=0;c<7;c++){ w.eval(`vmPress('k',0,${c})`);
      out.push({name:w.eval("vmChordName()"), pcs:w.eval("[...new Set([...mc.notes.values()].map(n=>((n.note%12)+12)%12))].sort((a,b)=>a-b).join()")});
      w.eval("vmRelease('k')"); }
    const card=w.eval("[...document.querySelectorAll('#kbcard .kbgrid span')].slice(0,7).map(s=>s.lastChild.textContent).join(' ')");
    w.eval("vmModifier('ShiftLeft', false)");
    return {names:out.map(o=>o.name).join(" "), pcs:out.map(o=>o.pcs), card};
  };
  const triad=pc=>[pc, (pc+4)%12, (pc+7)%12].sort((a,b)=>a-b).join();
  // by key: the major row's names, F C G D A E B, each spelled by its letter, and their roots' pitches
  for(const [key, nm, names, roots] of [
    [0, "C", "F♯ C♯ G♭ D♭ A♭ E♭ B♭", [6,1,6,1,8,3,10]],
    [1, "G", "F C♯ G♯ D♭ A♭ E♭ B♭", [5,1,8,1,8,3,10]],
    [12, "F♯", "F𝄪 C G D A E B♯", [7,0,7,2,9,4,0]],
    [8, "E♭", "F♭ C♭ G♭ D♭ A E B𝄫", [4,11,6,1,9,4,9]]]){
    const r=fold(key);
    check(`folded in ${nm}: its IV and I sharpen, the rest flatten, spelled by letter`, r.names===names, r.names);
    check(`in ${nm}, those are the pitches it sounds`, JSON.stringify(r.pcs)===JSON.stringify(roots.map(triad)), r.pcs.join(" | "));
    check(`in ${nm}, the keyboard card names them so`, r.card===names, r.card);
  }
  w.eval("keyboardMinichord(false)"); await sleep(50);

  // ---------- the games that need sharp or flat ----------
  const settled=async()=>{ for(let i=0;i<40 && mc.pushPop===undefined;i++) await sleep(50); };
  t.connect({extra:{31:2}}); await settled();
  const unasked=()=>{ mc.unasked=true; mc.changed=new Set([31]); mc.dispatchEvent(new w.Event("device")); mc.unasked=false; mc.changed=new Set(); };
  // the firmware's double tap (as practice/virtual.js has it): it saves what 200 names and sets it to
  // 201; the next puts back what it saved, unless something else has changed it since. Then it reports.
  let engaged=null;
  const fwTap=async()=>{ const p=mc.params;
    if(engaged){ if(p[31]===engaged.applied) p[31]=engaged.saved; engaged=null; }
    else if(p[200]===31){ engaged={saved:p[31], applied:p[201]}; p[31]=p[201]; }
    unasked(); await sleep(80); };
  for(const [m,name] of [["fleet","Key Fleet"],["frets","Between the Frets"],["hunt","Chord Hunt"],["racer","Key Racer"]]){
    w.eval(`setMode('${m}')`); await sleep(200);
    const b=w.eval("borrowed[31]");
    check(`${name} borrows the modifier as sharp or flat, never the fold`, (mc.params[31]===0 || mc.params[31]===1) && b===2, `31 is ${mc.params[31]}, borrowed from ${b}`);
  }
  w.eval("setMode('spell')"); await sleep(200); w.eval("restoreAll()"); await sleep(100);
  check("given back, the fold is the player's again", mc.params[31]===2 && !w.eval("31 in borrowed"), `31 is ${mc.params[31]}`);

  // ---------- what the room says ----------
  w.eval("modTap(); mine()");
  const pill=d.getElementById("modpill");
  check("the pill says fold", pill.querySelector(".modsign").textContent==="♯♭" && /Modifier folds/.test(pill.textContent), pill.textContent);
  check("so does the strip", /modifier folds/.test(d.getElementById("myInfo").textContent), d.getElementById("myInfo").textContent);
  check("the double tap goes from fold to flat", mc.params[200]===31 && mc.params[201]===1, `200 ${mc.params[200]}, 201 ${mc.params[201]}`);
  const how=n=>w.eval(`pressRoot(${JSON.stringify(n)})`);
  w.eval("mc.params[35]=0");
  check("the help, in C: F♯ is the F column sharpened", how("F♯")==="the F column with the sharp modifier", how("F♯"));
  check("G♭ the G column flattened", how("G♭")==="the G column with the flat modifier", how("G♭"));
  check("and G♯, which G doesn't fold to, the A column flattened", how("G♯").startsWith("the A column with the flat modifier"), how("G♯"));

  // ---------- the double tap, through the firmware's save and restore ----------
  // a question arms it over the player's fold; a tap: the firmware saves the fold and sets flat. The next
  // question wants flat, which is already there, so borrows nothing; a tap puts the fold back. It's the
  // player's: kept, and still there after leaving.
  w.eval("restoreAll(); modTap()"); await sleep(50);
  await fwTap();
  check("a double tap over the fold: flat", mc.params[31]===1, `31 is ${mc.params[31]}`);
  w.eval("ensure(31,1)"); await sleep(50);
  check("a question wanting flat borrows nothing", !w.eval("31 in borrowed") && w.eval("wanted[31]")===1);
  await fwTap();
  check("the next double tap puts the fold back, and it's kept", mc.params[31]===2, `31 is ${mc.params[31]}`);
  w.eval("restoreAll()"); await sleep(100);
  check("after leaving, the fold is still the player's", mc.params[31]===2, `31 is ${mc.params[31]}`);
  // the same tap saved before a game borrows the modifier: the fold it puts back is given back after,
  // the game's way flipping meanwhile
  w.eval("modTap()"); await sleep(50); await fwTap();
  w.eval("setMode('fleet')"); await sleep(200);
  const way=mc.params[31], b0=w.eval("borrowed[31]");
  await fwTap();
  check("in Key Fleet, a double tap that puts the fold back flips the game's way instead", (way===0 || way===1) && mc.params[31]===1-way && w.eval("wanted[31]")===1-way, `borrowed ${b0}, ${way} → ${mc.params[31]}`);
  check("and the next double tap is pointed back", mc.params[201]===way, `201 is ${mc.params[201]}`);
  w.eval("restoreAll()"); await sleep(100);
  check("leaving Key Fleet gives the fold back", mc.params[31]===2, `31 is ${mc.params[31]}`);

  // ---------- the help board ----------
  // folding in C, G♯ is the A column flattened (G folds to G♭), the modifier lit with its way
  w.eval("setMode('blaster')"); await sleep(200);
  w.eval("mc.params[35]=0; mc.params[31]=2; blast.helpBoard=helperBoard('blaster'); blast.field.appendChild(blast.helpBoard.el); blast.helpKey=null; helpChord('G♯','')");
  const hb=w.eval("(()=>{ const h=blast.helpBoard; return {col:h.cells.findIndex(c=>c && c[0].classList.contains('lit')), mod:h.mod.classList.contains('lit'), sign:h.mod.textContent}; })()");
  check("the help board, folding in C: G♯ on the A column, the modifier lit ♭", hb.col===4 && hb.mod && hb.sign==="♭", JSON.stringify(hb));
  w.eval("blast.helpKey=null; helpChord('F♯','')");
  const hb2=w.eval("(()=>{ const h=blast.helpBoard; return {col:h.cells.findIndex(c=>c && c[0].classList.contains('lit')), mod:h.mod.classList.contains('lit'), sign:h.mod.textContent}; })()");
  check("F♯ on its own F column, the modifier lit ♯", hb2.col===0 && hb2.mod && hb2.sign==="♯", JSON.stringify(hb2));

  // ---------- the screen's minichord ----------
  w.eval("touchMinichord(true)"); await sleep(80);
  w.eval("mc.params[31]=2; mc.params[35]=8; vmModifier('m', true); tdDraw()");
  const deck=w.eval("[...document.querySelectorAll('#tdeck .tdcell')].filter(b=>b.dataset.r==='0').sort((a,b)=>a.dataset.c-b.dataset.c).map(b=>b.textContent).join(' ')");
  const sign=w.eval("(document.querySelector('#tdeck .tdmod')||{}).textContent");
  check("the screen's minichord, folding in E♭, names its buttons by letter, its modifier ♯♭", deck==="F♭ C♭ G♭ D♭ A E B𝄫" && sign==="♯♭", `${deck} · ${sign}`);
  w.eval("vmModifier('m', false); touchMinichord(false)");
  t.done();
})();
