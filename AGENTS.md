# AGENTS.md

## What this is
A single-page p5.js sketch ("pelota que rebota" / bouncing ball) with sound. Two files, no build system:
- `index.html` — loads p5.js **and p5.sound** from CDN, then `sketch.js`. `<h1>` is a fixed overlay; the canvas fills the window.
- `sketch.js` — all sketch logic, written in p5 **global mode** (`setup()` / `draw()` defined at top level). Balls live in the `pelotas` array; a ball duplicates (up to `maxPelotas`) when it hits a left/right wall. A separate `particulas` system emits geometric shapes (circle/square/triangle) from the mouse for **20 s** after each click. Uses `p5.Oscillator` + `p5.Envelope` for the bounce sound.

## Running it
There is **no** package.json, npm, bundler, linter, or test suite — don't try to `npm install` / build / test.
- Open `index.html` directly in a browser, or serve the folder with any static server.
- p5.js (`p5@2.3.4`) and p5.sound are fetched from the CDN, so an internet connection is required.
- p5.sound is a **separate** package (`p5.sound@0.4.1`): p5 2.x no longer ships `lib/addons/p5.sound.js`. p5 must load before p5.sound, and both before `sketch.js`.
- Browsers block autoplay audio until a user gesture. The sound only starts after a click/tap (`iniciarAudio()` resumes the context and starts the oscillator). Don't "fix" silent first bounces.

## Editing conventions
- Put behavior in `sketch.js`; touch `index.html` only to change script wiring or page chrome.
- If you change the p5 version, update the pinned CDN URL in `index.html` — do not assume p5 v1 API compatibility, this project targets p5 **2.x**.
- p5.sound 0.4.x is a Tone.js wrapper. Its `p5.Envelope` is one-shot via `env.play()`, and a source must be routed through it (`osc.disconnect(); osc.connect(env)`), since a bare `p5.Oscillator` auto-connects to the destination.
- `sketch.js` starts with an `AudioParam.cancelAndHoldAtTime` polyfill. Firefox lacks that method, and Tone.js' `osc.amp()` / `rampTo` calls it, so without the polyfill Firefox throws `this._param.cancelAndHoldAtTime is not a function`. Keep it.
- Comments in `sketch.js` are in Spanish; keep that style.
