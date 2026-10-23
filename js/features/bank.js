/* js/features/bank.js
 * Банк: кредиты, погашение, ежедневный бонус.
 */

let bonusAt = 0;

function renderBank() {
  if (!S) return;
  const L = S.loan;
  $('#loanState').innerHTML = L
    ? `<p class="muted">Осталось вернуть</p><div class="debt">${money(L.due)}</div><p class="muted">Взято ${money(L.principal)}. Пока долг не закрыт, новый кредит недоступен.</p>`
    : `<div class="ok">Долгов нет</div><p class="muted">Выберите сумму — при возврате добавится ${Math.round(CONF.loanRate*100)}%.</p>`;
  $('#loans').innerHTML = CONF.loanOptions.map(a =>
    `<button class="btn ghost" data-a="${a}" ${L?'disabled':''}>Взять ${money(a).replace('.00','')}<small>вернуть ${money(a*(1+CONF.loanRate)).replace('.00','')}</small></button>`).join('');
  $('#repayBox').hidden = !L;
  $('#rules').innerHTML = `<li>${Math.round(CONF.autoRepay*100)}% чистого выигрыша автоматически идёт на погашение кредита.</li><li>Погашать можно частями в любой момент.</li><li>Новый кредит — только после полного возврата старого.</li>`;
  tickBonus();
}

$('#loans').onclick = async e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  try { const j = await api('takeLoan', {amount: +b.dataset.a}); applyState(j.state); toast(T.msg.bank.kredit_vydan + money(b.dataset.a)); }
  catch(err) { toast(err.message, 'err'); }
};

async function repay(amount) {
  try { const j = await api('repayLoan', {amount}); applyState(j.state); toast(T.msg.bank.pogasheno + money(j.repaid)); $('#ramt').value = ''; }
  catch(err) { toast(err.message, 'err'); }
}

$('#repayAll').onclick = () => repay('all');

$('#repayPart').onclick = () => repay(+$('#ramt').value);

$('#bonusBtn').onclick = async () => {
  try { const j = await api('bonus'); applyState(j.state); toast(T.msg.bank.bonus + money(j.bonus)); }
  catch(err) { toast(err.message, 'err'); }
};

function tickBonus() {
  const left = bonusAt - Date.now(), b = $('#bonusBtn');
  b.disabled = left > 0;
  if (left > 0) {
    const h = Math.floor(left/3600000), m = Math.floor(left%3600000/60000), s = Math.floor(left%60000/1000);
    $('#bonusTxt').textContent = `Следующий бонус через ${h} ч ${m} мин ${s} с.`;
  } else $('#bonusTxt').textContent = `Раз в сутки можно забрать ${money(CONF.dailyBonus)}. Пригодится, если баланс на нуле.`;
}

setInterval(() => { if (!S) return; if (view==='bank') tickBonus(); if (view==='bonus') tickSpin(); }, 1000);
