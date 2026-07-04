/* TYPING RHYTHM — pick a hand (F D S A or J K L ;), then hit each key's colour
 * lane on the beat. Champions swaps this entirely for real sentence typing:
 * capital letters need SHIFT held (checked via Input.isHeld), punctuation is
 * real, and the text randomly "blacks out" so you have to type from memory.
 * Depends on: core/*.js, art/backgrounds.js. */
'use strict';
/* ============================================================
   TYPING RHYTHM — real words, one letter per beat.
   ============================================================ */
const TYPE_SETS={left:['F','D','S','A'],right:['J','K','L',';']};
const TYPE_COLS=['#00d2be','#ffd400','#ff8a00','#f65cd0'];
const TYPE_SENTENCES=['Push to the Limit.','Hold the Line, Champion.','Race to the Finish.',
  'Apex the Corner, Now.','Victory is Close.','Fast Hands, Cool Head.'];
class TypingRhythm{
  constructor(){
    this.session=new Session();
    this.champ=Judge.champ();
    this.cond=new Conductor(Math.round(90*Judge.bpmMul()));
    this.track=new NoteTrack(this.cond);
    this.over=false;this.msg=null;
    if(this.champ){ // Champions: a full sentence, real punctuation, capitals need SHIFT, and blackouts
      this.state='play';
      this.sentence=choice(TYPE_SENTENCES);
      this.misses=0;this.maxMiss=10;this.typed=0;
      this.blackout={active:false,t:0,nextAt:Math.floor(rand(6,9))};
      let b=8;
      for(let i=0;i<this.sentence.length;i++){
        const ch=this.sentence[i];
        if(ch===' ')continue;
        this.track.add({beat:b,key:this.charKey(ch),kind:'sentence',ci:i,needShift:/[A-Z]/.test(ch)});
        b+=1;
      }
      this.lastBeat=b;
    }else{
      this.state='pick';this.keys=null;this.bursts=[];this.done=0;
      this.misses=0;this.maxMiss=8;this.nextBeat=8;
    }
  }
  charKey(ch){ // maps a sentence character to the normalized key token Input.norm() produces
    if(/[a-zA-Z]/.test(ch))return ch.toUpperCase();
    return ch;
  }
  charX(ci){
    const chW=Math.min(30,W*0.038);
    return W/2-this.sentence.length*chW/2+ci*chW+chW/2;
  }
  get touchKeys(){
    if(this.champ)return[]; // real sentences need a real keyboard
    return this.keys?this.keys.map(k=>({k,label:k}))
      :[{k:'F',label:'FDSA',big:true},{k:'J',label:'JKL;',big:true}];
  }
  start(){if(this.champ){this.cond.patternFn=(s,t)=>this.music(s,t);this.cond.start(0.6);}} // else waits on the hand pick
  pick(side){
    this.keys=TYPE_SETS[side];this.state='play';
    Touch.build(this.touchKeys);
    this.queueBurst();this.queueBurst();this.queueBurst();
    this.cond.patternFn=(s,t)=>this.music(s,t);
    this.cond.start(0.6);
  }
  queueBurst(){
    const lvl=Math.floor(this.done/4);
    const len=Math.min(8,4+Math.floor(lvl/2))+(Judge.dense()?1:0);
    const half=lvl>=3&&!Judge.sparse();
    const obj={notes:[]};let b=this.nextBeat,last=-1;
    for(let i=0;i<len;i++){
      let li=Math.floor(rand(0,4));
      if(li===last)li=(li+1+Math.floor(rand(0,3)))%4;
      last=li;
      obj.notes.push(this.track.add({beat:b,key:this.keys[li],lane:li,kind:'type',burst:obj}));
      b+=(half&&i%2===1)?0.5:1;
    }
    this.nextBeat=b+2;this.bursts.push(obj);
  }
  laneY(i){return H*(0.26+i*0.15);}
  noteX(n,now){return W*0.2+(this.cond.beatToTime(n.beat)-now)/this.cond.spb*W*0.16;}
  flash(s,c){this.msg={s,t:1.3,c:c||'#ffd400'};}
  update(dt){
    if(this.over)return;
    if(this.champ){
      const now=Game.judgedNow(),beat=this.cond.beat;
      this.track.sweep(now,Judge.win().ok,n=>{
        Game.missAt(this.charX(n.ci),H*0.5);
        this.misses++;if(this.misses>=this.maxMiss){if(Store.data.practice){this.misses=0;this.flash('PRACTICE MODE — STRIKES CLEARED','#00d2be');}else this.finish();}
      });
      if(this.over)return;
      if(this.msg){this.msg.t-=dt;if(this.msg.t<=0)this.msg=null;}
      if(this.blackout.active){this.blackout.t-=dt;if(this.blackout.t<=0)this.blackout.active=false;}
      if(beat>this.lastBeat+1.5)this.finish();
      return;
    }
    if(this.state==='pick')return;
    const now=Game.judgedNow();
    this.track.sweep(now,Judge.win().ok,n=>{
      Game.missAt(W*0.2,this.laneY(n.lane));
      this.misses++;n.burst.bad=true;
      if(this.misses>=this.maxMiss){if(Store.data.practice){this.misses=0;this.flash('PRACTICE MODE — STRIKES CLEARED','#00d2be');}else this.finish();}
    });
    if(this.over)return;
    if(this.msg){this.msg.t-=dt;if(this.msg.t<=0)this.msg=null;}
    // retire finished bursts, keep three queued
    while(this.bursts.length&&this.bursts[0].notes.every(n=>n.judged)){
      const bo=this.bursts.shift();
      this.done++;
      if(!bo.bad){this.session.score+=150;FX.text(W*0.2,H*0.18,'CLEAN! +150','#00d2be');}
      if(this.done%4===0){
        const lvl=this.done/4;
        this.cond.setBpm(Math.min(180,90+lvl*8));
        this.flash('LEVEL '+(lvl+1)+' — '+this.cond.bpm+' BPM','#00d2be');
      }
      this.track.notes=this.track.notes.filter(n=>n.burst!==bo);
    }
    while(this.bursts.length<3)this.queueBurst();
  }
  onKeyDown(k,t){
    if(this.over)return;
    if(this.champ){
      const n=this.track.hit(k,t,Judge.win().ok);
      if(!n){this.session.combo=0;AE.tick();return;}
      const x=this.charX(n.ci),y=H*0.5;
      if(n.needShift!==Input.isHeld('SHIFT')){
        n.missed=true;Game.missAt(x,y);
        FX.text(x,y-30,n.needShift?'HOLD SHIFT!':'NO SHIFT!','#ff2d2d');
        this.misses++;if(this.misses>=this.maxMiss){if(Store.data.practice){this.misses=0;this.flash('PRACTICE MODE — STRIKES CLEARED','#00d2be');}else this.finish();}
        return;
      }
      const j=Game.hit(n.delta,x,y,100);
      this.typed++;
      if(j==='miss'){this.misses++;if(this.misses>=this.maxMiss){if(Store.data.practice){this.misses=0;this.flash('PRACTICE MODE — STRIKES CLEARED','#00d2be');}else this.finish();}}
      if(!this.blackout.active&&this.typed>=this.blackout.nextAt){
        this.blackout={active:true,t:1.8,nextAt:this.typed+Math.floor(rand(6,9))};
        FX.text(W/2,H*0.35,'BLACKOUT! TYPE FROM MEMORY',JCOL.ok);
      }
      return;
    }
    if(this.state==='pick'){
      if(TYPE_SETS.left.includes(k))this.pick('left');
      else if(TYPE_SETS.right.includes(k))this.pick('right');
      return;
    }
    const li=this.keys.indexOf(k);
    if(li<0)return;
    const n=this.track.hit(k,t,Judge.win().ok);
    if(!n){ // wrong lane or off the beat: lose combo, no strike
      this.session.combo=0;AE.tick();FX.text(W*0.2,this.laneY(li),'✕','#ff2d2d');return;
    }
    const j=Game.hit(n.delta,this.noteX(n,Game.judgedNow()),this.laneY(n.lane),90);
    if(j==='miss'){n.burst.bad=true;this.misses++;if(this.misses>=this.maxMiss){if(Store.data.practice){this.misses=0;this.flash('PRACTICE MODE — STRIKES CLEARED','#00d2be');}else this.finish();}}
  }
  finish(){
    if(this.over)return;this.over=true;this.cond.stop();
    const s=this.session;
    if(this.champ){
      Game.endMode({
        modeId:'typing',title:'TYPING RHYTHM',
        grade:s.counts.miss===0?'PERFECT DICTATION':this.misses+' MISTYPES',gradeColor:'#ffd400',
        score:s.score,points:Math.round(s.score/15),
        goalValue:this.typed,fullCombo:s.counts.miss===0,bestCombo:s.maxCombo,
        rows:[['Sentence typed',this.sentence],['Top speed',this.cond.bpm+' BPM'],
          ['Max combo',s.maxCombo],['Accuracy',s.accuracy.toFixed(1)+'%']],
      });
      return;
    }
    Game.endMode({
      modeId:'typing',title:'TYPING RHYTHM',
      grade:this.done+' COMBOS',gradeColor:'#ffd400',
      score:s.score,points:Math.round(s.score/15),
      goalValue:this.done,fullCombo:s.counts.miss===0,bestCombo:s.maxCombo,
      rows:[['Combos cleared',this.done],['Level reached',Math.floor(this.done/4)+1],
        ['Top speed',this.cond.bpm+' BPM'],['Max combo',s.maxCombo],
        ['Accuracy',s.accuracy.toFixed(1)+'%']],
    });
  }
  render(ctx){
    bgTyping(ctx);
    if(this.champ){this.renderChamp(ctx);return;}
    if(this.state==='pick'){
      ctx.textAlign='center';ctx.fillStyle='#eef1f6';ctx.font=f(30);
      ctx.fillText('CHOOSE YOUR HAND',W/2,H*0.2);
      const panel=(cx,keys,label)=>{
        ctx.fillStyle='rgba(13,17,26,.8)';
        ctx.beginPath();ctx.roundRect(cx-W*0.19,H*0.3,W*0.38,H*0.34,14);ctx.fill();
        ctx.strokeStyle='#00d2be';ctx.lineWidth=2;ctx.stroke();
        ctx.fillStyle='#8b94a7';ctx.font=f(14,700);ctx.fillText(label,cx,H*0.37);
        const ks=Math.min(48,W*0.064);
        keys.forEach((k,i)=>{
          const kx=cx-((keys.length-1)/2-i)*Math.min(64,W*0.085);
          ctx.fillStyle=TYPE_COLS[i];
          ctx.beginPath();ctx.roundRect(kx-ks/2,H*0.42,ks,ks,8);ctx.fill();
          ctx.fillStyle='#0b0d12';ctx.font=f(22);ctx.fillText(k,kx,H*0.42+ks*0.68);
        });
        ctx.fillStyle='#ffd400';ctx.font=f(13,700);
        ctx.fillText('PRESS ANY OF THESE KEYS',cx,H*0.6);
      };
      panel(W*0.27,TYPE_SETS.left,'LEFT HAND');
      panel(W*0.73,TYPE_SETS.right,'RIGHT HAND');
      return;
    }
    const now=Game.judgedNow(),beat=this.cond.beat;
    const p=beatPulse(this.cond);
    for(let i=0;i<4;i++){ // colour lanes
      const y=this.laneY(i);
      ctx.strokeStyle='rgba(36,43,58,.8)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(W*0.12,y);ctx.lineTo(W,y);ctx.stroke();
      ctx.fillStyle=TYPE_COLS[i];ctx.font=f(26);ctx.textAlign='left';
      ctx.fillText(this.keys[i],W*0.05,y+9);
      ctx.beginPath();ctx.arc(W*0.2,y,22+p*5,0,6.283);
      ctx.strokeStyle=TYPE_COLS[i];ctx.lineWidth=3;
      ctx.globalAlpha=0.45+p*0.5;ctx.stroke();ctx.globalAlpha=1;
    }
    for(const n of this.track.notes){ // scrolling notes
      if(n.judged&&!n.missed)continue;
      const x=this.noteX(n,now);
      if(x<W*0.08||x>W+30)continue;
      const y=this.laneY(n.lane);
      ctx.beginPath();ctx.arc(x,y,17,0,6.283);
      ctx.fillStyle=n.missed?'rgba(225,6,0,.4)':TYPE_COLS[n.lane];ctx.fill();
      ctx.fillStyle='#0b0d12';ctx.font=f(16);ctx.textAlign='center';
      ctx.fillText(n.key,x,y+6);
    }
    // strikes
    ctx.textAlign='left';ctx.font=f(16);
    for(let i=0;i<this.maxMiss;i++){
      ctx.fillStyle=i<this.misses?'#e10600':'#242b3a';
      ctx.fillText('✕',16+i*22,H*0.9);
    }
    ctx.fillStyle='#8b94a7';ctx.font=f(12,700);
    ctx.fillText('LEVEL '+(Math.floor(this.done/4)+1)+' · '+this.cond.bpm+' BPM',16,H*0.95);
    if(this.msg){
      ctx.globalAlpha=clamp(this.msg.t/0.4,0,1);ctx.textAlign='center';
      ctx.fillStyle=this.msg.c;ctx.font=f(26);ctx.fillText(this.msg.s,W/2,H*0.12);ctx.globalAlpha=1;
    }
    drawHUD(ctx,this,'hit each key exactly when its note reaches the ring');
    drawCount(ctx,beat);
  }
  renderChamp(ctx){
    const now=Game.judgedNow(),beat=this.cond.beat;
    const nx=this.track.next(); // the next unjudged character
    // sentence banner — completed letters filled in, current one glowing, blacked out on demand
    const by=H*0.5;
    ctx.fillStyle='rgba(10,14,26,.85)';
    ctx.beginPath();ctx.roundRect(W/2-this.sentence.length*Math.min(30,W*0.038)/2-14,by-30,
      this.sentence.length*Math.min(30,W*0.038)+28,60,12);ctx.fill();
    ctx.strokeStyle='rgba(0,210,190,.5)';ctx.lineWidth=2;ctx.stroke();
    ctx.textAlign='center';
    for(let i=0;i<this.sentence.length;i++){
      const ch=this.sentence[i],x=this.charX(i);
      if(ch===' ')continue;
      const notesHere=this.track.notes.filter(n=>n.ci===i);
      const done=notesHere.every(n=>n.judged&&!n.missed),bad=notesHere.some(n=>n.missed);
      const isCur=nx&&nx.ci===i;
      if(this.blackout.active&&!done&&!isCur){ // redacted — type from memory
        ctx.fillStyle='#242b3a';ctx.fillRect(x-11,by-14,22,22);
        continue;
      }
      ctx.fillStyle=bad?'#e10600':done?'#00d2be':isCur?'#ffd400':'#5a6478';
      ctx.font=f(24,800);
      ctx.fillText(ch,x,by+8);
    }
    if(this.blackout.active){
      ctx.fillStyle='#ff8a00';ctx.font=f(13,800);
      ctx.fillText('⚠ BLACKOUT — TYPE FROM MEMORY',W/2,by-42);
    }
    // shift indicator for the current character
    if(nx){
      const needShift=nx.needShift;
      const p=beatPulse(this.cond);
      ctx.beginPath();ctx.arc(W/2,by+70,26+p*5,0,6.283);
      ctx.strokeStyle=needShift?'rgba(255,138,0,'+(0.5+p*0.4)+')':'rgba(0,210,190,'+(0.4+p*0.4)+')';
      ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle=needShift?'#ff8a00':'#8b94a7';ctx.font=f(15,800);
      ctx.fillText(needShift?'⇧ HOLD SHIFT':'no shift',W/2,by+76);
    }
    // strikes
    ctx.textAlign='left';ctx.font=f(16);
    for(let i=0;i<this.maxMiss;i++){
      ctx.fillStyle=i<this.misses?'#e10600':'#242b3a';
      ctx.fillText('✕',16+i*20,H*0.9);
    }
    if(this.msg){
      ctx.globalAlpha=clamp(this.msg.t/0.4,0,1);ctx.textAlign='center';
      ctx.fillStyle=this.msg.c;ctx.font=f(24);ctx.fillText(this.msg.s,W/2,H*0.16);ctx.globalAlpha=1;
    }
    drawHUD(ctx,this,'type the sentence exactly — capitals need SHIFT held down');
    drawCount(ctx,beat);
  }
  music(step,t){
    if(step<16){if(step%4===0)AE.blip(t,step===12?880:440,0.3);return;}
    const i=step%16,root=[0,-2,3,0][Math.floor(step/16)%4];
    if(on(P.kick4,i))AE.kick(t,0.85);
    if(on(P.hat8,i))AE.hat(t,0.55);
    if(i%4===2)AE.bass(t,root,0.14,0.8);
    if(on(P.snr,i))AE.clap(t,0.7);
    if(i===0)AE.lead(t,root+12,0.1,0.5);
  }
}

