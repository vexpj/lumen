/* js/features/cases.js
 * Кейсы: выбор, лента с анимацией открытия, шансы выпадения.
 */

bindSub('#csub', 'cs-', p => { if (p === 'market') loadMarket(); refreshUI(); });

let selCase = null;

function renderCases() {
  const M = CONF.mods;
  $('#caseList').innerHTML = Object.entries(M.cases).map(([k, c]) =>
    `<button class="case ${selCase === k ? 'on' : ''}" data-k="${k}"><span class="ce">${c.e}</span><b>${esc(c.n)}</b><small>${money(c.price)}${c.minVip > S.vip ? ' · 🔒 ' + M.vip[c.minVip].n : ''}</small></button>`).join('');
  if (selCase) renderCaseStage();
}

function renderCaseStage() {
  const M = CONF.mods, c = M.cases[selCase], tk = S.inv['tk_' + selCase] || 0;
  $('#caseStage').hidden = false; $('#csTitle').textContent = c.n;
  $('#caseBuy').textContent = T.msg.cases.otkryt_za + money(c.price);
  $('#caseBuy').disabled = busy || S.balance < c.price || c.minVip > S.vip;
  $('#caseTicket').hidden = !tk; $('#caseTicket').disabled = busy; $('#caseTicket').textContent = T.msg.cases.po_biletu + tk + ')';
  $('#caseRates').innerHTML = c.drops.map(d => `<li>${d.t === 'c' ? money(d.a) : esc(M.items[d.a].n)} — ${d.w}%</li>`).join('');
}

function fillStrip(c, result) {
  const t = []; for (let i = 0; i < 40; i++) t.push(c.drops[Math.random() * c.drops.length | 0]);
  if (result) t[32] = result;
  const s = $('#strip'); s.style.transition = 'none'; s.style.transform = 'translateX(0)'; s.innerHTML = t.map(dropTile).join('');
}

$('#caseList').onclick = e => {
  const b = e.target.closest('.case'); if (!b || busy) return;
  selCase = b.dataset.k; $('#caseRes').className = 'result'; renderCases(); fillStrip(CONF.mods.cases[selCase]);
};

async function openCase(ticket) {
  if (busy || !selCase) return;
  busy = true; renderCaseStage(); $('#caseRes').className = 'result';
  try {
    const j = await api('openCase', {case: selCase, ticket: !!ticket});
    const c = CONF.mods.cases[selCase], d = j.drop;
    fillStrip(c, d);
    const strip = $('#strip'), W = $('.reelwrap').clientWidth, off = -(32 * 96 + 45 - W / 2 + (Math.random() * 40 - 20));
    await sleep(40); strip.getBoundingClientRect();
    strip.style.transition = 'transform 4.2s cubic-bezier(.1,.75,.1,1)'; strip.style.transform = `translateX(${off}px)`;
    await sleep(4400);
    applyState(j.state);
    const it = d.t === 'i' ? CONF.mods.items[d.a] : null, val = it ? it.v : d.a;
    $('#caseRes').className = 'result ' + (val >= c.price ? 'win' : 'lose');
    $('#caseRes').innerHTML = `Выпало: ${it ? it.e + ' ' + esc(it.n) : '🪙 ' + money(d.a)}<small>${it ? RAR(it.r) + T.msg.cases.tsena + money(it.v) : T.msg.cases.zachisleno_na_balans}</small>`;
    if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
  } catch(e) { toast(e.message, 'err'); }
  busy = false; renderCaseStage();
}

$('#caseBuy').onclick = () => openCase(false);

$('#caseTicket').onclick = () => openCase(true);
