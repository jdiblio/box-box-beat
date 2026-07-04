# Box Box Beat

An F1-themed rhythm game. Every sound is synthesized live with the Web Audio
API (no audio files), every visual is drawn live on a single `<canvas>` (no
images or sprite sheets). No build step, no bundler, no npm — open
`index.html` in a browser (or just double-click it) and it runs.

Play it live: https://jdiblio.github.io/box-box-beat/

## File structure

```
index.html          the HTML for every screen, plus the <script> tags that load everything else, in order
css/style.css        all styling
js/core/              the engine — shared by every game mode
  utils.js             tiny helpers ($ , clamp, lerp, rand, f() for canvas fonts, the W/H canvas-size globals)
  store.js             localStorage save file (points, unlocks, high scores, settings, cosmetics)
  audio.js              the synth engine (AE) — every sound effect and music voice
  conductor.js          the beat clock (Conductor), note scheduling (NoteTrack), timing judgment (Judge), scoring (Session)
  fx.js                  floating text, particles, screen shake/flash, the outro zoom
  input.js               keyboard/touch input, including the held-key Set used for simultaneous-key combos
  ui.js                   DOM screen switching (with the checkered-flag wipe transition) + the results screen
  game.js                 the shell every mode plugs into (Game.start/endMode/hit), and the keyboard router (App)
js/art/                render helpers shared across modes
  backgrounds.js          the idle menu animation + one hand-drawn background per game
  cars.js                 the detailed F1 car illustrations and pit-crew figures
js/games/               one file per playable mode (see "Anatomy of a mode" below)
js/meta/                things that tie all the modes together
  modes.js                the mode registry, the beat-the-level unlock chain, the garage screen
  howto.js                the how-to-play screen shown before a mode starts
  shop.js                 the cosmetics shop (liveries, helmets, trails, kitchen skins)
  stats.js                the stats/achievements screen
  championship.js         plays every unlocked mode back to back for a season score
  main.js                 canvas setup, the main render loop, and every button's click handler — loads last
```

**Load order matters.** These are classic `<script src>` tags (not ES
modules — modules get blocked by CORS when opened via `file://`, which would
break double-clicking the game open). Classic scripts all share one global
scope, so a file can freely use a `const`/`class`/`function` declared in any
file that loaded *before* it — see the `<script>` tag order at the bottom of
`index.html`.

## How the beat clock works

Nothing in this game runs on `setInterval` or frame counts. Everything is
anchored to `AE.ac.currentTime` — the browser's actual audio-hardware clock,
which is far steadier than JS timers.

- **`Conductor`** (`js/core/conductor.js`) turns that raw time into a "beat"
  number: `cond.beat` might read `12.5`, meaning halfway through beat 13. A
  mode builds its whole chart as beat numbers up front (e.g. "a note at beat
  8, another at beat 8.5") rather than scheduling things as the game runs.
- **`NoteTrack`** holds a mode's list of `{beat, key, ...}` notes.
  `track.hit(key, t, window)` finds the closest unjudged note for that key
  within the timing window and marks it judged. `track.sweep(t, window, cb)`
  is called every frame to catch notes whose window has passed without being
  hit, turning them into misses.
- **`Judge`** turns a timing error (in seconds) into `perfect`/`good`/`ok`/
  `miss`, and knows about the four difficulty tiers — Rookie through
  Champions — which is also where a mode checks `Judge.champ()` to decide
  whether to run its hardcore variant.
- **`Session`** is the per-run scoreboard: score, combo, max combo, accuracy.

`Game.judgedNow()` (in `game.js`) is the timestamp every mode should pass to
`track.hit()` — it's the audio clock minus the player's calibrated
input/audio latency (`js/games/calibration.js` is what measures that offset).

## Anatomy of a mode

Every playable thing — Race Weekend, Kitchen Rush, even the Calibration
screen — is a plain class shaped like this:

```js
class MyMode {
  constructor(){
    this.session = new Session();
    this.cond = new Conductor(120);       // starting BPM
    this.track = new NoteTrack(this.cond);
    // ...build your chart into this.track here, or in start()
  }
  get touchKeys(){ return [{k:'SPACE', label:'GO', big:true}]; } // on-screen buttons for mobile
  start(){ this.cond.patternFn = (step,t) => this.music(step,t); this.cond.start(0.6); }
  update(dt){ /* runs every frame — advance state, call track.sweep() for misses */ }
  render(ctx){ /* runs every frame — draw the whole screen with Canvas 2D */ }
  onKeyDown(k,t){ /* a key was pressed at judged-time t — usually calls track.hit() then Game.hit() */ }
  onKeyUp(k,t){ /* optional — only needed for hold-style notes */ }
  finish(){ this.over = true; this.cond.stop(); Game.endMode({modeId, title, grade, score, points, rows}); }
  music(step,t){ /* optional — called by the Conductor on a schedule to play the backing beat */ }
}
```

`Game.hit(delta, x, y, basePoints)` and `Game.missAt(x, y)` are the two calls
a mode makes on every judged note — they update the score/combo and trigger
the floating-text/particle feedback, so a mode almost never touches `FX` or
`Session` directly.

## Adding a brand-new game mode

1. **Create `js/games/my-mode.js`** with a class in the shape above. Give it
   a file header comment like the others.
2. **Add its `<script src="js/games/my-mode.js"></script>` tag** in
   `index.html`, anywhere after `js/core/game.js` and before
   `js/meta/modes.js` (that file needs every mode class to already exist).
3. **Register it in `js/meta/modes.js`**: add an entry to the `MODES` array
   (`id`, `name`, `icon`, `cost`, `cls: MyMode`, `keys`, `desc`), and if it's
   not the last mode in the chain, add a goal to `MODE_GOALS` so the *next*
   mode's unlock requirement makes sense.
4. **Add a how-to-play entry** in `js/meta/howto.js`'s `HOWTO` object (a
   `goal` sentence and a `steps` list of `[keys, description]` pairs — see
   `renderKeyLabel()` in that file for how key names get turned into drawn
   keycaps).
5. **(Optional) Add a Champions variant** by checking `Judge.champ()` in your
   constructor and branching your chart/mechanics — see `js/games/pit-crew.js`
   or `js/games/taekwondo.js` for two different ways of doing this cleanly
   inside a single class.

That's it — the garage screen, the main-menu mosaic background, the unlock
chain, and the results screen all pick up a newly-registered mode
automatically.

## A few things worth knowing before you touch the code

- `W` and `H` (canvas width/height) are mutable globals, not constants — a
  couple of background functions briefly reassign them to render small
  preview tiles (the main-menu mosaic), then restore them.
- `idleT` is a shared animation clock (declared in `js/art/backgrounds.js`,
  advanced once per frame in `js/meta/main.js`) — most background art
  animates off of it instead of `Date.now()`.
- The checkered-flag screen wipe (`triggerWipe()` in `js/core/ui.js`) delays
  the actual screen/mode swap by 250ms — exactly the moment the wipe fully
  covers the screen — so the old screen never "shows through" before the
  transition finishes. Anything that changes screens should go through
  `UI.show()` or `Game.start()` rather than swapping DOM/state directly.
