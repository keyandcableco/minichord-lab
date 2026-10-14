// The joystick plate's shared layer (harp plate 4, firmware 90): its CCs decoded to mc.stick and
// mc.buttons with their "stick" and "button" events, timed by the MIDI message; the stick as a four-way
// and an eight-way d-pad with hysteresis, and as an angle; and kmHeld() holding its ways and A and B, so
// the games that walk while a way is held get the stick for nothing. None of it without the plate.
const t=require("./harness").load("chord-chomp");
(async()=>{
  const {w, mc, sleep, check, stick, button}=t;
  await sleep(150); t.connect({firmware:90, extra:{243:4}}); await sleep(100);
  check("the plate is known: firmware 90, harp plate 4", w.eval("jsOn()"));

  // ---- decoding, events, stamps
  const evs=[]; const take=n=>mc.addEventListener(n, e=>evs.push({n, ...e.detail}));
  take("stick"); take("button");
  mc.handle([0xB0,112,127], 1234.5);
  check("CC 112 at 127 is full right", mc.stick.x===1 && mc.stick.y===0);
  check("a \"stick\" event, timed by the message", evs.length===1 && evs[0].n==="stick" && evs[0].x===1 && evs[0].t===1234.5, JSON.stringify(evs));
  mc.handle([0xB0,112,127], 1300);
  check("the same value again: no event", evs.length===1);
  mc.handle([0xB0,112,0]); check("0 is full left", mc.stick.x===-1);
  mc.handle([0xB0,112,64]); check("64 is the middle", mc.stick.x===0);
  mc.handle([0xB0,113,127]); check("CC 113 at 127 is UP (y positive)", mc.stick.y===1);
  mc.handle([0xB0,113,32]); check("32 is half way down", mc.stick.y===-.5);
  mc.handle([0xB5,113,64]); check("on any channel", mc.stick.y===0);
  evs.length=0;
  mc.handle([0xB0,114,127], 2000.25);
  check("CC 114 is A, down at 127, with its time", mc.buttons.a && evs.length===1 && evs[0].n==="button" && evs[0].name==="a" && evs[0].down===true && evs[0].t===2000.25, JSON.stringify(evs));
  button("b"); button("click");
  check("115 is B, 116 the click", mc.buttons.b && mc.buttons.click && evs.map(e=>e.name).join()==="a,b,click");
  button("a",false); button("b",false); button("click",false);
  check("and up at 0", !mc.buttons.a && !mc.buttons.b && !mc.buttons.click && evs.length===6 && evs.slice(3).every(e=>e.down===false));
  // the onmidimessage path passes the message's timeStamp through
  { const out=mc.out, ins=[{name:"minichord Port 1", id:"in1"}]; mc.midi={inputs:new Map([["in1",ins[0]]]), outputs:new Map()}; mc._ports();
    evs.length=0; ins[0].onmidimessage({data:[0xB0,112,100], timeStamp:777.5});
    check("from the MIDI input, the message's own timeStamp", evs.length===1 && evs[0].t===777.5 && Math.abs(mc.stick.x-36/63)<1e-9, JSON.stringify(evs));
    mc.midi=null; mc.out=out; }
  stick(0,0);

  // ---- held at rest when the plate goes
  stick(1,0); button("a");
  const page0=over=>{ const d=[0xF0]; for(let i=0;i<256;i++){ const v=over[i]??mc.params[i]??0; d.push(v&127, v>>7); } d.push(0xF7); return d; };
  evs.length=0; mc._asked=1; mc._dump(page0({243:0}));
  check("the plate changed away from 4: the stick at rest and A let go, each told", mc.stick.x===0 && !mc.buttons.a && evs.some(e=>e.n==="stick" && e.x===0) && evs.some(e=>e.n==="button" && e.name==="a" && !e.down), JSON.stringify(evs));
  check("and the plate's no longer known", !w.eval("jsOn()"));
  mc._asked=1; mc._dump(page0({243:4})); await sleep(20);
  check("back to 4", w.eval("jsOn()"));

  // ---- the d-pad: four ways with hysteresis
  const w4=()=>w.eval("jsWay4()"), w8=()=>w.eval("jsWays8().join()");
  stick(.7,0); check("pushed right past half travel: right", w4()==="right");
  stick(.45,0); check("eased back a little: still right (it goes off under 0.3)", w4()==="right");
  stick(.38,0); check("further: no way", w4()===null);
  stick(.5,0); check("under half travel, coming back: still nothing", w4()===null, w4());
  stick(.8,0); stick(.8,.8); check("swept round to the diagonal: still right, never up as well", w4()==="right");
  stick(.1,.8); check("only once right has let go: up", w4()==="up");
  stick(0,-.9); check("down", w4()==="down");
  stick(-.9,.2); check("left", w4()==="left");
  stick(0,0); check("at rest: none", w4()===null);
  stick(.12,-.1); check("inside the Lab's dead zone: nothing at all", w.eval("jsXY().x===0 && jsXY().y===0"));
  // eight ways
  stick(.8,.8); check("eight ways: up and right, vertical first", w8()==="up,right");
  stick(.5,.5); check("each axis held down to 0.25", w8()==="up,right", w8());
  stick(.3,.5); check("x let go under it", w8()==="up", w8());
  stick(-.6,-.6); check("down and left", w8()==="down,left");
  stick(0,0); check("none", w8()==="");
  // the angle
  const ang=()=>w.eval("jsAngle()");
  stick(1,0); let a=ang(); check("the angle: right is a quarter turn clockwise from up", Math.abs(a.a-Math.PI/2)<.02 && a.mag>.99, JSON.stringify(a));
  stick(0,-1); a=ang(); check("down, a half turn", Math.abs(a.a-Math.PI)<.02);
  stick(-1,0); a=ang(); check("left, three quarters", Math.abs(a.a-3*Math.PI/2)<.02);
  stick(0,0); a=ang(); check("at rest: no length", a.mag===0);

  // ---- held: kmHeld with the stick and A and B
  const held=()=>w.eval("kmHeld()").join();
  await t.start(0); await sleep(200);
  stick(.9,0); await sleep(5);
  check("kmHeld: the stick's way", held()==="right", held());
  stick(.9,.9); await sleep(5);
  check("both ways of a diagonal, the newest first", held()==="up,right", held());
  button("a"); check("A held too", held().split(",")[0]==="A" && held().includes("up"), held());
  check("kmHeldWay(): the newest arrow", w.eval("kmHeldWay()")==="up");
  stick(0,0); button("a",false);
  check("let go: nothing", held()==="");
  mc._harp([0x90, 72+9, 100]);
  check("the strip on the plate: not a way held in a d-pad game", held()==="" && w.eval("kmControl(9)")===null);
  mc._harp([0x80, 72+9, 0]);

  // ---- no plate: nothing
  mc.params[243]=0; mc.dispatchEvent(new w.Event("device"));
  stick(.9,0);
  check("another plate: the stick isn't the d-pad", w4()===null && held()==="" && w8()==="");
  mc._harp([0x90, 72+9, 100]);
  check("and the strip is, as ever", held()==="up" && w.eval("kmControl(9)")==="up");
  mc._harp([0x80, 72+9, 0]); stick(0,0);
  mc.params[243]=4; mc.params[7]=89;
  check("firmware 89: no plate either", !w.eval("jsOn()"));
  mc.params[7]=90;
  w.eval("virtualMinichord('touch', true)"); await sleep(20);
  check("the screen's minichord: no plate", !w.eval("jsOn()"));
  t.done();
})();
