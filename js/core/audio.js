/* AUDIO ENGINE (AE) — every sound in this game is synthesized live with the
 * Web Audio API; there are no sound files. AE.init() sets up the audio graph
 * (compressor -> music/sfx gain busses -> destination). The tone()/nz() methods
 * are the two raw building blocks (a tone oscillator and a filtered noise burst);
 * everything else (kick, snare, hat, engine drone, morse key, etc.) is built out
 * of those two. P holds the drum-pattern strings shared by a few modes.
 * Depends on: utils.js, store.js (reads saved volume levels). */
'use strict';
/* ================= AUDIO ENGINE (all sound synthesized, Web Audio clock) ================= */
const AE={
  ac:null,out:null,music:null,sfxg:null,noise:null,engine:null,morse:null,
  init(){
    if(this.ac){if(this.ac.state==='suspended')this.ac.resume();return;}
    const AC=window.AudioContext||window.webkitAudioContext;
    this.ac=new AC();
    const comp=this.ac.createDynamicsCompressor();
    comp.threshold.value=-16;comp.knee.value=18;comp.ratio.value=5;comp.connect(this.ac.destination);
    this.out=this.g(0.9);this.out.connect(comp);
    this.music=this.g(Store.data.volMusic);this.music.connect(this.out);
    this.sfxg=this.g(Store.data.volSfx);this.sfxg.connect(this.out);
    const len=this.ac.sampleRate,buf=this.ac.createBuffer(1,len,this.ac.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    this.noise=buf;
  },
  g(v){const n=this.ac.createGain();n.gain.value=v;return n;},
  now(){return this.ac?this.ac.currentTime:0;},
  /* -- primitives -- */
  tone(t,o){ // {type,f,f2,dur,vol,dest,att}
    const type=o.type||'sine',dur=o.dur||0.2,vol=o.vol||0.3,att=o.att||0.005;
    const osc=this.ac.createOscillator(),gn=this.ac.createGain();
    osc.type=type;osc.frequency.setValueAtTime(Math.max(20,o.f||440),t);
    if(o.f2)osc.frequency.exponentialRampToValueAtTime(Math.max(20,o.f2),t+dur);
    gn.gain.setValueAtTime(0.0001,t);
    gn.gain.linearRampToValueAtTime(vol,t+att);
    gn.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    osc.connect(gn);gn.connect(o.dest||this.sfxg);
    osc.start(t);osc.stop(t+dur+0.05);
  },
  nz(t,o){ // noise hit {dur,vol,type,freq,q,dest}
    const dur=o.dur||0.1,vol=o.vol||0.3;
    const src=this.ac.createBufferSource();src.buffer=this.noise;src.loop=true;
    src.playbackRate.value=rand(0.96,1.04);
    const fl=this.ac.createBiquadFilter();fl.type=o.type||'highpass';
    fl.frequency.value=o.freq||4000;fl.Q.value=o.q||0.7;
    const gn=this.ac.createGain();
    gn.gain.setValueAtTime(0.0001,t);
    gn.gain.linearRampToValueAtTime(vol,t+0.003);
    gn.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    src.connect(fl);fl.connect(gn);gn.connect(o.dest||this.sfxg);
    src.start(t);src.stop(t+dur+0.05);
  },
  /* -- drum voices (routed to music bus) -- */
  kick(t,v){v=v||1;this.tone(t,{type:'sine',f:150,f2:42,dur:0.22,vol:0.85*v,dest:this.music,att:0.002});
    this.nz(t,{dur:0.02,vol:0.2*v,freq:1500,dest:this.music});},
  snare(t,v){v=v||1;this.nz(t,{dur:0.16,vol:0.45*v,type:'bandpass',freq:1800,q:0.8,dest:this.music});
    this.tone(t,{type:'triangle',f:225,f2:150,dur:0.1,vol:0.3*v,dest:this.music,att:0.002});},
  hat(t,v,open){v=v||1;this.nz(t,{dur:open?0.24:0.045,vol:0.2*v,freq:7200,dest:this.music});},
  clap(t,v){v=v||1;for(let i=0;i<3;i++)this.nz(t+i*0.012,{dur:0.045,vol:0.26*v,type:'bandpass',freq:1400,q:1.6,dest:this.music});
    this.nz(t+0.032,{dur:0.16,vol:0.22*v,type:'bandpass',freq:1600,q:1,dest:this.music});},
  tom(t,fq,v){v=v||1;this.tone(t,{type:'sine',f:fq||180,f2:(fq||180)*0.55,dur:0.26,vol:0.55*v,dest:this.music,att:0.002});},
  rim(t,v){v=v||1;this.tone(t,{type:'square',f:1750,dur:0.03,vol:0.14*v,dest:this.music,att:0.001});},
  crash(t,fq,v){v=v||1;this.nz(t,{dur:0.9,vol:0.22*v,freq:fq||5200,q:0.4,dest:this.music});},
  cowbell(t,v){v=v||1;this.tone(t,{type:'square',f:560,dur:0.11,vol:0.15*v,dest:this.music,att:0.001});
    this.tone(t,{type:'square',f:845,dur:0.08,vol:0.11*v,dest:this.music,att:0.001});},
  shaker(t,v){v=v||1;this.nz(t,{dur:0.06,vol:0.13*v,freq:9500,dest:this.music});},
  /* -- melodic voices -- */
  bass(t,semi,dur,v){v=v||1;const fq=55*Math.pow(2,(semi||0)/12);
    this.tone(t,{type:'sawtooth',f:fq,dur:dur||0.2,vol:0.3*v,dest:this.music,att:0.008});
    this.tone(t,{type:'square',f:fq/2,dur:(dur||0.2)*0.8,vol:0.16*v,dest:this.music,att:0.008});},
  lead(t,semi,dur,v,type){v=v||1;const fq=220*Math.pow(2,(semi||0)/12);
    this.tone(t,{type:type||'square',f:fq,dur:dur||0.15,vol:0.13*v,dest:this.music,att:0.004});},
  pad(t,semi,dur,v){v=v||1;const fq=110*Math.pow(2,(semi||0)/12);
    this.tone(t,{type:'triangle',f:fq,dur:dur||1.5,vol:0.11*v,dest:this.music,att:0.15});
    this.tone(t,{type:'triangle',f:fq*1.007,dur:dur||1.5,vol:0.09*v,dest:this.music,att:0.15});
    this.tone(t,{type:'triangle',f:fq*1.5,dur:(dur||1.5)*0.9,vol:0.05*v,dest:this.music,att:0.2});},
  blip(t,fq,v){this.tone(t,{type:'square',f:fq||440,dur:0.07,vol:v||0.3});},
  /* -- SFX (instant, at AE.now()) -- */
  sfxJudge(j){const t=this.now();
    if(j==='perfect'){this.tone(t,{f:1174,dur:0.08,vol:0.3});this.tone(t+0.045,{f:1760,dur:0.12,vol:0.26});}
    else if(j==='good'){this.tone(t,{f:880,dur:0.08,vol:0.24});}
    else if(j==='ok'){this.tone(t,{type:'triangle',f:420,dur:0.07,vol:0.18});}
    else{this.tone(t,{type:'sawtooth',f:130,f2:55,dur:0.22,vol:0.3});
      this.nz(t,{dur:0.12,vol:0.14,type:'lowpass',freq:500});}},
  gun(){const t=this.now(); // wheel-gun ratchet burst
    for(let i=0;i<6;i++)this.nz(t+i*0.013,{dur:0.018,vol:0.4,type:'bandpass',freq:2400+i*350,q:2.5});},
  clunk(){const t=this.now(); // wheel swap thunk
    this.tone(t,{type:'sine',f:120,f2:60,dur:0.12,vol:0.4});
    this.nz(t,{dur:0.05,vol:0.2,type:'lowpass',freq:900});},
  boost(){const t=this.now();
    this.tone(t,{type:'sawtooth',f:170,f2:950,dur:0.5,vol:0.26});
    this.nz(t,{dur:0.5,vol:0.16,freq:1300});},
  tick(){this.tone(this.now(),{f:210,dur:0.03,vol:0.07});},
  crowd(){const t=this.now(); // crowd cheer for a podium finish
    for(let i=0;i<40;i++)this.nz(t+rand(0,0.6),{dur:rand(0.05,0.15),vol:rand(0.05,0.15),
      type:'bandpass',freq:rand(1500,4000),q:1,dest:this.sfxg});},
  fanfare(){const t=this.now(); // mode-unlock celebration
    const notes=[0,4,7,12,16];
    notes.forEach((n,i)=>this.tone(t+i*0.09,{type:'square',f:440*Math.pow(2,n/12),dur:0.22,vol:0.22}));
    this.nz(t+0.4,{dur:0.4,vol:0.15,freq:3000});},
  milestone(){const t=this.now(); // combo milestone chime
    this.tone(t,{f:880,dur:0.1,vol:0.22});this.tone(t+0.06,{f:1108,dur:0.12,vol:0.2});
    this.tone(t+0.12,{f:1318,dur:0.16,vol:0.22});},
  /* -- engine drone (race modes) -- */
  engineStart(){
    if(this.engine||!this.ac)return;
    const o1=this.ac.createOscillator(),o2=this.ac.createOscillator();
    o1.type='sawtooth';o2.type='sawtooth';o1.frequency.value=60;o2.frequency.value=61.5;
    const fl=this.ac.createBiquadFilter();fl.type='lowpass';fl.frequency.value=850;fl.Q.value=1.2;
    const gn=this.g(0.0001);
    o1.connect(fl);o2.connect(fl);fl.connect(gn);gn.connect(this.out);
    o1.start();o2.start();
    this.engine={o1,o2,gn,fl};
  },
  engineSet(fq,vol){
    if(!this.engine)return;const t=this.now(),e=this.engine;
    e.o1.frequency.linearRampToValueAtTime(fq,t+0.06);
    e.o2.frequency.linearRampToValueAtTime(fq*1.011+1.2,t+0.06);
    e.fl.frequency.linearRampToValueAtTime(500+fq*4,t+0.06);
    e.gn.gain.linearRampToValueAtTime(vol,t+0.08);
  },
  engineStop(){
    if(!this.engine)return;const t=this.now(),e=this.engine;
    e.gn.gain.linearRampToValueAtTime(0.0001,t+0.15);
    e.o1.stop(t+0.3);e.o2.stop(t+0.3);this.engine=null;
  },
  /* -- morse key tone (starts/stops with key press) -- */
  morseOn(){
    if(this.morse||!this.ac)return;
    const o=this.ac.createOscillator();o.type='sine';o.frequency.value=600;
    const gn=this.g(0.0001);o.connect(gn);gn.connect(this.out);o.start();
    gn.gain.linearRampToValueAtTime(0.22,this.now()+0.01);
    this.morse={o,gn};
  },
  morseOff(){
    if(!this.morse)return;const t=this.now(),m=this.morse;
    m.gn.gain.linearRampToValueAtTime(0.0001,t+0.02);m.o.stop(t+0.1);this.morse=null;
  },
};

/* common drum pattern strings (16 steps per bar) */
const P={
  kick4:'x...x...x...x...',
  kickD:'x...x..xx...x.x.',
  snr:'....x.......x...',
  hat8:'x.x.x.x.x.x.x.x.',
  hat16:'xxxxxxxxxxxxxxxx',
  pitTom:'x.x.xx..x.x.xx..',
};

