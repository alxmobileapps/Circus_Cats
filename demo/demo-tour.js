/* DEMO TOUR - only for the App Review screen recording (never in the store build).
 * The "Demo video" workflow adds this file to a throwaway copy of www/ and records the
 * iPhone Simulator: title screen -> a real run (auto-jumping) -> crash into the fire ->
 * Game Over -> Cat Shop (browse, buy a cat) -> play again with the new cat. */
(function () {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const log = m => { try { console.log('DemoTour: ' + m); } catch (e) {} };
  const waitFor = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(50); } return false; };

  // Fresh install look: no saved progress (the coins for buying a cat are added once the game is up)
  try { localStorage.clear(); } catch (e) {}

  let auto = false, holdFor = -1;
  // Aims each jump so its highest point is in the middle of the ring, using the game's physics
  // (jump speed 900, gravity 2400, letting go cuts the upward speed to 200).
  function autopilot() {
    const g = window.__pfj;
    // let go after the planned hold, measured in GAME time (the cat's own jump clock), so a slow
    // simulator frame rate cannot make the jumps too high
    if (g && holdFor >= 0 && (!g.dog.air || g.dog.jt >= holdFor)) { g.release(); holdFor = -1; }
    if (auto && g && g.state === 'play' && !g.dog.air && holdFor < 0) {
      const d = g.dog, o = g.hit, rr = [14, 10];
      const top = Math.min(o[0][1] - rr[0], o[1][1] - rr[1]), bot = Math.max(o[0][1] + rr[0], o[1][1] + rr[1]);
      const midY = (top + bot) / 2, midX = (o[0][0] + o[1][0]) / 2;
      const r = g.rings.filter(r => r.x > d.x + midX - 5).sort((a, b) => a.x - b.x)[0];
      if (r) {
        const GY = 385, A = Math.max(20, (GY - r.cy) + midY);          // feet height at the apex
        const disc = 810000 - 4800 * (A - 8.33);
        const th = disc > 0 ? Math.min(0.29, (900 - Math.sqrt(disc)) / 2400) : 0.29;
        const ta = th + (900 - 2400 * th > 200 ? 200 / 2400 : (900 - 2400 * th) / 2400);
        if (r.x - (d.x + midX) <= g.speed * ta) {
          g.press(); holdFor = th;
        }
      }
    }
    requestAnimationFrame(autopilot);
  }

  // Taps a button by its index among the buttons drawn this frame, matched by a test.
  async function tapButton(pick, label) {
    const g = window.__pfj;
    await sleep(100);
    const b = pick(g.buttons.slice());
    if (!b) { log('button not found: ' + label); return false; }
    b.on(); log('tap ' + label); return true;
  }

  const T0 = Date.now();
  async function run() {
    if (!(await waitFor(() => window.__pfj && window.__pfj.state === 'title', 15000))) { log('game not ready'); return; }
    const g = window.__pfj;
    g.coins = 240;                                      // enough to show buying a cat in the shop
    requestAnimationFrame(autopilot);
    await sleep(3500);                                  // title screen

    // 1) Play a run: tap to start, auto-jump through rings for a while
    log('start run'); auto = true; g.press(); setTimeout(() => g.release(), 90);
    await waitFor(() => g.score >= 9 || g.state !== 'play', 32000);
    log('score ' + g.score + ', stop jumping');
    auto = false;                                       // 2) the cat runs into the next ring of fire
    await waitFor(() => g.state === 'over', 12000);
    await sleep(3500);                                  // Game Over card

    // 3) Cat Shop: open it, browse a few cats, buy one
    g.openShop(); log('shop');
    await sleep(2200);
    for (const i of [1, 2, 3, 2, 1]) { g.shopIdx = i; await sleep(1100); }
    // BUY button = widest button in the lower half of the shop screen
    await tapButton(bs => bs.filter(b => b.w > 150).sort((a, b) => b.y - a.y)[0], 'buy/use');
    await sleep(2200);
    await tapButton(bs => bs.filter(b => b.w === 96 && b.h === 40).sort((a, b) => a.y - b.y)[0], 'back');
    await sleep(2000);

    // 4) Play again with the new cat, keep playing until ~80 s after launch (retry if a run ends early)
    let runs = 0;
    while (Date.now() - T0 < 78000) {
      runs++; log('run ' + runs);
      if (g.state === 'over') { await waitFor(() => false, 900); }
      auto = true; g.press(); setTimeout(() => g.release(), 90);
      await waitFor(() => g.state !== 'play' || g.score >= 10, 30000);
      log('run ' + runs + ' score ' + g.score);
      auto = false;
      await waitFor(() => g.state === 'over', 12000);
      await sleep(3000);                                // Game Over card
    }
    log('done');
  }
  if (document.readyState === 'complete') run(); else window.addEventListener('load', run);
})();
