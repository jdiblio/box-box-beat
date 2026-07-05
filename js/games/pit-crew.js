/* PIT CREW ENDLESS — cars keep arriving forever, tempo climbing every time.
 * Championship-only (champHard(), see conductor.js): cars occasionally
 * double-stack (two at once, alternate between them) and wheel guns can jam,
 * needing a rapid double-tap to clear — arcade play never sees either,
 * regardless of difficulty. Depends on: core/*.js, art/backgrounds.js, art/cars.js. */
'use strict';
/* ============================================================
   PIT CREW ENDLESS — cars keep coming, patterns keep speeding up.
   ============================================================ */
class PitCrewEndless{
  constructor(){
    this.session=new Session();
    this.champ=champHard();
    this.cond=new Conductor(Math.round(100*(this.champ?CHAMPIONSHIP_SPEED_MUL:1)));
    this.track=new NoteTrack(this.cond);
    this.health=5;this.cars=0;this.carMisses=0;this.over=false;this.msg=null;
    this.doubleStack=false;this.jamsCleared=0;this.pendingJamKey=null;this.pendingJamT=0;
  }
  get touchKeys(){return[{k:'Q',label:'Q'},{k:'W',label:'W'},{k:'A',label:'A'},{k:'S',label:'S'}];}
  start(){
    this.scheduleCar(8);
    this.cond.patternFn=(s,t)=>this.music(s,t);
    this.cond.start(0.6);
  }
  wheelPos(w,car){
    if(car===undefined){
      const cx=W/2,cy=H*0.52,dx=Math.min(95,W*0.18),dy=Math.min(105,H*0.16);
      return{x:cx+(w%2?dx:-dx),y:cy+(w>1?dy:-dy)};
    }
    const cx=car===0?W*0.27:W*0.73,cy=H*0.52,dx=Math.min(62,W*0.11),dy=Math.min(72,H*0.1);
    return{x:cx+(w%2?dx:-dx),y:cy+(w>1?dy:-dy)};
  }
  scheduleCar(b){
    this.track.clear();
    this.carStart=b;this.carMisses=0;
    this.doubleStack=this.champ&&this.cars>=2&&Math.random()<0.3;
    if(this.doubleStack){ // two cars at once — alternate wheels between them
      const oA=shuffle([0,1,2,3]),oB=shuffle([0,1,2,3]);
      let t2=b+2;
      for(let w=0;w<4;w++)for(let h=0;h<3;h++){
        this.track.add({beat:t2,key:WHEEL_KEYS[oA[w]],kind:'pit',wheel:oA[w],hi:h,car:0});
        t2+=0.5;
        this.track.add({beat:t2,key:WHEEL_KEYS[oB[w]],kind:'pit',wheel:oB[w],hi:h,car:1});
        t2+=0.5;
      }
      this.carEnd=t2+1;
    }else{
      const order=this.cars<3?[0,1,2,3]:shuffle([0,1,2,3]);
      for(let w=0;w<4;w++)for(let h=0;h<3;h++){
        const jam=this.champ&&Math.random()<0.15;
        this.track.add({beat:b+2+w*2+h*0.5,key:WHEEL_KEYS[order[w]],kind:'pit',wheel:order[w],hi:h,jam});
      }
      this.carEnd=b+9;
    }
  }
  flash(s,c){this.msg={s,t:1.3,c:c||'#ffd400'};}
  update(dt){
    if(this.over)return;
    const now=Game.judgedNow(),beat=this.cond.beat;
    this.track.sweep(now,Judge.win().ok,n=>{
      const p=this.wheelPos(n.wheel,n.car);Game.missAt(p.x,p.y);
      this.carMisses++;this.health--;
      if(this.health<=0){if(Store.data.practice){this.health=5;this.flash('PRACTICE MODE — TYRES REFILLED','#00d2be');}else this.finish();}
    });
    if(this.over)return;
    if(this.msg){this.msg.t-=dt;if(this.msg.t<=0)this.msg=null;}
    if(this.pendingJamKey&&now-this.pendingJamT>0.35)this.pendingJamKey=null;
    if(this.track.allJudged()&&beat>this.carEnd){
      this.cars++;
      if(this.carMisses===0){
        this.health=Math.min(5,this.health+1);
        this.session.score+=this.doubleStack?450:250;AE.boost();FX.boom(0.12);
        this.flash(this.doubleStack?'DOUBLE STOP PERFECT! +1 TYRE':'PERFECT STOP! +1 TYRE','#00d2be');
      }else this.flash('CAR '+this.cars+' RELEASED');
      this.cond.setBpm(Math.min(this.champ?230:190,Math.round(100*(this.champ?CHAMPIONSHIP_SPEED_MUL:1))+this.cars*4));
      this.scheduleCar(Math.ceil(beat)+2);
    }
  }
  onKeyDown(k,t){
    if(this.over||!WHEEL_KEYS.includes(k))return;
    // gun jam: the first tap only loosens it — a second rapid tap on the same key clears it
    const jn=this.track.notes.find(n=>!n.judged&&n.jam&&n.key===k&&Math.abs(t-this.cond.beatToTime(n.beat))<=Judge.win().ok*1.6);
    if(jn){
      if(this.pendingJamKey===k&&t-this.pendingJamT<=0.35){
        this.pendingJamKey=null;
        jn.judged=true;jn.delta=t-this.cond.beatToTime(jn.beat);
        const p=this.wheelPos(jn.wheel,jn.car);
        const j=Game.hit(jn.delta,p.x,p.y,90);
        if(jn.hi===1)AE.clunk();else AE.gun();
        this.jamsCleared++;FX.text(p.x,p.y-40,'JAM CLEARED!','#ffd400');
        if(j==='miss'){this.carMisses++;this.health--;if(this.health<=0){if(Store.data.practice){this.health=5;this.flash('PRACTICE MODE — TYRES REFILLED','#00d2be');}else this.finish();}}
        return;
      }
      this.pendingJamKey=k;this.pendingJamT=t;
      const p=this.wheelPos(jn.wheel,jn.car);
      FX.text(p.x,p.y-30,'JAMMED! TAP AGAIN',JCOL.ok);AE.tick();
      return;
    }
    const n=this.track.hit(k,t,Judge.win().ok);
    if(!n){AE.tick();return;}
    const p=this.wheelPos(n.wheel,n.car);
    const j=Game.hit(n.delta,p.x,p.y,80);
    if(n.hi===1)AE.clunk();else AE.gun();
    if(j==='miss'){this.carMisses++;this.health--;if(this.health<=0){if(Store.data.practice){this.health=5;this.flash('PRACTICE MODE — TYRES REFILLED','#00d2be');}else this.finish();}}
  }
  finish(){
    if(this.over)return;this.over=true;this.cond.stop();
    const s=this.session;
    Game.endMode({
      modeId:'pitcrew',title:'PIT CREW ENDLESS',
      grade:this.cars+' CARS SERVICED',gradeColor:'#ffd400',
      score:s.score,points:Math.round(s.score/15),
      goalValue:this.cars,fullCombo:s.counts.miss===0,bestCombo:s.maxCombo,
      rows:[['Cars serviced',this.cars],['Top speed',this.cond.bpm+' BPM'],
        ['Max combo',s.maxCombo],['Accuracy',s.accuracy.toFixed(1)+'%']]
        .concat(this.champ?[['Gun jams cleared',this.jamsCleared]]:[]),
    });
  }
  renderWheels(ctx,now,car){
    const STEP=['GUN OFF','SWAP','GUN ON'];
    for(let w=0;w<4;w++){
      const p=this.wheelPos(w,car);
      const notes=this.track.notes.filter(n=>n.wheel===w&&n.car===car);
      const done=notes.filter(n=>n.judged).length,missed=notes.some(n=>n.missed);
      const nextNote=notes.find(n=>!n.judged);
      const curHi=nextNote?nextNote.hi:2;
      const mechSide=(w%2===0)?-1:1;
      ctx.save();ctx.translate(p.x+mechSide*(car===undefined?34:22),p.y);if(mechSide>0)ctx.scale(-1,1);
      drawPitMechanic(ctx,0,0,done<3&&(curHi===0||curHi===2),done<3&&curHi===1);
      ctx.restore();
      const jammed=nextNote&&nextNote.jam&&this.pendingJamKey===nextNote.key;
      ctx.beginPath();ctx.arc(p.x,p.y,car===undefined?24:17,0,6.283);
      ctx.fillStyle=done===notes.length?(missed?'#5a2230':'#0f2f2c'):jammed?'#5a3a10':'#171c28';ctx.fill();
      ctx.lineWidth=4;ctx.strokeStyle=done===notes.length?(missed?'#e10600':'#00d2be'):jammed?'#ff8a00':'#242b3a';ctx.stroke();
      ctx.fillStyle='#eef1f6';ctx.font=f(car===undefined?20:15);ctx.textAlign='center';
      ctx.fillText(notes.length?WHEEL_KEYS[notes[0].wheel]:'',p.x,p.y+6);
      let shown=0;
      for(const n of notes){
        if(n.judged||shown>=2)continue;
        const d2=this.cond.beatToTime(n.beat)-now;
        if(d2>1.6)break;
        if(d2>-0.15){
          const r=(car===undefined?26:19)+Math.max(0,d2)*(car===undefined?110:80);
          ctx.beginPath();ctx.arc(p.x,p.y,r,0,6.283);
          ctx.strokeStyle=n.jam?'rgba(255,138,0,'+clamp(1.3-d2,0.15,1)+')':'rgba(255,212,0,'+clamp(1.3-d2,0.15,1)+')';
          ctx.lineWidth=shown===0?3:1.5;ctx.stroke();
          if(shown===0){
            ctx.fillStyle=n.jam?'#ff8a00':'#ffd400';ctx.font=f(car===undefined?11:9,700);
            ctx.fillText(n.jam?(jammed?'TAP AGAIN!':'JAM — DOUBLE TAP'):STEP[n.hi],p.x,p.y-(car===undefined?34:26));
          }
          shown++;
        }
      }
      for(let i=0;i<3;i++){
        ctx.beginPath();ctx.arc(p.x-14+i*14,p.y+(car===undefined?38:30),4,0,6.283);
        ctx.fillStyle=i<done?'#00d2be':'#242b3a';ctx.fill();
      }
    }
  }
  render(ctx){
    const beat=this.cond.beat,now=Game.judgedNow();
    bgPitGarage(ctx);
    ctx.strokeStyle='#ffd400';ctx.lineWidth=3;
    ctx.strokeRect(W/2-Math.min(150,W*0.3),H*0.52-Math.min(165,H*0.27),Math.min(300,W*0.6),Math.min(330,H*0.54));
    // car(s) slide into the box
    const slide=clamp((beat-this.carStart)/2,0,1);
    const cy=H*0.52-(1-slide)*H*0.7;
    if(this.doubleStack){
      drawF1Top(ctx,W*0.27,cy,Math.min(62,W*0.11),Math.min(72,H*0.1),'#e10600');
      drawF1Top(ctx,W*0.73,cy,Math.min(62,W*0.11),Math.min(72,H*0.1),'#2f7df6');
      if(slide>=0.95){
        ctx.textAlign='center';ctx.fillStyle='#ffd400';ctx.font=f(13,800);
        ctx.fillText('DOUBLE STACK — ALTERNATE BETWEEN CARS',W/2,H*0.3);
        drawJackPerson(ctx,W*0.27,cy-Math.min(72,H*0.1)-4);
        drawJackPerson(ctx,W*0.73,cy-Math.min(72,H*0.1)-4);
        this.renderWheels(ctx,now,0);this.renderWheels(ctx,now,1);
      }
    }else{
      drawF1Top(ctx,W/2,cy,Math.min(95,W*0.18),Math.min(105,H*0.16),
        ['#e10600','#2f7df6','#00d2be','#ff8a00','#a04df6'][this.cars%5]);
      if(slide>=0.95){
        drawJackPerson(ctx,W/2,cy-Math.min(105,H*0.16)-6); // holding the front of the car up
        this.renderWheels(ctx,now,undefined);
      }
    }
    // health tyres + car counter
    for(let i=0;i<5;i++){
      ctx.beginPath();ctx.arc(28+i*30,74,11,0,6.283);
      ctx.fillStyle=i<this.health?'#00d2be':'#242b3a';ctx.fill();
    }
    ctx.textAlign='right';ctx.fillStyle='#eef1f6';ctx.font=f(20);
    ctx.fillText('CAR '+(this.cars+1)+' · '+this.cond.bpm+' BPM',W-16,74);
    if(this.msg){
      ctx.globalAlpha=clamp(this.msg.t/0.4,0,1);ctx.textAlign='center';
      ctx.fillStyle=this.msg.c;ctx.font=f(26);ctx.fillText(this.msg.s,W/2,H*0.2);ctx.globalAlpha=1;
    }
    drawHUD(ctx,this,'Q W front · A S rear — gun off, swap, gun on');
    drawCount(ctx,beat);
  }
  music(step,t){
    if(step<16){if(step%4===0)AE.blip(t,step===12?880:440,0.3);return;}
    const i=step%16,root=[0,0,3,-2][Math.floor(step/16)%4];
    if(i%2===0)AE.hat(t,0.75);
    if(on(P.pitTom,i))AE.tom(t,i%4===0?175:120,0.85);
    if(i%8===4)AE.snare(t,0.7);
    if(i%4===2)AE.bass(t,root+12,0.09,0.75);
    if(this.cars>=5&&on(P.kick4,i))AE.kick(t,0.8);
  }
}

