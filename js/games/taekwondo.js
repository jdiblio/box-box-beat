/* TAEKWONDO COMBOS — belt by belt (White..Black), landing 70%+ of the moves to
 * advance. On Champions difficulty the belts extend through nine Black Belt
 * degrees — titled in roman numerals (I DEGREE .. IX DEGREE) and each with
 * its own colour so the climb is unmistakable at a glance, not just a wall
 * of text — and some notes require two keys pressed at the exact same
 * instant (checked against Input.held, not just a single keydown event).
 * Depends on: core/*.js, art/backgrounds.js. */
'use strict';
/* ============================================================
   TAEKWONDO COMBOS — J punch · K kick · L block, belt by belt.
   ============================================================ */
const BELTS=[
  {n:'WHITE',c:'#eeeeee',bpm:92},{n:'YELLOW',c:'#ffd400',bpm:102},
  {n:'GREEN',c:'#35c04f',bpm:112},{n:'BLUE',c:'#2f7df6',bpm:124},
  {n:'RED',c:'#e10600',bpm:136},{n:'BLACK',c:'#666a75',bpm:150}];
const ROMAN_NUMERALS=['I','II','III','IV','V','VI','VII','VIII','IX'];
const DEGREE_COLORS=['#f2c14e','#eeb23e','#eaa32e','#e6941e','#e2850e','#de6f0a','#da5906','#d64302','#e10600'];
const BELTS_CHAMP=ROMAN_NUMERALS.map((r,i)=>(
  {n:r+' DEGREE BLACK BELT',c:DEGREE_COLORS[i],bpm:150+i*11,dbl:0.32+i*0.045,combo:0.1+i*0.05}));
const TKD_KEYS=['J','K','L'];
const TKD_NAME={J:'PUNCH',K:'KICK',L:'BLOCK'};
const TKD_COL={J:'#e10600',K:'#ffd400',L:'#2f7df6'};
class Taekwondo{
  constructor(){
    this.session=new Session();
    this.champ=Judge.champ();
    this.beltsArr=this.champ?BELTS_CHAMP:BELTS;
    this.cond=new Conductor(this.beltsArr[0].bpm);
    this.track=new NoteTrack(this.cond);
    this.belt=0;this.over=false;this.msg=null;
    this.pose={type:'idle',t:0};
  }
  get touchKeys(){return[{k:'J',label:'J PUNCH'},{k:'K',label:'K KICK'},{k:'L',label:'L BLOCK'}];}
  start(){
    this.scheduleBelt(0,8);
    this.cond.patternFn=(s,t)=>this.music(s,t);
    this.cond.start(0.6);
  }
  scheduleBelt(bi,startBeat){
    this.track.clear();
    this.beltStart=startBeat;this.beltEnd=startBeat+32;
    if(this.champ){ // Champions: denser 8th-note chains + simultaneous two-key combos
      const cb=this.beltsArr[bi];
      const dens=[0,0.5,1,1.5,2,2.5,3,3.5];
      for(let bar=0;bar<8;bar++)for(const bb of dens){
        const bt=startBeat+bar*4+bb;
        if(Math.random()<cb.combo){
          const a=choice(TKD_KEYS);let b2=choice(TKD_KEYS);while(b2===a)b2=choice(TKD_KEYS);
          this.track.add({beat:bt,keys:[a,b2],kind:'tkd2'});
        }else this.track.add({beat:bt,key:choice(TKD_KEYS),kind:'tkd'});
        if(Math.random()<cb.dbl)this.track.add({beat:bt+0.25,key:choice(TKD_KEYS),kind:'tkd'});
      }
    }else{
      const dens=[[0,2],[0,1,2],[0,1,2,3],[0,1,2,3],[0,1,2,3],[0,1,2,3]][bi];
      const dbl=[0,0,0,0.2,0.35,0.5][bi]+(Judge.dense()?0.1:0)-(Judge.sparse()?0.15:0);
      for(let bar=0;bar<8;bar++)for(const bb of dens){
        const bt=startBeat+bar*4+bb;
        this.track.add({beat:bt,key:choice(TKD_KEYS),kind:'tkd'});
        if(Math.random()<dbl)this.track.add({beat:bt+0.5,key:choice(TKD_KEYS),kind:'tkd'});
      }
    }
    this.track.notes.sort((a,b)=>a.beat-b.beat);
  }
  laneY(k){return H*(0.3+TKD_KEYS.indexOf(k)*0.16);}
  flash(s,c){this.msg={s,t:1.6,c:c||'#ffd400'};}
  update(dt){
    if(this.over)return;
    const now=Game.judgedNow(),beat=this.cond.beat;
    this.track.sweep(now,Judge.win().ok,n=>{
      const y=n.kind==='tkd2'?(this.laneY(n.keys[0])+this.laneY(n.keys[1]))/2:this.laneY(n.key);
      Game.missAt(W*0.25,y);
    });
    this.pose.t=Math.max(0,this.pose.t-dt);
    if(this.msg){this.msg.t-=dt;if(this.msg.t<=0)this.msg=null;}
    if(beat>this.beltEnd+1.5){
      const total=this.track.notes.length;
      const hitRate=total?this.track.notes.filter(n=>n.judged&&!n.missed).length/total:1;
      if(hitRate>=0.7){
        this.belt++;
        this.session.score+=Math.round(300*hitRate);
        if(this.belt>=this.beltsArr.length){this.finish(true);return;}
        this.flash(this.beltsArr[this.belt].n+' — '+this.beltsArr[this.belt].bpm+' BPM',this.beltsArr[this.belt].c);
        AE.boost();FX.boom(0.15);
        this.cond.setBpm(this.beltsArr[this.belt].bpm);
        this.scheduleBelt(this.belt,Math.ceil(beat)+4);
      }else if(Store.data.practice){
        this.flash('PRACTICE MODE — RETRYING '+this.beltsArr[this.belt].n,'#00d2be');
        this.scheduleBelt(this.belt,Math.ceil(beat)+4);
      }else this.finish(false);
    }
  }
  onKeyDown(k,t){
    if(this.over||!TKD_KEYS.includes(k))return;
    if(this.champ){ // simultaneous two-key combo notes, matched via real held-key state
      const win=Judge.win().ok;
      const n2=this.track.notes.find(n=>!n.judged&&n.kind==='tkd2'&&n.keys.includes(k)&&
        Math.abs(t-this.cond.beatToTime(n.beat))<=win&&Input.isHeld(n.keys[0])&&Input.isHeld(n.keys[1]));
      if(n2){
        n2.judged=true;n2.delta=t-this.cond.beatToTime(n2.beat);
        const y=(this.laneY(n2.keys[0])+this.laneY(n2.keys[1]))/2;
        const j=Game.hit(n2.delta,W*0.25,y,150);
        if(j!=='miss'){this.pose={type:'combo',t:0.3,keys:n2.keys};AE.boost();AE.clunk();}
        return;
      }
    }
    const n=this.track.hit(k,t,Judge.win().ok);
    if(!n){AE.tick();this.session.combo=0;return;}
    const j=Game.hit(n.delta,W*0.25,this.laneY(k),95);
    if(j!=='miss'){
      this.pose={type:k,t:0.25};
      if(k==='J')AE.nz(AE.now(),{dur:0.08,vol:0.3,type:'bandpass',freq:900,q:1.5});
      else if(k==='K')AE.nz(AE.now(),{dur:0.12,vol:0.35,type:'bandpass',freq:500,q:1.2});
      else AE.clunk();
    }
  }
  finish(won){
    if(this.over)return;this.over=true;this.cond.stop();
    const s=this.session,b=Math.min(this.belt,this.beltsArr.length-1);
    Game.endMode({
      modeId:'tkd',title:'TAEKWONDO COMBOS',
      grade:won?(this.champ?'IX DEGREE GRANDMASTER':'BLACK BELT MASTER'):this.beltsArr[b].n,
      gradeColor:won?'#00d2be':this.beltsArr[b].c,
      score:s.score,points:Math.round(s.score/15)+(won?200:0),
      goalValue:this.belt,fullCombo:s.counts.miss===0,bestCombo:s.maxCombo,
      rows:[['Belt reached',won?(this.champ?'IX Degree (complete)':'BLACK (complete)'):this.beltsArr[b].n],
        ['Max combo',s.maxCombo],['Accuracy',s.accuracy.toFixed(1)+'%'],
        ['Misses',s.counts.miss]],
    });
  }
  render(ctx){
    const now=Game.judgedNow(),beat=this.cond.beat;
    bgDojo(ctx);
    // lanes
    for(const k of TKD_KEYS){
      const y=this.laneY(k);
      ctx.strokeStyle='#242b3a';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(W*0.14,y);ctx.lineTo(W,y);ctx.stroke();
      ctx.fillStyle=TKD_COL[k];ctx.font=f(15);ctx.textAlign='left';
      ctx.fillText(k+' '+TKD_NAME[k],W*0.14,y-26);
      const p=beatPulse(this.cond);
      ctx.beginPath();ctx.arc(W*0.25,y,20+p*4,0,6.283);
      ctx.strokeStyle='rgba(238,241,246,'+(0.3+p*0.4)+')';ctx.lineWidth=3;ctx.stroke();
    }
    // approaching prompts
    for(const n of this.track.notes){
      if(n.judged&&!n.missed)continue;
      const x=W*0.25+(this.cond.beatToTime(n.beat)-now)/this.cond.spb*W*0.15;
      if(x<W*0.1||x>W+30)continue;
      if(n.kind==='tkd2'){ // simultaneous two-key combo: linked pair of markers
        const y1=this.laneY(n.keys[0]),y2=this.laneY(n.keys[1]);
        ctx.strokeStyle=n.missed?'rgba(225,6,0,.5)':'#ffd400';ctx.lineWidth=3;
        ctx.beginPath();ctx.moveTo(x,y1);ctx.lineTo(x,y2);ctx.stroke();
        for(const kk of n.keys){
          const yy=this.laneY(kk);
          ctx.beginPath();ctx.arc(x,yy,16,0,6.283);
          ctx.fillStyle=n.missed?'rgba(225,6,0,.4)':TKD_COL[kk];ctx.fill();
          ctx.strokeStyle='#ffd400';ctx.lineWidth=2;ctx.stroke();
          ctx.fillStyle='#0b0d12';ctx.font=f(14,800);ctx.textAlign='center';
          ctx.fillText(kk,x,yy+5);
        }
        continue;
      }
      const y=this.laneY(n.key);
      ctx.beginPath();ctx.arc(x,y,15,0,6.283);
      ctx.fillStyle=n.missed?'rgba(225,6,0,.4)':TKD_COL[n.key];ctx.fill();
      ctx.fillStyle='#0b0d12';ctx.font=f(14);ctx.textAlign='center';
      ctx.fillText(n.key,x,y+5);
    }
    // fighter
    this.drawFighter(ctx,W*0.08,H*0.55);
    // belt banner
    const bc=this.beltsArr[Math.min(this.belt,this.beltsArr.length-1)];
    ctx.fillStyle=bc.c;ctx.fillRect(0,H*0.08,W,6);
    ctx.textAlign='center';ctx.fillStyle=bc.c;ctx.font=f(this.champ?15:18);
    ctx.fillText(bc.n,W/2,H*0.07);
    if(this.pose.t>0&&this.pose.type!=='idle'){
      if(this.pose.type==='combo'){
        ctx.fillStyle='#ffd400';ctx.font=f(28);
        ctx.fillText(this.pose.keys.map(k=>TKD_NAME[k]).join(' + ')+'!',W*0.25,H*0.2);
      }else{
        ctx.fillStyle=TKD_COL[this.pose.type];ctx.font=f(30);
        ctx.fillText(TKD_NAME[this.pose.type]+'!',W*0.25,H*0.2);
      }
    }
    if(this.msg){
      ctx.globalAlpha=clamp(this.msg.t/0.4,0,1);
      ctx.fillStyle=this.msg.c;ctx.font=f(30);ctx.fillText(this.msg.s,W/2,H*0.16);ctx.globalAlpha=1;
    }
    drawHUD(ctx,this,'hit 70%+ to earn the next belt');
    drawCount(ctx,beat);
  }
  drawFighter(ctx,x,y){
    const p=this.pose;
    const combo=p.t>0&&p.type==='combo'?p.keys:null;
    const act=p.t>0?(combo?combo[0]:p.type):'idle';
    const act2=combo?combo[1]:act; // second combo key drives the legs independently of the arms
    ctx.strokeStyle='#eef1f6';ctx.lineWidth=4;ctx.lineCap='round';
    ctx.beginPath();ctx.arc(x,y-46,12,0,6.283);ctx.stroke(); // head
    ctx.beginPath();ctx.moveTo(x,y-34);ctx.lineTo(x,y+6);ctx.stroke(); // torso
    ctx.beginPath(); // arms (punch or block)
    if(act==='J'){ctx.moveTo(x,y-24);ctx.lineTo(x+34,y-28);ctx.moveTo(x,y-20);ctx.lineTo(x-14,y-2);}
    else if(act==='L'){ctx.moveTo(x,y-24);ctx.lineTo(x+16,y-40);ctx.moveTo(x,y-20);ctx.lineTo(x+18,y-30);}
    else{ctx.moveTo(x,y-24);ctx.lineTo(x+14,y-6);ctx.moveTo(x,y-24);ctx.lineTo(x-14,y-6);}
    ctx.stroke();
    ctx.beginPath(); // legs (kick, driven by the second key when it's a combo)
    if(act2==='K'){ctx.moveTo(x,y+6);ctx.lineTo(x+36,y-4);ctx.moveTo(x,y+6);ctx.lineTo(x-8,y+38);}
    else{ctx.moveTo(x,y+6);ctx.lineTo(x+10,y+38);ctx.moveTo(x,y+6);ctx.lineTo(x-10,y+38);}
    ctx.stroke();
    // belt
    ctx.strokeStyle=this.beltsArr[Math.min(this.belt,this.beltsArr.length-1)].c;ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(x-8,y-6);ctx.lineTo(x+8,y-6);ctx.stroke();
  }
  music(step,t){
    if(step<16){if(step%4===0)AE.blip(t,step===12?880:440,0.3);return;}
    const i=step%16,b=this.belt;
    if(i===0||i===6||i===8)AE.tom(t,85,1.1);
    if(i===4||i===12)AE.clap(t,0.9);
    if(b>=2&&i%2===0)AE.hat(t,0.5);
    if(b>=3&&i===14)AE.tom(t,140,0.8);
    if(i%8===0)AE.bass(t,[0,0,-4,-2][Math.floor(step/16)%4],0.3,0.9);
    if(b>=4&&i===10)AE.lead(t,3,0.1,0.6,'sawtooth');
  }
}

