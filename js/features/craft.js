/* js/features/craft.js
 * Крафт: объединение 5 предметов одной редкости.
 */

let craftSel = [];

function renderCraft() {
  const inv = S.inv, M = CONF.mods, n = M.craft.count;
  const left = id => inv[id] - craftSel.filter(x => x === id).length;
  const avail = Object.keys(inv).filter(id => M.items[id].r >= 0 && M.items[id].r < M.rarity.length - 1 && left(id) > 0);
  $('#crInv').innerHTML = avail.map(id => itemTile(id, left(id))).join('') || T.msg.craft.p_class_empty_style;
  $('#crSel').innerHTML = Array.from({length: n}, (_, i) => craftSel[i] ? itemTile(craftSel[i], 1, 'pick') : '<div class="it slot"><div class="ie">＋</div></div>').join('');
  const r = craftSel.length ? M.items[craftSel[0]].r : null;
  $('#crInfo').textContent = r === null ? `Выберите ${n} предметов одной редкости — получите 1 предмет редкостью выше.` : `Шанс успеха: ${Math.round(M.craft.chance[r] * 100)}% → ${M.rarity[r + 1]}. При неудаче предметы сгорают.`;
  $('#crBtn').disabled = craftSel.length !== n;
}

$('#crInv').onclick = e => {
  const t = e.target.closest('.it'); if (!t || craftSel.length >= CONF.mods.craft.count) return;
  const id = t.dataset.id;
  if (craftSel.length && CONF.mods.items[craftSel[0]].r !== CONF.mods.items[id].r) return toast(T.msg.craft.nuzhna_odna_redkost, 'err');
  craftSel.push(id); renderCraft();
};

$('#crSel').onclick = e => { const t = e.target.closest('.pick'); if (!t) return; craftSel.splice(craftSel.indexOf(t.dataset.id), 1); renderCraft(); };

$('#crBtn').onclick = async () => {
  try {
    const j = await api('craft', {items: craftSel}); craftSel = []; applyState(j.state);
    toast(j.craft.ok ? T.msg.craft.uspeh_polucheno + CONF.mods.items[j.craft.item].n : T.msg.craft.kraft_ne_udalsya_predmety, j.craft.ok ? 'ok' : 'err');
  } catch(e) { toast(e.message, 'err'); }
};
