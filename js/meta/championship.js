/* CHAMPIONSHIP — plays every unlocked mode back to back for one combined
 * season score. Clicking the menu button first opens a garage-style lineup
 * screen (showLineup/renderLineup) previewing the season's running order,
 * exactly like the Arcade Garage grid, before start() actually begins play.
 * Reuses the normal results screen in a special recap mode
 * (Results.showChampionship) instead of a separate screen. Whatever difficulty
 * is selected in Settings is what plays throughout the season — this is also
 * why the lineup screen and the main menu button both show the active difficulty.
 * Depends on: core/*.js, meta/modes.js. */
'use strict';
/* ================= CHAMPIONSHIP — play every unlocked mode back to back for a combined score ================= */
const Championship={
  active:false,queue:[],names:[],idx:0,results:[],totalScore:0,
  buildQueue(){
    const unlocked=MODES.filter((m,i)=>isUnlocked(i));
    this.queue=unlocked.map(m=>m.cls);this.names=unlocked.map(m=>m.name);
    this.icons=unlocked.map(m=>m.icon);this.descs=unlocked.map(m=>m.desc);this.keys=unlocked.map(m=>m.keys);
  },
  // shown from the main menu — a garage-style preview of the season's running order before it actually starts
  showLineup(){
    this.buildQueue();
    $('#champ-lineup-diff').textContent='Playing on '+Store.data.difficulty.toUpperCase()+
      ' difficulty · '+this.queue.length+' races back to back for one combined season score';
    const grid=$('#champ-lineup-grid');grid.innerHTML='';
    this.names.forEach((name,i)=>{
      const card=document.createElement('div');
      card.className='card queued';
      card.innerHTML='<div class="order">RACE '+(i+1)+'</div><div class="icon">'+this.icons[i]+'</div>'+
        '<h3>'+name+'</h3><p>'+this.descs[i]+'</p><div class="meta">'+this.keys[i]+'</div>';
      grid.appendChild(card);
    });
    UI.show('champ-lineup');
  },
  start(){
    if(!this.queue.length)this.buildQueue(); // safety net if start() is ever called without visiting the lineup first
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

