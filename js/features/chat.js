/* js/features/chat.js
 * Общий чат.
 */

async function loadChat() {
  try { const j = await (await fetch(API_URL + '?action=chat')).json(); if (j.ok) renderChat(j.chat); } catch(e) {}
}

function renderChat(list) {
  const box = $('#chatBox'), stick = box.scrollHeight - box.scrollTop - box.clientHeight < 60, del = can('chat.delete');
  box.innerHTML = list.length ? list.map(m =>
    `<div class="msg"><div class="mh"><b>${nick(m.name, {ro: m.role})}</b><span class="mt">${fmtDT(m.time)}</span>${del ? `<button class="chip x" data-id="${esc(m.id)}" aria-label="Удалить">✕</button>` : ''}</div><div>${esc(m.text)}</div></div>`).join('')
    : T.msg.chat.p_class_empty_poka;
  if (stick) box.scrollTop = box.scrollHeight;
}

async function sendChat() {
  const t = $('#chatIn').value.trim(); if (!t) return;
  try { await api('chatSend', {text: t}); $('#chatIn').value = ''; loadChat(); } catch(e) { toast(e.message, 'err'); }
}

$('#chatSend').onclick = sendChat;

$('#chatIn').onkeydown = e => { if (e.key === 'Enter') sendChat(); };

$('#chatBox').onclick = async e => {
  const b = e.target.closest('.x'); if (!b) return;
  try { await api('chatDelete', {id: b.dataset.id}); loadChat(); } catch(err) { toast(err.message, 'err'); }
};
