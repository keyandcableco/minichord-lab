// Leaving an arcade game for another mode of the Practice Room. What the game set (Time Pilot's harp
// drums on page 1; the harp in order and the arcade's preset on page 0) is given back, and stays back:
// a dump the minichord sends unasked afterwards (the key change combo, the double tap), and the page 1
// read after it, don't put the game's values on again, unborrowed, where nothing would give them back.
// And what the new mode set, borrowed or already the player's, is still set again over a preset loaded
// on the instrument.
const t=require("./harness").load("");
(async()=>{
  const {w, d, mc, sleep, writes, check}=t;
  // a page-0 dump as the minichord sends one unasked, with what changed on it: core/minichord.js reads
  // page 1 again after it
  const dump=(mc, changes)=>{ const p={...mc.params, ...changes}, m=[0xF0]; for(let a=0;a<256;a++){ const v=p[a]|0; m.push(v&127, v>>7); } m.push(0xF7); mc._dump(m); };
  const mode=m=>d.querySelector(`.modes button[data-mode="${m}"]`).click();
  // the player's own: the harp shuffled, sounding on the lift, a palm mute; glide, retrigger and voice
  // leading on; harp drums off, the rhythm mode's drums and count-in on, humanize, another kit
  const MINE={40:1, 216:1, 215:0, 213:1, 199:1, 21:1, 111:1, 343:0, 340:0, 339:20, 334:1, 341:1, 337:2, 338:70};
  // the push-and-pop probe takes the next dump for its answer: settled first (this minichord has none)
  const settled=async mc=>{ for(let i=0;i<40 && mc.pushPop===undefined;i++) await sleep(50); };
  await sleep(150); t.connect({firmware:91, extra:MINE}); await settled(mc);

  // ---------- Time Pilot, then Spell it ----------
  w.eval("setMode('pilot')"); await sleep(150);                     // as the arcade switches games on the room's page
  const had=JSON.parse(w.eval("JSON.stringify(borrowed)"));
  check("Time Pilot sets harp drums on, once page 1 is in", mc.params[343]===1 && mc.params[340]===2 && had[343]===0 && had[340]===0, JSON.stringify(had));
  check("and the harp in order, and the arcade's preset", mc.params[40]===0 && mc.params[216]===0 && mc.params[215]===1 && mc.params[213]===0 && mc.params[199]===0);
  mode("spell"); await sleep(300);
  const back=Object.keys(had).map(Number).filter(a=>!w.eval(`${a} in borrowed`));
  const off=()=>back.filter(a=>mc.params[a]!==had[a]).map(a=>`${a}=${mc.params[a]}`).join(" ");
  check("left for Spell it: what it set given back", back.includes(343) && back.includes(40) && back.includes(199) && !off(), `given back ${back}; not: ${off()}`);

  // ---------- the key change combo: page 0 unasked with only the key changed, then page 1 read again ----------
  writes.length=0; dump(mc, {35:1}); await sleep(60);
  check("the key change combo comes unasked, and page 1 is read again", mc.unasked && mc.comboPick && mc.page1);
  const again=()=>JSON.stringify(writes.filter(([a])=>back.includes(a)));
  check("after it, nothing of Time Pilot's set again: harp drums stay off", mc.params[343]===0 && mc.params[340]===0 && again()==="[]" && !off(), `${again()} ${off()}`);

  // ---------- the double tap: the modifier flipped on the instrument ----------
  writes.length=0; dump(mc, {31:mc.params[31] ? 0 : 1}); await sleep(60);
  check("the double tap comes unasked, not as the combo or a preset", mc.unasked && !mc.comboPick && !mc.presetLoaded);
  check("after it, nothing of Time Pilot's set again: the harp as the player has it", mc.params[40]===1 && mc.params[216]===1 && mc.params[213]===1 && mc.params[199]===1 && again()==="[]" && !off(), `${again()} ${off()}`);
  check("nor borrowed, so nothing of it is left to give back", !back.some(a=>w.eval(`${a} in borrowed`)), w.eval("JSON.stringify(borrowed)"));
  w.eval("restoreAll()"); await sleep(250);
  check("given back: still the player's", mc.params[343]===0 && mc.params[40]===1 && !off(), off());

  // ---------- one arcade game for another: what the new one wants is set again over a preset ----------
  // Chord Snake wants the harp in order and glide off as Time Pilot did; with the player's own glide and
  // shuffle already off, it never borrows them, and a preset loaded mid-game is still put right
  { const T=require("./harness").load(""), {w, d, mc, sleep}=T;   // checked with the first page's check, which counts them
    await sleep(150); T.connect({firmware:91, extra:{343:0, 340:0}}); await settled(mc);
    w.eval("setMode('pilot')"); await sleep(150);
    d.querySelector('.modes button[data-mode="snake"]').click(); await sleep(300);
    check("Chord Snake after Time Pilot: harp drums given back, glide and the shuffle never borrowed", mc.params[343]===0 && !w.eval("199 in borrowed || 40 in borrowed"), w.eval("JSON.stringify(borrowed)"));
    dump(mc, {199:1, 40:1, 21:1, 111:1, 184:3}); await sleep(60);
    check("a preset loaded mid-game: glide and the shuffle off again", mc.presetLoaded && mc.params[199]===0 && mc.params[40]===0 && mc.params[21]===0 && mc.params[111]===0, ["199","40","21","111"].map(a=>`${a}=${mc.params[a]}`).join(" "));
    check("and the preset's own values are what's given back", w.eval("borrowed[199]===1 && borrowed[40]===1"), w.eval("JSON.stringify(borrowed)"));
    check("harp drums, Time Pilot's, not set again by it", mc.params[343]===0);
  }
  t.done();
})();
