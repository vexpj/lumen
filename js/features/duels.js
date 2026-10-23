/* js/features/duels.js
 * Дуэли Coinflip между игроками: комнаты, опрос списка каждые 4 секунды, проверка честности.
 */

let duelTimer = null;

let dSide = 'heads';

let lastDuels = null;

function syncDuels() {
  clearInterval(duelTimer); duelTimer = null;
  if (S && view === 'games' && game === 'duels') {
    loadDuels();
    duelTimer = setInterval(() => { if (!document.hidden && !busy) loadDuels(); }, 4000); // опрос вместо WebSocket
  }
}

async function loadDuels() {
  try { const j = await api('duels'); applyState(j.state); renderDuels(j.duels); } catch(e) {}
}

function renderDuels(d) {
  lastDuels = d;
  $('#dList').innerHTML = d.open.length ? d.open.map(r =>
    `<li><span class="nm"><b>${r.vip ? '👑 ' : ''}${esc(r.creator)}</b><small>на ${r.side === 'heads' ? T.msg.duels.orla : T.msg.duels.reshku} · хэш ${esc(r.hash.slice(0, 8))}…</small></span><span class="vl">${money(r.bet)}</span><button class="btn ${r.mine ? 'ghost' : ''}" data-id="${r.id}" data-a="${r.mine ? 'cancel' : 'join'}">${r.mine ? T.msg.duels.otmena : T.msg.duels.igrat}</button></li>`).join('')
    : T.msg.duels.li_class_empty_otkrytyh;
  $('#dRecent').innerHTML = d.recent.length ? d.recent.map((r, i) =>
    `<li><span class="nm"><b>${esc(r.winner)} победил</b><small>${esc(r.creator)} vs ${esc(r.joiner)} · ${r.flip === 'heads' ? T.msg.common.orel : T.msg.common.reshka}</small></span><span class="vl">${money(r.bet)}</span><button class="chip" data-i="${i}">Проверить</button></li>`).join('')
    : T.msg.duels.li_class_empty_poka;
}

$('#dSide').onclick = e => {
  const c = e.target.closest('.chip'); if (!c) return;
  dSide = c.dataset.t; $$('#dSide .chip').forEach(x => x.classList.toggle('on', x === c));
};

$('#dCreate').onclick = async () => {
  try { const j = await api('duelCreate', {bet: +$('#dBet').value, side: dSide, vip: $('#dVip').checked}); applyState(j.state); toast(T.msg.duels.komnata_sozdana); loadDuels(); }
  catch(e) { toast(e.message, 'err'); }
};

$('#dList').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return;
  try {
    const j = b.dataset.a === 'join' ? await api('duelJoin', {id: b.dataset.id, clientSeed: rndHex()}) : await api('duelCancel', {id: b.dataset.id});
    applyState(j.state);
    if (j.duel) {
      const d = j.duel, face = d.flip === 'heads' ? T.msg.common.orel : T.msg.common.reshka;
      toast(d.youWon ? `🎉 Победа! +${money(d.payout)} (выпал ${face})` : `Проигрыш −${money(d.bet)} (выпал ${face})`, d.youWon ? 'ok' : 'err');
      if (navigator.vibrate) navigator.vibrate(d.youWon ? [40,50,40] : 20);
    }
    loadDuels();
  } catch(err) { toast(err.message, 'err'); }
};

$('#dRecent').onclick = async e => {
  const b = e.target.closest('[data-i]'); if (!b) return;
  const r = lastDuels.recent[+b.dataset.i];
  try {
    const h = await sha256hex(r.seed), f = parseInt((await sha256hex(r.seed + ':' + r.clientSeed + ':' + r.id)).slice(0, 8), 16) % 2 === 0 ? 'heads' : 'tails';
    const ok = h === r.hash && f === r.flip;
    toast(ok ? T.msg.duels.chestno_hesh_sida_i : T.msg.common.proverka_ne_soshlas, ok ? 'ok' : 'err');
  } catch(err) { toast(T.msg.duels.proverka_nedostupna_v_etom, 'err'); }
};
