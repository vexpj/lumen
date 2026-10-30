'use strict';
/* =====================================================================
   LUMEN — вся логика сайта в одном файле.
   Разделы: 1 Настройка · 2 Утилиты · 3 Состояние · 4 Запросы к серверу · 5 Темы и навигация
            6 Вход · 7 Игры · 8 Дуэли · 9 Кейсы, инвентарь, рынок, крафт · 10 Бонусы
            11 Банк и переводы · 12 Топы, игроки, чат · 13 Кабинет и профиль · 14 Админ-панель
            15 Хэллоуинский ивент · 16 Запуск
   Игровая логика (случайность, баланс, шансы, права) считается на сервере — Code.gs.
   Здесь только показ результата и отправка действий.
   ===================================================================== */

/* ===================== 1. НАСТРОЙКА ===================== */
// Вставьте адрес веб-приложения Google Apps Script (оканчивается на /exec).
const API_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';

/* ===================== 2. УТИЛИТЫ ===================== */
const SYM = ['🍒', '🍋', '🔔', '💎', '7️⃣'];                 // символы слотов (порядок как на сервере)
const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const money = n => '$' + Number(n).toFixed(2);
const sm = n => (n < 0 ? '−' : '+') + money(Math.abs(n));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h} ч ${m} мин` : m ? `${m} мин` : `${s} сек`; };
const fmtDur = ms => { const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? `${d} д ${h} ч` : h ? `${h} ч ${m} мин` : `${m} мин ${s % 60} с`; };
const fmtDate = ts => ts ? new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtDT = ts => ts ? new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
function fmtAgo(ts) {
  const d = Math.max(0, (Date.now() - ts) / 1000);
  if (!ts) return 'давно';
  if (d < 120) return 'только что';
  if (d < 3600) return Math.floor(d / 60) + ' мин назад';
  if (d < 86400) return Math.floor(d / 3600) + ' ч назад';
  return Math.floor(d / 86400) + ' дн назад';
}
const hue = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const avatar = (n, cls = '') => `<span class="av ${cls}" style="background:linear-gradient(135deg,hsl(${hue(n)},80%,58%),hsl(${(hue(n) + 55) % 360},80%,40%))">${esc([...n][0].toUpperCase())}</span>`;
const rndHex = () => 'k' + [...crypto.getRandomValues(new Uint8Array(8))].map(x => x.toString(16).padStart(2, '0')).join('');
async function sha256hex(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const colorOf = n => n === 0 ? 'green' : REDS.includes(n) ? 'red' : 'black';
const poll = (fn, ms) => setInterval(() => { if (!document.hidden) fn(); }, ms); // опрос сервера только пока вкладка видна

// роли, VIP, права
const roleCfg = ro => CONF && CONF.mods.roles && CONF.mods.roles[ro];
const roleName = id => (roleCfg(id) || { n: id }).n;
const can = p => !!(S && S.perms && (S.perms.includes('*') || S.perms.includes(p)));
const vipBadge = x => x && x.v > 0 ? CONF.mods.vip[x.v].e : '';
function nick(name, x) { // ник цвета роли + плашка статуса
  const r = x && x.ro ? roleCfg(x.ro) : null, col = r && r.color ? r.color : '';
  return `<span class="nk"${col ? ` style="color:${col}"` : ''}>${esc(name)}</span>${r && r.e ? `<span class="rb" style="color:${col};border-color:${col}">${r.e} ${esc(r.n)}</span>` : ''}`;
}
// предметы и награды
const RAR = r => r < 0 ? 'Билет' : CONF.mods.rarity[r];
function itemTile(id, n, extra) {
  const it = CONF.mods.items[id], rc = it.r < 0 ? 'rt' : 'r' + it.r;
  return `<div class="it ${rc} ${extra || ''}" data-id="${id}">${n > 1 ? `<span class="cn">×${n}</span>` : ''}<div class="ie">${it.e}</div><b>${esc(it.n)}</b><small class="muted">${money(it.v)}</small></div>`;
}
const dropTile = d => d.t === 'c'
  ? `<div class="it ${d.a >= 10 ? 'r3' : d.a >= 3 ? 'r2' : d.a >= 1 ? 'r1' : 'r0'}"><div class="ie">🪙</div><b>${money(d.a)}</b></div>`
  : itemTile(d.a, 1);
const rewardText = r => [r.c ? money(r.c) : '', r.candy ? r.candy + ' 🍬' : '', r.xp ? r.xp + ' XP' : '', r.i ? CONF.mods.items[r.i].e + ' ' + (r.q > 1 ? '×' + r.q : CONF.mods.items[r.i].n) : ''].filter(Boolean).join(' + ');
const HT = { bet: 'Ставка', case: 'Кейс', duel: 'Дуэль', loan: 'Кредит', repay: 'Погашение', xfer: 'Перевод', promo: 'Промокод', mkt: 'Рынок', adm: 'Админ', pay: 'Платёж', event: 'Ивент' };
const PST = { pending: 'ожидает оплаты', paid: 'оплачен' };

/* ===================== 3. СОСТОЯНИЕ ===================== */
let session = null;
try { session = JSON.parse(localStorage.getItem('lumen_session')); } catch (e) {}
let S = null;            // данные игрока с сервера (баланс, уровень, инвентарь, ивент…)
let CONF = null;         // настройки сервера (кейсы, роли, лимиты…)
let view = 'games';      // текущий экран
let busy = false;        // идёт анимация/запрос: блокируем повторные нажатия
let lbTimer = null, duelTimer = null, hb = null;
let authMode = 'login';
let game = 'slots', rChoice = 'red', dMode = 'under', cSide = 'heads';
let bonusAt = 0, spinAt = 0, spinning = false, evEndAt = 0;
const REF = (new URLSearchParams(location.search).get('ref') || (function () { try { return localStorage.getItem('lumen_ref'); } catch (e) { return ''; } })() || '').toUpperCase();
if (REF) { try { localStorage.setItem('lumen_ref', REF); } catch (e) {} }

/* ===================== 4. ЗАПРОСЫ К СЕРВЕРУ ===================== */
async function api(action, data = {}) {
  if (API_URL.startsWith('PASTE')) throw new Error('Укажите адрес сервера в начале script.js (API_URL)');
  const body = { action, ...data };
  if (session && !('user' in data)) { body.user = session.user; body.token = session.token; }
  let j;
  try { j = await (await fetch(API_URL, { method: 'POST', body: JSON.stringify(body) })).json(); } // text/plain: без CORS-preflight
  catch (e) { throw new Error('Нет связи с сервером. Проверьте: адрес оканчивается на /exec, доступ «Все», развёртывание обновлено.'); }
  if (!j.ok) {
    if (/Сессия истекла|заблокирован/.test(j.error || '')) logout(true, /заблокирован/.test(j.error) ? j.error : undefined);
    throw new Error(j.error || 'Ошибка сервера');
  }
  if (j.newAch) j.newAch.forEach(a => toast('🏆 ' + a.n + ' · +' + money(a.r)));
  return j;
}
const getJSON = q => fetch(API_URL + '?' + q).then(r => r.json()); // публичные данные: топы, игроки, чат, профиль

function toast(msg, type = 'ok') {
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3600);
}

/* ===================== 5. ТЕМЫ И НАВИГАЦИЯ ===================== */
const THEMES = { auto: 'Авто', emerald: 'Изумруд', halloween: '🎃 Хэллоуин', glass: 'Стекло', violet: 'Фиолет', ruby: 'Рубин' };
const THEME_BG = { emerald: '#0a0f0d', halloween: '#0d0912', glass: '#07091a', violet: '#0b0a14', ruby: '#0f0a0b' };
function applyTheme() { // «Авто»: во время ивента — Хэллоуин, иначе — Изумруд
  let t = localStorage.getItem('lumen_theme') || 'auto';
  if (!THEMES[t]) t = 'auto';
  if (t === 'auto') t = S && S.event && S.event.active ? 'halloween' : 'emerald';
  document.documentElement.dataset.theme = t;
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = THEME_BG[t];
}

const NAVMAP = { players: 'top', chat: 'top', admin: 'profile' };
function openView(v, navKey) {
  if (v === 'admin' && !(S && S.perms && S.perms.length)) return;
  if (v === 'event' && !(S && S.event && S.event.active)) return;
  view = v;
  const nk = navKey || NAVMAP[v] || v;
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === nk));
  $$('.view').forEach(x => x.classList.toggle('on', x.id === 'v-' + v));
  clearInterval(lbTimer);
  if (v === 'top') { loadTops(); lbTimer = poll(loadTops, 30000); }
  if (v === 'players') { loadPlayers(); lbTimer = poll(loadPlayers, 30000); }
  if (v === 'chat') { loadChat(); lbTimer = poll(loadChat, 5000); }
  if (v === 'event') { loadEvTop(); lbTimer = poll(loadEvTop, 15000); }
  if (v === 'bank') { renderBank(); loadTransfers(); }
  refreshUI(); syncDuels();
  window.scrollTo({ top: 0 });
}
$('#nav').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.v === 'profile') openProfile(session.user); else openView(b.dataset.v);
};
function buildSeg() { // переключатель «Топы / Игроки / Чат» над списками
  $$('.seg').forEach(el => {
    const a = el.dataset.a;
    el.innerHTML = [['top', '🏆 Топы'], ['players', '👥 Игроки'], ['chat', '💬 Чат']].map(([k, t]) => `<button class="chip ${a === k ? 'on' : ''}" data-v="${k}">${t}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('.chip'); if (b) openView(b.dataset.v); };
  });
}
buildSeg();
function bindSub(barId, prefix, cb) { // подвкладки внутри экрана
  $(barId).onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$(barId + ' .chip').forEach(x => x.classList.toggle('on', x === b));
    $$('[id^="' + prefix + '"]').forEach(x => x.classList.toggle('on', x.id === prefix + b.dataset.p));
    if (cb) cb(b.dataset.p);
  };
}

function applyState(s) { // сервер вернул актуальные данные игрока
  const prev = S ? S.balance : s.balance, pl = S ? S.level : s.level;
  S = s;
  $('#bal').textContent = money(s.balance);
  $('#lv').textContent = 'Ур. ' + s.level + (s.vip ? ' ' + CONF.mods.vip[s.vip].e : '');
  $('#fairHash').textContent = s.fairHash.slice(0, 14) + '…';
  $('#feeNote').textContent = 'Комиссия казино: ' + Math.round(CONF.houseEdge * 100) + '% с чистого выигрыша (идёт в системный пул).';
  const X = CONF.mods.xfer;
  $('#xInfo').textContent = `От ${money(X.MIN)} до ${money(X.MAX)} за раз, до ${money(X.DAILY)} в сутки. Доступно после ставок на ${money(X.MIN_WAGERED)}.`;
  const evOn = !!(s.event && s.event.active);
  $('#navEvent').hidden = !evOn;
  if (!evOn && view === 'event') openView('games');
  if (evOn) evEndAt = Date.now() + s.event.endsIn;
  applyTheme(); renderBanner();
  if (s.balance !== prev) { const b = $('#bal'); b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 300); }
  if (s.level > pl) toast('🎉 Новый уровень: ' + s.level);
  bonusAt = Date.now() + s.bonusIn; spinAt = Date.now() + s.spinIn;
  if (view === 'bank') renderBank();
  refreshUI();
}
function refreshUI() { // перерисовываем только открытый экран
  if (!S) return;
  $('#dVipWrap').hidden = S.vip < CONF.mods.duel.vipMin;
  const f = { cases: () => { renderCases(); renderInv(); renderCraft(); renderMarket(); }, bonus: renderBonus, event: renderEvent }[view];
  if (f) f();
}
function renderBanner() { // плашка ивента над играми
  const E = S.event, el = $('#evBanner');
  if (!E || !E.active) { el.hidden = true; return; }
  const C = CONF.mods.event, pct = Math.max(0, E.hp / C.bossHp * 100);
  el.hidden = false;
  el.innerHTML = `<span class="bf">${E.defeated ? '💀' : '🎃'}</span><div class="bt"><b>${esc(C.name)}: ${esc(C.boss)}</b>${E.mult > 1 && !E.defeated ? ' 🔥' : ''}<div class="bar"><i style="width:${pct}%"></i></div><small class="muted">${E.defeated ? 'Босс повержен! Заберите награду' : 'HP ' + money(E.hp) + ' · у вас ' + E.candy + ' 🍬'}</small></div>`;
}
$('#evBanner').onclick = () => openView('event');

/* ===================== 6. ВХОД ===================== */
$('#authTabs').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  authMode = b.dataset.m;
  $$('#authTabs button').forEach(x => x.classList.toggle('on', x === b));
  $('#authBtn').textContent = authMode === 'login' ? 'Войти' : 'Создать аккаунт';
  $('#authHint').hidden = authMode === 'login';
  $('#p').autocomplete = authMode === 'login' ? 'current-password' : 'new-password';
  $('#authErr').textContent = '';
};
async function submitAuth() {
  const user = $('#u').value.trim(), pass = $('#p').value;
  $('#authErr').textContent = ''; $('#authBtn').disabled = true;
  try {
    const j = await api(authMode, authMode === 'register' ? { user, pass, ref: REF } : { user, pass });
    session = { user: j.state.username, token: j.token };
    localStorage.setItem('lumen_session', JSON.stringify(session));
    CONF = j.config; enter(j.state);
    if (authMode === 'register') toast('Добро пожаловать! На счёте $10');
  } catch (e) { $('#authErr').textContent = e.message; }
  $('#authBtn').disabled = false;
}
$('#authBtn').onclick = submitAuth;
$('#p').onkeydown = $('#u').onkeydown = e => { if (e.key === 'Enter') submitAuth(); };
function enter(state) {
  $('#auth').hidden = true; $('#app').hidden = false;
  applyState(state);
  clearInterval(hb);
  hb = poll(async () => { if (!session || busy) return; try { applyState((await api('me')).state); } catch (e) {} }, 30000);
  buildTops(); updateDice(); openView(view);
}
function logout(silent, msg) {
  session = null; localStorage.removeItem('lumen_session');
  clearInterval(hb); clearInterval(lbTimer); clearInterval(duelTimer);
  $('#app').hidden = true; $('#auth').hidden = false; $('#p').value = '';
  if (silent === true) $('#authErr').textContent = msg || 'Сессия истекла, войдите заново';
}

/* ===================== 7. ИГРЫ ===================== */
const getBet = () => Math.round(parseFloat($('#bet').value) * 100) / 100;
const setBet = v => { $('#bet').value = Math.max(0, Math.min(CONF.maxBet, Math.floor(v * 100) / 100)); };
$('#bet').parentElement.onclick = e => {
  const c = e.target.closest('[data-c]'); if (!c) return;
  const b = getBet() || 0;
  if (c.dataset.c === 'half') setBet(Math.max(CONF.minBet, b / 2)); else if (c.dataset.c === 'x2') setBet(b * 2);
};
$('#chips').onclick = e => {
  const c = e.target.closest('.chip'); if (!c) return;
  if (c.dataset.c === 'max') setBet(S.balance); else setBet(parseFloat(c.dataset.v));
};
$('#picker').onclick = e => {
  const b = e.target.closest('.gbtn'); if (!b || busy) return;
  game = b.dataset.g;
  $$('.gbtn').forEach(x => x.classList.toggle('on', x === b));
  $$('.stage').forEach(x => x.classList.toggle('on', x.dataset.s === game));
  $('#playPanel').hidden = game === 'duels'; $('#duelsPanel').hidden = game !== 'duels';
  $('#result').className = 'result';
  syncDuels();
};
function chipGroup(sel, attr, cb) {
  $(sel).onclick = e => { const c = e.target.closest('.chip'); if (!c) return; $$(sel + ' .chip').forEach(x => x.classList.toggle('on', x === c)); cb(c.dataset[attr]); };
}
chipGroup('#rch', 't', v => { rChoice = v; $('#rnumWrap').hidden = v !== 'number'; });
chipGroup('#dmode', 'm', v => { dMode = v; updateDice(); });
chipGroup('#cch', 't', v => { cSide = v; });
$('#dt').oninput = updateDice;
function updateDice() { // шанс и выплата кубиков (формула как на сервере, RTP 97%)
  const t = +$('#dt').value, ch = dMode === 'under' ? (t - 1) / 100 : (100 - t) / 100;
  $('#dtv').textContent = (dMode === 'under' ? '< ' : '> ') + t;
  $('#dch').textContent = Math.round(ch * 100) + '%';
  $('#dml').textContent = '×' + (0.97 / ch).toFixed(2);
}

const ANIM = { // анимации ожидания ответа сервера (результат уже известен серверу)
  async slots(p) {
    const reels = $$('.reel'), t0 = Date.now();
    reels.forEach(r => r.classList.add('spin'));
    const tm = reels.map(r => setInterval(() => r.textContent = SYM[Math.random() * 5 | 0], 70));
    let j;
    try { j = await p; } catch (e) { tm.forEach(clearInterval); reels.forEach(r => r.classList.remove('spin')); throw e; }
    for (let i = 0; i < 3; i++) {
      await sleep(Math.max(0, 700 + i * 380 - (Date.now() - t0)));
      clearInterval(tm[i]); reels[i].classList.remove('spin'); reels[i].textContent = SYM[j.result.reels[i]];
    }
    return j;
  },
  async roulette(p) {
    const el = $('#rball'), t0 = Date.now();
    const tm = setInterval(() => { const n = Math.random() * 37 | 0; el.textContent = n; el.className = 'rball spin ' + colorOf(n); }, 60);
    try { const j = await p; await sleep(Math.max(0, 1500 - (Date.now() - t0))); el.textContent = j.result.number; el.className = 'rball ' + j.result.color; return j; }
    catch (e) { el.className = 'rball green'; throw e; } finally { clearInterval(tm); }
  },
  async dice(p) {
    const el = $('#droll'), t0 = Date.now();
    const tm = setInterval(() => el.textContent = (Math.random() * 100 | 0) + 1, 55);
    try { const j = await p; await sleep(Math.max(0, 1000 - (Date.now() - t0))); el.textContent = j.result.roll; return j; } finally { clearInterval(tm); }
  },
  async coin(p) {
    const el = $('#coin'), t0 = Date.now(); el.classList.add('flip');
    try { const j = await p; await sleep(Math.max(0, 1200 - (Date.now() - t0))); el.textContent = j.result.side === 'heads' ? 'О' : 'Р'; return j; } finally { el.classList.remove('flip'); }
  }
};

$('#play').onclick = async () => {
  if (busy) return;
  const bet = getBet();
  if (!(bet >= CONF.minBet)) return toast('Минимальная ставка ' + money(CONF.minBet), 'err');
  if (bet > S.balance) return toast('Недостаточно средств. Возьмите кредит или заберите бонус в разделе «Банк»', 'err');
  const params = game === 'roulette' ? { type: rChoice, number: +$('#rnum').value }
    : game === 'dice' ? { mode: dMode, target: +$('#dt').value }
    : game === 'coin' ? { side: cSide, clientSeed: rndHex() } : {};
  busy = true; $('#play').disabled = true; $('#result').className = 'result';
  const p = api('play', { game, bet, params }); p.catch(() => {});
  try {
    const prevFair = S.fairHash;
    const j = await ANIM[game](p);
    j.prevFair = prevFair;
    applyState(j.state); showResult(j);
  } catch (e) { toast(e.message, 'err'); }
  busy = false; $('#play').disabled = false;
};

function showResult(j) {
  const r = j.result, el = $('#result'), win = j.profit > 0;
  let detail = '';
  if (game === 'slots') detail = r.reels.map(i => SYM[i]).join(' ');
  else if (game === 'roulette') detail = `Выпало ${r.number} (${{ red: 'красное', black: 'чёрное', green: 'зеро' }[r.color]})`;
  else if (game === 'coin') detail = 'Выпало: ' + (r.side === 'heads' ? 'орёл' : 'решка');
  else detail = `Выпало ${r.roll}, нужно ${dMode === 'under' ? 'меньше' : 'больше'} ${$('#dt').value}`;
  let extra = '';
  if (j.fee > 0) extra += `<small>Комиссия казино: ${money(j.fee)}</small>`;
  if (j.repaid > 0) extra += `<small>На кредит автоматически ушло ${money(j.repaid)}</small>`;
  if (j.cashback > 0) extra += `<small>VIP-кэшбэк: +${money(j.cashback)}</small>`;
  if (j.income > 0) extra += `<small>Бонус роли к выигрышу: +${money(j.income)}</small>`;
  if (S.event && S.event.active) extra += `<small>🎃 Босс получил ${money(j.bet)} урона</small>`;
  if (game === 'coin') extra += '<small id="fv"></small>';
  el.className = 'result ' + (j.profit >= 0 ? 'win' : 'lose');
  el.innerHTML = (win ? `Выигрыш +${money(j.profit)}` : j.profit === 0 ? 'Ставка возвращена' : `Проигрыш −${money(-j.profit)}`) + `<small>${esc(detail)}</small>` + extra;
  if (navigator.vibrate) navigator.vibrate(win ? [40, 50, 40] : 20);
  if (game === 'coin') verifyCoin(j);
}
async function verifyCoin(j) { // клиент сам проверяет честность: хэш сида и результат
  const r = j.result, fv = $('#fv');
  try {
    const okHash = (await sha256hex(r.seed)) === j.prevFair;
    const side = parseInt((await sha256hex(r.seed + ':' + r.clientSeed + ':' + r.nonce)).slice(0, 8), 16) % 2 === 0 ? 'heads' : 'tails';
    if (fv) fv.textContent = okHash && side === r.side ? '✓ Честность подтверждена: хэш сида и результат совпали (SHA-256)' : '⚠ Проверка не сошлась';
  } catch (e) { if (fv) fv.textContent = 'Сид раскрыт: ' + r.seed; }
}

/* ===================== 8. ДУЭЛИ COINFLIP ===================== */
let dSide = 'heads', lastDuels = null;
function syncDuels() { // список комнат обновляем опросом, пока открыт экран дуэлей
  clearInterval(duelTimer); duelTimer = null;
  if (S && view === 'games' && game === 'duels') { loadDuels(); duelTimer = poll(() => { if (!busy) loadDuels(); }, 5000); }
}
async function loadDuels() { try { const j = await api('duels'); applyState(j.state); renderDuels(j.duels); } catch (e) {} }
function renderDuels(d) {
  lastDuels = d;
  $('#dList').innerHTML = d.open.length ? d.open.map(r =>
    `<li><span class="nm"><b>${r.vip ? '👑 ' : ''}${esc(r.creator)}</b><small>на ${r.side === 'heads' ? 'орла' : 'решку'} · хэш ${esc(r.hash.slice(0, 8))}…</small></span><span class="vl">${money(r.bet)}</span><button class="btn ${r.mine ? 'ghost' : ''}" data-id="${r.id}" data-a="${r.mine ? 'cancel' : 'join'}">${r.mine ? 'Отмена' : 'Играть'}</button></li>`).join('')
    : '<li class="empty">Открытых комнат нет. Создайте свою.</li>';
  $('#dRecent').innerHTML = d.recent.length ? d.recent.map((r, i) =>
    `<li><span class="nm"><b>${esc(r.winner)} победил</b><small>${esc(r.creator)} vs ${esc(r.joiner)} · ${r.flip === 'heads' ? 'орёл' : 'решка'}</small></span><span class="vl">${money(r.bet)}</span><button class="chip" data-i="${i}">Проверить</button></li>`).join('')
    : '<li class="empty">Пока пусто</li>';
}
chipGroup('#dSide', 't', v => { dSide = v; });
$('#dCreate').onclick = async () => {
  try { const j = await api('duelCreate', { bet: +$('#dBet').value, side: dSide, vip: $('#dVip').checked }); applyState(j.state); toast('Комната создана'); loadDuels(); }
  catch (e) { toast(e.message, 'err'); }
};
$('#dList').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return;
  try {
    const j = b.dataset.a === 'join' ? await api('duelJoin', { id: b.dataset.id, clientSeed: rndHex() }) : await api('duelCancel', { id: b.dataset.id });
    applyState(j.state);
    if (j.duel) {
      const d = j.duel, face = d.flip === 'heads' ? 'орёл' : 'решка';
      toast(d.youWon ? `🎉 Победа! +${money(d.payout)} (выпал ${face})` : `Проигрыш −${money(d.bet)} (выпал ${face})`, d.youWon ? 'ok' : 'err');
      if (navigator.vibrate) navigator.vibrate(d.youWon ? [40, 50, 40] : 20);
    }
    loadDuels();
  } catch (err) { toast(err.message, 'err'); }
};
$('#dRecent').onclick = async e => {
  const b = e.target.closest('[data-i]'); if (!b) return;
  const r = lastDuels.recent[+b.dataset.i];
  try {
    const h = await sha256hex(r.seed), f = parseInt((await sha256hex(r.seed + ':' + r.clientSeed + ':' + r.id)).slice(0, 8), 16) % 2 === 0 ? 'heads' : 'tails';
    const ok = h === r.hash && f === r.flip;
    toast(ok ? '✓ Честно: хэш сида и результат совпали' : '⚠ Проверка не сошлась', ok ? 'ok' : 'err');
  } catch (err) { toast('Проверка недоступна в этом браузере', 'err'); }
};

/* ===================== 9. КЕЙСЫ, ИНВЕНТАРЬ, РЫНОК, КРАФТ ===================== */
let selCase = null, selItem = null, mkt = [], craftSel = [];

// лента открытия: 40 плиток, результат на позиции 32; используется и кейсами, и кейсами ивента
function fillStrip(strip, drops, result) {
  const t = []; for (let i = 0; i < 40; i++) t.push(drops[Math.random() * drops.length | 0]);
  if (result) t[32] = result;
  strip.style.transition = 'none'; strip.style.transform = 'translateX(0)'; strip.innerHTML = t.map(dropTile).join('');
}
async function rollReel(strip, drops, result) {
  fillStrip(strip, drops, result);
  const W = strip.parentElement.clientWidth, off = -(32 * 96 + 45 - W / 2 + (Math.random() * 40 - 20));
  await sleep(40); strip.getBoundingClientRect();
  strip.style.transition = 'transform 4.2s cubic-bezier(.1,.75,.1,1)'; strip.style.transform = `translateX(${off}px)`;
  await sleep(4400);
}
function dropResultHtml(d, price) {
  const it = d.t === 'i' ? CONF.mods.items[d.a] : null, val = it ? it.v : d.a;
  return { cls: 'result ' + (val >= price ? 'win' : 'lose'), html: `Выпало: ${it ? it.e + ' ' + esc(it.n) : '🪙 ' + money(d.a)}<small>${it ? RAR(it.r) + ' · цена ' + money(it.v) : 'зачислено на баланс'}</small>` };
}

function renderCases() {
  const M = CONF.mods;
  $('#caseList').innerHTML = Object.entries(M.cases).map(([k, c]) =>
    `<button class="case ${selCase === k ? 'on' : ''}" data-k="${k}"><span class="ce">${c.e}</span><b>${esc(c.n)}</b><small>${money(c.price)}${c.minVip > S.vip ? ' · 🔒 ' + M.vip[c.minVip].n : ''}</small></button>`).join('');
  if (selCase) renderCaseStage();
}
function renderCaseStage() {
  const M = CONF.mods, c = M.cases[selCase], tk = S.inv['tk_' + selCase] || 0;
  $('#caseStage').hidden = false; $('#csTitle').textContent = c.n;
  $('#caseBuy').textContent = 'Открыть за ' + money(c.price);
  $('#caseBuy').disabled = busy || S.balance < c.price || c.minVip > S.vip;
  $('#caseTicket').hidden = !tk; $('#caseTicket').disabled = busy; $('#caseTicket').textContent = 'По билету (' + tk + ')';
  $('#caseRates').innerHTML = c.drops.map(d => `<li>${d.t === 'c' ? money(d.a) : esc(M.items[d.a].n)} — ${d.w}%</li>`).join('');
}
$('#caseList').onclick = e => {
  const b = e.target.closest('.case'); if (!b || busy) return;
  selCase = b.dataset.k; $('#caseRes').className = 'result'; renderCases(); fillStrip($('#strip'), CONF.mods.cases[selCase].drops);
};
async function openCase(ticket) {
  if (busy || !selCase) return;
  busy = true; renderCaseStage(); $('#caseRes').className = 'result';
  try {
    const j = await api('openCase', { case: selCase, ticket: !!ticket }), c = CONF.mods.cases[selCase];
    await rollReel($('#strip'), c.drops, j.drop);
    applyState(j.state);
    const r = dropResultHtml(j.drop, c.price); $('#caseRes').className = r.cls; $('#caseRes').innerHTML = r.html;
    if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
  } catch (e) { toast(e.message, 'err'); }
  busy = false; renderCaseStage();
}
$('#caseBuy').onclick = () => openCase(false);
$('#caseTicket').onclick = () => openCase(true);
bindSub('#csub', 'cs-', p => { if (p === 'market') loadMarket(); refreshUI(); });

function renderInv() {
  const inv = S.inv, M = CONF.mods, ids = Object.keys(inv).sort((a, b) => M.items[b].r - M.items[a].r);
  $('#invList').innerHTML = ids.length ? ids.map(id => itemTile(id, inv[id], selItem === id ? 'sel' : '')).join('')
    : '<p class="empty" style="grid-column:1/-1">Пусто. Откройте кейс или крутите колесо.</p>';
  const a = $('#invAct');
  if (!selItem || !inv[selItem]) { a.innerHTML = ''; return; }
  const it = M.items[selItem];
  a.innerHTML = `<div class="invact"><b>${it.e} ${esc(it.n)}</b> <span class="muted">${RAR(it.r)} · цена ${money(it.v)}</span>
    <div class="row"><button class="btn ghost" data-a="sell">Продать системе ${money(it.v * M.fees.sell)}</button>${it.k === 'title' ? `<button class="btn ghost" data-a="equip">${S.title === selItem ? 'Снять титул' : 'Надеть титул'}</button>` : ''}</div>
    <div class="row"><input id="lprice" type="number" min="0.1" step="0.1" value="${it.v}" aria-label="Цена на рынке"><button class="btn" data-a="list">На рынок</button></div></div>`;
}
$('#invList').onclick = e => { const t = e.target.closest('.it'); if (!t) return; selItem = t.dataset.id; renderInv(); };
$('#invAct').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return;
  try {
    let j;
    if (b.dataset.a === 'sell') j = await api('sellItem', { item: selItem, qty: 1 });
    if (b.dataset.a === 'equip') j = await api('equip', { item: S.title === selItem ? '' : selItem });
    if (b.dataset.a === 'list') j = await api('listItem', { item: selItem, price: +$('#lprice').value });
    if (j.market) mkt = j.market;
    applyState(j.state); toast(b.dataset.a === 'list' ? 'Лот выставлен' : 'Готово');
  } catch (err) { toast(err.message, 'err'); }
};

async function loadMarket() { try { const j = await api('market'); mkt = j.market; applyState(j.state); } catch (e) {} }
function renderMarket() {
  const M = CONF.mods;
  $('#mkNote').textContent = `Цены задают игроки. Комиссия рынка: ${Math.round(M.fees.market * 100)}% с продавца.`;
  $('#mList').innerHTML = mkt.length ? mkt.map(m => {
    const it = M.items[m.item];
    return `<li><span style="font-size:26px">${it.e}</span><span class="nm"><b>${esc(it.n)}</b><small>${RAR(it.r)} · ${esc(m.seller)}</small></span><span class="vl">${money(m.price)}</span><button class="btn ${m.mine ? 'ghost' : ''}" data-id="${m.id}" data-a="${m.mine ? 'cancel' : 'buy'}">${m.mine ? 'Снять' : 'Купить'}</button></li>`;
  }).join('') : '<li class="empty">Лотов пока нет. Выставьте предмет из инвентаря.</li>';
}
$('#mList').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return;
  try {
    const j = await api(b.dataset.a === 'buy' ? 'buyListing' : 'cancelListing', { id: b.dataset.id });
    mkt = j.market; applyState(j.state); toast(b.dataset.a === 'buy' ? 'Покупка совершена' : 'Лот снят');
  } catch (err) { toast(err.message, 'err'); loadMarket(); }
};

function renderCraft() {
  const inv = S.inv, M = CONF.mods, n = M.craft.count;
  const left = id => inv[id] - craftSel.filter(x => x === id).length;
  const avail = Object.keys(inv).filter(id => M.items[id].r >= 0 && M.items[id].r < M.rarity.length - 1 && left(id) > 0);
  $('#crInv').innerHTML = avail.map(id => itemTile(id, left(id))).join('') || '<p class="empty" style="grid-column:1/-1">Нет предметов для крафта</p>';
  $('#crSel').innerHTML = Array.from({ length: n }, (_, i) => craftSel[i] ? itemTile(craftSel[i], 1, 'pick') : '<div class="it slot"><div class="ie">＋</div></div>').join('');
  const r = craftSel.length ? M.items[craftSel[0]].r : null;
  $('#crInfo').textContent = r === null ? `Выберите ${n} предметов одной редкости — получите 1 предмет редкостью выше.` : `Шанс успеха: ${Math.round(M.craft.chance[r] * 100)}% → ${M.rarity[r + 1]}. При неудаче предметы сгорают.`;
  $('#crBtn').disabled = craftSel.length !== n;
}
$('#crInv').onclick = e => {
  const t = e.target.closest('.it'); if (!t || craftSel.length >= CONF.mods.craft.count) return;
  const id = t.dataset.id;
  if (craftSel.length && CONF.mods.items[craftSel[0]].r !== CONF.mods.items[id].r) return toast('Нужна одна редкость', 'err');
  craftSel.push(id); renderCraft();
};
$('#crSel').onclick = e => { const t = e.target.closest('.pick'); if (!t) return; craftSel.splice(craftSel.indexOf(t.dataset.id), 1); renderCraft(); };
$('#crBtn').onclick = async () => {
  try {
    const j = await api('craft', { items: craftSel }); craftSel = []; applyState(j.state);
    toast(j.craft.ok ? 'Успех! Получено: ' + CONF.mods.items[j.craft.item].n : 'Крафт не удался, предметы сгорели', j.craft.ok ? 'ok' : 'err');
  } catch (e) { toast(e.message, 'err'); }
};

/* ===================== 10. БОНУСЫ: колесо, квесты, достижения, промокод ===================== */
let wheelRot = 0, wheelBuilt = false;
function buildWheel() {
  const W = CONF.mods.wheel, seg = 360 / W.length, cols = ['#2ee59d', '#5aa9ff', '#ff7ad9', '#ffc94d', '#9b8cff', '#ff7a1a', '#f472b6', '#34d399'];
  $('#wheel').style.background = `conic-gradient(${W.map((w, i) => `${cols[i % cols.length]} ${i * seg}deg ${(i + 1) * seg}deg`).join(',')})`;
  $('#wheel').innerHTML = W.map((w, i) => `<div class="wl" style="transform:rotate(${i * seg + seg / 2}deg)"><span style="color:#0a0f0d">${w.t === 'c' ? '$' + w.a : CONF.mods.items[w.a].e}</span></div>`).join('');
}
function renderBonus() {
  const M = CONF.mods;
  if (!wheelBuilt) { buildWheel(); wheelBuilt = true; }
  tickSpin();
  $('#qList').innerHTML = M.quests.map(q => {
    const st = S.quests.find(x => x.id === q.id) || { p: 0, done: false }, pct = Math.min(100, Math.round(st.p / q.t * 100)), ready = st.p >= q.t && !st.done;
    return `<li><div class="qi"><b>${esc(q.n)}</b><span class="muted"> · ${q.evt ? 'ивент' : q.p === 'd' ? 'день' : 'неделя'}</span><div class="bar"><i style="width:${pct}%"></i></div><small class="muted">${st.p} / ${q.t} · награда: ${rewardText(q.r)}</small></div><button class="btn ${ready ? '' : 'ghost'}" data-id="${q.id}" ${ready ? '' : 'disabled'}>${st.done ? 'Получено' : 'Забрать'}</button></li>`;
  }).join('');
  $('#achList').innerHTML = M.ach.map(a => { const on = S.ach.includes(a.id); return `<div class="ach ${on ? 'on' : ''}"><span class="ie">${a.e}</span><b>${esc(a.n)}</b><small>${on ? 'получено' : '+' + money(a.r)}</small></div>`; }).join('');
}
function tickSpin() {
  if (!S || spinning) return;
  const left = spinAt - Date.now();
  $('#spinBtn').disabled = left > 0;
  $('#spinTxt').textContent = left > 0 ? `Следующее вращение через ${fmtDur(left)}` : 'Бесплатное вращение доступно!';
}
$('#spinBtn').onclick = async () => {
  if (spinning) return;
  spinning = true; $('#spinBtn').disabled = true;
  try {
    const j = await api('spin'), seg = 360 / CONF.mods.wheel.length;
    wheelRot = Math.ceil(wheelRot / 360) * 360 + 2160 + (360 - (j.spin.idx * seg + seg / 2));
    $('#wheel').style.transform = `rotate(${wheelRot}deg)`;
    await sleep(4700);
    const pz = j.spin.prize;
    spinning = false; applyState(j.state);
    toast('🎡 Приз: ' + (pz.t === 'c' ? money(pz.a) : CONF.mods.items[pz.a].e + ' ' + CONF.mods.items[pz.a].n));
  } catch (e) { spinning = false; toast(e.message, 'err'); tickSpin(); }
};
$('#qList').onclick = async e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  try { const j = await api('claimQuest', { id: b.dataset.id }); applyState(j.state); toast('Награда получена: ' + rewardText(j.quest.r)); }
  catch (err) { toast(err.message, 'err'); }
};
$('#promoBtn').onclick = async () => {
  try {
    const j = await api('promo', { code: $('#promoCode').value }); applyState(j.state); $('#promoCode').value = '';
    toast('Промокод активирован: ' + ([j.promo.reward ? money(j.promo.reward) : '', j.promo.item ? CONF.mods.items[j.promo.item].e : ''].filter(Boolean).join(' + ') || 'готово'));
  } catch (e) { toast(e.message, 'err'); }
};
bindSub('#bsub', 'bs-', () => refreshUI());

/* ===================== 11. БАНК И ПЕРЕВОДЫ ===================== */
function renderBank() {
  if (!S) return;
  const L = S.loan;
  $('#loanState').innerHTML = L
    ? `<p class="muted">Осталось вернуть</p><div class="debt">${money(L.due)}</div><p class="muted">Взято ${money(L.principal)}. Пока долг не закрыт, новый кредит недоступен.</p>`
    : `<div class="ok">Долгов нет</div><p class="muted">Выберите сумму — при возврате добавится ${Math.round(CONF.loanRate * 100)}%.</p>`;
  $('#loans').innerHTML = CONF.loanOptions.map(a =>
    `<button class="btn ghost" data-a="${a}" ${L ? 'disabled' : ''}>Взять ${money(a).replace('.00', '')}<small>вернуть ${money(a * (1 + CONF.loanRate)).replace('.00', '')}</small></button>`).join('');
  $('#repayBox').hidden = !L;
  $('#rules').innerHTML = `<li>${Math.round(CONF.autoRepay * 100)}% чистого выигрыша автоматически идёт на погашение кредита.</li><li>Погашать можно частями в любой момент.</li><li>Новый кредит — только после полного возврата старого.</li>`;
  tickBonus();
}
$('#loans').onclick = async e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  try { const j = await api('takeLoan', { amount: +b.dataset.a }); applyState(j.state); toast('Кредит выдан: ' + money(b.dataset.a)); }
  catch (err) { toast(err.message, 'err'); }
};
async function repay(amount) {
  try { const j = await api('repayLoan', { amount }); applyState(j.state); toast('Погашено ' + money(j.repaid)); $('#ramt').value = ''; }
  catch (err) { toast(err.message, 'err'); }
}
$('#repayAll').onclick = () => repay('all');
$('#repayPart').onclick = () => repay(+$('#ramt').value);
$('#bonusBtn').onclick = async () => {
  try { const j = await api('bonus'); applyState(j.state); toast('Бонус +' + money(j.bonus)); } catch (err) { toast(err.message, 'err'); }
};
function tickBonus() {
  const left = bonusAt - Date.now();
  $('#bonusBtn').disabled = left > 0;
  $('#bonusTxt').textContent = left > 0 ? `Следующий бонус через ${fmtDur(left)}.` : `Раз в сутки можно забрать ${money(CONF.dailyBonus)}. Пригодится, если баланс на нуле.`;
}
$('#xBtn').onclick = async () => {
  try {
    const j = await api('transfer', { to: $('#xto').value.trim(), amount: +$('#xamt').value }); applyState(j.state);
    toast(`Отправлено ${money(j.sent.amount)} → ${j.sent.to}`); $('#xamt').value = ''; loadTransfers();
  } catch (e) { toast(e.message, 'err'); }
};
async function loadTransfers() {
  try {
    const j = await api('transfers'); applyState(j.state);
    $('#xList').innerHTML = j.transfers.length ? j.transfers.map(t => {
      const out = t.dir === 'out';
      return `<li><span class="nm"><b>${out ? '→ ' + esc(t.to) : '← ' + esc(t.from)}</b><small>${fmtAgo(t.t)}</small></span><span class="vl" style="color:${out ? 'var(--red)' : 'var(--mint)'}">${out ? '−' : '+'}${money(t.amount)}</span></li>`;
    }).join('') : '<li class="empty">Переводов пока не было</li>';
  } catch (e) {}
}
setInterval(() => { // раз в секунду: таймеры бонуса, колеса и ивента
  if (!S) return;
  if (view === 'bank') tickBonus();
  if (view === 'bonus') tickSpin();
  if (view === 'event') { const el = $('#evLeft'); if (el) el.textContent = fmtDur(evEndAt - Date.now()); }
}, 1000);

/* ===================== 12. ТОПЫ, ИГРОКИ, ЧАТ ===================== */
let topKey = 'balance', boards = null;
const TOPS = [
  { k: 'balance', t: 'Богатейшие', f: n => money(n) },
  { k: 'hunters', t: '🎃 Охотники на босса', f: n => money(n), evt: true },
  { k: 'level', t: 'Уровни', f: (n, r) => `Ур. ${r.x.l} · ${n} XP` },
  { k: 'biggestWin', t: 'Крупнейший выигрыш', f: n => money(n) },
  { k: 'totalWon', t: 'Всего выиграно', f: n => money(n) },
  { k: 'playSeconds', t: 'Время в игре', f: n => fmtTime(n) },
  { k: 'games', t: 'Сыграно партий', f: n => String(n) },
  { k: 'refs', t: 'Рефералы', f: n => String(n) },
  { k: 'debt', t: 'Должники', f: n => money(n) }
];
const topsList = () => TOPS.filter(t => !t.evt || (S && S.event && S.event.active));
function buildTops() { $('#ttabs').innerHTML = topsList().map(t => `<button class="chip ${t.k === topKey ? 'on' : ''}" data-k="${t.k}">${t.t}</button>`).join(''); }
$('#ttabs').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; topKey = b.dataset.k; buildTops(); renderTops(); };
async function loadTops() {
  try { const j = await getJSON('action=leaderboard'); if (j.ok) { boards = j.boards; $('#poolInfo').textContent = 'Системный пул (комиссии казино): ' + money(j.pool || 0); buildTops(); renderTops(); } }
  catch (e) { if (!boards) $('#lb').innerHTML = '<li class="empty">Не удалось загрузить рейтинг</li>'; }
}
function renderTops() {
  const cfg = TOPS.find(t => t.k === topKey), list = boards && boards[topKey];
  if (!list) return;
  $('#lb').innerHTML = list.length ? list.map((r, i) =>
    `<li data-n="${esc(r.name)}" class="tap ${session && r.name.toLowerCase() === session.user.toLowerCase() ? 'you' : ''}"><span class="rk">${i + 1}</span><span class="nm"><b>${nick(r.name, r.x)} ${vipBadge(r.x)}</b></span><span class="vl">${esc(cfg.f(r.value, r))}</span></li>`).join('')
    : '<li class="empty">Здесь пока никого. Станьте первым.</li>';
}
const openFromList = e => { const li = e.target.closest('li[data-n]'); if (li) openProfile(li.dataset.n); };
$('#lb').onclick = openFromList;

let plData = null, pSort = 'seen';
async function loadPlayers() {
  try { const j = await getJSON('action=players'); if (j.ok) { plData = j.players; renderPlayers(); } }
  catch (e) { if (!plData) $('#plist').innerHTML = '<li class="empty">Не удалось загрузить список</li>'; }
}
function renderPlayers() {
  if (!plData) return;
  const q = $('#psearch').value.trim().toLowerCase();
  let l = plData.list.filter(p => p.name.toLowerCase().includes(q));
  if (pSort === 'new') l = [...l].sort((a, b) => b.createdAt - a.createdAt);
  else if (pSort === 'bal') l = [...l].sort((a, b) => b.balance - a.balance);
  $('#pcount').innerHTML = `Всего игроков: <b>${plData.total}</b> · сейчас онлайн: <b>${plData.online}</b>`;
  $('#plist').innerHTML = l.length ? l.map(p =>
    `<li data-n="${esc(p.name)}" class="tap ${session && p.name.toLowerCase() === session.user.toLowerCase() ? 'you' : ''}">${avatar(p.name)}<span class="nm"><b>${nick(p.name, p.x)} ${vipBadge(p.x)}</b><small><span class="dot ${p.online ? '' : 'off'}"></span>${p.online ? 'онлайн' : fmtAgo(p.lastSeen)} · Ур. ${p.x.l}</small></span><span class="vl">${money(p.balance)}</span></li>`).join('')
    : '<li class="empty">Никого не найдено</li>';
}
$('#psearch').oninput = renderPlayers;
chipGroup('#psort', 's', v => { pSort = v; renderPlayers(); });
$('#plist').onclick = openFromList;

let chatSig = '';
async function loadChat() { try { const j = await getJSON('action=chat'); if (j.ok) renderChat(j.chat); } catch (e) {} }
function renderChat(list) {
  const sig = JSON.stringify(list); if (sig === chatSig) return; chatSig = sig; // без новых сообщений не перерисовываем
  const box = $('#chatBox'), stick = box.scrollHeight - box.scrollTop - box.clientHeight < 60, del = can('chat.delete');
  box.innerHTML = list.length ? list.map(m =>
    `<div class="msg"><div class="mh"><b>${nick(m.name, { ro: m.role })}</b><span class="mt">${fmtDT(m.time)}</span>${del ? `<button class="chip x" data-id="${esc(m.id)}" aria-label="Удалить">✕</button>` : ''}</div><div>${esc(m.text)}</div></div>`).join('')
    : '<p class="empty">Пока тихо. Напишите первым!</p>';
  if (stick) box.scrollTop = box.scrollHeight;
}
async function sendChat() {
  const t = $('#chatIn').value.trim(); if (!t) return;
  try { await api('chatSend', { text: t }); $('#chatIn').value = ''; chatSig = ''; loadChat(); } catch (e) { toast(e.message, 'err'); }
}
$('#chatSend').onclick = sendChat;
$('#chatIn').onkeydown = e => { if (e.key === 'Enter') sendChat(); };
$('#chatBox').onclick = async e => {
  const b = e.target.closest('.x'); if (!b) return;
  try { await api('chatDelete', { id: b.dataset.id }); chatSig = ''; loadChat(); } catch (err) { toast(err.message, 'err'); }
};

/* ===================== 13. КАБИНЕТ И ПРОФИЛЬ ===================== */
async function openProfile(name) {
  const own = session && name.toLowerCase() === session.user.toLowerCase();
  openView('profile', own ? 'profile' : 'top');
  $('#profBox').innerHTML = '<div class="empty">Загрузка…</div>';
  try {
    const j = await getJSON('action=profile&name=' + encodeURIComponent(name));
    if (!j.ok) throw new Error(j.error);
    renderProfile(j.profile, own);
  } catch (e) { $('#profBox').innerHTML = '<div class="empty">' + esc(e.message || 'Не удалось загрузить профиль') + '</div>'; }
}
function renderProfile(p, own) {
  const M = CONF.mods, x = p.x || { l: 1, v: 0, t: '', ro: 'player' }, vp = M.vip[x.v];
  const wr = p.games ? Math.round(p.wins / p.games * 100) : 0;
  const rk = (ok, r, t) => `<span class="rank">${ok ? '#' + r : '—'} ${t}</span>`;
  const st = [['Баланс', money(p.balance)], ['Долг', p.debt > 0 ? money(p.debt) : 'нет'], ['Партий', p.games], ['Побед', `${p.wins} (${wr}%)`],
    ['Поставлено', money(p.totalWagered)], ['Выиграно', money(p.totalWon)], ['Лучший выигрыш', money(p.biggestWin)], ['Время в игре', fmtTime(p.playSeconds)]];
  const ti = x.t && M.items[x.t] ? `<span class="ttl">${esc(M.items[x.t].n.replace('Титул ', ''))}</span>` : '';
  let lvl;
  if (own) {
    const pct = Math.max(0, Math.min(100, Math.round((S.xp - S.xpBase) / (S.xpNext - S.xpBase) * 100))), nv = M.vip[S.vip + 1];
    lvl = `<div class="lvl"><b>Уровень ${S.level}</b> ${S.vip ? vp.e + ' ' + esc(vp.n) + ' · кэшбэк ' + (vp.cb * 100) + '%' : ''}<div class="bar"><i style="width:${pct}%"></i></div><small class="muted">${S.xp} / ${S.xpNext} XP${nv ? ' · до VIP ' + nv.n + ': ур. ' + nv.lvl : ''}</small></div>`;
  } else lvl = `<p class="muted">Уровень ${x.l} ${vp.e} ${x.v ? esc(vp.n) : ''} · достижений: ${p.ach || 0}/${M.ach.length}</p>`;
  $('#profBox').innerHTML =
    (own ? '' : '<button class="chip back" id="profBack">← К списку игроков</button>') +
    `<div class="phead">${avatar(p.name, 'big')}<div><h2 class="pname">${nick(p.name, x)}${ti}${own ? ' <small>это вы</small>' : ''}</h2>
      <p class="muted"><span class="dot ${p.online ? '' : 'off'}"></span>${p.online ? 'сейчас в игре' : 'был(а) ' + fmtAgo(p.lastSeen)} · с нами с ${fmtDate(p.createdAt)}</p></div></div>
    ${lvl}
    <div class="ranks">${rk(true, p.ranks.balance, 'по балансу')}${rk(p.totalWon > 0, p.ranks.totalWon, 'по выигрышам')}${rk(p.playSeconds > 0, p.ranks.playSeconds, 'по времени')}${rk(p.games > 0, p.ranks.games, 'по партиям')}<span class="rank" style="background:none;border-color:var(--line);color:var(--mute)">из ${p.totalPlayers}</span></div>
    <div class="stats big">${st.map(([k, v]) => `<div class="stat"><span class="muted">${k}</span><b>${esc(v)}</b></div>`).join('')}</div>
    <p class="muted gap">Процент побед: ${wr}%</p><div class="bar"><i style="width:${wr}%"></i></div>` +
    (own ? ownBlocks() : '<button class="btn full gap" id="profSend">💸 Перевести игроку</button>');
  if (!own) {
    $('#profBack').onclick = () => openView('players');
    $('#profSend').onclick = () => { $('#xto').value = p.name; openView('bank'); };
  } else { $('#profOut').onclick = () => logout(); buildThemes(); loadRefs(); loadPays(); }
}
function ownBlocks() {
  const r = roleCfg(S.role);
  let role = '';
  if (r && S.role !== 'player') {
    const bonus = [S.luck ? 'удача +' + Math.round(S.luck * 100) + '%' : '', r.incPct ? 'доход +' + Math.round(r.incPct * 100) + '%' : '', r.incFlat ? 'квесты +' + money(r.incFlat) : ''].filter(Boolean).join(' · ');
    role = `<p class="muted gap">${nick(S.username, { ro: S.role })} · ${S.roleUntil ? 'до ' + fmtDate(S.roleUntil) : 'бессрочно'}${bonus ? ' · ' + bonus : ''}</p>`;
  }
  return role + (S.perms && S.perms.length ? '<button class="btn full gap" id="profAdm">🛡️ Админ-панель</button>' : '') +
    '<div class="sect"><h2>Оформление</h2><div class="themes" id="themes"></div></div>' +
    '<div class="sect" id="payBox"><p class="muted">Загрузка…</p></div>' +
    `<div class="sect"><h2>Контакты</h2><p class="muted">Email по желанию: для связи с поддержкой.</p><div class="row"><input id="emailIn" type="text" inputmode="email" placeholder="Email (необязательно)" value="${esc(S.email || '')}"><button class="btn ghost" id="emailSave">Сохранить</button></div></div>` +
    '<div class="sect" id="refBox"><p class="muted">Загрузка рефералов…</p></div>' +
    '<button class="btn ghost full gap" id="profOut">Выйти из аккаунта</button>';
}
function buildThemes() {
  const cur = localStorage.getItem('lumen_theme') || 'auto';
  $('#themes').innerHTML = Object.entries(THEMES).map(([k, t]) => `<button class="chip ${k === cur ? 'on' : ''}" data-t="${k}">${t}</button>`).join('');
}
async function loadRefs() { try { renderRefs((await api('referrals')).refs); } catch (e) { const b = $('#refBox'); if (b) b.innerHTML = ''; } }
function renderRefs(r) {
  const b = $('#refBox'); if (!b) return;
  const link = location.href.split('?')[0].split('#')[0] + '?ref=' + r.code;
  b.innerHTML = `<h2>Реферальная программа</h2><p class="muted">Приглашайте друзей: ${+(r.pct1 * 100).toFixed(2)}% от ставок их самих (1 уровень) и ${+(r.pct2 * 100).toFixed(2)}% от ставок их приглашённых (2 уровень) зачисляются вам.</p>
    <div class="row"><input id="refLink" type="text" readonly value="${esc(link)}"><button class="btn ghost" id="refCopy">Копировать</button></div>
    <div class="stats big">${[['Приглашено (1 ур.)', r.ref1], ['2 уровень', r.ref2], ['Заработано', money(r.earned)], ['Оборот рефералов', money(r.wager1 + r.wager2)]].map(([k, v]) => `<div class="stat"><span class="muted">${k}</span><b>${esc(v)}</b></div>`).join('')}</div>
    ${r.list.length ? `<ul class="lb gap-s">${r.list.map(x => `<li data-n="${esc(x.name)}" class="tap"><span class="nm"><b>${esc(x.name)}</b><small>с ${fmtDate(x.joinedAt)}</small></span><span class="vl">${money(x.wagered)}</span></li>`).join('')}</ul>` : '<p class="hint">Пока никто не зарегистрировался по вашей ссылке.</p>'}`;
  $('#refCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(link); } catch (e) { $('#refLink').select(); document.execCommand('copy'); }
    toast('Ссылка скопирована');
  };
}
async function loadPays() { const b = $('#payBox'); if (!b) return; try { renderPays((await api('payments')).pays); } catch (e) { b.innerHTML = ''; } }
function renderPays(pays) {
  const b = $('#payBox'); if (!b) return;
  const P = CONF.mods.products;
  b.innerHTML = `<h2>Донат и привилегии</h2><p class="muted">Донат даёт только оформление: плашку «Донатер» и цвет ника. Игровой баланс и шансы за деньги не продаются.</p>
    ${CONF.mods.payReady ? `<div class="cases gap-s">${Object.entries(P).map(([id, p]) => `<button class="case" data-p="${id}"><span class="ce">💖</span><b>${esc(p.n)}</b><small>$${p.price}</small></button>`).join('')}</div>` : '<p class="hint">Приём платежей пока не подключён администратором.</p>'}
    ${pays.length ? `<h2 class="gap">История платежей</h2><ul class="lb">${pays.map(o => `<li><span class="nm"><b>${esc(P[o.product] ? P[o.product].n : o.product)} · $${o.amount}</b><small>${fmtDT(o.createdAt)} · ${PST[o.status] || o.status}</small></span>${o.status === 'pending' ? `<button class="chip" data-o="${esc(o.orderId)}">Проверить</button>` : ''}</li>`).join('')}</ul>` : ''}`;
}
$('#profBox').onclick = async e => {
  const t = e.target;
  if (t.closest('#themes .chip')) { localStorage.setItem('lumen_theme', t.closest('.chip').dataset.t); applyTheme(); buildThemes(); return; }
  if (t.closest('#profAdm')) return openView('admin', 'profile');
  if (t.closest('#emailSave')) {
    try { applyState((await api('setEmail', { email: $('#emailIn').value })).state); toast('Email сохранён'); } catch (err) { toast(err.message, 'err'); }
    return;
  }
  const prod = t.closest('#payBox [data-p]'), chk = t.closest('#payBox [data-o]');
  if (prod) {
    try { const j = await api('payCreate', { product: prod.dataset.p }); window.open(j.pay.url, '_blank'); toast('Счёт создан. После оплаты нажмите «Проверить».'); loadPays(); }
    catch (err) { toast(err.message, 'err'); }
    return;
  }
  if (chk) {
    try {
      const j = await api('payCheck', { orderId: chk.dataset.o }); applyState(j.state);
      toast(j.check.paid ? '✅ Оплата получена, роль выдана' : 'Оплата ещё не подтверждена шлюзом', j.check.paid ? 'ok' : 'err'); loadPays();
    } catch (err) { toast(err.message, 'err'); }
    return;
  }
  openFromList(e); // нажатие на приглашённого друга открывает его профиль
};

/* ===================== 14. АДМИН-ПАНЕЛЬ ===================== */
bindSub('#admTabs', 'ad-', p => { if (p === 'pays') loadAdmPays(); });
async function admSearch() { try { renderAdmList((await api('admSearch', { q: $('#admQ').value })).adm.list); } catch (e) { toast(e.message, 'err'); } }
$('#admGo').onclick = admSearch;
$('#admQ').onkeydown = e => { if (e.key === 'Enter') admSearch(); };
function renderAdmList(list) {
  $('#admList').innerHTML = list.length ? list.map(x =>
    `<li class="tap" data-uid="${x.uid}"><span class="nm"><b>${nick(x.name, { ro: x.role })} <small class="muted">#${x.uid}</small></b><small>${money(x.balance)}${x.banned ? ' · 🚫 бан' : ''}${x.muted ? ' · 🔇 мут' : ''}</small></span></li>`).join('')
    : '<li class="empty">Ничего не найдено</li>';
}
$('#admList').onclick = e => { const li = e.target.closest('li[data-uid]'); if (li) openAdmUser(+li.dataset.uid); };
async function openAdmUser(uid) { try { renderAdmCard((await api('admUser', { uid })).adm.user); } catch (e) { toast(e.message, 'err'); } }
function renderAdmCard(u) {
  const R = CONF.mods.roles, now = Date.now();
  const opts = Object.entries(R).map(([k, r]) => `<option value="${k}" ${k === u.role ? 'selected' : ''}>${esc((r.e ? r.e + ' ' : '') + r.n)}</option>`).join('');
  const frm = (t, h) => `<div class="afrm"><b>${t}</b>${h}</div>`;
  const status = (u.banUntil > now ? '🚫 бан' : '') + (u.muteUntil > now ? ' 🔇 мут' : '') || 'ок';
  const st = [['Баланс', money(u.balance)], ['Долг', u.debt ? money(u.debt) : 'нет'], ['Уровень', u.level], ['Партий / побед', u.games + ' / ' + u.wins], ['Поставлено', money(u.wagered)], ['Выиграно', money(u.won)],
    ['Роль', roleName(u.role) + (u.roleUntil ? ' до ' + fmtDate(u.roleUntil) : '')], ['Статус', status]];
  const hist = u.hist.map(h => `<li><span class="nm"><b>${esc(HT[h[1]] || h[1])}</b><small>${fmtDT(h[0])} · ${esc(h[3] || '')}</small></span><span class="vl" style="color:${h[2] < 0 ? 'var(--red)' : 'var(--mint)'}">${h[2] ? sm(h[2]) : '—'}</span></li>`).join('') || '<li class="empty">Пусто</li>';
  const logs = u.logs.map(l => `<li><span class="nm"><b>${esc(l.type)}${l.amount ? ' ' + sm(l.amount) : ''}</b><small>${fmtDT(l.t)} · ${esc(l.note)}${l.actor ? ' · ' + esc(l.actor) : ''}</small></span></li>`).join('') || '<li class="empty">Записей нет</li>';
  const pays = u.pays.map(o => `<li><span class="nm"><b>${esc(o.product)} · $${o.amount}</b><small>${fmtDT(o.createdAt)} · ${PST[o.status] || o.status}</small></span></li>`).join('');
  $('#admCard').innerHTML = `<div class="acard" data-uid="${u.uid}">
    <div class="phead gap">${avatar(u.name)}<div><h2 class="pname">${nick(u.name, { ro: u.role })} <small>#${u.uid}</small></h2><p class="muted">${esc(u.email || 'email не указан')} · с ${fmtDate(u.createdAt)} · был(а) ${fmtAgo(u.lastSeen)}</p></div></div>
    <div class="stats big">${st.map(([k, v]) => `<div class="stat"><span class="muted">${k}</span><b>${esc(v)}</b></div>`).join('')}</div>
    ${can('users.role') ? frm('Роль и привилегии', `<select id="aRole">${opts}</select><input id="aDays" type="number" min="0" placeholder="Дней (0 = навсегда)"><button class="btn" data-act="role">Выдать роль</button>`) : ''}
    ${can('users.balance') ? frm('Баланс', `<input id="aAmt" type="number" step="0.01" placeholder="Сумма (минус = списать)"><input id="aWhy" type="text" maxlength="100" placeholder="Причина (обязательно, попадёт в журнал)"><button class="btn" data-act="bal">Применить</button>`) : ''}
    ${can('users.ban') ? frm('Блокировка аккаунта', `<input id="aBanDays" type="number" min="0" placeholder="Дней (0 = навсегда)"><input id="aBanWhy" type="text" maxlength="100" placeholder="Причина"><div class="row"><button class="btn" data-act="ban">Заблокировать</button><button class="btn ghost" data-act="unban">Разблокировать</button></div>`) : ''}
    ${can('users.mute') ? frm('Мут в чате', `<input id="aMin" type="number" min="1" placeholder="Минут"><div class="row"><button class="btn" data-act="mute">Выдать мут</button><button class="btn ghost" data-act="unmute">Снять мут</button></div>`) : ''}
    <h2 class="gap">История игрока</h2><ul class="lb">${hist}</ul>
    <h2>Журнал действий</h2><ul class="lb">${logs}</ul>
    ${pays ? `<h2>Платежи</h2><ul class="lb">${pays}</ul>` : ''}</div>`;
}
$('#admCard').onclick = async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const uid = +$('#admCard .acard').dataset.uid, v = id => $(id).value;
  const map = {
    role: ['admRole', () => ({ role: v('#aRole'), days: +v('#aDays') || 0 })],
    bal: ['admBalance', () => ({ amount: +v('#aAmt'), reason: v('#aWhy') })],
    ban: ['admBan', () => ({ days: +v('#aBanDays') || 0, reason: v('#aBanWhy') })],
    unban: ['admUnban', () => ({})],
    mute: ['admMute', () => ({ minutes: +v('#aMin') || 0 })],
    unmute: ['admUnmute', () => ({})]
  }, m = map[b.dataset.act];
  if (b.dataset.act === 'ban' && !confirm('Заблокировать игрока?')) return;
  try { await api(m[0], Object.assign({ uid }, m[1]())); toast('Готово'); openAdmUser(uid); } catch (err) { toast(err.message, 'err'); }
};
async function loadAdmPays() {
  if (!can('payments.view')) { $('#admPays').innerHTML = '<li class="empty">Нет доступа к платежам</li>'; return; }
  try {
    const l = (await api('admPayments')).adm.pays, man = can('payments.manual');
    $('#admPays').innerHTML = l.length ? l.map(o => `<li><span class="nm"><b>${esc(o.product)} · $${o.amount}</b><small>#${o.uid} ${esc(o.user)} · ${fmtDT(o.createdAt)} · ${PST[o.status] || o.status}</small></span>${o.status === 'pending' && man ? `<button class="chip" data-o="${esc(o.orderId)}">Подтвердить вручную</button>` : ''}</li>`).join('') : '<li class="empty">Платежей пока нет</li>';
  } catch (e) { toast(e.message, 'err'); }
}
$('#admPays').onclick = async e => {
  const b = e.target.closest('[data-o]'); if (!b) return;
  try { await api('admPayMark', { orderId: b.dataset.o }); toast('Платёж подтверждён, роль выдана'); loadAdmPays(); } catch (err) { toast(err.message, 'err'); }
};

/* ===================== 15. ХЭЛЛОУИНСКИЙ ИВЕНТ «ТЫКВЕННАЯ НОЧЬ» =====================
   Общий босс на всех: каждый $1 ставок бьёт босса и приносит конфеты 🍬.
   Конфеты → кейсы ивента и «Зелье удачи». Когда сообщество побеждает босса — награды.
   Всё считает сервер (Code.gs → EVENT); здесь только показ. */
function renderEvent() {
  const E = S.event, C = CONF.mods.event;
  if (!E.active) {
    $('#evBoss').innerHTML = '<div class="empty">Ивент закончился. До встречи на следующий Хэллоуин! 🎃</div>';
    $('#evShop').hidden = $('#evTop').hidden = true; return;
  }
  $('#evShop').hidden = $('#evTop').hidden = false;
  const pct = Math.max(0, E.hp / C.bossHp * 100), rage = E.mult > 1 && !E.defeated, rw = C.reward;
  const it = id => CONF.mods.items[id].e + ' ' + CONF.mods.items[id].n;
  let claim = '';
  if (E.canClaim) claim = '<button class="btn big gap" id="evClaim">🎁 Забрать награду за победу</button>';
  else if (E.claimed) claim = '<p class="gap"><b>✅ Награда за победу получена</b></p>';
  else if (E.defeated) claim = `<p class="gap muted">Награда доступна тем, кто нанёс боссу хотя бы ${money(C.minDmg)} урона.</p>`;
  $('#evBoss').innerHTML = `<div class="boss">
    <div class="bossface ${E.defeated ? 'dead' : ''}">${E.defeated ? '💀' : '🎃'}</div>
    <h2>${esc(C.boss)}</h2>
    <p class="muted">${esc(C.name)} · до конца ивента <span id="evLeft">${fmtDur(E.endsIn)}</span></p>
    <div class="hpbar"><div class="hpfill" style="width:${pct}%"></div><span class="hpmark" style="left:50%"></span><span class="hpmark" style="left:25%"></span></div>
    <p><b>${E.defeated ? 'Босс повержен общими усилиями!' : money(E.hp) + ' из ' + money(C.bossHp)}</b>${rage ? ' <span class="rage">🔥 ЯРОСТЬ: конфет ×' + E.mult + '</span>' : ''}</p>
    <div class="evstats">
      <div class="stat"><span class="muted">Ваш урон</span><b>${money(E.myDmg)}</b></div>
      <div class="stat"><span class="muted">Ваши конфеты</span><b>${E.candy} 🍬</b></div>
      <div class="stat"><span class="muted">Зелье удачи</span><b>${E.buffIn ? '+' + Math.round(C.buff.luck * 100) + '% · ' + fmtDur(E.buffIn) : 'нет'}</b></div>
    </div>
    <p class="hint">Каждый $1 ставок (игры, кейсы, дуэли) бьёт босса и приносит ${C.candyPerUsd} 🍬. Ниже 50% здоровья конфет ×1.5, ниже 25% — ×2. Победа общая.</p>
    ${claim}
    <p class="hint">🏆 <b>Награда победителям:</b> ${rewardText(rw.base)} (${esc(it(rw.base.i))}). <b>Топ-3 охотников:</b> 1 место — ${rewardText(rw.ranks[0])}, 2 место — ${rewardText(rw.ranks[1])}, 3 место — ${rewardText(rw.ranks[2])}. Задания ивента — в «Бонусы → Квесты».</p>
  </div>`;
  $('#evShop').innerHTML = `<h2>🍬 Магазин конфет</h2><p class="muted">У вас ${E.candy} 🍬</p><div class="evgrid">
    ${Object.entries(C.cases).map(([k, c]) => `<div class="evcard"><span class="ce">${c.e}</span><b>${esc(c.n)}</b><small>${c.candy} 🍬</small><button class="btn" data-ev="open:${k}" ${E.candy < c.candy || busy ? 'disabled' : ''}>Открыть</button><button class="chip" data-ev="rates:${k}">Шансы</button></div>`).join('')}
    <div class="evcard"><span class="ce">🧪</span><b>Зелье удачи</b><small>${C.buff.cost} 🍬 · +${Math.round(C.buff.luck * 100)}% на час</small><button class="btn" data-ev="buff" ${E.candy < C.buff.cost || busy ? 'disabled' : ''}>Выпить</button></div>
  </div>`;
}
async function loadEvTop() {
  if (!S || !S.event || !S.event.active) return;
  try {
    const t = (await api('evBoss')).boss.top;
    $('#evTop').innerHTML = `<h2>🔦 Топ охотников</h2>` + (t.length ? `<ul class="lb">${t.map((r, i) => `<li data-n="${esc(r.name)}" class="tap ${session && r.name.toLowerCase() === session.user.toLowerCase() ? 'you' : ''}"><span class="rk">${i + 1}</span><span class="nm"><b>${nick(r.name, { ro: r.ro })}</b></span><span class="vl">${money(r.dmg)}</span></li>`).join('')}</ul>` : '<p class="empty">Пока никто не бил босса. Сделайте первую ставку!</p>');
  } catch (e) {}
}
$('#evTop').onclick = openFromList;
$('#evBoss').onclick = async e => {
  if (!e.target.closest('#evClaim')) return;
  try {
    const j = await api('evClaim'); applyState(j.state);
    const c = j.claim, parts = [rewardText(c.base)];
    if (c.extra) parts.push('топ-' + c.rank + ': ' + rewardText(c.extra));
    toast('🎁 Награда получена: ' + parts.join(' + '));
  } catch (err) { toast(err.message, 'err'); }
};
$('#evShop').onclick = async e => {
  const b = e.target.closest('[data-ev]'); if (!b || b.disabled) return;
  const [act, k] = b.dataset.ev.split(':'), C = CONF.mods.event;
  if (act === 'rates') {
    const c = C.cases[k]; $('#evStage').hidden = false; $('#evTitle').textContent = c.n;
    fillStrip($('#evStrip'), c.drops); $('#evRes').className = 'result';
    $('#evRates').innerHTML = c.drops.map(d => `<li>${d.t === 'c' ? money(d.a) : esc(CONF.mods.items[d.a].n)} — ${d.w}%</li>`).join('');
    return;
  }
  if (busy) return;
  if (act === 'buff') {
    try { const j = await api('evBuff'); applyState(j.state); toast('🧪 Зелье удачи выпито: +' + Math.round(C.buff.luck * 100) + '% удачи'); } catch (err) { toast(err.message, 'err'); }
    return;
  }
  busy = true; const c = C.cases[k];
  $('#evStage').hidden = false; $('#evTitle').textContent = c.n; $('#evRes').className = 'result';
  $('#evRates').innerHTML = c.drops.map(d => `<li>${d.t === 'c' ? money(d.a) : esc(CONF.mods.items[d.a].n)} — ${d.w}%</li>`).join('');
  try {
    const j = await api('evOpen', { case: k });
    await rollReel($('#evStrip'), c.drops, j.drop);
    busy = false; applyState(j.state);
    const r = dropResultHtml(j.drop, 3); $('#evRes').className = r.cls; $('#evRes').innerHTML = r.html;
    if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
  } catch (err) { toast(err.message, 'err'); }
  busy = false; renderEvent();
};

/* ===================== 16. ЗАПУСК ===================== */
if (REF && !session) { $('#authTabs [data-m="register"]').click(); $('#authHint').textContent = 'Вас пригласили по коду ' + REF + '. После регистрации вы получите $10 на старт.'; }
applyTheme();
(async function init() { // есть сессия — восстанавливаем вход
  if (!session) return;
  try { const j = await api('me'); CONF = j.config; enter(j.state); } catch (e) { logout(); }
})();
if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) { // установка как приложение и офлайн-оболочка
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
