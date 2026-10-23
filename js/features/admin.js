/* js/features/admin.js
 * Админ-панель: поиск игроков, роли, баланс, бан/мут, платежи. Все права проверяются на сервере.
 */

bindSub('#admTabs', 'ad-', p => { if (p === 'pays') loadAdmPays(); });

async function admSearch() {
  try { renderAdmList((await api('admSearch', {q: $('#admQ').value})).adm.list); } catch(e) { toast(e.message, 'err'); }
}

$('#admGo').onclick = admSearch;

$('#admQ').onkeydown = e => { if (e.key === 'Enter') admSearch(); };

function renderAdmList(list) {
  $('#admList').innerHTML = list.length ? list.map(x =>
    `<li class="tap" data-uid="${x.uid}"><span class="nm"><b>${nick(x.name, {ro: x.role})} <small class="muted">#${x.uid}</small></b><small>${money(x.balance)}${x.banned ? T.msg.admin.ban : ''}${x.muted ? T.msg.admin.mut : ''}</small></span></li>`).join('')
    : T.msg.admin.li_class_empty_nichego;
}

$('#admList').onclick = e => { const li = e.target.closest('li[data-uid]'); if (li) openAdmUser(+li.dataset.uid); };

async function openAdmUser(uid) {
  try { renderAdmCard((await api('admUser', {uid})).adm.user); } catch(e) { toast(e.message, 'err'); }
}

function renderAdmCard(u) {
  const R = CONF.mods.roles, now = Date.now();
  const opts = Object.entries(R).map(([k, r]) => `<option value="${k}" ${k === u.role ? 'selected' : ''}>${esc((r.e ? r.e + ' ' : '') + r.n)}</option>`).join('');
  const frm = (t, h) => `<div class="afrm"><b>${t}</b>${h}</div>`;
  const status = (u.banUntil > now ? T.msg.admin.ban_2 : '') + (u.muteUntil > now ? T.msg.admin.mut_2 : '') || T.msg.admin.ok;
  const st = [[T.msg.common.balans, money(u.balance)], [T.msg.common.dolg, u.debt ? money(u.debt) : T.msg.common.net], [T.msg.admin.uroven, u.level], [T.msg.admin.partiy_pobed, u.games + ' / ' + u.wins], [T.msg.common.postavleno, money(u.wagered)], [T.msg.common.vyigrano, money(u.won)],
    [T.msg.admin.rol, roleName(u.role) + (u.roleUntil ? T.msg.admin.do + fmtDate(u.roleUntil) : '')], [T.msg.admin.status, status]];
  const hist = u.hist.map(h => `<li><span class="nm"><b>${esc(HT[h[1]] || h[1])}</b><small>${fmtDT(h[0])} · ${esc(h[3] || '')}</small></span><span class="vl" style="color:${h[2] < 0 ? 'var(--red)' : 'var(--mint)'}">${h[2] ? sm(h[2]) : '—'}</span></li>`).join('') || T.msg.admin.li_class_empty_pusto;
  const logs = u.logs.map(l => `<li><span class="nm"><b>${esc(l.type)}${l.amount ? ' ' + sm(l.amount) : ''}</b><small>${fmtDT(l.t)} · ${esc(l.note)}${l.actor ? ' · ' + esc(l.actor) : ''}</small></span></li>`).join('') || T.msg.admin.li_class_empty_zapisey;
  const pays = u.pays.map(o => `<li><span class="nm"><b>${esc(o.product)} · $${o.amount}</b><small>${fmtDT(o.createdAt)} · ${PST[o.status] || o.status}</small></span></li>`).join('');
  $('#admCard').innerHTML = `<div class="acard" data-uid="${u.uid}">
    <div class="phead" style="margin:18px 0 10px">${avatar(u.name)}<div><h2 class="disp pname">${nick(u.name, {ro: u.role})} <small>#${u.uid}</small></h2><p class="muted">${esc(u.email || T.msg.admin.email_ne_ukazan)} · с ${fmtDate(u.createdAt)} · был(а) ${fmtAgo(u.lastSeen)}</p></div></div>
    <div class="stats big">${st.map(([k, v]) => `<div class="stat"><span class="muted">${k}</span><b>${esc(v)}</b></div>`).join('')}</div>
    ${can('users.role') ? frm(T.msg.admin.rol_i_privilegii, `<select id="aRole">${opts}</select><input id="aDays" type="number" min="0" placeholder="Дней (0 = навсегда)"><button class="btn" data-act="role">Выдать роль</button>`) : ''}
    ${can('users.balance') ? frm(T.msg.common.balans, T.msg.admin.input_id_aamt_type) : ''}
    ${can('users.ban') ? frm(T.msg.admin.blokirovka_akkaunta, T.msg.admin.input_id_abandays_type) : ''}
    ${can('users.mute') ? frm(T.msg.admin.mut_v_chate, T.msg.admin.input_id_amin_type) : ''}
    <h2 style="margin-top:18px">История игрока</h2><ul class="lb">${hist}</ul>
    <h2>Журнал действий</h2><ul class="lb">${logs}</ul>
    ${pays ? `<h2>Платежи</h2><ul class="lb">${pays}</ul>` : ''}</div>`;
}

$('#admCard').onclick = async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const uid = +$('#admCard .acard').dataset.uid, v = id => $(id).value;
  const map = {
    role: ['admRole', () => ({role: v('#aRole'), days: +v('#aDays') || 0})],
    bal: ['admBalance', () => ({amount: +v('#aAmt'), reason: v('#aWhy')})],
    ban: ['admBan', () => ({days: +v('#aBanDays') || 0, reason: v('#aBanWhy')})],
    unban: ['admUnban', () => ({})],
    mute: ['admMute', () => ({minutes: +v('#aMin') || 0})],
    unmute: ['admUnmute', () => ({})]
  }, m = map[b.dataset.act];
  if (b.dataset.act === 'ban' && !confirm(T.msg.admin.zablokirovat_igroka)) return;
  try { await api(m[0], Object.assign({uid}, m[1]())); toast(T.msg.common.gotovo); openAdmUser(uid); } catch(err) { toast(err.message, 'err'); }
};

async function loadAdmPays() {
  if (!can('payments.view')) { $('#admPays').innerHTML = T.msg.admin.li_class_empty_net; return; }
  try {
    const l = (await api('admPayments')).adm.pays, man = can('payments.manual');
    $('#admPays').innerHTML = l.length ? l.map(o => `<li><span class="nm"><b>${esc(o.product)} · $${o.amount}</b><small>#${o.uid} ${esc(o.user)} · ${fmtDT(o.createdAt)} · ${PST[o.status] || o.status}</small></span>${o.status === 'pending' && man ? `<button class="chip" data-o="${esc(o.orderId)}">Подтвердить вручную</button>` : ''}</li>`).join('') : T.msg.admin.li_class_empty_platezhey;
  } catch(e) { toast(e.message, 'err'); }
}

$('#admPays').onclick = async e => {
  const b = e.target.closest('[data-o]'); if (!b) return;
  try { await api('admPayMark', {orderId: b.dataset.o}); toast(T.msg.admin.platezh_podtverzhden_rol_vydana); loadAdmPays(); } catch(err) { toast(err.message, 'err'); }
};
