/* js/core/utils.js
 * Утилиты: выбор элементов ($), форматирование денег/времени/дат, аватары, плашки ролей, хэш SHA-256.
 */

const $ = s => document.querySelector(s);

const $$ = s => [...document.querySelectorAll(s)];

const sleep = ms => new Promise(r => setTimeout(r, ms));

const money = n => '$' + Number(n).toFixed(2);

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function fmtTime(s){const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?`${h} ч ${m} мин`:m?`${m} мин`:`${s} сек`}

const colorOf = n => n===0?'green':REDS.includes(n)?'red':'black';

const fmtDate = ts => ts ? new Date(ts).toLocaleDateString('ru-RU', {day:'numeric', month:'short', year:'numeric'}) : '—';

function fmtAgo(ts) {
  const d = Math.max(0, (Date.now() - ts) / 1000);
  if (!ts) return T.msg.utils.davno;
  if (d < 120) return T.msg.utils.tolko_chto;
  if (d < 3600) return Math.floor(d/60) + T.msg.utils.min_nazad;
  if (d < 86400) return Math.floor(d/3600) + T.msg.utils.ch_nazad;
  return Math.floor(d/86400) + T.msg.utils.dn_nazad;
}

const hue = s => { let h = 0; for (const c of s) h = (h*31 + c.charCodeAt(0)) % 360; return h; };

const avatar = (n, cls='') => `<span class="av ${cls}" style="background:linear-gradient(135deg,hsl(${hue(n)},85%,62%),hsl(${(hue(n)+55)%360},85%,42%))">${esc([...n][0].toUpperCase())}</span>`;

const vipBadge = x => x && x.v > 0 ? CONF.mods.vip[x.v].e : '';

const RAR = r => r < 0 ? T.msg.utils.bilet : CONF.mods.rarity[r];

const rndHex = () => 'k' + [...crypto.getRandomValues(new Uint8Array(8))].map(x => x.toString(16).padStart(2,'0')).join('');

async function sha256hex(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('');
}

const roleCfg = ro => CONF.mods && CONF.mods.roles && CONF.mods.roles[ro];

function nick(name, x) { // ник цвета роли + плашка статуса
  const r = x && x.ro ? roleCfg(x.ro) : null, col = r && r.color ? r.color : '';
  return `<span class="nk"${col ? ` style="color:${col}"` : ''}>${esc(name)}</span>${r && r.e ? `<span class="rb" style="color:${col};border-color:${col}">${r.e} ${esc(r.n)}</span>` : ''}`;
}

const roleName = id => (roleCfg(id) || {n: id}).n;

const fmtDT = ts => ts ? new Date(ts).toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) : '—';

const sm = n => (n < 0 ? '−' : '+') + money(Math.abs(n));

const can = p => !!(S && S.perms && (S.perms.includes('*') || S.perms.includes(p)));

const HT = {bet:T.msg.utils.stavka, case:T.msg.utils.keys, duel:T.msg.utils.duel, loan:T.msg.utils.kredit, repay:T.msg.utils.pogashenie, xfer:T.msg.utils.perevod, promo:T.msg.utils.promokod, mkt:T.msg.utils.rynok, adm:T.msg.utils.admin, pay:T.msg.utils.platezh};

const PST = {pending:T.msg.utils.ozhidaet_oplaty, paid:T.msg.utils.oplachen};
