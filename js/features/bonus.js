/* js/features/bonus.js
 * Бонусы: колесо фортуны, квесты, достижения, промокоды.
 */

let spinAt = 0;

let spinning = false;

bindSub('#bsub', 'bs-', () => refreshUI());

let wheelRot = 0;

let wheelBuilt = false;

const rewardText = r => [r.c ? money(r.c) : '', r.xp ? r.xp + ' XP' : '', r.i ? CONF.mods.items[r.i].e + ' ×' + (r.q || 1) : ''].filter(Boolean).join(' + ');

function buildWheel() {
  const W = CONF.mods.wheel, seg = 360 / W.length, cols = ['#6d28d9','#0891b2','#be185d','#059669','#7c3aed','#0e7490','#db2777','#b45309'];
  $('#wheel').style.background = `conic-gradient(${W.map((w, i) => `${cols[i % cols.length]} ${i * seg}deg ${(i + 1) * seg}deg`).join(',')})`;
  $('#wheel').innerHTML = W.map((w, i) => `<div class="wl" style="transform:rotate(${i * seg + seg / 2}deg)"><span>${w.t === 'c' ? '$' + w.a : CONF.mods.items[w.a].e}</span></div>`).join('');
}

function renderBonus() {
  const M = CONF.mods;
  if (!wheelBuilt) { buildWheel(); wheelBuilt = true; }
  tickSpin();
  $('#qList').innerHTML = M.quests.map(q => {
    const st = S.quests.find(x => x.id === q.id) || {p: 0, done: false}, pct = Math.min(100, Math.round(st.p / q.t * 100)), ready = st.p >= q.t && !st.done;
    return `<li><div class="qi"><b>${esc(q.n)}</b><span class="muted"> · ${q.p === 'd' ? T.msg.bonus.den : T.msg.bonus.nedelya}</span><div class="bar"><i style="width:${pct}%"></i></div><small class="muted">${st.p} / ${q.t} · награда: ${rewardText(q.r)}</small></div><button class="btn ${ready ? '' : 'ghost'}" data-id="${q.id}" ${ready ? '' : 'disabled'}>${st.done ? T.msg.bonus.polucheno : T.msg.bonus.zabrat}</button></li>`;
  }).join('');
  $('#achList').innerHTML = M.ach.map(a => { const on = S.ach.includes(a.id); return `<div class="ach ${on ? 'on' : ''}"><span class="ie">${a.e}</span><b>${esc(a.n)}</b><small>${on ? T.msg.bonus.polucheno_2 : '+' + money(a.r)}</small></div>`; }).join('');
}

function tickSpin() {
  if (!S || spinning) return;
  const left = spinAt - Date.now();
  $('#spinBtn').disabled = left > 0;
  if (left > 0) { const h = Math.floor(left / 3600000), m = Math.floor(left % 3600000 / 60000), s = Math.floor(left % 60000 / 1000); $('#spinTxt').textContent = `Следующее вращение через ${h} ч ${m} мин ${s} с`; }
  else $('#spinTxt').textContent = T.msg.bonus.besplatnoe_vraschenie_dostupno;
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
    toast(T.msg.bonus.priz + (pz.t === 'c' ? money(pz.a) : CONF.mods.items[pz.a].e + ' ' + CONF.mods.items[pz.a].n));
  } catch(e) { spinning = false; toast(e.message, 'err'); tickSpin(); }
};

$('#qList').onclick = async e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  try { const j = await api('claimQuest', {id: b.dataset.id}); applyState(j.state); toast(T.msg.bonus.nagrada_poluchena + rewardText(j.quest.r)); }
  catch(err) { toast(err.message, 'err'); }
};

$('#promoBtn').onclick = async () => {
  try {
    const j = await api('promo', {code: $('#promoCode').value}); applyState(j.state); $('#promoCode').value = '';
    toast(T.msg.bonus.promokod_aktivirovan + ([j.promo.reward ? money(j.promo.reward) : '', j.promo.item ? CONF.mods.items[j.promo.item].e : ''].filter(Boolean).join(' + ') || T.msg.bonus.gotovo));
  } catch(e) { toast(e.message, 'err'); }
};
