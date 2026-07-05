/* PRINT HEAD HERO — a 3D printer builds a random object (F1 car, rocket,
 * trophy, violin, glider, or a Benchy boat) one horizontal slice per beat,
 * Stack-style. Each shape in PRINT_SHAPES is a width profile (r(t), 0=bottom
 * 1=top) plus an optional asymmetric "feature" call-out (wings, wheels, fins,
 * handles, wingspan) — the profiles are deliberately exaggerated (wide-narrow-
 * wide for the car, a thin stem into a sudden wide cup for the trophy, one
 * huge sideways flare for the glider's wingspan, etc.) so each object reads
 * as genuinely different from the others instead of "a vase every time."
 * Champions is the same shapes, just faster (Judge.bpmMul()) — there is no
 * color-swap mechanic; an earlier version had one but it never read clearly
 * (miss/ok layers always forced red/orange over it) so it's gone entirely.
 * Depends on: core/*.js, art/backgrounds.js. */
'use strict';
/* ============================================================
   PRINT HEAD HERO — a real 3D printer builds a SURPRISE object,
   one slice per beat, Stack-style. Misses shift the slices.
   ============================================================ */
const PRINT_SHAPES=[ // each shape: r(t) is the main silhouette half-width 0..1 bottom→top;
  // feature(i,LAYERS) optionally adds a symmetric call-out (wing/handle/fin/wheel) at specific layers
  {n:'F1 CAR',c:'#e10600',r:t=>{
    if(t<0.08)return 0.85; // front wing — wide flat base
    if(t<0.22)return lerp(0.85,0.42,(t-0.08)/0.14); // taper up off the wing into the nose
    if(t<0.65)return 0.4+0.06*Math.sin((t-0.22)/0.43*Math.PI); // low, wide sidepod body
    if(t<0.8)return lerp(0.42,0.22,(t-0.65)/0.15); // taper to the cockpit
    if(t<0.92)return 0.2; // halo / roll hoop
    return lerp(0.2,0.85,(t-0.92)/0.08); // rear wing — flares wide again at the very top
  },feature:(i,L)=>{const t=i/L;
    if(t>0.28&&t<0.36)return{side:0,w:0.22}; // front wheels
    if(t>0.52&&t<0.6)return{side:0,w:0.22}; // rear wheels
    return null;}},
  {n:'MOON ROCKET',c:'#7fd4ff',r:t=>{
    if(t<0.1)return lerp(0.55,0.32,t/0.1); // fin-flared base tapering up fast
    if(t<0.78)return 0.3; // long straight body
    if(t<0.92)return lerp(0.3,0.12,(t-0.78)/0.14); // shoulder into the nose
    return lerp(0.12,0.02,(t-0.92)/0.08); // sharp pointed nose tip
  },feature:(i,L)=>{const t=i/L;return t<0.1?{side:0,w:0.4}:null;}}, // fins flaring at the base
  {n:'GOLD TROPHY',c:'#ffd400',r:t=>{
    if(t<0.08)return 0.55; // base
    if(t<0.2)return lerp(0.55,0.13,(t-0.08)/0.12); // stem taper down
    if(t<0.42)return 0.13; // thin stem
    if(t<0.56)return lerp(0.13,0.75,(t-0.42)/0.14); // flares out into the cup
    if(t<0.82)return 0.75; // wide cup body
    return lerp(0.75,0.5,(t-0.82)/0.18); // cup rim
  },feature:(i,L)=>{const t=i/L;return(t>0.48&&t<0.68)?{side:0,w:0.32}:null;}}, // handles on the cup
  {n:'VIOLIN',c:'#c9863c',r:t=>{
    if(t<0.22)return 0.45+0.22*Math.sin(t/0.22*Math.PI); // lower bout
    if(t<0.36)return lerp(0.55,0.24,(t-0.22)/0.14); // waist
    if(t<0.56)return 0.24+0.26*Math.sin((t-0.36)/0.2*Math.PI); // upper bout (smaller than lower)
    if(t<0.6)return 0.24; // shoulder
    if(t<0.94)return lerp(0.14,0.05,(t-0.6)/0.34); // long thin neck
    return 0.12; // scroll
  }},
  {n:'GLIDER',c:'#5cf2c8',r:t=>{
    if(t<0.5)return 0.12; // thin fuselage
    if(t<0.56)return 0.12+0.04*Math.sin((t-0.5)/0.06*Math.PI); // canopy bump
    if(t<0.88)return 0.11;
    return lerp(0.11,0.3,(t-0.88)/0.12); // tail fin
  },feature:(i,L)=>{const t=i/L;return(t>0.52&&t<0.58)?{side:0,w:2}:null;}}, // one huge wingspan flare
  {n:'BENCHY BOAT',c:'#8ec6ff',r:t=>{
    if(t<0.1)return lerp(0.85,0.7,t/0.1); // wide boxy hull base
    if(t<0.42)return 0.7; // hull
    if(t<0.5)return lerp(0.7,0.3,(t-0.42)/0.08); // deck narrows sharply
    if(t<0.72)return 0.3; // cabin band
    if(t<0.88)return lerp(0.3,0.14,(t-0.72)/0.16); // bow taper begins
    return lerp(0.14,0.02,(t-0.88)/0.12); // sharp pointed bow
  },feature:(i,L)=>{const t=i/L;return(t>0.5&&t<0.58)?{side:0,w:0.16}:null;}}, // wheelhouse/cabin box
];
class PrintHeadHero{
  constructor(){
    this.session=new Session();
    this.champ=Judge.champ();
    this.baseBpm=Math.round(110*Judge.bpmMul());
    this.cond=new Conductor(this.baseBpm);
    this.track=new NoteTrack(this.cond);
    this.shape=choice(PRINT_SHAPES); // a different surprise every run
    this.LAYERS=48;this.layers=[];this.over=false;this.state='print';this.showT=0;
    for(let i=0;i<this.LAYERS;i++)
      this.track.add({beat:8+i,key:'SPACE',kind:'layer',layer:i});
  }
  get touchKeys(){return[{k:'SPACE',label:'PRINT',big:true}];}
  start(){this.cond.patternFn=(s,t)=>this.music(s,t);this.cond.start(0.6);}
  vaseR(t){ // slice radius of the current shape, 0..1 bottom→top
    const s=Math.min(60,W*0.11);
    return Math.max(0.04,this.shape.r(clamp(t,0,0.999)))*s;
  }
  setLayer(i,j){
    const off=j==='perfect'?0:j==='good'?rand(1,2.5):j==='ok'?rand(3,6):rand(8,17);
    this.layers[i]={off:off*(Math.random()<0.5?-1:1),j,age:0};
  }
  update(dt){
    if(this.over)return;
    const now=Game.judgedNow(),beat=this.cond.beat;
    for(const l of this.layers)if(l)l.age+=dt;
    this.track.sweep(now,Judge.win().ok,n=>{
      Game.missAt(W/2,H*0.3);this.setLayer(n.layer,'miss');FX.kick(3);
    });
    // tempo ramps as the print grows
    if(beat>8+16&&this.cond.bpm===this.baseBpm)this.cond.setBpm(Math.round(this.baseBpm*120/110));
    if(beat>8+32&&this.cond.bpm===Math.round(this.baseBpm*120/110))this.cond.setBpm(Math.round(this.baseBpm*132/110));
    if(this.state==='print'&&beat>8+this.LAYERS+1){this.state='show';this.showT=0;AE.boost();}
    if(this.state==='show'){
      const old=this.showT;this.showT+=dt;
      if((old*2|0)!==(this.showT*2|0)) // confetti bursts
        FX.burst(rand(W*0.25,W*0.75),rand(H*0.15,H*0.5),choice(CROWD_COLS),10);
      if(this.showT>5)this.finish();
    }
  }
  onKeyDown(k,t){
    if(this.over||this.state!=='print'||k!=='SPACE')return;
    const n=this.track.hit('SPACE',t,Judge.win().ok);
    if(!n){AE.tick();this.session.combo=0;return;}
    const hx=W/2+((n.layer%2)?-1:1)*this.vaseR(n.layer/this.LAYERS);
    const j=Game.hit(n.delta,hx,this.layerY(n.layer),90);
    this.setLayer(n.layer,j);
    AE.tone(AE.now(),{type:'square',f:n.layer%2?760:580,dur:0.06,vol:0.1}); // servo
  }
  layerY(i){return H*0.78-i*(H*0.5/this.LAYERS);}
  cleanRate(){
    let c=0,n=0;
    for(let i=0;i<this.LAYERS;i++){const l=this.layers[i];if(l){n++;if(Math.abs(l.off)<1)c++;}}
    return n?c/n:0;
  }
  finish(){
    if(this.over)return;this.over=true;this.cond.stop();
    const s=this.session,cr=this.cleanRate()*100;
    let grade,gc;
    if(cr>=92){grade='MASTERPIECE';gc='#00d2be';}
    else if(cr>=75){grade='SOLID PRINT';gc='#ffd400';}
    else if(cr>=50){grade='WOBBLY';gc='#8b94a7';}
    else{grade='SPAGHETTI';gc='#e10600';}
    if(!Store.data.printedShapes.includes(this.shape.n)){Store.data.printedShapes.push(this.shape.n);Store.save();}
    Game.endMode({
      modeId:'printer',title:'PRINT HEAD HERO',grade,gradeColor:gc,
      score:s.score,points:Math.round(s.score/15),
      goalValue:cr,fullCombo:s.counts.miss===0,bestCombo:s.maxCombo,
      rows:[['Object printed',this.shape.n],['Clean slices',cr.toFixed(0)+'%'],
        ['Max combo',s.maxCombo],['Accuracy',s.accuracy.toFixed(1)+'%'],
        ['Misses',s.counts.miss]],
    });
  }
  drawObject(ctx,cx,baseY,scale,ghost){
    const lh=H*0.5/this.LAYERS;
    if(ghost){ // dotted outline of the finished object
      ctx.beginPath();
      for(let i=0;i<=this.LAYERS;i++){const y=baseY-i*lh*scale,r=this.vaseR(i/this.LAYERS)*scale;
        if(i)ctx.lineTo(cx-r,y);else ctx.moveTo(cx-r,y);}
      for(let i=this.LAYERS;i>=0;i--){const y=baseY-i*lh*scale,r=this.vaseR(i/this.LAYERS)*scale;
        ctx.lineTo(cx+r,y);}
      ctx.closePath();
      ctx.strokeStyle='rgba(238,241,246,.16)';ctx.lineWidth=1.5;
      ctx.setLineDash([4,4]);ctx.stroke();ctx.setLineDash([]);
    }
    for(let i=0;i<this.LAYERS;i++){
      const l=this.layers[i];if(!l)continue;
      const r=this.vaseR(i/this.LAYERS)*scale,y=baseY-i*lh*scale;
      const dropT=clamp(l.age/0.18,0,1),eased=1-Math.pow(1-dropT,3); // smoother ease-out drop-in
      const yy=y-(1-eased)*18,rowH=Math.max(2,lh*scale-1),baseX=cx+l.off*scale;
      const clean=Math.abs(l.off)<1;
      const col=l.j==='miss'?'#e10600':l.j==='ok'?'#ff8a00':this.shape.c;
      ctx.fillStyle=col;ctx.globalAlpha=l.j==='good'?0.85:0.95;
      ctx.fillRect(baseX-r,yy,r*2,rowH);
      const feat=this.shape.feature&&this.shape.feature(i,this.LAYERS); // wing/handle/fin call-out
      if(feat){
        const fw=feat.w*Math.min(60,W*0.11)*scale;
        if(feat.side<=0)ctx.fillRect(baseX-r-fw,yy,fw,rowH);
        if(feat.side>=0)ctx.fillRect(baseX+r,yy,fw,rowH);
      }
      ctx.globalAlpha=1;
      if(clean){ // clean layer: a thin bright rim so accuracy is visible at a glance
        ctx.strokeStyle='rgba(0,210,190,.55)';ctx.lineWidth=1;
        ctx.strokeRect(baseX-r,yy,r*2,rowH);
      }else if(l.j==='miss'){ // messy layer: a dashed red outline makes the flaw obvious
        ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=1;ctx.setLineDash([2,2]);
        ctx.strokeRect(baseX-r,yy,r*2,rowH);ctx.setLineDash([]);
      }
      if(l.age<0.3){ // fresh-slice flash
        ctx.globalAlpha=(1-l.age/0.3)*0.8;
        ctx.fillStyle='#ffffff';
        ctx.fillRect(baseX-r,yy,r*2,rowH);
      }
    }
    ctx.globalAlpha=1;
  }
  render(ctx){
    const now=Game.judgedNow(),beat=this.cond.beat;
    bgWorkshop(ctx);
    if(this.state==='show'){
      const cr=this.cleanRate()*100;
      const gc=cr>=92?'#00d2be':cr>=75?'#ffd400':cr>=50?'#8b94a7':'#e10600';
      const glowP=0.3+beatPulse(this.cond)*0.15;
      const g=ctx.createRadialGradient(W/2,H*0.5,20,W/2,H*0.5,Math.min(W,H)*0.5);
      g.addColorStop(0,gc+Math.round(glowP*80).toString(16).padStart(2,'0'));
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      ctx.textAlign='center';ctx.fillStyle='#eef1f6';ctx.font=f(30,900);
      ctx.fillText('PRINT COMPLETE!',W/2,H*0.1);
      ctx.fillStyle=this.shape.c;ctx.font=f(24,800);
      ctx.fillText(this.shape.n,W/2,H*0.17);
      ctx.fillStyle='#242b3a';ctx.beginPath(); // pedestal
      ctx.roundRect(W/2-90,H*0.84,180,16,6);ctx.fill();
      ctx.strokeStyle=gc;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(W/2-90,H*0.84,180,16,6);ctx.stroke();
      const bob=Math.sin(idleT*1.4)*4,tilt=Math.sin(idleT*0.9)*0.02; // gentle showcase bob/tilt
      ctx.save();ctx.translate(W/2,0);ctx.rotate(tilt);ctx.translate(-W/2,bob);
      this.drawObject(ctx,W/2,H*0.83,1.35,false);
      ctx.restore();
      ctx.fillStyle=gc;ctx.font=f(24,900);
      ctx.fillText(cr.toFixed(0)+'% CLEAN SLICES',W/2,H*0.93);
      return;
    }
    // ------- the 3D printer -------
    const fl=W*0.2,fr=W*0.8,ft=H*0.12,fb=H*0.84;
    const column=x=>{const mg=ctx.createLinearGradient(x-9,0,x+9,0);
      mg.addColorStop(0,'#2a3140');mg.addColorStop(0.5,'#6a7690');mg.addColorStop(1,'#2a3140');
      ctx.fillStyle=mg;ctx.fillRect(x-9,ft,18,fb-ft);};
    column(fl);column(fr);
    ctx.fillStyle='#39435a';ctx.fillRect(fl-14,ft-14,fr-fl+28,14); // top beam
    ctx.fillStyle='#e10600';ctx.fillRect(fl-14,ft-14,fr-fl+28,3);
    // base with live control screen
    ctx.fillStyle='#1c2230';ctx.beginPath();ctx.roundRect(fl-16,fb,fr-fl+32,H*0.055,6);ctx.fill();
    ctx.fillStyle='#0b0d12';ctx.fillRect(fl+8,fb+6,W*0.14,H*0.035);
    const prog=clamp((beat-8)/this.LAYERS,0,1);
    ctx.fillStyle='#8b94a7';ctx.font=f(9,700);ctx.textAlign='left';
    ctx.fillText(this.shape.n,fl+12,fb+16);
    ctx.fillStyle='#00d2be';ctx.fillRect(fl+12,fb+H*0.045-8,W*0.13*prog,4);
    ctx.fillStyle='#ffd400';ctx.beginPath();ctx.arc(fr-30,fb+H*0.028,7,0,6.283);ctx.fill();
    // heated bed
    ctx.fillStyle='#242b3a';ctx.fillRect(W*0.28,H*0.785,W*0.44,8);
    ctx.fillStyle='rgba(255,138,0,.35)';ctx.fillRect(W*0.28,H*0.793,W*0.44,3);
    // the object with its ghost outline
    this.drawObject(ctx,W/2,H*0.78,1,true);
    // gantry at the current layer
    const nx=this.track.next();
    const cur=nx?nx.layer:this.LAYERS-1;
    const y=this.layerY(cur)-8;
    ctx.fillStyle='#39435a';ctx.fillRect(fl,y-4,fr-fl,8);
    ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(fl,y+2,fr-fl,2); // belt
    let ph=0;
    if(nx){ph=1-clamp((this.cond.beatToTime(nx.beat)-now)/this.cond.spb,0,1);}
    const from=(cur%2)?W*0.72:W*0.28,to=(cur%2)?W*0.28:W*0.72;
    const hx=lerp(from,to,ph);
    // filament spool on the beam, spinning as it feeds
    const sx=fr-26,sy=ft-46;
    ctx.fillStyle='#171c28';ctx.beginPath();ctx.arc(sx,sy,22,0,6.283);ctx.fill();
    ctx.strokeStyle=this.shape.c;ctx.lineWidth=7;ctx.beginPath();ctx.arc(sx,sy,14,0,6.283);ctx.stroke();
    const rot=(cur+ph)*1.7;
    ctx.strokeStyle='#0c1018';ctx.lineWidth=2;
    for(let a=0;a<3;a++){ctx.beginPath();
      ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(rot+a*2.09)*20,sy+Math.sin(rot+a*2.09)*20);ctx.stroke();}
    ctx.strokeStyle=this.shape.c;ctx.lineWidth=2.5; // filament curve to the head
    ctx.beginPath();ctx.moveTo(sx,sy+22);
    ctx.quadraticCurveTo(hx+40,(sy+y)/2+Math.sin(idleT*3)*8,hx,y-16);
    ctx.stroke();
    // print head: body, spinning fan, hot end, nozzle
    ctx.fillStyle='#eef1f6';ctx.beginPath();ctx.roundRect(hx-16,y-16,32,30,5);ctx.fill();
    ctx.fillStyle='#171c28';ctx.beginPath();ctx.arc(hx,y-1,9,0,6.283);ctx.fill();
    ctx.strokeStyle='#8b94a7';ctx.lineWidth=2;
    const fanR=idleT*14;
    for(let a=0;a<3;a++){ctx.beginPath();
      ctx.moveTo(hx,y-1);ctx.lineTo(hx+Math.cos(fanR+a*2.09)*7,y-1+Math.sin(fanR+a*2.09)*7);ctx.stroke();}
    ctx.fillStyle='#ff8a00';ctx.fillRect(hx-6,y+14,12,5); // heat block
    ctx.fillStyle='#e10600';ctx.beginPath();ctx.moveTo(hx-6,y+19);ctx.lineTo(hx+6,y+19);ctx.lineTo(hx,y+27);ctx.closePath();ctx.fill();
    const p=beatPulse(this.cond); // beat glow at the nozzle
    ctx.beginPath();ctx.arc(hx,y+30,4+p*7,0,6.283);
    ctx.fillStyle='rgba(255,212,0,'+(0.2+p*0.6)+')';ctx.fill();
    // labels
    ctx.textAlign='left';ctx.fillStyle='#8b94a7';ctx.font=f(14,700);
    ctx.fillText('LAYER '+Math.min(this.LAYERS,cur+1)+'/'+this.LAYERS,fl,H*0.1);
    ctx.textAlign='right';ctx.fillText(this.cond.bpm+' BPM',fr,H*0.1);
    ctx.textAlign='center';ctx.fillStyle=this.shape.c;ctx.font=f(16);
    ctx.fillText('NOW PRINTING: '+this.shape.n,W/2,ft-24);
    drawHUD(ctx,this,'SPACE on every beat — drop each slice like STACK');
    drawCount(ctx,beat);
  }
  music(step,t){
    if(step<16){if(step%4===0)AE.blip(t,step===12?880:440,0.3);return;}
    const i=step%16,bar=Math.floor(step/16),root=[0,0,-4,-2][bar%4];
    if(on(P.kick4,i))AE.kick(t,0.9);
    if(on(bar>6?P.hat16:P.hat8,i))AE.hat(t,0.5);
    if(i%2===0)AE.bass(t,root+(i%8===6?7:0),0.12,0.85);
    if(on(P.snr,i))AE.snare(t,0.6);
    if(i%4===1)AE.lead(t,root+[12,15,19,22][(i>>2)%4],0.08,0.55,'sawtooth');
  }
}
