/* UTILS — small helper functions used absolutely everywhere in the game.
 * $() is a shorthand for document.querySelector. clamp/lerp/rand/choice/shuffle
 * are basic math/array helpers. f() builds a canvas font string. W and H are the
 * canvas's current width/height in CSS pixels — they change on resize, and a few
 * background-drawing functions in art/backgrounds.js briefly swap them to render
 * small preview tiles. This file has no dependencies — everything else depends
 * on it, so it must load first. */

'use strict';
/* ============================================================
   BOX BOX BEAT — single-file F1 rhythm game
   Sections: utils · storage · audio engine · conductor ·
   judgment · fx · input · ui/results · game shell ·
   calibration · race weekend · arcade modes · boot
   ============================================================ */

/* ================= UTILS ================= */
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,k)=>a+(b-a)*k;
const rand=(a,b)=>a+Math.random()*(b-a);
const choice=a=>a[Math.floor(Math.random()*a.length)];
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function fmtTime(s){s=Math.max(0,s);const m=Math.floor(s/60),r=s-m*60;return m+':'+(r<10?'0':'')+r.toFixed(2);}
function on(pat,i){return pat[i%pat.length]==='x';}
const FONT="'Segoe UI',sans-serif";
function f(px,w){return (w||900)+' italic '+px+'px '+FONT;}
let W=0,H=0; // canvas size in CSS px

