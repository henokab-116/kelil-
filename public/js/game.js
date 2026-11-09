(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const screen = $('gameScreen');
  if (!screen) return;
  screen.innerHTML = `<div class="card border-0 shadow-sm rounded-4 p-3 text-center">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="fw-bold text-primary m-0">🛺 አድርሰኝ <small class="text-secondary">· ሀዋሳ</small></h6>
      <button id="gameView" class="btn btn-sm btn-outline-primary rounded-pill fw-semibold">🔭 Top</button>
    </div>
    <div class="d-flex justify-content-between align-items-center fw-bold small">
      <span>💰 <span id="gameScore">0</span> ETB</span><span id="gameLevel" class="badge text-bg-success">EASY</span><span id="gLives">❤️❤️❤️</span>
    </div>
    <div class="my-2"><div class="d-flex justify-content-between small fw-semibold"><span id="gDest">🙋 ተሳፋሪ ፈልግ</span><span id="gTime"></span></div>
      <div class="progress" style="height:10px"><div id="gBar" class="progress-bar bg-success" style="width:0%"></div></div></div>
    <canvas id="gameCanvas" width="300" height="400" class="rounded-3 mx-auto" style="max-width:100%;touch-action:none"></canvas>
    <div id="gameMsg" class="small text-secondary my-2">▶ Start — ተሳፋሪውን አንሱ፣ ወደ መዳረሻው በጊዜ አድርሱ!</div>
    <div class="d-flex gap-2 mb-2"><button id="gameLeft" class="btn btn-primary flex-fill">⬅</button><button id="gameRight" class="btn btn-primary flex-fill">➡</button></div>
    <div class="d-flex gap-2"><button id="gameStart" class="btn btn-success flex-fill">▶ Start</button><button id="gamePause" class="btn btn-warning flex-fill">⏸ Pause</button></div>
    <div class="small text-secondary mt-2">Best: <span id="gameBest">0</span> ETB</div></div>`;

  const cv = $('gameCanvas'), ctx = cv.getContext('2d');
  const W = 300, H = 400, LX = [70, 150, 230], PY = H - 84, HOR = 120;
  // Hawassa places
  const PLACES = ['ታቦር', 'ፒያሳ', 'መናኸሪያ', 'አሞራ ገደል', 'ሀዋሳ ዩኒቨርሲቲ', 'ሀዋሳ ሐይቅ', 'ሃይሌ ሪዞርት', 'ዓሣ ገበያ', 'ቱላ', 'ባህል አዳራሽ', 'ሪፈራል ሆስፒታል'];
  // Passengers: e=emoji, n=name, to=destinations, s=what they say, t=time factor (lower = more rush), f=fare factor, em=emergency, care=crash costs extra time
  const PAX = [
    { e: '🙋', n: 'ተሳፋሪ', s: 'ቸኩያለሁ!', t: 1, f: 1 },
    { e: '👧🎒', n: 'ተማሪ', to: ['ሀዋሳ ዩኒቨርሲቲ', 'ትምህርት ቤት'], s: 'ትምህርት አርፍጃለሁ!', t: 0.85, f: 1.1 },
    { e: '🤰', n: 'ነፍሰ ጡር', to: ['ሪፈራል ሆስፒታል'], s: 'ምጥ ጀምሮኛል!', t: 0.7, f: 1.7, em: 1, care: 1 },
    { e: '🤒', n: 'ታማሚ', to: ['ሪፈራል ሆስፒታል', 'ጤና ጣቢያ'], s: 'በጣም ታምሜያለሁ!', t: 0.75, f: 1.6, em: 1, care: 1 },
    { e: '👩👶', n: 'እናት ከሕፃን ጋር', to: ['ጤና ጣቢያ', 'ታቦር', 'ዓሣ ገበያ'], s: 'በቀስታ ይንዱ!', t: 1.1, f: 1.2, care: 1 },
    { e: '👴', n: 'አዛውንት', s: 'በቀስታ ልጄ!', t: 1.4, f: 1.2, care: 1 },
    { e: '💼', n: 'ነጋዴ', to: ['መናኸሪያ', 'ዓሣ ገበያ', 'ታቦር'], s: 'ስብሰባ አርፍዷል!', t: 0.7, f: 1.5 },
    { e: '🧳', n: 'ቱሪስት', to: ['ሀዋሳ ሐይቅ', 'ሃይሌ ሪዞርት', 'አሞራ ገደል'], s: 'Take me there!', t: 1.2, f: 1.4 },
    { e: '👰', n: 'ሙሽራ', to: ['ባህል አዳራሽ'], s: 'ሰርጌ ሊጀምር ነው!', t: 0.8, f: 1.5 }
  ];
  const VIEWS = ['🔭 Top', '🔍 Close', '🚗 Inside'];
  let raf = 0, g = {}, best = 0, view = 0, last = null;
  try { best = Number(localStorage.getItem('tp_best')) || 0; } catch { /* storage blocked */ }
  $('gameBest').textContent = best;

  const fresh = () => ({ run: false, lane: 1, px: LX[1], obs: [], pax: null, c: PAX[0], carry: false, dest: '', prog: 0, left: 0, earn: 0, trips: 0, lives: 3, paused: false, inv: 0, f: 0, gap: 40, wait: 40, off: 0 });
  g = fresh();
  const spd = () => 3.2 + Math.min(g.trips * 0.35, 3.4);
  const say = (m) => { $('gameMsg').textContent = m; };
  const pick = (a) => a[Math.random() * a.length | 0];

  // ---------- drawing helpers ----------
  const rr = (x, y, w, h, r, c) => { ctx.fillStyle = c; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fill(); };
  function lada(x, y, c) {           // top view: blue Lada, white roof
    ctx.fillStyle = '#111';
    [[-21, 8], [17, 8], [-21, 44], [17, 44]].forEach(([dx, dy]) => ctx.fillRect(x + dx, y + dy, 4, 14));
    rr(x - 19, y, 38, 66, 8, c); rr(x - 15, y + 17, 30, 28, 5, '#f5f5f5');
    rr(x - 14, y + 9, 28, 8, 2, '#26333f'); rr(x - 14, y + 46, 28, 7, 2, '#26333f');
    ctx.fillStyle = '#e02020'; ctx.fillRect(x - 17, y + 61, 7, 4); ctx.fillRect(x + 10, y + 61, 7, 4);
  }
  function bajaj(x, y, mine) {       // top view: blue three-wheeler, white canopy
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 3, y - 2, 6, 10); ctx.fillRect(x - 19, y + 34, 5, 14); ctx.fillRect(x + 14, y + 34, 5, 14);
    rr(x - 14, y + 4, 28, 48, 9, '#1a8fe3'); rr(x - 13, y + 17, 26, 34, 5, '#fafafa'); rr(x - 10, y + 8, 20, 6, 2, '#26333f');
    ctx.fillStyle = '#ffe066'; ctx.fillRect(x - 3, y + 1, 6, 3);
    if (mine) { ctx.fillStyle = '#ffc107'; ctx.fillRect(x - 6, y + 20, 12, 4); }
    if (mine && g.carry) { ctx.fillStyle = g.c.em ? '#ff3b30' : '#f4a261'; ctx.beginPath(); ctx.arc(x, y + 36, 6, 0, 7); ctx.fill(); }
  }
  function topScene() {
    ctx.fillStyle = '#3b7a3b'; ctx.fillRect(-300, -300, 900, 1000);
    ctx.fillStyle = '#4a4f57'; ctx.fillRect(28, -300, 244, 1000);
    ctx.fillStyle = '#d9d9d9'; ctx.fillRect(24, -300, 4, 1000); ctx.fillRect(272, -300, 4, 1000);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (let y = -80 + g.off; y < H + 80; y += 40) { ctx.fillRect(108, y, 3, 20); ctx.fillRect(189, y, 3, 20); }
    ctx.textAlign = 'center';
    if (g.carry && g.prog > 90) { ctx.font = '30px serif'; ctx.fillText('🏁', 150, 100); }
    g.obs.forEach((o) => (o.k ? bajaj(LX[o.l], o.y, false) : lada(LX[o.l], o.y, o.c)));
    if (g.pax) {
      const p = g.pax, x = LX[p.l];
      ctx.strokeStyle = p.c.em ? '#ff3b30' : '#ffc107'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, p.y, 20 + (g.f % 20) / 4, 0, 7); ctx.stroke();
      ctx.font = '28px serif'; ctx.fillText(p.c.e, x, p.y + 10);
    }
    if (!(g.inv > 0 && g.f % 8 < 4)) bajaj(g.px, PY, true);
  }

  // ---------- inside view: driver's seat, perspective road ----------
  const persp = (d) => 120 / (Math.max(d, 1) + 120);            // scale for distance d ahead of the car
  const SX = (wx, s) => 150 + (wx - g.px) * s * 1.5;
  const SY = (s) => HOR + (H - HOR) * s;
  function rear(x, y, s, o) {                                     // rear of a vehicle, anchored at ground point (x,y)
    const k = s * 1.5;
    ctx.fillStyle = '#111';
    if (o.k) {                                                    // Bajaj rear
      const w = 28 * k, h = 36 * k;
      ctx.fillRect(x - w / 2 - 2 * k, y - 12 * k, 5 * k, 12 * k); ctx.fillRect(x + w / 2 - 3 * k, y - 12 * k, 5 * k, 12 * k);
      rr(x - w / 2, y - h * 0.5, w, h * 0.42, 3 * k, '#1a8fe3'); rr(x - w / 2, y - h, w, h * 0.55, 4 * k, '#fafafa');
      rr(x - w * 0.36, y - h * 0.9, w * 0.72, h * 0.22, 2 * k, '#26333f');
      ctx.fillStyle = '#e02020'; ctx.fillRect(x - w / 2 + k, y - h * 0.42, 4 * k, 3 * k); ctx.fillRect(x + w / 2 - 5 * k, y - h * 0.42, 4 * k, 3 * k);
    } else {                                                      // Lada rear
      const w = 38 * k, h = 32 * k;
      ctx.fillRect(x - w / 2 + 2 * k, y - 6 * k, 7 * k, 6 * k); ctx.fillRect(x + w / 2 - 9 * k, y - 6 * k, 7 * k, 6 * k);
      rr(x - w / 2, y - h * 0.62, w, h * 0.56, 4 * k, o.c);
      rr(x - w * 0.42, y - h, w * 0.84, h * 0.42, 4 * k, '#f5f5f5'); rr(x - w * 0.36, y - h * 0.94, w * 0.72, h * 0.3, 3 * k, '#26333f');
      ctx.fillStyle = '#e02020'; ctx.fillRect(x - w / 2 + k, y - h * 0.55, 8 * k, 5 * k); ctx.fillRect(x + w / 2 - 9 * k, y - h * 0.55, 8 * k, 5 * k);
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 5 * k, y - h * 0.3, 10 * k, 4 * k);
    }
  }
  function inside() {
    ctx.fillStyle = '#9ad0f0'; ctx.fillRect(0, 0, W, HOR);
    ctx.fillStyle = '#3b7a3b'; ctx.fillRect(0, HOR, W, H - HOR);
    ctx.fillStyle = '#4a4f57'; ctx.beginPath();
    ctx.moveTo(SX(28, 0), HOR); ctx.lineTo(SX(272, 0), HOR); ctx.lineTo(SX(272, 1), H); ctx.lineTo(SX(28, 1), H); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (let y = -80 + g.off; y < H + 80; y += 40) {
      const d1 = PY + 30 - y, d2 = d1 - 20; if (d2 < 2 || d1 > 700) continue;
      const s1 = persp(d1), s2 = persp(d2);
      [108, 189].forEach((x) => { ctx.beginPath(); ctx.moveTo(SX(x - 1.5, s1), SY(s1)); ctx.lineTo(SX(x + 1.5, s1), SY(s1)); ctx.lineTo(SX(x + 1.5, s2), SY(s2)); ctx.lineTo(SX(x - 1.5, s2), SY(s2)); ctx.fill(); });
    }
    if (g.carry && g.prog > 90) { ctx.font = (16 + (g.prog - 90) * 3) + 'px serif'; ctx.textAlign = 'center'; ctx.fillText('🏁', 150, HOR + 8); }
    const list = g.obs.map((o) => ({ o, d: PY + 30 - o.y, p: 0 })).concat(g.pax ? [{ o: g.pax, d: PY + 30 - g.pax.y, p: 1 }] : []).sort((a, b) => b.d - a.d);
    list.forEach(({ o, d, p }) => {
      if (d < 4) return;
      const s = persp(d), x = SX(LX[o.l], s), y = SY(s);
      ctx.globalAlpha = Math.max(0, Math.min(1, (s - 0.2) / 0.12));
      if (p) { ctx.font = (44 * s) + 'px serif'; ctx.textAlign = 'center'; ctx.fillText(o.c.e, x, y - 4 * s);
        ctx.strokeStyle = o.c.em ? '#ff3b30' : '#ffc107'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.ellipse(x, y, 26 * s, 8 * s, 0, 0, 7); ctx.stroke(); }
      else rear(x, y, s, o);
      ctx.globalAlpha = 1;
    });
    // bajaj cabin: roof, pillars, dashboard, handlebar grips, speedometer, rear-view mirror
    ctx.fillStyle = '#e9eef2'; ctx.fillRect(0, 0, W, 20);
    ctx.fillStyle = '#1b2530';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(28, 0); ctx.lineTo(10, H - 58); ctx.lineTo(0, H - 58); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W - 28, 0); ctx.lineTo(W - 10, H - 58); ctx.lineTo(W, H - 58); ctx.fill();
    ctx.fillRect(0, H - 58, W, 58);
    rr(8, H - 54, 22, 26, 8, '#000'); rr(W - 30, H - 54, 22, 26, 8, '#000');
    ctx.strokeStyle = '#5bd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(150, H - 20, 24, Math.PI, 0); ctx.stroke();
    const a = Math.PI + Math.min(1, (spd() - 3.2) / 3.4) * Math.PI;
    ctx.strokeStyle = '#ff5252'; ctx.beginPath(); ctx.moveTo(150, H - 20); ctx.lineTo(150 + 20 * Math.cos(a), H - 20 + 20 * Math.sin(a)); ctx.stroke();
    rr(105, 24, 90, 34, 6, '#2b3a4a'); rr(108, 27, 84, 28, 4, '#8fb8d8');
    if (g.carry) { ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.fillText(g.c.e, 150, 51); }
    if (g.inv > 70) { ctx.fillStyle = 'rgba(255,0,0,.3)'; ctx.fillRect(0, 0, W, H); }
  }
  function draw() {
    if (view === 2) return inside();
    ctx.save();
    if (view === 1) { ctx.translate(150, 350); ctx.scale(1.3, 1.3); ctx.translate(-150, -(PY + 26)); }   // closer camera, follows the car
    topScene();
    ctx.restore();
  }
  function hud() {
    $('gameScore').textContent = g.earn;
    $('gLives').textContent = '❤️'.repeat(Math.max(g.lives, 0)) || '💔';
    const lv = g.trips >= 7 ? ['HARD', 'text-bg-danger'] : g.trips >= 3 ? ['MEDIUM', 'text-bg-warning'] : ['EASY', 'text-bg-success'];
    $('gameLevel').textContent = lv[0]; $('gameLevel').className = 'badge ' + lv[1];
    $('gDest').textContent = g.carry ? `${g.c.e} ${g.c.n} → ${g.dest}` : '🙋 ተሳፋሪ ፈልግ';
    $('gTime').textContent = g.carry ? '⏱ ' + Math.max(0, Math.ceil(g.left / 60)) + 's' : '';
    $('gBar').style.width = (g.carry ? Math.min(100, g.prog) : 0) + '%';
  }
  function overlay() {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.font = 'bold 26px sans-serif'; ctx.fillText('⏸ ቆሟል', 150, 190);
    ctx.font = '16px sans-serif'; ctx.fillText('Paused — tap Resume', 150, 220);
  }
  function setView(v) {
    view = v === undefined ? (view + 1) % VIEWS.length : v;
    $('gameView').textContent = VIEWS[view];
    if (!g.run || g.paused) { draw(); if (g.paused) overlay(); }
  }

  // ---------- game logic ----------
  function pause(on) {
    if (!g.run) return;
    g.paused = on === undefined ? !g.paused : on;
    $('gamePause').textContent = g.paused ? '▶ Resume' : '⏸ Pause';
    if (g.paused) { cancelAnimationFrame(raf); draw(); overlay(); say('⏸ ቆሟል — Paused'); }
    else { say('▶ ቀጥሏል — Go!'); raf = requestAnimationFrame(tick); }
  }
  function end() {
    g.run = false; $('gamePause').textContent = '⏸ Pause'; draw(); hud();
    let m = `Game over! ገቢ: ${g.earn} ETB (${g.trips} trips)`;
    if (g.earn > best) { best = g.earn; $('gameBest').textContent = best; m += ' — 🏆 new best!'; try { localStorage.setItem('tp_best', String(best)); } catch { /* ignore */ } }
    say(m); $('gameStart').textContent = '↻ Play again';
  }
  function tick() {
    if (!g.run || g.paused) return;
    if (!screen.classList.contains('active')) return pause(true);   // leaving the Game tab pauses it
    const sp = spd(); g.f++; g.off = (g.off + sp) % 40; g.px += (LX[g.lane] - g.px) * 0.3; if (g.inv > 0) g.inv--;

    if (--g.gap <= 0) {                                   // traffic: Ladas + other Bajajs
      const free = [0, 1, 2].filter((l) => !(g.pax && g.pax.y < 160 && g.pax.l === l));
      g.obs.push({ l: pick(free), y: -70, k: Math.random() < 0.25 ? 1 : 0, c: Math.random() < 0.8 ? '#1f5fbf' : '#6b7280' });
      g.gap = Math.max(34, 80 - g.trips * 4) + (Math.random() * 20 | 0);
    }
    g.obs.forEach((o) => { o.y += sp; }); g.obs = g.obs.filter((o) => o.y < H + 20);

    if (!g.carry && !g.pax && --g.wait <= 0) {
      let c; do { c = pick(PAX); } while (c === last && PAX.length > 1);
      last = c; g.pax = { l: Math.random() * 3 | 0, y: -30, c };
      say(`${c.e} ${c.n} ይጠብቃል! Pick up!`);
    }
    if (g.pax) {
      g.pax.y += sp;
      if (Math.abs(LX[g.pax.l] - g.px) < 30 && Math.abs(g.pax.y - (PY + 26)) < 40) {   // pickup
        g.c = g.pax.c; g.pax = null; g.carry = true; g.prog = 0; g.dest = pick(g.c.to || PLACES);
        g.left = Math.round((100 / (0.03 * sp) * 1.5 + 240) * g.c.t);
        say(`${g.c.e} "${g.dest} አድርሰኝ! ${g.c.s}" 🏃`);
      } else if (g.pax.y > H + 30) { g.pax = null; g.wait = 50; say('🙋 አመለጠ! Missed one — next passenger coming'); }
    }
    if (g.carry) {
      g.prog += sp * 0.03; g.left--;
      if (g.prog >= 100) {                                 // arrived
        const fare = Math.round((30 + Math.ceil(Math.max(g.left, 0) / 60) * 2) * g.c.f);
        g.earn += fare; g.trips++; g.carry = false; g.wait = 45;
        say(`✅ ${g.c.e} ${g.dest} ደረሱ! +${fare} ETB` + (g.c.em ? ' 🚑 ሕይወት አዳኑ!' : ''));
      } else if (g.left <= 0) {                            // too late
        g.carry = false; g.wait = 60; g.lives--; say(`😠 ${g.c.n} ተናደደ — ዘገዩ! No fare, −1 life`);
        if (g.lives <= 0) return end();
      }
    }
    if (!g.inv) {                                          // collisions
      const o = g.obs.find((v) => Math.abs(LX[v.l] - g.px) < 28 && v.y + (v.k ? 54 : 66) - 6 > PY && v.y + 6 < PY + 54);
      if (o) {
        g.obs = g.obs.filter((v) => v !== o); g.inv = 90; g.lives--;
        const cost = g.carry ? (g.c.care ? 240 : 120) : 0; g.left -= cost;
        say('💥 ተጋጩ! −1 life' + (cost ? `, −${cost / 60}s` : '') + (g.carry && g.c.care ? ' — ተሳፋሪው ተጎዳ!' : ''));
        if (navigator.vibrate) navigator.vibrate(120);
        if (g.lives <= 0) return end();
      }
    }
    draw(); hud();
    raf = requestAnimationFrame(tick);
  }
  function start() {
    cancelAnimationFrame(raf); g = fresh(); g.run = true; last = null; $('gamePause').textContent = '⏸ Pause';
    say('መንገዱን ይከተሉ… ተሳፋሪ ይጠብቁ 🙋'); $('gameStart').textContent = '↻ Restart';
    raf = requestAnimationFrame(tick);
  }
  const move = (d) => { if (g.run && !g.paused) g.lane = Math.max(0, Math.min(2, g.lane + d)); };

  $('gameStart').addEventListener('click', start);
  $('gamePause').addEventListener('click', () => pause());
  $('gameView').addEventListener('click', () => setView());
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });
  $('gameLeft').addEventListener('click', () => move(-1));
  $('gameRight').addEventListener('click', () => move(1));
  cv.addEventListener('pointerdown', (e) => { const r = cv.getBoundingClientRect(); move(e.clientX - r.left < r.width / 2 ? -1 : 1); });
  document.addEventListener('keydown', (e) => {
    if (!screen.classList.contains('active')) return;
    if (e.key === 'v' || e.key === 'V') return setView();
    if (!g.run) return;
    if (e.key === 'p' || e.key === 'P' || e.key === ' ') { e.preventDefault(); return pause(); }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); move(-1); }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); move(1); }
  });
  draw(); hud();
})();
