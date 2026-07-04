/* 2P DRUM DUEL — two players, one keyboard, split screen: P1 uses F D S A, P2
 * uses J K L ;, and both get the exact same notes at the exact same time, so it
 * comes down to pure accuracy. Not part of the arcade unlock chain — always
 * available from the main menu. Depends on: core/*.js, art/backgrounds.js,
 * and TYPE_SETS/TYPE_COLS from games/typing.js (loads earlier). */
'use strict';
/* ============================================================
   2P DRUM DUEL — same keyboard, split screen, race for the score.
   P1: F D S A (left hand) · P2: J K L ; (right hand) · identical chart, best score wins.
   ============================================================ */
class DrumDuel{
  constructor(){
    this.s1=new Session();this.s2=new Session();
    this.cond=new Conductor(112);
    this.t1=new NoteTrack(this.cond);this.t2=new NoteTrack(this.cond);
    this.over=false;this.msg=null;
    let b=8,last=-1;
    while(b<8+56){
      let lane=Math.floor(rand(0,4));
      if(lane===last)lane=(lane+1+Math.floor(rand(0,3)))%4;
      last=lane;
      this.t1.add({beat:b,key:TYPE_SETS.left[lane],lane,kind:'duel'});
      this.t2.add({beat:b,key:TYPE_SETS.right[lane],lane,kind:'duel'});
      b+=1;
    }
    this.endBeat=b;
  }
  get touchKeys(){return[
    {k:'F',label:'P1·F'},{k:'D',label:'P1·D'},{k:'S',label:'P1·S'},{k:'A',label:'P1·A'},
    {k:'J',label:'P2·J'},{k:'K',label:'P2·K'},{k:'L',label:'P2·L'},{k:';',label:'P2·;'}];}
  start(){this.cond.patternFn=(s,t)=>this.music(s,t);this.cond.start(0.6);}
  laneX(side,i){const lo=side<0?0.08:0.58,hi=side<0?0.42:0.92;return W*(lo+(hi-lo)*i/3);}
  flash(s,c){this.msg={s,t:1.3,c:c||'#ffd400'};}
  update(dt){
    if(this.over)return;
    const now=Game.judgedNow(),beat=this.cond.beat,hy=H*0.78;
    this.t1.sweep(now,Judge.win().ok,n=>{this.s1.addJudge('miss');FX.judge(this.laneX(-1,n.lane),hy,'miss');});
    this.t2.sweep(now,Judge.win().ok,n=>{this.s2.addJudge('miss');FX.judge(this.laneX(1,n.lane),hy,'miss');});
    if(this.msg){this.msg.t-=dt;if(this.msg.t<=0)this.msg=null;}
    if(beat>this.endBeat+1)this.finish();
  }
  hitFor(side,track,session,keys,k,t){
    const li=keys.indexOf(k);if(li<0)return;
    const n=track.hit(k,t,Judge.win().ok);
    if(!n){session.combo=0;AE.tick();return;}
    const j=Judge.judge(n.delta)||'miss';
    session.addJudge(j,100);
    const x=this.laneX(side,n.lane),y=H*0.78;
    FX.judge(x,y,j);AE.sfxJudge(j);
    if(j==='perfect'){FX.burst(x,y,JCOL.perfect,10);FX.ring(x,y,JCOL.perfect);}
    else if(j==='good')FX.burst(x,y,JCOL.good,5);
  }
  onKeyDown(k,t){
    if(this.over)return;
    if(TYPE_SETS.left.includes(k))this.hitFor(-1,this.t1,this.s1,TYPE_SETS.left,k,t);
    else if(TYPE_SETS.right.includes(k))this.hitFor(1,this.t2,this.s2,TYPE_SETS.right,k,t);
  }
  finish(){
    if(this.over)return;this.over=true;this.cond.stop();
    const p1=Math.round(this.s1.score),p2=Math.round(this.s2.score);
    const winner=p1>p2?'🏆 PLAYER 1 WINS!':p2>p1?'🏆 PLAYER 2 WINS!':"IT'S A TIE!";
    if(p1!==p2)AE.crowd();
    Game.endMode({
      modeId:'duel',title:'2P DRUM DUEL',grade:winner,gradeColor:p1===p2?'#8b94a7':'#ffd400',
      score:Math.max(p1,p2),points:Math.round(Math.max(p1,p2)/20),
      fullCombo:this.s1.counts.miss===0||this.s2.counts.miss===0,
      bestCombo:Math.max(this.s1.maxCombo,this.s2.maxCombo),
      rows:[['Player 1 score',p1.toLocaleString()],['Player 2 score',p2.toLocaleString()],
        ['P1 max combo',this.s1.maxCombo],['P2 max combo',this.s2.maxCombo],
        ['P1 accuracy',this.s1.accuracy.toFixed(1)+'%'],['P2 accuracy',this.s2.accuracy.toFixed(1)+'%']],
    });
  }
  renderSide(ctx,now,side,track,keys,label,session){
    const cx=side<0?W*0.25:W*0.75,hy=H*0.78;
    ctx.textAlign='center';ctx.fillStyle='#eef1f6';ctx.font=f(16,800);
    ctx.fillText(label,cx,34);
    ctx.font=f(22);ctx.fillText(Math.round(session.score).toLocaleString(),cx,60);
    ctx.font=f(11,700);ctx.fillStyle='#8b94a7';ctx.fillText('SCORE',cx,74);
    if(session.combo>=4){ctx.fillStyle='#ffd400';ctx.font=f(15);ctx.fillText(session.combo+' COMBO',cx,94);}
    for(let i=0;i<4;i++){
      const x=this.laneX(side,i);
      ctx.strokeStyle='#242b3a';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x,H*0.14);ctx.lineTo(x,hy+18);ctx.stroke();
      ctx.beginPath();ctx.arc(x,hy,20,0,6.283);ctx.strokeStyle=TYPE_COLS[i];ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle=TYPE_COLS[i];ctx.font=f(14);ctx.fillText(keys[i],x,hy+38);
    }
    for(const n of track.notes){
      if(n.judged&&!n.missed)continue;
      const y=hy-(this.cond.beatToTime(n.beat)-now)/this.cond.spb*H*0.16;
      if(y<H*0.12||y>hy+20)continue;
      const x=this.laneX(side,n.lane);
      ctx.beginPath();ctx.arc(x,y,15,0,6.283);
      ctx.fillStyle=n.missed?'rgba(225,6,0,.4)':TYPE_COLS[n.lane];ctx.fill();
      ctx.fillStyle='#0b0d12';ctx.font=f(13);ctx.fillText(n.key,x,y+5);
    }
  }
  render(ctx){
    const now=Game.judgedNow(),beat=this.cond.beat;
    bgStage(ctx);
    ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();
    this.renderSide(ctx,now,-1,this.t1,TYPE_SETS.left,'PLAYER 1',this.s1);
    this.renderSide(ctx,now,1,this.t2,TYPE_SETS.right,'PLAYER 2',this.s2);
    if(this.msg){
      ctx.globalAlpha=clamp(this.msg.t/0.4,0,1);ctx.textAlign='center';
      ctx.fillStyle=this.msg.c;ctx.font=f(24);ctx.fillText(this.msg.s,W/2,H*0.1);ctx.globalAlpha=1;
    }
    ctx.textAlign='center';ctx.fillStyle='#8b94a7';ctx.font=f(11,700);
    ctx.fillText('same keyboard — P1 left hand vs P2 right hand',W/2,H-10);
    drawCount(ctx,beat);
  }
  music(step,t){
    if(step<16){if(step%4===0)AE.blip(t,step===12?880:440,0.3);return;}
    const i=step%16;
    if(i%4===0)AE.kick(t,0.85);
    if(i%8===4)AE.snare(t,0.75);
    if(i%2===0)AE.hat(t,0.55);
  }
}

