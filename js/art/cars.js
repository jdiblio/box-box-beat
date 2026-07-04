/* F1 CARS — the detailed chase-cam and top-down car illustrations shared by
 * Race Weekend and Pit Crew Endless, plus the little pit-crew mechanic and
 * jack-person figures. bodyFillFor() resolves a livery to a flat color, a
 * chrome gradient, or an animated rainbow hue depending what's equipped.
 * Depends on: utils.js, store.js (equipped livery/helmet). */
'use strict';
/* ================= DETAILED F1 CARS ================= */
function bodyFillFor(ctx,col,special,x0,y0,x1,y1){ // resolves flat/chrome/rainbow livery paint
  if(special==='chrome'){const cg=ctx.createLinearGradient(x0,y0,x1,y1);
    cg.addColorStop(0,'#8f99ab');cg.addColorStop(0.5,'#f2f5f9');cg.addColorStop(1,'#5c6478');return cg;}
  if(special==='rainbow')return 'hsl('+Math.round(idleT*70%360)+',75%,55%)';
  return col;
}
function drawF1Rear(ctx,x,y,s,col,helmet,special){ // chase-cam F1 seen from behind
  helmet=helmet||'#ffd400';
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  ctx.fillStyle='#101319'; // front tyres (far away)
  ctx.fillRect(-40,-48,11,20);ctx.fillRect(29,-48,11,20);
  ctx.fillStyle='rgba(238,241,246,.8)'; // front wing tips
  ctx.fillRect(-48,-52,20,5);ctx.fillRect(28,-52,20,5);
  ctx.fillStyle=bodyFillFor(ctx,col,special,-27,-62,27,26); // body: nose far, tail near
  ctx.beginPath();ctx.moveTo(0,-62);
  ctx.quadraticCurveTo(15,-36,18,-12);ctx.lineTo(27,2);ctx.lineTo(27,26);
  ctx.lineTo(-27,26);ctx.lineTo(-27,2);ctx.lineTo(-18,-12);
  ctx.quadraticCurveTo(-15,-36,0,-62);ctx.fill();
  if(special==='flames'){ // flame decals licking up the sidepods
    ctx.fillStyle='rgba(255,140,0,.9)';
    ctx.beginPath();ctx.moveTo(-26,6);ctx.lineTo(-12,-8);ctx.lineTo(-19,10);ctx.lineTo(-26,22);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,220,0,.9)';
    ctx.beginPath();ctx.moveTo(26,6);ctx.lineTo(12,-8);ctx.lineTo(19,10);ctx.lineTo(26,22);ctx.closePath();ctx.fill();
  }
  ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(-3,-58,6,80); // livery stripe
  ctx.fillStyle=helmet;ctx.beginPath();ctx.arc(0,-22,7,0,6.283);ctx.fill(); // helmet
  ctx.strokeStyle='#11141b';ctx.lineWidth=3.5; // halo
  ctx.beginPath();ctx.arc(0,-21,10,3.3,6.12);ctx.stroke();
  ctx.fillStyle='#14161c'; // rear tyres (big, close)
  ctx.beginPath();ctx.roundRect(-60,-2,26,42,9);ctx.fill();
  ctx.beginPath();ctx.roundRect(34,-2,26,42,9);ctx.fill();
  ctx.fillStyle='#262c38';ctx.fillRect(-56,6,18,28);ctx.fillRect(38,6,18,28);
  ctx.fillStyle='#ffd400';ctx.fillRect(-56,2,18,3);ctx.fillRect(38,2,18,3); // tyre band
  ctx.fillStyle='#11141b'; // rear wing
  ctx.fillRect(-48,0,96,10);
  ctx.fillStyle='#1d2330';ctx.fillRect(-48,-8,96,6);
  ctx.fillStyle='#11141b';ctx.fillRect(-51,-10,6,24);ctx.fillRect(45,-10,6,24); // endplates
  ctx.fillStyle='rgba(255,45,45,'+(0.4+0.6*(0.5+0.5*Math.sin(idleT*10))).toFixed(2)+')';
  ctx.fillRect(-3,2,6,6); // blinking rain light
  ctx.fillStyle='#0b0d12';ctx.fillRect(-36,36,72,6); // diffuser
  ctx.restore();
}
function drawF1Top(ctx,cx,cy,dx,dy,col,helmet,special){ // top-down F1; interactive wheels drawn by the mode
  helmet=helmet||'#ffd400';
  ctx.save();ctx.translate(cx,cy);
  const nw=dx*0.52,noseY=-dy-52,tailY=dy+36;
  const paint=bodyFillFor(ctx,col,special,-nw,noseY,nw,tailY);
  ctx.fillStyle='#0d0f15'; // floor
  ctx.beginPath();ctx.roundRect(-dx*0.7,-dy+8,dx*1.4,dy*2-4,10);ctx.fill();
  ctx.fillStyle='#1a1f2b'; // front wing
  ctx.beginPath();ctx.roundRect(-dx*0.82,noseY,dx*1.64,11,5);ctx.fill();
  ctx.fillStyle=paint;ctx.fillRect(-dx*0.82,noseY+11,dx*1.64,3);
  ctx.fillStyle=paint; // nose cone
  ctx.beginPath();ctx.moveTo(-7,noseY+8);ctx.lineTo(7,noseY+8);
  ctx.lineTo(nw*0.6,-dy+16);ctx.lineTo(-nw*0.6,-dy+16);ctx.closePath();ctx.fill();
  ctx.beginPath(); // monocoque + sidepods
  ctx.moveTo(-nw*0.6,-dy+16);ctx.lineTo(nw*0.6,-dy+16);
  ctx.lineTo(nw,-dy*0.1);ctx.lineTo(nw*0.85,dy*0.6);ctx.lineTo(nw*0.5,tailY-14);
  ctx.lineTo(-nw*0.5,tailY-14);ctx.lineTo(-nw*0.85,dy*0.6);ctx.lineTo(-nw,-dy*0.1);
  ctx.closePath();ctx.fill();
  if(special==='flames'){
    ctx.fillStyle='rgba(255,140,0,.9)';
    ctx.beginPath();ctx.moveTo(-nw*0.9,0);ctx.lineTo(-nw*0.5,-dy*0.3);ctx.lineTo(-nw*0.6,dy*0.2);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,220,0,.9)';
    ctx.beginPath();ctx.moveTo(nw*0.9,0);ctx.lineTo(nw*0.5,-dy*0.3);ctx.lineTo(nw*0.6,dy*0.2);ctx.closePath();ctx.fill();
  }
  ctx.fillStyle='rgba(0,0,0,.22)'; // sidepod intakes
  ctx.fillRect(-nw*0.95,-dy*0.05,nw*0.35,dy*0.5);ctx.fillRect(nw*0.6,-dy*0.05,nw*0.35,dy*0.5);
  ctx.fillStyle='rgba(255,255,255,.25)'; // livery stripe
  ctx.fillRect(-3,noseY+8,6,tailY-noseY-24);
  ctx.fillStyle='#11141b'; // cockpit
  ctx.beginPath();ctx.ellipse(0,-dy*0.22,nw*0.34,dy*0.4,0,0,6.283);ctx.fill();
  ctx.strokeStyle='#4a5670';ctx.lineWidth=3; // halo
  ctx.beginPath();ctx.ellipse(0,-dy*0.2,nw*0.3,dy*0.3,0,0,6.283);ctx.stroke();
  ctx.fillStyle=helmet;ctx.beginPath();ctx.arc(0,-dy*0.14,7,0,6.283);ctx.fill(); // helmet
  ctx.fillStyle='#11141b'; // rear wing
  ctx.beginPath();ctx.roundRect(-dx*0.68,tailY-11,dx*1.36,13,4);ctx.fill();
  ctx.fillStyle='rgba(238,241,246,.22)';ctx.fillRect(-dx*0.68,tailY-5,dx*1.36,2);
  ctx.fillStyle=col;ctx.fillRect(-dx*0.68,tailY-11,4,13);ctx.fillRect(dx*0.68-4,tailY-11,4,13);
  ctx.restore();
}

