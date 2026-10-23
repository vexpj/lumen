/* js/features/players.js
 * Список игроков: поиск, сортировка, открытие профиля по нажатию на ник.
 */

let plData = null;

let pSort = 'seen';

async function loadPlayers() {
  try {
    const j = await (await fetch(API_URL + '?action=players')).json();
    if (j.ok) { plData = j.players; renderPlayers(); }
  } catch(e) { if (!plData) $('#plist').innerHTML = T.msg.players.li_class_empty_ne; }
}

function renderPlayers() {
  if (!plData) return;
  const q = $('#psearch').value.trim().toLowerCase();
  let l = plData.list.filter(p => p.name.toLowerCase().includes(q));
  if (pSort === 'new') l = [...l].sort((a, b) => b.createdAt - a.createdAt);
  else if (pSort === 'bal') l = [...l].sort((a, b) => b.balance - a.balance);
  $('#pcount').innerHTML = `Всего игроков: <b>${plData.total}</b> · сейчас онлайн: <b>${plData.online}</b>`;
  $('#plist').innerHTML = l.length ? l.map(p =>
    `<li data-n="${esc(p.name)}" class="tap ${session && p.name.toLowerCase() === session.user.toLowerCase() ? 'you' : ''}">${avatar(p.name)}<span class="nm"><b>${nick(p.name, p.x)} ${vipBadge(p.x)}</b><small><span class="dot ${p.online ? '' : 'off'}" style="margin-right:4px"></span>${p.online ? T.msg.players.onlayn : fmtAgo(p.lastSeen)} · Ур. ${p.x.l}</small></span><span class="vl">${money(p.balance)}</span></li>`).join('')
    : T.msg.players.li_class_empty_nikogo;
}

$('#psearch').oninput = renderPlayers;

$('#psort').onclick = e => {
  const c = e.target.closest('.chip'); if (!c) return;
  pSort = c.dataset.s;
  $$('#psort .chip').forEach(x => x.classList.toggle('on', x === c));
  renderPlayers();
};

const openFromList = e => { const li = e.target.closest('li[data-n]'); if (li) openProfile(li.dataset.n); };

$('#plist').onclick = openFromList;
