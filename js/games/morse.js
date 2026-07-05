/* MORSE MELODY — taps and holds that spell real words in real Morse code, with
 * a full A-Z reference chart on screen. The three-sentence Morse-timing variant
 * is CHAMPIONSHIP-ONLY, not a plain Champions-difficulty thing: standalone/
 * arcade play always gives the normal short-word game, even on Champions
 * difficulty — it only switches over while an actual Championship run is in
 * progress (Championship.active) AND Champions difficulty is selected. When
 * it's on: real Morse timing ratios (dash = 3x a dot, proper letter/word gaps)
 * and THREE sentences back to back, each drawn from a 36-line Morse/telegraph-
 * themed bank (MORSE_SENTENCES) via a shuffle bag (drawMorseSentence — see
 * makeBag() in utils.js), so no repeats within a round and no repeats across
 * rounds until the whole bank has cycled. Depends on: core/*.js, art/backgrounds.js. */
'use strict';
/* ============================================================
   MORSE MELODY — taps and holds that spell real words in Morse.
   ============================================================ */
const MORSE={A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',
  J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',
  T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..'};
const MORSE_WORDS=['SOS','RACE','BOX','WIN','FAST','PIT','GRID','CODE','HELP','BEAT','CAR','GO'];
// 36 Morse/telegraph-themed sentences for Champions — letters and spaces only (the MORSE
// table above has no code for punctuation), a separate bank from Typing Rhythm's racing bank.
const MORSE_SENTENCES=[
  'SOS MEANS SAVE OUR SHIP','MORSE SENT THE FIRST MESSAGE','DOTS AND DASHES SPELL LETTERS',
  'THE TELEGRAPH CHANGED THE WORLD','HAM RADIO NEVER WENT SILENT','TITANIC SENT A DISTRESS CALL',
  'THE KEY CLICKS WITH EVERY LETTER','WIRELESS OPERATORS WORKED ALL NIGHT','THE BEACON FLASHED IN CODE',
  'MORSE CROSSED THE OCEAN BY CABLE','NAVY SIGNALMEN FLASHED THE LAMP','AVIATION BEACONS BROADCAST THEIR CODE',
  'THE OPERATOR LISTENED FOR THE PATTERN','A DOT AND A DASH MAKE LETTERS','THE WIRELESS ROOM WENT SILENT',
  'SPIES HID CODE IN THE STATIC','THE LINE STRETCHED ACROSS THE PLAINS','RADIO SILENCE BROKE AT DAWN',
  'THE CODE BREAKER FOUND THE PATTERN','AMATEUR OPERATORS TALK IN CODE','THE BEACON PULSED AT DAWN',
  'MORSE TAUGHT THE WORLD TO SIGNAL','THE SUBMARINE SENT ITS REPORT','FIELD RADIOS CARRIED CODE TO THE FRONT',
  'THE OPERATOR TAPPED THE FINAL LETTER','SHIPS STILL CARRY MORSE TODAY','THE ANTENNA HUMMED WITH THE SIGNAL',
  'EVERY LETTER HAS ITS OWN PATTERN','THE OFFICE BUZZED WITH INCOMING CODE','PILOTS ONCE FLEW BY MORSE BEACONS',
  'THE OPERATOR TRAINED FOR YEARS','STATIC FILLED THE LINE AT NIGHT','THE LAST TELEGRAM SAID STOP STOP',
  'SAMUEL MORSE BUILT THE FIRST KEY','THE LIGHTHOUSE FLASHED ITS CODE','CQD CAME BEFORE SOS EXISTED',
];
const drawMorseSentence=makeBag(MORSE_SENTENCES);
class MorseMelody{
  constructor(){
    this.session=new Session();
    const inChampRun=typeof Championship!=='undefined'&&Championship.active;
    // the 3-sentence Morse-timing variant is Championship-only — arcade/standalone always plays the normal short-word game
    this.champ=Judge.champ()&&inChampRun;
    this.cond=new Conductor(Math.round(80*(inChampRun?Judge.bpmMul():1)));
    this.track=new NoteTrack(this.cond);
    this.words=[];this.over=false;this.pendingDash=null;this.spaceDown=false;
    let b=8;
    if(this.champ){ // real Morse timing: dot=1 unit, dash=3 units, letter gap=3, word gap=7 — three sentences from the bank
      this.unit=0.5; // a noticeably snappier unit than normal mode's ~1-beat dot
      this.sentences=[];
      while(this.sentences.length<3){
        const s=drawMorseSentence();
        if(!this.sentences.includes(s))this.sentences.push(s);
      }
      this.sentence=this.sentences.join(' / '); // used for the results-screen row
      this.sentences.forEach((sent,si)=>{
        for(const w of sent.split(' ')){
          const wobj={word:w,notes:[],start:b,sentIdx:si};
          for(let ci=0;ci<w.length;ci++){
            const ch=w[ci],code=MORSE[ch];
            for(let si2=0;si2<code.length;si2++){
              const sym=code[si2],dur=sym==='.'?this.unit:this.unit*3;
              const n=this.track.add({beat:b,key:'SPACE',kind:sym==='.'?'dot':'dash',
                holdBeats:dur,letter:ch,ci,wordObj:wobj});
              wobj.notes.push(n);
              b+=dur;
              if(si2<code.length-1)b+=this.unit; // 1-unit gap between symbols in a letter
            }
            b+=this.unit*3; // 3-unit letter gap
          }
          wobj.end=b-this.unit*3;b+=this.unit*4; // top up to a full 7-unit word gap
          this.words.push(wobj);
        }
        if(si<this.sentences.length-1)b+=this.unit*6; // extra pause between sentences
      });
    }else{
      for(const w of shuffle(MORSE_WORDS).slice(0,5)){
        const wobj={word:w,notes:[],start:b};
        for(const ch of w){
          const code=MORSE[ch];
          for(const sym of code){
            const n=this.track.add({beat:b,key:'SPACE',kind:sym==='.'?'dot':'dash',
              holdBeats:1.5,letter:ch,wordObj:wobj});
            wobj.notes.push(n);
            b+=sym==='.'?1:2;
          }
          b+=1; // letter gap
        }
        wobj.end=b;b+=3; // word gap
        this.words.push(wobj);
      }
    }
    this.lastBeat=b;
  }
  get touchKeys(){return[{k:'SPACE',label:'· TAP / — HOLD',big:true}];}
  start(){this.cond.patternFn=(s,t)=>this.music(s,t);this.cond.start(0.6);}
  update(dt){
    if(this.over)return;
    const now=Game.judgedNow();
    this.track.sweep(now,Judge.win().ok,n=>Game.missAt(W*0.3,H*0.55));
    if(this.pendingDash){ // dash counts once it has been held long enough
      const pd=this.pendingDash;
      if(now-this.cond.beatToTime(pd.note.beat)>=pd.note.holdBeats*this.cond.spb*0.73){
        Game.hit(pd.delta,W*0.3,H*0.55,110);
        this.pendingDash=null;
      }
    }
    if(this.cond.beat>this.lastBeat+2)this.finish();
  }
  onKeyDown(k,t){
    if(this.over||k!=='SPACE')return;
    AE.morseOn();this.spaceDown=true;
    const n=this.track.hit('SPACE',t,Judge.win().ok);
    if(!n)return;
    if(n.kind==='dot')Game.hit(n.delta,W*0.3,H*0.55,90);
    else this.pendingDash={note:n,delta:n.delta};
  }
  onKeyUp(k){
    if(k!=='SPACE')return;
    AE.morseOff();this.spaceDown=false;
    if(this.pendingDash){ // let go before the dash finished
      Game.missAt(W*0.3,H*0.55);
      FX.text(W*0.3,H*0.48,'HOLD LONGER','#ff8a00');
      this.pendingDash=null;
    }
  }
  finish(){
    if(this.over)return;this.over=true;this.cond.stop();AE.morseOff();
    const s=this.session;
    const clean=this.words.filter(w=>w.notes.every(n=>n.judged&&!n.missed)).length,tot=this.words.length;
    Game.endMode({
      modeId:'morse',title:'MORSE MELODY',
      grade:clean+'/'+tot+' WORDS CLEAN',gradeColor:clean>=tot*0.8?'#00d2be':clean>=tot*0.4?'#ffd400':'#e10600',
      score:s.score,points:Math.round(s.score/15)+clean*20,
      goalValue:clean,fullCombo:s.counts.miss===0,bestCombo:s.maxCombo,
      rows:[[this.champ?'Sentences sent':'Words spelled',
          this.champ?this.sentences.join('  /  '):this.words.map(w=>w.word).join(' ')],
        ['Max combo',s.maxCombo],['Accuracy',s.accuracy.toFixed(1)+'%'],
        ['Misses',s.counts.miss]],
    });
  }
  render(ctx){
    const now=Game.judgedNow(),beat=this.cond.beat;
    bgNight(ctx);
    // A–Z reference chart (learn real Morse)
    ctx.textAlign='left';ctx.font='11px Consolas,monospace';
    const letters=Object.keys(MORSE);
    for(let i=0;i<26;i++){
      const col=Math.floor(i/13),x=12+col*74,y=H*0.16+(i%13)*(H*0.05);
      if(y>H*0.85)continue;
      const L=letters[i];
      const active=this.curLetter===L;
      ctx.fillStyle=active?'#ffd400':'#3a4356';
      ctx.fillText(L+' '+MORSE[L],x,y);
    }
    // timeline: symbols scroll toward the key marker
    const hitX=W*0.3,py=H*0.55;
    ctx.strokeStyle='#242b3a';ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(W,py);ctx.stroke();
    const p=beatPulse(this.cond);
    ctx.beginPath();ctx.arc(hitX,py,20+p*5,0,6.283);
    ctx.strokeStyle='rgba(0,210,190,'+(0.4+p*0.4)+')';ctx.lineWidth=3;ctx.stroke();
    this.curLetter=null;
    const pxb=W*0.13; // px per beat
    for(const n of this.track.notes){
      if(n.judged&&!n.missed)continue;
      const x=hitX+(this.cond.beatToTime(n.beat)-now)/this.cond.spb*pxb;
      if(x<-pxb*2||x>W+40)continue;
      if(!this.curLetter&&x>=hitX-20)this.curLetter=n.letter;
      ctx.fillStyle=n.missed?'rgba(225,6,0,.4)':'#eef1f6';
      if(n.kind==='dot'){ctx.beginPath();ctx.arc(x,py,9,0,6.283);ctx.fill();}
      else{ctx.beginPath();ctx.roundRect(x-9,py-9,pxb*1.5,18,9);ctx.fill();}
      ctx.fillStyle='#8b94a7';ctx.font=f(11,700);ctx.textAlign='center';
      ctx.fillText(n.letter,x,py-18);
    }
    // holding indicator
    if(this.pendingDash){
      const pd=this.pendingDash,n=pd.note;
      const pr=clamp((now-this.cond.beatToTime(n.beat))/(n.holdBeats*this.cond.spb*0.73),0,1);
      ctx.fillStyle='#12161f';ctx.fillRect(hitX-50,py+30,100,10);
      ctx.fillStyle='#00d2be';ctx.fillRect(hitX-50,py+30,100*pr,10);
    }
    if(this.champ)this.renderSentence(ctx);
    else{
      // current word inside a glowing transmission box
      const wobj=this.words.find(w=>beat<w.end+2&&beat>w.start-6);
      if(wobj){
        ctx.textAlign='center';
        const n0=wobj.notes.find(n=>!n.judged);
        const step=Math.min(90,W*0.8/wobj.word.length);
        const x0=W*0.55-(wobj.word.length-1)*step/2+W*0.05;
        const bx=x0-step*0.7,bw2=(wobj.word.length-1)*step+step*1.4;
        ctx.fillStyle='rgba(10,14,26,.8)';
        ctx.beginPath();ctx.roundRect(bx,H*0.175,bw2,H*0.155,12);ctx.fill();
        const gp=beatPulse(this.cond);
        ctx.strokeStyle='rgba(0,210,190,'+(0.5+gp*0.5).toFixed(2)+')';ctx.lineWidth=2;ctx.stroke();
        ctx.fillStyle='#0f1826';ctx.beginPath();ctx.roundRect(bx+12,H*0.175-9,124,18,5);ctx.fill();
        ctx.fillStyle='#00d2be';ctx.font=f(10,700);ctx.textAlign='left';
        ctx.fillText('📡 TRANSMITTING',bx+22,H*0.175+4);
        ctx.textAlign='center';
        for(let i=0;i<wobj.word.length;i++){
          const ch=wobj.word[i];
          const isCur=n0&&n0.letter===ch&&wobj.word.indexOf(ch,Math.max(0,i))===i;
          ctx.fillStyle=isCur?'#ffd400':'#eef1f6';
          ctx.font=f(40);ctx.fillText(ch,x0+i*step,H*0.25);
          ctx.font='16px Consolas,monospace';
          ctx.fillStyle=isCur?'#ffd400':'#8b94a7';ctx.fillText(MORSE[ch],x0+i*step,H*0.31);
        }
        ctx.fillStyle='#8b94a7';ctx.font=f(12,700);
        ctx.fillText('· = tap on the beat        — = hold through the bar',W*0.55,H*0.37);
      }
    }
    // big glowing SPACE key
    const kp=beatPulse(this.cond),kw=Math.min(220,W*0.4),ky=H*0.72;
    ctx.beginPath();ctx.roundRect(W/2-kw/2,ky,kw,46,10);
    ctx.fillStyle=this.spaceDown?'#00d2be':'rgba(23,28,40,.9)';ctx.fill();
    ctx.strokeStyle='rgba(0,210,190,'+(0.35+kp*0.65).toFixed(2)+')';ctx.lineWidth=2+kp*2;ctx.stroke();
    ctx.fillStyle=this.spaceDown?'#0b0d12':'#eef1f6';ctx.font=f(18);ctx.textAlign='center';
    ctx.fillText('SPACE',W/2,ky+30);
    drawHUD(ctx,this,this.champ?'SPACE: tap = dot · hold = dash — real Morse timing, no shortcuts':'SPACE: tap = dot · hold = dash');
    drawCount(ctx,beat);
  }
  renderSentence(ctx){ // Champions: the CURRENT sentence only (of 3), letters filling in as you send them
    const nx=this.track.next();
    const curSentIdx=nx?nx.wordObj.sentIdx:this.sentences.length-1;
    const sentWords=this.words.filter(w=>w.sentIdx===curSentIdx);
    ctx.textAlign='center';ctx.font=f(24,800);
    let totalW=0;
    for(const w of sentWords)totalW+=ctx.measureText(w.word).width+18;
    totalW-=18;
    const bw2=Math.min(W*0.9,totalW+40);
    ctx.fillStyle='rgba(10,14,26,.85)';
    ctx.beginPath();ctx.roundRect(W/2-bw2/2,H*0.055,bw2,50,12);ctx.fill();
    ctx.strokeStyle='rgba(0,210,190,.55)';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#8b94a7';ctx.font=f(11,700);
    ctx.fillText('SENTENCE '+(curSentIdx+1)+' OF '+this.sentences.length,W/2,H*0.055-8);
    ctx.font=f(24,800);
    let x=W/2-totalW/2,curCode=null,curCh=null;
    for(const w of sentWords){
      for(let i=0;i<w.word.length;i++){
        const ch=w.word[i],notes=w.notes.filter(n=>n.ci===i);
        const done=notes.every(n=>n.judged&&!n.missed),bad=notes.some(n=>n.missed);
        const isCur=!done&&!bad&&curCode===null&&notes.some(n=>!n.judged);
        if(isCur){curCode=MORSE[ch];curCh=ch;}
        const cw=ctx.measureText(ch).width;
        ctx.fillStyle=bad?'#e10600':done?'#00d2be':isCur?'#ffd400':'#39435a';
        ctx.fillText(ch,x+cw/2,H*0.055+34);
        x+=cw+2;
      }
      x+=16; // gap between words
    }
    if(curCode){ // big readout of the current letter's dot/dash pattern
      ctx.fillStyle='#ffd400';ctx.font=f(20,800);ctx.fillText(curCh,W/2,H*0.16);
      ctx.font='700 44px Consolas,monospace';ctx.fillStyle='#eef1f6';
      ctx.fillText(curCode,W/2,H*0.25);
    }
  }
  music(step,t){
    if(step<16){if(step%4===0)AE.blip(t,step===12?880:440,0.3);return;}
    const i=step%16,bar=Math.floor(step/16);
    if(i===0||i===8)AE.kick(t,0.5);
    if(i===12)AE.shaker(t,0.8);
    if(i===0&&bar%2===0){const r=[0,-4,5,3][Math.floor(bar/2)%4];
      AE.pad(t,r+12,this.cond.spb*7,1);AE.bass(t,r,0.5,0.5);}
  }
}
