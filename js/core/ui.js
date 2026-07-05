/* UI — swaps which DOM ".screen" is visible (menu, garage, settings, etc.),
 * always through the checkered-flag wipe transition so the old screen is fully
 * covered before the new one appears underneath it. Results renders the
 * post-game results screen, including the special Championship recap variant.
 * drawHUD/drawCount/beatPulse are small canvas helpers every game mode calls.
 * Depends on: utils.js, store.js, fx.js (for the wipe/confetti helpers). */
'use strict';
/* ================= UI — DOM screen manager ================= */
const UI={
  active:'title',
  show(id){
    // swap the actual screen at the moment the wipe fully covers it, so the old
    // screen never "shows through" behind an animation that's still sliding in
    triggerWipe(()=>{
      document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
      const el=$('#s-'+id);if(el)el.classList.add('on');
      this.active=id;
      if(id==='menu'){
        $('#menu-points').textContent=Store.data.points+' PTS';
        const tag=$('#champ-diff-tag'),onChamp=Store.data.difficulty==='champions';
        tag.textContent=onChamp?'CHAMPIONS MODE':Store.data.difficulty.toUpperCase();
        tag.classList.toggle('champ-on',onChamp);
      }
      if(id==='garage')buildGarage();
      if(id==='settings')refreshSettings();
      if(id==='shop')buildShop();
      if(id==='stats')buildStats();
      this.number(el);
    });
  },
  none(){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));this.active=null;},
  number(el){ // little 1-9 chips so menus are fully keyboard driven
    if(!el)return;
    const btns=[...el.querySelectorAll('.btn,.card')].filter(b=>!b.classList.contains('hidden'));
    btns.forEach((b,i)=>{
      let chip=b.querySelector('.knum');
      if(b.querySelector('.star')||b.querySelector('.order')){if(chip)chip.remove();return;} // that corner's already got a badge
      if(!chip){chip=document.createElement('span');chip.className='knum';b.appendChild(chip);}
      chip.textContent=i<9?String(i+1):'';
    });
  },
  buttons(){
    if(!this.active)return[];
    const el=$('#s-'+this.active);if(!el)return[];
    return [...el.querySelectorAll('.btn,.card')].filter(b=>!b.classList.contains('hidden'));
  },
};

/* ================= RESULTS + HIGH SCORES ================= */
/* screen-transition + celebration helpers, used by UI/Game/Results/Championship */
function triggerWipe(mid){
  // the checkered flag fully covers the screen at the animation's 50% mark (250ms into
  // the 500ms wipe) — that's the instant the actual content swap must happen, so the
  // old screen is hidden by then and the new one is already in place as it slides away
  const w=$('#wipe');
  if(!w){if(mid)mid();return;}
  w.classList.remove('go');void w.offsetWidth;w.classList.add('go');
  if(mid)setTimeout(mid,250);
}
const CONFETTI_EMOJI=['🎉','🏁','⭐','🔧','🎊'];
function spawnConfetti(container){
  for(let i=0;i<26;i++){
    const s=document.createElement('span');
    s.className='confetti-piece';s.textContent=choice(CONFETTI_EMOJI);
    s.style.left=rand(0,100)+'%';
    s.style.animationDuration=rand(1.4,2.4)+'s';
    s.style.animationDelay=rand(0,0.4)+'s';
    s.style.fontSize=rand(14,26)+'px';
    document.body.appendChild(s);
    setTimeout(()=>s.remove(),3000);
  }
}
const Results={
  res:null,saved:false,
  show(res){
    this.res=res;
    this.saved=false; // a genuinely new run — the save button is live again (see saveInitials())
    const saveBtn=$('#b-hs-save');
    saveBtn.disabled=false;saveBtn.textContent='Save';saveBtn.classList.remove('saved-disabled');
    Store.addPoints(res.points||0);
    if(res.modeId){ // aggregate stats for the Stats/Achievements screen
      Store.data.plays[res.modeId]=(Store.data.plays[res.modeId]||0)+1;
      if(res.bestCombo!==undefined){
        Store.data.bestCombo[res.modeId]=Math.max(Store.data.bestCombo[res.modeId]||0,res.bestCombo);
        Store.data.bestComboEver=Math.max(Store.data.bestComboEver,res.bestCombo);
      }
      if(res.fullCombo)Store.data.everFullCombo=true;
    }
    // legacy points-based unlocks (grandfathered from before the beat-the-level chain)
    const newlyPoints=MODES.filter(m=>m.cost>0&&m.cost<=Store.data.points&&m.cost>Store.data.points-(res.points||0));
    // beat-the-level unlock chain
    let newlyGoalMode=null;
    if(res.modeId&&MODE_GOALS[res.modeId]&&res.goalValue!==undefined){
      const g=MODE_GOALS[res.modeId],prevBest=Store.data.progress[res.modeId];
      if(prevBest===undefined||res.goalValue>prevBest)Store.data.progress[res.modeId]=res.goalValue;
      if(res.goalValue>=g.target&&!Store.data.beaten[res.modeId]){
        Store.data.beaten[res.modeId]=true;
        const idx=MODES.findIndex(m=>m.id===res.modeId);
        if(idx>=0&&idx+1<MODES.length)newlyGoalMode=MODES[idx+1];
      }
    }
    Store.save();
    const box=$('#results-box');
    let h='<h2>'+res.title+'</h2>';
    if(res.grade)h+='<div class="grade" style="color:'+(res.gradeColor||'#fff')+'">'+res.grade+'</div>';
    if(res.fullCombo)h+='<div class="fc-badge">✨ FULL COMBO ✨</div>';
    h+='<div class="bigscore">'+Math.round(res.score).toLocaleString()+'</div>';
    h+='<table class="stat-table">';
    for(const r of (res.rows||[]))h+='<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>';
    h+='</table>';
    if(res.points)h+='<div class="ptsline">+'+res.points+' PTS &middot; TOTAL '+Store.data.points+'</div>';
    for(const m of newlyPoints)h+='<div class="unlockline">NEW MODE UNLOCKED: '+m.name+'</div>';
    if(newlyGoalMode)h+='<div class="unlock-celebrate">🏆 NEW MODE UNLOCKED!<br>'+newlyGoalMode.icon+' '+newlyGoalMode.name+'</div>';
    h+=this.hsHtml(res.modeId);
    box.innerHTML=h;
    if(newlyGoalMode){spawnConfetti(box);AE.fanfare();}
    $('#b-retry').classList.remove('hidden');$('#b-results-menu').classList.remove('hidden');
    $('#b-champ-next').classList.add('hidden');$('#b-champ-done').classList.add('hidden');
    const entry=$('#hs-entry');
    if(res.modeId&&Scores.qualifies(res.modeId,res.score)){
      entry.classList.remove('hidden');$('#hs-initials').value='';
      setTimeout(()=>$('#hs-initials').focus(),50);
    }else entry.classList.add('hidden');
    UI.show('results');
  },
  // championship recap screen: reuses #s-results with a running standings table instead of the normal buttons
  showChampionship(){
    const box=$('#results-box'),done=Championship.idx>=Championship.queue.length;
    let h='<h2>'+(done?'SEASON <span class="accent">COMPLETE</span>':'RACE '+Championship.idx+' OF '+Championship.queue.length+' DONE')+'</h2>';
    h+='<div class="bigscore">'+Math.round(Championship.totalScore).toLocaleString()+'</div>';
    h+='<div class="ptsline">SEASON TOTAL</div>';
    h+='<table class="stat-table">';
    Championship.results.forEach((r,i)=>h+='<tr><td>'+(i+1)+'. '+r.name+'</td><td>'+r.score.toLocaleString()+'</td></tr>');
    h+='</table>';
    if(!done)h+='<div class="ptsline">NEXT UP: '+Championship.names[Championship.idx]+'</div>';
    else{
      h+='<div class="unlock-celebrate">🏆 SEASON COMPLETE!<br>FINAL SCORE '+Math.round(Championship.totalScore).toLocaleString()+'</div>';
      const l=Store.data.champScores;
      if(l.length)h+='<div class="hslist">SEASON BEST: '+l.map(e=>'<b>'+e.i+'</b> '+e.s.toLocaleString()).join(' &middot; ')+'</div>';
    }
    box.innerHTML=h;
    if(done){spawnConfetti(box);AE.fanfare();}
    $('#hs-entry').classList.add('hidden');
    $('#b-retry').classList.add('hidden');$('#b-results-menu').classList.add('hidden');
    $('#b-champ-next').classList.toggle('hidden',done);
    $('#b-champ-done').classList.toggle('hidden',!done);
    UI.show('results');
  },
  hsHtml(id){
    const l=Scores.list(id);if(!l.length)return'';
    let h='<div class="hslist">BEST: ';
    h+=l.map(e=>'<b>'+e.i+'</b> '+e.s.toLocaleString()).join(' &middot; ');
    return h+'</div>';
  },
  saveInitials(){
    if(!this.res||this.saved)return; // one save per run — repeat clicks are ignored once saved
    const v=($('#hs-initials').value||'ACE').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3)||'ACE';
    Scores.add(this.res.modeId,v,this.res.score);
    this.saved=true;
    const btn=$('#b-hs-save');
    btn.disabled=true;btn.textContent='Saved';btn.classList.add('saved-disabled');
    // patch just the best-scores line in place — no re-render, so points/unlocks aren't re-awarded
    const list=$('#results-box .hslist'),html=this.hsHtml(this.res.modeId);
    if(list)list.outerHTML=html;
    else if(html)$('#results-box').insertAdjacentHTML('beforeend',html);
  },
};

/* ================= SHARED DRAW HELPERS ================= */
function drawHUD(ctx,mode,label){
  const s=mode.session;
  ctx.textAlign='left';ctx.fillStyle='#eef1f6';ctx.font=f(22);
  ctx.fillText(Math.round(s.score).toLocaleString(),16,32);
  ctx.font=f(11,700);ctx.fillStyle='#8b94a7';ctx.fillText('SCORE',16,46);
  ctx.textAlign='right';ctx.fillStyle='#eef1f6';ctx.font=f(22);
  ctx.fillText(s.accuracy.toFixed(1)+'%',W-16,32);
  ctx.font=f(11,700);ctx.fillStyle='#8b94a7';ctx.fillText('ACCURACY',W-16,46);
  if(s.combo>=4){
    ctx.textAlign='center';ctx.fillStyle='#ffd400';ctx.font=f(26);
    ctx.fillText(s.combo+' COMBO',W/2,36);
    ctx.font=f(11,700);ctx.fillStyle='#8b94a7';ctx.fillText('x'+s.mult.toFixed(2),W/2,50);
  }
  if(label){ctx.textAlign='center';ctx.fillStyle='#8b94a7';ctx.font=f(12,700);ctx.fillText(label,W/2,H-10);}
}
function drawCount(ctx,beat){
  if(beat<0.2||beat>=5.5)return;
  const s=beat<1?'READY':beat<4?String(4-Math.floor(beat)):'GO!';
  const ph=1-(beat%1);
  ctx.textAlign='center';ctx.globalAlpha=beat>=4?clamp(5.5-beat,0,1):1;
  ctx.fillStyle=s==='GO!'?'#00d2be':'#ffd400';
  ctx.font=f(Math.round(70+ph*30));
  ctx.fillText(s,W/2,H*0.42);
  ctx.globalAlpha=1;
}
function beatPulse(cond){const b=cond.beat;return b<0?0:1-(b%1);} // 1 on the beat, decays

