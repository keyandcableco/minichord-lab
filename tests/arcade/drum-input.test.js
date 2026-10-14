// Harp drums coming in (core/minichord.js, practice/virtual.js, touch.js, keyboard.js): settings 256 to
// 511 read from the minichord (page 1, firmware 31 on) after its first dump and after any it sends
// unasked, without disturbing what the Lab makes of page 0 (a preset loaded, the key combo); while harp
// drums (343) is on, a channel-10 note from either port is a "drum" event timed by its MIDI message,
// and nothing else hears it; with harp drums off, channel 10 is what it always was. The screen's
// minichord honours harp drums too: its strings, its keys and its drum pads (a grid of twelve, struck
// by each finger once, named by the game) make the same "drum" events, and never a piano note. And a
// game that isn't a drum game (Harp Command) still gets its harp.
const t=require("./harness").load("harp-command"), {w, d, mc, sb, check, sleep}=t;
(async()=>{
  await sleep(250);
  const ev=[];                                                     // every event the core sends, in order
  for(const k of ["drum","harp","harpoff","page1","device","voices"]) mc.addEventListener(k, e=>ev.push({k, d:e.detail}));
  const take=k=>{ const r=ev.filter(e=>e.k===k); ev.length=0; return r; };
  const now=()=>w.performance.now();
  check("the General MIDI drum for each pad is the page's", JSON.stringify(w.DRUM_GM)==="[36,38,37,39,42,46,49,45,50,64,63,56,70]" && typeof mc.requestPage1==="function", JSON.stringify(w.DRUM_GM));

  // ---------- a minichord on Web MIDI (as hot-plug has it): page 1 ----------
  // it keeps what the page writes, and has no push and pop (so nothing is asked of it but the dumps)
  const sent=[], ins=new Map(), outs=new Map();
  const P={}; for(let a=0;a<512;a++) P[a]=0; Object.assign(P, {2:80, 3:80, 7:60, 35:2, 97:150, 338:55, 339:12, 340:0, 343:0, 390:300});
  const out=id=>({id, name:"minichord Port 1", send(m){ sent.push([...m]); const a=m[1]+128*m[2]; if(a) P[a]=m[3]+128*m[4]; }});
  mc.midi={inputs:ins, outputs:outs}; mc.sysex=mc.sysexGranted=true; mc.pushPop=false;
  ins.set("in1", {id:"in1", name:"minichord Port 1"}); ins.set("in2", {id:"in2", name:"minichord Port 2"});
  outs.set("out1", out("out1"));
  mc._ports();
  const asked=(cmd, p)=>sent.filter(m=>m.join()===[0xF0,0,0,cmd,p,0xF7].join()).length;
  const page0=()=>[0xF0, ...[...Array(256).keys()].flatMap(a=>[P[a]&127, P[a]>>7]), 0xF7];
  const page1=(p=1)=>[0xF0, 0x7D, 0x6D, p, ...[...Array(256).keys()].flatMap(i=>[P[256*p+i]&127, P[256*p+i]>>7]), 0xF7];
  const port=(id, data, timeStamp)=>ins.get(id).onmidimessage(timeStamp==null ? {data} : {data, timeStamp});
  check("plugged in: asked for its settings, page 1 not yet", asked(0,0)===1 && asked(7,1)===0 && mc.page1===false, JSON.stringify(sent));
  port("in1", page0()); await sleep(20);
  check("its first dump in, firmware 60: page 1 is asked for", asked(7,1)===1 && mc.page1===false && mc.params[343]===undefined, `${asked(7,1)} asked`);
  const was={unasked:mc.unasked, changed:mc.changed, tries:mc._dumpTries}; take("device");
  mc._dumpTries=1; port("in1", page1()); await sleep(10);
  check("page 1 arrives: settings 256 to 511, two bytes each", mc.page1===true && mc.params[338]===55 && mc.params[339]===12 && mc.params[343]===0 && mc.params[390]===300 && mc.params[511]===0,
    `338=${mc.params[338]} 390=${mc.params[390]}`);
  const e1=take("page1");
  check("a \"page1\" event, and no \"device\" event", e1.length===1 && !ev.some(e=>e.k==="device"));
  ev.length=0;
  check("and none of the dump's bookkeeping touched: preset, key combo, the dump's retry", mc.unasked===was.unasked && mc.changed===was.changed && mc._dumpTries===1);
  mc._dumpTries=0;
  const n7=asked(7,1);
  mc.requestDump(); port("in1", page0()); await sleep(10);
  check("a dump the page asked for doesn't ask for page 1 again", asked(7,1)===n7 && mc.unasked===false);
  P[35]=3; port("in1", page0()); await sleep(10);
  check("the key combo (unasked, only the key) is still the key combo, and page 1 is read again", mc.comboPick===true && mc.presetLoaded===false && asked(7,1)===n7+1);
  Object.assign(P, {21:1, 30:2, 33:1, 36:4, 343:1, 340:2}); port("in1", page0()); await sleep(10);
  check("a preset loaded (unasked, a lot changed) is still a preset load, and page 1 is read again", mc.presetLoaded===true && mc.comboPick===false && asked(7,1)===n7+2);
  check("until it comes, page 1 is what it was", mc.params[343]===0);
  port("in1", page1()); await sleep(10);
  check("the preset's page 1: harp drums on", mc.params[343]===1 && mc.params[340]===2);
  mc._asked=(mc._asked||0)+1; mc.control(6); port("in1", page0()); await sleep(10);
  check("a pop's dump (asked for) has page 1 read again: a pop puts back all 512", asked(7,1)===n7+3);
  const bad=page1(); bad.splice(10,2); P[343]=0; port("in1", bad); await sleep(10);
  check("a page of the wrong length is dropped", mc.params[343]===1);
  ev.length=0;

  // ---------- harp drums on: channel 10 is drums, from either port ----------
  port("in2", [0x99,38,90], 1234.5); await sleep(10);
  let dr=take("drum");
  check("a pad on Port 2: a \"drum\" event, timed by its MIDI message", dr.length===1 && JSON.stringify(dr[0].d)===JSON.stringify({note:38, vel:90, pad:1, t:1234.5, source:"minichord"}), JSON.stringify(dr));
  port("in2", [0x89,38,0], 1274.5); port("in2", [0x99,38,0], 1280); await sleep(10);
  check("its note-off (either kind) is nothing at all", ev.length===0, JSON.stringify(ev));
  port("in1", [0x99,36,127], 2000); await sleep(60);
  dr=take("drum");
  check("a pad on Port 1: a drum too, and never a chord voice", dr.length===1 && dr[0].d.pad===0 && dr[0].d.t===2000 && mc.notes.size===0, `${JSON.stringify(dr)} notes ${mc.notes.size}`);
  ev.length=0;
  const t0=now(); port("in2", [0x99,70,60]); const t1=now(); await sleep(10);
  dr=take("drum");
  check("the shaker is pad 12; a message with no timestamp is timed as it's read", dr.length===1 && dr[0].d.pad===12 && dr[0].d.t>=t0 && dr[0].d.t<=t1, JSON.stringify(dr));
  port("in2", [0x90,62,100]); await sleep(10);
  check("the harp's other notes are still harp strings", JSON.stringify(take("harp").map(e=>e.d.note))==="[62]");
  w.eval("mc.handle([0x99,42,80], 777)"); await sleep(10);
  dr=take("drum");
  check("mc.handle(data, stamp) hears drums the same way", dr.length===1 && dr[0].d.pad===4 && dr[0].d.vel===80 && dr[0].d.t===777, JSON.stringify(dr));
  const t2=now(); w.eval("mc.handle([0x99,46,70])"); dr=take("drum");
  check("and with no stamp, now", dr.length===1 && dr[0].d.pad===5 && dr[0].d.t>=t2);
  // a stamp from another clock (1970's, as old WebKit has it) or none at all: timed as it's read
  { const a=now(); port("in2", [0x99,38,90], w.performance.timeOrigin+a); port("in2", [0x99,38,90], 0); port("in2", [0x99,38,90], -5); const b=now(); await sleep(10);
    dr=take("drum");
    check("a stamp counted from 1970, 0 or below 0: the drum is timed as it's read", dr.length===3 && dr.every(e=>e.d.t>=a && e.d.t<=b), JSON.stringify(dr.map(e=>e.d.t))); }
  // another instrument plugged in (an e-drum kit, "Midi Through"): its channel 10 is no more heard than its other notes
  ins.set("in3", {id:"in3", name:"Roland TD-07 e-drums"}); mc._ports(); ev.length=0;
  port("in3", [0x90,60,100]); port("in3", [0x99,38,100], 3100); await sleep(60);
  check("another input, the minichord's chord port listened to: its drums aren't the minichord's pads", ev.length===0 && mc.notes.size===0, JSON.stringify(ev));
  mc.selectInput("in1"); await sleep(10); ev.length=0;
  port("in2", [0x99,38,100], 3200); port("in3", [0x99,38,100], 3210); await sleep(10);
  dr=take("drum");
  check("the chord port picked: the harp port's pads still heard, the other input's not", dr.length===1 && dr[0].d.t===3200, JSON.stringify(dr));
  mc.selectInput("in3"); await sleep(10); ev.length=0;
  port("in3", [0x99,38,100], 3300); await sleep(10);
  dr=take("drum");
  check("that input picked: its channel 10 heard as the pads, as any picked input's notes are", dr.length===1 && dr[0].d.t===3300 && dr[0].d.pad===1, JSON.stringify(dr));
  mc.selectInput("auto"); ins.delete("in3"); mc._ports(); await sleep(60); ev.length=0;
  // ---------- harp drums off: channel 10 as it always was ----------
  P[343]=0; port("in1", page1()); await sleep(10); ev.length=0;
  port("in2", [0x99,38,90], 3000); await sleep(10); port("in2", [0x89,38,0], 3040); await sleep(10);
  let h=ev.map(e=>e.k+":"+(e.d && e.d.note)+":"+(e.d && e.d.ch)).join();
  check("harp drums off: channel 10 on Port 2 is a harp string and its release, as before", h==="harp:38:9,harpoff:38:9", h);
  ev.length=0; port("in1", [0x99,36,100]); await sleep(60);
  check("and on Port 1 (no MPE) a chord voice, as before", mc.notes.has("9:36") && !ev.some(e=>e.k==="drum") && ev.some(e=>e.k==="voices"), [...mc.notes.keys()].join());
  port("in1", [0x89,36,0]); await sleep(80); mc.allOff(); ev.length=0;
  w.eval("mc.handle([0x99,38,90])"); await sleep(60);
  check("mc.handle too", mc.notes.has("9:38") && !ev.some(e=>e.k==="drum"));
  mc.allOff(); await sleep(50); ev.length=0;

  // ---------- another minichord: page 1 forgotten; firmware 30 isn't asked ----------
  outs.clear(); outs.set("out2", out("out2")); mc._ports();
  check("another minichord: page 1 forgotten till it's read from this one", mc.page1===false && mc.params[343]===undefined && mc.params[338]===undefined);
  P[7]=30; const n7b=asked(7,1); port("in1", page0()); await sleep(10);
  check("firmware 30 (before page 1) isn't asked for it", asked(7,1)===n7b);
  port("in2", [0x99,38,90]); await sleep(10);
  check("and its channel 10 is what it always was", take("harp").length===1);
  ins.clear(); outs.clear(); mc._ports(); mc.midi=null; mc.out=null;

  // ---------- the harness's minichord answers command 7 ----------
  const dumps=[], dump0=mc._dump.bind(mc); mc._dump=m=>{ dumps.push(m.length); dump0(m); };
  t.connect({firmware:17, extra:{343:1}});
  check("the tests' minichord: page 1 unknown at connect, but extra sets it", mc.page1===false && mc.params[343]===1 && mc.params[340]===undefined);
  mc.requestPage1(); await sleep(30);
  check("firmware 17 doesn't answer command 7", dumps.length===0 && mc.page1===false);
  t.connect({firmware:60, extra:{338:70, 340:2}});
  mc.requestPage1(); await sleep(30);
  check("firmware 60 answers with a 517-byte page 1 from what it holds", JSON.stringify(dumps)==="[517]" && mc.page1===true && mc.params[338]===70 && mc.params[340]===2 && mc.params[343]===0 && mc.params[300]===0,
    JSON.stringify(dumps));
  mc._dump=dump0; ev.length=0;

  // ---------- an unrelated game (Harp Command) still gets its harp ----------
  // the tests' minichord, its ports seen as a computer sees them
  const hout=mc.out; hout.name="minichord Port 1";
  mc.midi={inputs:ins, outputs:outs}; ins.set("in1", {id:"in1", name:"minichord Port 1"}); ins.set("in2", {id:"in2", name:"minichord Port 2"}); outs.set("test", hout); mc._ports();
  check("(the tests' minichord on its ports)", mc.out===hout && mc.page1===true);
  const a=await t.start(0, {speed:1});
  const shoot=async(ch)=>{ for(let i=0;i<80;i++){ const it=a.items.filter(x=>!x.done).sort((x,y)=>x.t0-y.t0)[0]; if(it){ const s=a.score; port("in2", [0x90|ch, 60+it.pc, 100]); await sleep(220); port("in2", [0x80|ch, 60+it.pc, 0]); return a.score>s; } await sleep(100); } return false; };
  check("harp drums off: a harp note on channel 10 still shoots in Harp Command", a.phase==="play" && await shoot(9), `score ${a.score}`);
  w.eval("mc.writeParam(343, 1)"); ev.length=0;
  check("harp drums on: the harp's own channels still shoot", await shoot(1), `score ${a.score}`);
  const s0=a.score; port("in2", [0x99,40,100]); await sleep(250);
  check("and channel 10 is drums, not strings: a note no pad sends shoots nothing (pad -1)", a.score===s0 && take("drum").some(e=>e.d.pad===-1) && !ev.some(e=>e.k==="harp"));
  w.eval("mc.writeParam(343, 0)");
  ins.clear(); outs.clear(); mc.midi=null; mc.out=null; ev.length=0;

  // ---------- the screen's minichord ----------
  w.eval("window.__piano=0; { const p=piano.play.bind(piano); piano.play=(...x)=>{ window.__piano++; return p(...x); }; }");
  w.eval("touchMinichord(true)"); await sleep(80);
  check("the screen's minichord has page 1: zeros, the drum level 70", mc.virtual===true && mc.page1===true && mc.params[338]===70 && mc.params[343]===0
    && [...Array(256).keys()].every(i=>Number.isFinite(mc.params[256+i])));
  ev.length=0; w.eval("vmPluck('x', 3)"); await sleep(10);
  check("harp drums off: a string is a harp note, sounded", JSON.stringify(take("harp").map(e=>e.d.note))==="[63]" && w.eval("window.__piano")===1);
  w.eval("vmLetGo('x')"); ev.length=0;
  w.eval("ensure(343, 1)");
  check("a game sets harp drums on the screen's minichord", mc.params[343]===1);
  ev.length=0; w.eval("window.__piano=0; vmPluck('x', 1, false, 500)"); await sleep(10);
  dr=take("drum");
  check("harp drums on: a string is a drum event, the stamp given", dr.length===1 && JSON.stringify(dr[0].d)===JSON.stringify({note:38, vel:100, pad:1, t:500, source:"touch"}), JSON.stringify(dr));
  w.eval("vmLetGo('x')");
  { const a=now(); w.eval(`vmPluck('x', 1, false, ${Date.now()})`); const b=now(); await sleep(10);
    dr=take("drum");
    check("a string's stamp counted from 1970 (an old WebKit's touch or key): timed as it's struck", dr.length===1 && dr[0].d.t>=a && dr[0].d.t<=b, JSON.stringify(dr)); }
  check("never a harp note, never the piano", !ev.some(e=>e.k==="harp") && w.eval("window.__piano")===0);
  w.eval("vmLetGo('x')"); await sleep(10);
  check("and letting go sends nothing", !ev.some(e=>e.k==="harpoff"));
  ev.length=0;
  // the keyboard
  w.eval("keyboardMinichord(true)"); await sleep(50); ev.length=0;
  const k0=now(); t.key("Digit3"); const k1=now(); await sleep(10);
  dr=take("drum");
  check("a number key is a drum pad, timed by the key", dr.length===1 && dr[0].d.pad===2 && dr[0].d.note===37 && dr[0].d.source==="keys" && dr[0].d.t>=k0-2 && dr[0].d.t<=k1+2, JSON.stringify(dr));
  w.eval("document.dispatchEvent(new KeyboardEvent('keyup',{code:'Digit3'}))"); w.eval("keyboardMinichord(false)"); await sleep(30);
  check("the keyboard put away, the screen's minichord still plays", mc.virtual===true && mc.params[343]===1);

  // ---------- the drum pads on the deck ----------
  check("the drum games' decks are pads, with no chords", JSON.stringify(w.eval("TD_PROFILES.pilot"))==='{"chords":0,"harp":"pads"}' && JSON.stringify(w.eval("TD_PROFILES.fours"))==='{"chords":0,"harp":"pads"}');
  w.eval("window.__cmdDeck=TD_PROFILES.command; TD_PROFILES.command={chords:0, harp:'pads'}; tdSync()"); await sleep(30);
  const grid=d.querySelector("#tdeck .tdpads"), pads=()=>[...d.querySelectorAll("#tdeck .tdpads span")];
  check("a pads deck: twelve pads, three by four, the kick bottom left", !!grid && !d.querySelector("#tdeck .tdharp") && pads().map(s=>s.dataset.i).join()==="9,10,11,6,7,8,3,4,5,0,1,2"
    && d.getElementById("tdeck").dataset.harp==="pads", pads().map(s=>s.dataset.i).join());
  const names=w.eval("tdPadNames()");
  check("named by the game's names (or the default), five letters at most", pads().every(s=>s.textContent===names[+s.dataset.i]) && names.length===12 && names.every(n=>n.length>=1 && n.length<=5), pads().map(s=>s.textContent).join());
  const finger=(el, type, id, x, y, timeStamp)=>{ const e=new w.MouseEvent(type, {clientX:x, clientY:y, bubbles:true, cancelable:true});
    Object.defineProperty(e, "pointerId", {value:id}); Object.defineProperty(e, "pointerType", {value:"touch"});
    if(timeStamp!=null) Object.defineProperty(e, "timeStamp", {value:timeStamp}); el.dispatchEvent(e); };
  const pad=i=>d.querySelector(`#tdeck .tdpads span[data-i="${i}"]`);
  ev.length=0; w.eval("window.__piano=0");
  finger(pad(0), "pointerdown", 1, 0, 0, 900); await sleep(10);
  dr=take("drum");
  check("a finger on the kick: pad 0, timed by the touch, silent", dr.length===1 && JSON.stringify(dr[0].d)===JSON.stringify({note:36, vel:100, pad:0, t:900, source:"touch"}) && w.eval("window.__piano")===0, JSON.stringify(dr));
  check("the pad lights while it's held", pad(0).classList.contains("on"));
  finger(pad(0), "pointermove", 1, 5, 5, 910); finger(pad(1), "pointermove", 1, 50, 5, 920); await sleep(10);
  check("sliding strikes nothing more", take("drum").length===0);
  finger(pad(4), "pointerdown", 2, 0, 0, 930); await sleep(10);
  dr=take("drum");
  check("a second finger, the first still down: a second hit", dr.length===1 && dr[0].d.pad===4 && dr[0].d.t===930 && pad(0).classList.contains("on") && pad(4).classList.contains("on"));
  finger(pad(4), "pointerdown", 3, 0, 0, 940); await sleep(10);
  check("two fingers on one pad: two hits", take("drum").length===1);
  { const a=now(); finger(pad(7), "pointerdown", 8, 0, 0, Date.now()); const b=now(); await sleep(10);
    dr=take("drum");
    check("a touch stamped from 1970: the pad timed as it's struck", dr.length===1 && dr[0].d.pad===7 && dr[0].d.t>=a && dr[0].d.t<=b, JSON.stringify(dr)); }
  for(const id of [1,2,3,8]) finger(grid, "pointerup", id, 0, 0); await sleep(10);
  check("let go: the pads go out, and nothing is sent", !pad(0).classList.contains("on") && !pad(4).classList.contains("on") && ev.length===0, JSON.stringify(ev));
  // between pads, by where the finger is
  grid.getBoundingClientRect=()=>({left:0, top:0, right:300, bottom:200, width:300, height:200});
  finger(grid, "pointerdown", 4, 10, 190); finger(grid, "pointerdown", 5, 290, 10); finger(grid, "pointerdown", 6, 150, 120);
  dr=take("drum");
  check("a finger in a gap: the pad where it is (bottom left kick, top right 11, middle of row three 4)", dr.map(e=>e.d.pad).join()==="0,11,4", dr.map(e=>e.d.pad).join());
  for(const id of [4,5,6]) finger(grid, "pointerup", id, 0, 0);
  // the game's own names, kept
  w.eval("blast.padNames=['DUM','TEK','KA','KE','TE','TIN','NAA','TUN','NE','GE','NA','GEE']; tdDraw()");
  check("the game's names go up", pad(0).textContent==="DUM" && pad(11).textContent==="GEE", pads().map(s=>s.textContent).join());
  finger(pad(5), "pointerdown", 7, 0, 0); await sleep(10); finger(pad(5), "pointerup", 7, 0, 0); w.eval("tdDraw(); mc.dispatchEvent(new Event('device'))"); await sleep(450);
  check("and stay up through a strike, a redraw and the deck's own sync", pad(0).textContent==="DUM" && pad(5).textContent==="TIN" && !!d.querySelector("#tdeck .tdpads"));
  w.eval("blast.padNames=['KICK','SNARE','RIM','CLAP','HAT','OPEN','CRASH','TOM L','TOM H','CGA L','CGA H','BELL']"); await sleep(450);
  check("another kit's names replace them, the deck kept", pad(0).textContent==="KICK" && pad(11).textContent==="BELL" && d.querySelector("#tdeck .tdpads")===grid);
  // a demo, or beginner mode, lights pads
  w.eval(`window.__hh=blast.helpHarp; blast.helpHarp={el:{remove(){}}, cells:[...Array(12)].map(()=>document.createElement("i"))};
    blast.helpHarp.cells[0].classList.add("lit"); blast.helpHarp.cells[4].classList.add("lit"); tdHints()`);
  check("the pads a demo lights are lit on the deck, several at once", pads().filter(s=>s.classList.contains("hint")).map(s=>s.dataset.i).sort().join()==="0,4");
  w.eval("blast.helpHarp=window.__hh; tdHints(); delete blast.padNames; TD_PROFILES.command=window.__cmdDeck; tdSync()"); await sleep(30);
  check("(Harp Command's strings back)", !!d.querySelector("#tdeck .tdharp") && !d.querySelector("#tdeck .tdpads"));
  ev.length=0; w.eval("vmPluck('y', 6)"); await sleep(10);
  check("a string, harp drums still on: a drum", take("drum").length===1 && !ev.some(e=>e.k==="harp"));
  w.eval("touchMinichord(false)"); await sleep(50);
  check("the screen's minichord put away: page 1 goes with it", mc.page1===false && mc.params[343]===undefined && mc.virtual===false);

  // ---------- a browser whose events are stamped from 1970 (jsdom's own, an old WebKit's) ----------
  { const E=require("./harness").load("harp-command", {epochStamps:true}), dr2=[];
    await E.sleep(250);
    E.w.eval("keyboardMinichord(true)"); await E.sleep(50); E.w.eval("ensure(343, 1)");
    E.mc.addEventListener("drum", e=>dr2.push(e.detail));
    const a=E.w.performance.now(); E.key("Digit2"); const b=E.w.performance.now(); await E.sleep(10);
    E.w.eval("document.dispatchEvent(new KeyboardEvent('keyup',{code:'Digit2'}))");
    check("a key stamped from 1970: the pad timed as it's struck, not decades late", dr2.length===1 && dr2[0].pad===1 && dr2[0].t>=a && dr2[0].t<=b,
      JSON.stringify(dr2)+" event stamp "+E.w.eval("new Event('x').timeStamp")); }
  t.done();
})();
