// The joystick plate for the analog games' tests (Chord Invaders, Chord Breakout, Fifths Defender,
// Chord Asteroids, Chopper Rescue, Key Racer): a firmware-90 minichord with harp plate 4 (or without
// it, to see nothing changes), its stick and buttons sent as the instrument sends them (CC 112-116
// through mc.handle), and the game's frames stopped so a test drives its tick with timestamps of its
// own. Not a test itself: each <game>-joystick test loads it.
//
// The shared joystick layer (controller.js: jsOn, jsXY, jsAngle; the core's mc.stick and mc.buttons and
// their "stick" and "button" events) is the arcade's own. Should a test run before it's there, a stand-in
// to the same contract is put in, and the test says so.
function plateOf(t){
  const {w, mc}=t;
  let standIn=false;
  function connect({on=true, firmware=90, extra={}}={}){
    t.connect({firmware, extra:{238:1, 243:on ? 4 : 0, ...extra}});
    if(w.eval("typeof jsOn")!=="function"){
      standIn=true;
      w.eval(`window.jsOn=()=>!mc.virtual && (mc.params[7]??0)>=90 && mc.params[243]===4;
        window.jsXY=()=>{ const s=mc.stick||{x:0,y:0}, dz=v=>Math.abs(v)<.15 ? 0 : Math.sign(v)*(Math.abs(v)-.15)/.85; return {x:dz(s.x), y:dz(s.y)}; };
        window.jsAngle=()=>{ const s=mc.stick||{x:0,y:0}; return {a:mod(Math.atan2(s.x, s.y), 2*Math.PI), mag:Math.min(1, Math.hypot(s.x, s.y))}; };
        if(!mc._jsStandIn){ mc._jsStandIn=true; const h=mc.handle.bind(mc);
          mc.handle=(d, stamp)=>{ const c=d[1], v=d[2];
            if((d[0]&0xF0)===0xB0 && c>=112 && c<=116){ const t=stamp??performance.now();
              if(c<114){ const s=mc.stick||(mc.stick={x:0,y:0}), f=v<64 ? (v-64)/64 : (v-64)/63; s[c===112?"x":"y"]=f; mc.dispatchEvent(new CustomEvent("stick",{detail:{x:s.x, y:s.y, t}})); }
              else { const b=mc.buttons||(mc.buttons={a:false,b:false,click:false}), name=["a","b","click"][c-114]; b[name]=v>=64; mc.dispatchEvent(new CustomEvent("button",{detail:{name, down:v>=64, t}})); }
              return; }
            return h(d, stamp); }; }`);
    }
  }
  // a CC value for a place on an axis, -1 … 1 (64 the rest; up is the high end)
  const cc=f=> f<0 ? Math.max(0, Math.round(64+f*64)) : Math.min(127, Math.round(64+f*63));
  const stick=(x, y=0)=>{ mc.handle([0xB0,112,cc(x)]); mc.handle([0xB0,113,cc(y)]); };
  // the stick pushed toward an angle (radians clockwise from up), this far
  const toward=(a, mag=1)=>stick(Math.sin(a)*mag, Math.cos(a)*mag);
  const button=(name, down)=>mc.handle([0xB0, {a:114, b:115, click:116}[name], down ? 127 : 0]);
  // the game's own frames stopped: the test calls its tick
  function freeze(){ w.cancelAnimationFrame(w.eval("blast.raf")); w.requestAnimationFrame=()=>0; }
  // call tick(now) every step ms for ms, from the game's last frame (blast.last) on; returns the end
  function drive(tick, ms, step=16, from){
    let now=from ?? w.eval("blast.last") ?? w.performance.now();
    for(let k=0;k<Math.round(ms/step);k++){ now+=step; tick(now); }
    return now;
  }
  return {connect, stick, toward, button, freeze, drive, cc, standIn:()=>standIn};
}
module.exports={plateOf};
