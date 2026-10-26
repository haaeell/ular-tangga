import { CATEGORIES, LABELS, LADDERS, SNAKES, TILES, DEFAULT_CARDS, SETTINGS, KEY, beginGame, roll, finishMove, resolveCard, validateCard, load, save } from './engine.js';

const $ = id => document.getElementById(id);
let data = load() || { settings: { ...SETTINGS }, customCards: [], gameState: null };
let game = data.gameState;
let busy = false, screen = 'welcome', editingFromPause = false, audio;
const motionOff = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const cards = () => [...DEFAULT_CARDS.map(c => ({ ...c, isActive: !data.settings.disabledDefaults.includes(c.id) })), ...data.customCards];
const persist = () => { data.gameState = game; if (!save(data)) notice('Penyimpanan browser penuh atau diblokir. Sesi mungkin tidak tersimpan.'); };
const notice = message => { $('notice').textContent = message; $('notice').classList.remove('hidden'); clearTimeout(notice.timer); notice.timer = setTimeout(() => $('notice').classList.add('hidden'), 4000); };
const show = name => { if (name !== 'game') leaveFullscreen(); screen = name; for (const id of ['welcome', 'setup', 'game', 'result']) $(id).classList.toggle('hidden', name !== id); window.scrollTo(0, 0); };
const confirmAction = message => window.confirm(message);

function applySettings() {
  $('custom-enabled').checked = $('pause-custom').checked = data.settings.customCardsEnabled;
  $('sound').checked = $('pause-sound').checked = data.settings.sound;
  $('reward').value = data.settings.reward || '';
}
function readSettings(source) {
  data.settings.customCardsEnabled = $(`${source === 'pause' ? 'pause-custom' : 'custom-enabled'}`).checked;
  data.settings.sound = $(`${source === 'pause' ? 'pause-sound' : 'sound'}`).checked;
  if (source === 'setup') data.settings.reward = $('reward').value.trim();
  applySettings(); persist();
}
function sound() {
  if (!data.settings.sound) return;
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); const osc = audio.createOscillator(), gain = audio.createGain(); osc.connect(gain); gain.connect(audio.destination); osc.frequency.value = 520; gain.gain.setValueAtTime(.04, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .13); osc.start(); osc.stop(audio.currentTime + .13); } catch { /* Audio opsional. */ }
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
      const tile = document.createElement('div'); tile.className = 'tile'; tile.dataset.tile = n;
      tile.style.background = n === 36 ? '#5B223D' : n === 1 ? '#EAD8BF' : LADDERS[n] ? '#dceee2' : SNAKES[n] ? '#f3d9dc' : { romantic: '#f5dde7', flirty: '#f9e3d8', intimate: '#e8dff0', surprise: '#f7eccf' }[category] || '#f7f0ec';
      if (n === 36) tile.style.color = 'white';
      const number = document.createElement('span'); number.className = 'tile-number'; number.textContent = n;
      const icon = document.createElement('span'); icon.className = 'tile-icon';
      const symbol = LADDERS[n] ? 'ladder' : SNAKES[n] ? 'snake' : { romantic: 'rose', flirty: 'candle', intimate: 'moon', surprise: 'gift' }[category];
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
  for (const [map, color, snake] of [[LADDERS, '#28694a', false], [SNAKES, '#a23e61', true]]) {
    for (const [start, end] of Object.entries(map)) {
      const a = cells.get(+start).getBoundingClientRect(), b = cells.get(end).getBoundingClientRect();
      const x1 = a.x + a.width / 2 - wrap.x, y1 = a.y + a.height / 2 - wrap.y;
      const x2 = b.x + b.width / 2 - wrap.x, y2 = b.y + b.height / 2 - wrap.y;
      const group = el('g', { class: 'board-link', opacity: '.9' });
      if (snake) {
        const bend = Math.min(a.width * .8, 35), midX = (x1 + x2) / 2;
        const path = `M ${x1} ${y1} C ${midX + bend} ${y1 - 25}, ${midX - bend} ${y2 + 25}, ${x2} ${y2}`;
        group.append(el('path', { d: path, fill: 'none', stroke: '#fff6ed', 'stroke-width': '11', 'stroke-linecap': 'round' }));
        group.append(el('path', { d: path, fill: 'none', stroke: color, 'stroke-width': '7', 'stroke-linecap': 'round' }));
        group.append(el('circle', { cx: x1, cy: y1, r: '6', fill: color }));
        group.append(el('circle', { cx: x1 - 2, cy: y1 - 2, r: '1.5', fill: 'white' }));
      } else {
        const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy), ox = -dy / length * 6, oy = dx / length * 6;
        for (const side of [-1, 1]) group.append(el('line', { x1: x1 + ox * side, y1: y1 + oy * side, x2: x2 + ox * side, y2: y2 + oy * side, stroke: '#fff6ed', 'stroke-width': '6', 'stroke-linecap': 'round' }));
        for (const side of [-1, 1]) group.append(el('line', { x1: x1 + ox * side, y1: y1 + oy * side, x2: x2 + ox * side, y2: y2 + oy * side, stroke: color, 'stroke-width': '3', 'stroke-linecap': 'round' }));
        for (let t = 0.12; t < .95; t += .14) group.append(el('line', { x1: x1 + dx * t - ox, y1: y1 + dy * t - oy, x2: x1 + dx * t + ox, y2: y1 + dy * t + oy, stroke: color, 'stroke-width': '3', 'stroke-linecap': 'round' }));
      }
      svg.append(group);
    }
  }
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
  if (!$('card-dialog').open) $('card-dialog').showModal();
}
function closeCard() { if ($('card-dialog').open) $('card-dialog').close(); }
function result() {
  $('winner').textContent = game.players.find(p => p.id === game.winnerId)?.name || 'kalian';
  $('summary').textContent = `${game.turnCount} lemparan · ${game.lovePoints} Love Points bersama`;
  $('prize').textContent = data.settings.reward ? `Hadiah yang disepakati: ${data.settings.reward}` : '';
  show('result');
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function throwDice() {
  if (busy || !game || game.phase !== 'WAITING_ROLL') return;
  busy = true; render();
  const dice = Math.floor(Math.random() * 6) + 1, move = roll(game, dice);
  try {
    $('event').textContent = `Mengocok dadu untuk ${game.players[game.activePlayerIndex].name}...`;
    await animateDice(dice);
    if (!motionOff()) {
      $('event').textContent = `Dadu: ${dice}. ${game.players[game.activePlayerIndex].name} melangkah...`;
      for (let pos = move.from + 1; pos <= move.landing; pos++) {
        game.players[game.activePlayerIndex].position = pos; renderBoard(); animateToken(pos, 'token-hop'); await wait(190);
      }
      if (move.final !== move.landing) { await wait(250); game.players[game.activePlayerIndex].position = move.final; renderBoard(); animateToken(move.final, 'token-transfer'); await wait(440); }
    }
    // Snapshot lama tetap tersimpan selama animasi; komputasi giliran memakai posisi sebelum animasi.
    game.players[game.activePlayerIndex].position = move.from;
    game = finishMove(game, dice, move.final, cards(), data.settings);
    persist(); sound(); render();
    if (!motionOff()) { const tile = cells.get(move.final); tile.classList.remove('tile-glow'); void tile.offsetWidth; tile.classList.add('tile-glow'); tile.addEventListener('animationend', () => tile.classList.remove('tile-glow'), { once: true }); }
    if (game.phase === 'SHOW_CARD') modalCard();
    if (game.phase === 'FINISHED') result();
  } finally { busy = false; render(); }
}
function cardAction(action) {
  if (game?.phase !== 'SHOW_CARD') return;
  game = resolveCard(game, action, cards(), data.settings); persist(); render(); sound();
  if (action === 'replace' && game.pendingCard) modalCard(); else { closeCard(); if (game.phase === 'FINISHED') result(); }
}
function pause() {
  if (busy || !game || !['WAITING_ROLL', 'SHOW_CARD'].includes(game.phase)) return;
  game.previousPhase = game.phase; game.phase = 'PAUSED'; persist(); applySettings();
  if ($('card-dialog').open) closeCard(); $('pause-dialog').showModal(); render();
}
function resume() {
  if (game?.phase !== 'PAUSED') return;
  readSettings('pause'); game.phase = game.previousPhase === 'SHOW_CARD' && game.pendingCard ? 'SHOW_CARD' : 'WAITING_ROLL'; delete game.previousPhase;
  persist(); $('pause-dialog').close(); render(); if (game.phase === 'SHOW_CARD') modalCard();
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
$('fullscreen').onclick = async () => {
  if (document.fullscreenElement === $('game') || $('game').classList.contains('fullscreen-fallback')) { leaveFullscreen(); return; }
  try { if (!document.fullscreenEnabled || !$('game').requestFullscreen) throw new Error('Fullscreen tidak tersedia'); await $('game').requestFullscreen(); }
  catch { $('game').classList.add('fullscreen-fallback'); }
  syncFullscreen();
};
if (game && !['WAITING_ROLL', 'SHOW_CARD', 'PAUSED', 'FINISHED'].includes(game.phase)) game = null;
if (game) $('continue').classList.remove('hidden');
$('consent').onchange = consentChanged;
$('enter').onclick = () => { if ($('consent').checked) show('setup'); };
$('continue').onclick = () => { if (!$('consent').checked || !game) return; if (game.phase === 'FINISHED') result(); else { show('game'); render(); if (game.phase === 'PAUSED') { applySettings(); $('pause-dialog').showModal(); } else if (game.phase === 'SHOW_CARD') modalCard(); } };
$('start').onclick = () => {
  const a = $('name-a').value.trim(), b = $('name-b').value.trim();
  if (!a || !b) { notice('Isi nama kedua pemain.'); return; }
  if (game && !confirmAction('Mulai permainan baru? Sesi sebelumnya akan diganti.')) return;
  readSettings('setup'); game = beginGame([a, b], cards(), data.settings); persist(); render(); show('game'); modalCard();
};
for (const id of ['roll', 'roll-mobile-button']) $(id).onclick = throwDice;
for (const [id, action] of [['card-done', 'done'], ['card-skip', 'skip'], ['card-replace', 'replace']]) $(id).onclick = () => cardAction(action);
$('pause').onclick = $('card-pause').onclick = pause; $('resume').onclick = resume;
$('end').onclick = () => { if (!confirmAction('Akhiri permainan ini? Sesi tidak dapat dilanjutkan.')) return; game = null; persist(); $('pause-dialog').close(); show('setup'); };
$('again').onclick = () => { game = beginGame(game.players.map(p => p.name), cards(), data.settings); persist(); show('game'); render(); modalCard(); };
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
