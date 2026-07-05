/* HOW-TO-PLAY — the screen shown before a mode starts, with the goal in plain
 * language and a row of drawn keycaps per control. CHAMP_HOWTO appends extra
 * text automatically when Champions difficulty is active. renderKeyLabel() is
 * the little parser that turns a label like "HOLD SPACE" into a plain word plus
 * one keycap, instead of two keycaps. Depends on: core/*.js, meta/modes.js
 * (needs MODES), games/calibration.js and games/drum-duel.js (special-cased by identity). */
'use strict';
/* ================= HOW-TO-PLAY — shown before every game starts ================= */
const HOWTO={
  calib:{goal:'First, a quick timing check! The game measures the delay of your speakers and keyboard so every beat judges you fairly.',
    steps:[['SPACE','Tap right on every tick you hear — at least 6 taps'],
      ['ENTER','Save when the screen says you have enough taps']]},
  race:{goal:'Race 3 laps as fast as you can! Hitting beats perfectly takes seconds OFF your race time — finish clean for the podium.',
    steps:[['SPACE','Shift gears the instant the rev bar fills into the RED zone'],
      ['HOLD SPACE','Overtake: hold through the slipstream note, then TAP TAP TAP to blast past'],
      ['Q W A S','Pit stop: each wheel needs 3 hits in rhythm — gun off, swap, gun on']]},
  pitcrew:{goal:'You are the pit crew and the cars never stop coming! Run out of tyres (5 misses) and your shift is over.',
    steps:[['Q W','Front-left and front-right wheels'],
      ['A S','Rear-left and rear-right wheels'],
      ['RHYTHM','Hit when the ring shrinks onto the tyre: gun off → swap → gun on'],
      ['BONUS','A perfect car wins a tyre back!']]},
  typing:{goal:'Four keys, four colour lanes, pure rhythm! First pick a hand, then hit each key exactly as its note reaches the ring. 8 misses ends the run.',
    steps:[['F D S A','Left hand — press any of these to pick this side'],
      ['J K L ;','Right hand — press any of these to pick this side'],
      ['TIP','Every finger gets its own colour lane — wrong keys just break your combo']]},
  kitchen:{goal:'12 orders to cook, one move per beat. Miss a beat and the dish BURNS!',
    steps:[['↓','Chop'],['↑','Flip'],['← →','Stir'],
      ['TIP','Hit each arrow as it drops into the glowing ring on the counter']]},
  tkd:{goal:'Fight your way from WHITE belt to BLACK belt! Land at least 70% of the moves in each round to advance — every belt gets faster.',
    steps:[['J','Punch'],['K','Kick'],['L','Block'],
      ['TIP','Strike when the coloured dot slides into your ring']]},
  printer:{goal:'Your 3D printer builds a SURPRISE object — a new one every game! Drop each printed slice right on the beat, like Stack.',
    steps:[['SPACE','Drop a slice on EVERY beat as the print head sweeps across'],
      ['TIP','Watch the dotted ghost outline to see what you are building — off-beat slices stick out crooked']]},
  morse:{goal:'Send real words in real Morse code — dots and dashes, right on the beat!',
    steps:[['TAP SPACE','Dot ( · ) — a quick tap on the beat'],
      ['HOLD SPACE','Dash ( — ) — press on the beat and hold until the bar fills'],
      ['TIP','Let go of a dash too early and it fails. The chart shows the whole alphabet!']]},
  drums:{goal:'Your whole keyboard is a drum kit — every row is a different sound! Learn classic beats, jam free, or grab a friend for Player vs Player.',
    steps:[['1','Free play — smash every key and find your favourite drums'],
      ['2 – 5','Lessons — copy the pattern as dots reach the rings (this earns points!)'],
      ['M · - / =','Metronome on/off · tempo down / up'],
      ['V','Player vs Player — two players, one keyboard, same chart'],
      ['TIP','Finish from the menu to bank your score']]},
  duel:{goal:'One keyboard, two players, identical chart — whoever scores higher wins! Grab a friend and sit side by side.',
    steps:[['PLAYER 1','F D S A — left hand, left half of the screen'],
      ['PLAYER 2','J K L ; — right hand, right half of the screen'],
      ['1 · 2 · 3','Pick a song first — three tempos, from warm-up to turbo'],
      ['TIP','Both of you get the exact same notes at the exact same time, at whatever difficulty is set in Settings']]},
};
const CHAMP_HOWTO={ // appended to the normal how-to-play text when the Champions difficulty is active
  tkd:{goalSuffix:' CHAMPIONS: climb from I DEGREE to IX DEGREE black belt, each one a different colour. Speed matches the normal belts (I-III as fast as BLUE, IV-VI as fast as RED, VII-IX as fast as BLACK) — what makes it hard is the combos: linked pairs, two keys pressed at the exact same instant.',
    extraSteps:[['TIP','A linked pair like K + L must be pressed together, at once — not one after the other']]},
  pitcrew:{goalSuffix:' CHAMPIONS: sometimes TWO cars stack up at once — alternate between them. Watch for jammed guns that need a rapid double tap.',
    extraSteps:[['TIP','A jammed wheel flashes orange — tap that key twice, fast, to clear it']]},
  morse:{goalSuffix:' CHAMPIONS: send THREE sentences back to back, drawn from a Morse/telegraph-themed bank, using real Morse timing (dash = 3x a dot).',
    extraSteps:[['TIP','Each sentence fills in letter by letter at the top — watch the big dot/dash readout for what to send next']]},
  typing:{goalSuffix:' CHAMPIONS: type a full racing-themed sentence, one lowercase letter at a time, right on the beat — no SHIFT, no combos, just a slower and steadier pace than the lane mode, though the text still blacks out sometimes.',
    extraSteps:[['TIP','When it blacks out, keep typing from what you already read']]},
  drums:{goalSuffix:' CHAMPIONS: two new advanced 16th-note/offbeat lessons, plus a SOLO CHALLENGE — improvise freely but keep the kick locked to the beat.',
    extraSteps:[['6 · 7','Advanced lessons: Funk 16ths and Offbeat Hats'],
      ['8','Solo Challenge — freeform jam, graded on kicks landing on the beat']]},
  kitchen:{goalSuffix:' CHAMPIONS: the kitchen runs hot from the very first order — every tempo step is noticeably faster than normal.',
    extraSteps:[['TIP','The pace keeps climbing with every order — stay locked to the beat or the burns pile up fast']]},
  printer:{goalSuffix:' CHAMPIONS: the printer runs hot from the start — every tempo step is noticeably faster than normal.',
    extraSteps:[]},
};
function howtoInfo(MC){
  if(MC===Calibration)return Object.assign({icon:'🎯',name:'TIMING CALIBRATION'},HOWTO.calib);
  if(MC===DrumDuel)return Object.assign({icon:'🥁',name:'2P DRUM DUEL'},HOWTO.duel);
  const m=MODES.find(x=>x.cls===MC);
  if(!m||!HOWTO[m.id])return null;
  const base=Object.assign({icon:m.icon,name:m.name},HOWTO[m.id]);
  if(Judge.champ()&&CHAMP_HOWTO[m.id]){
    const extra=CHAMP_HOWTO[m.id];
    base.goal=base.goal+(extra.goalSuffix||'');
    base.steps=base.steps.concat(extra.extraSteps||[]);
    base.name='CHAMPIONS — '+base.name;
  }
  if(typeof Championship!=='undefined'&&Championship.active){
    base.name='🏆 SEASON '+(Championship.idx+1)+'/'+Championship.queue.length+' — '+base.name;
    base.goal='Playing on '+Store.data.difficulty.toUpperCase()+' difficulty. '+base.goal;
  }
  return base;
}
const HOWTO_WHOLE_LABELS=new Set(['RHYTHM','BONUS','TIP','PLAYER 1','PLAYER 2']); // instructional labels, not real keys
const HOWTO_QUALIFIERS=new Set(['HOLD','TAP']); // action word attached to a real key
const HOWTO_CONNECTORS=new Set(['·','–','—','/']); // punctuation shown plain, between keycaps
function renderKeyLabel(str){
  if(HOWTO_WHOLE_LABELS.has(str))return '<span class="hkey">'+str+'</span>';
  return str.split(' ').map(tok=>{
    if(HOWTO_QUALIFIERS.has(tok))return '<span class="hword">'+tok+'</span>';
    if(HOWTO_CONNECTORS.has(tok))return '<span class="hconn">'+tok+'</span>';
    return '<span class="hkey">'+tok+'</span>';
  }).join(' ');
}
function showHowto(info){
  $('#howto-icon').textContent=info.icon;
  $('#howto-title').textContent=info.name;
  $('#howto-goal').textContent=info.goal;
  const list=$('#howto-list');list.innerHTML='';
  for(const s of info.steps){
    const row=document.createElement('div');row.className='hrow';
    row.innerHTML='<span class="hkeys">'+renderKeyLabel(s[0])+'</span><span>'+s[1]+'</span>';
    list.appendChild(row);
  }
  UI.show('howto');
}
