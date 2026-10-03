/* ============================================================================
 * link.js: the minichord playing the 8b8 (keyandcableco/8bit8asterd), three
 * AY-3-8910 chips behind an Arduino Leonardo, or the same firmware running in
 * its emulator. The page in the middle is the only way the two meet: both are
 * USB devices, and neither can be the other's host.
 *
 * What goes across, and how:
 *   notes and bends   MIDI, to the 8b8's own USB MIDI port (or the emulator's
 *                     queue), each minichord voice on a lane of its own
 *   settings          the 8b8's text protocol over its serial port: P:<i>:<v>
 *                     sets one, LOAD: a whole sound, PCT: twelve cents of tuning
 *   clock             MIDI clock out to the minichord, which follows it in
 *                     rhythm mode, with a drum pattern on the 8b8 in time
 *
 * Nothing here touches the page: index.html wires these to the instrument and
 * the buttons, and the tests drive them directly.
 * ========================================================================== */
import {TEMPERAMENT_TABLE} from "../core/temperaments.js";
import {PARAMS_8B8, LAYOUT_8B8, SOUNDS_8B8} from "./params.js";
export {PARAMS_8B8, LAYOUT_8B8, SOUNDS_8B8};

/** a setting's index on the 8b8, by its key */
export const PARAM = Object.fromEntries(PARAMS_8B8.map((p,i)=>[p.key,i]));
/** the 8b8's drum channel (MIDI channel 10): notes 35 to 59 are its kit */
export const DRUM_CH = 9;
/** what each harp string hits when the harp plays drums, lowest string first, in the 8b8's own names */
export const KIT = [
  [36,"Bass drum"], [38,"Snare"], [42,"Closed hat"], [46,"Open hat"], [39,"Clave"], [41,"Low floor tom"],
  [45,"Low tom"], [48,"Hi-mid tom"], [50,"High tom"], [49,"Crash"], [51,"Ride"], [56,"Cowbell"],
];
/** the drum pattern's rows: a note on the 8b8's kit each */
export const DRUM_ROWS = [[36,"Kick"], [38,"Snare"], [42,"Hat"], [46,"Open hat"]];

/**
 * The tuning the 8b8 should play the minichord's notes in, as the twelve whole cents from equal
 * temperament that PCT: takes, C to B.
 * Over plain MIDI a note arrives as its number only, so the temperament has to be the 8b8's job;
 * with MPE each note brings its own bend, already carrying the temperament (and in 19, 24 and 31
 * everything the note number rounded away), so the 8b8 must add nothing of its own, or the tuning
 * would land twice. The master tuning is in neither: the minichord retunes only its own synth for
 * it, and leaves note numbers and bends alone. So it goes on every pitch class, either way.
 * Always twelve numbers, never "off": off would hand the tuning back to the 8b8's own temperament
 * setting, which any sound loaded on it can change.
 */
export function tuningCents(temper, aHz=440, bends=false){
  const t=TEMPERAMENT_TABLE[temper] || TEMPERAMENT_TABLE[0];
  const a=Math.round(1200*Math.log2((aHz||440)/440));
  const base = bends || t.division!==12 ? Array(12).fill(0) : t.cents;
  return base.map(c=>Math.max(-100, Math.min(100, c+a)));
}

/** whether the 8b8 can play this temperament as the minichord does (19, 24 and 31 need MPE's bends) */
export const tuningReaches=(temper, bends)=> bends || (TEMPERAMENT_TABLE[temper]||TEMPERAMENT_TABLE[0]).division===12;

/** a minichord knob (0 to 1) as a value of one of the 8b8's settings, across its whole range */
export function knobValue(index, x){
  const p=PARAMS_8B8[index]; if(!p) return null;
  return Math.round(p.min + Math.max(0, Math.min(1, x))*(p.max-p.min));
}

/**
 * The arpeggio shape (the 8b8's Auto FX "Arp" setting) that matches a chord: 1 major, 2 minor,
 * 5 diminished, or 3 octaves for anything without a plain triad in it. The 8b8 arpeggiates every
 * note it holds through the same shape, so following the chord keeps the harp inside its harmony.
 */
export function arpFor(pcs){
  const has=new Set(pcs.map(p=>((Math.round(p)%12)+12)%12));
  for(const [i,shape] of [[[4,7],1],[[3,7],2],[[3,6],5]])
    for(const r of has) if(i.every(x=>has.has((r+x)%12))) return shape;
  return 3;
}

// Lanes: the 8b8's channels a minichord voice can have to itself. Not 0, its master, whose bend
// would move everything, and not 9, the drums.
const LANES=[1,2,3,4,5,6,7,8,10,11,12,13,14,15];

/**
 * Takes what the minichord sends and says what the 8b8 should get. One instance per link.
 *
 * Without MPE the chord plays on the 8b8's channel 1 and the harp on channel 2, so each takes its
 * own envelope from the 8b8's "MIDI ch presets". With MPE every voice comes on a channel of its
 * own with its own bend, and both minichord ports number theirs from 2: the chord's second voice
 * and the harp's second string would share a channel on the 8b8, and a bend, and one's note-off
 * could end the other. So each (section, channel) gets a lane of its own, the one used longest ago
 * handed on when they run out, its notes let go first so nothing is left sounding.
 */
export class Router {
  constructor(){
    this.chord=true;           // the chord buttons play the 8b8
    this.harp="voice";         // the harp: "voice", "drums" or "off"
    this.mpe=false;            // the minichord sends MPE: lanes and bends
    this.reset();
  }
  reset(){ this.lanes=new Map(); this.age=new Array(16).fill(0); this.clock=0; this.held=new Map(); }
  /** every note still sounding on the 8b8, let go: for switching modes, or leaving */
  releaseAll(){
    const out=[];
    for(const [k,notes] of this.held){ const ch=+k; for(const n of notes) out.push([0x80|ch, n, 0]); }
    this.reset(); return out;
  }
  _lane(key){
    let lane=this.lanes.get(key);
    const out=[];
    if(lane===undefined){
      const taken=new Set(this.lanes.values());
      lane=LANES.find(l=>!taken.has(l));
      if(lane===undefined){
        lane=LANES.reduce((a,b)=>this.age[a]<=this.age[b] ? a : b);
        for(const n of this.held.get(lane)||[]) out.push([0x80|lane, n, 0]);
        this.held.delete(lane);
        for(const [k,v] of this.lanes) if(v===lane) this.lanes.delete(k);
      }
      this.lanes.set(key, lane);
    }
    this.age[lane]=++this.clock;
    return {lane, out};
  }
  _hold(ch, note, on){
    let s=this.held.get(ch);
    if(on){ if(!s) this.held.set(ch, s=new Set()); s.add(note); }
    else if(s){ s.delete(note); if(!s.size) this.held.delete(ch); }
  }
  /**
   * One message from the minichord. section is "chord" or "harp"; string, for the harp, is which
   * string it is (0 lowest) when that's known, which it is under MPE, where each has its channel.
   * Returns the messages for the 8b8, in order (possibly none).
   */
  route(section, data, string=null){
    const type=data[0]&0xF0, ch=data[0]&15;
    if(section==="chord" && !this.chord) return [];
    if(section==="harp" && this.harp==="off") return [];
    const on = type===0x90 && data[2]>0, off = type===0x80 || (type===0x90 && data[2]===0);
    // all notes off from the minichord: let go of this section's notes, and only those
    if(type===0xB0 && (data[1]===120 || data[1]===123)){
      const out=[];
      for(const [key,lane] of [...this.lanes]) if(key.startsWith(section+":")){
        for(const n of this.held.get(lane)||[]) out.push([0x80|lane, n, 0]);
        this.held.delete(lane);
      }
      if(!this.mpe){ const lane=section==="chord" ? 0 : 1;
        for(const n of this.held.get(lane)||[]) out.push([0x80|lane, n, 0]); this.held.delete(lane); }
      return out;
    }
    if(section==="harp" && this.harp==="drums"){
      if(!on && !off) return [];   // a drum has no bend
      const i = string!=null ? string : data[1]%12;
      const hit=KIT[((i%KIT.length)+KIT.length)%KIT.length][0];
      this._hold(DRUM_CH, hit, on);
      return [[(on?0x90:0x80)|DRUM_CH, hit, on ? data[2] : 0]];
    }
    if(!on && !off && type!==0xE0) return [];   // other controllers stay home: the 8b8 maps CC 70 to 119 onto its settings
    if(!this.mpe){
      const lane = section==="chord" ? 0 : 1;
      if(type===0xE0) return [[0xE0|lane, data[1], data[2]]];
      this._hold(lane, data[1], on);
      return [[(on?0x90:0x80)|lane, data[1], on ? data[2] : 0]];
    }
    // a note-off for a voice whose lane was handed on: its note was let go then
    if(off && !this.lanes.has(section+":"+ch)) return [];
    const {lane, out}=this._lane(section+":"+ch);
    if(type===0xE0) out.push([0xE0|lane, data[1], data[2]]);
    else { this._hold(lane, data[1], on); out.push([(on?0x90:0x80)|lane, data[1], on ? data[2] : 0]); }
    return out;
  }
}

/**
 * The 8b8's end of the link, over whichever transport reaches it: the board over USB, or the
 * emulator. A transport has line(text) for the serial protocol and midi(bytes, at) for MIDI, at
 * being a performance.now() time to play it at, or nothing for now; it calls receive() with each
 * line the 8b8 answers.
 * Events: "preset" when its settings arrive or change, "line" for every line it sends.
 */
export class EightBit extends EventTarget {
  constructor(){ super(); this.transport=null; this.layout=null; this.params=null; this.name=""; }
  attach(transport, name){
    this.transport=transport; this.name=name||""; this.layout=null; this.params=null;
    transport.receive=l=>this.receive(l);
    this.line("DUMP");
  }
  detach(){ this.transport=null; this.layout=null; this.params=null; this.dispatchEvent(new Event("preset")); }
  get connected(){ return !!this.transport; }
  /** the 8b8 at hand has the settings this page knows, in the same order */
  get known(){ return this.layout===LAYOUT_8B8; }
  line(text){ if(this.transport) this.transport.line(text); }
  midi(bytes, at){ if(this.transport) this.transport.midi(bytes, at); }
  receive(l){
    l=String(l).trim(); if(!l) return;
    this.dispatchEvent(new CustomEvent("line",{detail:l}));
    if(l.startsWith("LAYOUT:")) this.layout=l.slice(7).toUpperCase();
    else if(l.startsWith("PRESET:")){ this.params=l.slice(7).split(",").map(Number); this.dispatchEvent(new Event("preset")); }
    else if(/^V:\d+:\d+$/.test(l)){ const [,i,v]=l.split(":").map(Number); if(this.params) this.params[i]=v; this.dispatchEvent(new Event("preset")); }
  }
  /** one setting, held to its range */
  set(i, v){
    const p=PARAMS_8B8[i]; if(p) v=Math.max(p.min, Math.min(p.max, v));
    if(this.params) this.params[i]=v;
    this.line(`P:${i}:${v}`);
  }
  /** a whole sound: every setting, in order */
  load(values){ this.line("LOAD:"+values.join(",")); }
  /** twelve cents from equal, C to B, or null for the 8b8's own temperament */
  tune(cents){ this.line(cents ? "PCT:"+cents.join(",") : "PCT:off"); }
  mpe(on){ this.line("MPE:"+(on?1:0)); }
}

/**
 * MIDI clock, 24 to the quarter note, scheduled ahead in time so a busy page can't make it
 * stumble: each pulse and each sixteenth is handed out with the time it should land, and
 * Web MIDI sends it then. tick(kind, at) gets "start", "clock" and "stop"; step(i, at) each
 * sixteenth. now() is performance.now(), or a stand-in.
 */
export class Clock {
  constructor({tick=()=>{}, step=()=>{}, now=()=>performance.now(), ahead=120, every=25}={}){
    Object.assign(this, {tick, step, now, ahead, every});
    this.bpm=100; this.running=false; this.steps=16;
  }
  get pulse(){ return 60000/this.bpm/24; }
  start(){
    if(this.running) return;
    this.running=true; this.n=0; this.next=this.now()+30;
    this.tick("start", this.next);
    this._pump(); this._t=setInterval(()=>this._pump(), this.every);
  }
  stop(){
    if(!this.running) return;
    this.running=false; clearInterval(this._t);
    this.tick("stop", this.now());
  }
  setTempo(bpm){ this.bpm=Math.max(30, Math.min(300, +bpm||100)); }
  _pump(){
    const until=this.now()+this.ahead;
    while(this.running && this.next<until){
      if(this.n%6===0) this.step((this.n/6)%this.steps, this.next);
      this.tick("clock", this.next);
      this.n++; this.next+=this.pulse;
    }
  }
}
