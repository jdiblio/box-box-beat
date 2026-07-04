/* INPUT — turns raw keyboard events into the layout-independent key names the
 * rest of the game uses (e.g. physical "Q" is always "Q" no matter the keyboard
 * layout, via e.code). Input.held is a live Set of currently-pressed keys, kept
 * up to date on every keydown/keyup — this is what lets Taekwondo Champions
 * detect two keys pressed at the exact same instant. Touch builds the on-screen
 * button overlay for mobile. Depends on: utils.js only (App is defined in game.js
 * and called by name at runtime, which works fine across files). */
'use strict';
/* ================= INPUT — normalized keys (layout independent via e.code) ================= */
const Input={
  held:new Set(), // currently-down keys, tracked by state (not single events) so chords can be detected reliably
  init(){
    window.addEventListener('keydown',e=>{
      if(e.repeat)return;
      const k=this.norm(e);if(!k)return;
      if(document.activeElement&&document.activeElement.tagName==='INPUT'){
        if(k==='ENTER'){const b=$('#b-hs-save');if(b)b.click();}
        return;
      }
      if(['SPACE','UP','DOWN','LEFT','RIGHT'].includes(k))e.preventDefault();
      this.held.add(k);
      App.key(k);
    },{passive:false});
    window.addEventListener('keyup',e=>{
      const k=this.norm(e);
      this.held.delete(k);
      if(document.activeElement&&document.activeElement.tagName==='INPUT')return;
      App.keyUp(k);
    });
    window.addEventListener('blur',()=>this.held.clear()); // don't leave phantom held keys after alt-tab
  },
  isHeld(k){return this.held.has(k);},
  heldCount(keys){return keys.filter(k=>this.held.has(k)).length;},
  norm(e){
    const c=e.code;
    if(!c)return (e.key||'').toUpperCase();
    if(c.startsWith('Key'))return c.slice(3);
    if(c.startsWith('Digit'))return c.slice(5);
    const map={Space:'SPACE',ArrowUp:'UP',ArrowDown:'DOWN',ArrowLeft:'LEFT',ArrowRight:'RIGHT',
      Escape:'ESC',Enter:'ENTER',Semicolon:';',Comma:',',Period:'.',Slash:'/',
      Minus:'-',Equal:'=',Backquote:'`',BracketLeft:'[',BracketRight:']',Quote:"'",
      ShiftLeft:'SHIFT',ShiftRight:'SHIFT'};
    return map[c]||c.toUpperCase();
  },
};

/* touch buttons — each mode declares touchKeys:[{k,label,big?}] */
const Touch={
  build(list){
    const el=$('#touch');el.innerHTML='';
    if(!list||!list.length){el.style.display='none';return;}
    el.style.display='flex';
    for(const b of list){
      const d=document.createElement('div');
      d.className='tbtn'+(b.big?' big':'');d.textContent=b.label;
      const down=e=>{e.preventDefault();AE.init();d.classList.add('dn');
        if(Game.mode&&!Game.paused)Game.mode.onKeyDown(b.k,Game.judgedNow());};
      const up=e=>{e.preventDefault();d.classList.remove('dn');
        if(Game.mode&&!Game.paused&&Game.mode.onKeyUp)Game.mode.onKeyUp(b.k,Game.judgedNow());};
      d.addEventListener('touchstart',down,{passive:false});
      d.addEventListener('touchend',up);d.addEventListener('touchcancel',up);
      d.addEventListener('mousedown',down);d.addEventListener('mouseup',up);d.addEventListener('mouseleave',up);
      el.appendChild(d);
    }
  },
};

