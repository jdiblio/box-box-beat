/* GARAGE SHOP — the cosmetics catalog (race teams, helmets, hit trails,
 * kitchen skins) plus the buy/equip logic and the screen that renders it as a
 * grid of cards. Purely cosmetic — nothing here affects difficulty or scoring.
 * The "livery" category is presented as "Race Team" in the shop: picking one
 * sets the colour scheme Race Weekend's car is drawn in (see liveryColor()/
 * liverySpecial() and their use in games/race-weekend.js), and each entry
 * gets a hand-drawn circular team logo (drawTeamLogo) instead of a flat
 * colour swatch, since that's the picture you click to select it.
 * Depends on: core/*.js, meta/modes.js (reuses the garage card styling). */
'use strict';
/* ================= COSMETICS SHOP — race teams, helmets, trails, kitchen skins ================= */
const SHOP_ITEMS={
  livery:[ // each is a "race team" — mono is the 2-letter monogram drawn on its logo badge
    {id:'red',name:'Rosso Red',cost:0,color:'#e10600',mono:'RR'},
    {id:'teal',name:'Teal Turbo',cost:300,color:'#00d2be',mono:'TT'},
    {id:'gold',name:'Championship Gold',cost:800,color:'#ffd400',mono:'CG'},
    {id:'purple',name:'Royal Purple',cost:800,color:'#9f5cf2',mono:'RP'},
    {id:'flames',name:'Flame Job',cost:1500,color:'#ff6a00',special:'flames',mono:'FJ'},
    {id:'chrome',name:'Chrome Shine',cost:2000,color:'#cfd8e3',special:'chrome',mono:'CS'},
    {id:'rainbow',name:'Rainbow Racer',cost:3000,color:'#e10600',special:'rainbow',mono:'RB'},
  ],
  helmet:[
    {id:'default',name:'Classic White',cost:0,color:'#eef1f6'},
    {id:'gold',name:'Gold Visor',cost:300,color:'#ffd400'},
    {id:'teal',name:'Teal Streak',cost:300,color:'#00d2be'},
    {id:'red',name:'Racing Red',cost:500,color:'#e10600'},
    {id:'purple',name:'Purple Haze',cost:800,color:'#9f5cf2'},
  ],
  trail:[
    {id:'none',name:'No Trail',cost:0},
    {id:'sparks',name:'Sparks',cost:400},
    {id:'stars',name:'Stars',cost:700},
    {id:'rainbow',name:'Rainbow Trail',cost:1200},
  ],
  kitchen:[
    {id:'default',name:'Classic Diner',cost:0},
    {id:'night',name:'Night Diner',cost:600},
    {id:'beach',name:'Beach Shack',cost:900},
  ],
};
function shopItem(cat,id){return SHOP_ITEMS[cat].find(x=>x.id===id)||SHOP_ITEMS[cat][0];}
// draws a circular team-logo badge (ring + monogram) onto a small canvas — the
// "picture" a player clicks in the Race Team shop tab, instead of a flat swatch
function drawTeamLogo(canvas,item){
  const ctx=canvas.getContext('2d'),s=canvas.width,r=s/2;
  ctx.clearRect(0,0,s,s);
  ctx.save();ctx.translate(r,r);
  let fill=item.color;
  if(item.special==='rainbow'){
    fill=ctx.createLinearGradient(-r,-r,r,r);
    fill.addColorStop(0,'#e10600');fill.addColorStop(0.25,'#ffd400');fill.addColorStop(0.5,'#00d2be');
    fill.addColorStop(0.75,'#2f7df6');fill.addColorStop(1,'#9f5cf2');
  }else if(item.special==='chrome'){
    fill=ctx.createLinearGradient(-r,-r,r,r);
    fill.addColorStop(0,'#eef1f6');fill.addColorStop(0.5,'#8b94a7');fill.addColorStop(1,'#cfd8e3');
  }else if(item.special==='flames'){
    fill=ctx.createRadialGradient(0,r*0.15,r*0.08,0,r*0.15,r);
    fill.addColorStop(0,'#ffd400');fill.addColorStop(0.55,item.color);fill.addColorStop(1,'#7a1200');
  }
  ctx.beginPath();ctx.arc(0,0,r-3,0,6.283);
  ctx.fillStyle=fill;ctx.fill();
  ctx.lineWidth=3;ctx.strokeStyle='#0b0d12';ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,r-10,0,6.283);
  ctx.fillStyle='rgba(11,13,18,.55)';ctx.fill();
  ctx.fillStyle='#eef1f6';ctx.font='900 '+Math.round(r*0.62)+'px "Segoe UI",sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(item.mono||'??',0,1);
  ctx.strokeStyle='rgba(238,241,246,.5)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-r*0.5,r*0.42);ctx.lineTo(r*0.5,r*0.42);ctx.stroke();
  ctx.restore();ctx.textBaseline='alphabetic';
}
function liveryColor(){return shopItem('livery',Store.data.cosmetics.livery).color;}
function liverySpecial(){return shopItem('livery',Store.data.cosmetics.livery).special;}
function helmetColor(){return shopItem('helmet',Store.data.cosmetics.helmet).color;}
function isOwned(cat,id){return Store.data.owned[cat].includes(id);}
function buyItem(cat,id){
  const it=shopItem(cat,id);
  if(isOwned(cat,id)||Store.data.points<it.cost)return false;
  Store.data.points-=it.cost;Store.data.owned[cat].push(id);
  Store.data.cosmetics[cat]=id;Store.save();return true;
}
function equipItem(cat,id){if(isOwned(cat,id)){Store.data.cosmetics[cat]=id;Store.save();}}
function trailBurst(x,y){ // perfect-hit trail effect from the equipped cosmetic
  const t=Store.data.cosmetics.trail;
  if(t==='sparks')FX.burst(x,y,'#ffd400',10);
  else if(t==='stars')FX.burst(x,y,'#eef1f6',8);
  else if(t==='rainbow')for(let i=0;i<3;i++)FX.burst(x,y,'hsl('+Math.round((i*120+idleT*80)%360)+',80%,60%)',5);
}

/* ================= SHOP ================= */
const CAT_NAME={livery:'Race Team',helmet:'Helmet',trail:'Hit Trail',kitchen:'Kitchen Skin'};
let shopCat='livery';
function buildShop(){
  $('#shop-points').textContent=Store.data.points+' PTS';
  document.querySelectorAll('.shop-tab').forEach(b=>b.classList.toggle('sel',b.dataset.cat===shopCat));
  const grid=$('#shop-grid');grid.innerHTML='';
  for(const it of SHOP_ITEMS[shopCat]){
    const owned=isOwned(shopCat,it.id),equipped=Store.data.cosmetics[shopCat]===it.id;
    const card=document.createElement('div');
    card.className='card'+(owned?' owned':'')+(equipped?' equipped':'');
    let pic='';
    if(shopCat==='livery')pic='<canvas class="logo-badge" width="72" height="72"></canvas>';
    else if(it.color)pic='<div class="swatch" style="background:'+
      (it.special==='rainbow'?'linear-gradient(90deg,#e10600,#ffd400,#00d2be,#2f7df6,#9f5cf2)':it.color)+'"></div>';
    card.innerHTML=pic+'<h3>'+it.name+'</h3>'+
      '<div class="meta">'+(equipped?'<span class="play">✓ EQUIPPED</span>'
        :owned?'<span class="play">OWNED — TAP TO EQUIP</span>'
        :'<span class="price">'+it.cost+' PTS</span>')+'</div>';
    if(shopCat==='livery'){const cv=card.querySelector('canvas');if(cv)drawTeamLogo(cv,it);}
    card.onclick=()=>{
      if(equipped)return;
      if(owned)equipItem(shopCat,it.id);
      else if(buyItem(shopCat,it.id)){}else{card.classList.add('locked');setTimeout(()=>card.classList.remove('locked'),300);}
      buildShop();
    };
    grid.appendChild(card);
  }
  UI.number($('#s-shop'));
}
function wireShop(){
  document.querySelectorAll('.shop-tab').forEach(b=>b.onclick=()=>{shopCat=b.dataset.cat;buildShop();});
}

