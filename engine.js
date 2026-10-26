export const CATEGORIES = ['romantic', 'flirty', 'intimate', 'surprise'];
export const LABELS = { romantic: 'Romantis', flirty: 'Genit', intimate: 'Intim', surprise: 'Kejutan' };
export const LADDERS = { 3: 12, 8: 17, 20: 30 };
export const SNAKES = { 19: 7, 27: 13, 32: 21 };
export const TILES = { romantic: [1, 3, 4, 9, 12, 16, 20, 23, 29, 34], flirty: [2, 5, 8, 11, 18, 21, 25, 31], intimate: [7, 10, 15, 17, 22, 27, 28, 32, 33], surprise: [6, 13, 14, 19, 24, 26, 30, 35, 36] };

const CONTENT = {
  romantic: [
    ['Midnight Kiss', 'Berbaring saling berhadapan, saling menatap selama 30 detik, lalu nikmati ciuman mesra.'],
    ['Under the Blanket', 'Masuk ke bawah selimut bersama, berpelukan erat, dan bisikkan tiga hal yang membuat kalian saling tertarik.'],
    ['Kiss Me Again', 'Berikan ciuman di pipi, kening, dan bibir. Akhiri dengan pelukan yang hangat.'],
    ['Spooning Night', 'Berbaring miring menghadap arah yang sama. Peluk pasangan dari belakang dan nikmati kedekatannya.'],
    ['Pillow Talk', 'Ceritakan momen paling romantis yang pernah kalian alami di kamar tidur.'],
    ['Slow Dancing', 'Putar musik pelan, berdansa berdekatan, lalu akhiri dengan ciuman mesra.'],
    ['Love Confession', 'Bisikkan lima hal yang membuatmu selalu tertarik kepada pasangan.'],
    ['Lights Off', 'Redupkan lampu dan habiskan tiga menit berpelukan tanpa gangguan HP.']
  ],

  flirty: [
    ['One Layer Challenge', 'Lepaskan satu aksesori atau lapisan pakaian luar pilihanmu sebagai bagian dari permainan menggoda.'],
    ['Slow Dance', 'Putar musik dan tampilkan tarian menggoda selama satu menit di hadapan pasangan.'],
    ['Hot Whisper', 'Bisikkan rayuan paling berani yang pernah kamu pikirkan kepada pasangan.'],
    ['Neck Kiss', 'Berikan ciuman lembut pada pipi dan leher pasangan.'],
    ['Sit on My Lap', 'Duduk di pangkuan pasangan sambil berhadapan, lalu nikmati pelukan dan ciuman mesra.'],
    ['Seduction Challenge', 'Godalah pasangan menggunakan tatapan, senyuman, dan kata-kata selama satu menit.'],
    ['Hotel Roleplay', 'Bayangkan kalian baru bertemu di sebuah hotel romantis. Perankan percakapan kencan penuh rayuan.'],
    ['Outfit Surprise', 'Ganti dengan pakaian tidur pilihanmu yang membuatmu merasa paling percaya diri dan menarik.']
  ],

  intimate: [
    ['Missionary — Face to Face', 'Pilih posisi saling berhadapan yang nyaman di ranjang. Gunakan bantal untuk membantu menyangga tubuh bila diperlukan.'],
    ['Spooning — Side by Side', 'Berbaring miring menghadap arah yang sama. Atur posisi kaki dan tangan agar keduanya nyaman.'],
    ['Woman on Top', 'Diskusikan posisi dengan salah satu pasangan berada di atas. Perhatikan keseimbangan dan kenyamanan tubuh.'],
    ['Seated Embrace', 'Duduk saling berhadapan di pangkuan pasangan. Gunakan sandaran untuk menopang punggung dan nikmati pelukan.'],
    ['Side Facing', 'Berbaring miring saling berhadapan dan nikmati kedekatan dengan ciuman serta pelukan.'],
    ['Edge of Bed', 'Duduk berhadapan di tepi ranjang dengan tumpuan yang stabil dan nikmati momen mesra bersama.'],
    ['Sensual Massage', 'Bergantian memberikan pijatan perlahan pada bahu dan punggung selama lima menit.'],
    ['Private Session', 'Jeda permainan untuk menikmati waktu intim secara privat. Lanjutkan permainan kapan pun kalian menginginkannya.']
  ],

  surprise: [
    ['Mystery Position', 'Ambil satu kartu acak dari kategori intimate dan eksplorasi panduan kenyamanannya bersama.'],
    ['Strip Challenge', 'Lepaskan satu aksesori atau lapisan pakaian luar pilihanmu. Tantangan boleh dilewati tanpa penalti.'],
    ['Blindfold Mystery', 'Gunakan penutup mata untuk menebak parfum, suara bisikan, atau sentuhan ringan pada tangan.'],
    ['Fantasy Confession', 'Ungkapkan satu fantasi romantis atau ide keintiman yang belum pernah kalian bicarakan.'],
    ['Five Minute Break', 'Letakkan HP selama lima menit dan habiskan waktu dengan bermesraan tanpa gangguan.'],
    ['Secret Outfit', 'Pilih tema pakaian malam yang romantis, lalu berikan pasangan kejutan dengan penampilanmu.'],
    ['Choose Your Desire', 'Bergantian ceritakan keinginan untuk malam ini dan pilih aktivitas yang sama-sama kalian inginkan.'],
    ['After Dark Finale', 'Akhiri permainan dengan ciuman mesra atau lanjutkan menikmati waktu privat bersama.']
  ]
};

export const DEFAULT_CARDS = Object.entries(CONTENT).flatMap(([category, cards]) => cards.map(([title, description], i) => ({ id: `${category}-${i}`, category, title, description, isActive: true, isCustom: false })));
export const SETTINGS = { boardSize: 36, customCardsEnabled: true, sound: false, reward: '', disabledDefaults: [] };
export const KEY = 'love_ladder_v1';

export function newGame(names = ['Suami', 'Istri']) {
  return { phase: 'WAITING_ROLL', players: [{ id: 'husband', name: names[0], position: 1 }, { id: 'wife', name: names[1], position: 1 }], activePlayerIndex: 0, lastDice: null, turnCount: 0, lovePoints: 0, winnerId: null, pendingCard: null, history: [], deckQueues: Object.fromEntries(CATEGORIES.map(c => [c, []])), lastCard: {} };
}

export function beginGame(names, cards, settings) {
  const state = newGame(names);
  state.opening = true;
  state.pendingCard = draw(state, tileCategory(1), cards, settings);
  state.lovePoints = 1;
  state.phase = 'SHOW_CARD';
  state.history.unshift('Petak 1: kartu pembuka untuk kalian berdua.');
  return state;
}

export function tileCategory(position) { return CATEGORIES.find(c => TILES[c].includes(position)) || null; }
export function resolveLanding(position, dice) {
  if (!Number.isInteger(dice) || dice < 1 || dice > 6) throw new Error('Dadu harus 1–6');
  const landing = Math.min(36, position + dice);
  return { landing, final: LADDERS[landing] || SNAKES[landing] || landing };
}
export function roll(state, dice) {
  if (state.phase !== 'WAITING_ROLL') return null;
  const { landing, final } = resolveLanding(state.players[state.activePlayerIndex].position, dice);
  return { landing, final, from: state.players[state.activePlayerIndex].position };
}
export function finishMove(state, dice, final, cards, settings) {
  const next = structuredClone(state);
  if (next.phase !== 'WAITING_ROLL') throw new Error('Giliran belum siap');
  const player = next.players[next.activePlayerIndex];
  const move = resolveLanding(player.position, dice);
  if (move.final !== final) throw new Error('Posisi tidak cocok');
  player.position = final;
  next.lastDice = dice;
  next.turnCount++;
  next.history.unshift(`${player.name} mendapat ${dice}, ke kotak ${final}${move.landing !== final ? ` (dari ${move.landing})` : ''}.`);
  next.history = next.history.slice(0, 20);
  if (final === 36) next.winnerId = player.id;
  const category = tileCategory(final);
  if (category) {
    const drawn = draw(next, category, cards, settings);
    next.pendingCard = drawn;
    next.lovePoints += category === 'surprise' ? 2 : 1;
    next.phase = 'SHOW_CARD';
    return next;
  }
  return advance(next);
}
export function advance(state) {
  state.phase = 'WAITING_ROLL'; state.pendingCard = null;
  state.activePlayerIndex = 1 - state.activePlayerIndex;
  return state;
}
export function resolveCard(state, action, cards, settings) {
  if (state.phase !== 'SHOW_CARD') return state;
  const next = structuredClone(state);
  if (action === 'replace') {
    const replacement = draw(next, next.pendingCard.category, cards, settings);
    if (replacement) next.pendingCard = replacement;
  } else if (action === 'done' || action === 'skip') {
    next.history.unshift(`${next.players[next.activePlayerIndex].name} ${action === 'done' ? 'menutup' : 'melewati'} kartu.`);
    if (next.winnerId) { next.pendingCard = null; next.phase = 'FINISHED'; }
    else if (next.opening) { delete next.opening; next.pendingCard = null; next.phase = 'WAITING_ROLL'; }
    else advance(next);
  }
  return next;
}
export function eligible(category, cards, settings) {
  return cards.filter(c => c.category === category && c.isActive && (!c.isCustom || settings.customCardsEnabled));
}
export function draw(state, category, cards, settings) {
  let pool = eligible(category, cards, settings);
  if (!pool.length && category !== 'romantic') { category = 'romantic'; pool = eligible(category, cards, settings); }
  // ponytail: jika semua kartu dimatikan, kartu darurat menjaga tiap petak tetap punya pilihan; aktifkan kartu lagi untuk variasi.
  if (!pool.length) return { id: 'fallback-romantic', category: 'romantic', title: 'Pilihan Berdua', description: 'Di tepi ranjang, tawarkan pelukan atau ciuman lembut. Tanyakan pilihan pasangan; boleh juga hanya duduk berdekatan.', isActive: true, isCustom: false };
  const ids = new Set(pool.map(c => c.id));
  let queue = (state.deckQueues[category] || []).filter(id => ids.has(id));
  if (!queue.length) {
    queue = [...ids];
    for (let i = queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [queue[i], queue[j]] = [queue[j], queue[i]]; }
    if (queue.length > 1 && queue.at(-1) === state.lastCard[category]) [queue[0], queue[queue.length - 1]] = [queue[queue.length - 1], queue[0]];
  }
  // ponytail: perubahan deck di tengah antrean masuk setelah siklus habis; kosongkan antrean saat editor menyimpan.
  const id = queue.pop();
  state.deckQueues[category] = queue;
  state.lastCard[category] = id;
  return pool.find(c => c.id === id);
}

export function validateCard(input) {
  const title = String(input.title || '').trim(), description = String(input.description || '').trim();
  if (!CATEGORIES.includes(input.category) || !title || title.length > 60 || !description || description.length > 300) throw new Error('Judul wajib 1–60 karakter; deskripsi wajib 1–300 karakter.');
  return { title, description, category: input.category };
}

export function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (!data || data.version !== 1) return null;
    const g = data.gameState;
    if (g != null && (!Array.isArray(g.players) || g.players.length !== 2 || !g.players.every(p => Number.isInteger(p.position) && p.position >= 1 && p.position <= 36 && typeof p.name === 'string') || ![0, 1].includes(g.activePlayerIndex) || !['WAITING_ROLL', 'SHOW_CARD', 'PAUSED', 'FINISHED'].includes(g.phase) || !Number.isInteger(g.lovePoints) || !Number.isInteger(g.turnCount) || !g.deckQueues || !Array.isArray(g.history) || (g.phase === 'SHOW_CARD' && !g.pendingCard))) return null;
    const settings = { ...SETTINGS, ...data.settings };
    delete settings.mode;
    delete settings.reducedMotion;
    settings.disabledDefaults = Array.isArray(settings.disabledDefaults) ? settings.disabledDefaults.filter(x => DEFAULT_CARDS.some(c => c.id === x)) : [];
    const customCards = Array.isArray(data.customCards) ? data.customCards.filter(c => {
      try { validateCard(c); return typeof c.id === 'string' && typeof c.isActive === 'boolean' && c.isCustom === true; } catch { return false; }
    }) : [];
    return { settings, customCards, gameState: g };
  } catch { return null; }
}
export function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify({ version: 1, ...data })); return true; }
  catch { return false; }
}
