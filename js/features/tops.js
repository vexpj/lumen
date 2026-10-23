/* js/features/tops.js
 * Топы: рейтинги по деньгам, уровням, времени и т. д.
 */

let topKey = 'balance';

function buildTops() {
  $('#ttabs').innerHTML = TOPS.map(t => `<button class="chip ${t.k===topKey?'on':''}" data-k="${t.k}">${t.t}</button>`).join('');
}

$('#ttabs').onclick = e => {
  const b = e.target.closest('.chip'); if (!b) return;
  topKey = b.dataset.k; buildTops(); renderTops();
};

$('#lb').onclick = openFromList;

const TOPS = [
  {k:'balance',t:T.msg.tops.bogateyshie,f:n=>money(n)},
  {k:'level',t:T.msg.tops.urovni,f:(n,r)=>`Ур. ${r.x.l} · ${n} XP`},
  {k:'biggestWin',t:T.msg.tops.krupneyshiy_vyigrysh,f:n=>money(n)},
  {k:'totalWon',t:T.msg.tops.vsego_vyigrano,f:n=>money(n)},
  {k:'playSeconds',t:T.msg.common.vremya_v_igre,f:n=>fmtTime(n)},
  {k:'games',t:T.msg.tops.sygrano_partiy,f:n=>String(n)},
  {k:'refs',t:T.msg.tops.referaly,f:n=>String(n)},
  {k:'debt',t:T.msg.tops.dolzhniki,f:n=>money(n)}
];

let boards = null;

async function loadTops() {
  try {
    const j = await (await fetch(API_URL + '?action=leaderboard')).json();
    if (j.ok) { boards = j.boards; $('#poolInfo').textContent = T.msg.tops.sistemnyy_pul_komissii_kazino + money(j.pool || 0); renderTops(); }
  } catch(e) { if (!boards) $('#lb').innerHTML = T.msg.tops.li_class_empty_ne; }
}

function renderTops() {
  const cfg = TOPS.find(t => t.k === topKey), list = boards && boards[topKey];
  if (!list) return;
  $('#lb').innerHTML = list.length ? list.map((r, i) =>
    `<li data-n="${esc(r.name)}" class="tap ${session && r.name.toLowerCase()===session.user.toLowerCase()?'you':''}"><span class="rk">${i+1}</span><span class="nm"><b>${nick(r.name, r.x)} ${vipBadge(r.x)}</b></span><span class="vl">${esc(cfg.f(r.value, r))}</span></li>`).join('')
    : T.msg.tops.li_class_empty_zdes;
}
