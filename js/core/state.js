/* js/core/state.js
 * Глобальное состояние приложения: сессия, данные игрока (S), конфиг сервера (CONF), текущий экран.
 */

let session = null;

try { session = JSON.parse(localStorage.getItem('lumen_session')); } catch(e) {}

let S = null;

let CONF = {loanOptions:[10,25,50,100],loanRate:.3,autoRepay:.3,minBet:.1,maxBet:1000,dailyBonus:5};

let busy = false;

let hb = null;

let lbTimer = null;

let view = 'games';
