/* STORE — reads/writes the player's save file in localStorage (key "boxboxbeat_v1").
 * Everything persistent lives here: points, unlocked modes, high scores, owned
 * shop items, equipped cosmetics, settings. Store.load() fills in sensible
 * defaults for any field that's missing or corrupted, so old saves never break
 * when a new field gets added. Scores is the small per-mode top-5 leaderboard.
 * Depends on: utils.js (for clamp). */
'use strict';
/* ================= STORAGE (safe against empty/corrupt localStorage) ================= */
const Store={
  key:'boxboxbeat_v1', data:null,
  load(){
    let d=null;
    try{d=JSON.parse(localStorage.getItem(this.key));}catch(e){d=null;}
    if(!d||typeof d!=='object')d={};
    d.points=Math.max(0,d.points|0);
    d.latency=(typeof d.latency==='number'&&isFinite(d.latency))?d.latency:null;
    d.difficulty=['rookie','pro','legend','champions'].includes(d.difficulty)?d.difficulty:'pro';
    d.lifetimePoints=Math.max(0,d.lifetimePoints|0);
    d.scores=(d.scores&&typeof d.scores==='object')?d.scores:{};
    d.raceBest=(typeof d.raceBest==='number')?d.raceBest:null;
    d.beaten=(d.beaten&&typeof d.beaten==='object')?d.beaten:{};
    d.progress=(d.progress&&typeof d.progress==='object')?d.progress:{};
    d.bestCombo=(d.bestCombo&&typeof d.bestCombo==='object')?d.bestCombo:{};
    d.plays=(d.plays&&typeof d.plays==='object')?d.plays:{};
    d.everFullCombo=!!d.everFullCombo;
    d.bestComboEver=Math.max(0,d.bestComboEver|0);
    d.printedShapes=Array.isArray(d.printedShapes)?d.printedShapes:[];
    d.champScores=Array.isArray(d.champScores)?d.champScores:[];
    d.champCompleted=!!d.champCompleted;
    d.practice=!!d.practice;
    d.volMusic=(typeof d.volMusic==='number'&&isFinite(d.volMusic))?clamp(d.volMusic,0,1):0.62;
    d.volSfx=(typeof d.volSfx==='number'&&isFinite(d.volSfx))?clamp(d.volSfx,0,1):0.9;
    d.owned=(d.owned&&typeof d.owned==='object')?d.owned:{};
    d.owned.livery=Array.isArray(d.owned.livery)?d.owned.livery:['red'];
    d.owned.helmet=Array.isArray(d.owned.helmet)?d.owned.helmet:['default'];
    d.owned.trail=Array.isArray(d.owned.trail)?d.owned.trail:['none'];
    d.owned.kitchen=Array.isArray(d.owned.kitchen)?d.owned.kitchen:['default'];
    d.cosmetics=(d.cosmetics&&typeof d.cosmetics==='object')?d.cosmetics:{};
    d.cosmetics.livery=d.cosmetics.livery||'red';
    d.cosmetics.helmet=d.cosmetics.helmet||'default';
    d.cosmetics.trail=d.cosmetics.trail||'none';
    d.cosmetics.kitchen=d.cosmetics.kitchen||'default';
    if(d.difficulty==='champions'&&(d.lifetimePoints||0)<CHAMPIONS_THRESHOLD)d.difficulty='pro';
    this.data=d; this.save();
  },
  save(){try{localStorage.setItem(this.key,JSON.stringify(this.data));}catch(e){}},
  addPoints(p){const v=Math.max(0,Math.round(p));this.data.points+=v;this.data.lifetimePoints=(this.data.lifetimePoints||0)+v;this.save();},
  reset(){try{localStorage.removeItem(this.key);}catch(e){} this.load();},
};
const Scores={
  list(id){const l=Store.data.scores[id];return Array.isArray(l)?l:[];},
  qualifies(id,score){if(!score||score<=0)return false;const l=this.list(id);
    return l.length<5||score>l[l.length-1].s;},
  add(id,initials,score){const l=this.list(id).slice();
    l.push({i:(initials||'???').toUpperCase().slice(0,3),s:Math.round(score)});
    l.sort((a,b)=>b.s-a.s);Store.data.scores[id]=l.slice(0,5);Store.save();},
};

