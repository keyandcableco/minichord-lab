// Key Fleet on the joystick plate: A is CALL IT; B flips the modifier's way on the wide levels (with the
// double tap on or not); the strip then only ever calls. Without the plate, A and B do nothing.
const t=require("./harness").load("key-fleet");
const P=require("./dpad-plate").plateOf(t);
(async()=>{
  const {w, sb, sleep, check, mc}=t;
  const E=s=>w.eval(s);
  await sleep(150); P.connect({extra:{31:0}}); await sleep(100);
  if(P.standIn()) console.log("  (the shared joystick layer isn't there yet: a stand-in to its contract)");
  const a=await t.start(0); await sleep(100);
  P.press("a"); await sleep(10);
  check("A opens a call", !!a.calling);
  P.press("a"); await sleep(10);
  check("A again ends it", !a.calling);
  const wide=E("KF_LEVELS.findIndex(L=>L.span)");
  check("a wide level", wide>=0);
  a.level=wide; E("kfWave()"); await sleep(10);
  const m0=mc.params[31]??0; P.press("b"); await sleep(10);
  check("B flips the modifier's way", (mc.params[31]??0)!==m0, `${m0} → ${mc.params[31]}`);
  E("settings.modTap='off'");
  t.note(3); await sleep(10);
  check("with the double tap off, the strip still calls (B is the flip)", !!a.calling);
  E("kfCallEnd()"); E("settings.modTap='on'");
  check("the side panel says B flips it", /PRESS B TO FLIP IT/.test(a.sideEl.textContent));
  check("the rules say A", /PRESS A/.test(E("KFMENU_G.rules()")));
  P.connect({on:false, extra:{31:0}}); await sleep(100);
  E("kfWave()"); P.press("a"); P.press("b"); await sleep(10);
  check("without the plate A and B do nothing", !a.calling && (mc.params[31]??0)===0);
  sb.restoreAll();
  t.done();
})();
