// The modifier set to fold (address 31 at 2, firmware 118): by the button's degree in the key, IV and I
// sharpen and the other five flatten. The screen's and the keyboard's minichord fold as the instrument
// does, in C and in E♭; the games that need a plain sharp or flat borrow it as one and give the fold
// back; the pill, the strip and the help say fold; the double tap goes from fold to flat, and in a game
// holding sharp or flat, a double tap that puts the fold back flips the game's way instead.
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
  const inC=fold(0);
  check("folded in C: F and C sharpen, G D A E B flatten", inC.names==="F♯ C♯ G♭ D♭ A♭ E♭ B♭", inC.names);
  check("and those are the pitches it sounds", JSON.stringify(inC.pcs)===JSON.stringify([6,1,6,1,8,3,10].map(triad)), inC.pcs.join(" | "));
  check("the keyboard card names them so", inC.card==="F♯ C♯ G♭ D♭ A♭ E♭ B♭", inC.card);
  const inEb=fold(8);
  check("folded in E♭: A♭ and E♭ sharpen to A and E, the rest flatten", inEb.names==="E B G♭ D♭ A E A", inEb.names);
  check("and those are the pitches it sounds", JSON.stringify(inEb.pcs)===JSON.stringify([4,11,6,1,9,4,9].map(triad)), inEb.pcs.join(" | "));
  w.eval("keyboardMinichord(false)"); await sleep(50);

  // ---------- the games that need sharp or flat ----------
  const settled=async()=>{ for(let i=0;i<40 && mc.pushPop===undefined;i++) await sleep(50); };
  t.connect({extra:{31:2}}); await settled();
  const unasked=()=>{ mc.unasked=true; mc.changed=new Set([31]); mc.dispatchEvent(new w.Event("device")); mc.unasked=false; mc.changed=new Set(); };
  for(const [m,name] of [["fleet","Key Fleet"],["frets","Between the Frets"],["hunt","Chord Hunt"]]){
    w.eval(`setMode('${m}')`); await sleep(200);
    const b=w.eval("borrowed[31]");
    check(`${name} borrows the modifier as sharp or flat, never the fold`, (mc.params[31]===0 || mc.params[31]===1) && b===2, `31 is ${mc.params[31]}, borrowed from ${b}`);
    if(m==="fleet"){
      // the firmware's double tap puts back the fold it took the modifier from: the game's way flips
      const was=mc.params[31]; mc.params[31]=2; unasked(); await sleep(80);
      check("a double tap that puts the fold back flips the game's way instead", mc.params[31]===1-was && w.eval("wanted[31]")===1-was, `was ${was}, now ${mc.params[31]}`);
      check("and the next double tap is pointed back", mc.params[201]===was, `201 is ${mc.params[201]}`);
    }
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
  t.done();
})();
