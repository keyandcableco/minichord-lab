// On a phone the arcade plays in the phone's cabinet: the game's screen and the minichord drawn round
// it, filling the window by itself (full screen needs a tap), plain, with no controller strip beside the
// field, since the deck is the controller. The bezel's buttons are the deck's menu, ☰; its THE WHOLE
// PAGE takes the cabinet down for the page, and it stays down. Held sideways, the harp stands beside
// the game, high at the top. And a narrow field (a phone held upright) lays Chord Sweeper, Key Fleet
// and Chord Stack out to fit it.
const harness=require("./harness");
const [sw, kf, st]=["chord-sweeper","key-fleet","chord-stack"].map(s=>harness.load(s));
const t=st, {check, sleep}=t;
const finger=(g, el, type, id, x, y)=>{ const e=new g.w.MouseEvent(type, {clientX:x, clientY:y, bubbles:true, cancelable:true});
  Object.defineProperty(e, "pointerId", {value:id}); Object.defineProperty(e, "pointerType", {value:"touch"}); el.dispatchEvent(e); };
const size=(el, w, h)=>{ el.getBoundingClientRect=()=>({left:0, top:0, right:w, bottom:h, width:w, height:h}); };
// a phone: a touch screen, held upright unless said otherwise
const phone=(g, sideways=false)=>{ g.w.matchMedia=q=>({matches: /coarse/.test(q) || (sideways && /landscape/.test(q)), addEventListener(){}}); };
// a narrow field, as a phone held upright gives
const narrow=(g, w=375, h=500)=>{ const f=g.w.eval("blast.field"); Object.defineProperty(f,"clientWidth",{value:w, configurable:true}); Object.defineProperty(f,"clientHeight",{value:h, configurable:true}); };
(async()=>{
  await sleep(250);
  // ---------- the phone's cabinet ----------
  { const {w, d}=sw; phone(sw);
    w.eval("touchMinichord(true)"); await sleep(600);
    const cab=d.querySelector(".fscab");
    check("on a phone the game goes into the phone's cabinet by itself", !!cab && cab.classList.contains("phone"), cab ? cab.className : "none");
    check("filling the window, without asking for full screen (a browser grants that only to a tap)", cab && cab.classList.contains("pseudo"));
    check("plain, to be light on the phone", cab && cab.classList.contains("plain"));
    check("with the game's field in it, and the deck", cab && !!cab.querySelector(".fsscreen>.field") && !!cab.querySelector("#tdeck"));
    check("and no controller strip beside the field: the deck is the controller", w.eval("kmStripShown()")===false);
    // the bezel's buttons are the deck's menu, ☰, not a bar over the game's screen
    const menu=cab && cab.querySelector("#tdeck .tdmenu");
    check("the deck has a menu button, ☰", !!menu);
    menu.click(); await sleep(50);
    const dlg=d.getElementById("tdMenuDlg"), rows=dlg ? [...dlg.querySelectorAll(".tdmrow")].map(r=>r.firstChild.textContent) : [];
    check("which opens the menu: sound, reset, settings, more games and the page", !!dlg && dlg.hasAttribute("open") && ["SOUND","RESET","SETTINGS","MORE GAMES","THE WHOLE PAGE"].every(r=>rows.includes(r)), rows.join());
    check("and no full screen where the browser can't do it (an iPhone)", !rows.includes("FULL SCREEN"));
    const was=w.eval("settings.sounds"), row=n=>[...dlg.querySelectorAll(".tdmrow")].find(r=>r.firstChild.textContent===n);
    row("SOUND").click(); await sleep(20);
    check("SOUND switches the sound, and says so", w.eval("settings.sounds")===!was && row("SOUND").querySelector("b").textContent===(was?"OFF":"ON"));
    row("SOUND").click();
    row("THE WHOLE PAGE").click(); await sleep(600);
    check("THE WHOLE PAGE takes it down: the field back on the page", !d.querySelector(".fscab") && !!d.querySelector("main .field.arcade"));
    check("and it stays down", !d.querySelector(".fscab"));
    check("the deck stays with the page", !!d.getElementById("tdeck") && d.getElementById("tdeck").parentNode===d.body);
    w.eval("toggleFull()"); await sleep(200);
    check("asked for again, the cabinet is the phone's", !!d.querySelector(".fscab.phone"));
    w.eval("touchMinichord(false)"); await sleep(200);
    check("put away, the minichord takes its cabinet with it", !d.querySelector(".fscab") && !d.getElementById("tdeck")); }

  // ---------- held sideways: the harp stands up ----------
  { const {w, d}=kf; phone(kf, true);
    w.eval("touchMinichord(true)"); await sleep(300);
    check("held sideways, the deck stands either side of the game (it makes no room below)", w.eval("tdSide()")===true && w.eval("getComputedStyle(document.documentElement).getPropertyValue('--td-h')").trim()==="0px");
    const h=d.querySelector(".tdharp"); size(h, 40, 480);
    w.eval("window.__harp=[]; mc.addEventListener('harp', e=>window.__harp.push(e.detail.note))");
    finger(kf, h, "pointerdown", 1, 20, 5); finger(kf, h, "pointerup", 1, 20, 5);
    finger(kf, h, "pointerdown", 2, 20, 475); finger(kf, h, "pointerup", 2, 20, 475); await sleep(20);
    check("the standing harp has its high string at the top and its low at the bottom", w.eval("window.__harp.join()")==="71,60", w.eval("window.__harp.join()"));
    w.eval("touchMinichord(false)"); }

  // ---------- narrow fields ----------
  { const {w}=sw; await sw.start(0); await sleep(200); narrow(sw); w.eval("swLayout()");
    const b=w.eval("({x:blast.gx, w:SW_W*blast.cs, y:blast.gy, h:SW_H*blast.cs, narrow:blast.sideEl.classList.contains('narrow')})");
    check("Chord Sweeper on a narrow field: what's to find across the top", b.narrow);
    check("and the minefield inside the field, as wide as it can be", b.x>=0 && b.x+b.w<=375 && b.w>300, JSON.stringify(b)); }
  { const {w}=kf; await kf.start(0); await sleep(200); narrow(kf); w.eval("kfLayout()");
    const b=w.eval("({x:blast.sx, w:blast.cw*KF_COLS.length, narrow:blast.sideEl.classList.contains('narrow'), side:parseFloat(blast.sideEl.style.top), bottom:blast.sy+3*blast.rh})");
    check("Key Fleet on a narrow field: the chart across the width", b.narrow && b.x>=0 && b.x+b.w<=375 && b.w>250, JSON.stringify(b));
    check("and what's afloat under it", b.side>b.bottom); }
  { const {w}=st; await st.start(0); await sleep(200); narrow(st); w.eval("stLayout()");
    const b=w.eval("({x:blast.bx, w:ST_W*blast.cell, next:parseFloat(blast.nextEl.style.left)})");
    check("Chord Stack on a narrow field: the well inside it, the next piece beside it", b.x>=0 && b.x+b.w<b.next && b.next<375-40, JSON.stringify(b)); }
  t.done();
})();
