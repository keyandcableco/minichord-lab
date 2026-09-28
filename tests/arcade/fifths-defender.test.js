// Fifths Defender: C in the middle of the knob, fifths either way, F-sharp at both ends; held at an
// end the aim keeps turning; the aimed key's chord fires, and another key's doesn't.
const t=require("./harness").load("fifths-defender");
(async()=>{
  const {sleep, knob, chord, check}=t;
  await sleep(150); t.connect(); await sleep(100);
  const a=await t.start(1);
  const K=["C","G","D","A","E","B","F♯","D♭","A♭","E♭","B♭","F"], seen=[];
  for(const v of [0,11,21,32,42,53,64,74,85,95,106,116,127]){ knob(v); await sleep(10); seen.push(K[a.aim]); }
  check("the knob runs F♯ … C … F♯", seen.join(" ")==="F♯ D♭ A♭ E♭ B♭ F C G D A E B F♯", seen.join(" "));
  knob(127); await sleep(30); const start=a.aim; await sleep(1400);
  check("held at the end, the aim keeps turning", a.aim!==start, `${K[start]} → ${K[a.aim]}`);
  knob(64); await sleep(30);
  const PCS={C:0,G:7,D:2,A:9,E:4,B:11,"F♯":6,"D♭":1,"A♭":8,"E♭":3,"B♭":10,F:5};
  a.foes.push({spoke:a.aim, r:a.R*.7, wob:0});
  const k0=a.kills; chord(PCS[K[a.aim]]); await sleep(400);
  check("the aimed key's chord shoots down its spoke", a.kills>k0);
  a.foes.push({spoke:a.aim, r:a.R*.7, wob:0});
  const k1=a.kills; chord((PCS[K[a.aim]]+2)%12, "m"); await sleep(300);
  check("another chord doesn't fire", a.kills===k1, t.heard());
  t.done();
})();
