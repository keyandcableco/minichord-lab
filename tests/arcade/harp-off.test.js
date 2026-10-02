// The core reading the harp let go: a string's note-off (or note-on at no velocity) is a "harpoff",
// from the harp's own port and from the harp's channel in single port mode, and it never touches the
// chord, which the harp's channel numbers would otherwise reach. Fux's suspensions hold a string.
const t=require("./harness").load("command");
(async()=>{
  const {sleep, check, mc}=t;
  await sleep(150); t.connect(); await sleep(100);
  const on=[], off=[];
  mc.addEventListener("harp", e=>on.push(e.detail.note));
  mc.addEventListener("harpoff", e=>off.push(e.detail.note));
  // the harp's own port
  mc._harp([0x90, 62, 100]); mc._harp([0x80, 62, 20]); mc._harp([0x90, 64, 100]); mc._harp([0x90, 64, 0]);
  check("the harp port: each pluck a harp, each release a harpoff", on.join()==="62,64" && off.join()==="62,64", `${on} / ${off}`);
  // single port mode, the harp on channel 2
  on.length=off.length=0; mc.params[108]=1; mc.params[107]=2;
  mc.handle([0x91, 67, 100]); await sleep(10); mc.handle([0x81, 67, 20]); await sleep(10);
  check("single port: the harp's channel lets go too", on.join()==="67" && off.join()==="67", `${on} / ${off}`);
  const held=mc.notes.size;
  mc.handle([0x90, 48, 100]); await sleep(10); mc.handle([0x80, 48, 0]); await sleep(10);
  check("and a chord note's release is still the chord's, not the harp's", off.join()==="67" && held===0);
  t.done();
})();
