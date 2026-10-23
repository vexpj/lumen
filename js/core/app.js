/* js/core/app.js
 * Ядро интерфейса: навигация между экранами, применение состояния игрока, подвкладки.
 */

$('#nav').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.v === 'profile') openProfile(session.user); else openView(b.dataset.v);
};

function openView(v, navKey) {
  if (v === 'admin' && !(S && S.perms && S.perms.length)) return;
  view = v;
  const nk = navKey || ({players: 'top', chat: 'top', admin: 'profile'}[v] || v);
  $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === nk));
  $$('.view').forEach(x => x.classList.toggle('on', x.id === 'v-' + v));
  clearInterval(lbTimer);
  if (v === 'top') { loadTops(); lbTimer = setInterval(loadTops, 30000); }
  if (v === 'players') { loadPlayers(); lbTimer = setInterval(loadPlayers, 30000); }
  if (v === 'chat') { loadChat(); lbTimer = setInterval(loadChat, 5000); }
  if (v === 'bank') loadTransfers();
  refreshUI(); syncDuels();
  window.scrollTo({top: 0});
}

function buildSeg() {
  $$('.seg').forEach(el => {
    const a = el.dataset.a;
    el.innerHTML = [['top',T.msg.app.topy],['players',T.msg.app.igroki],['chat',T.msg.app.chat]].map(([k,t]) => `<button class="chip ${a===k?'on':''}" data-v="${k}">${t}</button>`).join('');
    el.onclick = e => { const b = e.target.closest('.chip'); if (b) openView(b.dataset.v); };
  });
}

buildSeg();

function applyState(s) {
  const prev = S ? S.balance : s.balance, pl = S ? S.level : s.level;
  S = s;
  $('#bal').textContent = money(s.balance);
  $('#uname').textContent = s.username;
  $('#lv').textContent = T.msg.app.ur + s.level + (s.vip ? ' ' + CONF.mods.vip[s.vip].e : '');
  $('#fairHash').textContent = s.fairHash.slice(0, 14) + '…';
  $('#feeNote').textContent = T.msg.app.komissiya_kazino + Math.round(CONF.houseEdge * 100) + T.msg.app.s_chistogo_vyigrysha_idet;
  const X = CONF.mods.xfer;
  $('#xInfo').textContent = `От ${money(X.MIN)} до ${money(X.MAX)} за раз, до ${money(X.DAILY)} в сутки. Доступно после ставок на ${money(X.MIN_WAGERED)}.`;
  if (s.balance !== prev) { const b = $('#bal'); b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 300); }
  if (s.level > pl) toast(T.msg.app.novyy_uroven + s.level);
  bonusAt = Date.now() + s.bonusIn; spinAt = Date.now() + s.spinIn;
  renderBank(); refreshUI();
}

function refreshUI() {
  if (!S || !CONF.mods) return;
  $('#dVipWrap').hidden = S.vip < CONF.mods.duel.vipMin;
  if (view === 'cases') { renderCases(); renderInv(); renderCraft(); renderMarket(); }
  if (view === 'bonus') renderBonus();
}

function bindSub(barId, prefix, cb) {
  $(barId).onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$(barId + ' .chip').forEach(x => x.classList.toggle('on', x === b));
    $$('[id^="' + prefix + '"]').forEach(x => x.classList.toggle('on', x.id === prefix + b.dataset.p));
    if (cb) cb(b.dataset.p);
  };
}
