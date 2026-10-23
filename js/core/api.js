/* js/core/api.js
 * Клиент API (все запросы идут POST на Google Apps Script) и уведомления (toast).
 */

async function api(action, data={}) {
  if (API_URL.startsWith('PASTE')) throw new Error(T.msg.api.ukazhite_url_veb_prilozheniya);
  const body = {action, ...data};
  if (session && !('user' in data)) { body.user = session.user; body.token = session.token; }
  let j;
  try {
    const res = await fetch(API_URL, {method:'POST', body:JSON.stringify(body)}); // text/plain: без CORS-preflight
    j = await res.json();
  } catch(e) { throw new Error(T.msg.api.net_svyazi_s_serverom); }
  if (!j.ok) {
    if (/Сессия истекла|заблокирован/.test(j.error||'')) logout(true, /заблокирован/.test(j.error) ? j.error : undefined);
    throw new Error(j.error || T.msg.api.oshibka_servera);
  }
  if (j.newAch) j.newAch.forEach(a => toast('🏆 ' + a.n + ' · +' + money(a.r)));
  return j;
}

function toast(msg, type='ok') {
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3600);
}
