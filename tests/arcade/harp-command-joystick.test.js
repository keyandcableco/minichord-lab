// Harp Command on the joystick plate: the strip is the harp, place k string k, so it plays as ever;
// the rules and the demo's first words teach that C at the bottom is the leftmost cannon. Without the
// plate they speak of the harp's strings as before.
const t=require("./harness").load("harp-command");
const P=require("./dpad-plate").plateOf(t);
(async()=>{
  const {w, sb, sleep, check}=t;
  const E=s=>w.eval(s);
  await sleep(150); P.connect({firmware:90}); await sleep(100);
  if(P.standIn()) console.log("  (the shared joystick layer isn't there yet: a stand-in to its contract)");
  check("the rules teach the strip: C at the bottom is the leftmost cannon", /C AT THE BOTTOM IS THE LEFTMOST CANNON/.test(E("COMMANDMENU_G.rules()")));
  check("and so does the demo", /C AT THE BOTTOM/.test(E("HC_DEMO[0].text")));
  const a=await t.start(0); await sleep(300);
  // the strip's place 4 reaches the game as string 4
  const got=[]; const cn=w.commandNote; w.commandNote=pc=>{ got.push(pc); };
  P.note(4); P.note(4,false); await sleep(20);
  w.commandNote=cn;
  check("a strip place reaches the game as its string", got.join()==="4", got.join());
  P.connect({on:false, firmware:90}); await sleep(100);
  check("without the plate the rules speak of the strings", !/LEFTMOST CANNON/.test(E("COMMANDMENU_G.rules()")) && /LOWEST ON THE LEFT/.test(E("HC_DEMO[0].text")));
  sb.restoreAll();
  t.done();
})();
