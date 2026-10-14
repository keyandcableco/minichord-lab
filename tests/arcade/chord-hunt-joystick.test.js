// Chord Hunt on the joystick plate: A hears home again, B the duck (hdReplay); each counts as help, as
// the harp's replays do. Without the plate A and B do nothing.
const t=require("./harness").load("chord-hunt");
const P=require("./dpad-plate").plateOf(t);
(async()=>{
  const {w, sb, sleep, check}=t;
  const E=s=>w.eval(s);
  await sleep(150); P.connect(); await sleep(100);
  const a=await t.start(0); await sleep(100);
  const said=[]; const rep=w.hdReplay; w.hdReplay=what=>{ said.push(what); rep(what); };
  a.phase="play"; if(!a.duck) a.duck={done:false, home:{notes:[60,64,67]}, voiced:[{notes:[65,69,72]}]};
  P.press("a"); P.press("b");
  check("A hears home again, B the duck", said.join()==="home,duck", said.join());
  check("and the duck counts as helped", a.duck.aided===true);
  check("the rules say A and B", /A FOR HOME AND B FOR THE DUCK/.test(E("HDMENU_G.rules()")));
  P.connect({on:false}); await sleep(100);
  said.length=0; P.press("a"); P.press("b");
  check("without the plate A and B do nothing", said.length===0);
  check("and the rules speak of the harp", /PLUCK THE HARP/.test(E("HDMENU_G.rules()")));
  w.hdReplay=rep;
  sb.restoreAll();
  t.done();
})();
