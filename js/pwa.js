/* js/pwa.js
 * Регистрация service worker (установка как приложение, офлайн-оболочка).
 */

if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
