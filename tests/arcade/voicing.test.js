// The minichord's chord inversion (address 37) and spacing (38), ported from the firmware: the four voices
// stack up through the chord's tones from the inversion's, a triad's fourth the bass again; the spacing
// drops voices counted from the top, or spreads the outer two; a drop with no room under it isn't made.
// And the screen's minichord voices its chords by them, as the instrument does.
const t=require("./harness").load("chord-snake");
(async()=>{
  const {w, sleep, check, mc}=t;
  await sleep(150);
  const N=["C","C♯","D","E♭","E","F","F♯","G","A♭","A","B♭","B"];
  const stack=(root, q, inv, sp, base)=>w.eval(`firmwareStack(${root}, VL_TONES[${JSON.stringify(q)}], ${inv}, ${sp}${base!=null?", "+base:""})`);
  const names=v=>v.map(p=>N[((p%12)+12)%12]).join(" ");
  // plate up, as Chord Burger stacks them: [root, quality, inversion, spacing, what sounds low to high]
  const TABLE=[
    [0,"",0,0,"C E G C"], [0,"",1,0,"E G C E"], [0,"",2,0,"G C E G"],
    [0,"",0,1,"G C E C"], [0,"",0,2,"E C G C"], [0,"",0,3,"C G E C"], [0,"",0,4,"C E G C"],
    [0,"7",1,0,"E G B♭ C"], [0,"7",3,0,"B♭ C E G"], [0,"7",0,1,"G C E B♭"],
    [9,"m",1,0,"C E A C"], [7,"7",2,1,"G D F B"]];
  const bad=TABLE.filter(([r,q,i,s,want])=>names(stack(r,q,i,s))!==want);
  check("every voicing stacks as the firmware stacks it", !bad.length, bad.map(([r,q,i,s,want])=>`${N[r]}${q} ${i}/${s}: ${names(stack(r,q,i,s))}, not ${want}`).join("; "));
  check("low to high, always", TABLE.every(([r,q,i,s])=>{ const v=stack(r,q,i,s); return v.every((p,k)=>!k || p>=v[k-1]); }));
  const spread=stack(0,"",0,4), close=stack(0,"",0,0);
  check("spread reads as close, its outer voices an octave further out", spread[0]===close[0]-12 && spread[3]===close[3]+12);
  // the default chord shuffling puts the voices an octave up: C's G has no octave under it to drop into
  check("a drop with no room under it isn't made", names(stack(0,"",0,1,12))==="C E G C" && names(stack(9,"",0,1,12))==="E A C♯ A",
    `${names(stack(0,"",0,1,12))} · ${names(stack(9,"",0,1,12))}`);

  // the screen's minichord, played from the keyboard
  w.eval("keyboardMinichord(true)"); await sleep(100);
  w.eval("window.__heard=[]; mc.addEventListener('chord', e=>window.__heard.push(e.detail.map(v=>v.pitch).sort((a,b)=>a-b)))");
  const play=async code=>{ w.eval("window.__heard=[]"); t.key(code); await sleep(120);
    w.eval(`document.dispatchEvent(new KeyboardEvent('keyup',{code:'${code}'}))`); await sleep(200);
    const h=w.eval("window.__heard"); return h.length ? names(h[h.length-1]) : ""; };
  const plain=await play("KeyW");
  check("left alone, C as it always was", plain==="C E G C", plain);
  mc.params[37]=1;
  const first=await play("KeyW");
  check("inversion 1: C with E in the bass", first==="E G C E", first);
  mc.params[37]=0; mc.params[38]=1; mc.params[120]=5;
  const drop2=await play("KeyW");
  check("drop 2, voiced two octaves up where it has room", drop2==="G C E C", drop2);
  mc.params[120]=2;
  const noRoom=await play("KeyW");
  check("and at the default shuffling, C's drop isn't made, as on the instrument", noRoom==="C E G C", noRoom);
  t.done();
})();
