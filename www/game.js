/* Circus Cats — a one-tap circus runner.
 * The cat runs on its own. Quick tap = small hop, hold = big jump.
 * Jump cleanly THROUGH every ring of fire. Touch the burning rim, go over it,
 * or run into its stand = game over. Every ring = 1 coin for the Cat Shop.
 * Cats are defined in breeds.js.
 */
(() => {
  'use strict';

  // ---------- Canvas & scaling ----------
  const canvas = document.getElementById('game');
  let ctx = canvas.getContext('2d');   // swapped briefly when drawing the share picture
  const H = 450;              // logical height
  const GY = 385;             // ground line (dog's feet)
  // Portrait: the screen is always VIEW_W logical px wide. The 450-tall play band
  // (ground at GY) sits so the ground is ~76% down the screen; UI uses the space above.
  const VIEW_W = 500;
  let viewW = VIEW_W, viewH = 1000, scale = 1, offY = 0, dpr = 1;
  const T = () => -offY;                 // top of the screen, in band coordinates
  const MID = () => -offY + viewH / 2;   // middle of the screen

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    scale = canvas.width / VIEW_W;
    viewW = VIEW_W; viewH = canvas.height / scale;
    offY = Math.max(0, viewH * 0.76 - GY);
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  resize();

  // ---------- Saved progress ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };
  let best = parseInt(store.get('pfj_best', '0'), 10) || 0;
  let coins = parseInt(store.get('cd_coins', '0'), 10) || 0;
  let sfxOn = store.get('pfj_muted', '0') !== '1';
  let musicOn = store.get('cd_music', '1') === '1';

  // ---------- Breeds ----------
  const FALLBACK = [{ id: 'mainecoon', name: 'Maine Coon', price: 0,
    look: { coat: '#8f6d4b', pattern: 'tabby', patColor: '#3b2a1c', fur: 2, ears: 'tufted', tail: 'plume', ruff: '#2b6fd6' },
    voice: { chirp: true, pitch: 0.82 }, files: {} }];
  const BREEDS = (Array.isArray(window.CIRCUS_BREEDS) && window.CIRCUS_BREEDS.length ? window.CIRCUS_BREEDS : FALLBACK)
    .map(b => Object.assign({ price: 0, voice: {}, files: {} }, b, { look: Object.assign({}, b.look) }));
  let owned;
  try { owned = JSON.parse(store.get('cd_owned', '[]')); } catch (e) { owned = []; }
  if (!Array.isArray(owned)) owned = [];
  BREEDS.forEach(b => { if (!b.price && !owned.includes(b.id)) owned.push(b.id); });
  let selectedId = store.get('cd_dog', BREEDS[0].id);
  if (!BREEDS.some(b => b.id === selectedId) || !owned.includes(selectedId)) selectedId = BREEDS[0].id;
  const breedById = id => BREEDS.find(b => b.id === id) || BREEDS[0];
  const curBreed = () => breedById(selectedId);
  const saveProgress = () => {
    store.set('cd_coins', String(coins)); store.set('cd_owned', JSON.stringify(owned)); store.set('cd_dog', selectedId);
  };

  // Game-over pictures from breeds.js (optional)
  const images = {};
  function breedImage(b) {
    const src = b.files && b.files.gameOver;
    if (!src) return null;
    if (!images[src]) {
      const im = new Image(); im.onerror = () => { im._bad = true; }; im.src = src; images[src] = im;
    }
    const im = images[src];
    return im.complete && !im._bad && im.naturalWidth ? im : null;
  }

  // ---------- Audio ----------
  let actx = null, noiseBuf = null, sfxBus = null, musicBus = null;
  function ensureAudio() {
    try {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        actx = new AC();
        noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        sfxBus = actx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(actx.destination);
        musicBus = actx.createGain(); musicBus.gain.value = musicOn ? MUSIC_VOL : 0; musicBus.connect(actx.destination);
        preloadBreed(curBreed());
      }
      if (actx.state === 'suspended') actx.resume();
    } catch (e) { actx = null; }
  }

  // Sound files from breeds.js (optional) — decoded once, reused
  const buffers = {};
  function loadSound(url) {
    if (!url || !actx) return null;
    if (!(url in buffers)) {
      buffers[url] = null;
      fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(a => new Promise((res, rej) => actx.decodeAudioData(a, res, rej)))
        .then(buf => { buffers[url] = buf; })
        .catch(() => { buffers[url] = false; });
    }
    return buffers[url] || null;
  }
  function preloadBreed(b) { if (b.files) { loadSound(b.files.meow || b.files.bark); loadSound(b.files.cry); breedImage(b); } }
  function playBuffer(buf, vol = 1) {
    const s = actx.createBufferSource(); s.buffer = buf;
    const g = actx.createGain(); g.gain.value = vol; s.connect(g); g.connect(sfxBus); s.start();
  }

  function noiseBurst(t, dur, freq, q, vol, type = 'bandpass', dest = sfxBus) {
    const src = actx.createBufferSource(); src.buffer = noiseBuf;
    const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = actx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  // Built-in meow: buzzy voice through moving "mouth" formants: mm -> ee -> ow.
  function synthMeow(v, t, opt = {}) {
    const p = (opt.pitch || v.pitch || 1) * (1 + (Math.random() - 0.5) * 0.1);
    const len = (opt.len || 0.38) * (v.length || 1) / Math.sqrt(p);
    const rasp = v.rasp || 0, f0 = 560 * p, sad = !!opt.sad;
    const out = actx.createGain(); out.gain.value = opt.vol || 0.5; out.connect(sfxBus);
    const env = actx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(1.0, t + 0.04);
    env.gain.setValueAtTime(0.85, t + len * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const o1 = actx.createOscillator(); o1.type = 'sawtooth';
    const o2 = actx.createOscillator(); o2.type = 'triangle';
    [o1, o2].forEach(o => {
      if (sad) {
        o.frequency.setValueAtTime(f0 * 1.05, t);
        o.frequency.linearRampToValueAtTime(f0 * 1.2, t + len * 0.25);
        o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + len);
      } else {
        o.frequency.setValueAtTime(f0 * 0.82, t);
        o.frequency.linearRampToValueAtTime(f0 * 1.28, t + len * 0.35);
        o.frequency.exponentialRampToValueAtTime(f0 * 0.78, t + len);
      }
    });
    const vib = actx.createOscillator(); vib.frequency.value = sad ? 7 : 5.5;
    const vg = actx.createGain(); vg.gain.value = f0 * (sad ? 0.035 : 0.015); vib.connect(vg); vg.connect(o1.frequency); vg.connect(o2.frequency);
    const f1 = actx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 4;
    f1.frequency.setValueAtTime(800 * p, t); f1.frequency.linearRampToValueAtTime(1900 * p, t + len * 0.3); f1.frequency.exponentialRampToValueAtTime(850 * p, t + len);
    const f2 = actx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 6;
    f2.frequency.setValueAtTime(2300 * p, t); f2.frequency.linearRampToValueAtTime(3200 * p, t + len * 0.3); f2.frequency.exponentialRampToValueAtTime(1500 * p, t + len);
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
    const g2 = actx.createGain(); g2.gain.value = 0.6;
    o1.connect(f1); o1.connect(f2); o2.connect(g2); g2.connect(f1);
    const mixG = actx.createGain(); mixG.gain.value = 2.2;
    f1.connect(mixG); f2.connect(mixG); mixG.connect(lp); lp.connect(env); env.connect(out);
    o1.start(t); o2.start(t); vib.start(t); o1.stop(t + len + 0.02); o2.stop(t + len + 0.02); vib.stop(t + len + 0.02);
    if (rasp) { // raspy, loud breed voices
      const src = actx.createBufferSource(); src.buffer = noiseBuf;
      const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800 * p; bp.Q.value = 1.2;
      const ng = actx.createGain(); ng.gain.value = rasp * 0.35;
      src.connect(bp); bp.connect(ng); ng.connect(env);
      src.start(t, Math.random() * 0.5); src.stop(t + len + 0.02);
    }
  }
  // "mrrp!" — short rising trill (Maine Coon, Cheetah, Serval...)
  function synthChirp(v, t) {
    const p = (v.pitch || 1) * (1 + (Math.random() - 0.5) * 0.1), len = 0.22;
    const out = actx.createGain(); out.gain.value = 0.5; out.connect(sfxBus);
    const env = actx.createGain();
    env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(1, t + 0.02);
    env.gain.setValueAtTime(0.8, t + len * 0.7); env.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const trem = actx.createGain(); trem.gain.value = 0.6;
    const lfo = actx.createOscillator(); lfo.frequency.value = 32; const lg = actx.createGain(); lg.gain.value = 0.4; lfo.connect(lg); lg.connect(trem.gain);
    const o = actx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(620 * p, t); o.frequency.exponentialRampToValueAtTime(1150 * p, t + len * 0.8);
    const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500 * p; bp.Q.value = 2.5;
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4000;
    o.connect(bp); bp.connect(trem); trem.connect(lp); lp.connect(env);
    const g = actx.createGain(); g.gain.value = 3; env.connect(g); g.connect(out);
    o.start(t); lfo.start(t); o.stop(t + len + 0.02); lfo.stop(t + len + 0.02);
  }
  // Big-cat roar (Tiger, Lion, Jaguar...). saw = leopard-style "sawing" grunts.
  function synthRoar(v, t, dur = 0.75, vol = 0.6) {
    const p = (v.pitch || 1) * (1 + (Math.random() - 0.5) * 0.08);
    const one = (t0, d, k) => {
      const out = actx.createGain(); out.gain.value = vol * k; out.connect(sfxBus);
      const env = actx.createGain();
      env.gain.setValueAtTime(0.0001, t0); env.gain.exponentialRampToValueAtTime(1, t0 + d * 0.15);
      env.gain.setValueAtTime(0.8, t0 + d * 0.55); env.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      const growl = actx.createGain(); growl.gain.value = 0.6;
      const lfo = actx.createOscillator(); lfo.frequency.value = 26; const lg = actx.createGain(); lg.gain.value = 0.4; lfo.connect(lg); lg.connect(growl.gain);
      const o = actx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(95 * p, t0); o.frequency.linearRampToValueAtTime(175 * p, t0 + d * 0.3); o.frequency.exponentialRampToValueAtTime(80 * p, t0 + d);
      const f1 = actx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 520 * p; f1.Q.value = 1.4;
      const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
      const src = actx.createBufferSource(); src.buffer = noiseBuf;
      const nb = actx.createBiquadFilter(); nb.type = 'bandpass'; nb.frequency.value = 650 * p; nb.Q.value = 0.9;
      const ng = actx.createGain(); ng.gain.value = 0.9;
      const og = actx.createGain(); og.gain.value = 2.2;
      o.connect(f1); f1.connect(og); og.connect(growl); src.connect(nb); nb.connect(ng); ng.connect(growl);
      growl.connect(lp); lp.connect(env); env.connect(out);
      const sub = actx.createOscillator(); sub.type = 'sine';
      sub.frequency.setValueAtTime(70 * p, t0); sub.frequency.exponentialRampToValueAtTime(48 * p, t0 + d);
      const sg = actx.createGain(); sg.gain.value = 0.8; sub.connect(sg); sg.connect(env);
      o.start(t0); lfo.start(t0); sub.start(t0); src.start(t0, Math.random() * 0.5);
      [o, lfo, sub, src].forEach(n => n.stop(t0 + d + 0.03));
    };
    if (v.saw) { one(t, 0.22, 1); one(t + 0.27, 0.2, 0.85); }
    else one(t, dur, 1);
  }
  // Short snarl / chuff (Snow Leopard, Lynx, Caracal, Pallas's Cat...)
  function synthGrowl(v, t) {
    const p = v.pitch || 1, d = 0.32;
    const out = actx.createGain(); out.gain.value = 0.5; out.connect(sfxBus);
    noiseBurst(t, 0.12, 3500 * Math.min(1.3, p), 0.8, 0.35, 'bandpass', out);   // "hhh"
    const env = actx.createGain();
    env.gain.setValueAtTime(0.0001, t + 0.05); env.gain.exponentialRampToValueAtTime(1, t + 0.09);
    env.gain.exponentialRampToValueAtTime(0.0001, t + d);
    const growl = actx.createGain(); growl.gain.value = 0.55;
    const lfo = actx.createOscillator(); lfo.frequency.value = 34; const lg = actx.createGain(); lg.gain.value = 0.45; lfo.connect(lg); lg.connect(growl.gain);
    const o = actx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(190 * p, t); o.frequency.exponentialRampToValueAtTime(140 * p, t + d);
    const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 * p; bp.Q.value = 1.5;
    const og = actx.createGain(); og.gain.value = 2.5;
    o.connect(bp); bp.connect(og); og.connect(growl); growl.connect(env); env.connect(out);
    o.start(t); lfo.start(t); o.stop(t + d + 0.03); lfo.stop(t + d + 0.03);
  }

  function synthCry(v, t0) {
    const cp = v.cryPitch || v.pitch || 1;
    if (v.yowl) {   // long dramatic "mrrraaaoooww"
      synthMeow(v, t0 + 0.1, { pitch: cp * 0.95, len: 1.5, sad: true, vol: 0.55 });
      synthMeow(v, t0 + 1.75, { pitch: cp * 1.1, len: 0.45, sad: true, vol: 0.45 });
    } else {
      [[0.1, 0.42, 1.05], [0.62, 0.42, 1.0], [1.15, 1.0, 0.9]].forEach(([s, d, k]) =>
        synthMeow(v, t0 + s, { pitch: cp * k, len: d, sad: true, vol: 0.5 }));
    }
    if (v.roar) synthRoar(Object.assign({}, v, { saw: false, pitch: (v.pitch || 1) * 0.8 }), t0 + 2.2, 0.9, 0.35);
  }

  function meow(b = curBreed()) {
    if (!sfxOn || !actx) return;
    const f = b.files || {}, buf = loadSound(f.meow || f.bark);
    if (buf) { playBuffer(buf); return; }
    const t = actx.currentTime + 0.005, v = b.voice || {};
    if (v.roar) synthRoar(v, t);
    else if (v.growl) synthGrowl(v, t);
    else if (v.chirp) synthChirp(v, t);
    else synthMeow(v, t);
  }
  function cry(b = curBreed(), withPoof = true) {
    if (!sfxOn || !actx) return;
    const t0 = actx.currentTime + 0.02;
    if (withPoof) noiseBurst(t0, 0.12, 900, 1.2, 0.35, 'lowpass');
    const buf = loadSound(b.files && b.files.cry);
    if (buf) { playBuffer(buf); return; }
    synthCry(b.voice || {}, t0);
  }
  function ding() {
    if (!sfxOn || !actx) return;
    const t = actx.currentTime + 0.005;
    [1320, 1980].forEach((f, i) => {
      const o = actx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = actx.createGain();
      g.gain.setValueAtTime(0.0001, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.06 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.25);
      o.connect(g); g.connect(sfxBus); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.3);
    });
  }
  function click() {
    if (!sfxOn || !actx) return;
    noiseBurst(actx.currentTime + 0.002, 0.03, 2500, 2, 0.15);
  }

  // ---------- Circus music (original oom-pah march, generated live) ----------
  const MUSIC_VOL = 0.16;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  // chord per bar: [bass root, bass fifth, triad]
  const CH = { C: [48, 55, [60, 64, 67]], G: [43, 50, [59, 62, 67]], F: [41, 48, [60, 65, 69]] };
  const PROG = 'C C G G G G C C C C F F C G C C'.split(' ');
  const MEL = [
    [[76, 1], [75, 1], [76, 1], [72, 1]], [[67, 1], [72, 1], [76, 1], [79, 1]],
    [[77, 1], [76, 1], [77, 1], [74, 1]], [[71, 1], [74, 1], [79, 2]],
    [[77, 1], [76, 1], [74, 1], [71, 1]], [[74, 1], [73, 1], [74, 1], [77, 1]],
    [[76, 1], [74, 1], [72, 1], [67, 1]], [[72, 2], [0, 2]],
    [[79, 1], [78, 1], [79, 1], [76, 1]], [[84, 2], [79, 2]],
    [[81, 1], [80, 1], [81, 1], [77, 1]], [[72, 1], [77, 1], [81, 2]],
    [[79, 1], [76, 1], [72, 1], [76, 1]], [[74, 1], [77, 1], [71, 1], [74, 1]],
    [[72, 1], [76, 1], [79, 1], [76, 1]], [[72, 2], [0, 2]]
  ];
  const SLOTS = [];   // 64 eighth-note slots -> melody note starting there
  MEL.forEach((bar, bi) => { let p = 0; bar.forEach(([m, l]) => { SLOTS[bi * 4 + p] = m ? [m, l] : null; p += l; }); });
  let musicActive = false, mNext = 0, mStep = 0;

  function tone(type, freq, t, dur, vol, lpf = 3000, vib = 0) {
    const o = actx.createOscillator(); o.type = type; o.frequency.value = freq;
    const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lpf;
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (vib) {
      const l = actx.createOscillator(); l.frequency.value = 5.5;
      const lg = actx.createGain(); lg.gain.value = freq * vib; l.connect(lg); lg.connect(o.frequency);
      l.start(t); l.stop(t + dur + 0.02);
    }
    o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.02);
  }
  function eighth() {
    const k = state === 'play' ? 1 + (speed - 280) / 900 : 1;   // march speeds up with the game
    return 0.18 / k;
  }
  function scheduleStep(step, t) {
    const e = eighth(), slot = step % 64, pos = slot % 4, bar = Math.floor(slot / 4), loop = Math.floor(step / 64);
    const [root, fifth, triad] = CH[PROG[bar]];
    if (pos === 0 || pos === 2) tone('triangle', mtof(pos === 0 ? root : fifth), t, e * 0.9, 0.55, 900);      // tuba "oom"
    else {
      triad.forEach(m => tone('square', mtof(m), t, e * 0.45, 0.07, 1800));                                      // "pah"
      noiseBurst(t, 0.04, 7000, 0.8, 0.05, 'highpass', musicBus);                                                 // cymbal tick
    }
    const n = SLOTS[slot];
    if (n) {
      tone('square', mtof(n[0]), t, e * n[1] * 0.85, 0.11, 2600, 0.006);                                         // calliope
      if (loop % 2 === 1) tone('sine', mtof(n[0] + 12), t, e * n[1] * 0.6, 0.08, 8000);                          // glockenspiel on repeats
    }
  }
  function musicTick() {
    if (!actx || !musicActive) return;
    if (mNext < actx.currentTime) mNext = actx.currentTime + 0.05;
    while (mNext < actx.currentTime + 0.15) { scheduleStep(mStep, mNext); mNext += eighth(); mStep++; }
  }
  setInterval(musicTick, 30);
  function startMusic() {
    if (!actx || musicActive) return;
    musicActive = true; mStep = 0; mNext = actx.currentTime + 0.08;
    musicBus.gain.cancelScheduledValues(actx.currentTime);
    musicBus.gain.setTargetAtTime(musicOn ? MUSIC_VOL : 0, actx.currentTime, 0.05);
  }
  function stopMusic() {
    if (!actx || !musicActive) return;
    musicActive = false;
    musicBus.gain.cancelScheduledValues(actx.currentTime);
    musicBus.gain.setTargetAtTime(0, actx.currentTime, 0.08);
    setTimeout(() => { if (!musicActive && musicBus) musicBus.gain.setTargetAtTime(musicOn ? MUSIC_VOL : 0, actx.currentTime, 0.05); }, 600);
  }

  // ---------- Game state ----------
  const GRAV = 2400, JUMP_V = 900, CUT_V = 200; // let go early = upward speed cut = lower jump
  const RIM = 6;             // thickness of the burning rim (collision radius)
  let state = 'title';       // title | shop | play | dying | over | paused
  let score = 0, speed = 280, time = 0, dist = 0, overT = 0, newBest = false, runCoins = 0;
  let lastHit = null;
  let rings = [], parts = [], tears = [], popups = [];
  let balls = [], ballTimer = 4;
  const BALL_R = 24, BALL_EXTRA = 140;     // rolling circus ball (from score 20), rolls a bit faster than the rings
  const ballV = () => speed + BALL_EXTRA;
  const dog = { x: 170, y: GY, vy: 0, air: false, jt: 0, h0: 0, v0: 0, holding: false };
  let shopIdx = 0, shopCryT = 0, shopMsg = '', shopMsgT = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const dogX = () => 100;
  // game speed: grows with score, with a very slight extra push once the score passes 5
  const speedFor = n => Math.min(492, 280 + n * 8 + (n > 5 ? 12 : 0));

  function ringSize() {
    // Max challenge: single rings are close to the smallest a dog can fit through,
    // and get a little smaller as you score.
    const k = Math.min(score, 25) / 25;
    return rand(44 - k * 2, 50 - k * 4);
  }
  function lowest(R) { return Math.max(R + 80, 128); }   // still leaves room so the dog can't run under
  function makeRing(x, R = ringSize(), hC) {
    // Heights vary from low (quick tap) to high (long press).
    if (hC === undefined) hC = rand(lowest(R), 195);
    return { x, cy: GY - hC, R, rx: R * 0.3, passed: false, judged: false, seed: Math.random() * 100 };
  }
  function nextGap() {
    // random spacing: sometimes short, sometimes long
    const t = Math.random() < 0.3 ? rand(1.1, 1.4) : rand(1.35, 2.6);
    return Math.max(speed * 1.1 + 80, speed * t);
  }
  // Adds the next ring (or group of rings) starting at x.
  function spawnGroup(x) {
    const n0 = rings.length;
    const roll = Math.random();
    if (score >= 10 && roll < 0.25) {
      // TWIN RINGS: two rings side by side, jump through both in one go
      const R = rand(61, 67), hC = rand(160, 195), sep = rand(64, 76);   // a bit bigger than singles
      const a = makeRing(x, R, hC), b = makeRing(x + sep, R, hC);
      a.twin = b.twin = true; b.twinEnd = true;
      rings.push(a, b);
    } else if (score >= 2 && roll < 0.47) {
      // VERY CLOSE PAIR: two low rings right after each other (two quick taps)
      const R1 = rand(49, 54), R2 = rand(49, 54);   // only slightly bigger than single rings
      rings.push(makeRing(x, R1, rand(lowest(R1), lowest(R1) + 18)));
      rings.push(makeRing(x + speed * rand(0.58, 0.72) + 50, R2, rand(lowest(R2), lowest(R2) + 18)));
    } else {
      const r = makeRing(x);
      if (score >= 30 && Math.random() < 0.4) {
        // MOVING RING (from score 30): glides up and down, always within the heights the dog can reach
        const lo = lowest(r.R), hi = 195;
        if (hi - lo >= 40) {
          r.mv = { c: (lo + hi) / 2, a: (hi - lo) / 2, w: Math.PI * 2 / rand(1.7, 2.5), p: rand(0, Math.PI * 2) };
          r.cy = GY - (r.mv.c + r.mv.a * Math.sin(time * r.mv.w + r.mv.p));
        }
      }
      rings.push(r);
    }
    // never let a new ring arrive at the same moment as a rolling ball
    const grp = rings.slice(n0);
    for (let i = 0; i < 80 && grp.some(g => ballConflict(g.x, speed)); i++) for (const g of grp) g.x += 40;
  }
  // true when something at world x (moving at vx) would reach the dog within ~0.8s of a rolling ball
  function ballConflict(x, vx) {
    const tr = (x - dogX()) / vx;
    return balls.some(b => Math.abs(tr - (b.x - dogX()) / ballV()) < 0.8);
  }
  function maybeSpawnBall(dt) {
    if (score < 20 || balls.length) return;
    ballTimer -= dt;
    if (ballTimer > 0) return;
    const x = viewW + 60, tb = (x - dogX()) / ballV();
    // wait for a moment when no ring is about to reach the dog together with the ball
    if (rings.some(r => { const tr = (r.x - dogX()) / speed; return tr > -0.5 && Math.abs(tr - tb) < 0.8; })) return;
    balls.push({ x, r: BALL_R, rot: 0, passed: false });
    ballTimer = rand(3.5, 8);
  }

  function reset() {
    score = 0; speed = 280; dist = 0; newBest = false; runCoins = 0;
    rings = []; parts = []; tears = []; popups = []; balls = []; ballTimer = rand(2, 5);
    dog.x = dogX(); dog.y = GY; dog.vy = 0; dog.air = false; dog.holding = false;
    spawnGroup(dog.x + viewW + 120);
  }
  function startRun() { reset(); state = 'play'; startMusic(); }

  function jump() {
    if (dog.air) return;
    dog.vy = -JUMP_V; dog.air = true; dog.jt = 0; dog.h0 = 0; dog.v0 = JUMP_V; dog.holding = true;
    meow();
    for (let i = 0; i < 6; i++) parts.push({ x: dog.x - 5, y: GY, vx: rand(-120, 20), vy: rand(-120, -40), life: 0.4, max: 0.4, c: '#c89456', r: rand(2, 4) });
  }
  function die() {
    state = 'dying'; overT = 0;
    stopMusic(); cry();
    if (navigator.vibrate) { try { navigator.vibrate(120); } catch (e) {} }
    for (let i = 0; i < 28; i++) {
      const a = rand(0, Math.PI * 2), s = rand(80, 360);
      parts.push({ x: dog.x + 20, y: dog.y - 40, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.4, 0.9), max: 0.9, c: Math.random() < 0.5 ? '#ffb000' : '#ff4d00', r: rand(2, 5) });
    }
    if (score > best) { best = score; newBest = true; store.set('pfj_best', String(best)); }
    saveProgress();
  }

  // ---------- Buttons & input ----------
  let buttons = [];   // rebuilt every frame: {x, y, w, h, on}
  const btn = (x, y, w, h, on) => { buttons.push({ x, y, w, h, on }); };

  function openShop() {
    state = 'shop'; shopIdx = Math.max(0, BREEDS.findIndex(b => b.id === selectedId)); shopCryT = 0;
    startMusic(); BREEDS.forEach(preloadBreed);
  }
  function shopAction() {
    const b = BREEDS[shopIdx];
    if (owned.includes(b.id)) { selectedId = b.id; saveProgress(); flash(b.name + ' is ready!'); meow(b); return; }
    if (coins >= b.price) {
      coins -= b.price; owned.push(b.id); selectedId = b.id; saveProgress();
      flash('You got the ' + b.name + '!'); meow(b); burstAt(viewW / 2, 250, 30);
    } else flash('Jump through ' + (b.price - coins) + ' more rings to unlock');
  }
  function flash(m) { shopMsg = m; shopMsgT = 2.2; }
  function burstAt(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(60, 260);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.8, max: 0.8, c: Math.random() < 0.5 ? '#fff3a0' : '#ffb000', r: rand(1.5, 3.5), star: true });
    }
  }

  function onPress(px, py) {
    ensureAudio();
    const x = px / scale, y = py / scale - offY;
    if (px >= 0) {
      for (let i = buttons.length - 1; i >= 0; i--) {
        const b = buttons[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.on(); return; }
      }
    }
    if (state === 'title') { startRun(); jump(); }
    else if (state === 'play') jump();
    else if (state === 'paused') { state = 'play'; startMusic(); }
    else if (state === 'over' && overT > 0.8) startRun();
  }
  // Letting go early makes a lower jump (tap = small hop, hold = big jump).
  function release() {
    if (!dog.air || !dog.holding) return;
    dog.holding = false;
    const v = dog.v0 - GRAV * dog.jt;
    if (v > CUT_V) {
      dog.h0 = dog.h0 + dog.v0 * dog.jt - 0.5 * GRAV * dog.jt * dog.jt;
      dog.v0 = CUT_V; dog.jt = 0;
    }
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    onPress((e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height);
  }, { passive: false });
  const JUMP_KEYS = ['Space', 'ArrowUp', 'Enter'];
  window.addEventListener('keydown', e => { if (JUMP_KEYS.includes(e.code)) { e.preventDefault(); if (!e.repeat) onPress(-1, -1); } });
  window.addEventListener('keyup', e => { if (JUMP_KEYS.includes(e.code)) release(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (state === 'play') { state = 'paused'; musicActive = false; }
      if (actx) actx.suspend().catch(() => {});
    } else if (actx) actx.resume().catch(() => {});
  });

  // ---------- Collision helpers ----------
  function circHit(ax, ay, ar, bx, by, br) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy < (ar + br) * (ar + br); }
  function circRect(cx, cy, r, x0, y0, x1, y1) {
    const nx = Math.max(x0, Math.min(cx, x1)), ny = Math.max(y0, Math.min(cy, y1));
    const dx = cx - nx, dy = cy - ny; return dx * dx + dy * dy < r * r;
  }
  // Hitbox follows each breed's shape (body + head), but the circles are the same
  // size for every breed so no cat is easier than another.
  function hitOffsets(b) {
    const L = b.look || {};
    const legH = 18 * (L.legs || 1), rx = 19 * (L.body || 1), by = -(legH + 9);
    return [[0, by], [rx + 6, by - 16]];
  }
  const dogCircles = () => {
    const o = hitOffsets(curBreed());
    return [{ x: dog.x + o[0][0], y: dog.y + o[0][1], r: 14 }, { x: dog.x + o[1][0], y: dog.y + o[1][1], r: 10 }];
  };

  // ---------- Update ----------
  function update(dt) {
    time += dt;
    if (shopMsgT > 0) shopMsgT -= dt;
    if (shopCryT > 0) shopCryT -= dt;
    if (overMsgT > 0) overMsgT -= dt;
    if (state === 'title' || state === 'shop') { dist += 120 * dt; updateFx(dt); return; }
    if (state === 'paused') return;

    if (state === 'play') {
      dist += speed * dt;
      dog.x = dogX();
      if (dog.air) {
        dog.jt += dt;
        const h = dog.h0 + dog.v0 * dog.jt - 0.5 * GRAV * dog.jt * dog.jt;
        dog.vy = -(dog.v0 - GRAV * dog.jt);
        if (h <= 0) { dog.y = GY; dog.vy = 0; dog.air = false; } else dog.y = GY - h;
      }
      for (const r of rings) {
        r.x -= speed * dt;
        if (r.mv) r.cy = GY - (r.mv.c + r.mv.a * Math.sin(time * r.mv.w + r.mv.p));
      }
      for (const b of balls) { b.x -= ballV() * dt; b.rot -= ballV() * dt / b.r; }
      balls = balls.filter(b => b.x > -80);
      maybeSpawnBall(dt);
      rings = rings.filter(r => r.x > -150);
      const last = rings[rings.length - 1];
      if (!last || last.x < viewW + 60) spawnGroup((last ? last.x : viewW) + nextGap());

      const cs = dogCircles();
      for (const b of balls) {
        for (const c of cs) {
          const dx = c.x - b.x, dy = c.y - (GY - b.r), rr = c.r + b.r - 3;
          if (dx * dx + dy * dy < rr * rr) { lastHit = 'ball'; die(); return; }
        }
        if (!b.passed && b.x + b.r < cs[0].x - cs[0].r) {
          b.passed = true; score++; coins++; runCoins++;
          speed = speedFor(score);
          ding();
          popups.push({ x: dog.x + 30, y: GY - 90, t: 0, txt: 'BALL +1' });
          if (score % 5 === 0) saveProgress();
        }
      }
      for (const r of rings) {
        for (const c of cs) {
          if (circHit(c.x, c.y, c.r, r.x, r.cy - r.R, RIM) || circHit(c.x, c.y, c.r, r.x, r.cy + r.R, RIM) ||
              circRect(c.x, c.y, c.r, r.x - 5, r.cy + r.R + RIM, r.x + 5, GY + 10)) { lastHit = 'rim'; die(); return; }
        }
        if (!r.judged && cs[0].x >= r.x) {
          r.judged = true;
          if (cs[0].y < r.cy - r.R || cs[0].y > r.cy + r.R) { lastHit = 'miss'; die(); return; }
        }
        if (!r.passed && cs[0].x - cs[0].r > r.x + RIM) {
          r.passed = true; score++; coins++; runCoins++;
          speed = speedFor(score);
          ding();
          popups.push({ x: r.x, y: r.cy - r.R - 18, t: 0, txt: r.twinEnd ? 'TWIN! +2' : r.twin ? '' : '+1' });
          for (let i = 0; i < 14; i++) {
            const a = rand(0, Math.PI * 2), s = rand(60, 200);
            parts.push({ x: r.x, y: r.cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6, max: 0.6, c: '#fff3a0', r: rand(1.5, 3), star: true });
          }
          if (score % 5 === 0) saveProgress();
        }
      }
    }

    if (state === 'dying' || state === 'over') {
      overT += dt;
      if (dog.y < GY || dog.vy < 0) {
        dog.vy += GRAV * dt; dog.y += dog.vy * dt;
        if (dog.y >= GY) { dog.y = GY; dog.vy = 0; }
      }
      dog.air = false;
      if (state === 'dying' && overT > 0.35 && dog.y >= GY) state = 'over';
      if (Math.random() < dt * 7) {
        const side = Math.random() < 0.5 ? 0 : 1;
        tears.push({ x: dog.x + 30 + side * 3, y: dog.y - 20, vx: rand(-40, 60), vy: rand(-80, -20), life: 1.2 });
      }
    }
    updateFx(dt);
  }
  function updateFx(dt) {
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; if (state === 'play') p.x -= speed * dt * 0.5; }
    parts = parts.filter(p => p.life > 0);
    for (const t of tears) { t.life -= dt; t.x += t.vx * dt; t.y += t.vy * dt; t.vy += 700 * dt; if (t.y > GY) { t.y = GY; t.vy = 0; t.vx = 0; } }
    tears = tears.filter(t => t.life > 0);
    for (const p of popups) { p.t += dt; p.y -= 40 * dt; if (state === 'play') p.x -= speed * dt; }
    popups = popups.filter(p => p.t < 0.8);
  }

  // ---------- Drawing: circus background ----------
  function drawBackground() {
    const W = viewW;
    const sw = 56, off = (dist * 0.25) % (sw * 2);
    const top = T();
    ctx.fillStyle = '#f3e3c3'; ctx.fillRect(0, top, W, viewH);
    ctx.fillStyle = '#b3122e';
    for (let x = -off; x < W + sw * 2; x += sw * 2) ctx.fillRect(x, top, sw, viewH);
    let g = ctx.createLinearGradient(0, top, 0, GY);
    g.addColorStop(0, 'rgba(40,0,10,0.75)'); g.addColorStop(0.35, 'rgba(40,0,10,0.15)');
    g.addColorStop(0.8, 'rgba(40,0,10,0.25)'); g.addColorStop(1, 'rgba(40,0,10,0.6)');
    ctx.fillStyle = g; ctx.fillRect(0, top, W, GY - top);

    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    [[W * 0.18, W * 0.3], [W * 0.82, W * 0.45]].forEach(([sx, tx], i) => {
      const sway = Math.sin(time * 0.6 + i * 2) * 60;
      const lg = ctx.createLinearGradient(0, top, 0, GY);
      lg.addColorStop(0, 'rgba(255,250,210,0.28)'); lg.addColorStop(1, 'rgba(255,250,210,0.04)');
      ctx.fillStyle = lg; ctx.beginPath();
      ctx.moveTo(sx - 12, top); ctx.lineTo(sx + 12, top);
      ctx.lineTo(tx + sway + 110, GY); ctx.lineTo(tx + sway - 110, GY); ctx.closePath(); ctx.fill();
    });
    ctx.restore();

    const vo = (dist * 0.25) % 80;
    ctx.fillStyle = '#7a0a1f';
    ctx.fillRect(0, top, W, 22);
    for (let x = -vo - 80; x < W + 80; x += 80) { ctx.beginPath(); ctx.arc(x + 40, top + 22, 40, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = '#e8b93a';
    for (let x = -vo - 80; x < W + 80; x += 80) { ctx.beginPath(); ctx.arc(x + 40, top + 62, 5, 0, Math.PI * 2); ctx.fill(); }
    for (let x = -vo - 80, i = 0; x < W + 80; x += 40, i++) {
      const on = ((i + Math.floor(time * 3)) % 3) !== 0;
      const bx = x + 20, by = top + 26 + (i % 2 ? 12 : 4);
      if (on) {
        const rg = ctx.createRadialGradient(bx, by, 0, bx, by, 16);
        rg.addColorStop(0, 'rgba(255,230,120,0.9)'); rg.addColorStop(1, 'rgba(255,200,60,0)');
        ctx.fillStyle = rg; ctx.fillRect(bx - 16, by - 16, 32, 32);
      }
      ctx.fillStyle = on ? '#fff6c2' : '#9c7a3a';
      ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
    }

    const ao = (dist * 0.45) % 34;
    ctx.fillStyle = 'rgba(30,5,12,0.85)';
    ctx.fillRect(0, GY - 70, W, 30);
    for (let x = -ao - 34, i = 0; x < W + 34; x += 34, i++) {
      const bob = Math.sin(time * 4 + i * 1.7) * 2;
      const hy = GY - 78 + ((i * 7) % 5) + bob;
      ctx.beginPath(); ctx.arc(x + 17, hy, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 17, hy + 20, 14, 12, 0, 0, Math.PI * 2); ctx.fill();
    }

    const co = (dist * 0.7) % 60;
    ctx.fillStyle = '#c4162f'; ctx.fillRect(0, GY - 44, W, 30);
    ctx.fillStyle = '#e8b93a'; ctx.fillRect(0, GY - 44, W, 4); ctx.fillRect(0, GY - 18, W, 4);
    for (let x = -co - 60; x < W + 60; x += 60) {
      ctx.beginPath(); ctx.moveTo(x + 30, GY - 38); ctx.lineTo(x + 38, GY - 29); ctx.lineTo(x + 30, GY - 20); ctx.lineTo(x + 22, GY - 29); ctx.closePath(); ctx.fill();
    }

    g = ctx.createLinearGradient(0, GY - 14, 0, top + viewH);
    g.addColorStop(0, '#c98f4c'); g.addColorStop(1, '#8a5a2b');
    ctx.fillStyle = g; ctx.fillRect(0, GY - 14, W, top + viewH - GY + 14);
    const fo = dist % 97;
    ctx.fillStyle = 'rgba(90,50,20,0.35)';
    for (let x = -fo - 97, i = 0; x < W + 97; x += 97, i++) {
      for (let j = 0; j < 5; j++) {
        const px = x + ((j * 37 + i * 13) % 97), py = GY + 6 + ((j * 23 + i * 11) % Math.max(55, top + viewH - GY - 10));
        ctx.fillRect(px, py, 4, 2);
      }
    }
  }

  // ---------- Drawing: ring of fire ----------
  function drawFlames(r, front) {
    const n = Math.max(12, Math.round(r.R / 3.2));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const cosA = Math.cos(a);
      if (front ? cosA > 0.05 : cosA <= 0.05) continue;
      const px = r.x - cosA * r.rx, py = r.cy + Math.sin(a) * r.R;
      const fl = 0.6 + 0.4 * Math.sin(time * 14 + i * 2.3 + r.seed);
      const h = (15 + 10 * fl) * (0.8 + 0.2 * Math.sin(i * 5.1 + r.seed));
      const ox = -cosA * 0.4, oy = Math.sin(a) * 0.6 - 0.9;
      const tipX = px + ox * h, tipY = py + oy * h;
      const fg = ctx.createRadialGradient(px, py, 0, px, py, h);
      fg.addColorStop(0, 'rgba(255,245,170,0.95)'); fg.addColorStop(0.45, 'rgba(255,150,20,0.8)'); fg.addColorStop(1, 'rgba(230,40,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(px - 6, py);
      ctx.quadraticCurveTo(px - 4, (py + tipY) / 2, tipX, tipY);
      ctx.quadraticCurveTo(px + 4, (py + tipY) / 2, px + 6, py);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawBall(b) {
    const y = GY - b.r;
    ctx.fillStyle = 'rgba(60,25,5,0.35)'; ctx.beginPath(); ctx.ellipse(b.x + 3, GY + 3, b.r * 0.95, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(b.x, y);
    ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(-b.r, -b.r, b.r * 2, b.r * 2);
    const cols = ['#e5262f', '#ffd23a', '#2a7de1', '#ffd23a'];
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = cols[i % 4]; ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, b.r * 1.5, b.rot + i * Math.PI / 4, b.rot + (i + 1) * Math.PI / 4); ctx.closePath(); ctx.fill();
    }
    const g = ctx.createRadialGradient(-b.r * 0.35, -b.r * 0.4, 1, 0, 0, b.r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = g; ctx.fillRect(-b.r, -b.r, b.r * 2, b.r * 2);
    ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = '#3a0712'; ctx.beginPath(); ctx.arc(b.x, y, b.r, 0, Math.PI * 2); ctx.stroke();
  }
  function drawRingBack(r) {
    const gc = r.mv ? '90,200,255' : '255,120,0';   // moving rings glow blue
    const gl = ctx.createRadialGradient(r.x, r.cy, r.R * 0.6, r.x, r.cy, r.R * 1.6);
    gl.addColorStop(0, 'rgba(' + gc + ',0)'); gl.addColorStop(0.5, 'rgba(' + gc + ',0.22)'); gl.addColorStop(1, 'rgba(' + gc + ',0)');
    ctx.fillStyle = gl; ctx.fillRect(r.x - r.R * 1.6, r.cy - r.R * 1.6, r.R * 3.2, r.R * 3.2);
    ctx.fillStyle = '#6b6f78'; ctx.fillRect(r.x - 4, r.cy + r.R + 4, 8, GY - (r.cy + r.R) - 4);
    ctx.fillStyle = '#a9adb6'; ctx.fillRect(r.x - 4, r.cy + r.R + 4, 3, GY - (r.cy + r.R) - 4);
    ctx.fillStyle = '#e8b93a'; ctx.beginPath(); ctx.ellipse(r.x, GY + 2, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.ellipse(r.x, GY + 2, 22, 6, 0, 0, Math.PI); ctx.fill();
    ctx.lineWidth = 7; ctx.strokeStyle = '#5a2a10';
    ctx.beginPath(); ctx.ellipse(r.x, r.cy, r.rx, r.R, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    drawFlames(r, false);
  }
  function drawRingFront(r) {
    ctx.lineWidth = 8; ctx.strokeStyle = '#8a3b12';
    ctx.beginPath(); ctx.ellipse(r.x, r.cy, r.rx, r.R, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#ffb347';
    ctx.beginPath(); ctx.ellipse(r.x, r.cy, r.rx, r.R, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    drawFlames(r, true);
  }

  // ---------- Drawing: cats ----------
  const INK = '#1b1113', TEAR = 'rgba(120,190,255,0.9)';

  // ---- colour helpers ----
  function hexRgb(h) {
    h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  function mix(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
  const lighten = (c, t) => mix(c, '#ffffff', t), darken = (c, t) => mix(c, '#000000', t);
  const isDark = c => { const [r, g, b] = hexRgb(c); return r * 0.3 + g * 0.59 + b * 0.11 < 70; };
  function tuft(pts, r, fill, LN) {
    ctx.fillStyle = LN; pts.forEach(([x, y, k]) => { ctx.beginPath(); ctx.arc(x, y, r * (k || 1) + 1.2, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = fill; pts.forEach(([x, y, k]) => { ctx.beginPath(); ctx.arc(x, y, r * (k || 1), 0, Math.PI * 2); ctx.fill(); });
  }
  function pal(L) {
    if (!L._pal) {
      const C = L.coat || '#c98f4c';
      L._pal = { C, S: L.shade || darken(C, 0.18), HI: lighten(C, 0.28), LN: L.line || darken(C, 0.5) };
    }
    return L._pal;
  }
  function vgrad(y0, y1, top, bot) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bot); return g; }
  // two-segment leg with an outline and a round paw
  function limb(x0, y0, a1, l1, a2, l2, w, col, pawCol, LN) {
    const x1 = x0 + Math.sin(a1) * l1, y1 = y0 + Math.cos(a1) * l1;
    const x2 = x1 + Math.sin(a2) * l2, y2 = y1 + Math.cos(a2) * l2;
    const xm = x0 + (x1 - x0) * 0.6, ym = y0 + (y1 - y0) * 0.6;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = LN;
    ctx.lineWidth = w + 2.4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.lineWidth = w + 4.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(xm, ym); ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.lineWidth = w + 2.2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(xm, ym); ctx.stroke();
    ctx.fillStyle = LN; ctx.beginPath(); ctx.ellipse(x2 + 1.2, y2 + 0.4, w * 0.72 + 1.1, w * 0.5 + 1.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pawCol; ctx.beginPath(); ctx.ellipse(x2 + 1.2, y2, w * 0.72, w * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  function outlinedStroke(path, w, col, LN) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = LN; ctx.lineWidth = w + 2.4; path(); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w; path(); ctx.stroke();
  }
  function smoke(x, y) {
    ctx.strokeStyle = 'rgba(90,90,90,0.5)'; ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      const sx = x + i * 10, sy = y - ((time * 30 + i * 12) % 24);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 5, sy - 5, sx, sy - 10); ctx.stroke();
    }
  }
  // fixed pseudo-random positions (so spots don't jump around between frames)
  const prand = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // Coat pattern inside the current clip. Area: x in [x0,x1], y in [y0,y1].
  function coatPattern(L, x0, y0, x1, y1, scale = 1) {
    const pat = L.pattern, pc = L.patColor || darken(L.coat || '#888', 0.4), w = x1 - x0, h = y1 - y0;
    if (!pat) return;
    if (pat === 'tabby' || pat === 'stripes') {
      const n = Math.max(4, Math.round(w / (pat === 'stripes' ? 7 : 6.5) / scale));
      ctx.fillStyle = pc;
      for (let i = 0; i <= n; i++) {
        const x = x0 + (i + 0.5) * w / (n + 1), sw = (pat === 'stripes' ? 2.8 : 1.9) * scale, bend = (prand(i) - 0.5) * 6 * scale;
        const yb = y0 + h * (pat === 'stripes' ? 0.78 : 0.62) + prand(i + 9) * h * 0.15;
        ctx.beginPath();
        ctx.moveTo(x - sw, y0 - 2);
        ctx.quadraticCurveTo(x - sw + bend, (y0 + yb) / 2, x + bend * 0.3, yb);
        ctx.quadraticCurveTo(x + sw + bend, (y0 + yb) / 2, x + sw, y0 - 2);
        ctx.closePath(); ctx.fill();
        if (pat === 'stripes' && i % 2) { // forked tiger stripe
          ctx.beginPath(); ctx.moveTo(x + sw * 0.5, y0 + h * 0.25);
          ctx.quadraticCurveTo(x + 5 * scale, y0 + h * 0.35, x + 6 * scale, y0 + h * 0.5);
          ctx.lineTo(x + sw * 0.3, y0 + h * 0.4); ctx.closePath(); ctx.fill();
        }
      }
    } else if (pat === 'spots' || pat === 'rosette') {
      const step = (L.dense ? 4.6 : L.big ? 7.5 : 5.8) * scale;
      let k = 0;
      for (let y = y0 + step * 0.5; y < y1 + step; y += step * 0.86) {
        for (let x = x0 + ((k % 2) ? step * 0.5 : 0); x < x1 + step; x += step) {
          k++;
          const px = x + (prand(k) - 0.5) * step * 0.5, py = y + (prand(k + 50) - 0.5) * step * 0.4;
          if (pat === 'spots') {
            const r = (L.dense ? 1.1 : L.big ? 2.2 : 1.5) * scale * (0.8 + prand(k + 7) * 0.4);
            ctx.fillStyle = pc; ctx.beginPath(); ctx.ellipse(px, py, r * 1.15, r, prand(k) * 3, 0, Math.PI * 2); ctx.fill();
          } else {
            const r = 2.3 * scale * (0.85 + prand(k + 7) * 0.3);
            if (L.patColor2) { ctx.fillStyle = L.patColor2; ctx.beginPath(); ctx.arc(px, py, r * 0.75, 0, Math.PI * 2); ctx.fill(); }
            ctx.strokeStyle = pc; ctx.lineWidth = 1.2 * scale; ctx.lineCap = 'round';
            const a0 = prand(k + 3) * 6;
            for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(px, py, r, a0 + j * 2.1, a0 + j * 2.1 + 1.5); ctx.stroke(); }
            if (L.dotted) { ctx.fillStyle = pc; ctx.beginPath(); ctx.arc(px, py, 0.55 * scale, 0, Math.PI * 2); ctx.fill(); }
          }
        }
      }
    } else if (pat === 'ticked') {
      ctx.fillStyle = pc; ctx.globalAlpha = 0.45;
      for (let i = 0; i < 70; i++) { const px = x0 + prand(i) * w, py = y0 + prand(i + 99) * h * 0.7; ctx.fillRect(px, py, 1.1 * scale, 0.8 * scale); }
      ctx.globalAlpha = 1;
    } else if (pat === 'calico') {
      ctx.fillStyle = pc; ctx.beginPath(); ctx.ellipse(x0 + w * 0.3, y0 + h * 0.25, w * 0.22, h * 0.35, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = L.patColor2 || INK; ctx.beginPath(); ctx.ellipse(x0 + w * 0.68, y0 + h * 0.2, w * 0.17, h * 0.3, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = pc; ctx.beginPath(); ctx.ellipse(x0 + w * 0.88, y0 + h * 0.3, w * 0.08, h * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    } else if (pat === 'clouds') {
      for (let i = 0; i < 5; i++) {
        const px = x0 + (i + 0.4) * w / 5, py = y0 + h * (0.3 + (i % 2) * 0.15), rw = w / 9, rh = h * 0.25;
        ctx.fillStyle = pc; ctx.beginPath(); ctx.ellipse(px, py, rw + 1.6 * scale, rh + 1.6 * scale, prand(i), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = mix(L.coat, pc, 0.35); ctx.beginPath(); ctx.ellipse(px, py, rw, rh, prand(i), 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // Side view. Feet at (0,0), facing right. mode: run | jump | cry | idle
  function drawCat(b, x, y, mode, vy = 0) {
    const L = b.look || {};
    ctx.save(); ctx.translate(x, y);
    const run = mode === 'run', ph = time * 17;
    const tilt = mode === 'jump' ? Math.max(-0.35, Math.min(0.35, vy / 2600)) : 0;
    const bob = run ? Math.abs(Math.sin(ph)) * -3 : (mode === 'idle' ? Math.sin(time * 4) * 1.5 : 0);
    ctx.translate(0, bob); ctx.rotate(tilt);
    catSide(L, mode, ph, vy);
    ctx.restore();
  }

  function catSide(L, mode, ph, vy) {
    const { C, S, HI, LN } = pal(L);
    const P = L.points, run = mode === 'run', crying = mode === 'cry', jumping = mode === 'jump';
    const legH = 18 * (L.legs || 1), rx = 19 * (L.body || 1), ry = 9.5 * (L.girth || 1), hs = L.head || 1;
    const by = crying ? -10 : -(legH + 9);
    const fur = L.fur || 0;
    const legCol = P || C, farLeg = P ? darken(P, 0.18) : S;
    const paw = L.socks || legCol, farPaw = L.socks ? darken(L.socks, 0.1) : farLeg;
    const tot = (legH + 5) / 0.95, l1 = tot * 0.5, l2 = tot * 0.52;
    const lw = 4.1 * Math.min(1.25, Math.max(0.85, L.girth || 1));
    const s1 = run ? Math.sin(ph) * 0.65 : 0, s2 = run ? Math.sin(ph + Math.PI) * 0.65 : 0;
    const frontLeg = (x, s, col, pc) => {
      if (crying) limb(x, by + 4, 1.45, l1 * 0.6, 1.55, l2 * 0.6, lw, col, pc, LN);
      else if (jumping) limb(x, by + 4, 1.05, l1, 1.7, l2 * 0.8, lw, col, pc, LN);
      else limb(x, by + 4, s, l1, s * 0.4 + 0.05, l2, lw, col, pc, LN);
    };
    const backLeg = (x, s, col, pc) => {
      if (crying) limb(x, by + 3, 1.2, l1 * 0.55, -1.3, l2 * 0.5, lw + 0.8, col, pc, LN);
      else if (jumping) limb(x, by + 3, -0.7, l1, -1.1, l2, lw + 0.8, col, pc, LN);
      else limb(x, by + 3, s + 0.35, l1, s - 0.45, l2, lw + 0.8, col, pc, LN);
    };
    // far legs
    backLeg(-rx * 0.55, s2, farLeg, farPaw); frontLeg(rx * 0.5, -s2, farLeg, farPaw);

    // tail (behind the body)
    const tailCol = P || C, tx = -rx * 0.9, ty = by - ry * 0.35;
    const wag = Math.sin(time * (crying ? 2 : 6)) * (crying ? 1 : 4);
    const tailType = L.tail || 'long';
    if (tailType === 'bob') {
      tuft([[tx - 3, ty - 2], [tx - 6, ty - 4], [tx - 5, ty + 1], [tx - 1, ty - 5]], 3.6, tailCol, LN);
    } else if (tailType === 'stub') {
      ctx.fillStyle = LN; ctx.beginPath(); ctx.arc(tx - 1, ty, 4.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = tailCol; ctx.beginPath(); ctx.arc(tx - 1, ty, 3.7, 0, Math.PI * 2); ctx.fill();
      if (L.tailTip) { ctx.fillStyle = L.tailTip; ctx.beginPath(); ctx.arc(tx - 3, ty - 1, 2, 0, Math.PI * 2); ctx.fill(); }
    } else {
      // S-curve held up while running, drooping on the floor when crying
      const p0 = [tx, ty], p1 = crying ? [tx - 14, ty + 6] : jumping ? [tx - 18, ty + 2] : [tx - 16, ty - 2];
      const p2 = crying ? [tx - 26, -2] : jumping ? [tx - 30, ty - 10 + wag * 0.5] : [tx - 20 + wag * 0.6, ty - 24 - Math.abs(wag) * 0.3];
      const q = t => [(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]];
      const path = () => { ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); };
      const tw = tailType === 'thin' ? 3 : tailType === 'plume' ? 5 : 4.2 * Math.min(1.2, L.girth || 1);
      if (tailType === 'plume') {
        const pts = []; for (let i = 1; i <= 9; i++) { const [px, py] = q(i / 9); pts.push([px, py, 0.7 + Math.sin(i / 9 * Math.PI) * 0.5]); }
        tuft(pts, 4.6 + fur * 0.5, tailCol, LN);
        if (L.tailRings) { ctx.fillStyle = L.tailRings; for (let i = 2; i <= 8; i += 2) { const [px, py] = q(i / 9); ctx.beginPath(); ctx.arc(px, py, 3.2, 0, Math.PI * 2); ctx.fill(); } }
      } else {
        outlinedStroke(path, tw, tailCol, LN);
        if (L.tailRings) { ctx.save(); ctx.setLineDash([2.6, 3.4]); ctx.lineDashOffset = -12; ctx.strokeStyle = L.tailRings; ctx.lineWidth = tw; ctx.lineCap = 'butt'; path(); ctx.stroke(); ctx.restore(); }
      }
      if (L.tailTip) {
        const [ex, ey] = q(0.94);
        if (L.tuftTip) tuft([[p2[0], p2[1]], [p2[0] - 2, p2[1] - 2], [p2[0] + 1, p2[1] - 3]], 3, L.tailTip, LN);
        else { ctx.strokeStyle = L.tailTip; ctx.lineWidth = tw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); }
      }
    }

    // body = chest + hips, with soft top light
    const bodyPath = () => {
      ctx.beginPath();
      ctx.ellipse(rx * 0.36, by - 0.5, rx * 0.62, ry * 1.08, 0, 0, Math.PI * 2);
      ctx.moveTo(-rx * 0.42 + rx * 0.62, by);
      ctx.ellipse(-rx * 0.42, by, rx * 0.62, ry * 1.04, 0, 0, Math.PI * 2);
      ctx.rect(-rx * 0.45, by - ry * 0.92, rx * 0.85, ry * 1.8);
    };
    let furPts = null;
    if (fur || L.rex) {
      furPts = [];
      const n1 = L.rex ? 22 : 16, n2 = L.rex ? 20 : 14;
      for (let i = 0; i < n1; i++) { const a = i / n1 * Math.PI * 2; furPts.push([rx * 0.36 + Math.cos(a) * rx * 0.62, by - 0.5 + Math.sin(a) * ry * 1.08]); }
      for (let i = 0; i < n2; i++) { const a = i / n2 * Math.PI * 2; furPts.push([-rx * 0.42 + Math.cos(a) * rx * 0.62, by + Math.sin(a) * ry * 1.04]); }
    }
    const fr = L.rex ? 2.4 : fur === 2 ? 5.2 : 3.8;
    if (furPts) { ctx.fillStyle = LN; furPts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, fr + 1.2, 0, Math.PI * 2); ctx.fill(); }); }
    ctx.strokeStyle = LN; ctx.lineWidth = 3; bodyPath(); ctx.stroke();
    if (furPts) { ctx.fillStyle = C; furPts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, fr, 0, Math.PI * 2); ctx.fill(); }); }
    ctx.fillStyle = vgrad(by - ry * 1.2, by + ry * 1.2, HI, S); bodyPath(); ctx.fill();
    ctx.save(); bodyPath(); ctx.clip();
    if (P) { ctx.fillStyle = mix(C, P, 0.25); ctx.beginPath(); ctx.ellipse(-rx * 1.0, by, rx * 0.6, ry * 1.4, 0, 0, Math.PI * 2); ctx.fill(); }
    coatPattern(L, -rx * 1.05, by - ry * 1.15, rx * 1.0, by + ry * 1.1, 1);
    if (L.belly) { ctx.fillStyle = L.belly; ctx.beginPath(); ctx.ellipse(rx * 0.25, by + ry * 1.05, rx * 0.95, ry * 0.55, 0, 0, Math.PI * 2); ctx.fill(); }
    if (L.hairless) {
      ctx.strokeStyle = darken(C, 0.22); ctx.lineWidth = 1;
      [[rx * 0.55, 0], [rx * 0.7, 2], [rx * 0.4, -1]].forEach(([x, o]) => { ctx.beginPath(); ctx.arc(x, by + o, 5, Math.PI * 0.6, Math.PI * 1.3); ctx.stroke(); });
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(rx * 0.25, by + 1, rx * 0.72, ry * 0.95, 0, Math.PI * 1.15, Math.PI * 1.7); ctx.stroke();
    ctx.restore();

    // near legs
    backLeg(-rx * 0.4, s1, legCol, paw); frontLeg(rx * 0.62, -s1, legCol, paw);

    // head position (matches hitOffsets so collisions follow the drawing)
    const hx = crying ? rx + 8 : rx + 5, hy = crying ? by - 5 : by - 16;
    const nx0 = rx * 0.6, ny0 = by - ry * 0.5;
    // lion mane (behind the head and neck)
    if (L.mane) {
      const pts = [];
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; pts.push([hx - 2 + Math.cos(a) * 13 * hs, hy + 2 + Math.sin(a) * 13.5 * hs, 1 + (i % 2) * 0.25]); }
      pts.push([nx0 - 2, ny0 - 2, 1.3], [nx0 + 4, ny0 - 6, 1.3], [nx0 - 4, ny0 + 4, 1.1]);
      tuft(pts, 5.5 * hs, L.mane, darken(L.mane, 0.45));
    }
    // neck
    outlinedStroke(() => { ctx.beginPath(); ctx.moveTo(nx0, ny0); ctx.lineTo(hx - 3, hy + 4); }, 11 * Math.min(1.2, L.girth || 1), C, LN);
    if (L.belly || L.chin) { ctx.strokeStyle = L.belly || L.chin; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(nx0 + 5, ny0 + 5); ctx.lineTo(hx + 1, hy + 8); ctx.stroke(); }
    if (fur >= 1 && !L.mane) {
      const pts = []; for (let i = 0; i < 6; i++) { const t = i / 5; pts.push([nx0 - 2 + (hx - nx0) * t * 0.8, ny0 + 6 - t * 5 + Math.sin(t * 9) * 1.5]); }
      tuft(pts, 3 + fur, L.chin || L.belly || C, LN);
    }
    // circus ruffle collar
    if (L.ruff) {
      const cx1 = nx0 + (hx - 3 - nx0) * 0.5, cy1 = ny0 + (hy + 4 - ny0) * 0.5;
      ctx.save(); ctx.translate(cx1, cy1); ctx.rotate(-0.7);
      for (let k = -3; k <= 3; k++) {
        ctx.fillStyle = darken(L.ruff, 0.35); ctx.beginPath(); ctx.ellipse(0.6, k * 2.9, 5.6, 2.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = k % 2 ? L.ruff : lighten(L.ruff, 0.45); ctx.beginPath(); ctx.ellipse(0, k * 2.9, 5, 2.1, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(4.5, 0, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // ears (drawn before the head so the head covers their base)
    const es = L.earSize || 1, ears = L.ears || 'normal', earCol = P || C;
    const back = crying ? 1 : jumping ? 0.35 : 0;
    const earTri = (b1, b2, tipUp, tipX, near) => {
      const col = near ? earCol : darken(earCol, 0.12);
      const tip = [tipX - back * 9 * es, tipUp + back * 8 * es];
      ctx.fillStyle = LN;
      ctx.beginPath(); ctx.moveTo(b1[0] - 1.2, b1[1] + 1);
      if (ears === 'round' || ears === 'small') ctx.quadraticCurveTo(tip[0] - 4, tip[1] - 3, tip[0], tip[1] - 1.3), ctx.quadraticCurveTo(tip[0] + 4, tip[1] - 2, b2[0] + 1.2, b2[1]);
      else ctx.lineTo(tip[0], tip[1] - 1.6), ctx.lineTo(b2[0] + 1.2, b2[1]);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = (near && L.earBack) ? L.earBack : col;
      ctx.beginPath(); ctx.moveTo(b1[0], b1[1]);
      if (ears === 'round' || ears === 'small') ctx.quadraticCurveTo(tip[0] - 3, tip[1] - 2, tip[0], tip[1]), ctx.quadraticCurveTo(tip[0] + 3, tip[1] - 1, b2[0], b2[1]);
      else ctx.lineTo(tip[0], tip[1]), ctx.lineTo(b2[0], b2[1]);
      ctx.closePath(); ctx.fill();
      if (near) {
        if (L.earBack) { // wild cats: white spot on the back of the ear
          ctx.fillStyle = '#fbf6ee'; ctx.beginPath(); ctx.ellipse((b1[0] + b2[0] + tip[0]) / 3, (b1[1] + b2[1] + tip[1]) / 3 + 1, 1.8 * es, 1.4 * es, 0, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = L.hairless ? '#f0a7a0' : '#f2b3b8';
          const it = [tip[0] + (b1[0] + b2[0] - 2 * tip[0]) * 0.28, tip[1] + (b1[1] + b2[1] - 2 * tip[1]) * 0.28];
          ctx.beginPath(); ctx.moveTo(b1[0] + 2.2, b1[1] - 0.6); ctx.lineTo(it[0], it[1]); ctx.lineTo(b2[0] - 1.6, b2[1] + 0.2); ctx.closePath(); ctx.fill();
        }
        if (ears === 'tufted') {
          ctx.strokeStyle = L.earBack || LN; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
          const tl = 5 * (L.tuftLen || 1);
          ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(tip[0] - 1 - back * 3, tip[1] - tl); ctx.stroke();
        }
        if (ears === 'curl' && !crying) {
          ctx.strokeStyle = LN; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(tip[0] - 2.2, tip[1] + 1.5, 2.6, -0.4, Math.PI * 1.1); ctx.stroke();
        }
      }
    };
    if (ears !== 'fold') {
      const h = ears === 'small' ? 8 : ears === 'round' ? 9.5 : 12.5;
      const lean = ears === 'curl' ? -4 : 0;
      earTri([hx - 9 * hs, hy - 5 * hs], [hx - 2.5 * hs, hy - 8.5 * hs], hy - 8 * hs - h * es, hx - 7.5 * hs + lean, false);
      earTri([hx - 3 * hs, hy - 8.5 * hs], [hx + 5 * hs, hy - 7 * hs], hy - 8.5 * hs - h * es, hx + 0.5 * hs + lean, true);
    }

    // head: skull + cheeks + short muzzle
    const f = L.face || 1, mw = 3.2 + 3.4 * f, mxC = hx + 7 * hs + 2.8 * f;
    const headPath = () => {
      ctx.beginPath();
      ctx.ellipse(hx, hy, 10.5 * hs, 9.6 * hs, 0, 0, Math.PI * 2);
      ctx.moveTo(hx + 2 + 9 * hs, hy + 4 * hs); ctx.ellipse(hx + 2, hy + 4 * hs, 9 * hs, 6.4 * hs, 0, 0, Math.PI * 2);
      ctx.moveTo(mxC + mw, hy + 3.5 * hs); ctx.ellipse(mxC, hy + 3.5 * hs, mw, 3.9 * hs, 0.1, 0, Math.PI * 2);
    };
    if (fur >= 1 || L.beard) { // fluffy cheeks
      const pts = []; for (let i = 0; i < 5; i++) { const a = Math.PI * (0.35 + i * 0.16); pts.push([hx - 1 + Math.cos(a) * 10 * hs, hy + 3 + Math.sin(a) * 9 * hs]); }
      tuft(pts, (L.beard ? 4.2 : 2.6 + fur), L.beard || L.chin || C, LN);
    }
    ctx.strokeStyle = LN; ctx.lineWidth = 2.8; headPath(); ctx.stroke();
    ctx.fillStyle = vgrad(hy - 10 * hs, hy + 9 * hs, HI, C); headPath(); ctx.fill();
    ctx.save(); headPath(); ctx.clip();
    if (P) { // colour-point mask
      const g = ctx.createRadialGradient(mxC, hy + 3, 1, mxC, hy + 3, 13 * hs);
      g.addColorStop(0, P); g.addColorStop(0.55, P); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(hx - 12 * hs, hy - 12 * hs, 30 * hs, 26 * hs);
    }
    // forehead / cheek markings
    if (L.pattern === 'tabby' || L.pattern === 'stripes') {
      ctx.fillStyle = L.patColor;
      const sw = L.pattern === 'stripes' ? 1.6 : 1.1;
      [-4, 0, 4].forEach((o, i) => { ctx.beginPath(); ctx.moveTo(hx + o - sw, hy - 11 * hs); ctx.lineTo(hx + o + 1, hy - 4 * hs - (i === 1 ? 1 : 0)); ctx.lineTo(hx + o + sw, hy - 11 * hs); ctx.closePath(); ctx.fill(); });
      [0, 3.4].forEach(o => { ctx.beginPath(); ctx.moveTo(hx - 8 * hs, hy + o); ctx.lineTo(hx + 1, hy + 2 + o * 0.6); ctx.lineTo(hx - 8 * hs, hy + o + sw * 1.6); ctx.closePath(); ctx.fill(); });
    } else if (L.pattern === 'spots' || L.pattern === 'rosette') {
      ctx.fillStyle = L.patColor;
      [[-5, -6], [-1, -8], [3, -7], [-7, -1], [-4, 1]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(hx + dx * hs, hy + dy * hs, 0.95, 0, Math.PI * 2); ctx.fill(); });
    } else if (L.pattern === 'calico') {
      ctx.fillStyle = L.patColor; ctx.beginPath(); ctx.ellipse(hx - 4, hy - 6, 7, 5, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = L.patColor2 || INK; ctx.beginPath(); ctx.ellipse(hx - 9, hy, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
    } else if (L.pattern === 'clouds') {
      ctx.fillStyle = L.patColor; [[-6, -5], [-2, -8], [-7, 1]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.ellipse(hx + dx, hy + dy, 1.6, 1.2, 0, 0, Math.PI * 2); ctx.fill(); });
    }
    if (L.chin) { ctx.fillStyle = L.chin; ctx.beginPath(); ctx.ellipse(mxC - 1, hy + 6.5 * hs, mw + 2.5, 3.6 * hs, 0.1, 0, Math.PI * 2); ctx.fill(); }
    if (L.brow) { ctx.fillStyle = L.brow; ctx.beginPath(); ctx.ellipse(hx + 4.5 * hs, hy - 5.5 * hs, 3, 1.6, -0.15, 0, Math.PI * 2); ctx.fill(); }
    if (L.hairless) { ctx.strokeStyle = darken(C, 0.25); ctx.lineWidth = 0.9; [-6, -4].forEach(o => { ctx.beginPath(); ctx.moveTo(hx - 3, hy + o * hs); ctx.quadraticCurveTo(hx + 1, hy + (o - 1.5) * hs, hx + 5, hy + o * hs); ctx.stroke(); }); }
    ctx.restore();
    if (ears === 'fold') { // small folded ears lying flat on top of the head
      ctx.fillStyle = LN; ctx.beginPath(); ctx.moveTo(hx - 6 * hs, hy - 7.5 * hs); ctx.lineTo(hx + 2 * hs, hy - 11 * hs); ctx.lineTo(hx + 3.5 * hs, hy - 6 * hs); ctx.closePath(); ctx.fill();
      ctx.fillStyle = earCol; ctx.beginPath(); ctx.moveTo(hx - 4.8 * hs, hy - 7.5 * hs); ctx.lineTo(hx + 1.6 * hs, hy - 10 * hs); ctx.lineTo(hx + 2.6 * hs, hy - 6.4 * hs); ctx.closePath(); ctx.fill();
    }

    // eye
    const ex = hx + 4.6 * hs, ey = hy - 1.2 * hs, ek = L.bigEyes ? 1.3 : 1;
    if (crying) {
      ctx.strokeStyle = isDark(C) && !P ? lighten(C, 0.6) : INK; ctx.lineWidth = 1.9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ex, ey + 2.2, 3, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex - 4, ey - 4); ctx.lineTo(ex + 3, ey - 3); ctx.stroke();
      ctx.strokeStyle = TEAR; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(ex, ey + 2.5); ctx.lineTo(ex + 0.5, ey + 10); ctx.stroke();
    } else {
      const ew = 3.1 * ek, eh = (jumping ? 3.2 : 2.6) * ek;
      ctx.fillStyle = LN; ctx.beginPath(); ctx.ellipse(ex, ey, ew + 0.9, eh + 0.9, 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = L.eyes || '#c9a227'; ctx.beginPath(); ctx.ellipse(ex, ey, ew, eh, 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath();
      if (L.roundPupils || jumping) ctx.arc(ex + 0.5, ey, (jumping ? 1.9 : 1.4) * ek, 0, Math.PI * 2);
      else ctx.ellipse(ex + 0.5, ey, 0.8 * ek, eh * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 1.4, ey - 1.1, 0.85, 0, Math.PI * 2); ctx.fill();
      if (L.grumpy) { ctx.strokeStyle = LN; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ex - 4, ey - 4.6); ctx.lineTo(ex + 3.5, ey - 2.4); ctx.stroke(); }
    }
    if (L.tearMarks) { ctx.strokeStyle = L.tearMarks; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(ex + 2.5, ey + 2); ctx.quadraticCurveTo(ex + 3, hy + 6, mxC - 1, hy + 7 * hs); ctx.stroke(); }

    // nose, mouth, whiskers
    const nX = mxC + mw - 1.2, nY = hy + 1.6 * hs;
    const noseCol = L.wild ? '#a8584e' : (isDark(C) && !P) ? '#3a2a2c' : P ? darken(P, 0.2) : L.hairless ? '#d9857a' : '#e8899a';
    ctx.fillStyle = noseCol; ctx.beginPath(); ctx.moveTo(nX - 2.8, nY - 1.4); ctx.lineTo(nX + 0.8, nY - 1.6); ctx.lineTo(nX - 0.4, nY + 1.4); ctx.closePath(); ctx.fill();
    const mX = nX - 1.8, mY = hy + 5.2 * hs;
    if (crying) {
      ctx.fillStyle = '#7a2330'; ctx.beginPath(); ctx.ellipse(mX - 1, mY + 1, 2.8, 1.8 + Math.abs(Math.sin(time * 9)) * 1.6, 0, 0, Math.PI * 2); ctx.fill();
    } else if (jumping && vy < -250) { // "meow!"
      ctx.fillStyle = '#5a1e28'; ctx.beginPath(); ctx.ellipse(mX - 0.5, mY + 0.8, 2.6, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e0607a'; ctx.beginPath(); ctx.ellipse(mX - 0.5, mY + 1.8, 1.6, 0.9, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = LN; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(nX - 0.6, nY + 1.4); ctx.lineTo(nX - 0.8, mY - 0.6);
      ctx.quadraticCurveTo(nX - 2.6, mY + 1.2, nX - 4.2, mY - 0.4); ctx.stroke();
    }
    if (L.muzzleDots) { ctx.fillStyle = L.muzzleDots; ctx.beginPath(); ctx.ellipse(mxC - 1, hy + 4.5 * hs, 1.8, 1.4, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = isDark(C) ? 'rgba(235,235,235,0.75)' : 'rgba(60,40,40,0.5)'; ctx.lineWidth = 0.7;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(mxC - 1, hy + 4 * hs + i); ctx.quadraticCurveTo(mxC + 7, hy + 3 * hs + i * 2.4, mxC + 13, hy + 4 * hs + i * 3.6 + (crying ? 3 : 0)); ctx.stroke(); }
    if (crying) smoke(hx - 6, hy - 14);
  }

  // Big front-facing crying face for the Game Over card (used when no picture is set)
  function drawCryFace(b, cx, cy, k) {
    const L = b.look || {}, { C, S, HI, LN } = pal(L), P = L.points, hs = L.head || 1, fur = L.fur || 0;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    const sob = Math.sin(time * 9) * 1.2;
    ctx.translate(0, sob * 0.5);
    const es = L.earSize || 1, ears = L.ears || 'normal', earCol = P || C;
    const W = 30 * Math.min(1.1, hs), Hh = 25 * Math.min(1.1, hs);
    if (L.mane) {
      const pts = []; for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; pts.push([Math.cos(a) * (W + 9), 6 + Math.sin(a) * (Hh + 11), 1 + (i % 2) * 0.3]); }
      tuft(pts, 9, L.mane, darken(L.mane, 0.45));
    }
    // ears (drooping sideways: sad)
    if (ears !== 'fold') {
      const h = (ears === 'small' ? 15 : ears === 'round' ? 17 : 24) * es;
      [-1, 1].forEach(sd => {
        const b1 = [sd * 6, -Hh + 4], b2 = [sd * (W - 2), -6], tip = [sd * (W + h * 0.45), -Hh - h * 0.55];
        const rnd = ears === 'round' || ears === 'small';
        const shape = (o) => {
          ctx.beginPath(); ctx.moveTo(b1[0], b1[1] + o);
          if (rnd) { ctx.quadraticCurveTo(tip[0] - sd * 8, tip[1] - 6 - o, tip[0], tip[1] - o); ctx.quadraticCurveTo(tip[0] + sd * 6, tip[1] + 6, b2[0] + sd * o, b2[1]); }
          else { ctx.lineTo(tip[0], tip[1] - o * 1.3); ctx.lineTo(b2[0] + sd * o, b2[1]); }
          ctx.closePath();
        };
        ctx.fillStyle = LN; shape(2.2); ctx.fill();
        ctx.fillStyle = earCol; shape(0); ctx.fill();
        ctx.fillStyle = L.hairless ? '#f0a7a0' : '#f2b3b8';
        ctx.beginPath(); ctx.moveTo(sd * 11, -Hh + 7); ctx.lineTo(tip[0] - sd * 4, tip[1] + 8); ctx.lineTo(sd * (W - 7), -9); ctx.closePath(); ctx.fill();
        if (ears === 'tufted') {
          ctx.strokeStyle = L.earBack || LN; ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(tip[0] + sd * 3, tip[1] - 11 * (L.tuftLen || 1)); ctx.stroke();
        }
        if (ears === 'curl') { ctx.strokeStyle = LN; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(tip[0] - sd * 3, tip[1] + 4, 4.5, 0, Math.PI * 2); ctx.stroke(); }
      });
    }
    // fluffy cheeks / lynx ruff
    if (fur >= 1 || L.beard) {
      [-1, 1].forEach(sd => { const pts = []; for (let i = 0; i < 4; i++) pts.push([sd * (W - 2 + i * 1.5), 2 + i * 6]); tuft(pts, L.beard ? 7.5 : 4.5 + fur, L.beard || L.chin || C, LN); });
    }
    const headPath = () => {
      ctx.beginPath();
      ctx.ellipse(0, 2, W, Hh, 0, 0, Math.PI * 2);
      ctx.moveTo(W + 2, 12); ctx.ellipse(0, 12, W + 2, Hh * 0.62, 0, 0, Math.PI * 2);
    };
    ctx.strokeStyle = LN; ctx.lineWidth = 3.2; headPath(); ctx.stroke();
    ctx.fillStyle = vgrad(-Hh, Hh, HI, C); headPath(); ctx.fill();
    ctx.save(); headPath(); ctx.clip();
    if (P) {
      const g = ctx.createRadialGradient(0, 12, 2, 0, 12, 24);
      g.addColorStop(0, P); g.addColorStop(0.6, P); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(-W, -Hh, W * 2, Hh * 2 + 10);
    }
    const pc = L.patColor;
    if (L.pattern === 'tabby' || L.pattern === 'stripes') {
      ctx.fillStyle = pc;
      const sw = L.pattern === 'stripes' ? 3 : 2;
      [-7, 0, 7].forEach((o, i) => { ctx.beginPath(); ctx.moveTo(o - sw, -Hh); ctx.lineTo(o, -6 - (i === 1 ? 2 : 0)); ctx.lineTo(o + sw, -Hh); ctx.closePath(); ctx.fill(); });
      [-1, 1].forEach(sd => [4, 10, 16].forEach(y => { ctx.beginPath(); ctx.moveTo(sd * (W + 2), y - sw); ctx.lineTo(sd * (W - 12), y + 1); ctx.lineTo(sd * (W + 2), y + sw); ctx.closePath(); ctx.fill(); }));
    } else if (L.pattern === 'spots' || L.pattern === 'rosette' || L.pattern === 'clouds') {
      ctx.fillStyle = pc;
      [[-9, -14], [-3, -18], [4, -16], [10, -12], [-14, -6], [15, -5], [0, -10], [-20, 10], [20, 10]].forEach(([x, y], i) => { ctx.beginPath(); ctx.arc(x, y, i % 2 ? 1.6 : 2, 0, Math.PI * 2); ctx.fill(); });
    } else if (L.pattern === 'calico') {
      ctx.fillStyle = pc; ctx.beginPath(); ctx.ellipse(-14, -10, 14, 12, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = L.patColor2 || INK; ctx.beginPath(); ctx.ellipse(16, -14, 10, 9, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (L.chin) { ctx.fillStyle = L.chin; ctx.beginPath(); ctx.ellipse(0, 20, 16, 10, 0, 0, Math.PI * 2); ctx.fill(); }
    if (L.brow) { ctx.fillStyle = L.brow; ctx.beginPath(); ctx.ellipse(-11, -7, 5, 2.6, 0.2, 0, Math.PI * 2); ctx.ellipse(11, -7, 5, 2.6, -0.2, 0, Math.PI * 2); ctx.fill(); }
    if (L.hairless) { ctx.strokeStyle = darken(C, 0.25); ctx.lineWidth = 1.4; [-16, -11].forEach(y => { ctx.beginPath(); ctx.moveTo(-10, y); ctx.quadraticCurveTo(0, y - 3, 10, y); ctx.stroke(); }); }
    ctx.restore();
    if (ears === 'fold') {
      [-1, 1].forEach(sd => {
        ctx.fillStyle = LN; ctx.beginPath(); ctx.moveTo(sd * 6, -Hh + 2); ctx.lineTo(sd * 24, -Hh + 1); ctx.lineTo(sd * 20, -Hh + 13); ctx.closePath(); ctx.fill();
        ctx.fillStyle = earCol; ctx.beginPath(); ctx.moveTo(sd * 8, -Hh + 3); ctx.lineTo(sd * 22, -Hh + 2.5); ctx.lineTo(sd * 19, -Hh + 11); ctx.closePath(); ctx.fill();
      });
    }
    // sad brows + squeezed-shut eyes
    const dark = isDark(C) && !P;
    ctx.strokeStyle = dark ? 'rgba(230,230,230,0.6)' : 'rgba(60,40,40,0.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-18, -5); ctx.lineTo(-6, -9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, -5); ctx.lineTo(6, -9); ctx.stroke();
    ctx.strokeStyle = dark ? lighten(C, 0.65) : INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(-12, 4, 5.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(12, 4, 5.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    if (L.tearMarks) { ctx.strokeStyle = L.tearMarks; ctx.lineWidth = 2.6; [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(sd * 6, 3); ctx.quadraticCurveTo(sd * 7, 14, sd * 4, 22); ctx.stroke(); }); }
    if (L.muzzleDots) { ctx.fillStyle = L.muzzleDots; [-1, 1].forEach(sd => { ctx.beginPath(); ctx.ellipse(sd * 9, 17, 3.5, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }); }
    // nose + wailing mouth
    const noseCol = L.wild ? '#a8584e' : dark ? '#3a2a2c' : P ? darken(P, 0.2) : L.hairless ? '#d9857a' : '#e8899a';
    ctx.fillStyle = noseCol; ctx.beginPath(); ctx.moveTo(-5, 9); ctx.lineTo(5, 9); ctx.lineTo(0, 15); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = LN; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(0, 19); ctx.stroke();
    ctx.fillStyle = '#7a2330'; ctx.beginPath(); ctx.ellipse(0, 24, 5.5, 3.6 + Math.abs(sob) * 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e0607a'; ctx.beginPath(); ctx.ellipse(0, 26 + Math.abs(sob), 3.2, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    // whiskers
    ctx.strokeStyle = dark ? 'rgba(235,235,235,0.8)' : 'rgba(60,40,40,0.55)'; ctx.lineWidth = 1.2;
    [-1, 1].forEach(sd => [-3, 1, 5].forEach(o => { ctx.beginPath(); ctx.moveTo(sd * 9, 17 + o * 0.5); ctx.quadraticCurveTo(sd * 24, 14 + o, sd * 38, 18 + o * 2.2); ctx.stroke(); }));
    // tears
    ctx.strokeStyle = 'rgba(110,185,255,0.9)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-15, 5); ctx.quadraticCurveTo(-19, 18, -17, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(15, 5); ctx.quadraticCurveTo(19, 18, 17, 30); ctx.stroke();
    ctx.fillStyle = 'rgba(110,185,255,0.95)';
    for (let i = 0; i < 2; i++) {
      const tt = (time * 1.3 + i * 0.5) % 1;
      [-1, 1].forEach(sd => { ctx.beginPath(); ctx.ellipse(sd * (17 + tt * 8), 30 + tt * 34, 2.6, 3.8, 0, 0, Math.PI * 2); ctx.fill(); });
    }
    // circus ruffle under the chin
    if (L.ruff) {
      for (let i = -4; i <= 4; i++) {
        ctx.fillStyle = darken(L.ruff, 0.35); ctx.beginPath(); ctx.ellipse(i * 6.4, 37.5 + Math.abs(i) * -0.6, 5.2, 4.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = i % 2 ? L.ruff : lighten(L.ruff, 0.45); ctx.beginPath(); ctx.ellipse(i * 6.4, 37 + Math.abs(i) * -0.6, 4.4, 3.8, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(0, 37, 3.4, 0, Math.PI * 2); ctx.fill();
    }
    // smoke
    ctx.strokeStyle = 'rgba(120,120,120,0.55)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const sx = -12 + i * 12, sy = -Hh - 18 - ((time * 22 + i * 9) % 22);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 5, sy - 5, sx, sy - 10); ctx.stroke();
    }
    ctx.restore();
  }
  // Game Over portrait: the breed's own picture if set in breeds.js, otherwise the drawn face
  function drawPortrait(b, x, y, w, h) {
    const im = breedImage(b);
    if (im) {
      const s = Math.min(w / im.naturalWidth, h / im.naturalHeight);
      const iw = im.naturalWidth * s, ih = im.naturalHeight * s;
      ctx.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2 + Math.sin(time * 9) * 1.5, iw, ih);
    } else drawCryFace(b, x + w / 2, y + h * 0.52, Math.min(w, h) / 140);
  }

  // ---------- Drawing: UI ----------
  const FONT = '"Arial Rounded MT Bold", "Trebuchet MS", "Segoe UI", Roboto, sans-serif';
  function text(str, x, y, size, col = '#fff', align = 'center', stroke = '#3a0712') {
    ctx.font = `900 ${size}px ${FONT}`;
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = stroke;
    ctx.strokeText(str, x, y); ctx.fillStyle = col; ctx.fillText(str, x, y);
  }
  function rrect(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function coinIcon(x, y, r = 10) {
    ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.arc(x, y + 1.5, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e0a800'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, Math.PI * 2); ctx.stroke();
  }
  function coinLabel(x, y, n, size = 22, align = 'left') {
    ctx.font = `900 ${size}px ${FONT}`;
    const w = ctx.measureText(String(n)).width + size * 1.2;
    const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    coinIcon(x0 + size * 0.45, y, size * 0.45);
    text(String(n), x0 + size * 1.05, y, size, '#ffe38a', 'left');
  }
  function button(label, x, y, w, h, on, opts = {}) {
    const disabled = !!opts.disabled;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; rrect(x, y + 4, w, h, h / 2); ctx.fill();
    ctx.fillStyle = disabled ? '#6b5a5e' : (opts.color || '#e8b93a'); rrect(x, y, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = disabled ? '#4d3e42' : '#fff3c4'; ctx.lineWidth = 2.5; rrect(x, y, w, h, h / 2); ctx.stroke();
    text(label, x + w / 2 + (opts.coin ? 12 : 0), y + h / 2 + 1, opts.size || 18, disabled ? '#d9cfd1' : '#3a0712', 'center', disabled ? '#4d3e42' : '#fff3c4');
    if (opts.coin) { ctx.font = `900 ${opts.size || 18}px ${FONT}`; coinIcon(x + w / 2 - ctx.measureText(label).width / 2 - 2, y + h / 2, 9); }
    btn(x, y, w, h, () => { click(); on(); });
  }
  function roundIcon(x, y, draw, on) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; draw();
    btn(x - 24, y - 24, 48, 48, on);
  }
  function drawToggles() {
    const sx = viewW - 36, mx = viewW - 88, y = T() + 34;
    roundIcon(sx, y, () => {
      ctx.beginPath(); ctx.moveTo(sx - 10, y - 5); ctx.lineTo(sx - 4, y - 5); ctx.lineTo(sx + 3, y - 11); ctx.lineTo(sx + 3, y + 11); ctx.lineTo(sx - 4, y + 5); ctx.lineTo(sx - 10, y + 5); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 2.5;
      if (!sfxOn) { ctx.beginPath(); ctx.moveTo(sx + 7, y - 6); ctx.lineTo(sx + 14, y + 6); ctx.moveTo(sx + 14, y - 6); ctx.lineTo(sx + 7, y + 6); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(sx + 4, y, 8, -0.8, 0.8); ctx.stroke(); }
    }, () => { sfxOn = !sfxOn; store.set('pfj_muted', sfxOn ? '0' : '1'); });
    roundIcon(mx, y, () => {
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(mx - 6, y + 7, 5, 4, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(mx + 7, y + 4, 5, 4, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(mx - 2, y + 7); ctx.lineTo(mx - 2, y - 10); ctx.lineTo(mx + 11, y - 13); ctx.lineTo(mx + 11, y + 4); ctx.stroke();
      if (!musicOn) { ctx.strokeStyle = '#ff6a4d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx - 13, y - 13); ctx.lineTo(mx + 13, y + 13); ctx.stroke(); }
    }, () => {
      musicOn = !musicOn; store.set('cd_music', musicOn ? '1' : '0');
      if (actx) musicBus.gain.setTargetAtTime(musicOn && musicActive ? MUSIC_VOL : 0, actx.currentTime, 0.05);
      if (musicOn && actx && state !== 'dying' && state !== 'over') startMusic();
    });
  }
  function panel(w, h, y) {
    const x = viewW / 2 - w / 2; y = y === undefined ? MID() - h / 2 - 20 : y;
    ctx.fillStyle = 'rgba(40,5,15,0.82)'; ctx.strokeStyle = '#e8b93a'; ctx.lineWidth = 4;
    rrect(x, y, w, h, 22); ctx.fill(); ctx.stroke();
    return { x, y };
  }

  function drawShop() {
    const top = T(), m = MID();
    ctx.fillStyle = 'rgba(30,4,12,0.55)'; ctx.fillRect(0, top, viewW, viewH);
    const cx = viewW / 2, b = BREEDS[shopIdx];
    const isOwned = owned.includes(b.id), inUse = selectedId === b.id;
    button('BACK', 16, top + 16, 96, 40, () => { state = 'title'; }, { size: 16 });
    text('CAT SHOP', cx, top + 110, 44, '#ffb000');
    coinLabel(cx, top + 158, coins, 26, 'center');
    // stage
    const sy = m + 30;   // dog's feet
    ctx.fillStyle = 'rgba(255,220,150,0.10)'; ctx.beginPath(); ctx.ellipse(cx, sy, 170, 26, 0, 0, Math.PI * 2); ctx.fill();
    const lg = ctx.createRadialGradient(cx, sy - 70, 10, cx, sy - 70, 190);
    lg.addColorStop(0, 'rgba(255,245,200,0.22)'); lg.addColorStop(1, 'rgba(255,245,200,0)');
    ctx.fillStyle = lg; ctx.fillRect(cx - 200, sy - 260, 400, 290);
    if (shopCryT > 0) {
      drawPortrait(b, cx - 90, sy - 200, 180, 195);
    } else {
      ctx.save(); ctx.translate(cx - 22, sy); ctx.scale(2.4, 2.4);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(6, 2, 30, 5, 0, 0, Math.PI * 2); ctx.fill();
      drawCat(b, 0, 0, 'run');
      ctx.restore();
      if (!isOwned) { // lock badge
        const lx = cx + 100, ly = sy - 170;
        ctx.fillStyle = 'rgba(30,4,12,0.8)'; ctx.beginPath(); ctx.arc(lx, ly, 20, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffe38a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(lx, ly - 4, 7, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#ffe38a'; rrect(lx - 10, ly - 4, 20, 14, 3); ctx.fill();
      }
    }
    // arrows
    const ay = sy - 80;
    const arrow = (x, dir) => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(x, ay, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe38a'; ctx.beginPath(); ctx.moveTo(x + dir * 10, ay); ctx.lineTo(x - dir * 7, ay - 12); ctx.lineTo(x - dir * 7, ay + 12); ctx.closePath(); ctx.fill();
      btn(x - 32, ay - 32, 64, 64, () => { click(); shopIdx = (shopIdx + dir + BREEDS.length) % BREEDS.length; shopCryT = 0; });
    };
    arrow(40, -1); arrow(viewW - 40, 1);
    if (b.look && b.look.wild) text('BIG & WILD CATS', cx, sy + 18, 15, '#ffb000');
    // name + status
    ctx.font = `900 34px ${FONT}`;
    text(b.name, cx, sy + 50, Math.min(34, Math.floor(34 * 440 / ctx.measureText(b.name).width)), '#fff');
    const status = inUse ? 'IN USE' : isOwned ? 'OWNED' : null;
    if (status) text(status + '   ' + (shopIdx + 1) + ' / ' + BREEDS.length, cx, sy + 84, 17, '#ffe9c7');
    else { coinLabel(cx - 30, sy + 84, b.price, 19, 'center'); text((shopIdx + 1) + ' / ' + BREEDS.length, cx + 50, sy + 84, 17, '#ffe9c7'); }
    // action buttons
    const mw = 314, my = sy + 124;
    if (inUse) button('IN USE', cx - mw / 2, my, mw, 52, () => {}, { disabled: true, size: 20 });
    else if (isOwned) button('USE THIS CAT', cx - mw / 2, my, mw, 52, shopAction, { color: '#7fd67a', size: 20 });
    else button('BUY ' + b.price, cx - mw / 2, my, mw, 52, shopAction, { disabled: coins < b.price, coin: true, size: 20 });
    if (shopMsgT > 0) { ctx.globalAlpha = Math.min(1, shopMsgT * 2); text(shopMsg, cx, top + 196, 19, '#fff3a0'); ctx.globalAlpha = 1; }
  }


  // ---------- Share score ----------
  const STORE_URL = 'https://play.google.com/store/apps/details?id=com.alxmobileapps.circuscats';
  const PRIVACY_URL = 'https://claude.ai/artifact/4NgoZrMkf1qK1CW7EESm7C';
  function shareText() {
    const cat = curBreed().name;
    if (score <= 0) return '🐱🔥 I just played Circus Cats! Can you jump through the rings of fire?';
    if (newBest) return '🏆 NEW HIGH SCORE! I scored ' + score + ' in Circus Cats! My ' + cat + ' jumped through ' + score + ' rings of fire 🔥🐱 Can you beat me?';
    return '🐱🔥 I scored ' + score + ' in Circus Cats with my ' + cat + '! Can you beat my score?';
  }
  const CapNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  function capPlugin(name) {
    const C = window.Capacitor; if (!C) return null;
    const reg = (window.capacitorExports && window.capacitorExports.registerPlugin) || C.registerPlugin;
    return (C.Plugins && C.Plugins[name]) || (reg ? reg(name) : null);
  }
  function openLink(url) {
    if (CapNative()) { window.location.href = url; return; }   // Capacitor hands external links to the phone
    const w = window.open(url, '_blank', 'noopener');
    if (!w) window.location.href = url;
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) { return false; }
  }
  const APP_PKGS = {
    facebook: ['com.facebook.katana', 'com.facebook.lite'],
    whatsapp: ['com.whatsapp', 'com.whatsapp.w4b'],
    x: ['com.twitter.android'],
    instagram: ['com.instagram.android'],
    tiktok: ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill']
  };
  // One "Share your score" button: the phone's share menu opens with Facebook, TikTok, X,
  // Instagram and WhatsApp first, followed by everything else.
  async function shareScore() {
    if (CapNative()) {
      const P = capPlugin('AppShare'), FS = capPlugin('Filesystem');
      if (P && FS) {
        try {
          const w = await FS.writeFile({ path: 'circus-cats-score.png', data: shareImage().split(',')[1], directory: 'CACHE' });
          await P.chooser({ packages: [].concat(APP_PKGS.facebook, APP_PKGS.tiktok, APP_PKGS.x, APP_PKGS.instagram, APP_PKGS.whatsapp),
                            text: shareText() + ' ' + STORE_URL, path: w.uri, title: 'Share your score' });
          return;
        } catch (e) { /* fall back to the plain share menu */ }
      }
    }
    return shareMore();
  }
  // Square picture of the score card, for the phone's share menu
  function shareImage() {
    const S = 1080, off = document.createElement('canvas'); off.width = off.height = S;
    const saved = ctx; ctx = off.getContext('2d');
    try {
      ctx.fillStyle = '#f3e3c3'; ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = '#b3122e'; for (let x = 0; x < S; x += 144) ctx.fillRect(x, 0, 72, S);
      const g = ctx.createLinearGradient(0, 0, 0, S); g.addColorStop(0, 'rgba(40,0,10,0.75)'); g.addColorStop(0.5, 'rgba(40,0,10,0.2)'); g.addColorStop(1, 'rgba(40,0,10,0.7)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = '#c98f4c'; ctx.fillRect(0, 800, S, 280);
      text('CIRCUS CATS', S / 2, 120, 110, '#ffb000');
      text(newBest ? 'NEW HIGH SCORE!' : 'I scored', S / 2, 260, 64, newBest ? '#ffe38a' : '#fff');
      text(String(score), S / 2, 400, 200, '#fff');
      ctx.save(); ctx.translate(S / 2 - 60, 800); ctx.scale(4.6, 4.6);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(6, 2, 30, 5, 0, 0, Math.PI * 2); ctx.fill();
      drawCat(curBreed(), 0, 0, 'run'); ctx.restore();
      text('Can you beat me?', S / 2, 900, 60, '#fff');
      text('Get it on Google Play', S / 2, 990, 44, '#ffe38a');
    } finally { ctx = saved; }
    return off.toDataURL('image/png');
  }
  async function shareMore() {
    const text = shareText();
    if (CapNative()) {
      const Share = capPlugin('Share'), FS = capPlugin('Filesystem');
      try {
        let files;
        try {
          const w = await FS.writeFile({ path: 'circus-cats-score.png', data: shareImage().split(',')[1], directory: 'CACHE' });
          files = [w.uri];
        } catch (e) { files = undefined; }
        await Share.share({ title: 'Circus Cats', text: text + ' ' + STORE_URL, files, dialogTitle: 'Share your score' });
        return;
      } catch (e) {
        try { await Share.share({ title: 'Circus Cats', text: text + ' ' + STORE_URL, dialogTitle: 'Share your score' }); return; } catch (e2) { /* fall through */ }
      }
    }
    if (navigator.share) { try { await navigator.share({ title: 'Circus Cats', text, url: STORE_URL }); return; } catch (e) { /* cancelled */ } }
    try { await navigator.clipboard.writeText(text + ' ' + STORE_URL); flashOver('Copied! Paste it anywhere.'); } catch (e) { flashOver('Sharing is not available here'); }
  }
  let overMsg = '', overMsgT = 0;
  function flashOver(m) { overMsg = m; overMsgT = 2.5; }

  function render() {
    buttons = [];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2a0a12'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, offY * scale);
    drawBackground();
    const b = curBreed();

    if (state === 'shop') {
      drawShop();
    } else {
      for (const r of rings) drawRingBack(r);
      const sh = Math.max(0.3, 1 - (GY - dog.y) / 220);
      ctx.fillStyle = `rgba(60,25,5,${0.35 * sh})`;
      ctx.beginPath(); ctx.ellipse(dog.x + 6, GY + 3, 30 * sh, 6 * sh, 0, 0, Math.PI * 2); ctx.fill();
      let mode = 'idle';
      if (state === 'play' || state === 'paused') mode = dog.air ? 'jump' : 'run';
      else if (state === 'dying' || state === 'over') mode = 'cry';
      if (state === 'title') { dog.x = dogX(); dog.y = GY; mode = 'run'; }
      for (const bl of balls) drawBall(bl);
      drawCat(b, dog.x, dog.y, mode, dog.vy);
      for (const r of rings) drawRingFront(r);
    }

    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.c;
      if (p.star) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(time * 6); ctx.fillRect(-p.r, -p.r / 3, p.r * 2, p.r * 0.66); ctx.fillRect(-p.r / 3, -p.r, p.r * 0.66, p.r * 2); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = TEAR;
    for (const t of tears) { ctx.beginPath(); ctx.ellipse(t.x, t.y, 2.2, 3.2, 0, 0, Math.PI * 2); ctx.fill(); }
    for (const p of popups) { ctx.globalAlpha = 1 - p.t / 0.8; text(p.txt, p.x, p.y, 26, '#fff3a0'); }
    ctx.globalAlpha = 1;

    if (state === 'play' || state === 'paused' || state === 'dying') {
      coinLabel(22, T() + 34, coins, 20);
      text(String(score), viewW / 2, T() + 130, 64);
      text('BEST ' + best, viewW / 2, T() + 180, 20, '#ffe38a');
    }

    if (state === 'title') {
      const top = T(), ty = Math.max(top + 170, GY - 470);
      coinLabel(22, top + 34, coins, 22);
      if (best > 0) text('BEST ' + best, 22, top + 66, 18, '#ffe38a', 'left');
      const pulse = 1 + Math.sin(time * 3) * 0.04;
      ctx.save(); ctx.translate(viewW / 2, ty); ctx.scale(pulse, pulse);
      text('CIRCUS', 0, -36, 76, '#fff');
      text('CATS', 0, 38, 72, '#ffb000');
      ctx.restore();
      text('Quick tap = small hop.', viewW / 2, ty + 110, 22, '#ffe9c7');
      text('Hold = big jump.', viewW / 2, ty + 140, 22, '#ffe9c7');
      text("Jump through the rings. Don't touch the flames!", viewW / 2, ty + 172, 18, '#ffe9c7');
      if (Math.floor(time * 2) % 2 === 0) text('TAP TO START', viewW / 2, ty + 230, 34, '#fff');
      button('CAT SHOP', viewW / 2 - 100, ty + 274, 200, 52, openShop, { size: 22 });
      // privacy policy link (required by Google Play), top row next to the sound controls
      const px = viewW - 88 - 32, py = T() + 34;
      text('Privacy Policy', px, py, 11, '#ffe9c7', 'right');
      ctx.strokeStyle = '#ffe9c7'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px - 66, py + 9); ctx.lineTo(px, py + 9); ctx.stroke();
      btn(px - 72, py - 20, 76, 40, () => openLink(PRIVACY_URL));
    }
    if (state === 'paused') {
      panel(320, 120);
      text('PAUSED', viewW / 2, MID() - 50, 40);
      text('Tap to continue', viewW / 2, MID() - 2, 22, '#ffe9c7');
    }
    if (state === 'over') {
      const k = Math.min(1, overT / 0.35), e = 1 - Math.pow(1 - k, 3);
      const pc = MID() - 60;
      ctx.save(); ctx.translate(viewW / 2, pc); ctx.scale(0.7 + 0.3 * e, 0.7 + 0.3 * e); ctx.translate(-viewW / 2, -pc);
      ctx.globalAlpha = e;
      const p = panel(480, 316, pc - 150);
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; rrect(p.x + 12, p.y + 12, 170, 226, 16); ctx.fill();
      drawPortrait(b, p.x + 16, p.y + 24, 162, 200);
      const cx = p.x + 332;
      text('GAME OVER', cx, p.y + 40, 38, '#ff6a4d');
      text('Score  ' + score, cx, p.y + 90, 28);
      text((newBest ? 'NEW BEST! ' : 'Best  ') + best, cx, p.y + 124, 20, '#ffe38a');
      coinLabel(cx, p.y + 154, '+' + runCoins, 20, 'center');
      ctx.restore();
      if (overT > 0.8) {
        button('TRY AGAIN', cx - 136, p.y + 184, 140, 44, startRun, { size: 17, color: '#7fd67a' });
        button('SHOP', cx + 14, p.y + 184, 110, 44, openShop, { size: 17 });
        button('SHARE YOUR SCORE', viewW / 2 - 150, p.y + 254, 300, 46, shareScore, { size: 18, color: '#6f9cf0' });
        if (overMsgT > 0) text(overMsg, viewW / 2, p.y + 330, 16, '#fff3a0');
      }
    }
    drawToggles();
  }

  // ---------- Main loop ----------
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - lastT) / 1000); lastT = now;
    for (let i = 0; i < 2; i++) update(dt / 2);   // sub-steps for accurate collisions
    render();
    requestAnimationFrame(frame);
  }
  reset(); rings = [];
  requestAnimationFrame(frame);

  // test hook (harmless in production)
  window.__pfj = {
    get state() { return state; }, get time() { return time; }, get speed() { return speed; }, get lastHit() { return lastHit; }, get score() { return score; }, set score(v) { score = v; speed = speedFor(v); },
    get rings() { return rings; }, get balls() { return balls; }, get coins() { return coins; }, set coins(v) { coins = v; }, get buttons() { return buttons; },
    get shopIdx() { return shopIdx; }, get hit() { return hitOffsets(curBreed()); }, select: id => { if (!owned.includes(id)) owned.push(id); selectedId = id; }, set shopIdx(v) { shopIdx = v; }, dog, press: () => onPress(-1, -1), release,
    tap: (x, y) => onPress(x * scale, (y + offY) * scale), openShop, shareImage: () => shareImage(), cryPreview: () => { shopCryT = 99; }, setTime: v => { time = v; }, voice: id => { ensureAudio(); meow(breedById(id)); cry(breedById(id)); }
  };
})();
