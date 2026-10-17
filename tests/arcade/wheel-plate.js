// The arcade wheel for the games' tests: a firmware-99 minichord with harp plate 9 (or without it,
// to see nothing changes), its ring sent as the instrument sends it — CC 24 as a finger lands and
// leaves and CC 23 the bearing, on the harp port (mc._harp), among the strings' own notes — and the
// game's frames stopped so a test drives its tick with timestamps of its own. Not a test itself:
// each wheel test loads it.
//
// The shared wheel layer (controller.js: whOn, whAngle, whTurn, whWay4, whWays8; the core's mc.wheel
// and its "wheel" events) is the arcade's own, and the tests play it: with it missing, connect fails
// a check rather than play something in its place.
function wheelOf(t){
  const {w, mc}=t;
  let looked=false;
  function connect({on=true, firmware=99, extra={}}={}){
    t.connect({firmware, extra:{243:on ? 9 : 0, ...extra}});
    if(!looked && (looked=true)) t.check("the shared wheel layer is loaded", ["whOn","whAngle","whTurn","whWay4","whWays8"].every(f=>w.eval(`typeof ${f}`)==="function"));
  }
  // the CC value for a bearing (degrees clockwise from the top): 128 values round the circle
  const value=deg=>((Math.round(deg*128/360)%128)+128)%128;
  const land=deg=>{ mc._harp([0xB0,24,127]); mc._harp([0xB0,23,value(deg)]); };
  const move=deg=>mc._harp([0xB0,23,value(deg)]);
  const lift=()=>mc._harp([0xB0,24,0]);
  // the game's own frames stopped: the test calls its tick
  function freeze(){ w.cancelAnimationFrame(w.eval("blast.raf")); w.requestAnimationFrame=()=>0; }
  // call tick(now) every step ms for ms, from the game's last frame (blast.last) on; returns the end
  function drive(tick, ms, step=16, from){
    let now=from ?? w.eval("blast.last") ?? w.performance.now();
    for(let k=0;k<Math.round(ms/step);k++){ now+=step; tick(now); }
    return now;
  }
  return {connect, value, land, move, lift, freeze, drive};
}
module.exports={wheelOf};
