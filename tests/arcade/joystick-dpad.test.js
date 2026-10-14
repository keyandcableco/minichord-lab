// The joystick plate as the d-pad: in the games that steer on the harp's d-pad, the stick pushed a way
// (an edge: a new way, once) and A or B pressed go in exactly as a pluck of the layout's string for that
// way does (answerNote), counted as playing; a game that reads the stick itself (blast.jsOwn) gets none
// of it. On the plate the strip isn't a d-pad there, unless a game claims it (blast.jsStrip). Initials
// are spelled on the stick too.
const t=require("./harness");
const STR={up:9, right:3, down:0, left:7, A:6, B:5};    // the strip layout's string for each way
const results=[];
const check=(name, ok, detail="")=>{ results.push(!!ok); console.log(`${ok?"  ✓":"  ✗"} ${name}${detail?`  (${detail})`:""}`); };
(async()=>{
  { // ---- Chord Snake
    const T=t.load("chord-snake"), {w, mc, sleep, stick, button}=T;
    await sleep(150); T.connect({firmware:90, extra:{243:4}}); await sleep(100);
    await T.start(0); await sleep(200);
    const calls=[]; const an=w.answerNote; w.answerNote=(pc,...r)=>{ calls.push(pc); return an(pc,...r); };
    const dir0=w.eval("blast.dir"), turn=dir0==="up"||dir0==="down" ? "left" : "up";
    const in0=w.eval("blast.midiIn||0");
    stick(turn==="up"?0:-.9, turn==="up"?.9:0); await sleep(5);
    check(`Snake: the stick pushed ${turn} is the harp's ${turn} plucked`, calls.length===1 && calls[0]===STR[turn], JSON.stringify(calls));
    check("and the snake turns", w.eval("blast.queue.includes(" + JSON.stringify(turn) + ")"), w.eval("JSON.stringify(blast.queue)"));
    check("counted as playing (for the board)", w.eval("blast.midiIn||0")===in0+1);
    stick(turn==="up"?.2:-.9, turn==="up"?.9:.3); await sleep(5);
    check("held, moving a little: no second press", calls.length===1);
    stick(0,0); await sleep(5);
    button("b"); button("b", false);
    check("B is the harp's B", calls[calls.length-1]===STR.B);
    // the strip on the plate: not a d-pad
    const q=w.eval("JSON.stringify(blast.queue)");
    mc._harp([0x90, 72+9, 100]); mc._harp([0x80, 72+9, 0]); await sleep(5);
    check("the strip touched on the plate: heard, but no way", w.eval("JSON.stringify(blast.queue)")===q && w.eval("kmControl(9)")===null);
    w.eval("blast.jsStrip=true");
    check("a game that claims the strip has it as ever", w.eval("kmControl(9)")==="up");
    w.eval("blast.jsStrip=false; blast.jsOwn=true"); calls.length=0;
    stick(-.9,0); stick(0,0); button("a"); button("a",false); await sleep(5);
    check("a game that reads the stick itself (jsOwn): nothing sent", calls.length===0, JSON.stringify(calls));
    w.eval("blast.jsOwn=false");
    // initials, on the stick
    w.eval("blast.phase='over'; window.__next=0; hsEntry('chord-snake', 100, ()=>{ window.__next++; })");
    await sleep(750);
    const letters=()=>[...T.d.querySelectorAll(".hsentry .hsletters span")].map(s=>s.textContent).join("");
    const before=letters();
    stick(0,.9); stick(0,0); await sleep(5);
    check("initials: the stick up picks the next letter", letters()!==before && letters()[0]!==before[0], `${before} → ${letters()}`);
    stick(.9,0); stick(0,0); await sleep(5);
    check("right moves on", w.eval("[...document.querySelectorAll('.hsentry .hsletters span')].findIndex(s=>s.classList.contains('on'))")===1);
    button("a"); button("a",false); await sleep(5);
    check("A sets it", w.eval("[...document.querySelectorAll('.hsentry .hsletters span')].findIndex(s=>s.classList.contains('on'))")===2);
    check("the hint says the stick", /THE STICK/.test(T.d.querySelector(".hsentry .padhint").textContent));
    w.eval("blast.hsEntry && blast.hsEntry.cancel()");
  }
  { // ---- Chord Chomp
    const T=t.load("chord-chomp"), {w, sleep, stick, button}=T;
    await sleep(150); T.connect({firmware:90, extra:{243:4}}); await sleep(100);
    await T.start(0); await sleep(200);
    for(const way of ["left","up","right","down"]){
      const [x,y]={left:[-.9,0], up:[0,.9], right:[.9,0], down:[0,-.9]}[way];
      stick(x,y); await sleep(5);
      check(`Chomp: the stick ${way}, the way to go`, w.eval("blast.want")===way, w.eval("blast.want"));
      stick(0,0);
    }
    check("the picture beside the field is the joystick plate", !!T.d.querySelector(".field .kmstrip.jspic svg .jsway[data-zone='up']"));
    stick(0,.9); await sleep(5);
    check("its stick's way lit as it's held", !!T.d.querySelector(".kmstrip.jspic .jsway.on[data-zone='up']"));
    stick(0,0); button("a"); await sleep(5);
    check("and A", !!T.d.querySelector(".kmstrip.jspic .jsbtn.on[data-zone='A']"));
    button("a",false);
  }
  { // ---- Chord Sweeper (it reads the stick itself if it says so: then the layer keeps out)
    const T=t.load("chord-sweeper"), {w, sleep, stick}=T;
    await sleep(150); T.connect({firmware:90, extra:{243:4}}); await sleep(100);
    await T.start(0); await sleep(200);
    const calls=[]; const an=w.answerNote; w.answerNote=(pc,...r)=>{ calls.push(pc); return an(pc,...r); };
    const own=!!w.eval("blast.jsOwn");
    stick(.9,0); stick(0,0); await sleep(5);
    if(own) check("Sweeper reads the stick itself (jsOwn): the layer sends it nothing", calls.length===0, JSON.stringify(calls));
    else check("Sweeper: the stick right is the harp's right plucked", calls.length===1 && calls[0]===STR.right, JSON.stringify(calls));
  }
  { // ---- not the plate: nothing
    const T=t.load("chord-snake"), {w, sleep, stick}=T;
    await sleep(150); T.connect({firmware:90}); await sleep(100);
    await T.start(0); await sleep(200);
    const calls=[]; const an=w.answerNote; w.answerNote=(pc,...r)=>{ calls.push(pc); return an(pc,...r); };
    stick(0,.9); stick(0,0); await sleep(5);
    check("another plate: a stray CC 112/113 moves nothing", calls.length===0);
  }
  const bad=results.filter(r=>!r).length; console.log(bad ? `FAILED ${bad} of ${results.length}` : `ok ${results.length}`); process.exit(bad?1:0);
})();
