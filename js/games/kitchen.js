/* KITCHEN RUSH — twelve orders, one cooking move per beat, arrows big enough to
 * read at a glance. The dish for each order swings into view, and hitting a
 * move plays a small Cooking-Mama-style animation (knife chop, spoon stir, pan
 * flip) right at that station. Championship-only: the kitchen runs at a fixed
 * faster pace (CHAMPIONSHIP_SPEED_MUL, see conductor.js) whenever an actual
 * Championship run is in progress (champHard()) — arcade play is always the
 * base tempo, regardless of difficulty. Depends on: core/*.js, art/backgrounds.js. */
'use strict';
/* ============================================================
   KITCHEN RUSH — chop / flip / stir on the beat, don't burn it.
   ============================================================ */
const DISHES=['BURGER','PANCAKES','STIR FRY','RAMEN','TACOS','OMELETTE','CURRY','PASTA','SOUP','SALAD','STEAK','PAELLA'];
const COOK_LANES=['LEFT','UP','DOWN','RIGHT'];
const COOK_LABEL={UP:'FLIP',DOWN:'CHOP',LEFT:'STIR',RIGHT:'STIR'};
const COOK_ARROW={UP:'↑',DOWN:'↓',LEFT:'←',RIGHT:'→'};
const COOK_COL={UP:'#ffd400',DOWN:'#ff8a00',LEFT:'#00d2be',RIGHT:'#00d2be'};
const DISH_ICON={BURGER:'🍔',PANCAKES:'🥞','STIR FRY':'🥘',RAMEN:'🍜',TACOS:'🌮',OMELETTE:'🍳',
  CURRY:'🍛',PASTA:'🍝',SOUP:'🍲',SALAD:'🥗',STEAK:'🥩',PAELLA:'🫕'};
const COOK_ICON={UP:'🍳',DOWN:'🔪',LEFT:'🥄',RIGHT:'🥄'};
class KitchenRush{
  constructor(){
    this.session=new Session();
    this.champ=champHard();
    this.cond=new Conductor(Math.round(100*(this.champ?CHAMPIONSHIP_SPEED_MUL:1)));
    this.track=new NoteTrack(this.cond);
    this.orders=[];this.over=false;this.msg=null;this.flame=0;this.curOrder=-1;
    this.dishSwingT=0;this.stripX=0;this.exitDish=null;
    this.laneHitT={LEFT:9,UP:9,DOWN:9,RIGHT:9};this.laneOk={LEFT:true,UP:true,DOWN:true,RIGHT:true};
    this.laneSlide={LEFT:0,UP:0,DOWN:0,RIGHT:0};this.laneSlideTarget={LEFT:0,UP:0,DOWN:0,RIGHT:0};
    let b=8;
    for(let i=0;i<12;i++){
      const len=Math.max(3,Math.min(8,4+Math.floor(i/2)+(Judge.dense()?1:0)-(Judge.sparse()?1:0)));
      const o={i,dish:DISHES[i],start:b,notes:[],burned:false,resolved:false};
      for(let j=0;j<len;j++)
        o.notes.push(this.track.add({beat:b+j,key:choice(COOK_LANES),kind:'cook',order:o}));
      b+=len+3;o.end=b-3;
      this.orders.push(o);
    }
    this.lastBeat=b;
  }
  get touchKeys(){return[{k:'LEFT',label:'←'},{k:'UP',label:'↑'},{k:'DOWN',label:'↓'},{k:'RIGHT',label:'→'}];}
  start(){this.cond.patternFn=(s,t)=>this.music(s,t);this.cond.start(0.6);}
  laneX(k){return W*(0.2+COOK_LANES.indexOf(k)*0.2);}
  flash(s,c){this.msg={s,t:1.3,c:c||'#ffd400'};}
  update(dt){
    if(this.over)return;
    const now=Game.judgedNow(),beat=this.cond.beat;
    this.dishSwingT+=dt;
    for(const k of COOK_LANES){
      this.laneHitT[k]+=dt;
      this.laneSlide[k]+=(this.laneSlideTarget[k]-this.laneSlide[k])*Math.min(1,dt*7);
    }
    if(this.exitDish){this.exitDish.t+=dt;if(this.exitDish.t>0.55)this.exitDish=null;}
    this.track.sweep(now,Judge.win().ok,n=>{
      Game.missAt(this.laneX(n.key),H*0.7);
      if(!n.order.burned){n.order.burned=true;this.flame=1;this.flash(n.order.dish+' BURNED!','#ff2d2d');}
    });
    // tempo rises per order
    const cur=this.orders.findIndex(o=>beat>=o.start-3&&beat<o.end+1);
    if(cur>=0&&cur!==this.curOrder){
      if(this.curOrder>=0){ // the old dish swings out as the new one slides in
        const prevO=this.orders[this.curOrder];
        this.exitDish={dish:prevO.dish,burned:prevO.burned,t:0};
      }
      this.curOrder=cur;this.cond.setBpm(Math.round((100+cur*3)*(this.champ?CHAMPIONSHIP_SPEED_MUL:1)));
      this.dishSwingT=0;this.stripX=0; // new dish slides in fresh
      for(const k of COOK_LANES){this.laneSlide[k]=0;this.laneSlideTarget[k]=0;} // fresh board/bowl/pan
    }
    // smoothly slide the steps strip toward the current step
    const co=this.orders[Math.max(0,this.curOrder)];
    if(co){
      const idx=co.notes.findIndex(n=>!n.judged);
      const target=idx<0?co.notes.length:idx;
      this.stripX+=(target-this.stripX)*Math.min(1,dt*9);
    }
    // resolve completed orders
    for(const o of this.orders){
      if(!o.resolved&&beat>o.end+0.6){
        o.resolved=true;
        if(!o.burned){this.session.score+=200;this.flash(o.dish+' — ORDER UP! +200','#00d2be');AE.boost();}
      }
    }
    this.flame=Math.max(0,this.flame-dt*0.7);
    if(this.msg){this.msg.t-=dt;if(this.msg.t<=0)this.msg=null;}
    if(beat>this.lastBeat)this.finish();
  }
  onKeyDown(k,t){
    if(this.over||!COOK_LANES.includes(k))return;
    const n=this.track.hit(k,t,Judge.win().ok);
    if(!n){AE.tick();this.session.combo=0;return;}
    const j=Game.hit(n.delta,this.laneX(k),H*0.7,90);
    this.laneHitT[k]=0;this.laneOk[k]=j!=='miss';
    if(j!=='miss')this.laneSlideTarget[k]=(this.laneSlideTarget[k]+11)%44;
    if(j==='miss'&&!n.order.burned){n.order.burned=true;this.flame=1;this.flash(n.order.dish+' BURNED!','#ff2d2d');}
    else if(j!=='miss')AE.rim(AE.now(),1.4);
  }
  finish(){
    if(this.over)return;this.over=true;this.cond.stop();
    const served=this.orders.filter(o=>o.resolved&&!o.burned).length,s=this.session;
    let grade,gc;
    if(served>=10){grade='MICHELIN STAR';gc='#00d2be';}
    else if(served>=7){grade='HEAD CHEF';gc='#ffd400';}
    else if(served>=4){grade='LINE COOK';gc='#8b94a7';}
    else{grade='BURNED OUT';gc='#e10600';}
    Game.endMode({
      modeId:'kitchen',title:'KITCHEN RUSH',grade,gradeColor:gc,
      score:s.score,points:Math.round(s.score/15)+served*10,
      goalValue:served,fullCombo:s.counts.miss===0,bestCombo:s.maxCombo,
      rows:[['Orders served',served+' / 12'],['Max combo',s.maxCombo],
        ['Accuracy',s.accuracy.toFixed(1)+'%'],['Misses',s.counts.miss]],
    });
  }
  render(ctx){
    const now=Game.judgedNow(),beat=this.cond.beat;
    bgKitchen(ctx);
    const o=this.orders[Math.max(0,this.curOrder)];
    this.renderDishHero(ctx,o);
    const p=beatPulse(this.cond);
    for(let l=0;l<4;l++){
      const x=W*(0.2+l*0.2),key=COOK_LANES[l];
      ctx.strokeStyle='#242b3a';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x,H*0.12);ctx.lineTo(x,H*0.58);ctx.stroke();
      this.renderStation(ctx,key,x,H*0.7,p);
      ctx.fillStyle='#8b94a7';ctx.font=f(11,700);ctx.textAlign='center';
      ctx.fillText(COOK_LABEL[key],x,H*0.79);
      ctx.font=f(18);ctx.fillText(COOK_ARROW[key],x,H*0.84);
    }
    // falling prompts — glowing and easy to read, but sized to actually land
    // inside the station's ring below instead of overshooting it
    for(const n of this.track.notes){
      if(n.judged&&!n.missed)continue;
      const y=H*0.7-(this.cond.beatToTime(n.beat)-now)/this.cond.spb*H*0.16;
      if(y<H*0.08||y>H*0.78)continue;
      const x=this.laneX(n.key),r=this.stationR(p);
      const glowCol=n.missed?'#ff2d2d':n.order.burned?'#5a6478':COOK_COL[n.key];
      ctx.save();
      ctx.shadowColor=glowCol;ctx.shadowBlur=16;
      ctx.beginPath();ctx.arc(x,y,r,0,6.283);
      ctx.fillStyle=n.missed?'rgba(225,6,0,.45)':n.order.burned?'#39435a':'#12161f';ctx.fill();
      ctx.lineWidth=4;ctx.strokeStyle=n.missed?'#ff2d2d':'#ffd400';ctx.stroke();
      ctx.shadowBlur=0;
      ctx.lineWidth=2;ctx.strokeStyle=glowCol;
      ctx.beginPath();ctx.arc(x,y,r-6,0,6.283);ctx.stroke();
      ctx.fillStyle='#eef1f6';ctx.font=f(Math.min(30,W*0.044),900);ctx.textAlign='center';
      ctx.fillText(COOK_ARROW[n.key],x,y+10);
      ctx.restore();
    }
    // order ticket + sliding steps strip
    if(o&&!this.over){
      ctx.fillStyle='#171c28';ctx.fillRect(W/2-130,H*0.09,260,74);
      ctx.strokeStyle=o.burned?'#e10600':'#ffd400';ctx.strokeRect(W/2-130,H*0.09,260,74);
      ctx.textAlign='center';ctx.fillStyle=o.burned?'#e10600':'#eef1f6';ctx.font=f(15);
      ctx.fillText((o.i+1)+'/12 · '+o.dish+(o.burned?' ✕':''),W/2,H*0.09+22);
      ctx.strokeStyle='rgba(255,255,255,.08)';ctx.beginPath();
      ctx.moveTo(W/2-130,H*0.09+34);ctx.lineTo(W/2+130,H*0.09+34);ctx.stroke();
      this.renderStepsStrip(ctx,o,H*0.09+56);
    }
    // burn flames
    if(this.flame>0){
      for(let i=0;i<14;i++){
        const x=rand(0,W),h2=rand(10,60)*this.flame;
        ctx.fillStyle='rgba('+(220+Math.floor(rand(0,35)))+','+Math.floor(rand(60,140))+',0,'+(0.25*this.flame)+')';
        ctx.fillRect(x,H*0.74-h2,rand(4,12),h2);
      }
    }
    if(this.msg){
      ctx.globalAlpha=clamp(this.msg.t/0.4,0,1);ctx.textAlign='center';
      ctx.fillStyle=this.msg.c;ctx.font=f(26);ctx.fillText(this.msg.s,W/2,H*0.28);ctx.globalAlpha=1;
    }
    drawHUD(ctx,this,'↓ chop · ↑ flip · ← → stir — a miss burns the order');
    drawCount(ctx,beat);
  }
  renderDishArt(ctx,dish,burned,cx,cy,scale,rot,alpha){ // a nicer plated dish: shadow, rim, steam, food
    ctx.save();ctx.globalAlpha=alpha;
    ctx.translate(cx,cy);ctx.rotate(rot);ctx.scale(scale,scale);
    ctx.beginPath();ctx.ellipse(0,42,46,9,0,0,6.283); // soft shadow
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.fill();
    ctx.beginPath();ctx.arc(0,0,45,0,6.283); // plate
    ctx.fillStyle='#e8e4da';ctx.fill();
    ctx.lineWidth=2;ctx.strokeStyle='rgba(0,0,0,.18)';ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,35,0,6.283); // well
    ctx.fillStyle=burned?'#3a2020':'#171c28';ctx.fill();
    ctx.strokeStyle=burned?'#e10600':'#ffd400';ctx.lineWidth=2.5;ctx.stroke();
    if(!burned){ // steam wisps
      ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=2.5;ctx.lineCap='round';
      for(const sx of [-15,0,15]){
        ctx.beginPath();
        for(let k=0;k<4;k++){
          const yy=-42-k*10,xx=sx+Math.sin(idleT*3+k+sx)*4;
          if(k)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);
        }
        ctx.stroke();
      }
      ctx.lineCap='butt';
    }
    ctx.font=f(42);ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(DISH_ICON[dish]||'🍽️',0,2);
    ctx.restore();ctx.textBaseline='alphabetic';
  }
  renderDishHero(ctx,o){ // the finished dish swings out to the side as the new one slides into the middle
    const cy=H*0.15;
    if(this.exitDish){
      const e=this.exitDish,p=clamp(e.t/0.55,0,1);
      this.renderDishArt(ctx,e.dish,e.burned,W/2+p*W*0.55,cy,1-p*0.25,p*1.7,1-p);
    }
    if(!o)return;
    const t=this.dishSwingT,slideP=Math.min(1,t/0.5);
    const eased=1-Math.pow(1-slideP,3);
    const bounce=Math.sin(slideP*Math.PI)*0.1*(1-slideP);
    const cx=lerp(-W*0.35,W/2,eased)+bounce*W*0.12;
    const rot=(1-slideP)*-0.5+Math.sin(idleT*1.1)*0.03;
    const bob=Math.sin(idleT*1.6)*3;
    this.renderDishArt(ctx,o.dish,o.burned,cx,cy+bob,0.6+slideP*0.4,rot,1);
  }
  stationR(beatP){return Math.min(40,W*0.058)+beatP*4;} // shared radius so falling prompts land exactly inside this ring
  renderStation(ctx,key,x,y,beatP){ // Cooking-Mama style prep station: idle art + live action animation
    const hitT=this.laneHitT[key],ok=this.laneOk[key];
    ctx.save();ctx.translate(x,y);
    ctx.beginPath();ctx.arc(0,0,this.stationR(beatP),0,6.283); // ambient beat ring
    ctx.strokeStyle='rgba(255,212,0,'+(0.25+beatP*0.35)+')';ctx.lineWidth=2;ctx.stroke();
    if(key==='UP')this.renderPanStation(ctx,this.laneSlide[key]-22,hitT,ok);
    else if(key==='DOWN')this.renderBoardStation(ctx,this.laneSlide[key]-22,hitT,ok);
    else this.renderBowlStation(ctx,this.laneSlide[key]-22,hitT,ok);
    if(hitT<0.35&&!ok){ // fail flash
      ctx.globalAlpha=(1-hitT/0.35)*0.9;ctx.font=f(16);ctx.textAlign='center';
      ctx.fillText('💢',18,-28);ctx.globalAlpha=1;
    }
    ctx.restore();
  }
  renderBoardStation(ctx,slide,hitT){ // chop: knife strikes down, veg slides right across the board
    ctx.fillStyle='#8a5a34';ctx.beginPath();ctx.roundRect(-38,-14,76,30,6);ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=1;
    for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-34,i*8);ctx.lineTo(34,i*8);ctx.stroke();}
    ctx.strokeStyle='#6b3d1e';ctx.lineWidth=2;ctx.strokeRect(-38,-14,76,30);
    ctx.save();ctx.beginPath();ctx.rect(-36,-13,72,28);ctx.clip();
    ctx.font=f(20);ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('🥕',clamp(slide,-24,24),0);
    ctx.restore();
    const chopP=clamp(hitT/0.22,0,1);
    const ang=hitT<0.22?lerp(-0.75,0.15,Math.sin(chopP*Math.PI/2)):-0.55+Math.sin(idleT*1.4)*0.04;
    ctx.save();ctx.translate(18,-10);ctx.rotate(ang);
    ctx.font=f(26);ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(COOK_ICON.DOWN,0,0);ctx.restore();
    if(hitT>0.1&&hitT<0.3){
      ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(clamp(slide,-24,24)-10,4);ctx.lineTo(clamp(slide,-24,24)+10,4);ctx.stroke();
    }
    ctx.textBaseline='alphabetic';
  }
  renderPanStation(ctx,slide,hitT,ok){ // flip: food arcs up out of the pan, flips, lands, nudges right
    ctx.beginPath();ctx.arc(0,4,32,0,6.283);
    ctx.fillStyle='#20242e';ctx.fill();ctx.strokeStyle='#454e62';ctx.lineWidth=4;ctx.stroke();
    ctx.fillStyle='#39435a';ctx.beginPath();ctx.roundRect(-58,0,26,9,4);ctx.fill();
    const flipP=clamp(hitT/0.45,0,1);
    const arc=hitT<0.45?Math.sin(flipP*Math.PI):0;
    const fx=clamp(slide,-14,14),fy=4-arc*54;
    ctx.save();ctx.translate(fx,fy);ctx.rotate(flipP*Math.PI*2*(hitT<0.45?(ok?1:0.4):0));
    ctx.font=f(24);ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(COOK_ICON.UP,0,0);ctx.restore();
    ctx.textBaseline='alphabetic';
  }
  renderBowlStation(ctx,slide,hitT,ok,_u,key){ // stir: spoon swirls, the mix drifts right with each pass
    ctx.beginPath();ctx.ellipse(0,6,34,16,0,0,6.283);
    ctx.fillStyle='#e8e4da';ctx.fill();ctx.strokeStyle='rgba(0,0,0,.2)';ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.ellipse(0,3,26,11,0,0,6.283);
    ctx.fillStyle='#c98a3c';ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(clamp(slide*0.6,-16,16),3,8,0.4,5.2);ctx.stroke();
    const stirP=clamp(hitT/0.5,0,1);
    const spin=hitT<0.5?stirP*Math.PI*2*(ok?1:0.5):0;
    ctx.save();ctx.translate(14*Math.cos(spin-1.2),6*Math.sin(spin-1.2)-2);ctx.rotate(spin*0.6-0.6);
    ctx.font=f(22);ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(COOK_ICON.LEFT,0,0);ctx.restore();
    ctx.textBaseline='alphabetic';
  }
  renderStepsStrip(ctx,o,cy){ // current step centered, neighbours slide by on either side
    const spacing=Math.min(28,W*0.04);
    const curIdx=o.notes.findIndex(n=>!n.judged);
    for(let i=0;i<o.notes.length;i++){
      const rel=i-this.stripX;
      if(Math.abs(rel)>3.6)continue;
      const nx=W/2+rel*spacing,nn=o.notes[i],isCur=i===curIdx&&!this.over;
      const scale=isCur?1.3:Math.max(0.5,1-Math.abs(rel)*0.17);
      ctx.save();
      if(nn.judged){
        ctx.globalAlpha=0.45;
        ctx.fillStyle=nn.missed?'#e10600':'#00d2be';
      }else{
        ctx.globalAlpha=isCur?1:0.55;
        ctx.fillStyle=isCur?COOK_COL[nn.key]:'#8b94a7';
      }
      if(isCur){
        ctx.fillStyle='rgba(255,212,0,.16)';
        ctx.beginPath();ctx.roundRect(nx-15,cy-15,30,30,8);ctx.fill();
        ctx.strokeStyle='#ffd400';ctx.lineWidth=1.5;ctx.stroke();
        ctx.fillStyle=COOK_COL[nn.key];
      }
      ctx.font=f(Math.round(16*scale));ctx.textAlign='center';
      ctx.fillText(COOK_ARROW[nn.key],nx,cy+6);
      ctx.restore();
    }
  }
  music(step,t){
    if(step<16){if(step%4===0)AE.blip(t,step===12?880:440,0.3);return;}
    const i=step%16,root=[0,5,7,5][Math.floor(step/16)%4];
    if(i===0||i===8)AE.kick(t,0.8);
    if(i===4||i===12)AE.clap(t,0.8);
    if(i%2===0)AE.shaker(t,1);
    if(i===6||i===14)AE.rim(t,1.2);
    if(i===10)AE.cowbell(t,0.8);
    if(i%4===0)AE.bass(t,root,0.15,0.7);
    if(i===2)AE.lead(t,root+16,0.1,0.5,'triangle');
  }
}

