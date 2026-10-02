/* ============================================================================
 * sound.js: a small sampled piano for views that need to play something
 * themselves. Samples are FluidR3 grand piano notes (see samples/README.md),
 * every second semitone from C2 to E6, shifted by up to a semitone.
 * Falls back to a simple synthesized tone until they load, or if they can't.
 * ========================================================================== */
const SAMPLE_NOTES=[]; for(let m=36;m<=88;m+=2) SAMPLE_NOTES.push(m);
const BASE=new URL("../samples/piano/", import.meta.url);

export class Piano {
  constructor(){ this.ctx=null; this.out=null; this.buffers=new Map(); this.ready=false; this.failed=false; this._bytes=null; }
  /** fetch the samples ahead of time, quietly: they need no sound to arrive, only to be decoded, which
   *  start() does, so the first notes are the piano's own rather than the stand-in tone */
  prefetch(){
    if(!this._bytes) this._bytes=Promise.all(SAMPLE_NOTES.map(m=>fetch(new URL(`${m}.mp3`,BASE), {priority:"low"})
      .then(r=>{ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })));
    const got=this._bytes; got.catch(()=>{ if(this._bytes===got) this._bytes=null; });   // failed: the next asking tries again
    return got;
  }
  /** call from a click or key press: browsers only allow sound after one */
  async start(){
    // On an iPhone, sound made in the page is silenced by the ring/silent switch unless it says it's
    // music to be played (Safari 16.4 on); this is an instrument, so it is
    try{ if(navigator.audioSession && navigator.audioSession.type!=="playback") navigator.audioSession.type="playback"; }catch(e){}
    if(!this.ctx){
      // Chrome on desktop Linux drops out with the smallest buffer
      const linux=/Linux/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent);
      this.ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint: linux ? "playback" : "interactive"});
      const comp=this.ctx.createDynamicsCompressor(); comp.threshold.value=-12; comp.ratio.value=4;
      this.out=this.ctx.createGain(); this.out.gain.value=.7;
      this.out.connect(comp).connect(this.ctx.destination);
      this._load();
    }
    await this.ctx.resume();
  }
  async _load(){
    try{
      const bytes=await this.prefetch();
      await Promise.all(bytes.map((a,i)=>this.ctx.decodeAudioData(a).then(b=>this.buffers.set(SAMPLE_NOTES[i],b))));
      this.ready=true;
    }catch(e){ this.failed=true; }
  }
  get now(){ return this.ctx ? this.ctx.currentTime : 0; }
  /** play pitches (semitones, 60 = middle C, fractions allowed) starting `when` seconds from now */
  play(pitches, {when=0, dur=1.2, vel=90}={}){
    if(!this.ctx) return;
    const t0=this.ctx.currentTime+when, level=(.35+.65*vel/127)/Math.sqrt(Math.max(1,pitches.length))*1.4;
    for(const p of pitches){
      const env=this.ctx.createGain(); env.connect(this.out);
      env.gain.setValueAtTime(level,t0);
      env.gain.setValueAtTime(level,t0+dur);
      env.gain.setTargetAtTime(0,t0+dur,.12);
      if(this.ready){
        const m=SAMPLE_NOTES.reduce((a,b)=>Math.abs(b-p)<Math.abs(a-p)?b:a);
        const src=this.ctx.createBufferSource(); src.buffer=this.buffers.get(m);
        src.playbackRate.value=Math.pow(2,(p-m)/12);
        src.connect(env); src.start(t0); src.stop(t0+dur+.8);
      } else {
        // until the samples arrive: a plucked tone with a few harmonics
        const o=this.ctx.createOscillator(), n=6, re=new Float32Array(n+1), im=new Float32Array(n+1);
        for(let k=1;k<=n;k++) im[k]=Math.pow(.6,k-1);
        o.setPeriodicWave(this.ctx.createPeriodicWave(re,im));
        o.frequency.value=440*Math.pow(2,(p-69)/12);
        const d=this.ctx.createGain(); d.gain.setValueAtTime(.6,t0); d.gain.setTargetAtTime(.15,t0,.25);
        o.connect(d).connect(env); o.start(t0); o.stop(t0+dur+.8);
      }
    }
  }
}
