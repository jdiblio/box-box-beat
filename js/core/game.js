/* GAME SHELL — the traffic controller that every mode plugs into. Game.start()
 * shows a mode's how-to-play screen then constructs it; Game.endMode() freezes
 * the screen and zooms in for a beat before showing results (or, mid-championship,
 * handing off to Championship.onGameDone). Game.hit()/missAt() are what a mode
 * calls on every judged note — they update score/combo and trigger FX/audio in
 * one place. App.key() is the single keyboard router for the whole game.
 * Depends on: utils.js, store.js, audio.js, conductor.js, fx.js, ui.js, input.js. */
'use strict';
/* ================= GAME SHELL ================= */
const Game={
  mode:null,ModeClass:null,args:[],paused:false,pending:null,skipHowto:false,
  frozen:false,outroT:0,outroRes:null,
  judgedNow(){return AE.now()-(Store.data.latency||0);},
  start(MC,...args){
    AE.init();
    if(!this.skipHowto){ // show the how-to-play screen first
      const info=howtoInfo(MC);
      if(info){this.pending={MC,args};showHowto(info);return;}
    }
    this.skipHowto=false;
    triggerWipe(()=>{
      this.ModeClass=MC;this.args=args;
      UI.none();FX.reset();this.paused=false;
      this.mode=new MC(...args);
      Touch.build(this.mode.touchKeys||[]);
      $('#pausebtn').style.display='block';
      this.mode.start();
    });
  },
  launch(){ // called when the how-to screen is dismissed
    if(!this.pending)return;
    const p=this.pending;this.pending=null;this.skipHowto=true;
    this.start(p.MC,...p.args);
  },
  pause(){
    if(!this.mode||this.paused)return;
    this.paused=true;if(AE.ac)AE.ac.suspend();
    UI.show('pause');
  },
  resume(){
    if(!this.paused)return;
    this.paused=false;UI.none();if(AE.ac)AE.ac.resume();
  },
  stopMode(){
    if(this.mode&&this.mode.destroy)this.mode.destroy();
    this.mode=null;AE.engineStop();AE.morseOff();
    Touch.build([]);$('#pausebtn').style.display='none';
    if(AE.ac&&AE.ac.state==='suspended')AE.ac.resume();
  },
  restart(){const MC=this.ModeClass,a=this.args;this.stopMode();this.paused=false;this.skipHowto=true;this.start(MC,...a);},
  quit(){this.stopMode();this.paused=false;if(typeof Championship!=='undefined')Championship.active=false;UI.show('menu');},
  // freeze the final frame and zoom in for a beat before actually ending — the "big finish" moment
  endMode(res){
    if(this.frozen)return;
    this.frozen=true;this.outroT=0;this.outroRes=res;
    FX.boom(0.25);FX.kick(3);
  },
  // shared judgment application: score + fx + sfx in one call
  hit(delta,x,y,base){
    const j=Judge.judge(delta)||'miss';
    const beforeCombo=this.mode.session.combo;
    this.mode.session.addJudge(j,base);
    const s=this.mode.session;
    FX.judge(x,y,j);AE.sfxJudge(j);
    if(j==='perfect'){FX.burst(x,y,JCOL.perfect,12);FX.kick(2.5);FX.boom(0.09);FX.ring(x,y,JCOL.perfect);trailBurst(x,y);}
    else if(j==='good')FX.burst(x,y,JCOL.good,6);
    else if(j==='miss')FX.kick(1.2);
    if(j!=='miss'){
      const labels={10:'ON FIRE!',25:'BLAZING!',50:'UNSTOPPABLE!',100:'LEGENDARY!!'};
      for(const m of [10,25,50,100]){
        if(beforeCombo<m&&s.combo>=m){
          FX.text(W/2,H*0.3,labels[m]+' — '+m+' COMBO',JCOL.perfect);
          FX.boom(0.3);FX.kick(5);AE.milestone();
        }
      }
    }
    return j;
  },
  missAt(x,y){this.mode.session.addJudge('miss');FX.judge(x,y,'miss');AE.sfxJudge('miss');FX.kick(1.2);},
};

/* central key router */
const App={
  key(k){
    if(UI.active==='title'){Boot.begin();return;}
    if(UI.active==='howto'){
      if(k==='ESC'){Game.pending=null;UI.show('menu');}
      else Game.launch();
      return;
    }
    if(Game.mode&&!Game.paused&&UI.active===null){
      if(k==='ESC'){Game.pause();return;}
      if(k==='R'&&!Game.frozen&&Game.mode.constructor!==DrumKit){Game.restart();return;}
      Game.mode.onKeyDown(k,Game.judgedNow());return;
    }
    if(UI.active){
      if(k==='ESC'){
        if(UI.active==='pause'){Game.resume();return;}
        const back=document.querySelector('#s-'+UI.active+' .btn-back');
        if(back)back.click();
        return;
      }
      if(/^[1-9]$/.test(k)){const b=UI.buttons()[+k-1];if(b)b.click();}
    }
  },
  keyUp(k){
    if(Game.mode&&!Game.paused&&UI.active===null&&Game.mode.onKeyUp)
      Game.mode.onKeyUp(k,Game.judgedNow());
  },
};

