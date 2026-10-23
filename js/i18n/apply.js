/* js/i18n/apply.js
 * Подставляет тексты из T.ui в разметку: [data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label].
 */
function tx(path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), T.ui); }

function applyTexts(root) {
  root = root || document;
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const v = tx(el.getAttribute('data-i18n'));
    if (v === undefined) console.warn('Нет текста для ключа', el.getAttribute('data-i18n'));
    else el.textContent = v;
  });
  ['placeholder', 'title', 'aria-label'].forEach(attr => {
    root.querySelectorAll('[data-i18n-' + attr + ']').forEach(el => {
      const v = tx(el.getAttribute('data-i18n-' + attr));
      if (v !== undefined) el.setAttribute(attr, v);
    });
  });
}

applyTexts();
