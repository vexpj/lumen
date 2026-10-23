/* js/features/market.js
 * Рынок игроков: список лотов, покупка, снятие.
 */

let mkt = [];

async function loadMarket() {
  try { const j = await api('market'); mkt = j.market; applyState(j.state); } catch(e) {}
}

function renderMarket() {
  const M = CONF.mods;
  $('#mkNote').textContent = `Цены задают игроки. Комиссия рынка: ${Math.round(M.fees.market * 100)}% с продавца.`;
  $('#mList').innerHTML = mkt.length ? mkt.map(m => {
    const it = M.items[m.item];
    return `<li><span style="font-size:26px">${it.e}</span><span class="nm"><b>${esc(it.n)}</b><small>${RAR(it.r)} · ${esc(m.seller)}</small></span><span class="vl">${money(m.price)}</span><button class="btn ${m.mine ? 'ghost' : ''}" data-id="${m.id}" data-a="${m.mine ? 'cancel' : 'buy'}">${m.mine ? T.msg.market.snyat : T.msg.market.kupit}</button></li>`;
  }).join('') : T.msg.market.li_class_empty_lotov;
}

$('#mList').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return;
  try {
    const j = await api(b.dataset.a === 'buy' ? 'buyListing' : 'cancelListing', {id: b.dataset.id});
    mkt = j.market; applyState(j.state); toast(b.dataset.a === 'buy' ? T.msg.market.pokupka_sovershena : T.msg.market.lot_snyat);
  } catch(err) { toast(err.message, 'err'); loadMarket(); }
};
