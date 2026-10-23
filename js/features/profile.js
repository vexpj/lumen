/* js/features/profile.js
 * Кабинет и профиль: статистика, уровень, рефералы, донаты, email.
 */

async function openProfile(name) {
  const own = session && name.toLowerCase() === session.user.toLowerCase();
  openView('profile', own ? 'profile' : 'players');
  $('#profBox').innerHTML = T.msg.profile.div_class_empty_zagruzka;
  try {
    const j = await (await fetch(API_URL + '?action=profile&name=' + encodeURIComponent(name))).json();
    if (!j.ok) throw new Error(j.error);
    renderProfile(j.profile, own);
  } catch(e) { $('#profBox').innerHTML = '<div class="empty">' + esc(e.message || T.msg.profile.ne_udalos_zagruzit_profil) + '</div>'; }
}

function renderProfile(p, own) {
  const M = CONF.mods, x = p.x || {l:1, v:0, t:''}, vp = M.vip[x.v];
  const wr = p.games ? Math.round(p.wins / p.games * 100) : 0;
  const rk = (ok, r, t) => `<span class="rank">${ok ? '#' + r : '—'} ${t}</span>`;
  const st = [[T.msg.common.balans, money(p.balance)], [T.msg.common.dolg, p.debt > 0 ? money(p.debt) : T.msg.common.net], [T.msg.profile.partiy, p.games], [T.msg.profile.pobed, `${p.wins} (${wr}%)`],
    [T.msg.common.postavleno, money(p.totalWagered)], [T.msg.common.vyigrano, money(p.totalWon)], [T.msg.profile.luchshiy_vyigrysh, money(p.biggestWin)], [T.msg.common.vremya_v_igre, fmtTime(p.playSeconds)]];
  const ti = x.t && M.items[x.t] ? `<span class="ttl">${esc(M.items[x.t].n.replace(T.msg.profile.titul, ''))}</span>` : '';
  let lvl;
  if (own) {
    const pct = Math.max(0, Math.min(100, Math.round((S.xp - S.xpBase) / (S.xpNext - S.xpBase) * 100))), nv = M.vip[S.vip + 1];
    lvl = `<div class="lvl"><b>Уровень ${S.level}</b> ${S.vip ? vp.e + ' ' + esc(vp.n) + T.msg.profile.keshbek + (vp.cb * 100) + '%' : ''}<div class="bar"><i style="width:${pct}%"></i></div><small class="muted">${S.xp} / ${S.xpNext} XP${nv ? T.msg.profile.do_vip + nv.n + T.msg.profile.ur + nv.lvl : ''}</small></div>`;
  } else lvl = `<p class="muted" style="margin:0 0 14px">Уровень ${x.l} ${vp.e} ${x.v ? esc(vp.n) : ''} · достижений: ${p.ach || 0}/${M.ach.length}</p>`;
  $('#profBox').innerHTML =
    (own ? '' : T.msg.profile.button_class_chip_back) +
    `<div class="phead">${avatar(p.name, 'big')}<div><h2 class="disp pname">${nick(p.name, x)}${ti}${own ? T.msg.profile.small_eto_vy_small : ''}</h2>
      <p class="muted"><span class="dot ${p.online ? '' : 'off'}"></span>${p.online ? T.msg.profile.seychas_v_igre : T.msg.profile.byl_a + fmtAgo(p.lastSeen)} · с нами с ${fmtDate(p.createdAt)}</p></div></div>
    ${lvl}
    <div class="ranks">${rk(true, p.ranks.balance, T.msg.profile.po_balansu)}${rk(p.totalWon > 0, p.ranks.totalWon, T.msg.profile.po_vyigrysham)}${rk(p.playSeconds > 0, p.ranks.playSeconds, T.msg.profile.po_vremeni)}${rk(p.games > 0, p.ranks.games, T.msg.profile.po_partiyam)}<span class="rank" style="background:rgba(255,255,255,.06);border-color:var(--line)">из ${p.totalPlayers}</span></div>
    <div class="stats big">${st.map(([k, v]) => `<div class="stat"><span class="muted">${k}</span><b>${esc(v)}</b></div>`).join('')}</div>
    <p class="muted" style="margin-top:16px">Процент побед: ${wr}%</p><div class="bar"><i style="width:${wr}%"></i></div>` +
    (own ? `<ul class="feat"><li>Кэшбэк с проигрышей зависит от VIP и выплачивается из системного пула.</li><li>VIP-кейс — с ${M.vip[M.cases.gold.minVip].n}, приватные дуэли — с ${M.vip[M.duel.vipMin].n}.</li></ul>${ownBlocks()}<div class="sect" id="refBox"><p class="muted">Загрузка рефералов…</p></div><button class="btn ghost" id="profOut" style="margin-top:20px">Выйти из аккаунта</button>`
           : T.msg.profile.button_class_btn_id);
  const g = id => $(id);
  if (g('#profBack')) g('#profBack').onclick = () => openView('players');
  if (g('#profOut')) g('#profOut').onclick = () => logout();
  if (g('#profSend')) g('#profSend').onclick = () => { $('#xto').value = p.name; openView('bank'); };
  if (own) { loadRefs(); loadPays(); }
}

async function loadRefs() {
  try { renderRefs((await api('referrals')).refs); } catch(e) { const b = $('#refBox'); if (b) b.innerHTML = ''; }
}

function renderRefs(r) {
  const b = $('#refBox'); if (!b) return;
  const link = location.href.split('?')[0].split('#')[0] + '?ref=' + r.code;
  b.innerHTML = `<h2>Реферальная программа</h2><p class="muted">Приглашайте друзей: ${+(r.pct1 * 100).toFixed(2)}% от ставок их самих (1 уровень) и ${+(r.pct2 * 100).toFixed(2)}% от ставок их приглашённых (2 уровень) зачисляются вам.</p>
    <div class="row"><input id="refLink" type="text" readonly value="${esc(link)}"><button class="btn ghost" id="refCopy" style="flex:none">Копировать</button></div>
    <div class="stats big" style="margin-top:12px">${[[T.msg.profile.priglasheno_1_ur, r.ref1], [T.msg.profile.k2_uroven, r.ref2], [T.msg.profile.zarabotano, money(r.earned)], [T.msg.profile.oborot_referalov, money(r.wager1 + r.wager2)]].map(([k, v]) => `<div class="stat"><span class="muted">${k}</span><b>${esc(v)}</b></div>`).join('')}</div>
    ${r.list.length ? `<ul class="lb" style="margin-top:12px">${r.list.map(x => `<li data-n="${esc(x.name)}" class="tap"><span class="nm"><b>${esc(x.name)}</b><small>с ${fmtDate(x.joinedAt)}</small></span><span class="vl">${money(x.wagered)}</span></li>`).join('')}</ul>` : T.msg.profile.p_class_hint_poka}`;
  $('#refCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(link); } catch(e) { $('#refLink').select(); document.execCommand('copy'); }
    toast(T.msg.profile.ssylka_skopirovana);
  };
}

$('#profBox').onclick = openFromList;

function ownBlocks() {
  const r = roleCfg(S.role);
  let role = '';
  if (r && S.role !== 'player') {
    const bonus = [S.luck ? T.msg.profile.udacha + Math.round(S.luck * 100) + '%' : '', r.incPct ? T.msg.profile.dohod + Math.round(r.incPct * 100) + '%' : '', r.incFlat ? T.msg.profile.kvesty + money(r.incFlat) : ''].filter(Boolean).join(' · ');
    role = `<p class="muted" style="margin:14px 0 0">${nick(S.username, {ro: S.role})} · ${S.roleUntil ? T.msg.profile.do + fmtDate(S.roleUntil) : T.msg.profile.bessrochno}${bonus ? ' · ' + bonus : ''}</p>`;
  }
  return role + (S.perms && S.perms.length ? T.msg.profile.button_class_btn_id_2 : '') +
    T.msg.profile.div_class_sect_id +
    `<div class="sect"><h2>Контакты</h2><p class="muted">Email по желанию: для связи с поддержкой.</p><div class="row"><input id="emailIn" type="text" inputmode="email" placeholder="Email (необязательно)" value="${esc(S.email || '')}"><button class="btn ghost" id="emailSave" style="flex:none">Сохранить</button></div></div>`;
}

async function loadPays() {
  const b = $('#payBox'); if (!b) return;
  try { renderPays((await api('payments')).pays); } catch(e) { b.innerHTML = ''; }
}

function renderPays(pays) {
  const b = $('#payBox'); if (!b) return;
  const P = CONF.mods.products;
  b.innerHTML = `<h2>Донат и привилегии</h2><p class="muted">Донат даёт только оформление: плашку «Донатер» и цвет ника. Игровой баланс и шансы за деньги не продаются.</p>
    ${CONF.mods.payReady ? `<div class="cases" style="margin-top:12px">${Object.entries(P).map(([id, p]) => `<button class="case" data-p="${id}"><span class="ce">💖</span><b>${esc(p.n)}</b><small>$${p.price}</small></button>`).join('')}</div>` : T.msg.profile.p_class_hint_priem}
    ${pays.length ? `<h2 style="margin-top:16px">История платежей</h2><ul class="lb">${pays.map(o => `<li><span class="nm"><b>${esc(P[o.product] ? P[o.product].n : o.product)} · $${o.amount}</b><small>${fmtDT(o.createdAt)} · ${PST[o.status] || o.status}</small></span>${o.status === 'pending' ? `<button class="chip" data-o="${esc(o.orderId)}">Проверить</button>` : ''}</li>`).join('')}</ul>` : ''}`;
}

$('#profBox').addEventListener('click', async e => {
  const t = e.target;
  if (t.closest('#profAdm')) return openView('admin', 'profile');
  if (t.closest('#emailSave')) {
    try { applyState((await api('setEmail', {email: $('#emailIn').value})).state); toast(T.msg.profile.email_sohranen); } catch(err) { toast(err.message, 'err'); }
    return;
  }
  const prod = t.closest('#payBox [data-p]'), chk = t.closest('#payBox [data-o]');
  if (prod) {
    try { const j = await api('payCreate', {product: prod.dataset.p}); window.open(j.pay.url, '_blank'); toast(T.msg.profile.schet_sozdan_posle_oplaty); loadPays(); }
    catch(err) { toast(err.message, 'err'); }
  } else if (chk) {
    try {
      const j = await api('payCheck', {orderId: chk.dataset.o}); applyState(j.state);
      toast(j.check.paid ? T.msg.profile.oplata_poluchena_rol_vydana : T.msg.profile.oplata_esche_ne_podtverzhdena, j.check.paid ? 'ok' : 'err'); loadPays();
    } catch(err) { toast(err.message, 'err'); }
  }
});
