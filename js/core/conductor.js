/* THE BEAT CLOCK — Conductor turns real audio-clock time into "beat" numbers
 * (beat 4.5 = halfway through the 5th beat), which is what every mode uses to
 * schedule notes and animations. NoteTrack holds a mode's list of notes and
 * matches a keypress to the nearest unjudged note within the timing window.
 * Judge converts a timing error into perfect/good/ok/miss and knows about the
 * difficulty tiers (Rookie..Champions). Session tracks one run's score/combo.
 * Depends on: utils.js, store.js. */
'use strict';
/* ================= CONDUCTOR — beat clock + lookahead scheduler on audioContext.currentTime ================= */
class Conductor{
  constructor(bpm){this.bpm=bpm;this.startTime=0;this.nextStep=0;this.running=false;
    this.patternFn=null;this.stepsPerBeat=4;this.lookahead=0.12;}
  get spb(){return 60/this.bpm;}
  start(delay){this.startTime=AE.now()+(delay||0.1);this.nextStep=0;this.running=true;}
  stop(){this.running=false;}
  beatToTime(b){return this.startTime+b*this.spb;}
  timeToBeat(t){return (t-this.startTime)/this.spb;}
  get beat(){return this.timeToBeat(AE.now());}
  setBpm(bpm){ // re-anchor so the current beat position is preserved
    const nowBeat=this.timeToBeat(AE.now());this.bpm=bpm;
    this.startTime=AE.now()-nowBeat*this.spb;}
  update(){ // schedule pattern steps just ahead of the audio clock
    if(!this.running||!this.patternFn)return;
    for(let i=0;i<64;i++){
      const t=this.beatToTime(this.nextStep/this.stepsPerBeat);
      if(t>AE.now()+this.lookahead)break;
      if(t>AE.now()-0.05)this.patternFn(this.nextStep,t);
      this.nextStep++;
    }
  }
}

/* ================= NOTE TRACK — playable events with beat positions ================= */
class NoteTrack{
  constructor(cond){this.cond=cond;this.notes=[];}
  add(n){n.judged=false;this.notes.push(n);return n;}
  clear(){this.notes.length=0;}
  // consume nearest unjudged note for this key within the ok window; returns note with .delta set
  hit(key,t,okWin){
    let best=null,bd=1e9;
    for(const n of this.notes){
      if(n.judged||n.key!==key)continue;
      const d=Math.abs(t-this.cond.beatToTime(n.beat));
      if(d<=okWin&&d<bd){bd=d;best=n;}
    }
    if(best){best.judged=true;best.delta=t-this.cond.beatToTime(best.beat);}
    return best;
  }
  // notes whose window has fully passed become misses
  sweep(t,okWin,onMiss){
    for(const n of this.notes){
      if(!n.judged&&this.cond.beatToTime(n.beat)<t-okWin){n.judged=true;n.missed=true;onMiss(n);}
    }
  }
  next(kind){for(const n of this.notes)if(!n.judged&&(!kind||n.kind===kind))return n;return null;}
  allJudged(){return this.notes.every(n=>n.judged);}
}

/* ================= JUDGMENT ================= */
const CHAMPIONS_THRESHOLD=6000; // lifetime points needed to unlock the Champions tier
function championsUnlocked(){return (Store.data.lifetimePoints||0)>=CHAMPIONS_THRESHOLD;}
const Judge={
  win(){
    const d=Store.data.difficulty;
    const m=d==='rookie'?1.45:d==='legend'?0.7:d==='champions'?0.45:1.0;
    return {perfect:0.05*m,good:0.10*m,ok:0.15*m};
  },
  judge(delta){
    const w=this.win(),a=Math.abs(delta);
    if(a<=w.perfect)return 'perfect';
    if(a<=w.good)return 'good';
    if(a<=w.ok)return 'ok';
    return null;
  },
  dense(){return Store.data.difficulty==='legend'||Store.data.difficulty==='champions';}, // extra notes on Legend+
  sparse(){return Store.data.difficulty==='rookie';},
  champ(){return Store.data.difficulty==='champions';},
  bpmMul(){return this.champ()?1.28:1;}, // Champions runs everything hotter
};

/* ================= SESSION — per-run combo/score/accuracy ================= */
class Session{
  constructor(){this.score=0;this.combo=0;this.maxCombo=0;
    this.counts={perfect:0,good:0,ok:0,miss:0};}
  get mult(){return 1+Math.min(this.combo,40)*0.025;}
  addJudge(j,base){
    base=base||100;
    if(j==='miss'){this.counts.miss++;this.combo=0;return 0;}
    const fct=j==='perfect'?1:j==='good'?0.6:0.3;
    this.counts[j]++;this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);
    const pts=Math.round(base*fct*this.mult);
    this.score+=pts;return pts;
  }
  get total(){const c=this.counts;return c.perfect+c.good+c.ok+c.miss;}
  get accuracy(){
    if(!this.total)return 100;
    const c=this.counts;
    return (c.perfect+c.good*0.65+c.ok*0.3)/this.total*100;
  }
}

