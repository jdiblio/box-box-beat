/* BOOT + MAIN LOOP — this is the last script tag, and the only file that
 * actually kicks anything off. Sets up the canvas, defines the one
 * requestAnimationFrame loop every mode's update()/render() runs inside of, and
 * wires up every DOM button's onclick handler. The five calls at the very
 * bottom (Store.load(); Input.init(); wire(); sizeCanvas();
 * requestAnimationFrame(frame);) are what actually start the game.
 * Depends on: every other file — must load last. */
'use strict';
/* ================= SETTINGS ================= */
function refreshSettings(){
  for(const d of ['rookie','pro','legend','champions'])
    $('#diff-'+d).classList.toggle('sel',Store.data.difficulty===d);
  const unlocked=championsUnlocked();
  $('#diff-champions').classList.toggle('locked-diff',!unlocked);
  $('#champ-hint').classList.toggle('champ-locked-hint',!unlocked);
  $('#champ-hint').textContent=unlocked
    ?'CHAMPIONS — hardcore versions of every mode. You\'ve earned it.'
    :'🔒 CHAMPIONS unlocks at '+CHAMPIONS_THRESHOLD.toLocaleString()+' lifetime points — you have '+(Store.data.lifetimePoints||0).toLocaleString();
  const l=Store.data.latency;
  $('#set-latency').textContent='Current latency offset: '+
    (l===null?'not calibrated':Math.round(l*1000)+' ms');
  $('#vol-music').value=Math.round(Store.data.volMusic*100);
  $('#vol-sfx').value=Math.round(Store.data.volSfx*100);
  $('#b-practice').textContent='Practice Mode: '+(Store.data.practice?'ON (no game overs)':'OFF');
}

/* ================= BOOT + MAIN LOOP ================= */
const canvas=$('#game'),ctx2d=canvas.getContext('2d');
function sizeCanvas(){
  const dpr=Math.min(2,window.devicePixelRatio||1);
  W=window.innerWidth;H=window.innerHeight;
  canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
  ctx2d.setTransform(dpr,0,0,dpr,0,0);
}
let lastTs=0;
function frame(ts){
  requestAnimationFrame(frame);
  const dt=Math.min(0.05,(ts-lastTs)/1000||0.016);lastTs=ts;
  idleT+=dt;
  if(Game.mode&&!Game.paused&&!Game.frozen){
    if(Game.mode.cond)Game.mode.cond.update();
    Game.mode.update(dt);
  }
  FX.comboPulse=(Game.mode&&!Game.frozen&&Game.mode.session&&Game.mode.session.combo>=8&&Game.mode.cond)
    ?beatPulse(Game.mode.cond):0;
  if(Game.frozen){
    Game.outroT+=dt;FX.outroZoom=Math.min(1,Game.outroT/0.5);
    if(Game.outroT>0.5){
      Game.frozen=false;FX.outroZoom=0;
      const res=Game.outroRes;Game.outroRes=null;
      Game.stopMode();Game.paused=false;
      if(typeof Championship!=='undefined'&&Championship.active)Championship.onGameDone(res);
      else Results.show(res);
    }
  }
  if(Game.mode){
    ctx2d.save();FX.apply(ctx2d);
    Game.mode.render(ctx2d);
    ctx2d.restore();
    FX.update(dt);FX.render(ctx2d);
  }else{
    if(UI.active==='menu')renderMenuGrid(ctx2d);
    else renderIdle(ctx2d,dt);
    FX.update(dt);FX.render(ctx2d);
  }
}
const Boot={
  begin(){
    AE.init();
    if(Store.data.latency===null)Game.start(Calibration);
    else UI.show('menu');
  },
};
function wire(){
  $('#b-race').onclick=()=>Game.start(RaceWeekend);
  $('#b-garage').onclick=()=>UI.show('garage');
  $('#b-champ').onclick=()=>Championship.showLineup();
  $('#b-champ-lineup-start').onclick=()=>Championship.start();
  $('#b-champ-lineup-back').onclick=()=>UI.show('menu');
  $('#b-shop').onclick=()=>UI.show('shop');
  $('#b-stats').onclick=()=>UI.show('stats');
  $('#b-duel').onclick=()=>Game.start(DrumDuel);
  $('#b-controls').onclick=()=>UI.show('controls');
  $('#b-settings').onclick=()=>UI.show('settings');
  $('#b-garage-back').onclick=()=>UI.show('menu');
  $('#b-shop-back').onclick=()=>UI.show('menu');
  $('#b-stats-back').onclick=()=>UI.show('menu');
  $('#b-ctl-back').onclick=()=>UI.show('menu');
  $('#b-set-back').onclick=()=>UI.show('menu');
  $('#b-calib').onclick=()=>Game.start(Calibration);
  wireShop();
  for(const d of ['rookie','pro','legend'])
    $('#diff-'+d).onclick=()=>{Store.data.difficulty=d;Store.save();refreshSettings();};
  $('#diff-champions').onclick=()=>{
    if(!championsUnlocked()){ // locked — give a clear "denied" shake instead of silently doing nothing
      const b=$('#diff-champions');b.classList.remove('shake-deny');void b.offsetWidth;b.classList.add('shake-deny');
      const hint=$('#champ-hint');hint.classList.remove('shake-deny');void hint.offsetWidth;hint.classList.add('shake-deny');
      return;
    }
    Store.data.difficulty='champions';Store.save();refreshSettings();
  };
  $('#vol-music').addEventListener('input',e=>{
    Store.data.volMusic=e.target.value/100;Store.save();if(AE.music)AE.music.gain.value=Store.data.volMusic;
  });
  $('#vol-sfx').addEventListener('input',e=>{
    Store.data.volSfx=e.target.value/100;Store.save();if(AE.sfxg)AE.sfxg.gain.value=Store.data.volSfx;
  });
  $('#b-practice').onclick=()=>{Store.data.practice=!Store.data.practice;Store.save();refreshSettings();};
  $('#b-reset').onclick=e=>{
    const b=e.currentTarget;
    if(b.dataset.arm){Store.reset();delete b.dataset.arm;b.textContent='Reset All Progress';UI.show('menu');}
    else{b.dataset.arm='1';b.textContent='Click again to confirm reset';}
  };
  $('#b-resume').onclick=()=>Game.resume();
  $('#b-restart').onclick=()=>{UI.none();Game.restart();};
  $('#b-quit').onclick=()=>Game.quit();
  $('#b-retry').onclick=()=>Game.restart();
  $('#b-results-menu').onclick=()=>{Championship.active=false;UI.show('menu');};
  $('#b-champ-next').onclick=()=>Championship.next();
  $('#b-champ-done').onclick=()=>Championship.finish();
  $('#b-hs-save').onclick=()=>Results.saveInitials();
  $('#hs-initials').addEventListener('input',e=>{
    e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
  });
  $('#pausebtn').onclick=()=>Game.pause();
  $('#s-title').addEventListener('pointerdown',()=>Boot.begin());
  $('#s-howto').addEventListener('pointerdown',()=>Game.launch());
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&Game.mode&&!Game.paused)Game.pause();
  });
  window.addEventListener('resize',sizeCanvas);
}
Store.load();
Input.init();
wire();
sizeCanvas();
requestAnimationFrame(frame);
