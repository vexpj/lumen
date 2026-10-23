/* js/features/items.js
 * Общая плитка предмета и плитка дропа (используются в кейсах, инвентаре, рынке, крафте).
 */

const dropTile = d => d.t === 'c'
  ? `<div class="it ${d.a >= 10 ? 'r3' : d.a >= 3 ? 'r2' : d.a >= 1 ? 'r1' : 'r0'}"><div class="ie">🪙</div><b>${money(d.a)}</b></div>`
  : itemTile(d.a, 1);

function itemTile(id, n, extra) {
  const it = CONF.mods.items[id], rc = it.r < 0 ? 'rt' : 'r' + it.r;
  return `<div class="it ${rc} ${extra || ''}" data-id="${id}">${n > 1 ? `<span class="cn">×${n}</span>` : ''}<div class="ie">${it.e}</div><b>${esc(it.n)}</b><small class="muted">${money(it.v)}</small></div>`;
}
