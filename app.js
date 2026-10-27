import { CATEGORIES, LABELS, LADDERS, SNAKES, TILES, DEFAULT_CARDS, SETTINGS, KEY, beginGame, roll, finishMove, resolveCard, validateCard, load, save } from './engine.js';

const $ = id => document.getElementById(id);
let data = load() || { settings: { ...SETTINGS }, customCards: [], gameState: null };
let game = data.gameState;
let busy = false, screen = 'welcome', editingFromPause = false;
let audio, musicFadeTimer;
const motionOff = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const cards = () => [...DEFAULT_CARDS.map(c => ({ ...c, isActive: !data.settings.disabledDefaults.includes(c.id) })), ...data.customCards];
const persist = () => { data.gameState = game; if (!save(data)) notice('Penyimpanan browser penuh atau diblokir. Sesi mungkin tidak tersimpan.'); };
const notice = message => { $('notice').textContent = message; $('notice').classList.remove('hidden'); clearTimeout(notice.timer); notice.timer = setTimeout(() => $('notice').classList.add('hidden'), 4000); };
const show = name => { if (name !== 'game') { stopMusic(); leaveFullscreen(); } screen = name; for (const id of ['welcome', 'setup', 'game', 'result']) $(id).classList.toggle('hidden', name !== id); window.scrollTo(0, 0); };
const confirmAction = message => window.confirm(message);

function applySettings() {
  $('custom-enabled').checked = $('pause-custom').checked = data.settings.customCardsEnabled;
  $('music').checked = $('pause-music').checked = data.settings.music;
  $('sound').checked = $('pause-sound').checked = data.settings.sound;
  $('reward').value = data.settings.reward || '';
  for (const [id, enabled, label] of [['music-toggle', data.settings.music, '♫ Musik'], ['sound-toggle', data.settings.sound, '♪ Efek']]) {
    $(id).setAttribute('aria-pressed', String(enabled));
    $(id).textContent = `${label}: ${enabled ? 'nyala' : 'mati'}`;
  }
}
function readSettings(source) {
  data.settings.customCardsEnabled = $(`${source === 'pause' ? 'pause-custom' : 'custom-enabled'}`).checked;
  data.settings.music = $(`${source === 'pause' ? 'pause-music' : 'music'}`).checked;
  data.settings.sound = $(`${source === 'pause' ? 'pause-sound' : 'sound'}`).checked;
  if (source === 'setup') data.settings.reward = $('reward').value.trim();
  applySettings(); persist();
  if (screen === 'game' && game?.phase !== 'PAUSED') { if (data.settings.music) startMusic(); else stopMusic(); }
}
function audioContext() {
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); return audio; }
  catch { return null; }
}
function tone(frequency, time, duration, volume, type = 'sine', destination = audio.destination, attack = .025) {
  const osc = audio.createOscillator(), gain = audio.createGain();
  osc.type = type; osc.frequency.setValueAtTime(frequency, time);
  gain.gain.setValueAtTime(.0001, time);
  gain.gain.linearRampToValueAtTime(volume, time + attack);
  gain.gain.setValueAtTime(volume, time + duration * .62);
  gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
  osc.connect(gain); gain.connect(destination); osc.start(time); osc.stop(time + duration + .03);
}
function fadeMusic(target, pauseAfter = false) {
  clearInterval(musicFadeTimer);
  const track = $('background-music'), initial = track.volume, started = performance.now();
  musicFadeTimer = setInterval(() => {
    const progress = Math.min((performance.now() - started) / 350, 1);
    track.volume = initial + (target - initial) * progress;
    if (progress === 1) { clearInterval(musicFadeTimer); musicFadeTimer = null; if (pauseAfter) track.pause(); }
  }, 30);
}
function startMusic() {
  if (!data.settings.music || screen !== 'game' || !game || game.phase === 'PAUSED' || game.phase === 'FINISHED' || document.hidden) return;
  const track = $('background-music');
  if (track.paused) { track.volume = 0; track.play().catch(() => { track.pause(); }); }
  fadeMusic(.28);
}
function stopMusic() {
  const track = $('background-music');
  if (!track) return;
  if (track.paused) { clearInterval(musicFadeTimer); musicFadeTimer = null; track.volume = 0; return; }
  fadeMusic(0, true);
}
function effect(kind, position = 0) {
  if (!data.settings.sound) return;
  const context = audioContext(); if (!context) return;
  if (context.state === 'suspended') context.resume().catch(() => {});
  const now = context.currentTime + .01;
  if (kind === 'roll') for (let i = 0; i < 6; i++) tone(250 + i * 38, now + i * .075, .09, .027, 'triangle');
  if (kind === 'dice') tone(392 + position * 44, now, .3, .033, 'sine');
  if (kind === 'step') tone(360 + position % 3 * 40, now, .11, .012, 'sine');
  if (kind === 'ladder') [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => tone(note, now + i * .12, .45, .037, 'sine'));
  if (kind === 'snake') [392, 329.63, 261.63, 196].forEach((note, i) => tone(note, now + i * .11, .3, .029, 'triangle'));
  if (kind === 'card') { tone(523.25, now, .55, .026); tone(783.99, now + .13, .58, .02); }
  if (kind === 'tap') tone(440, now, .14, .018, 'sine');
}

const cells = new Map();
const pipPositions = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const diceAngles = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180] };
for (const face of document.querySelectorAll('.dice-face')) {
  for (const index of pipPositions[Number(face.dataset.face)]) { const pip = document.createElement('b'); pip.style.gridArea = `${Math.ceil(index / 3)} / ${((index - 1) % 3) + 1}`; face.append(pip); }
}
async function animateDice(value) {
  const cube = $('dice'), bounce = $('dice-bounce'), tilt = cube.parentElement.parentElement, [x, y] = diceAngles[value];
  const end = `rotateX(${x}deg) rotateY(${y}deg)`;
  if (motionOff()) { cube.style.transform = end; return; }
  tilt.classList.add('rolling');
  const spin = cube.animate([
    { transform: cube.style.transform || 'rotateX(0deg) rotateY(0deg)', offset: 0 },
    { transform: 'rotateX(245deg) rotateY(395deg)', offset: .25 },
    { transform: 'rotateX(635deg) rotateY(755deg)', offset: .55 },
    { transform: `rotateX(${x + 720}deg) rotateY(${y + 1080}deg)`, offset: 1 }
  ], { duration: 1250, easing: 'cubic-bezier(.18,.65,.22,1)', fill: 'forwards' });
  bounce.classList.remove('rolling'); void bounce.offsetWidth; bounce.classList.add('rolling');
  await spin.finished;
  cube.style.transform = end;
  spin.cancel(); bounce.classList.remove('rolling'); tilt.classList.remove('rolling');
  await wait(450);
}
function syncFullscreen() {
  const active = document.fullscreenElement === $('game') || $('game').classList.contains('fullscreen-fallback');
  $('fullscreen').textContent = active ? '⤢ Keluar layar penuh' : '⛶ Layar penuh';
  $('fullscreen').setAttribute('aria-pressed', String(active));
  if (screen === 'game') requestAnimationFrame(renderLinks);
}
function leaveFullscreen() {
  $('game').classList.remove('fullscreen-fallback');
  if (document.fullscreenElement === $('game')) document.exitFullscreen().catch(() => {});
  syncFullscreen();
}
function buildBoard() {
  const board = $('board');
  for (let row = 5; row >= 0; row--) {
    for (let col = 0; col < 6; col++) {
      const n = row * 6 + (row % 2 ? 6 - col : col + 1);
      const category = CATEGORIES.find(c => TILES[c].includes(n));
      const tile = document.createElement('div'); tile.className = 'tile'; tile.dataset.tile = n; tile.dataset.category = category;
      if (LADDERS[n]) tile.dataset.link = 'ladder';
      if (SNAKES[n]) tile.dataset.link = 'snake';
      const number = document.createElement('span'); number.className = 'tile-number'; number.textContent = n;
      const icon = document.createElement('span'); icon.className = 'tile-icon'; icon.style.setProperty('--icon-delay', `${-(n % 7) * .43}s`);
      const symbols = { romantic: ['rose', 'heart', 'letter', 'music'], flirty: ['candle', 'lips', 'ribbon', 'sparkle'], intimate: ['moon', 'stars', 'key', 'heart'], surprise: ['gift', 'ring', 'crown', 'sparkle'] };
      const symbol = n === 36 ? 'crown' : n === 1 ? 'heart' : LADDERS[n] ? 'ladder' : SNAKES[n] ? 'snake' : symbols[category][n % symbols[category].length];
      if (symbol) { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 40 40'); svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%'); const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', `#icon-${symbol}`); svg.append(use); icon.append(svg); }
      else icon.textContent = n === 36 ? '★' : n === 1 ? '⌂' : '';
      tile.setAttribute('aria-label', `Kotak ${n}, kartu ${LABELS[category]}${LADDERS[n] ? `, tangga ke ${LADDERS[n]}` : SNAKES[n] ? `, ular ke ${SNAKES[n]}` : ''}`);
      const tokens = document.createElement('span'); tokens.className = 'tokens'; tile.append(number, icon, tokens); board.append(tile); cells.set(n, tile);
    }
  }
  new ResizeObserver(renderLinks).observe($('board-wrap'));
}
function renderLinks() {
  const svg = $('links'), wrap = $('board-wrap').getBoundingClientRect();
  svg.replaceChildren(); svg.setAttribute('viewBox', `0 0 ${wrap.width} ${wrap.height}`);
  if (!wrap.width || !wrap.height) return;
  const el = (tag, attrs) => { const node = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value); return node; };
  const defs = el('defs', {});
  const ladderGradient = el('linearGradient', { id: 'ladder-wood', x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
  for (const [offset, color] of [['0%', '#ffe8ad'], ['48%', '#ad7547'], ['100%', '#5d493e']]) ladderGradient.append(el('stop', { offset, 'stop-color': color }));
  defs.append(ladderGradient);
  const snakePalettes = [
    ['#dc9c78', '#8d445b', '#5d294d'], ['#a9d0b5', '#4c8c78', '#265d64'],
    ['#e2bd76', '#ae6d46', '#704354'], ['#c6b0d9', '#84629e', '#523e77'],
    ['#f2abac', '#c35d77', '#783756']
  ];
  snakePalettes.forEach((colors, index) => {
    const gradient = el('linearGradient', { id: `snake-skin-${index}`, x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
    colors.forEach((color, stop) => gradient.append(el('stop', { offset: `${stop * 50}%`, 'stop-color': color })));
    defs.append(gradient);
  });
  svg.append(defs);
  const center = tile => { const box = tile.getBoundingClientRect(); return { x: box.x + box.width / 2 - wrap.x, y: box.y + box.height / 2 - wrap.y, width: box.width }; };
  Object.entries(LADDERS).forEach(([start, end]) => {
    const a = center(cells.get(+start)), b = center(cells.get(end));
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy), spread = Math.min(9, a.width * .13);
    const ox = -dy / length * spread, oy = dx / length * spread;
    const group = el('g', { class: 'board-link ladder-link', 'data-start': start });
    for (const side of [-1, 1]) {
      const coords = { x1: a.x + ox * side, y1: a.y + oy * side, x2: b.x + ox * side, y2: b.y + oy * side };
      group.append(el('line', { ...coords, stroke: '#fff7e8', 'stroke-width': '9', 'stroke-linecap': 'round' }));
      group.append(el('line', { ...coords, stroke: '#684b3c', 'stroke-width': '7', 'stroke-linecap': 'round' }));
      group.append(el('line', { ...coords, stroke: 'url(#ladder-wood)', 'stroke-width': '5', 'stroke-linecap': 'round' }));
      group.append(el('line', { ...coords, class: 'ladder-glimmer', stroke: '#fff2c4', 'stroke-width': '1.5', 'stroke-dasharray': '8 26', 'stroke-linecap': 'round' }));
    }
    const steps = Math.max(4, Math.round(length / (a.width * .45)));
    for (let step = 1; step < steps; step++) {
      const t = step / steps, x = a.x + dx * t, y = a.y + dy * t;
      group.append(el('line', { x1: x - ox, y1: y - oy, x2: x + ox, y2: y + oy, stroke: '#624837', 'stroke-width': '6', 'stroke-linecap': 'round' }));
      group.append(el('line', { x1: x - ox, y1: y - oy, x2: x + ox, y2: y + oy, stroke: '#f5d49b', 'stroke-width': '3.5', 'stroke-linecap': 'round' }));
    }
    svg.append(group);
  });
  Object.entries(SNAKES).forEach(([start, end], index) => {
    const a = center(cells.get(+start)), b = center(cells.get(end));
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy), nx = -dy / length, ny = dx / length;
    const bend = Math.min(a.width * .58, 32) * (index % 2 ? -1 : 1), thick = Math.max(7, Math.min(14, a.width * .18));
    const path = `M ${a.x} ${a.y} C ${a.x + dx * .27 + nx * bend} ${a.y + dy * .27 + ny * bend}, ${a.x + dx * .69 - nx * bend} ${a.y + dy * .69 - ny * bend}, ${b.x} ${b.y}`;
    const group = el('g', { class: 'board-link snake-link', 'data-start': start });
    group.append(el('path', { d: path, fill: 'none', stroke: '#fff8ed', 'stroke-width': thick + 5, 'stroke-linecap': 'round' }));
    group.append(el('path', { d: path, fill: 'none', stroke: snakePalettes[index][2], 'stroke-width': thick + 2, 'stroke-linecap': 'round' }));
    group.append(el('path', { d: path, class: 'snake-body', fill: 'none', stroke: `url(#snake-skin-${index})`, 'stroke-width': thick, 'stroke-linecap': 'round' }));
    group.append(el('path', { d: path, class: 'snake-scales', fill: 'none', stroke: '#fff9dcaa', 'stroke-width': thick * .28, 'stroke-dasharray': '2 12', 'stroke-linecap': 'round' }));
    group.append(el('circle', { cx: b.x, cy: b.y, r: thick * .35, fill: snakePalettes[index][2] }));
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const head = el('g', { transform: `translate(${a.x} ${a.y}) rotate(${angle})` });
    const face = el('g', { class: 'snake-face' });
    face.append(el('ellipse', { cx: '0', cy: '0', rx: thick * 1.03, ry: thick * .82, fill: snakePalettes[index][1], stroke: '#fff8ed', 'stroke-width': '2' }));
    face.append(el('ellipse', { cx: thick * .58, cy: '0', rx: thick * .56, ry: thick * .42, fill: snakePalettes[index][0] }));
    for (const side of [-1, 1]) {
      face.append(el('circle', { cx: -thick * .18, cy: side * thick * .48, r: thick * .19, fill: '#fffdf7' }));
      face.append(el('circle', { cx: -thick * .11, cy: side * thick * .48, r: thick * .09, fill: '#251d30' }));
    }
    face.append(el('path', { class: 'snake-tongue', d: `M ${thick} 0 l ${thick * .65} 0 m 0 0 l ${thick * .25} ${-thick * .2} m ${-thick * .25} ${thick * .2} l ${thick * .25} ${thick * .2}`, fill: 'none', stroke: '#b63f57', 'stroke-width': '1.8', 'stroke-linecap': 'round' }));
    head.append(face); group.append(head); svg.append(group);
  });
}
function renderBoard() {
  for (const tile of cells.values()) { tile.querySelector('.tokens').replaceChildren(); tile.classList.remove('occupied', 'active-tile', 'occupied-together'); }
  game.players.forEach((p, i) => { const token = document.createElement('span'); token.className = `token token-${i ? 'b' : 'a'}`; const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icon.setAttribute('viewBox', '0 0 40 40'); icon.setAttribute('aria-hidden', 'true'); const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', i ? '#icon-wife' : '#icon-husband'); icon.append(use); token.append(icon); token.title = `${p.name}, kotak ${p.position}`; cells.get(p.position).querySelector('.tokens').append(token); });
  for (const player of game.players) cells.get(player.position).classList.add('occupied');
  const activeTile = cells.get(game.players[game.activePlayerIndex].position);
  activeTile.classList.add('active-tile');
  if (game.players[0].position === game.players[1].position) activeTile.classList.add('occupied-together');
}
function animateToken(position, className) {
  if (motionOff()) return;
  const token = cells.get(position).querySelector(`.token-${game.activePlayerIndex ? 'b' : 'a'}`);
  if (!token) return;
  token.classList.add(className);
  token.addEventListener('animationend', () => token.classList.remove(className), { once: true });
}
function render() {
  if (!game) return;
  renderBoard();
  $('active-name').textContent = game.players[game.activePlayerIndex].name;
  $('legend-a').textContent = game.players[0].name; $('legend-b').textContent = game.players[1].name;
  $('position-a').textContent = game.players[0].position; $('position-b').textContent = game.players[1].position;
  $('points').textContent = game.lovePoints; $('dice-last').textContent = game.lastDice ?? '—'; $('turns').textContent = game.turnCount;
  if (!busy && game.lastDice != null) { const [x, y] = diceAngles[game.lastDice]; $('dice').style.transform = `rotateX(${x}deg) rotateY(${y}deg)`; }
  $('event').textContent = game.history[0] || 'Lempar dadu untuk mulai.';
  for (const id of ['roll', 'roll-mobile-button']) $(id).disabled = busy || game.phase !== 'WAITING_ROLL';
}
function modalCard() {
  if (!game?.pendingCard) return;
  const c = game.pendingCard;
  $('card-scene').dataset.category = c.category;
  $('scene-use').setAttribute('href', ['flirty', 'intimate'].includes(c.category) ? '#icon-kiss' : '#icon-couple');
  $('card-category').textContent = `${LABELS[c.category]} · kotak ${game.players[game.activePlayerIndex].position}`;
  $('card-title').textContent = c.title; $('card-description').textContent = c.description;
  $('card-player').textContent = `Giliran ${game.players[game.activePlayerIndex].name}`;
  $('card-content').classList.remove('card-enter'); void $('card-content').offsetWidth; if (!motionOff()) $('card-content').classList.add('card-enter');
  effect('card');
  if (!$('card-dialog').open) $('card-dialog').showModal();
}
function closeCard() { if ($('card-dialog').open) $('card-dialog').close(); }
function result() {
  $('winner').textContent = game.players.find(p => p.id === game.winnerId)?.name || 'kalian';
  $('summary').textContent = `${game.turnCount} lemparan · ${game.lovePoints} Poin Cinta bersama`;
  $('prize').textContent = data.settings.reward ? `Hadiah yang disepakati: ${data.settings.reward}` : '';
  show('result');
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function throwDice() {
  if (busy || !game || game.phase !== 'WAITING_ROLL') return;
  busy = true; render();
  const dice = Math.floor(Math.random() * 6) + 1, move = roll(game, dice);
  try {
    effect('roll');
    $('event').textContent = `Mengocok dadu untuk ${game.players[game.activePlayerIndex].name}...`;
    await animateDice(dice);
    effect('dice', dice);
    if (!motionOff()) {
      $('event').textContent = `Dadu: ${dice}. ${game.players[game.activePlayerIndex].name} melangkah...`;
      for (let pos = move.from + 1; pos <= move.landing; pos++) {
        game.players[game.activePlayerIndex].position = pos; renderBoard(); animateToken(pos, 'token-hop'); effect('step', pos); await wait(190);
      }
      if (move.final !== move.landing) {
        const link = $('links').querySelector(`[data-start="${move.landing}"]`);
        link?.classList.add('link-activated');
        $('event').textContent = LADDERS[move.landing] ? `Tangga menyala! Naik ke kotak ${move.final}.` : `Ular bergerak! Meluncur ke kotak ${move.final}.`;
        effect(LADDERS[move.landing] ? 'ladder' : 'snake');
        await wait(250); game.players[game.activePlayerIndex].position = move.final; renderBoard(); animateToken(move.final, 'token-transfer'); await wait(440);
        link?.classList.remove('link-activated');
      }
    } else if (move.final !== move.landing) effect(LADDERS[move.landing] ? 'ladder' : 'snake');
    // Snapshot lama tetap tersimpan selama animasi; komputasi giliran memakai posisi sebelum animasi.
    game.players[game.activePlayerIndex].position = move.from;
    game = finishMove(game, dice, move.final, cards(), data.settings);
    persist(); render();
    if (!motionOff()) { const tile = cells.get(move.final); tile.classList.remove('tile-glow'); void tile.offsetWidth; tile.classList.add('tile-glow'); tile.addEventListener('animationend', () => tile.classList.remove('tile-glow'), { once: true }); }
    if (game.phase === 'SHOW_CARD') modalCard();
    if (game.phase === 'FINISHED') result();
  } finally { busy = false; render(); }
}
function cardAction(action) {
  if (game?.phase !== 'SHOW_CARD') return;
  game = resolveCard(game, action, cards(), data.settings); persist(); render(); effect('tap');
  if (action === 'replace' && game.pendingCard) modalCard(); else { closeCard(); if (game.phase === 'FINISHED') result(); }
}
function pause() {
  if (busy || !game || !['WAITING_ROLL', 'SHOW_CARD'].includes(game.phase)) return;
  game.previousPhase = game.phase; game.phase = 'PAUSED'; persist(); applySettings();
  stopMusic();
  if ($('card-dialog').open) closeCard(); $('pause-dialog').showModal(); render();
}
function resume() {
  if (game?.phase !== 'PAUSED') return;
  readSettings('pause'); game.phase = game.previousPhase === 'SHOW_CARD' && game.pendingCard ? 'SHOW_CARD' : 'WAITING_ROLL'; delete game.previousPhase;
  persist(); $('pause-dialog').close(); render(); startMusic(); if (game.phase === 'SHOW_CARD') modalCard();
}
function clearEverything() {
  if (!confirmAction('Hapus semua kartu pribadi, pengaturan, dan sesi di perangkat ini?')) return;
  try { localStorage.removeItem(KEY); } catch { notice('Data tidak dapat dihapus dari browser ini.'); return; }
  for (const dialog of document.querySelectorAll('dialog')) if (dialog.open) dialog.close();
  data = { settings: { ...SETTINGS }, customCards: [], gameState: null }; game = null; busy = false; applySettings(); $('consent').checked = false; consentChanged(); show('welcome');
}
function consentChanged() {
  const allowed = $('consent').checked;
  $('enter').disabled = !allowed; $('continue').disabled = !allowed;
}
function editReset() { $('card-form').reset(); $('card-id').value = ''; $('form-heading').textContent = 'Tambah kartu pribadi'; $('form-error').textContent = ''; }
function refreshCards() {
  const query = $('card-search').value.trim().toLocaleLowerCase('id'), filter = $('card-filter').value;
  $('card-list').replaceChildren();
  cards().filter(c => (filter === 'all' || c.category === filter) && c.title.toLocaleLowerCase('id').includes(query)).forEach(c => {
    const row = document.createElement('div'); row.className = 'border border-[#ead8bf] rounded-xl p-3 flex justify-between items-center gap-2';
    const text = document.createElement('div'); text.className = 'min-w-0 text-sm';
    const title = document.createElement('strong'); title.textContent = c.title;
    const subtitle = document.createElement('p'); subtitle.className = 'text-[#805a68]'; subtitle.textContent = `${LABELS[c.category]} · ${c.isCustom ? 'Pribadi' : 'Bawaan'}`; text.append(title, subtitle);
    const controls = document.createElement('div'); controls.className = 'flex gap-1 shrink-0';
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'button secondary !px-3 text-xs'; toggle.textContent = c.isActive ? 'Aktif' : 'Nonaktif'; toggle.setAttribute('aria-label', `${c.isActive ? 'Nonaktifkan' : 'Aktifkan'} ${c.title}`);
    toggle.onclick = () => { if (c.isCustom) data.customCards.find(x => x.id === c.id).isActive = !c.isActive; else { const list = data.settings.disabledDefaults; data.settings.disabledDefaults = c.isActive ? [...list, c.id] : list.filter(id => id !== c.id); } decksChanged(); refreshCards(); };
    controls.append(toggle);
    if (c.isCustom) {
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'button outline !px-3 text-xs'; edit.textContent = 'Ubah'; edit.setAttribute('aria-label', `Ubah ${c.title}`);
      edit.onclick = () => { $('card-id').value = c.id; $('card-type').value = c.category; $('card-name').value = c.title; $('card-text').value = c.description; $('form-heading').textContent = 'Ubah kartu pribadi'; $('card-name').focus(); };
      const del = document.createElement('button'); del.type = 'button'; del.className = 'button outline !px-3 text-xs'; del.textContent = 'Hapus'; del.setAttribute('aria-label', `Hapus ${c.title}`);
      del.onclick = () => { if (!confirmAction(`Hapus kartu “${c.title}”?`)) return; data.customCards = data.customCards.filter(x => x.id !== c.id); if ($('card-id').value === c.id) editReset(); decksChanged(); refreshCards(); };
      controls.append(edit, del);
    }
    row.append(text, controls); $('card-list').append(row);
  });
}
function decksChanged() { if (game) game.deckQueues = Object.fromEntries(CATEGORIES.map(c => [c, []])); persist(); }

buildBoard(); applySettings();
document.addEventListener('fullscreenchange', syncFullscreen);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); else startMusic(); });
async function enterFullscreen() {
  if (document.fullscreenElement === $('game') || $('game').classList.contains('fullscreen-fallback')) return;
  try { if (!document.fullscreenEnabled || !$('game').requestFullscreen) throw new Error('Fullscreen tidak tersedia'); await $('game').requestFullscreen(); }
  catch { $('game').classList.add('fullscreen-fallback'); }
  syncFullscreen();
}
$('fullscreen').onclick = async () => {
  if (document.fullscreenElement === $('game') || $('game').classList.contains('fullscreen-fallback')) { leaveFullscreen(); return; }
  await enterFullscreen();
};
function promptFullscreen() {
  if (data.settings.fullscreenTipSeen) return false;
  $('fullscreen-tip-dialog').showModal(); return true;
}
function finishFullscreenTip() {
  data.settings.fullscreenTipSeen = true; persist();
  if (game?.phase === 'SHOW_CARD') modalCard();
  else if (game?.phase === 'PAUSED') { applySettings(); $('pause-dialog').showModal(); }
}
$('tip-later').onclick = () => { $('fullscreen-tip-dialog').close(); finishFullscreenTip(); };
$('tip-fullscreen').onclick = async () => { $('fullscreen-tip-dialog').close(); await enterFullscreen(); finishFullscreenTip(); };
$('fullscreen-tip-dialog').addEventListener('cancel', event => { event.preventDefault(); $('tip-later').click(); });
$('music-toggle').onclick = () => { data.settings.music = !data.settings.music; applySettings(); persist(); if (data.settings.music) startMusic(); else stopMusic(); effect('tap'); };
$('sound-toggle').onclick = () => { data.settings.sound = !data.settings.sound; applySettings(); persist(); effect('tap'); };
if (game && !['WAITING_ROLL', 'SHOW_CARD', 'PAUSED', 'FINISHED'].includes(game.phase)) game = null;
if (game) $('continue').classList.remove('hidden');
$('consent').onchange = consentChanged;
$('enter').onclick = () => { if ($('consent').checked) show('setup'); };
$('continue').onclick = () => { if (!$('consent').checked || !game) return; if (game.phase === 'FINISHED') result(); else { show('game'); render(); if (game.phase !== 'PAUSED') startMusic(); if (!promptFullscreen()) { if (game.phase === 'PAUSED') { applySettings(); $('pause-dialog').showModal(); } else if (game.phase === 'SHOW_CARD') modalCard(); } } };
$('start').onclick = () => {
  const a = $('name-a').value.trim(), b = $('name-b').value.trim();
  if (!a || !b) { notice('Isi nama kedua pemain.'); return; }
  if (game && !confirmAction('Mulai permainan baru? Sesi sebelumnya akan diganti.')) return;
  readSettings('setup'); game = beginGame([a, b], cards(), data.settings); persist(); render(); show('game'); startMusic(); if (!promptFullscreen()) modalCard();
};
for (const id of ['roll', 'roll-mobile-button']) $(id).onclick = throwDice;
for (const [id, action] of [['card-done', 'done'], ['card-skip', 'skip'], ['card-replace', 'replace']]) $(id).onclick = () => cardAction(action);
$('pause').onclick = $('card-pause').onclick = pause; $('resume').onclick = resume;
$('end').onclick = () => { if (!confirmAction('Akhiri permainan ini? Sesi tidak dapat dilanjutkan.')) return; game = null; persist(); $('pause-dialog').close(); show('setup'); };
$('again').onclick = () => { game = beginGame(game.players.map(p => p.name), cards(), data.settings); persist(); show('game'); render(); startMusic(); if (!promptFullscreen()) modalCard(); };
$('back-setup').onclick = () => { $('name-a').value = game.players[0].name; $('name-b').value = game.players[1].name; show('setup'); };
for (const id of ['clear-setup', 'clear-pause']) $(id).onclick = clearEverything;
$('rules').onclick = () => $('rules-dialog').showModal(); $('rules-close').onclick = () => $('rules-dialog').close();
$('edit-cards').onclick = () => { readSettings('setup'); editingFromPause = false; refreshCards(); $('editor-dialog').showModal(); };
$('pause-edit').onclick = () => { readSettings('pause'); editingFromPause = true; $('pause-dialog').close(); refreshCards(); $('editor-dialog').showModal(); };
$('editor-close').onclick = () => { $('editor-dialog').close(); editReset(); if (editingFromPause) $('pause-dialog').showModal(); };
for (const id of ['card-search', 'card-filter']) $(id).addEventListener(id === 'card-search' ? 'input' : 'change', refreshCards);
$('form-cancel').onclick = editReset;
$('reset-defaults').onclick = () => { data.settings.disabledDefaults = []; decksChanged(); refreshCards(); notice('Semua kartu bawaan aktif kembali.'); };
$('card-form').onsubmit = event => {
  event.preventDefault();
  try {
    const validated = validateCard({ category: $('card-type').value, title: $('card-name').value, description: $('card-text').value });
    const id = $('card-id').value, now = new Date().toISOString();
    if (id) {
      const existing = data.customCards.find(c => c.id === id);
      if (!existing) throw new Error('Kartu tidak ditemukan.');
      Object.assign(existing, validated, { updatedAt: now });
    } else data.customCards.push({ ...validated, id: crypto.randomUUID(), isActive: true, isCustom: true, createdAt: now, updatedAt: now });
    decksChanged(); editReset(); refreshCards(); notice('Kartu tersimpan.');
  } catch (error) { $('form-error').textContent = error.message; }
};
for (const id of ['card-dialog', 'pause-dialog', 'editor-dialog', 'rules-dialog']) {
  $(id).addEventListener('cancel', event => { if (id === 'card-dialog' || id === 'pause-dialog') event.preventDefault(); else if (id === 'editor-dialog' && editingFromPause) { event.preventDefault(); $('editor-dialog').close(); editReset(); $('pause-dialog').showModal(); } });
}
