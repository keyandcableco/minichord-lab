// A minichord on a phone (Android, on a USB cable): the arcade asks for MIDI from the deck's menu,
// inside the cabinet, and once it's found the phone's cabinet stays up with the game's screen alone,
// no deck, a small ☰ in its corner. Unplugged, the deck comes back. And a minichord already there when
// the page opens has the cabinet put up bare by itself.
const harness=require("./harness");
const [a, b]=["chord-snake","chord-burger"].map(s=>harness.load(s));
const {check, sleep}=a;
const phone=g=>{ g.w.matchMedia=q=>({matches: /coarse/.test(q), addEventListener(){}}); };
// MIDI as the browser gives it once allowed, with whatever's on the cable
const midi=g=>{ const outs=new Map(), ins=new Map(), m={inputs:ins, outputs:outs};
  g.w.navigator.requestMIDIAccess=async()=>m;
  return {m, plug(){ ins.set("in1", {id:"in1", name:"minichord Port 1"}); outs.set("out1", {id:"out1", name:"minichord Port 1", send(){}}); m.onstatechange && m.onstatechange(); },
    unplug(){ ins.clear(); outs.clear(); m.onstatechange && m.onstatechange(); }}; };
const rows=d=>[...d.querySelectorAll("#tdMenuDlg .tdmrow")];
const row=(d, n)=>rows(d).find(r=>r.firstChild.textContent===n);
(async()=>{
  await sleep(250);
  { const {w, d, mc}=a; phone(a); const cable=midi(a);
    w.eval("touchMinichord(true)"); await sleep(600);
    const cab=d.querySelector(".fscab");
    check("a phone with no MIDI yet: the deck's cabinet", !!cab && cab.classList.contains("phone") && !cab.classList.contains("bare") && !!cab.querySelector("#tdeck"));
    cab.querySelector("#tdeck .tdmenu").click(); await sleep(30);
    check("the menu offers to connect a minichord", !!row(d, "MINICHORD") && /CONNECT/.test(row(d, "MINICHORD").textContent), rows(d).map(r=>r.textContent).join("|"));
    row(d, "MINICHORD").click(); await sleep(80);
    check("connected with nothing on the cable: the deck plays on", w.eval("tdOn()") && !!d.getElementById("tdeck") && !!mc.midi);
    check("and it says to plug it in", /NO MINICHORD FOUND/.test(d.querySelector(".tdkey")?.textContent||""));
    check("the cabinet's still up", !!d.querySelector(".fscab.phone"));
    cable.plug(); await sleep(120);
    const bare=d.querySelector(".fscab");
    check("plugged in: the cabinet stays up, the same one (not taken down and put up again, which would drop full screen)", bare===cab && bare.classList.contains("phone") && bare.classList.contains("bare"), bare ? bare.className : "none");
    check("with no deck: the minichord's the controller", !d.getElementById("tdeck") && !w.eval("tdOn()") && mc.out && mc.out.id==="out1");
    check("the game's screen in it, the field", !!bare.querySelector(".fsscreen>.field"));
    check("and it says so", /MINICHORD CONNECTED/.test(d.querySelector(".tdkey")?.textContent||""));
    const menu=bare.querySelector(":scope>.tdmenu");
    check("a ☰ in the corner, the only thing on top of the game", !!menu);
    menu.click(); await sleep(30);
    check("its menu has no connect line now", !row(d, "MINICHORD") && !!row(d, "THE WHOLE PAGE"));
    d.getElementById("tdMenuDlg").close(); await sleep(10);
    cable.unplug(); await sleep(700);
    const back=d.querySelector(".fscab");
    check("unplugged: the deck comes back, in the same cabinet", back===bare && !back.classList.contains("bare") && back.classList.contains("phone") && !!back.querySelector("#tdeck") && w.eval("tdOn()"), back ? back.className : "none");
    check("the corner ☰ gone with it (the deck has its own)", !back.querySelector(":scope>.tdmenu"));
    cable.plug(); await sleep(120);
    check("plugged in again: bare again", !!d.querySelector(".fscab.bare") && !d.getElementById("tdeck"));
    d.querySelector(".fscab>.tdmenu").click(); await sleep(30);
    row(d, "THE WHOLE PAGE").click(); await sleep(700);
    check("THE WHOLE PAGE takes it down, and it stays down", !d.querySelector(".fscab") && !!d.querySelector("main .field.arcade"));
    w.eval("toggleFull()"); await sleep(100);
    check("SCREEN from the page puts the bare cabinet back", !!d.querySelector(".fscab.phone.bare") && !d.getElementById("tdeck")); }

  // the minichord's already allowed and plugged in when the page opens: no deck at all, the bare cabinet
  { const {w, d, mc}=b; phone(b); const cable=midi(b); cable.plug();
    await mc.connect(); await sleep(700);
    const cab=d.querySelector(".fscab");
    check("a minichord there from the start: the bare cabinet by itself", !!cab && cab.classList.contains("bare") && cab.classList.contains("pseudo") && !d.getElementById("tdeck"), cab ? cab.className : "none"); }
  a.done(); b.done();
})();
