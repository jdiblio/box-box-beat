/* STATS & TROPHIES — the aggregate stats screen (total runs, favourite mode,
 * best combo ever) and the achievement checklist. Every achievement's check()
 * function just reads fields already being saved elsewhere in Store.data — this
 * file doesn't track anything new itself. Depends on: core/*.js, meta/modes.js. */
'use strict';
/* ================= STATS + ACHIEVEMENTS ================= */
const ACHIEVEMENTS=[
  {icon:'🏆',name:'First Podium',desc:'Finish Race Weekend with 85%+ accuracy',
    check:()=>(Store.data.progress.race||0)>=85},
  {icon:'🔧',name:'Pit Master',desc:'Service 15 cars in one Pit Crew shift',
    check:()=>(Store.data.progress.pitcrew||0)>=15},
  {icon:'⌨️',name:'Wordsmith',desc:'Clear 20 combos in one Typing Rhythm run',
    check:()=>(Store.data.progress.typing||0)>=20},
  {icon:'🍽️',name:'Michelin Star',desc:'Serve 10+ orders in one Kitchen Rush shift',
    check:()=>(Store.data.progress.kitchen||0)>=10},
  {icon:'🥋',name:'Black Belt',desc:'Win Taekwondo Combos outright',
    check:()=>(Store.data.progress.tkd||0)>=6},
  {icon:'🖨️',name:'Master Printer',desc:'Hit 92%+ clean slices (Masterpiece)',
    check:()=>(Store.data.progress.printer||0)>=92},
  {icon:'⛵',name:'Shipwright',desc:'Print the Benchy Boat object',
    check:()=>Store.data.printedShapes.includes('BENCHY BOAT')},
  {icon:'📡',name:'SOS Master',desc:'Spell all 5 words clean in Morse Melody',
    check:()=>(Store.data.progress.morse||0)>=5},
  {icon:'✨',name:'Full Combo',desc:'Finish any game without a single miss',
    check:()=>Store.data.everFullCombo},
  {icon:'🔥',name:'Century Combo',desc:'Reach a 100 combo in any game',
    check:()=>Store.data.bestComboEver>=100},
  {icon:'🏁',name:'Completionist',desc:'Beat every game in the unlock chain',
    check:()=>Object.keys(MODE_GOALS).every(id=>Store.data.beaten[id])},
  {icon:'🛒',name:'Big Spender',desc:'Own 5 or more shop items',
    check:()=>Object.values(Store.data.owned).reduce((n,l)=>n+l.length,0)>=5},
  {icon:'👑',name:'Champion',desc:'Complete a full Championship run',
    check:()=>Store.data.champCompleted},
];
function buildStats(){
  const totalPlays=Object.values(Store.data.plays).reduce((a,b)=>a+b,0);
  let favId=null,favN=0;
  for(const id in Store.data.plays)if(Store.data.plays[id]>favN){favN=Store.data.plays[id];favId=id;}
  const favName=favId?(MODES.find(m=>m.id===favId)||{}).name||favId:'—';
  const rows=[
    ['Total runs played',totalPlays],
    ['Favourite mode',favName],
    ['Best combo ever',Store.data.bestComboEver],
    ['Games beaten',Object.keys(Store.data.beaten).filter(k=>Store.data.beaten[k]).length+' / '+Object.keys(MODE_GOALS).length],
    ['Full combo achieved',Store.data.everFullCombo?'YES':'not yet'],
    ['Shop items owned',Object.values(Store.data.owned).reduce((n,l)=>n+l.length,0)],
  ];
  $('#stats-table').innerHTML=rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join('');
  const grid=$('#achieve-grid');grid.innerHTML='';
  for(const a of ACHIEVEMENTS){
    const got=a.check();
    const card=document.createElement('div');
    card.className='card trophy'+(got?'':' locked');
    card.innerHTML='<div class="icon">'+a.icon+'</div><h3>'+a.name+'</h3><p>'+a.desc+'</p>'+
      '<div class="meta">'+(got?'<span class="play">✓ UNLOCKED</span>':'<span class="lock">🔒 LOCKED</span>')+'</div>';
    grid.appendChild(card);
  }
  UI.number($('#s-stats'));
}

