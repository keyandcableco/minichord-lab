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
 *   "chord"   a chord settled: notes stopped arriving for a moment
 *   "device"  the parameter dump arrived or a setting changed
 *   "status"  connection text for the page to show
 * ========================================================================== */

export const KEY_NAMES = ["C","G","D","A","E","B","F","B♭","E♭","A♭","D♭","G♭",
  "F♯","C♯","G♯","D♯","A♯","E♯","B♯","F♭","C♭"];
// each key's place on the line of fifths (sharps positive, flats negative)
const KEY_FIFTHS = [0,1,2,3,4,5,-1,-2,-3,-4,-5,-6,6,7,8,9,10,11,12,-8,-7];
export const TEMPERAMENTS = ["Equal","Meantone","Just","Pythagorean","Werckmeister III","Kirnberger III",
  "Vallotti","Young","Kellner","1/6 Meantone","19-EDO","31-EDO"];

const isChordPort = n => /minichord/i.test(n) && (n.includes("1") || n.trim().toLowerCase()==="minichord");

export class Minichord extends EventTarget {
  constructor(){
    super();
    this.midi=null; this.out=null; this.sysex=false; this.inputChoice="auto";
    this.chans=Array.from({length:16},(_,i)=>({bend:0, range:i===0?2:48, rpn:[127,127]}));
    this.zone={type:"lower", members:15, known:false};
    this.params={};               // raw values from the dump, by address
    this.notes=new Map();         // "ch:note" -> {ch, note, vel, t}
    this._frame=0; this._settle=0; this._lastChordKey="";
  }

  // ---------- what the pages read ----------
  get mpe(){ return this.params[110]===1 || this.zone.known; }
  get keyIndex(){ return this.params[35] ?? null; }
  get keyName(){ return this.keyIndex==null ? null : KEY_NAMES[this.keyIndex] ?? null; }
  get keyFifths(){ return this.keyIndex==null ? 0 : (KEY_FIFTHS[this.keyIndex] ?? 0); }
  get temperament(){ return this.params[237] ?? null; }
  get division(){ const t=this.temperament; return t===10 ? 19 : t===11 ? 31 : 12; }
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
    try{ this.midi=await navigator.requestMIDIAccess({sysex:true}); this.sysex=true; }
    catch(e){
      try{ this.midi=await navigator.requestMIDIAccess(); }
      catch(e2){ this._status("MIDI access was blocked. Open the page in its own tab and allow MIDI when asked."); return false; }
    }
    this.midi.onstatechange=()=>this._ports();
    this._ports();
    return true;
  }
  get inputs(){ return this.midi ? [...this.midi.inputs.values()] : []; }
  selectInput(id){ this.inputChoice=id; this.allOff(); this._ports(); }
  _ports(){
    const ins=this.inputs;
    const chord=ins.find(i=>isChordPort(i.name));
    ins.forEach(i=>i.onmidimessage=e=>{
      if(e.data[0]===0xF0){ if(isChordPort(i.name)) this._dump(e.data); return; }
      const use = this.inputChoice==="all" || this.inputChoice===i.id || (this.inputChoice==="auto" && chord && i.id===chord.id);
      if(use || (this.inputChoice==="auto" && !chord)) this.handle(e.data);
    });
    const out=this.midi ? [...this.midi.outputs.values()].find(o=>isChordPort(o.name))||null : null;
    const fresh = out && (!this.out || this.out.id!==out.id);
    this.out=out;
    if(!ins.length) this._status("No MIDI inputs found. Plug in the minichord and it will show up here.");
    else if(chord) this._status(`Listening to ${chord.name}, the chord port.`);
    else this._status("Listening to every MIDI input. No minichord found yet.");
    if(fresh) this.requestDump();
    this.dispatchEvent(new Event("ports"));
  }
  requestDump(){ if(this.out && this.sysex) this.out.send([0xF0,0,0,0,0,0xF7]); }
  writeParam(a,v){
    if(!this.out || !this.sysex) return false;
    this.out.send([0xF0,a&127,a>>7,v&127,(v>>7)&127,0xF7]); this.params[a]=v;
    this.dispatchEvent(new Event("device")); return true;
  }
  _dump(d){
    if(d.length!==514) return;   // 256 parameters as two 7-bit bytes, plus F0 and F7
    for(let i=0;i<256;i++) this.params[i]=d[1+2*i]+128*d[2+2*i];
    if(this.params[110]===1 && !this.zone.known){ this.zone={type:"lower", members:this.params[108]===1?15:4, known:true}; }
    this.dispatchEvent(new Event("device"));
  }
  _status(t){ this.statusText=t; this.dispatchEvent(new CustomEvent("status",{detail:t})); }

  // ---------- MIDI in (also used to inject test messages) ----------
  handle(data){
    const st=data[0]; if(st>=0xF0) return;
    const type=st&0xF0, ch=st&0x0F;
    if(type===0x90 && data[2]>0) this._on(ch,data[1],data[2]);
    else if(type===0x80 || type===0x90) this._off(ch,data[1]);
    else if(type===0xE0){ const v=(data[2]<<7)|data[1]; this.chans[ch].bend = v>=8192 ? (v-8192)/8191 : (v-8192)/8192; this._changed(false); }
    else if(type===0xB0) this._cc(ch,data[1],data[2]);
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
  _on(ch,note,vel){
    if(!this._chordChannel(ch)) return;
    // a voice's channel holds one note at a time
    if(this.mpe) for(const [k,n] of this.notes) if(n.ch===ch) this.notes.delete(k);
    this.notes.set(ch+":"+note,{ch,note,vel,t:performance.now()});
    this._changed(true);
  }
  _off(ch,note){ if(this.notes.delete(ch+":"+note)) this._changed(true); }
  allOff(){ this.notes.clear(); this.chans.forEach(c=>c.bend=0); this._changed(true); }
  _cc(ch,cc,val){
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
  _changed(noteChange){
    if(!this._frame) this._frame=requestAnimationFrame(()=>{ this._frame=0; this.dispatchEvent(new Event("voices")); });
    if(noteChange){
      clearTimeout(this._settle);
      this._settle=setTimeout(()=>{
        const v=this.voices, key=v.map(x=>x.ch+":"+x.note).join(",");
        if(v.length && key!==this._lastChordKey){ this._lastChordKey=key; this.dispatchEvent(new CustomEvent("chord",{detail:v})); }
        if(!v.length) this._lastChordKey="";
      },40);
    }
  }
}

// ---------- spelling and theory helpers shared by the views ----------
const LETTERS=["F","C","G","D","A","E","B"];
/** name a pitch class (0..11) the way the key would spell it, on the line of fifths */
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
