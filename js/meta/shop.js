/* GARAGE SHOP — the cosmetics catalog (car liveries, helmets, hit trails,
 * kitchen skins) plus the buy/equip logic and the screen that renders it as a
 * grid of cards. Purely cosmetic — nothing here affects difficulty or scoring.
 * Depends on: core/*.js, meta/modes.js (reuses the garage card styling). */
'use strict';
/* ================= COSMETICS SHOP — liveries, helmets, trails, kitchen skins ================= */
const SHOP_ITEMS={
  livery:[
    {id:'red',name:'Rosso Red',cost:0,color:'#e10600'},
    {id:'teal',name:'Teal Turbo',cost:300,color:'#00d2be'},
    {id:'gold',name:'Championship Gold',cost:800,color:'#ffd400'},
    {id:'purple',name:'Royal Purple',cost:800,color:'#9f5cf2'},
    {id:'flames',name:'Flame Job',cost:1500,color:'#ff6a00',special:'flames'},
    {id:'chrome',name:'Chrome Shine',cost:2000,color:'#cfd8e3',special:'chrome'},
    {id:'rainbow',name:'Rainbow Racer',cost:3000,color:'#e10600',special:'rainbow'},
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
const CAT_NAME={livery:'Car Livery',helmet:'Helmet',trail:'Hit Trail',kitchen:'Kitchen Skin'};
let shopCat='livery';
function buildShop(){
  $('#shop-points').textContent=Store.data.points+' PTS';
  document.querySelectorAll('.shop-tab').forEach(b=>b.classList.toggle('sel',b.dataset.cat===shopCat));
  const grid=$('#shop-grid');grid.innerHTML='';
  for(const it of SHOP_ITEMS[shopCat]){
    const owned=isOwned(shopCat,it.id),equipped=Store.data.cosmetics[shopCat]===it.id;
    const card=document.createElement('div');
    card.className='card'+(owned?' owned':'')+(equipped?' equipped':'');
    let swatch='';
    if(it.color)swatch='<div class="swatch" style="background:'+
      (it.special==='rainbow'?'linear-gradient(90deg,#e10600,#ffd400,#00d2be,#2f7df6,#9f5cf2)':it.color)+'"></div>';
    card.innerHTML=swatch+'<h3>'+it.name+'</h3>'+
      '<div class="meta">'+(equipped?'<span class="play">✓ EQUIPPED</span>'
        :owned?'<span class="play">OWNED — TAP TO EQUIP</span>'
        :'<span class="price">'+it.cost+' PTS</span>')+'</div>';
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

