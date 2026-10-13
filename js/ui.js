import { formatMoney } from './core/tools.js';
import { getLang, setLang, translate } from './i18n/index.js';

export function t(key) {
  return translate(key);
}

export function el(id) {
  return document.getElementById(id);
}

export function show(id, text) {
  el(id).textContent = text;
}

export function moneyStr(n) {
  return formatMoney(n);
}

export function errMsg(e) {
  const code = e && e.code ? 'error.' + e.code : '';
  const msg = code ? translate(code) : '';
  return msg && msg !== code ? msg : t('error.generic');
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]
  ));
}

export function toggleGroup(selector, active) {
  document.querySelectorAll(selector).forEach((b) => {
    b.classList.toggle('active', b === active);
  });
}

export function initTabs() {
  document.querySelectorAll('#tabs .tab').forEach((btn) => {
    btn.onclick = () => {
      toggleGroup('#tabs .tab', btn);
      document.querySelectorAll('.tab-content').forEach((sec) => {
        sec.classList.toggle('active', sec.id === btn.dataset.tab);
      });
    };
  });
}

export function initLang() {
  const sel = el('langSelect');
  sel.value = getLang();
  sel.onchange = () => setLang(sel.value);
}
