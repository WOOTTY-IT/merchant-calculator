import en from './en.js';
import th from './th.js';

const dicts = { en, th };
const STORAGE_KEY = 'merchant-calculator-lang';

function detect() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const lang = (nav.languages && nav.languages[0]) || nav.language || 'en';
  return lang.toLowerCase().startsWith('th') ? 'th' : 'en';
}

let current = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || detect();

export function getLang() {
  return current;
}

export function setLang(code) {
  if (!dicts[code]) return;
  current = code;
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, code);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = current;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = translate(key);
    });
  }
}

export function translate(key) {
  const d = dicts[current];
  if (d[key]) return d[key];
  return dicts.en[key] || key;
}

if (typeof document !== 'undefined') {
  setLang(current);
}
