/* RACE WEEKEND — the flagship mode, free from the start. Three laps built as a
 * timeline of sections (drive/overtake/pit) with a shift-on-the-redline rhythm
 * game running through all of it. The first time overtake or pit shows up, a
 * small reminder card fades in on top of normal gameplay (it never blocks
 * input — see renderReminder). Depends on: core/*.js, art/backgrounds.js, art/cars.js. */
'use strict';
/* ============================================================
   RACE WEEKEND — the race is the song.
   drive: SPACE on the redline · pit: QWAS 3-hit wheel patterns ·
   overtake: hold SPACE through the sustain, then tap the pass.
   ============================================================ */
const WHEEL_KEYS=['Q','W','A','S']; // FL FR RL RR
class RaceWeekend{
  constructor(){
    this.session=new Session();
    this.lapBpm=[126,134,142].map(b=>Math.round(b*Judge.bpmMul()));
    this.cond=new Conductor(this.lapBpm[0]);
    this.track=new NoteTrack(this.cond);
    this.sections=[];this.raceTime=0;this.timeDelta=0;
    this.gear=1;this.rev=0.3;this.speed=0;this.lockout=0;
    this.holdState=null;this.holdDone=false;this.passHits=0;
    this.pitJ={miss:0,ok:0,n:0};this.curLap=-1;this.prevSecId=-1;
    this.msg=null;this.over=false;this.roadOff=0;this.flameT=0;
    this.isNight=Math.random()<0.25;this.announced=false;
    this.reminder=null;this.shownReminder={overtake:false,pit:false};
  }
  get touchKeys(){return[
    {k:'Q',label:'Q'},{k:'W',label:'W'},
    {k:'SPACE',label:'SHIFT / HOLD',big:true},
    {k:'A',label:'A'},{k:'S',label:'S'}];}
  start(){
    this.buildChart();
    AE.engineStart();
    this.cond.patternFn=(s,t)=>this.music(s,t);
    this.cond.start(0.6);
  }
  buildChart(){
    let b=8;const S=this.sections,T=this.track;
    const drive=(n,lap)=>{
      const st=b;
      for(let i=0;i<n;i++)T.add({beat:b+2+i*2,key:'SPACE',kind:'shift'});
      b=b+2+n*2;S.push({type:'drive',start:st,end:b,lap});
    };
    const overtake=lap=>{
      const st=b;
      T.add({beat:st+2,key:'SPACE',kind:'hold',holdBeats:6});
      for(let i=0;i<3;i++)T.add({beat:st+10+i,key:'SPACE',kind:'pass'});
      b=st+14;S.push({type:'overtake',start:st,end:b,lap});
    };
    const pit=lap=>{
      const st=b;
      for(let w=0;w<4;w++)for(let h=0;h<3;h++)
        T.add({beat:st+4+w*2+h*0.5,key:WHEEL_KEYS[w],kind:'pit',wheel:w,hi:h});
      b=st+16;S.push({type:'pit',start:st,end:b,lap});
    };
    for(let lap=0;lap<3;lap++){
      S.push({type:'lap',start:b,end:b,lap});
      drive(8,lap);overtake(lap);drive(lap===2?10:8,lap);
      if(lap<2)pit(lap);
    }
    this.finishBeat=b+2;
    S.push({type:'finish',start:b,end:this.finishBeat,lap:2});
  }
  // reminder card shown the first time a section type appears — drawn ON TOP of normal
  // gameplay (never blocks input, never touches chart timing) and fades on its own.
  renderReminder(ctx){
    const r=this.reminder;if(!r)return;
    const TITLE={overtake:'OVERTAKE INCOMING',pit:'PIT STOP INCOMING'};
    const BODY={overtake:'HOLD SPACE THROUGH THE TOW — THEN TAP TAP TAP TO PASS',
      pit:'Q W A S — HIT EACH WHEEL 3x: GUN OFF · SWAP · GUN ON'};
    const elapsed=r.total-r.t,fadeIn=clamp(elapsed/0.4,0,1),fadeOut=clamp(r.t/0.4,0,1);
    ctx.save();ctx.globalAlpha=Math.min(fadeIn,fadeOut);
    const w2=Math.min(560,W*0.86),h2=Math.min(96,H*0.16),x=W/2-w2/2,y=H*0.13;
    ctx.fillStyle='rgba(8,10,18,.82)';
    ctx.beginPath();ctx.roundRect(x,y,w2,h2,14);ctx.fill();
    ctx.strokeStyle='#ffd400';ctx.lineWidth=2;ctx.stroke();
    ctx.textAlign='center';
    ctx.fillStyle='#ffd400';ctx.font=f(Math.min(24,W*0.03),900);
    ctx.fillText(TITLE[r.type]||'GET READY',W/2,y+32);
    ctx.fillStyle='#00d2be';ctx.font=f(Math.min(15,W*0.019),800);
    ctx.fillText(BODY[r.type]||'',W/2,y+62);
    ctx.restore();
  }
  sectionAt(beat){for(const s of this.sections)if(s.type!=='lap'&&beat>=s.start&&beat<s.end)return s;return null;}
  lapAt(beat){let l=0;for(const s of this.sections)if(s.type==='lap'&&beat>=s.start)l=s.lap;return l;}
  flash(s,c){this.msg={s,t:1.4,c:c||'#ffd400'};}
  wheelPos(w){
    const cx=W/2,cy=H*0.5,dx=Math.min(95,W*0.18),dy=Math.min(110,H*0.17);
    return{x:cx+(w%2?dx:-dx),y:cy+(w>1?dy:-dy)};
  }
  update(dt){
    if(this.over)return;
    const now=Game.judgedNow(),beat=this.cond.beat;
    if(!this.announced&&beat>=4){this.announced=true;this.flash("IT'S LIGHTS OUT AND AWAY WE GO!",'#e10600');}
    // lap changes: raise tempo, announce
    const lap=this.lapAt(beat);
    if(lap!==this.curLap){
      this.curLap=lap;
      if(lap>0){this.cond.setBpm(this.lapBpm[lap]);this.flash('LAP '+(lap+1)+' — PUSH!','#00d2be');}
    }
    // section transitions
    const sec=this.sectionAt(beat);this.sec=sec;
    const sid=sec?this.sections.indexOf(sec):-1;
    if(sid!==this.prevSecId){
      const prev=this.sections[this.prevSecId];
      if(prev&&prev.type==='pit')this.evalPit();
      if(sec){
        if(sec.type==='pit'){
          this.flash('BOX BOX BOX!','#e10600');this.pitJ={miss:0,ok:0,n:0};
          if(!this.shownReminder.pit){this.shownReminder.pit=true;this.reminder={type:'pit',t:3.5,total:3.5};}
        }
        if(sec.type==='overtake'){
          this.flash('HOLD SPACE — SLIPSTREAM','#ffd400');this.passHits=0;this.holdDone=false;
          if(!this.shownReminder.overtake){this.shownReminder.overtake=true;this.reminder={type:'overtake',t:3.5,total:3.5};}
        }
      }
      this.prevSecId=sid;
    }
    if(this.reminder){this.reminder.t-=dt;if(this.reminder.t<=0)this.reminder=null;}
    // missed notes
    this.track.sweep(now,Judge.win().ok,n=>this.onMissNote(n));
    // rev bar follows the beat toward the next shift
    if(sec&&sec.type==='drive'){
      const nx=this.track.next('shift');
      if(nx){const p=clamp((beat-(nx.beat-2))/2,0,1);this.rev=0.22+0.75*Math.pow(p,1.15);}
    }else if(sec&&sec.type==='overtake')this.rev=this.holdState?0.92:0.75;
    else if(sec&&sec.type==='pit')this.rev=0.12;
    else this.rev=0.5;
    AE.engineSet(46+this.rev*150+this.gear*8,(sec&&sec.type==='pit')?0.045:0.13);
    // slipstream hold completion
    if(this.holdState){
      const n=this.holdState.note;
      const endT=this.cond.beatToTime(n.beat+n.holdBeats);
      if(now>=endT){
        this.holdState=null;this.holdDone=true;
        this.timeDelta-=1.0;AE.boost();FX.boom(0.14);
        this.flash('SLIPSTREAM! NOW TAP TAP TAP','#00d2be');
      }
    }
    // cosmetic speed + road scroll
    const tgt=this.sec&&this.sec.type==='pit'?60:120+this.gear*26+this.session.combo*1.5;
    this.speed+=(tgt-this.speed)*dt*2.2;
    this.roadOff+=this.speed*dt*2.4;
    if(this.lockout>0)this.lockout-=dt;
    if(this.flameT>0)this.flameT-=dt;
    if(this.msg){this.msg.t-=dt;if(this.msg.t<=0)this.msg=null;}
    // race clock runs from lights-out to the flag
    if(beat>=8)this.raceTime+=dt;
    if(beat>=this.finishBeat)this.finish();
  }
  onKeyDown(k,t){
    if(this.over)return;
    if(k==='SPACE'){
      if(this.lockout>0){this.flash('LOCKOUT!','#ff2d2d');AE.tick();return;}
      const n=this.track.hit('SPACE',t,Judge.win().ok);
      if(!n){AE.tick();return;}
      if(n.kind==='shift'){
        const j=Game.hit(n.delta,W/2,H*0.6,100);
        this.applyShift(j);
      }else if(n.kind==='hold'){
        const j=Game.hit(n.delta,W/2,H*0.4,120);
        if(j!=='miss')this.holdState={note:n,pressT:t};
      }else if(n.kind==='pass'){
        const j=Game.hit(n.delta,W/2,H*0.34,110);
        if(j!=='miss'){
          this.passHits++;
          if(this.passHits>=3){this.timeDelta-=1.0;AE.boost();this.flash('OVERTAKE COMPLETE! -1.0s','#00d2be');FX.boom(0.15);}
        }else this.timeDelta+=0.3;
      }
    }else if(WHEEL_KEYS.includes(k)){
      const n=this.track.hit(k,t,Judge.win().ok);
      if(!n){AE.tick();return;}
      const p=this.wheelPos(n.wheel);
      const j=Game.hit(n.delta,p.x,p.y,80);
      if(n.hi===1)AE.clunk();else AE.gun();
      this.pitJ.n++;
      if(j==='miss')this.pitJ.miss++;else if(j==='ok')this.pitJ.ok++;
    }
  }
  onKeyUp(k,t){
    if(k==='SPACE'&&this.holdState){
      const n=this.holdState.note;
      const endT=this.cond.beatToTime(n.beat+n.holdBeats);
      this.holdState=null;
      if(t<endT-this.cond.spb*0.3){ // let go of the tow too early
        this.session.addJudge('miss');
        FX.judge(W/2,H*0.4,'miss');AE.sfxJudge('miss');
        this.timeDelta+=0.8;this.flash('LOST THE TOW +0.8s','#ff2d2d');
      }
    }
  }
  applyShift(j){
    if(j==='perfect'){this.timeDelta-=0.10;}
    else if(j==='ok'){this.timeDelta+=0.15;}
    else if(j==='miss'){return;}
    this.gear=this.gear>=8?3:this.gear+1;
    this.rev=0.25;this.flameT=0.22;
  }
  onMissNote(n){
    if(n.kind==='shift'){
      Game.missAt(W/2,H*0.6);
      this.timeDelta+=0.4;this.lockout=0.35;this.gear=Math.max(1,this.gear-1);
      this.flash('MISSED SHIFT +0.4s','#ff2d2d');
    }else if(n.kind==='pit'){
      const p=this.wheelPos(n.wheel);Game.missAt(p.x,p.y);
      this.pitJ.n++;this.pitJ.miss++;this.timeDelta+=0.3;
    }else if(n.kind==='hold'){
      Game.missAt(W/2,H*0.4);this.timeDelta+=0.8;this.flash('MISSED THE TOW +0.8s','#ff2d2d');
    }else if(n.kind==='pass'){
      Game.missAt(W/2,H*0.34);this.timeDelta+=0.3;
    }
  }
  evalPit(){
    const pj=this.pitJ;if(!pj||!pj.n)return;
    if(pj.miss===0&&pj.ok===0){this.timeDelta-=1.5;AE.boost();FX.boom(0.2);FX.kick(4);this.flash('PERFECT STOP! LAUNCH -1.5s','#00d2be');}
    else if(pj.miss===0){this.timeDelta-=0.5;this.flash('CLEAN STOP -0.5s','#ffd400');}
    else{this.timeDelta+=pj.miss*0.2;this.flash('SLOW STOP +'+(pj.miss*0.2).toFixed(1)+'s','#ff2d2d');}
  }
  finish(){
    if(this.over)return;this.over=true;
    const s=this.session,acc=s.accuracy,miss=s.counts.miss;
    const final=Math.max(30,this.raceTime+this.timeDelta);
    let grade,gc,bonus;
    if(acc>=95&&miss===0){grade='PERFECT STOP';gc='#00d2be';bonus=300;}
    else if(acc>=85){grade='PODIUM';gc='#ffd400';bonus=200;}
    else if(acc>=65){grade='MIDFIELD';gc='#8b94a7';bonus=100;}
    else{grade='DNF';gc='#e10600';bonus=25;}
    if(grade!=='DNF'&&(Store.data.raceBest===null||final<Store.data.raceBest)){
      Store.data.raceBest=final;Store.save();
    }
    if(acc>=85)AE.crowd(); // crowd cheer for a podium finish
    const pts=Math.round(s.score/15)+bonus;
    Game.endMode({
      modeId:'race',title:'CHEQUERED FLAG',grade,gradeColor:gc,
      score:s.score,points:pts,goalValue:acc,fullCombo:miss===0,bestCombo:s.maxCombo,
      rows:[
        ['Race time',fmtTime(final)+(Store.data.raceBest!==null?' (best '+fmtTime(Store.data.raceBest)+')':'')],
        ['Time delta',(this.timeDelta>=0?'+':'')+this.timeDelta.toFixed(2)+'s'],
        ['Max combo',s.maxCombo],
        ['Perfect / Good / OK',s.counts.perfect+' / '+s.counts.good+' / '+s.counts.ok],
        ['Miss',miss],
        ['Accuracy',acc.toFixed(1)+'%'],
      ],
    });
  }
  /* ---------- render ---------- */
  render(ctx){
    const beat=this.cond.beat,sec=this.sec;
    ctx.fillStyle='#0b0d12';ctx.fillRect(0,0,W,H);
    if(sec&&sec.type==='pit')this.renderPit(ctx,beat);
    else{this.renderRoad(ctx);if(sec&&sec.type==='overtake')this.renderOvertake(ctx,beat);this.renderDash(ctx,beat);}
    this.renderProgress(ctx,beat);
    // race clock
    ctx.textAlign='center';ctx.fillStyle='#eef1f6';ctx.font=f(30);
    ctx.fillText(fmtTime(this.raceTime+this.timeDelta),W/2,84);
    ctx.font=f(13,700);
    ctx.fillStyle=this.timeDelta<=0?'#00d2be':'#ff2d2d';
    ctx.fillText((this.timeDelta>=0?'+':'')+this.timeDelta.toFixed(2)+'s',W/2,102);
    ctx.fillStyle='#8b94a7';ctx.font=f(12,700);
    ctx.fillText('LAP '+Math.min(3,this.curLap+1)+'/3',W/2,118);
    if(this.msg){ // instructional/section-intro overlay text — large and bold so it reads at a glance
      ctx.globalAlpha=clamp(this.msg.t/0.4,0,1);
      ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(0,H*0.24,W,H*0.14);
      ctx.fillStyle=this.msg.c;ctx.font=f(Math.min(56,W*0.075),900);
      ctx.fillText(this.msg.s,W/2,H*0.32);ctx.globalAlpha=1;
    }
    this.renderReminder(ctx); // first-time overtake/pit reminder card — never blocks gameplay underneath
    drawHUD(ctx,this,sec&&sec.type==='pit'?'Q W = front wheels · A S = rear wheels':'SPACE = shift on the redline');
    drawCount(ctx,beat);
  }
  renderRoad(ctx){
    const hy=H*0.34; // horizon
    bgTrack(ctx,this.isNight);
    ctx.fillStyle=this.isNight?'#060a10':'#0e1a15';ctx.fillRect(0,hy,W,H-hy);
    ctx.fillStyle='#0e1118';
    ctx.beginPath();ctx.moveTo(W*0.5-W*0.055,hy);ctx.lineTo(W*0.5+W*0.055,hy);
    ctx.lineTo(W*0.5+W*0.42,H);ctx.lineTo(W*0.5-W*0.42,H);ctx.closePath();ctx.fill();
    // moving center dashes + kerbs, spacing grows with perspective
    for(let i=0;i<9;i++){
      const z=((i*90+this.roadOff)%810)/810; // 0 far → 1 near
      const y=hy+(H-hy)*z*z,s=0.12+z*z*0.88;
      ctx.fillStyle='rgba(238,241,246,'+(0.12+z*0.5)+')';
      ctx.fillRect(W/2-3*s,y,6*s,26*s);
      const kx=W*0.055+(W*0.42-W*0.055)*z*z;
      ctx.fillStyle=(i%2?'#e10600':'#eef1f6');
      ctx.fillRect(W/2-kx-10*s,y,9*s,22*s);
      ctx.fillRect(W/2+kx+1*s,y,9*s,22*s);
    }
    // finish line banner, rushing toward the car as the race wraps up
    const toFinish=this.finishBeat-this.cond.beat;
    if(toFinish<16&&toFinish>-1.5){
      const z=clamp(1-toFinish/16,0.02,1);
      const y=hy+(H-hy)*z*z,s=0.12+z*z*0.88;
      const halfW=(W*0.055+(W*0.42-W*0.055)*z*z)+9*s;
      const cell=halfW*2/10;
      for(let i=0;i<10;i++){
        ctx.fillStyle=i%2?'#eef1f6':'#0b0d12';
        ctx.fillRect(W/2-halfW+i*cell,y-7*s,cell+1,14*s);
      }
      const poleH=64*s;
      ctx.strokeStyle='#8b94a7';ctx.lineWidth=Math.max(1,3*s);
      ctx.beginPath();ctx.moveTo(W/2-halfW,y);ctx.lineTo(W/2-halfW,y-poleH);
      ctx.moveTo(W/2+halfW,y);ctx.lineTo(W/2+halfW,y-poleH);ctx.stroke();
      ctx.fillStyle='#eef1f6';ctx.textAlign='center';ctx.font=f(Math.max(8,15*s),800);
      ctx.fillText('FINISH',W/2,y-poleH+12*s);
    }
    // player car — detailed chase-cam F1
    const cs=clamp(W/760,0.62,1.15),cy=H*0.86;
    if(this.isNight){ // glowing brake lights under floodlights
      const bp=beatPulse(this.cond);
      ctx.fillStyle='rgba(225,6,0,'+(0.25+bp*0.25)+')';
      ctx.beginPath();ctx.arc(W/2,cy+6*cs,46*cs,0,6.283);ctx.fill();
    }
    if(this.flameT>0){ // upshift exhaust flames
      for(const fxo of [-14,14]){
        ctx.fillStyle=Math.random()<0.5?'rgba(90,180,255,.85)':'rgba(255,170,60,.85)';
        ctx.beginPath();ctx.arc(W/2+fxo*cs,cy+(34+rand(0,10))*cs,rand(3,7)*cs,0,6.283);ctx.fill();
      }
    }
    drawF1Rear(ctx,W/2,cy,cs,liveryColor(),helmetColor(),liverySpecial());
  }
  renderDash(ctx,beat){
    // rev bar with redline zone — the beat lands at the right edge
    const bx=W*0.09,bw=W*0.82,by=H*0.66,bh=34;
    ctx.fillStyle='#12161f';ctx.fillRect(bx,by,bw,bh);
    ctx.strokeStyle='#242b3a';ctx.strokeRect(bx,by,bw,bh);
    const rl=0.85; // redline start
    ctx.fillStyle='rgba(225,6,0,.25)';ctx.fillRect(bx+bw*rl,by,bw*(1-rl),bh);
    const g=ctx.createLinearGradient(bx,0,bx+bw,0);
    g.addColorStop(0,'#00d2be');g.addColorStop(0.6,'#ffd400');g.addColorStop(1,'#e10600');
    ctx.fillStyle=g;ctx.fillRect(bx,by+3,bw*this.rev,bh-6);
    if(this.rev>=rl){ // in the redline: glow
      ctx.fillStyle='rgba(255,255,255,'+(0.15+0.25*Math.sin(idleT*40))+')';
      ctx.fillRect(bx+bw*rl,by,bw*(1-rl),bh);
    }
    ctx.fillStyle='#eef1f6';ctx.font=f(11,700);ctx.textAlign='left';
    ctx.fillText('REV',bx,by-6);
    ctx.textAlign='right';ctx.fillStyle='#e10600';ctx.fillText('REDLINE',bx+bw,by-6);
    // gear (right) + speed (left) — keeps the car visible in the middle
    ctx.textAlign='right';ctx.fillStyle='#eef1f6';ctx.font=f(56);
    ctx.fillText(this.gear,bx+bw,by+104);
    ctx.font=f(12,700);ctx.fillStyle='#8b94a7';ctx.fillText('GEAR',bx+bw,by+122);
    ctx.textAlign='left';ctx.font=f(30);ctx.fillStyle='#eef1f6';
    ctx.fillText(Math.round(this.speed*1.4)+' km/h',bx,by+96);
    if(this.lockout>0){
      ctx.textAlign='center';ctx.fillStyle='#ff2d2d';ctx.font=f(24);
      ctx.fillText('GEARBOX LOCKOUT',W/2,by-30);
    }
  }
  renderPit(ctx,beat){
    const now=Game.judgedNow();
    bgPitGarage(ctx);
    // pit box markings
    ctx.strokeStyle='#ffd400';ctx.lineWidth=3;
    ctx.strokeRect(W/2-Math.min(150,W*0.3),H*0.5-Math.min(170,H*0.28),Math.min(300,W*0.6),Math.min(340,H*0.56));
    // car body — detailed top-down F1
    drawF1Top(ctx,W/2,H*0.5,Math.min(95,W*0.18),Math.min(110,H*0.17),liveryColor(),helmetColor(),liverySpecial());
    drawJackPerson(ctx,W/2,H*0.5-Math.min(110,H*0.17)-6); // holding the front of the car up
    const STEP=['GUN OFF','SWAP','GUN ON'];
    const sec=this.sec;
    for(let w=0;w<4;w++){
      const p=this.wheelPos(w);
      const notes=this.track.notes.filter(n=>n.kind==='pit'&&n.wheel===w&&n.beat>=sec.start&&n.beat<sec.end);
      const done=notes.filter(n=>n.judged).length,missed=notes.some(n=>n.missed);
      // mechanic crouched at the wheel, drilling when the gun steps are active
      const nextNote=notes.find(n=>!n.judged);
      const curHi=nextNote?nextNote.hi:2;
      const mechSide=(w%2===0)?-1:1;
      ctx.save();ctx.translate(p.x+mechSide*34,p.y);if(mechSide>0)ctx.scale(-1,1);
      drawPitMechanic(ctx,0,0,done<3&&(curHi===0||curHi===2),done<3&&curHi===1);
      ctx.restore();
      // tyre
      ctx.beginPath();ctx.arc(p.x,p.y,24,0,6.283);
      ctx.fillStyle=done===3?(missed?'#5a2230':'#0f2f2c'):'#171c28';ctx.fill();
      ctx.lineWidth=4;ctx.strokeStyle=done===3?(missed?'#e10600':'#00d2be'):'#242b3a';ctx.stroke();
      ctx.fillStyle='#eef1f6';ctx.font=f(20);ctx.textAlign='center';
      ctx.fillText(WHEEL_KEYS[w],p.x,p.y+7);
      // shrinking approach rings for the next 2 upcoming hits
      let shown=0;
      for(const n of notes){
        if(n.judged||shown>=2)continue;
        const dt2=this.cond.beatToTime(n.beat)-now;
        if(dt2>1.6)break;
        if(dt2>-0.15){
          const r=26+Math.max(0,dt2)*110;
          ctx.beginPath();ctx.arc(p.x,p.y,r,0,6.283);
          ctx.strokeStyle='rgba(255,212,0,'+clamp(1.3-dt2,0.15,1)+')';
          ctx.lineWidth=shown===0?3:1.5;ctx.stroke();
          if(shown===0){
            ctx.fillStyle='#ffd400';ctx.font=f(11,700);
            ctx.fillText(STEP[n.hi],p.x,p.y-34);
          }
          shown++;
        }
      }
      // 3 progress pips
      for(let i=0;i<3;i++){
        ctx.beginPath();ctx.arc(p.x-14+i*14,p.y+38,4,0,6.283);
        ctx.fillStyle=i<done?'#00d2be':'#242b3a';ctx.fill();
      }
    }
  }
  renderOvertake(ctx,beat){
    const sec=this.sec,rel=beat-sec.start;
    // rival car grows as you close in, jumps aside on the taps
    const closing=this.holdDone?1:clamp((rel-2)/6,0,1)*0.8;
    const sc=0.35+closing*0.6,py=H*0.34+H*0.16*sc;
    const dx=this.passHits*W*0.09; // drifts right as you pass
    drawF1Rear(ctx,W/2-40+dx,py,sc*0.85,'#2f7df6');
    if(this.holdState){ // slipstream streaks + hold progress
      for(let i=0;i<10;i++){
        const y=H*0.3+i*H*0.05,x=W/2+Math.sin(i*3+idleT*30)*W*0.1;
        ctx.strokeStyle='rgba(0,210,190,.35)';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+30);ctx.stroke();
      }
      const n=this.holdState.note;
      const pr=clamp((beat-n.beat)/n.holdBeats,0,1);
      ctx.fillStyle='#12161f';ctx.fillRect(W*0.2,H*0.24,W*0.6,14);
      ctx.fillStyle='#00d2be';ctx.fillRect(W*0.2,H*0.24,W*0.6*pr,14);
      ctx.textAlign='center';ctx.fillStyle='#00d2be';ctx.font=f(13,700);
      ctx.fillText('SLIPSTREAM — KEEP HOLDING',W/2,H*0.22);
    }
    if(this.holdDone&&this.passHits<3){
      ctx.textAlign='center';ctx.fillStyle='#ffd400';ctx.font=f(20);
      ctx.fillText('TAP SPACE ON THE BEAT — '+(3-this.passHits)+' TO PASS',W/2,H*0.24);
    }
  }
  renderProgress(ctx,beat){
    const bx=W*0.06,bw=W*0.88,by=40,tot=this.finishBeat;
    ctx.fillStyle='#12161f';ctx.fillRect(bx,by,bw,8);
    const cols={drive:'#2b3648',overtake:'#8a7a12',pit:'#7a1210',finish:'#155'};
    for(const s of this.sections){
      if(s.type==='lap')continue;
      ctx.fillStyle=cols[s.type]||'#2b3648';
      ctx.fillRect(bx+bw*(s.start/tot),by,bw*((s.end-s.start)/tot),8);
    }
    ctx.fillStyle='#eef1f6';
    ctx.fillRect(bx+bw*clamp(beat/tot,0,1)-2,by-3,4,14);
  }
  /* ---------- music: builds intensity lap by lap ---------- */
  music(step,t){
    const beat=step/4;
    if(step<16){if(step%4===0)AE.blip(t,step===12?880:440,0.3);return;}
    const sec=this.sectionAt(beat)||{type:'drive',lap:Math.max(0,this.curLap)};
    const lap=sec.lap||0,i=step%16;
    const root=[0,0,3,-2][Math.floor(beat/4)%4];
    if(sec.type==='pit'){ // double-time wheel-gun urgency
      if(i%2===0)AE.hat(t,0.8);
      if(on(P.pitTom,i))AE.tom(t,i%4===0?175:120,0.9);
      if(i%8===4)AE.snare(t,0.75);
      if(i%4===2)AE.bass(t,root+12,0.09,0.8);
    }else if(sec.type==='overtake'){
      if(on(P.kick4,i))AE.kick(t,0.9);
      if(on(P.hat8,i))AE.hat(t,0.6);
      if(beat===sec.start+2)AE.pad(t,root+19,this.cond.spb*5.5,1.1); // the sustained note you hold through
      if(beat>=sec.start+9&&i%4===0)AE.lead(t,root+12+((beat-sec.start)|0),0.12,0.9,'sawtooth');
      if(i%2===0)AE.bass(t,root,0.15,0.7);
    }else{
      if(on(lap>=2?P.kickD:P.kick4,i))AE.kick(t);
      if(lap>=1&&on(P.snr,i))AE.snare(t);
      if(on(lap>=2?P.hat16:P.hat8,i))AE.hat(t,i%4===2?1:0.55,lap>=2&&i%8===6);
      if(i%2===0)AE.bass(t,root+(i%8===6?12:0),0.17,lap>=1?1:0.8);
      if(lap>=1&&i%2===1)AE.lead(t,root+[7,10,12,15][(i>>2)%4]+12,0.09,lap>=2?0.9:0.6);
      if(sec.type==='finish'&&i===0){
        AE.pad(t,root+12,2.5,1.4);AE.crash(t,5200,1);
      }
    }
  }
}

