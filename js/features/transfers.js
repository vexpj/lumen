/* js/features/transfers.js
 * Переводы между игроками и история переводов.
 */

$('#xBtn').onclick = async () => {
  try {
    const j = await api('transfer', {to: $('#xto').value.trim(), amount: +$('#xamt').value}); applyState(j.state);
    toast(`Отправлено ${money(j.sent.amount)} → ${j.sent.to}`); $('#xamt').value = ''; loadTransfers();
  } catch(e) { toast(e.message, 'err'); }
};

async function loadTransfers() {
  try {
    const j = await api('transfers'); applyState(j.state);
    $('#xList').innerHTML = j.transfers.length ? j.transfers.map(t => {
      const out = t.dir === 'out';
      return `<li><span class="nm"><b>${out ? '→ ' + esc(t.to) : '← ' + esc(t.from)}</b><small>${fmtAgo(t.t)}</small></span><span class="vl" style="color:${out ? 'var(--red)' : 'var(--mint)'}">${out ? '−' : '+'}${money(t.amount)}</span></li>`;
    }).join('') : T.msg.transfers.li_class_empty_perevodov;
  } catch(e) {}
}
