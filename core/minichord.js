/* ============================================================================
 * minichord.js: the shared core of Minichord Lab
 *
 * Reads the minichord over Web MIDI: MPE zones and per-voice bends (so every
 * chord voice has an exact pitch), the chord port only (the harp port declares
 * its own zone on the same channel numbers), and the parameter dump over sysex
 * (key signature, temperament and its division, MPE and single-port mode).
 *
 * Events (addEventListener):
 *   "voices"  the sounding chord voices changed (coalesced to one per frame)
 *   "chord"   a chord settled: notes stopped arriving and any glide finished;
 *             event.startedAt is when its notes arrived
 *   "device"  the parameter dump arrived or a setting changed
 *   "status"  connection text for the page to show
 *   "harp"    a harp string was plucked: detail {note, ch}, from the harp port
 *             (Port 2), or from the harp channels of the chord port in single port mode
 *   "harpoff" a harp string was let go: detail {note, ch}, from the same places
 *   "drum"    a harp pad struck while harp drums (address 343) is on: detail {note, vel, pad, t,
 *             source}, from the channel-10 note the minichord sends for it (see DRUM_GM); or, with
 *             drumFallback, a joystick plate's strip place or button (source "plate"; button true for A,
 *             B and the click, which also send "button")
 *   "page1"   settings 256 to 511 arrived (firmware 31 on); this.page1 is then true
 *   "stick"   the joystick plate's stick moved (harp plate 4, firmware 90, with "knobs send MIDI"
 *             on): detail {x, y, t}, each -1 to 1, x right and y UP positive (this.stick)
 *   "button"  its A, B or the click (pressing the stick in) went down or up: detail {name: "a",
 *             "b" or "click", down, t} (this.buttons)
 * ========================================================================== */

export const KEY_NAMES = ["C","G","D","A","E","B","F","B♭","E♭","A♭","D♭","G♭",
  "F♯","C♯","G♯","D♯","A♯","E♯","B♯","F♭","C♭"];
// each key's place on the line of fifths (sharps positive, flats negative)
const KEY_FIFTHS = [0,1,2,3,4,5,-1,-2,-3,-4,-5,-6,6,7,8,9,10,11,12,-8,-7];
export const TEMPERAMENTS = ["Equal","Meantone","Just","Pythagorean","Werckmeister III","Kirnberger III",
  "Vallotti","Young","Kellner","1/6 Meantone","19-EDO","24-EDO","31-EDO"];
// Firmware 18 put 24-EDO in between 19 and 31, moving 31-EDO from 11 to 12. The Lab numbers
// temperaments firmware 18's way; these translate for the minichord at hand.
/** a stored temperament number, read as a position in the Lab's list */
// The locks (the fork's firmware 76 on): settings the minichord keeps as its own, whatever preset
// is loaded (the harp plate, the touch thresholds and the master tuning to begin with, and any the
// player locks). Control command 9 reports them (7D 6C, a count, then two bytes an address); writing
// lock (385) with an address locks it again at its present value. A page borrows a locked setting
// like any other and gives it back the same way; the lock takes the handed-back value for its own.
export const LOCK_ADDRESS=385, LOCKS_VERSION=76;
// Harp drums (address 343, the fork's firmware 60 on): the twelve harp strings are drum pads, and a
// pad struck goes out as a note on channel 10 (drum MIDI out, 340, says which port), the General
// MIDI drum for the pad, low string first: kick, snare, rim, clap, closed and open hi-hat, crash, low
// and high tom, low and high conga, cowbell; and the shaker, the drum machine's thirteenth voice,
// which no pad plays. While 343 is on those notes are drums, not chords or harp strings: they arrive
// as "drum" events, timed by the MIDI message itself, and nothing else hears them.
export const DRUM_GM=[36,38,37,39,42,46,49,45,50,64,63,56,70];
// The joystick plate (harp plate 243 = 4, firmware 90 on): a thumbstick, its click, buttons A and B,
// and a one-octave strip. With "knobs send MIDI" (238) on, the stick sends CC 112 (left 0, rest 64,
// right 127) and CC 113 (down 0 … UP 127, the opposite of a screen's y), and A, B and the click CC 114,
// 115 and 116 (127 down, 0 up), on the chord channel, each only when it changes.
export const JOY_CC=112;
// A drum game on firmware 90 with the joystick plate (no harp drums there yet: firmware 91 has them)
// sets drumFallback: the strip's places and A, B and the click are then the pads themselves, as "drum"
// events from source "plate", the place's pitch class its pad (the arcade's harp is chromatic from C),
// and A, B and the click the kick, the snare and the closed hat. The page sounds them.
const JOY_PADS=[0,1,4];
/** an event's timestamp if it is in performance.now()'s timebase, or now: a browser whose stamps count
 *  from 1970 (old WebKit, some WebViews), or a message with none, is timed as it arrives. A day ahead
 *  is another clock (1970's is decades ahead); nearer than that is left alone, for a test's own clock. */
export const stampOr=s=>{ const now=performance.now(); return s>0 && s<=now+864e5 ? s : now; };
export const temperIndex=(value, firmware)=> value===11 && firmware<18 ? 12 : value;
/** the number to store for a position in the Lab's list, or null if that firmware hasn't it */
export const temperValue=(index, firmware)=> firmware>=18 ? index : index===12 ? 11 : index===11 ? null : index;

const isHarpPort = n => /minichord/i.test(n) && n.includes("2");
const isChordPort = n => /minichord/i.test(n) && (n.includes("1") || n.trim().toLowerCase()==="minichord");
// Which of the minichord's ports an input is: "chord", "harp" or neither. A computer numbers them (Port 1,
// Port 2; MIDI 1, MIDI 2); Android's Chrome names every port after the device alone, "minichord", and
// there they're told apart by order, the chord port first and the harp's second, as the firmware
// declares them.
export function portRole(port, ports){
  if(isHarpPort(port.name)) return "harp";
  if(!isChordPort(port.name)) return null;
  const same=ports.filter(p=>p.name===port.name);
  return same.length>1 && same.indexOf(port)===1 ? "harp" : "chord";
}

export class Minichord extends EventTarget {
  /** ms a note-off waits in case the same note comes straight back (a flickering contact) */
  static OFF_DEBOUNCE=30;

  constructor(){
    super();
    this.midi=null; this.out=null; this.sysex=false; this.sysexGranted=false; this.inputChoice="auto";
    this.chans=Array.from({length:16},(_,i)=>({bend:0, range:i===0?2:48, rpn:[127,127]}));
    this.zone={type:"lower", members:15, known:false};
    this.params={};               // raw values from the dump, by address
    this.locks=null;              // the locked addresses, once the minichord has said (firmware 76 on)
    this.page1=false;             // settings 256 to 511 read from this minichord (firmware 31 on)
    this.notes=new Map();         // "ch:note" -> {ch, note, vel, t}
    this._frame=0; this._settle=0; this._lastChordKey="";
    this.knobs=[null,null,null];   // the three knobs, 0 to 1, once the minichord sends them
    this.stick={x:0, y:0};          // the joystick plate's stick, -1 to 1, x right and y up
    this.buttons={a:false, b:false, click:false};
    this.drumFallback=false;        // the joystick plate's strip and buttons as drum pads (see JOY_PADS)
    // Coming back: once a minichord has been connected on any of the Lab's pages, the next page
    // connects by itself, as long as the browser still holds its MIDI permission. It presses the
    // page's own Connect button, so each page sets up exactly as if you had. Run a moment later,
    // once the page has attached its listeners.
    setTimeout(async()=>{ if(this.midi || !(await midiRemembered())) return;
      const b=typeof document!=="undefined" && document.getElementById("connect");
      if(b && !b.disabled) b.click(); else this.connect(); }, 0);
  }

  // ---------- what the pages read ----------
  get mpe(){ return this.params[110]===1 || this.zone.known; }
  get keyIndex(){ return this.params[35] ?? null; }
  get keyName(){ return this.keyIndex==null ? null : KEY_NAMES[this.keyIndex] ?? null; }
  get keyFifths(){ return this.keyIndex==null ? 0 : (KEY_FIFTHS[this.keyIndex] ?? 0); }
  /** the dump just in was the key change combo reporting a key picked (the advanced firmware sends one per pick) */
  get comboPick(){ return !!this.unasked && [...(this.changed||[])].every(a=>a===35); }
  /** the dump just in was a preset being loaded on the instrument (its preset buttons) */
  get presetLoaded(){ return !!this.unasked && (this.changed||new Set()).size>3; }
  get temperament(){ const v=this.params[237]; return v==null ? null : temperIndex(v, this.params[7]??0); }   // the Lab's numbering
  /** the number to write to address 237 for a temperament in the Lab's list (null: not on this firmware) */
  temperamentValue(index){ return temperValue(index, this.params[7]??0); }
  get division(){ const t=this.temperament; return t===10 ? 19 : t===11 ? 24 : t===12 ? 31 : 12; }
  /** the pitch of A4 in Hz: master tuning (address 109) is stored in tenths of a hertz; 0 means 440 */
  get aHz(){ const v=this.params[109]; return v ? v/10 : 440; }
  get masterCh(){ return this.zone.type==="lower" ? 0 : 15; }

  pitchOf(n){
    const c=this.chans[n.ch]; let p=n.note + c.bend*c.range;
    const m=this.masterCh; if(n.ch!==m) p += this.chans[m].bend*this.chans[m].range;
    return p;
  }
  /** sounding chord voices, lowest first: [{ch, note, pitch, voice}] where voice is 0..3 for MPE members */
  get voices(){
    return [...this.notes.values()].map(n=>({ch:n.ch, note:n.note, pitch:this.pitchOf(n),
      voice: this.mpe ? (this.zone.type==="lower" ? n.ch-1 : 14-n.ch) : null}))
      .sort((a,b)=>a.pitch-b.pitch);
  }

  // ---------- connection ----------
  async connect(){
    if(!navigator.requestMIDIAccess){ this._status("This browser has no Web MIDI. Use Chrome, Edge or Opera on a computer."); return false; }
    try{ this.midi=await navigator.requestMIDIAccess({sysex:true}); this.sysex=this.sysexGranted=true; }
    catch(e){
      try{ this.midi=await navigator.requestMIDIAccess(); }
      catch(e2){ this._status("MIDI access was blocked. Open the page in its own tab and allow MIDI when asked."); return false; }
    }
    this.midi.onstatechange=()=>this._ports();
    this._ports();
    try{ localStorage.setItem(MIDI_REMEMBER,"1"); }catch(e){}
    return true;
  }
  get inputs(){ return this.midi ? [...this.midi.inputs.values()] : []; }
  selectInput(id){ this.inputChoice=id; this.allOff(); this._ports(); }
  _ports(){
    const ins=this.inputs;
    const role=i=>portRole(i, ins);
    const chord=ins.find(i=>role(i)==="chord");
    ins.forEach(i=>i.onmidimessage=e=>{
      if(e.data[0]===0xF0){ if(role(i)==="chord") this._dump(e.data); return; }
      // the harp's own zone reuses channel numbers, so it never reaches the chord voices; its harp drums are
      // read first, as handle() reads the chord port's. A drum from any other input counts only if that input is heard.
      if(role(i)==="harp"){ if(!this._drum(e.data, e.timeStamp)) this._harp(e.data, e.timeStamp); return; }
      const use = this.inputChoice==="all" || this.inputChoice===i.id || (this.inputChoice==="auto" && chord && i.id===chord.id);
      if(use || (this.inputChoice==="auto" && !chord)) this.handle(e.data, e.timeStamp);
    });
    const out=this.midi ? [...this.midi.outputs.values()].find(o=>isChordPort(o.name))||null : null;
    const fresh = out && (!this.out || this.out.id!==out.id);
    if(out || !this.virtual) this.out=out;   // a minichord played on the page keeps its place until a real one turns up
    if(!ins.length) this._status("No MIDI inputs found. Plug in the minichord and it will show up here.");
    else if(chord) this._status(`Listening to ${chord.name}, the chord port.` + (this.sysex ? "" :
      " System-exclusive access wasn't allowed, so the lab can't read or change the minichord's settings: allow \"MIDI device control & reprogram\" in the browser's site settings, then reload."));
    else this._status("Listening to every MIDI input. No minichord found yet.");
    // another minichord: its locks and its settings 256 to 511 are its own, read afresh after its first dump
    if(fresh){ this.locks=null; this._locksAsked=false; this._page1Forget(); this.stickRest(); this.requestDump(); }
    this.dispatchEvent(new Event("ports"));
  }
  /** ask for every setting; asks again if no reply comes, and says so if none ever does */
  requestDump(){
    if(!this.out || !this.sysex) return;
    this.out.send([0xF0,0,0,0,0,0xF7]); this._asked=(this._asked||0)+1;
    this._requested=(this._requested||0)+1; this._requestedAt=Date.now();   // so the push-and-pop probe can tell its answer from these
    clearTimeout(this._dumpT);
    this._dumpT=setTimeout(()=>{
      if(this.params[35]!==undefined) return;
      this._dumpTries=(this._dumpTries||0)+1;
      if(this._dumpTries<3) this.requestDump();
      else this._status(`${this.statusText||""} The minichord didn't answer a request for its settings, so they can't be read or changed. Unplug it, plug it back in, and reload.`);
    },1500);
  }
  /** a control command (address 0): 0 asks for the settings, 2 saves a bank, 4 loads one, 5 pushes, 6 pops */
  control(cmd, param=0){ if(!this.out || !this.sysex) return false; this.out.send([0xF0,0,0,cmd&127,param&127,0xF7]);
    if(cmd===6) this._page1Due=true;   // a pop puts back all 512 settings, but reports only page 0: page 1 is asked for after it
    return true; }
  /**
   * Ask for settings 256 to 511 (firmware 31 on: control command 7, page 1). The answer is a page of its
   * own, F0 7D 6D 01 and two bytes a setting, which fills this.params[256…511] and fires "page1". Asked
   * by itself after a minichord's first dump, and after any dump it sends unasked (a preset loaded) or
   * that answers a pop, which can change them.
   */
  requestPage1(){ this._page1Due=false; return this.control(7,1); }
  _page1Forget(){ this.page1=false; this._page1Due=true; for(let a=256;a<512;a++) delete this.params[a]; }
  /**
   * Whether this minichord can push and pop its live settings (firmware command 5 and 6): a page can
   * then change what it likes and have everything put back exactly, rather than writing back every
   * address it remembers touching. Asked once, by trying it: a push and an immediate pop change
   * nothing at all (the settings are put back as they were), and a minichord that has them answers
   * the pop with a dump, while one that hasn't ignores both and says nothing. The answer is a dump
   * beyond those asked for meanwhile, not any "device" event: a page writing a setting fires one,
   * and a game sets the minichord up as soon as it connects. The version number can't be used: the
   * advanced firmware and the classic one number themselves separately.
   * A push goes out again straight afterwards, so the instrument remembers itself as it is now,
   * before any page has changed anything: waiting for the answer would be too late. One that hasn't
   * push and pop ignores it as it ignored the first.
   */
  probePushPop(){
    if(this._pushPop) return this._pushPop;
    if(!this.out || !this.sysex) return Promise.resolve(false);
    return this._pushPop=new Promise(done=>{
      const dumps=this._dumps||0, asked=this._requested||0, t0=Date.now();
      this._asked=(this._asked||0)+1;           // the dump a pop sends is one we asked for
      this.control(5); this.control(6);
      this.control(5);                          // it remembers itself, untouched, from here
      const answer=()=>{
        // a dump asked for a moment ago may still be on its way: till it comes, the pop's would pass for its
        if(Date.now()-(this._requestedAt||0)<150 && Date.now()-t0<2000) return setTimeout(answer,50);
        const got=(this._dumps||0)-dumps > (this._requested||0)-asked;
        if(!got && this._asked>0) this._asked--;
        this.pushPop=got;
        done(got);
      };
      setTimeout(answer,700);
    });
  }
  /** whether the minichord keeps this setting as its own, whatever preset is loaded (null locks: it hasn't said) */
  locked(a){ return !!this.locks && this.locks.has(a); }
  /** ask which settings are locked; the answer comes as a "locks" event, with this.locks set */
  requestLocks(){ return this.control(9); }
  /** lock a setting again at its present value, so a value just given back is the lock's at once */
  relock(a){ return this.writeParam(LOCK_ADDRESS, a); }
  writeParam(a,v){
    if(!this.out || !this.sysex) return false;
    this.out.send([0xF0,a&127,a>>7,v&127,(v>>7)&127,0xF7]); this.params[a]=v;
    this.dispatchEvent(new Event("device")); return true;
  }
  _dump(d){
    // the locks: 7D 6C, a count, then two bytes an address (see LOCK_ADDRESS)
    if(d[1]===0x7D && d[2]===0x6C){
      const n=d[3], locks=new Set();
      for(let i=0;i<n && 5+2*i<d.length;i++) locks.add(d[4+2*i]+128*d[5+2*i]);
      this.locks=locks; this.dispatchEvent(new Event("locks")); return;
    }
    // a page past the first (control command 7): 7D 6D, the page, then two bytes a setting. Not the
    // dump that's waited for and retried, nor one that says anything about presets or the key combo.
    if(d[1]===0x7D && d[2]===0x6D){
      const p=d[3]; if(!(p>=1) || d.length!==517) return;   // 256 settings, plus F0, the header and F7
      for(let i=0;i<256;i++) this.params[256*p+i]=d[4+2*i]+128*d[5+2*i];
      if(p===1){ this.page1=true; this.dispatchEvent(new Event("page1")); }
      return;
    }
    this._dumpTries=0; clearTimeout(this._dumpT);
    if(d.length!==514) return;   // 256 parameters as two 7-bit bytes, plus F0 and F7
    this._dumps=(this._dumps||0)+1;
    // a dump nobody asked for: the minichord reporting a change made on the instrument itself,
    // such as the key change combo (the advanced firmware reports every key picked that way)
    this.unasked = !(this._asked>0); if(this._asked>0) this._asked--;
    // what changed since the last dump: an unasked one that changes only the key signature (or
    // nothing) is the key change combo; one that changes a lot is a preset loaded on the instrument
    const had=Object.keys(this.params).length ? [...Array(256).keys()].map(i=>this.params[i]) : null;   // nothing to compare the first time
    const plate=this.params[243];
    for(let i=0;i<256;i++) this.params[i]=d[1+2*i]+128*d[2+2*i];
    if(plate===4 && this.params[243]!==4) this.stickRest();   // the plate changed: the firmware sends no release for what was held
    this.changed = new Set(had ? [...Array(256).keys()].filter(i=>i!==7 && had[i]!==this.params[i]) : []);
    if(this.params[110]===1 && !this.zone.known){ this.zone={type:"lower", members:this.params[108]===1?15:4, known:true}; }
    this.dispatchEvent(new Event("device"));
    // a firmware with locks is asked for them once, after its first dump
    if((this.params[7]??0)>=LOCKS_VERSION && !this.locks && !this._locksAsked){ this._locksAsked=true; this.requestLocks(); }
    // and page 1 (firmware 31 on), after its first dump and whenever it may have changed
    if((this.params[7]??0)>=31 && (this._page1Due || this.unasked || !this.page1)) this.requestPage1();
  }
  _status(t){ this.statusText=t; this.dispatchEvent(new CustomEvent("status",{detail:t})); }

  // ---------- MIDI in (also used to inject test messages) ----------
  handle(data, stamp){
    if(this._drum(data, stamp)) return;
    const st=data[0]; if(st>=0xF0) return;
    const type=st&0xF0, ch=st&0x0F;
    if(type===0x90 && data[2]>0) this._on(ch,data[1],data[2],stamp);
    else if(type===0x80 || type===0x90) this._off(ch,data[1]);
    // A bend that moves is a glide, and the chord waits for it to land. The firmware also sends a bend
    // before every note, gliding or not, and resends it each time a flickering press restarts the
    // chord; one that repeats the value already there isn't motion, and mustn't keep the chord waiting.
    else if(type===0xE0){ const v=(data[2]<<7)|data[1], b = v>=8192 ? (v-8192)/8191 : (v-8192)/8192;
      if(b!==this.chans[ch].bend) this._lastBend=performance.now();
      this.chans[ch].bend=b; this._changed(false); }
    else if(type===0xB0) this._cc(ch,data[1],data[2],stamp);
  }
  // A note on channel 10 while harp drums is on (as the Lab knows it: read from the minichord, or
  // written by a game) is a pad: its note-on a "drum" event, timed by the message's own timestamp
  // (performance.now()'s timebase) where it has one, and its note-off (sent 40 ms later, whatever the
  // finger does) nothing. Swallowed either way, so it's never a chord voice or a harp string. With harp
  // drums off, channel 10 is whatever it always was (in single port mode with MPE, harp strings).
  // Firmware 90 has no harp drums on the joystick plate: 343 is inert there, and its strip's notes (on
  // channel 10 too, with MPE) are still notes.
  get harpDrums(){ return this.params[343]===1 && !(this.params[243]===4 && (this.params[7]??0)<91); }
  _drum(d, stamp){
    if(!this.harpDrums || (d[0]!==0x99 && d[0]!==0x89)) return false;
    if(d[0]===0x99 && d[2]>0) this.dispatchEvent(new CustomEvent("drum",{detail:{note:d[1], vel:d[2], pad:DRUM_GM.indexOf(d[1]), t:stampOr(stamp), source:"minichord"}}));
    return true;
  }
  _chordChannel(ch){
    if(this.mpe){
      // chord voices sit on the first four member channels; in single port mode the harp strings follow on 6 to 16
      return this.zone.type==="lower" ? (ch>=1 && ch<=4) : (ch>=11 && ch<=14);
    }
    // without MPE, single port mode puts the harp on its own channel of the same port
    if(this.params[108]===1 && this.params[107]) return ch !== this.params[107]-1;
    return true;
  }
  _harp(d, stamp){
    const ch=d[0]&15, t=d[0]&0xF0;
    if((t===0x90 || t===0x80) && this._plateDrum(d[1], t===0x90 ? d[2] : 0, stamp)) return;
    if(t===0xE0){ (this.harpBend||(this.harpBend=[]))[ch]=((d[2]<<7|d[1])-8192)/8192; return; }   // a string's bend, arriving before its note
    const bend=(this.mpe && this.harpBend && this.harpBend[ch]) || 0;
    if(t===0x90 && d[2]>0) this.dispatchEvent(new CustomEvent("harp",{detail:{note:d[1], ch, pitch:d[1]+bend*48}}));
    else if(t===0x80 || t===0x90) this.dispatchEvent(new CustomEvent("harpoff",{detail:{note:d[1], ch}}));
  }
  _on(ch,note,vel,stamp){
    if(!this._chordChannel(ch) && this._plateDrum(note, vel, stamp)) return;
    if(!this._chordChannel(ch)){ const c=this.chans[ch]; this.dispatchEvent(new CustomEvent("harp",{detail:{note, ch, pitch:note+(this.mpe?c.bend*c.range:0)}})); return; }
    const key=ch+":"+note;
    // back within the debounce (a button pressed gently, its contact flickering): it never stopped
    if(this._offs && this._offs.has(key)){ clearTimeout(this._offs.get(key)); this._offs.delete(key); if(this.notes.has(key)) return; }
    // a voice's channel holds one note at a time
    if(this.mpe) for(const [k,n] of this.notes) if(n.ch===ch) this.notes.delete(k);
    this.notes.set(key,{ch,note,vel,t:performance.now()});
    this._changed(true);
  }
  // A note-off takes effect a moment later, and not at all if the same note comes straight back: a
  // chord button pressed gently can flicker its contact, sending the chord off and on again and again,
  // and without this the chord never holds still long enough to be read, however clearly it sounds.
  _off(ch,note){
    if(!this._chordChannel(ch) && this.drumFallback) return;           // a pad's note-off: nothing
    if(!this._chordChannel(ch)){ this.dispatchEvent(new CustomEvent("harpoff",{detail:{note, ch}})); return; }
    const key=ch+":"+note; if(!this.notes.has(key)) return;
    const offs=this._offs||(this._offs=new Map()); clearTimeout(offs.get(key));
    // Once every note has really gone (past the debounce), the press is over: the same chord played
    // again is a new press, however quickly it comes. A flicker shorter than the debounce never gets here.
    offs.set(key, setTimeout(()=>{ offs.delete(key); if(this.notes.delete(key)){ if(!this.notes.size) this._lastChordKey=""; this._changed(true); } }, Minichord.OFF_DEBOUNCE));
  }
  allOff(){ if(this._offs){ this._offs.forEach(t=>clearTimeout(t)); this._offs.clear(); } this.notes.clear(); this.chans.forEach(c=>c.bend=0); this._changed(true); }
  _cc(ch,cc,val,stamp){
    // the knobs, when "knobs send MIDI" (address 238) is on: CC 20 chord, 21 harp, 22 modulation, on the chord channel
    // (channel 16 on the first test builds); nothing else the minichord sends uses these numbers
    if(cc>=20 && cc<=22){ const k=cc-20; this.knobs[k]=val/127; this.lastKnob=k; this.dispatchEvent(new CustomEvent("knob",{detail:{knob:k, value:val/127}})); return; }
    if(cc>=JOY_CC && cc<=JOY_CC+4){ this._joy(cc-JOY_CC, val, stamp); return; }   // the joystick plate, on any channel
    const c=this.chans[ch];
    if(cc===101) c.rpn[0]=val;
    else if(cc===100) c.rpn[1]=val;
    else if(cc===6){
      const [a,b]=c.rpn;
      if(a===0 && b===0){ const m=this.masterCh; if(ch===m) c.range=val; else this.chans.forEach((x,i)=>{ if(i!==m) x.range=val; }); }
      else if(a===0 && b===6 && (ch===0||ch===15)){
        if(val>0){ this.zone={type:ch===0?"lower":"upper", members:val, known:true}; this.params[110]=1;
          this.chans.forEach((x,i)=>x.range = i===this.masterCh ? 2 : 48); }
        else { this.zone={type:"lower", members:15, known:false}; this.params[110]=0; }
        this.dispatchEvent(new Event("device"));
      }
    } else if(cc===120 || cc===123){
      for(const [k,n] of this.notes) if(n.ch===ch) this.notes.delete(k);
      this._changed(true);
    }
  }
  // The joystick plate's stick and buttons, as the firmware sends them: an axis 0 to 127 with 64 at rest,
  // decoded to -1 to 1 (64 counts down, 63 up, so both ends reach 1); a button 127 down, 0 up. Each
  // arrives on change only, and is passed on only when it changes here, timed by its message.
  _joy(k, val, stamp){
    const t=stampOr(stamp);
    if(k<2){
      const v= val<64 ? (val-64)/64 : (val-64)/63, s=this.stick, axis=k===0 ? "x" : "y";
      if(s[axis]===v) return;
      this.stick={...s, [axis]:v};
      this.dispatchEvent(new CustomEvent("stick",{detail:{x:this.stick.x, y:this.stick.y, t}}));
      return;
    }
    const name=["a","b","click"][k-2], down=val>=64;
    if(this.buttons[name]===down) return;
    this.buttons={...this.buttons, [name]:down};
    this.dispatchEvent(new CustomEvent("button",{detail:{name, down, t}}));
    // the button's pad, marked as a button's: it was already heard as one, by whatever takes buttons
    if(down && this.drumFallback){ const pad=JOY_PADS[k-2]; this.dispatchEvent(new CustomEvent("drum",{detail:{note:DRUM_GM[pad], vel:100, pad, t, source:"plate", button:true}})); }
  }
  /** the stick back at rest and the buttons up (another instrument, or the plate changed), each change told */
  stickRest(){
    for(const name of ["a","b","click"]) if(this.buttons[name]) this._joy(2+["a","b","click"].indexOf(name), 0);
    if(this.stick.x) this._joy(0, 64);
    if(this.stick.y) this._joy(1, 64);
  }
  // a strip note while drumFallback is on: a pad (its note-on a "drum" event at a fixed velocity, since
  // the game turns the harp's volume down to silence its pitch; its note-off nothing)
  _plateDrum(note, vel, stamp){
    if(!this.drumFallback) return false;
    if(vel>0){ const pad=((note%12)+12)%12; this.dispatchEvent(new CustomEvent("drum",{detail:{note:DRUM_GM[pad], vel:100, pad, t:stampOr(stamp), source:"plate"}})); }
    return true;
  }
  _changed(noteChange){
    if(!this._frame) this._frame=requestAnimationFrame(()=>{ this._frame=0; this.dispatchEvent(new Event("voices")); });
    if(noteChange){
      // settled 40 ms after the last change, but never more than 150 ms after the first, so a burst of
      // changes can't hold a chord back for ever
      const now=performance.now();
      if(!this._settle) this._settleStart=now;
      clearTimeout(this._settle);
      this._settle=setTimeout(()=>{ this._settle=0; this._trySettle(); }, Math.max(0, Math.min(40, 150-(now-this._settleStart))));
    }
  }
  // A chord has settled when notes stop arriving and, with glide on, the bends stop moving too:
  // the minichord sends each new note first and then bends the voice home from where it was.
  _trySettle(){
    const now=performance.now();
    if(now-(this._lastBend||0)<50 && now-this._settleStart<2500){ this._settle=setTimeout(()=>{ this._settle=0; this._trySettle(); },30); return; }
    const v=this.voices, key=v.map(x=>x.ch+":"+x.note).join(",");

    if(v.length && key!==this._lastChordKey){
      this._lastChordKey=key;
      const ev=new CustomEvent("chord",{detail:v}); ev.startedAt=this._settleStart;   // when its notes arrived, before any glide
      this.dispatchEvent(ev);
    }
    if(!v.length) this._lastChordKey="";
  }
}

// ---------- spelling and theory helpers shared by the views ----------
const LETTERS=["F","C","G","D","A","E","B"];
/** name a pitch class (0..11) the way the key would spell it, on the line of fifths */
// Remembered across the Lab's pages: connected once, later pages reconnect by themselves while the
// browser still grants MIDI with system-exclusive messages. A browser that can't say so never does.
const MIDI_REMEMBER="minichord-lab-midi";
export async function midiRemembered(){
  try{
    if(typeof localStorage==="undefined" || localStorage.getItem(MIDI_REMEMBER)!=="1" || !navigator.requestMIDIAccess || !navigator.permissions) return false;
    const st=await navigator.permissions.query({name:"midi", sysex:true});
    return st.state==="granted";
  }catch(e){ return false; }
}

export function spell(pc, keyFifths=0){
  const centre=keyFifths+2;   // middle of the key's seven diatonic fifths
  const accOf=q=>Math.floor((q+1)/7);
  // nearest to the key on the line of fifths; double accidentals cost extra, ties go to fewer accidentals
  const cost=q=>Math.abs(q-centre) + (Math.abs(accOf(q))>=2 ? 3 : 0);
  let best=null;
  for(let q=-15;q<=19;q++){
    if(((q*7)%12+12)%12!==pc) continue;
    if(best===null || cost(q)<cost(best) || (cost(q)===cost(best) && Math.abs(accOf(q))<Math.abs(accOf(best)))) best=q;
  }
  const i=best+1, letter=LETTERS[((i%7)+7)%7], acc=Math.floor(i/7);
  return letter + (acc>0 ? "♯".repeat(acc).replace("♯♯","𝄪") : acc<0 ? "♭".repeat(-acc).replace("♭♭","𝄫") : "");
}
