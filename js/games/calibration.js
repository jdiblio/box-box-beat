/* CALIBRATION — the very first thing a new player runs. Taps against a metronome
 * tick, takes the median timing offset, and saves it as Store.data.latency so
 * every other mode can shift its judging window to match this player's real
 * audio+input delay. A self-contained "mode" in the same shape as every game
 * (constructor/start/update/render/onKeyDown) — see the README for that shape.
 * Depends on: core/*.js. */
'use strict';
/* ================= CALIBRATION — measures audio+input latency, applied to all judgments ================= */
class Calibration{
  constructor(){this.session=new Session();this.cond=new Conductor(90);this.taps=[];}
  get touchKeys(){return[{k:'SPACE',label:'TAP',big:true},{k:'ENTER',label:'SAVE'}];}
  start(){
    this.cond.patternFn=(s,t)=>{if(s%4===0)AE.blip(t,(s%16===0)?880:440,0.35);};
    this.cond.start(0.5);
  }
  get offset(){ // median of last 10 signed offsets
    if(this.taps.length<4)return null;
    const a=this.taps.slice(-10).slice().sort((x,y)=>x-y);
    return a[Math.floor(a.length/2)];
  }
  onKeyDown(k){
    if(k==='SPACE'){
      const raw=AE.now(),b=this.cond.timeToBeat(raw);
      if(b<0.5)return;
      const delta=(b-Math.round(b))*this.cond.spb;
      if(Math.abs(delta)<this.cond.spb*0.45){
        this.taps.push(delta);
        AE.tick();FX.burst(W/2,H*0.45,'#00d2be',6);
      }
    }else if(k==='ENTER'&&this.taps.length>=6){
      Store.data.latency=this.offset;Store.save();
      Game.stopMode();UI.show('menu');
    }
  }
  onKeyUp(){}
  update(){}
  render(ctx){
    ctx.fillStyle='#0b0d12';ctx.fillRect(0,0,W,H);
    const p=beatPulse(this.cond);
    ctx.beginPath();ctx.arc(W/2,H*0.42,46+p*26,0,6.283);
    ctx.strokeStyle='#00d2be';ctx.lineWidth=3+p*3;ctx.stroke();
    ctx.beginPath();ctx.arc(W/2,H*0.42,20,0,6.283);
    ctx.fillStyle='rgba(0,210,190,'+(0.25+p*0.6)+')';ctx.fill();
    ctx.textAlign='center';ctx.fillStyle='#eef1f6';ctx.font=f(26);
    ctx.fillText('CALIBRATION',W/2,H*0.16);
    ctx.font=f(14,600);ctx.fillStyle='#8b94a7';
    ctx.fillText('Tap SPACE exactly on every tick - at least 6 taps.',W/2,H*0.22);
    ctx.fillText('This measures your audio + input latency and fixes all timing.',W/2,H*0.26);
    ctx.fillStyle='#ffd400';ctx.font=f(20);
    ctx.fillText('TAPS: '+this.taps.length,W/2,H*0.62);
    const off=this.offset;
    if(off!==null){
      ctx.fillStyle='#eef1f6';ctx.font=f(18);
      ctx.fillText('Your offset: '+(off>=0?'+':'')+Math.round(off*1000)+' ms '+(off>=0?'(late)':'(early)'),W/2,H*0.68);
    }
    if(this.taps.length>=6){
      ctx.fillStyle='#00d2be';ctx.font=f(18);
      if(Math.floor(idleT*2)%2===0)ctx.fillText('PRESS ENTER TO SAVE',W/2,H*0.76);
    }
  }
}

