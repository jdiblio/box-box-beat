/* FREESTYLE DRUM KIT — every key on the keyboard is a different drum sound.
 * Lessons teach classic patterns; free play is just a metronome and a canvas
 * full of drum pads. Champions adds two advanced 16th-note lessons and a Solo
 * Challenge that grades you on keeping the kick locked to the beat while you
 * improvise everything else. Depends on: core/*.js, art/backgrounds.js. */
'use strict';
/* ============================================================
   FREESTYLE DRUM KIT — every keyboard row is a drum voice.
   lessons with classic patterns, then free play + metronome.
   ============================================================ */
const DRUM_ROWS=['1234567890','QWERTYUIOP',"ASDFGHJKL;",'ZXCVBNM,./'];
const DRUM_ROWNAMES=['HATS + CYMBALS','TOMS','SNARES / CLAPS / RIMS','KICKS + PERCUSSION'];
const DRUM_ROWCOL=['#ffd400','#ff8a00','#00d2be','#e10600'];
const LESSONS=[
  {name:'ROCK BEAT',bpm:100,steps:[[0,'Z'],[2,'2'],[4,'A'],[6,'2'],[8,'Z'],[10,'2'],[12,'A'],[14,'2']]},
  {name:'FOUR ON THE FLOOR',bpm:120,steps:[[0,'Z'],[2,'5'],[4,'Z'],[6,'5'],[8,'Z'],[10,'5'],[12,'Z'],[14,'5']]},
  {name:'BOOM BAP',bpm:90,steps:[[0,'Z'],[4,'A'],[6,'Z'],[9,'Z'],[12,'A'],[14,'D']]},
  {name:'DISCO',bpm:118,steps:[[0,'Z'],[2,'5'],[4,'S'],[6,'5'],[7,'N'],[8,'Z'],[10,'5'],[12,'S'],[14,'5'],[15,'N']]},
];
const LESSONS_CHAMP=[ // Champions: real 16th-note grooves and offbeat hi-hats
  {name:'FUNK 16THS',bpm:104,steps:[[0,'Z'],[2,'2'],[3,'2'],[4,'A'],[6,'2'],[7,'2'],[8,'Z'],[9,'Z'],
    [10,'2'],[12,'A'],[14,'2'],[15,'2']]},
  {name:'OFFBEAT HATS',bpm:112,steps:[[0,'Z'],[1,'2'],[3,'2'],[4,'A'],[5,'2'],[7,'2'],[8,'Z'],[9,'2'],
    [11,'2'],[12,'A'],[13,'2'],[15,'2']]},
];
class DrumKit{
  constructor(){
    this.session=new Session();
    this.champ=Judge.champ();
    this.lessonList=LESSONS.concat(this.champ?LESSONS_CHAMP:[]);
    this.cond=new Conductor(100);
    this.track=new NoteTrack(this.cond);
    this.state='menu';this.metro=false;this.freeBpm=100;this.lit={};
    this.lesson=null;this.msg=null;this.over=false;
    this.kickBeatsHit=new Set();this.soloBars=16;
  }
  get touchKeys(){return[{k:'Z',label:'KICK'},{k:'A',label:'SNARE'},{k:'2',label:'HAT'},
    {k:'Q',label:'TOM'},{k:'7',label:'CRASH'},{k:'ENTER',label:'MENU'}];}
  start(){}
  rowOf(k){for(let r=0;r<4;r++)if(DRUM_ROWS[r].includes(k))return r;return -1;}
  playKey(k,t,v){
    v=v||1;const r=this.rowOf(k);if(r<0)return false;
    const i=DRUM_ROWS[r].indexOf(k);
    if(r===0){
      if(i<4)AE.hat(t,(0.7+i*0.15)*v,false);
      else if(i<6)AE.hat(t,1.1*v,true);
      else AE.crash(t,i<8?5200-(i-6)*800:7000+(i-8)*900,v*(i<8?1:0.7));
    }else if(r===1)AE.tom(t,320*Math.pow(0.82,i),v);
    else if(r===2){
      const kind=i%3;
      if(kind===0)AE.snare(t,v*(1-i*0.03));
      else if(kind===1)AE.clap(t,v);
      else AE.rim(t,v*1.6);
    }else{
      if(i<4)AE.tone(t,{type:'sine',f:165-i*14,f2:40-i*3,dur:0.24,vol:0.85*v,dest:AE.music,att:0.002});
      else if(i===4)AE.shaker(t,1.3*v);
      else if(i===5)AE.cowbell(t,v);
      else if(i===6)AE.tom(t,95,v);
      else if(i===7)AE.rim(t,1.6*v);
      else if(i===8)AE.clap(t,v);
      else AE.crash(t,5200,v);
    }
    return true;
  }
  startLesson(idx){
    this.lesson=this.lessonList[idx];this.state='lesson';
    this.track.clear();this.cond.bpm=this.lesson.bpm;
    for(let bar=0;bar<8;bar++)for(const st of this.lesson.steps)
      this.track.add({beat:4+bar*4+st[0]/4,key:st[1],kind:'drum'});
    this.lessonEnd=4+8*4;
    this.cond.patternFn=(s,t)=>{
      if(s%4===0)AE.blip(t,s%16===0?880:660,0.12);
      if(s>=16)for(const st of this.lesson.steps)if(st[0]===s%16)this.playKey(st[1],t,0.3);
    };
    this.cond.start(0.6);
  }
  startFree(){
    this.state='free';this.track.clear();
    this.cond.bpm=this.freeBpm;
    this.cond.patternFn=(s,t)=>{if(this.metro&&s%4===0)AE.blip(t,s%16===0?880:660,0.22);};
    this.cond.start(0.2);
  }
  startSolo(){ // Champions: improvise freely, but keep the kick on the beat
    this.state='solo';this.track.clear();
    this.cond.bpm=130;this.kickBeatsHit=new Set();this.soloEnd=4+this.soloBars*4;
    this.cond.patternFn=(s,t)=>{if(s%4===0)AE.blip(t,s%16===0?880:660,0.15);};
    this.cond.start(0.6);
  }
  flash(s,c){this.msg={s,t:1.6,c:c||'#ffd400'};}
  update(dt){
    for(const k in this.lit)this.lit[k]=Math.max(0,this.lit[k]-dt*5);
    if(this.msg){this.msg.t-=dt;if(this.msg.t<=0)this.msg=null;}
    if(this.state==='lesson'){
      const now=Game.judgedNow();
      this.track.sweep(now,Judge.win().ok,n=>Game.missAt(W*0.25,this.laneY(this.rowOf(n.key))));
      if(this.cond.beat>this.lessonEnd+1){
        const total=this.track.notes.length;
        const hit=this.track.notes.filter(n=>n.judged&&!n.missed).length;
        const pct=total?Math.round(hit/total*100):0;
        this.session.score+=pct*2;
        this.flash(this.lesson.name+': '+pct+'% — NICE!',pct>=80?'#00d2be':'#ffd400');
        this.state='menu';this.cond.stop();
      }
    }else if(this.state==='solo'&&this.cond.beat>this.soloEnd){
      const totalBeats=this.soloBars*4;
      const pct=Math.round(this.kickBeatsHit.size/totalBeats*100);
      this.session.score+=pct*3;
      this.flash('SOLO COMPLETE: '+pct+'% KICKS ON BEAT',pct>=80?'#00d2be':'#ffd400');
      this.state='menu';this.cond.stop();
    }
  }
  laneY(r){return H*0.14+r*H*0.08;}
  onKeyDown(k,t){
    if(this.state==='menu'){
      if(k==='1')this.startFree();
      else if(k>='2'&&k<='5')this.startLesson(+k-2);
      else if(this.champ&&k==='6')this.startLesson(4);
      else if(this.champ&&k==='7')this.startLesson(5);
      else if(this.champ&&k==='8')this.startSolo();
      else if((this.champ&&k==='9')||(!this.champ&&k==='6'))this.finish();
      return;
    }
    if(k==='ENTER'){this.state='menu';this.cond.stop();AE.morseOff();return;}
    if(this.state==='free'){
      if(k==='M'){this.metro=!this.metro;if(this.metro)this.startFree();this.flash('METRONOME '+(this.metro?'ON':'OFF'));return;}
      if(k==='-'||k==='='){
        this.freeBpm=clamp(this.freeBpm+(k==='='?5:-5),60,200);
        this.cond.setBpm(this.freeBpm);this.flash(this.freeBpm+' BPM');return;
      }
    }
    if(this.playKey(k,AE.now(),1)){
      this.lit[k]=1;
      if(this.state==='lesson'){
        const n=this.track.hit(k,t,Judge.win().ok);
        if(n)Game.hit(n.delta,W*0.25,this.laneY(this.rowOf(k)),85);
      }else if(this.state==='solo'&&['Z','X','C','V'].includes(k)){
        const bp=this.cond.timeToBeat(t),nearest=Math.round(bp);
        if(Math.abs(bp-nearest)<0.15&&nearest>=4&&!this.kickBeatsHit.has(nearest)){
          this.kickBeatsHit.add(nearest);
          FX.text(W/2,H*0.3,'ON BEAT!','#00d2be');FX.kick(1.5);
        }
      }
    }
  }
  finish(){
    if(this.over)return;this.over=true;this.cond.stop();
    const s=this.session;
    Game.endMode({
      modeId:'drums',title:'FREESTYLE DRUM KIT',
      grade:s.score>0?'SESSION SAVED':'JAM OVER',gradeColor:'#ffd400',
      score:s.score,points:Math.round(s.score/20),
      fullCombo:s.counts.miss===0,bestCombo:s.maxCombo,
      rows:[['Lesson accuracy',s.accuracy.toFixed(1)+'%'],['Max combo',s.maxCombo]],
    });
  }
  render(ctx){
    bgStage(ctx);
    if(this.state==='menu'){
      ctx.textAlign='center';ctx.fillStyle='#eef1f6';ctx.font=f(30);
      ctx.fillText(this.champ?'FREESTYLE DRUM KIT — CHAMPIONS':'FREESTYLE DRUM KIT',W/2,H*0.16);
      const opts=['1 · FREE PLAY','2 · LESSON: ROCK BEAT','3 · LESSON: FOUR ON THE FLOOR',
        '4 · LESSON: BOOM BAP','5 · LESSON: DISCO'];
      if(this.champ)opts.push('6 · LESSON: FUNK 16THS','7 · LESSON: OFFBEAT HATS','8 · SOLO CHALLENGE');
      opts.push((this.champ?'9':'6')+' · FINISH & SAVE SCORE');
      ctx.font=f(Math.min(19,W*0.024+8));
      opts.forEach((o,i)=>{ctx.fillStyle=i===opts.length-1?'#00d2be':(this.champ&&i>=5&&i<=7)?'#ff8a00':'#eef1f6';
        ctx.fillText(o,W/2,H*0.24+i*H*0.058);});
      ctx.fillStyle='#8b94a7';ctx.font=f(13,600);
      ctx.fillText('score in lessons to bank points · every key is a drum',W/2,H*0.72);
      if(this.msg){ctx.fillStyle=this.msg.c;ctx.font=f(22);ctx.fillText(this.msg.s,W/2,H*0.8);}
      this.renderPads(ctx,H*0.86,0.6);
      return;
    }
    if(this.state==='solo'){
      const p=beatPulse(this.cond),barsLeft=Math.max(0,Math.ceil((this.soloEnd-this.cond.beat)/4));
      ctx.textAlign='center';ctx.fillStyle='#ff8a00';ctx.font=f(22,800);
      ctx.fillText('SOLO CHALLENGE — IMPROVISE FREELY, KEEP THE KICK ON BEAT',W/2,H*0.08);
      ctx.beginPath();ctx.arc(W/2,H*0.22,26+p*8,0,6.283);
      ctx.strokeStyle='rgba(255,138,0,'+(0.4+p*0.5)+')';ctx.lineWidth=4;ctx.stroke();
      ctx.fillStyle='#eef1f6';ctx.font=f(15,700);
      ctx.fillText(barsLeft+' BARS LEFT · '+this.kickBeatsHit.size+' KICKS ON BEAT',W/2,H*0.3);
      if(this.msg){ctx.globalAlpha=clamp(this.msg.t/0.4,0,1);
        ctx.fillStyle=this.msg.c;ctx.font=f(24);ctx.fillText(this.msg.s,W/2,H*0.4);ctx.globalAlpha=1;}
      this.renderPads(ctx,H*0.6,1);
      drawHUD(ctx,this,'Z X C V = kick — hit one right on every beat, then improvise anything else');
      return;
    }
    if(this.state==='lesson'){
      const now=Game.judgedNow();
      ctx.textAlign='center';ctx.fillStyle='#ffd400';ctx.font=f(18);
      ctx.fillText(this.lesson.name+' · '+this.cond.bpm+' BPM · bar '+clamp(Math.floor((this.cond.beat-4)/4)+1,1,8)+'/8',W/2,H*0.06);
      for(let r=0;r<4;r++){
        const y=this.laneY(r);
        ctx.strokeStyle='#242b3a';ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
        const p=beatPulse(this.cond);
        ctx.beginPath();ctx.arc(W*0.25,y,15+p*3,0,6.283);
        ctx.strokeStyle='rgba(238,241,246,'+(0.25+p*0.4)+')';ctx.lineWidth=2;ctx.stroke();
      }
      for(const n of this.track.notes){
        if(n.judged&&!n.missed)continue;
        const x=W*0.25+(this.cond.beatToTime(n.beat)-now)/this.cond.spb*W*0.14;
        if(x<-20||x>W+20)continue;
        const r=this.rowOf(n.key),y=this.laneY(r);
        ctx.beginPath();ctx.arc(x,y,13,0,6.283);
        ctx.fillStyle=n.missed?'rgba(225,6,0,.4)':DRUM_ROWCOL[r];ctx.fill();
        ctx.fillStyle='#0b0d12';ctx.font=f(12);ctx.textAlign='center';ctx.fillText(n.key,x,y+4);
      }
      drawCount(ctx,this.cond.beat); // lesson notes start at beat 4, right on 'GO'
    }else{ // free play
      ctx.textAlign='center';ctx.fillStyle='#eef1f6';ctx.font=f(24);
      ctx.fillText('FREE PLAY',W/2,H*0.1);
      ctx.fillStyle='#8b94a7';ctx.font=f(13,600);
      ctx.fillText('M metronome ('+(this.metro?'ON · '+this.freeBpm+' BPM':'off')+') · - / = tempo · ENTER kit menu',W/2,H*0.15);
      if(this.metro){const p=beatPulse(this.cond);
        ctx.beginPath();ctx.arc(W/2,H*0.24,10+p*14,0,6.283);
        ctx.fillStyle='rgba(255,212,0,'+(0.15+p*0.5)+')';ctx.fill();}
    }
    if(this.msg&&this.state!=='menu'){
      ctx.textAlign='center';ctx.globalAlpha=clamp(this.msg.t/0.4,0,1);
      ctx.fillStyle=this.msg.c;ctx.font=f(22);ctx.fillText(this.msg.s,W/2,H*0.32);ctx.globalAlpha=1;
    }
    this.renderPads(ctx,H*0.5,1);
    drawHUD(ctx,this,this.state==='lesson'?'follow the pattern — ENTER to quit lesson':'every row is a different drum');
  }
  renderPads(ctx,topY,scale){
    const kw=Math.min(W*0.088,46*scale),kh=kw*0.86,gap=4;
    for(let r=0;r<4;r++){
      const row=DRUM_ROWS[r],total=row.length*(kw+gap);
      let x=W/2-total/2+r*kw*0.3;
      const y=topY+r*(kh+gap+2);
      if(scale>=1){ctx.textAlign='left';ctx.fillStyle=DRUM_ROWCOL[r];ctx.font=f(10,700);
        ctx.fillText(DRUM_ROWNAMES[r],x,y-4);}
      for(const k of row){
        const lit=this.lit[k]||0;
        ctx.beginPath();ctx.roundRect(x,y,kw,kh,5);
        ctx.fillStyle=lit>0?DRUM_ROWCOL[r]:'#171c28';
        ctx.globalAlpha=lit>0?0.35+lit*0.65:1;ctx.fill();ctx.globalAlpha=1;
        ctx.strokeStyle='#242b3a';ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle=lit>0?'#0b0d12':'#8b94a7';ctx.font=f(12);ctx.textAlign='center';
        ctx.fillText(k,x+kw/2,y+kh/2+4);
        x+=kw+gap;
      }
    }
  }
}

