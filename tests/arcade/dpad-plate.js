// The joystick plate for the d-pad and harp-note games' tests (Chord Snake, Chord Chomp, Chord Stack,
// Chord Sweeper, Chord Burger, Dominant Kong, Sus Bros., Harp Command, Sight Line, Chord Hunt, Key
// Fleet, Between the Frets): a firmware-90 minichord with harp plate 4 (or without it, to see nothing
// changes), its stick and buttons sent as the instrument sends them (CC 112-116 through mc.handle), and
// the game's frames stopped where a test wants to drive its tick itself. Not a test itself: each
// <game>-joystick test loads it.
//
// The shared joystick layer (controller.js: jsOn, jsXY, jsWay4, jsWays8, the stick in kmHeld, and the
// edge path that sends a push or A or B to answerNote as the layout's string; the core's mc.stick,
// mc.buttons and their "stick" and "button" events) is the arcade's own. Should a test run before it's
// there, a stand-in to the same contract is put in, and the test says so.
function plateOf(t){
  const {w, mc}=t;
  let standIn=false;
  function connect({on=true, firmware=90, extra={}}={}){
    t.connect({firmware, extra:{238:1, 243:on ? 4 : 0, ...extra}});
    if(w.eval("typeof jsWay4")!=="function"){
      standIn=true;
      w.eval(`if(!window._jsStandIn){ window._jsStandIn=true;
        window.jsOn=()=>!mc.virtual && (mc.params[7]??0)>=90 && mc.params[243]===4;
        window.jsXY=()=>{ const s=mc.stick||{x:0,y:0}, dz=v=>Math.abs(v)<.15 ? 0 : Math.sign(v)*(Math.abs(v)-.15)/.85; return {x:dz(s.x), y:dz(s.y)}; };
        let w4=null, w8={v:null,h:null};
        window.jsWay4=()=>{ const {x,y}=jsXY(), ax=Math.abs(x), ay=Math.abs(y), dom=ax>ay ? (x>0?"right":"left") : ay>0 ? (y>0?"up":"down") : null, m=Math.max(ax,ay);
          if(w4){ const v=({up:y,down:-y,right:x,left:-x})[w4]; if(v>=.3 && (dom===w4 || m<.5)) return w4; }
          w4 = m>=.5 ? dom : null; return w4; };
        window.jsWays8=()=>{ const {x,y}=jsXY();
          w8.v = w8.v && (w8.v==="up" ? y : -y)>=.25 ? w8.v : y>=.4 ? "up" : y<=-.4 ? "down" : null;
          w8.h = w8.h && (w8.h==="right" ? x : -x)>=.25 ? w8.h : x>=.4 ? "right" : x<=-.4 ? "left" : null;
          return [w8.v, w8.h].filter(Boolean); };
        const held=kmHeld;
        window.kmHeld=()=>{ const h=held(); if(!jsOn()) return h; const b=mc.buttons||{}; return [...new Set([...jsWays8(), ...(b.a?["A"]:[]), ...(b.b?["B"]:[]), ...h])]; };
        const DPAD=new Set(["snake","stack","sweeper","chomp","burger","kong","bros"]);
        const edge=z=>{ if(!jsOn() || !blast || !DPAD.has(blast.kind) || blast.jsOwn===true) return; const i=kmLayout().byString.indexOf(z); if(i>=0) answerNote(i); };
        let was=null;
        mc.addEventListener("stick", ()=>{ const now=jsWay4(); if(now!==was){ was=now; if(now) edge(now); } });
        mc.addEventListener("button", e=>{ if(e.detail.down && (e.detail.name==="a" || e.detail.name==="b")) edge(e.detail.name.toUpperCase()); });
        if(!mc.buttons || !mc.stick || !mc._joy){ const h=mc.handle.bind(mc);
          mc.handle=(d, stamp)=>{ const c=d[1], v=d[2];
            if((d[0]&0xF0)===0xB0 && c>=112 && c<=116){ const t=stamp??performance.now();
              if(c<114){ const s=mc.stick||(mc.stick={x:0,y:0}), f=v<64 ? (v-64)/64 : (v-64)/63; s[c===112?"x":"y"]=f; mc.dispatchEvent(new CustomEvent("stick",{detail:{x:s.x, y:s.y, t}})); }
              else { const b=mc.buttons||(mc.buttons={a:false,b:false,click:false}), name=["a","b","click"][c-114]; b[name]=v>=64; mc.dispatchEvent(new CustomEvent("button",{detail:{name, down:v>=64, t}})); }
              return; }
            return h(d, stamp); }; } }`);
    }
  }
  // a CC value for a place on an axis, -1 … 1 (64 the rest; up is the high end)
  const cc=f=> f<0 ? Math.max(0, Math.round(64+f*64)) : Math.min(127, Math.round(64+f*63));
  const stick=(x, y=0)=>{ mc.handle([0xB0,112,cc(x)]); mc.handle([0xB0,113,cc(y)]); };
  const WAY={up:[0,1], down:[0,-1], left:[-1,0], right:[1,0], rest:[0,0]};
  const push=way=>stick(...WAY[way]);
  const button=(name, down)=>mc.handle([0xB0, {a:114, b:115, click:116}[name], down ? 127 : 0]);
  const press=name=>{ button(name, true); button(name, false); };
  // the game's own frames stopped: the test calls its tick
  function freeze(){ w.cancelAnimationFrame(w.eval("blast.raf")); w.requestAnimationFrame=()=>0; }
  // call tick(now) every step ms for ms, from `from` (or now) on; returns the end
  function drive(tick, ms, step=16, from){
    let now=from ?? w.performance.now();
    for(let k=0;k<Math.round(ms/step);k++){ now+=step; tick(now); }
    return now;
  }
  const note=(pc, on=true)=>mc._harp([on ? 0x90 : 0x80, 60+pc, on ? 100 : 0]);   // a place on the strip
  return {connect, stick, push, button, press, freeze, drive, note, cc, standIn:()=>standIn};
}
module.exports={plateOf};
