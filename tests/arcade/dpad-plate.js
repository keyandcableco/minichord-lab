// The joystick plate for the d-pad and harp-note games' tests (Chord Snake, Chord Chomp, Chord Stack,
// Chord Sweeper, Chord Burger, Dominant Kong, Sus Bros., Harp Command, Sight Line, Chord Hunt, Key
// Fleet, Between the Frets): a firmware-90 minichord with harp plate 4 (or without it, to see nothing
// changes), its stick and buttons sent as the instrument sends them (CC 112-116 through mc.handle), and
// the game's frames stopped where a test wants to drive its tick itself. Not a test itself: each
// <game>-joystick test loads it.
//
// The shared joystick layer (controller.js: jsOn, jsXY, jsWay4, jsWays8, the stick in kmHeld, and the
// edge path that sends a push or A or B to answerNote as the layout's string; the core's mc.stick,
// mc.buttons and their "stick" and "button" events) is the arcade's own, and the tests play it: with it
// missing, connect fails a check rather than play something in its place.
function plateOf(t){
  const {w, mc}=t;
  let looked=false;
  function connect({on=true, firmware=90, extra={}}={}){
    t.connect({firmware, extra:{238:1, 243:on ? 4 : 0, ...extra}});
    if(!looked && (looked=true)) t.check("the shared joystick layer is loaded", ["jsOn","jsXY","jsWay4","jsWays8","kmHeld"].every(f=>w.eval(`typeof ${f}`)==="function"));
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
  return {connect, stick, push, button, press, freeze, drive, note, cc};
}
module.exports={plateOf};
