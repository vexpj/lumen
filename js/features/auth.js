/* js/features/auth.js
 * Вход, регистрация, выход, реферальная ссылка при регистрации.
 */

let authMode = 'login';

$('#authTabs').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  authMode = b.dataset.m;
  $$('#authTabs button').forEach(x => x.classList.toggle('on', x === b));
  $('#authBtn').textContent = authMode==='login' ? T.msg.auth.voyti : T.msg.auth.sozdat_akkaunt;
  $('#authHint').hidden = authMode==='login';
  $('#p').autocomplete = authMode==='login' ? 'current-password' : 'new-password';
  $('#authErr').textContent = '';
};

async function submitAuth() {
  const user = $('#u').value.trim(), pass = $('#p').value;
  $('#authErr').textContent = ''; $('#authBtn').disabled = true;
  try {
    const j = await api(authMode, authMode==='register' ? {user, pass, ref: REF} : {user, pass});
    session = {user: j.state.username, token: j.token};
    localStorage.setItem('lumen_session', JSON.stringify(session));
    CONF = j.config; enter(j.state);
    if (authMode==='register') toast(T.msg.auth.dobro_pozhalovat_na_schete, 'ok');
  } catch(e) { $('#authErr').textContent = e.message; }
  $('#authBtn').disabled = false;
}

$('#authBtn').onclick = submitAuth;

$('#p').onkeydown = $('#u').onkeydown = e => { if (e.key==='Enter') submitAuth(); };

function enter(state) {
  $('#auth').hidden = true; $('#app').hidden = false;
  applyState(state);
  clearInterval(hb);
  hb = setInterval(async () => {
    if (!session || document.hidden || busy) return;
    try { applyState((await api('me')).state); } catch(e) {}
  }, 30000);
  buildTops(); updateDice(); openView(view);
}

function logout(silent, msg) {
  session = null; localStorage.removeItem('lumen_session'); clearInterval(hb); clearInterval(lbTimer); clearInterval(duelTimer);
  $('#app').hidden = true; $('#auth').hidden = false; $('#p').value = '';
  if (silent === true) $('#authErr').textContent = msg || T.msg.auth.sessiya_istekla_voydite_zanovo;
}

$('#logout').onclick = () => logout();

const REF = (new URLSearchParams(location.search).get('ref') || (function(){ try { return localStorage.getItem('lumen_ref'); } catch(e) { return ''; } })() || '').toUpperCase();

if (REF) { try { localStorage.setItem('lumen_ref', REF); } catch(e) {} }

if (REF && !session) { $('#authTabs [data-m="register"]').click(); $('#authHint').textContent = T.msg.auth.vas_priglasili_po_kodu + REF + T.msg.auth.posle_registratsii_vy_poluchite; }
