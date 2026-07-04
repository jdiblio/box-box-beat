/* BACKGROUNDS — the idle pit-lane animation behind menus, plus one hand-drawn
 * canvas background per game mode (bgTrack, bgKitchen, bgDojo, etc). idleT is
 * the shared animation clock these all read from, advanced once per frame in
 * meta/main.js. Depends on: utils.js (W/H/f/sr) and store.js (for the kitchen's
 * equipped skin). */
'use strict';
/* subtle animated pit-lane background behind menus */
let idleT=0; // global animation clock — advanced every frame in frame()
function renderIdle(ctx,dt){
  ctx.fillStyle='#0b0d12';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(36,43,58,.5)';ctx.lineWidth=1;
  const off=(idleT*60)%80;
  for(let x=-80+off;x<W+80;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x-140,H);ctx.stroke();}
  ctx.fillStyle='rgba(225,6,0,.05)';
  ctx.fillRect(0,H*0.72,W,6);
  for(let i=0;i<12;i++){const x=((idleT*180+i*160)%(W+200))-100;
    ctx.fillStyle='rgba(139,148,167,.06)';ctx.fillRect(x,H*0.72-2,60,2);}
}

/* ================= THEMED BACKGROUNDS — one scene per mode, all drawn live ================= */
function sr(i){const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);} // stable pseudo-random
const CROWD_COLS=['#e10600','#ffd400','#00d2be','#2f7df6','#eef1f6'];
function bgTrack(ctx,night){ // blazing sunset sky (or floodlit night), grandstands, floodlights
  const hy=H*0.34;
  const g=ctx.createLinearGradient(0,0,0,hy);
  if(night){g.addColorStop(0,'#02030a');g.addColorStop(0.6,'#070a1c');g.addColorStop(1,'#111633');}
  else{g.addColorStop(0,'#1a1a6e');g.addColorStop(0.55,'#8a2079');g.addColorStop(1,'#e0512c');}
  ctx.fillStyle=g;ctx.fillRect(0,0,W,hy+2);
  if(night){ // stars
    ctx.fillStyle='#eef1f6';
    for(let i=0;i<40;i++){ctx.globalAlpha=0.3+0.5*(0.5+0.5*Math.sin(idleT*2+i*1.7));ctx.fillRect(sr(i)*W,sr(i+50)*hy*0.8,2,2);}
    ctx.globalAlpha=1;
  }else{
    ctx.fillStyle='rgba(255,170,60,.28)';ctx.beginPath();ctx.arc(W*0.74,hy-14,52,0,6.283);ctx.fill();
    ctx.fillStyle='rgba(255,212,0,.35)';ctx.beginPath();ctx.arc(W*0.74,hy-14,34,0,6.283);ctx.fill();
    ctx.fillStyle='#ffd97a';ctx.beginPath();ctx.arc(W*0.74,hy-14,22,0,6.283);ctx.fill();
  }
  for(let i=0;i<7;i++){ // grandstands full of fans
    const x=i*W*0.15-W*0.02,w2=W*0.11,h2=16+sr(i)*26;
    ctx.fillStyle='#151a26';ctx.fillRect(x,hy-h2,w2,h2);
    ctx.fillStyle='rgba(238,241,246,.12)';ctx.fillRect(x,hy-h2,w2,3);
    ctx.globalAlpha=0.55;
    for(let d=0;d<22;d++){
      ctx.fillStyle=CROWD_COLS[(i*7+d)%5];
      ctx.fillRect(x+2+sr(i*40+d)*(w2-5),hy-h2+5+sr(i*91+d)*(h2-9),2,2);
    }
    ctx.globalAlpha=1;
  }
  for(const fx of [0.12,0.5,0.88]){ // floodlight towers
    ctx.strokeStyle='#39435a';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(W*fx,hy);ctx.lineTo(W*fx,hy-H*0.15);ctx.stroke();
    if(night){ // bright glowing floodlight heads at night
      ctx.fillStyle='rgba(255,246,216,.25)';ctx.beginPath();ctx.arc(W*fx,hy-H*0.15,26,0,6.283);ctx.fill();
    }
    ctx.fillStyle='#fff6d8';ctx.fillRect(W*fx-10,hy-H*0.15-6,20,7);
  }
}
function drawTyres(ctx,x,y,n){ // stack of slicks with coloured sidewall rings
  for(let i=0;i<n;i++){
    const ty=y-i*17;
    ctx.fillStyle='#171b22';ctx.beginPath();ctx.ellipse(x,ty,25,10,0,0,6.283);ctx.fill();
    ctx.strokeStyle='#2a3140';ctx.lineWidth=2;ctx.stroke();
    ctx.strokeStyle=['#ffd400','#e10600','#eef1f6'][i%3];ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(x,ty-3,15,5.5,0,0,6.283);ctx.stroke();
  }
}
function drawPitMechanic(ctx,x,y,active,swap){ // crouching mechanic with a wheel gun beside a tyre
  ctx.save();ctx.translate(x,y);
  if(active){ctx.translate((Math.random()-0.5)*2.5,(Math.random()-0.5)*1.5);} // gun vibration jitter
  ctx.strokeStyle='#e8c07d';ctx.lineWidth=4;ctx.lineCap='round'; // overalls/skin tone limbs
  ctx.beginPath();ctx.arc(0,-25,6.5,0,6.283);ctx.stroke(); // head
  ctx.strokeStyle='#2b3648';ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(0,-19);ctx.lineTo(2,-2);ctx.stroke(); // crouched torso
  ctx.beginPath();ctx.moveTo(2,-2);ctx.lineTo(-9,12);ctx.moveTo(2,-2);ctx.lineTo(13,10);ctx.stroke(); // crouched legs
  ctx.lineWidth=4;
  const armA=swap?-0.3:-0.1;
  ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(16+Math.cos(armA)*6,-9+Math.sin(armA)*6);ctx.stroke(); // arm to tool
  ctx.fillStyle='#ff8a00';ctx.beginPath();ctx.roundRect(14,-14,15,8,3);ctx.fill(); // wheel gun body
  ctx.fillStyle='#171c28';ctx.fillRect(28,-12,6,4); // gun nose
  if(active){ // sparks/vibration flecks off the gun
    ctx.strokeStyle='rgba(255,212,0,.85)';ctx.lineWidth=1.5;
    for(let i=0;i<3;i++){
      const a=Math.random()*6.283,r1=3,r2=7;
      ctx.beginPath();ctx.moveTo(32+Math.cos(a)*r1,-10+Math.sin(a)*r1);
      ctx.lineTo(32+Math.cos(a)*r2,-10+Math.sin(a)*r2);ctx.stroke();
    }
  }
  ctx.restore();
}
function drawJackPerson(ctx,x,y){ // person crouched at the front, holding the car up on the jack
  ctx.save();ctx.translate(x,y);
  const sway=Math.sin(idleT*2.2)*1.4;
  ctx.strokeStyle='#e8c07d';ctx.lineWidth=4;ctx.lineCap='round';
  ctx.beginPath();ctx.arc(sway,-25,6.5,0,6.283);ctx.stroke(); // head
  ctx.strokeStyle='#2b3648';ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(sway,-19);ctx.lineTo(sway,-1);ctx.stroke(); // torso
  ctx.beginPath();ctx.moveTo(sway,-1);ctx.lineTo(sway-9,13);ctx.moveTo(sway,-1);ctx.lineTo(sway+9,13);ctx.stroke(); // legs
  ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(sway,-15);ctx.lineTo(sway-13,-4);ctx.moveTo(sway,-15);ctx.lineTo(sway+13,-4);ctx.stroke(); // arms down to the jack handle
  ctx.fillStyle='#ffd400';ctx.fillRect(sway-5,-4,10,16); // jack stand
  ctx.fillStyle='#39435a';ctx.fillRect(sway-8,10,16,4); // jack base
  ctx.restore();
}
function bgPitGarage(ctx){ // pit garage: panel wall, sponsor boards, work lights, tyre stacks
  const wh=H*0.32;
  const g=ctx.createLinearGradient(0,0,0,wh);
  g.addColorStop(0,'#0d1118');g.addColorStop(1,'#1b2231');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,wh);
  ctx.strokeStyle='rgba(60,70,92,.35)';ctx.lineWidth=2;
  for(let x=30;x<W;x+=120){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,wh);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(0,wh*0.55);ctx.lineTo(W,wh*0.55);ctx.stroke();
  for(let i=0;i<6;i++){ // sponsor boards
    const x=W*0.06+i*W*0.16,w2=W*0.11,y=wh*0.62,h2=wh*0.24;
    ctx.fillStyle=['#2f7df6','#e10600','#00d2be'][i%3];ctx.fillRect(x,y,w2,h2);
    ctx.fillStyle='rgba(238,241,246,.3)';ctx.fillRect(x+w2*0.15,y+h2*0.36,w2*0.7,h2*0.28);
  }
  for(let i=0;i<Math.floor(W/26);i++){ // bunting flags
    const x=i*26,dip=Math.sin(i*0.7)*4;
    ctx.fillStyle=CROWD_COLS[i%5];
    ctx.beginPath();ctx.moveTo(x,wh*0.48+dip);ctx.lineTo(x+22,wh*0.48+dip);
    ctx.lineTo(x+11,wh*0.48+dip+14);ctx.closePath();ctx.fill();
  }
  ctx.fillStyle='#242b3a';ctx.fillRect(W*0.18,wh*0.14,W*0.64,8); // hanging light rig
  ctx.fillStyle='#fff6d8';ctx.fillRect(W*0.2,wh*0.14+8,W*0.6,5);
  const lg=ctx.createLinearGradient(0,wh*0.2,0,H*0.8); // cone of light onto the box
  lg.addColorStop(0,'rgba(255,246,216,.10)');lg.addColorStop(1,'rgba(255,246,216,0)');
  ctx.fillStyle=lg;
  ctx.beginPath();ctx.moveTo(W*0.2,wh*0.2);ctx.lineTo(W*0.8,wh*0.2);
  ctx.lineTo(W*0.96,H*0.8);ctx.lineTo(W*0.04,H*0.8);ctx.closePath();ctx.fill();
  ctx.fillStyle='#12161f';ctx.fillRect(0,wh,W,H-wh); // floor
  ctx.fillStyle='rgba(255,212,0,.55)';ctx.fillRect(0,wh-2,W,4); // pit lane line
  ctx.strokeStyle='rgba(255,255,255,.03)';ctx.lineWidth=1;
  for(let i=1;i<7;i++){const y=wh+(H-wh)*i/7;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  drawTyres(ctx,W*0.06,H*0.88,4);
  drawTyres(ctx,W*0.94,H*0.92,3);
}
const KITCHEN_SKINS={
  default:{wall:['#155e68','#1d7a80'],accent:['rgba(255,138,0,.5)','rgba(255,212,0,.45)','rgba(246,92,208,.4)','rgba(92,242,138,.4)'],
    sky:['#59c7f2','#bfe9ff'],sun:'#ffd400',counter:['#6b3d1e','#4a2c18'],counterEdge:'#c88a4a'},
  night:{wall:['#0d1a2e','#152a45'],accent:['rgba(90,140,255,.35)','rgba(160,90,255,.35)','rgba(0,210,190,.3)','rgba(255,90,160,.3)'],
    sky:['#0a1030','#1c2a55'],sun:'#eef1f6',counter:['#241a2e','#150f1c'],counterEdge:'#4a3b5c'},
  beach:{wall:['#e8c07d','#f0d9a8'],accent:['rgba(0,180,180,.4)','rgba(255,140,60,.4)','rgba(255,90,120,.35)','rgba(60,200,160,.4)'],
    sky:['#7fd8ff','#e8fbff'],sun:'#ffb020',counter:['#c9955a','#a8703c'],counterEdge:'#e8c07d'},
};
function bgKitchen(ctx){ // diner kitchen (or night/beach skin): tiles, window, jar shelf, counter
  const sk=KITCHEN_SKINS[Store.data.cosmetics.kitchen]||KITCHEN_SKINS.default;
  const g=ctx.createLinearGradient(0,0,0,H*0.74);
  g.addColorStop(0,sk.wall[0]);g.addColorStop(1,sk.wall[1]);
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H*0.74);
  ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1; // tile grout
  const ts=Math.max(34,W*0.05);
  for(let y=ts;y<H*0.74;y+=ts){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  for(let x=ts;x<W;x+=ts){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H*0.74);ctx.stroke();}
  for(let x=0;x<W;x+=ts){ // colourful accent tile row
    ctx.fillStyle=sk.accent[(x/ts|0)%4];
    ctx.fillRect(x+2,H*0.33,ts-4,ts*0.4);
  }
  const wx=W*0.025,wy=H*0.09,ww=W*0.13,whh=H*0.2; // window with skin-specific sky
  ctx.fillStyle='#3d2b1f';ctx.fillRect(wx-5,wy-5,ww+10,whh+10);
  const skg=ctx.createLinearGradient(0,wy,0,wy+whh);
  skg.addColorStop(0,sk.sky[0]);skg.addColorStop(1,sk.sky[1]);
  ctx.fillStyle=skg;ctx.fillRect(wx,wy,ww,whh);
  ctx.fillStyle=sk.sun;ctx.beginPath();ctx.arc(wx+ww*0.7,wy+whh*0.3,Math.min(14,ww*0.2),0,6.283);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.85)';
  ctx.beginPath();ctx.ellipse(wx+ww*0.32,wy+whh*0.62,ww*0.2,whh*0.09,0,0,6.283);ctx.fill();
  ctx.strokeStyle='#3d2b1f';ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(wx+ww/2,wy);ctx.lineTo(wx+ww/2,wy+whh);
  ctx.moveTo(wx,wy+whh/2);ctx.lineTo(wx+ww,wy+whh/2);ctx.stroke();
  const shx=W*0.845,shy=H*0.2,shw=W*0.13; // jar shelf
  ctx.fillStyle='#3d2b1f';ctx.fillRect(shx,shy,shw,7);
  const jc=['#e10600','#ff8a00','#ffd400','#5cf28a','#9f8cff'];
  for(let i=0;i<5;i++){
    const jw=shw/6,jx=shx+4+i*(shw-8)/5;
    ctx.fillStyle=jc[i];ctx.beginPath();ctx.roundRect(jx,shy-jw*1.5,jw*0.8,jw*1.5,3);ctx.fill();
    ctx.fillStyle='#3d2b1f';ctx.fillRect(jx,shy-jw*1.5-3,jw*0.8,4);
  }
  ctx.fillStyle='#2b3648'; // extractor hood
  ctx.beginPath();ctx.moveTo(W*0.32,0);ctx.lineTo(W*0.68,0);ctx.lineTo(W*0.6,H*0.05);
  ctx.lineTo(W*0.4,H*0.05);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,233,168,.8)';ctx.fillRect(W*0.42,H*0.05,W*0.16,4);
  const cg=ctx.createLinearGradient(0,H*0.74,0,H); // counter
  cg.addColorStop(0,sk.counter[0]);cg.addColorStop(1,sk.counter[1]);
  ctx.fillStyle=cg;ctx.fillRect(0,H*0.74,W,H*0.26);
  ctx.fillStyle=sk.counterEdge;ctx.fillRect(0,H*0.74,W,4);
  ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=2;
  for(let i=1;i<5;i++){const y=H*0.74+H*0.26*i/5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  for(let l=0;l<4;l++){ // burners with flickering flames
    const x=W*(0.2+l*0.2);
    ctx.beginPath();ctx.arc(x,H*0.7,34,0,6.283);
    ctx.fillStyle='#171c28';ctx.fill();
    ctx.lineWidth=3;ctx.strokeStyle='#39435a';ctx.stroke();
    for(let fi=0;fi<8;fi++){
      const a=fi/8*6.283+idleT*2,fr3=27+Math.sin(idleT*9+fi*2.4)*2.5;
      ctx.fillStyle=fi%2?'rgba(90,180,255,.8)':'rgba(255,170,60,.8)';
      ctx.beginPath();ctx.arc(x+Math.cos(a)*fr3,H*0.7+Math.sin(a)*fr3,2.4,0,6.283);ctx.fill();
    }
  }
  ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=5;ctx.lineCap='round';
  for(let l=0;l<4;l++){ // steam wisps
    const x=W*(0.2+l*0.2);
    ctx.beginPath();
    for(let sgm=0;sgm<5;sgm++){
      const yy=H*0.62-sgm*H*0.03,xx=x+Math.sin(idleT*1.5+sgm+l*2)*8;
      if(sgm)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);
    }
    ctx.stroke();
  }
  ctx.lineCap='butt';
}
function bgTyping(ctx){ // synthwave: purple sky, striped retro sun, scrolling neon grid
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#1b0b3a');g.addColorStop(0.55,'#471a6e');g.addColorStop(1,'#0d0620');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const sx=W*0.82,sy=H*0.18,srad=Math.min(W,H)*0.13; // striped sun
  const sg=ctx.createLinearGradient(0,sy-srad,0,sy+srad);
  sg.addColorStop(0,'#ffd400');sg.addColorStop(1,'#ff3d81');
  ctx.save();ctx.beginPath();ctx.arc(sx,sy,srad,0,6.283);ctx.clip();
  ctx.fillStyle=sg;ctx.fillRect(sx-srad,sy-srad,srad*2,srad*2);
  ctx.fillStyle='#1b0b3a';
  for(let i=0;i<5;i++)ctx.fillRect(sx-srad,sy+2+i*9,srad*2,2+i*1.4);
  ctx.restore();
  const hz=H*0.75; // neon grid floor
  ctx.strokeStyle='rgba(246,92,208,.5)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,hz);ctx.lineTo(W,hz);ctx.stroke();
  ctx.lineWidth=1;
  for(let i=0;i<9;i++){ // rows scrolling toward the viewer
    const k=(i+(idleT*1.4)%1)/9,y=hz+(H-hz)*k*k;
    ctx.strokeStyle='rgba(0,210,190,'+(0.1+k*0.35).toFixed(2)+')';
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
  }
  for(let j=-6;j<=6;j++){ // converging columns
    ctx.strokeStyle='rgba(0,210,190,.18)';
    ctx.beginPath();ctx.moveTo(W/2+j*W*0.045,hz);ctx.lineTo(W/2+j*W*0.13,H);ctx.stroke();
  }
  ctx.fillStyle='#eef1f6';
  for(let i=0;i<24;i++){ // sparkle stars
    ctx.globalAlpha=0.3+0.4*(0.5+0.5*Math.sin(idleT*2.5+i*2.1));
    ctx.fillRect(sr(i+200)*W,sr(i+300)*hz*0.5,2,2);
  }
  ctx.globalAlpha=1;
}
function bgDojo(ctx){ // anime dojo: glowing shoji wall, red pillars, lanterns, sakura petals
  const g=ctx.createLinearGradient(0,0,0,H*0.76);
  g.addColorStop(0,'#3b1747');g.addColorStop(1,'#7a2f3f');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H*0.76);
  ctx.fillStyle='#241018';ctx.fillRect(0,0,W,H*0.1); // top beam
  ctx.fillStyle='#ffd400';ctx.fillRect(0,H*0.1-3,W,3);
  const pw=W/5; // shoji panels + red pillars
  for(let i=0;i<5;i++){
    const x=i*pw;
    ctx.fillStyle='rgba(255,214,150,.16)';ctx.fillRect(x+10,H*0.12,pw-20,H*0.5);
    ctx.strokeStyle='rgba(24,10,18,.75)';ctx.lineWidth=2;
    for(let j=1;j<4;j++){const xx=x+10+(pw-20)*j/4;
      ctx.beginPath();ctx.moveTo(xx,H*0.12);ctx.lineTo(xx,H*0.62);ctx.stroke();}
    for(let j=1;j<5;j++){const yy=H*0.12+H*0.5*j/5;
      ctx.beginPath();ctx.moveTo(x+10,yy);ctx.lineTo(x+pw-10,yy);ctx.stroke();}
    ctx.fillStyle='#8a2430';ctx.fillRect(x-6,H*0.1,12,H*0.66);
    ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(x-6,H*0.1,3,H*0.66);
  }
  ctx.fillStyle='#8a2430';ctx.fillRect(W-6,H*0.1,12,H*0.66);
  const eg=ctx.createRadialGradient(W*0.62,H*0.42,0,W*0.62,H*0.42,H*0.24); // rising sun glow
  eg.addColorStop(0,'rgba(255,60,40,.22)');eg.addColorStop(1,'rgba(255,60,40,0)');
  ctx.fillStyle=eg;ctx.fillRect(W*0.62-H*0.24,H*0.42-H*0.24,H*0.48,H*0.48);
  for(let i=0;i<3;i++){ // hanging lanterns, gently swinging
    const lx=W*(0.18+i*0.32),sw=Math.sin(idleT*1.3+i*2)*6;
    ctx.strokeStyle='rgba(24,10,18,.8)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(lx,H*0.1);ctx.lineTo(lx+sw,H*0.16);ctx.stroke();
    ctx.fillStyle='#e13c28';
    ctx.beginPath();ctx.ellipse(lx+sw,H*0.185,13,17,0,0,6.283);ctx.fill();
    ctx.fillStyle='rgba(255,214,120,.85)';
    ctx.beginPath();ctx.ellipse(lx+sw,H*0.185,6,11,0,0,6.283);ctx.fill();
    ctx.fillStyle='#ffd400';ctx.fillRect(lx+sw-1.5,H*0.185+17,3,7);
  }
  const mw=W/6; // green tatami mats
  for(let i=0;i<6;i++){
    ctx.fillStyle=i%2?'#2e5f38':'#27522f';
    ctx.fillRect(i*mw,H*0.76,mw+1,H*0.24);
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(i*mw,H*0.76,3,H*0.24);
  }
  ctx.fillStyle='#ffd400';ctx.fillRect(0,H*0.76,W,3);
  for(let i=0;i<22;i++){ // sakura petals drifting
    const sp=30+sr(i+3)*45;
    const px3=(((sr(i)*W-idleT*sp)%(W+30))+(W+30))%(W+30)-15;
    const py3=(((sr(i+7)*H+idleT*(18+sr(i+5)*22))%(H+20))+(H+20))%(H+20)-10;
    ctx.save();ctx.translate(px3,py3);ctx.rotate(idleT*2+i);
    ctx.fillStyle='rgba(255,150,190,.75)';
    ctx.beginPath();ctx.ellipse(0,0,5,3,0,0,6.283);ctx.fill();
    ctx.restore();
  }
}
function bgWorkshop(ctx){ // neon maker-lab: glow grid, spool shelf, floating holo bits
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#131a3d');g.addColorStop(1,'#1f1147');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(90,140,255,.10)';ctx.lineWidth=1;
  for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  const pu=0.5+0.5*Math.sin(idleT*2); // pulsing neon edge strips
  ctx.fillStyle='rgba(0,210,190,'+(0.25+0.3*pu).toFixed(2)+')';ctx.fillRect(W*0.02,H*0.05,4,H*0.9);
  ctx.fillStyle='rgba(246,92,208,'+(0.25+0.3*(1-pu)).toFixed(2)+')';ctx.fillRect(W*0.975,H*0.05,4,H*0.9);
  ctx.fillStyle='#2b3352';ctx.fillRect(W*0.035,H*0.22,W*0.13,6); // spool shelf
  const sc2=['#e10600','#ffd400','#5cf28a','#7fd4ff'];
  for(let i=0;i<4;i++){
    const x=W*0.05+i*W*0.032,y=H*0.22-14;
    ctx.fillStyle='#171c28';ctx.beginPath();ctx.arc(x,y,13,0,6.283);ctx.fill();
    ctx.strokeStyle=sc2[i];ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,8,0,6.283);ctx.stroke();
  }
  for(let i=0;i<6;i++){ // floating holo triangles
    const hx2=sr(i+40)*W,hy2=(((sr(i+50)*H-idleT*(8+sr(i+60)*10))%H)+H)%H;
    ctx.strokeStyle='rgba(0,210,190,'+(0.12+0.08*Math.sin(idleT+i)).toFixed(2)+')';
    ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(hx2,hy2-7);ctx.lineTo(hx2+7,hy2+5);ctx.lineTo(hx2-7,hy2+5);
    ctx.closePath();ctx.stroke();
  }
}
function bgNight(ctx){ // deep space: nebulas, stars, ringed planet, shooting star, radio mast
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#060216');g.addColorStop(0.6,'#150a33');g.addColorStop(1,'#1e0f3d');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const neb=(x,y,r,c)=>{const ng=ctx.createRadialGradient(x,y,0,x,y,r);
    ng.addColorStop(0,c);ng.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=ng;ctx.fillRect(x-r,y-r,r*2,r*2);};
  neb(W*0.25,H*0.2,H*0.35,'rgba(160,60,220,.16)');
  neb(W*0.7,H*0.65,H*0.4,'rgba(0,140,200,.13)');
  neb(W*0.55,H*0.15,H*0.25,'rgba(255,80,140,.10)');
  for(let i=0;i<70;i++){ // twinkling coloured stars
    ctx.globalAlpha=0.25+0.55*(0.5+0.5*Math.sin(idleT*2+i*1.7));
    ctx.fillStyle=['#eef1f6','#9fd8ff','#ffd4f0'][i%3];
    const b=i%9===0?3:2;
    ctx.fillRect(sr(i)*W,sr(i+99)*H,b,b);
  }
  ctx.globalAlpha=1;
  const cyc=idleT/4,ph2=cyc-Math.floor(cyc); // shooting star every few seconds
  if(ph2<0.22){
    const sx0=sr(Math.floor(cyc))*W*0.8,sy0=sr(Math.floor(cyc)+31)*H*0.3;
    const sx1=sx0+ph2*W*0.5,sy1=sy0+ph2*H*0.22;
    ctx.strokeStyle='rgba(255,255,255,'+(0.8*(1-ph2/0.22)).toFixed(2)+')';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(sx1-60,sy1-26);ctx.lineTo(sx1,sy1);ctx.stroke();
  }
  const px2=W*0.34,py2=H*0.075,pr=Math.min(30,W*0.05); // ringed planet
  const pg=ctx.createLinearGradient(px2-pr,py2-pr,px2+pr,py2+pr);
  pg.addColorStop(0,'#ff9a5c');pg.addColorStop(1,'#c2437a');
  ctx.fillStyle=pg;ctx.beginPath();ctx.arc(px2,py2,pr,0,6.283);ctx.fill();
  ctx.strokeStyle='rgba(255,214,150,.25)';ctx.lineWidth=8;
  ctx.beginPath();ctx.ellipse(px2,py2,pr*1.7,pr*0.5,-0.35,0,6.283);ctx.stroke();
  ctx.strokeStyle='rgba(255,214,150,.7)';ctx.lineWidth=3;
  ctx.beginPath();ctx.ellipse(px2,py2,pr*1.7,pr*0.5,-0.35,0,6.283);ctx.stroke();
  const tx=W*0.9,top=H*0.4; // lattice radio mast
  ctx.strokeStyle='rgba(139,148,167,.45)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(tx-24,H);ctx.lineTo(tx,top);ctx.lineTo(tx+24,H);
  for(let i=1;i<6;i++){const yy=top+(H-top)*i/6,w2=24*i/6;
    ctx.moveTo(tx-w2,yy);ctx.lineTo(tx+w2,yy);}
  ctx.stroke();
  const bl=0.5+0.5*Math.sin(idleT*5); // blinking beacon + radio waves
  ctx.fillStyle='rgba(255,45,45,'+(0.3+0.7*bl).toFixed(2)+')';
  ctx.beginPath();ctx.arc(tx,top-4,4+bl*3,0,6.283);ctx.fill();
  for(let i=0;i<3;i++){
    const rr=((idleT*26+i*24)%72)+12;
    ctx.strokeStyle='rgba(0,210,190,'+Math.max(0,0.4*(1-rr/84)).toFixed(2)+')';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(tx,top-4,rr,3.4,5.0);ctx.stroke();
  }
}
function bgStage(ctx){ // concert stage: sweeping spotlights + red curtain
  ctx.fillStyle='#0b0d12';ctx.fillRect(0,0,W,H);
  const beam=(x0,ang,col)=>{
    ctx.fillStyle=col;
    ctx.beginPath();ctx.moveTo(x0,0);
    ctx.lineTo(x0+ang*H*0.6-W*0.09,H);ctx.lineTo(x0+ang*H*0.6+W*0.09,H);
    ctx.closePath();ctx.fill();
  };
  beam(W*0.22,Math.sin(idleT*0.6)*0.4,'rgba(0,210,190,.10)');
  beam(W*0.78,Math.sin(idleT*0.6+2.6)*0.4,'rgba(255,212,0,.10)');
  beam(W*0.5,Math.sin(idleT*0.45+1.2)*0.5,'rgba(246,92,208,.08)');
  const ch=H*0.06; // curtain pleats + scalloped hem
  for(let x=0;x<W;x+=36){
    ctx.fillStyle='rgb('+(60+30+((x/36)%2)*14)+',12,22)';
    ctx.fillRect(x,0,36,ch);
  }
  ctx.fillStyle='rgb(74,12,22)';
  for(let x=18;x<W+36;x+=36){ctx.beginPath();ctx.arc(x,ch,15,0,Math.PI);ctx.fill();}
}

