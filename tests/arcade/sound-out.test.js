// SOUND OUT: a minichord on firmware 24 has a USB audio setting (244). At 0, as it always was, an
// Android phone sends its sound there and goes quiet, so the arcade asks, once, where it should go.
// THE PHONE writes 2, which restarts the minichord for the phone to see it: the cabinet waits for it
// rather than putting the deck back, and the game sets it up afresh when it's back. LEAVE IT is
// remembered. Firmware 23 isn't asked, nor a phone that isn't Android, and the menu has SOUND OUT.
const harness=require("./harness");
const [a, b, c]=["chord-snake","chord-snake","chord-snake"].map(s=>harness.load(s));
const {check, sleep}=a;
const android=(g, yes=true)=>{ g.w.matchMedia=q=>({matches:/coarse/.test(q), addEventListener(){}});
  Object.defineProperty(g.w.navigator, "userAgent", {value: yes ? "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/131" : "Mozilla/5.0 (iPad)", configurable:true}); };
// a minichord that answers for its settings over MIDI, both ports named as Android names them
function minichord(g, firmware=24){
  const dev=new Array(256).fill(0); Object.assign(dev, {2:80, 3:80, 7:firmware, 35:0, 97:150, 106:1});
  const ins=new Map(), outs=new Map(), m={inputs:ins, outputs:outs}, writes=[];
  g.w.navigator.requestMIDIAccess=async()=>m;
  const dump=()=>{ const x=[0xF0]; for(let i=0;i<256;i++) x.push(dev[i]&127, dev[i]>>7); x.push(0xF7); return x; };
  const plug=()=>{ ins.set("i0", {id:"i0", name:"minichord"}); ins.set("i1", {id:"i1", name:"minichord"});
    outs.set("o0", {id:"o0", name:"minichord", send(x){
      if(x[0]!==0xF0 || x.length!==6) return;
      if(x[1]===0 && x[2]===0){ if(x[3]===0) setTimeout(()=>ins.get("i0")?.onmidimessage({data:dump()}), 5); }
      else { const a=x[1]+128*x[2], v=x[3]+128*x[4]; dev[a]=v; writes.push([a,v]); } }});
    outs.set("o1", {id:"o1", name:"minichord", send(){}}); m.onstatechange && m.onstatechange(); };
  // a restart: gone, every setting back to the preset's but 244, which the instrument keeps
  const restart=async()=>{ ins.clear(); outs.clear(); m.onstatechange && m.onstatechange(); await sleep(400);
    const keep=dev[244]; dev.fill(0); Object.assign(dev, {2:80, 3:80, 7:firmware, 35:0, 97:150, 106:1, 244:keep}); plug(); };
  return {dev, writes, plug, restart};
}
const card=d=>d.querySelector("#tdMenuDlg.tdsoundout[open]");
const opt=(d, label)=>[...d.querySelectorAll("#tdMenuDlg .tdmopt")].find(r=>r.firstChild.firstChild.textContent===label);
(async()=>{
  await sleep(250);
  { const {w, d}=a; android(a); const mcd=minichord(a); mcd.plug();
    Object.defineProperty(w.navigator, "mediaDevices", {value:{getUserMedia:async()=>({getTracks:()=>[], getAudioTracks:()=>[]}), enumerateDevices:async()=>[]}, configurable:true});
    w.eval("touchMinichord(true)"); await sleep(400); await a.start(0); await sleep(300);
    await w.eval("tdConnect()"); await sleep(800);
    check("an Android phone, a minichord on firmware 24 at 0: the arcade asks where the sound goes", !!card(d));
    check("the phone, the minichord, or leave it", ["THE PHONE","THE MINICHORD","LEAVE IT"].every(l=>!!opt(d, l)) && opt(d,"LEAVE IT").classList.contains("on"));
    const set98=mcd.dev[98];
    opt(d, "THE PHONE").click(); await sleep(50);
    check("THE PHONE writes 2 to the minichord", mcd.dev[244]===2 && mcd.writes.some(([x,v])=>x===244 && v===2));
    check("and says it's restarting", /MINICHORD RESTARTING/.test(d.querySelector(".tdkey")?.textContent||""));
    await mcd.restart(); await sleep(150);
    check("while it restarts the cabinet waits: no deck put back", !!d.querySelector(".fscab.bare") && !d.getElementById("tdeck") && !w.eval("tdOn()"));
    await sleep(900);
    check("back, it's set up for the game afresh (the restart forgot the chromatic harp)", set98===1 && mcd.dev[98]===1 && mcd.writes.filter(([x])=>x===98).length>=2, `98 written ${mcd.writes.filter(([x])=>x===98).length} times`);
    check("not asked again", !card(d));
    d.querySelector(".fscab>.tdmenu").click(); await sleep(30);
    const row=[...d.querySelectorAll("#tdMenuDlg .tdmrow")].find(r=>r.firstChild.textContent==="SOUND OUT");
    check("the menu has SOUND OUT, showing the phone", !!row && row.querySelector("b").textContent==="PHONE");
    row.click(); await sleep(30);
    check("which opens the choice, with the minichord on the phone too", !!d.querySelector("#tdMenuDlg.tdsoundout") && /THE MINICHORD ON THE PHONE TOO/.test(d.querySelector("#tdMenuDlg").textContent));
    opt(d, "THE MINICHORD").click(); await sleep(50);
    check("THE MINICHORD writes 1, a restart again (the speaker's back)", mcd.dev[244]===1 && w.eval("!!td.restartUntil")); }

  { const {w, d}=b; android(b); const mcd=minichord(b); mcd.plug();
    w.eval("touchMinichord(true)"); await sleep(400);
    await w.eval("tdConnect()"); await sleep(800);
    opt(d, "LEAVE IT").click(); await sleep(50);
    check("LEAVE IT writes nothing", !mcd.writes.some(([x])=>x===244) && mcd.dev[244]===0);
    check("and is remembered", w.eval("saved.usbAudioLeft")===true); }

  { const {w, d}=c; android(c); const mcd=minichord(c, 23); mcd.plug();
    w.eval("touchMinichord(true)"); await sleep(400);
    await w.eval("tdConnect()"); await sleep(800);
    check("firmware 23 has no such setting: not asked", !card(d) && w.eval("tdUsbAudio()")===null);
    android(c, false); w.eval("td.usbAsked=false; mc.params[7]=24; mc.dispatchEvent(new Event('device'))"); await sleep(50);
    check("nor a touch screen that isn't Android", !card(d)); }
  a.done(); b.done(); c.done();
})();
