/* MODE REGISTRY — the master list of every arcade mode (MODES), the beat-the-
 * level unlock chain (MODE_GOALS + isUnlocked — each mode unlocks by beating a
 * goal in the one before it), the live mosaic background for the main menu, and
 * the garage screen that lists every mode as a card. This is the one file that
 * needs every game mode class to already exist, so it loads after all of
 * js/games/*.js. Depends on: core/*.js, art/*.js, every js/games/*.js file. */
'use strict';
/* ================= MODE REGISTRY + GARAGE ================= */
const MODES=[
  {id:'race',name:'RACE WEEKEND',icon:'🏎️',cost:0,cls:RaceWeekend,keys:'SPACE · QWAS',
    desc:'The full race song: shift on the redline, nail pit stops, slipstream overtakes.'},
  {id:'pitcrew',name:'PIT CREW ENDLESS',icon:'🔧',cost:400,cls:PitCrewEndless,keys:'Q W A S',
    desc:'Cars arrive forever, faster and faster. How many can you turn around?'},
  {id:'typing',name:'TYPING RHYTHM',icon:'⌨️',cost:900,cls:TypingRhythm,keys:'FDSA / JKL;',
    desc:'Pick a hand — four home keys, four colour lanes, pure rhythm.'},
  {id:'kitchen',name:'KITCHEN RUSH',icon:'🍳',cost:1500,cls:KitchenRush,keys:'ARROWS',
    desc:'Chop, flip and stir on the beat. Missed beats burn the food.'},
  {id:'tkd',name:'TAEKWONDO COMBOS',icon:'🥋',cost:2200,cls:Taekwondo,keys:'J K L',
    desc:'Punch, kick, block. Earn every belt from white to black.'},
  {id:'printer',name:'PRINT HEAD HERO',icon:'🖨️',cost:3000,cls:PrintHeadHero,keys:'SPACE',
    desc:'A surprise object every run — drop each slice on the beat, Stack-style.'},
  {id:'morse',name:'MORSE MELODY',icon:'📡',cost:3900,cls:MorseMelody,keys:'SPACE',
    desc:'Taps and holds that spell real words in actual Morse code.'},
  {id:'drums',name:'FREESTYLE DRUM KIT',icon:'🥁',cost:4800,cls:DrumKit,keys:'WHOLE KEYBOARD',
    desc:'Every keyboard row is a synthesized drum. Lessons, then jam free.'},
];

/* ================= UNLOCK CHAIN — beat a game to unlock the next one ================= */
const MODE_GOALS={
  race:{target:85,label:'Finish PODIUM or better',fmt:v=>(v===undefined?'—':v.toFixed(0)+'%')+' acc (need 85%)'},
  pitcrew:{target:5,label:'Service 5 cars in one shift',fmt:v=>(v||0)+' cars serviced (need 5)'},
  typing:{target:8,label:'Clear 8 combos in one run',fmt:v=>(v||0)+' combos (need 8)'},
  kitchen:{target:7,label:'Serve 7 of 12 orders (Head Chef)',fmt:v=>(v||0)+'/12 served (need 7)'},
  tkd:{target:2,label:'Earn the GREEN belt',fmt:v=>BELTS[Math.min(v||0,5)].n+' (need GREEN)'},
  printer:{target:75,label:'75%+ clean slices (Solid Print)',fmt:v=>(v===undefined?'—':v.toFixed(0)+'%')+' clean (need 75%)'},
  morse:{target:3,label:'3 of 5 words clean',fmt:v=>(v||0)+'/5 clean (need 3)'},
};
function isUnlocked(idx){
  if(idx<=0)return true;
  const m=MODES[idx];
  if(Store.data.points>=m.cost)return true; // grandfather legacy points-based unlocks
  return !!Store.data.beaten[MODES[idx-1].id];
}

/* ================= MAIN MENU BACKGROUND — a live mosaic of every game's scene ================= */
const MODE_BG=[bgTrack,bgPitGarage,bgTyping,bgKitchen,bgDojo,bgWorkshop,bgNight,bgStage]; // MODES order
let menuTiles=null,menuTileFrame=0;
function renderMenuGrid(ctx){
  if(!menuTiles){
    menuTiles=MODES.map(()=>{const c=document.createElement('canvas');c.width=240;c.height=150;return c;});
  }
  ctx.fillStyle='#05060a';ctx.fillRect(0,0,W,H);
  const cols=4,rows=2,gap=Math.max(6,W*0.008);
  const gw=(W-gap*(cols+1))/cols,gh=(H-gap*(rows+1))/rows;
  const redraw=(menuTileFrame%2===0); // halve the offscreen redraw work per frame
  menuTileFrame++;
  const savedW=W,savedH=H;
  for(let i=0;i<MODES.length;i++){
    const c=menuTiles[i];
    if(redraw){
      const tctx=c.getContext('2d');
      W=c.width;H=c.height;
      (MODE_BG[i]||bgTrack)(tctx);
      W=savedW;H=savedH;
    }
    const col=i%cols,row=Math.floor(i/cols);
    const dx=gap+col*(gw+gap),dy=gap+row*(gh+gap);
    ctx.drawImage(c,dx,dy,gw,gh);
    ctx.fillStyle='rgba(5,6,10,.6)';ctx.fillRect(dx,dy+gh-24,gw,24);
    ctx.fillStyle='#eef1f6';ctx.font=f(12,800);ctx.textAlign='left';
    ctx.fillText(MODES[i].icon+' '+MODES[i].name,dx+8,dy+gh-7);
    ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1;
    ctx.strokeRect(dx+0.5,dy+0.5,gw-1,gh-1);
  }
  ctx.fillStyle='rgba(5,6,10,.4)';ctx.fillRect(0,0,W,H); // scrim so menu buttons stay legible
}

function buildGarage(){
  const grid=$('#garage-grid');grid.innerHTML='';
  $('#garage-points').textContent=Store.data.points+' PTS';
  MODES.forEach((m,i)=>{
    const unlocked=isUnlocked(i);
    const beaten=!!Store.data.beaten[m.id];
    const card=document.createElement('div');
    card.className='card'+(unlocked?'':' locked');
    const best=Scores.list(m.id)[0];
    let metaHtml;
    if(unlocked)metaHtml='<span class="play">▶ PLAY</span> · '+m.keys;
    else{
      const prev=MODES[i-1],g=MODE_GOALS[prev.id];
      metaHtml='<span class="lock">🔒 BEAT '+prev.name+'</span><br>'+
        (g?g.label+' — '+g.fmt(Store.data.progress[prev.id]):'');
    }
    card.innerHTML='<div class="icon">'+m.icon+'</div>'+(beaten?'<div class="star">⭐</div>':'')+
      '<h3>'+m.name+'</h3><p>'+m.desc+'</p>'+
      '<div class="meta">'+metaHtml+'</div>'+
      (best?'<div class="best">BEST: '+best.i+' '+best.s.toLocaleString()+'</div>':'');
    if(unlocked)card.onclick=()=>Game.start(m.cls);
    grid.appendChild(card);
  });
  UI.number($('#s-garage'));
}

