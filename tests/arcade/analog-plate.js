// The joystick plate for the analog games' tests (Chord Invaders, Chord Breakout, Fifths Defender,
// Chord Asteroids, Chopper Rescue, Key Racer): a firmware-90 minichord with harp plate 4 (or without
// it, to see nothing changes), its stick and buttons sent as the instrument sends them (CC 112-116
// through mc.handle), and the game's frames stopped so a test drives its tick with timestamps of its
// own. Not a test itself: each <game>-joystick test loads it.
//
// The shared joystick layer (controller.js: jsOn, jsXY, jsAngle; the core's mc.stick and mc.buttons and
// their "stick" and "button" events) is the arcade's own, and the tests play it: with it missing, connect
// fails a check rather than play something in its place.
function plateOf(t){
  const {w, mc}=t;
  let looked=false;
  function connect({on=true, firmware=90, extra={}}={}){
    t.connect({firmware, extra:{238:1, 243:on ? 4 : 0, ...extra}});
    if(!looked && (looked=true)) t.check("the shared joystick layer is loaded", ["jsOn","jsXY","jsAngle"].every(f=>w.eval(`typeof ${f}`)==="function"));
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
  return {connect, stick, toward, button, freeze, drive, cc};
}
module.exports={plateOf};
