/* CHAMPIONSHIP — plays every unlocked mode back to back for one combined
 * season score. Reuses the normal results screen in a special recap mode
 * (Results.showChampionship) instead of a separate screen. Whatever difficulty
 * is selected in Settings is what plays throughout the season — this is also
 * why the main menu button shows the active difficulty next to its label.
 * Depends on: core/*.js, meta/modes.js. */
'use strict';
/* ================= CHAMPIONSHIP — play every unlocked mode back to back for a combined score ================= */
const Championship={
  active:false,queue:[],names:[],idx:0,results:[],totalScore:0,
  start(){
    const unlocked=MODES.filter((m,i)=>isUnlocked(i));
    this.queue=unlocked.map(m=>m.cls);this.names=unlocked.map(m=>m.name);
    this.idx=0;this.results=[];this.totalScore=0;this.active=true;
    Game.skipHowto=false;
    Game.start(this.queue[0]);
  },
  onGameDone(res){
    this.results.push({name:this.names[this.idx],score:res.score||0});
    this.totalScore+=res.score||0;
    this.idx++;
    Results.showChampionship();
  },
  next(){if(this.idx<this.queue.length)Game.start(this.queue[this.idx]);},
  finish(){ // save the season score and return to the menu
    this.active=false;
    Store.data.champCompleted=true;
    const l=Store.data.champScores.slice();
    l.push({i:'YOU',s:Math.round(this.totalScore)});
    l.sort((a,b)=>b.s-a.s);Store.data.champScores=l.slice(0,5);
    Store.save();
    UI.show('menu');
  },
};

