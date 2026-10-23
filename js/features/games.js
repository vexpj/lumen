/* js/features/games.js
 * Игры с панелью ставки: слоты, рулетка, кости, монета (Provably Fair). Результат считает сервер, здесь только показ.
 */

let game = 'slots';

let rChoice = 'red';

let dMode = 'under';

let cSide = 'heads';

function getBet(){ return Math.round(parseFloat($('#bet').value) * 100) / 100; }

function setBet(v){ $('#bet').value = Math.max(0, Math.min(CONF.maxBet, Math.floor(v*100)/100)); }

$('#bet').parentElement.onclick = e => {
  const c = e.target.closest('[data-c]'); if (!c) return;
  const b = getBet() || 0;
  if (c.dataset.c==='half') setBet(Math.max(CONF.minBet, b/2)); else if (c.dataset.c==='x2') setBet(b*2);
};

$('#chips').onclick = e => {
  const c = e.target.closest('.chip'); if (!c) return;
  if (c.dataset.c==='max') setBet(S.balance); else setBet(parseFloat(c.dataset.v));
};

$('#rch').onclick = e => {
  const c = e.target.closest('.chip'); if (!c) return;
  rChoice = c.dataset.t;
  $$('#rch .chip').forEach(x => x.classList.toggle('on', x === c));
  $('#rnumWrap').hidden = rChoice !== 'number';
};

$('#dmode').onclick = e => {
  const c = e.target.closest('.chip'); if (!c) return;
  dMode = c.dataset.m;
  $$('#dmode .chip').forEach(x => x.classList.toggle('on', x === c));
  updateDice();
};

$('#dt').oninput = updateDice;

function updateDice() {
  const t = +$('#dt').value, ch = dMode==='under' ? (t-1)/100 : (100-t)/100;
  $('#dtv').textContent = (dMode==='under' ? '< ' : '> ') + t;
  $('#dch').textContent = Math.round(ch*100) + '%';
  $('#dml').textContent = '×' + (0.97/ch).toFixed(2);
}

const ANIM = {
  async coin(p) {
    const el = $('#coin'), t0 = Date.now(); el.classList.add('flip');
    try { const j = await p; await sleep(Math.max(0, 1200 - (Date.now() - t0))); el.textContent = j.result.side==='heads' ? T.msg.games.o : T.msg.games.r; return j; }
    finally { el.classList.remove('flip'); }
  },
  async slots(p) {
    const reels = $$('.reel'), t0 = Date.now();
    reels.forEach(r => r.classList.add('spin'));
    const tm = reels.map(r => setInterval(() => r.textContent = SYM[Math.random()*5|0], 70));
    let j;
    try { j = await p; } catch(e) { tm.forEach(clearInterval); reels.forEach(r => r.classList.remove('spin')); throw e; }
    for (let i = 0; i < 3; i++) {
      await sleep(Math.max(0, 700 + i*380 - (Date.now() - t0)));
      clearInterval(tm[i]); reels[i].classList.remove('spin'); reels[i].textContent = SYM[j.result.reels[i]];
    }
    return j;
  },
  async roulette(p) {
    const el = $('#rball'), t0 = Date.now();
    const tm = setInterval(() => { const n = Math.random()*37|0; el.textContent = n; el.className = 'rball spin ' + colorOf(n); }, 60);
    try {
      const j = await p; await sleep(Math.max(0, 1500 - (Date.now() - t0)));
      el.textContent = j.result.number; el.className = 'rball ' + j.result.color; return j;
    } catch(e) { el.className = 'rball green'; throw e; }
    finally { clearInterval(tm); }
  },
  async dice(p) {
    const el = $('#droll'), t0 = Date.now();
    const tm = setInterval(() => el.textContent = (Math.random()*100|0) + 1, 55);
    try { const j = await p; await sleep(Math.max(0, 1000 - (Date.now() - t0))); el.textContent = j.result.roll; return j; }
    finally { clearInterval(tm); }
  }
};

$('#play').onclick = async () => {
  if (busy) return;
  const bet = getBet();
  if (!(bet >= CONF.minBet)) return toast(T.msg.games.minimalnaya_stavka + money(CONF.minBet), 'err');
  if (bet > S.balance) return toast(T.msg.games.nedostatochno_sredstv_vozmite_kred, 'err');
  const params = game==='roulette' ? {type:rChoice, number:+$('#rnum').value}
               : game==='dice' ? {mode:dMode, target:+$('#dt').value}
               : game==='coin' ? {side:cSide, clientSeed:rndHex()} : {};
  busy = true; $('#play').disabled = true; $('#result').className = 'result';
  const p = api('play', {game, bet, params}); p.catch(() => {});
  try {
    const prevFair = S.fairHash;
    const j = await ANIM[game](p);
    j.prevFair = prevFair;
    applyState(j.state); showResult(j);
  } catch(e) { toast(e.message, 'err'); }
  busy = false; $('#play').disabled = false;
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

$('#cch').onclick = e => {
  const c = e.target.closest('.chip'); if (!c) return;
  cSide = c.dataset.t; $$('#cch .chip').forEach(x => x.classList.toggle('on', x === c));
};

function showResult(j) {
  const r = j.result, el = $('#result'), win = j.profit > 0;
  let detail = '';
  if (game === 'slots') detail = r.reels.map(i => SYM[i]).join(' ');
  else if (game === 'roulette') detail = `Выпало ${r.number} (${{red:T.msg.games.krasnoe,black:T.msg.games.chernoe,green:T.msg.games.zero}[r.color]})`;
  else if (game === 'coin') detail = T.msg.games.vypalo + (r.side === 'heads' ? T.msg.common.orel : T.msg.common.reshka);
  else detail = `Выпало ${r.roll}, нужно ${dMode==='under'?T.msg.games.menshe:T.msg.games.bolshe} ${$('#dt').value}`;
  let extra = '';
  if (j.fee > 0) extra += `<small>Комиссия казино: ${money(j.fee)}</small>`;
  if (j.repaid > 0) extra += `<small>На кредит автоматически ушло ${money(j.repaid)}</small>`;
  if (j.cashback > 0) extra += `<small>VIP-кэшбэк: +${money(j.cashback)}</small>`;
  if (j.income > 0) extra += `<small>Бонус роли к выигрышу: +${money(j.income)}</small>`;
  if (game === 'coin') extra += '<small id="fv"></small>';
  el.className = 'result ' + (j.profit >= 0 ? 'win' : 'lose');
  el.innerHTML = (win ? `Выигрыш +${money(j.profit)}` : j.profit === 0 ? T.msg.games.stavka_vozvraschena : `Проигрыш −${money(-j.profit)}`) + `<small>${esc(detail)}</small>` + extra;
  if (navigator.vibrate) navigator.vibrate(win ? [40,50,40] : 20);
  if (game === 'coin') verifyCoin(j);
}

async function verifyCoin(j) {
  const r = j.result, fv = $('#fv');
  try {
    const okHash = (await sha256hex(r.seed)) === j.prevFair;
    const side = parseInt((await sha256hex(r.seed + ':' + r.clientSeed + ':' + r.nonce)).slice(0, 8), 16) % 2 === 0 ? 'heads' : 'tails';
    if (fv) fv.textContent = okHash && side === r.side ? T.msg.games.chestnost_podtverzhdena_hesh_sida : T.msg.common.proverka_ne_soshlas;
  } catch(e) { if (fv) fv.textContent = T.msg.games.sid_raskryt + r.seed; }
}
