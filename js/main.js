/* js/main.js
 * Точка входа: при наличии сессии восстанавливает вход.
 */

(async function init() {
  if (!session) return;
  try { const j = await api('me'); CONF = j.config || CONF; enter(j.state); }
  catch(e) { logout(); }
})();
