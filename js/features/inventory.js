/* js/features/inventory.js
 * Инвентарь: продажа системе, титулы, выставление на рынок.
 */

let selItem = null;

function renderInv() {
  const inv = S.inv, M = CONF.mods, ids = Object.keys(inv).sort((a, b) => M.items[b].r - M.items[a].r);
  $('#invList').innerHTML = ids.length ? ids.map(id => itemTile(id, inv[id], selItem === id ? 'sel' : '')).join('')
    : T.msg.inventory.p_class_empty_style;
  const a = $('#invAct');
  if (!selItem || !inv[selItem]) { a.innerHTML = ''; return; }
  const it = M.items[selItem];
  a.innerHTML = `<div class="invact"><b>${it.e} ${esc(it.n)}</b> <span class="muted">${RAR(it.r)} · цена ${money(it.v)}</span>
    <div class="row"><button class="btn ghost" data-a="sell">Продать системе ${money(it.v * M.fees.sell)}</button>${it.k === 'title' ? `<button class="btn ghost" data-a="equip">${S.title === selItem ? T.msg.inventory.snyat_titul : T.msg.inventory.nadet_titul}</button>` : ''}</div>
    <div class="row"><input id="lprice" type="number" min="0.1" step="0.1" value="${it.v}" aria-label="Цена на рынке"><button class="btn" data-a="list">На рынок</button></div></div>`;
}

$('#invList').onclick = e => { const t = e.target.closest('.it'); if (!t) return; selItem = t.dataset.id; renderInv(); };

$('#invAct').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return;
  try {
    let j;
    if (b.dataset.a === 'sell') j = await api('sellItem', {item: selItem, qty: 1});
    if (b.dataset.a === 'equip') j = await api('equip', {item: S.title === selItem ? '' : selItem});
    if (b.dataset.a === 'list') j = await api('listItem', {item: selItem, price: +$('#lprice').value});
    if (j.market) mkt = j.market;
    applyState(j.state); toast(b.dataset.a === 'list' ? T.msg.inventory.lot_vystavlen : T.msg.common.gotovo);
  } catch(err) { toast(err.message, 'err'); }
};
