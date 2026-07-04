/* FX — all the juicy visual feedback layered on top of gameplay: floating judge
 * text ("PERFECT!"), particle bursts, screen shake, screen flash, the expanding
 * glow ring on a perfect hit, and the combo/outro zoom applied in FX.apply().
 * Every mode calls into this rather than drawing its own feedback, so it stays
 * consistent across all of them. Depends on: utils.js. */
'use strict';
/* ================= FX — floating judgments, particles, shake, flash ================= */
const JCOL={perfect:'#00d2be',good:'#ffd400',ok:'#ff8a00',miss:'#ff2d2d'};
const FX={
  texts:[],parts:[],rings:[],shake:0,flash:0,comboPulse:0,outroZoom:0,
  reset(){this.texts.length=0;this.parts.length=0;this.rings.length=0;this.shake=0;this.flash=0;this.comboPulse=0;this.outroZoom=0;},
  judge(x,y,j){const L={perfect:'PERFECT!',good:'GOOD',ok:'OK',miss:'MISS'};
    this.texts.push({x,y,t:0,s:L[j],c:JCOL[j]});},
  text(x,y,s,c){this.texts.push({x,y,t:0,s,c:c||'#fff'});},
  burst(x,y,c,n){n=n||10;for(let i=0;i<n;i++){
    const a=Math.random()*6.283,v=60+Math.random()*170;
    this.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,t:0,c});}},
  ring(x,y,c){this.rings.push({x,y,c,t:0});}, // expanding glow ring — perfect-hit trail
  kick(a){this.shake=Math.min(7,this.shake+a);},
  boom(a){this.flash=Math.min(0.4,this.flash+a);},
  update(dt){
    this.shake*=Math.pow(0.001,dt);this.flash*=Math.pow(0.004,dt);
    for(const p of this.parts){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=320*dt;}
    this.parts=this.parts.filter(p=>p.t<0.7);
    for(const x of this.texts)x.t+=dt;
    this.texts=this.texts.filter(x=>x.t<0.8);
    for(const r of this.rings)r.t+=dt;
    this.rings=this.rings.filter(r=>r.t<0.4);
  },
  apply(ctx){
    if(this.shake>0.3)ctx.translate((Math.random()-.5)*this.shake*2,(Math.random()-.5)*this.shake*2);
    const zoom=this.comboPulse*0.008+this.outroZoom*0.18;
    if(zoom>0.001){ctx.translate(W/2,H/2);ctx.scale(1+zoom,1+zoom);ctx.translate(-W/2,-H/2);}
  },
  render(ctx){
    for(const p of this.parts){ctx.globalAlpha=1-p.t/0.7;ctx.fillStyle=p.c;ctx.fillRect(p.x-2,p.y-2,4,4);}
    for(const r of this.rings){
      ctx.globalAlpha=1-r.t/0.4;ctx.strokeStyle=r.c;ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(r.x,r.y,10+r.t*90,0,6.283);ctx.stroke();
    }
    ctx.globalAlpha=1;ctx.textAlign='center';
    for(const x of this.texts){const k=x.t/0.8;
      ctx.globalAlpha=1-k;ctx.fillStyle=x.c;ctx.font=f(22);ctx.fillText(x.s,x.x,x.y-34*k);}
    ctx.globalAlpha=1;
    if(this.flash>0.01){ctx.fillStyle='rgba(255,255,255,'+this.flash.toFixed(3)+')';ctx.fillRect(0,0,W,H);}
  },
};

