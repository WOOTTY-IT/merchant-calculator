import test from 'node:test';
import assert from 'node:assert/strict';

function makeEl(id) {
  const cls = new Set();
  const el = {
    id, value: '', textContent: '', style: {}, dataset: {}, _html: '',
    children: [], listeners: {}, onclick: null,
    classList: {
      toggle(name, force) {
        const want = force === undefined ? !cls.has(name) : !!force;
        if (want) cls.add(name); else cls.delete(name);
      },
      add(name) { if (name) cls.add(name); },
      remove(name) { cls.delete(name); },
      contains(name) { return cls.has(name); },
    },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    appendChild(child) { this.children.push(child); },
    click() { if (this.onclick) this.onclick(); },
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return this._html; },
    set(v) { this._html = v; this.children = []; },
  });
  return el;
}

const els = new Map();
const el = (id) => {
  if (!els.has(id)) els.set(id, makeEl(id));
  return els.get(id);
};

const groups = new Map();
function makeGroup(selector, attrs) {
  const list = attrs.map((attr, i) => {
    const e = makeEl(selector + i);
    Object.assign(e.dataset, attr);
    return e;
  });
  groups.set(selector, list);
  return list;
}
const discBtns = makeGroup('[data-discmode]', [{ discmode: 'percent' }, { discmode: 'cash' }]);
const pctBtns = makeGroup('#pctTabs .tab', [{ pct: 'of' }, { pct: 'add' }, { pct: 'reduce' }]);
const tabBtns = makeGroup('#tabs .tab', [{ tab: 'calc' }, { tab: 'discount' }, { tab: 'pricing' }, { tab: 'cash' }, { tab: 'percent' }]);
const sections = ['calc', 'discount', 'pricing', 'cash', 'percent'].map((id) => {
  const e = makeEl('section-' + id);
  e.id = id;
  if (id === 'calc') e.classList.add('active');
  return e;
});
groups.set('.tab-content', sections);
sections.forEach((e) => els.set(e.id, e));

globalThis.document = {
  getElementById: el,
  querySelectorAll: (selector) => groups.get(selector) || [],
  documentElement: { lang: 'en' },
  createElement: (tag) => makeEl(tag),
};
if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  };
}

localStorage.setItem('merchant-calculator-lang', 'en');
await import('./app.js');

test('calculator evaluates percent expression and records tape', () => {
  el('calcExpr').value = '100-15%';
  el('calcBtn').onclick();
  assert.equal(el('calcResult').textContent, '85.00');
  const tape = JSON.parse(localStorage.getItem('merchant-calculator-tape'));
  assert.equal(tape[0].expr, '100-15%');
  assert.equal(tape[0].res, 85);
  assert.equal(el('tape').children.length, 1);
  el('tape').children[0].onclick();
  assert.equal(el('calcExpr').value, '100-15%');
});

test('calculator shows localized errors and clears', () => {
  el('calcExpr').value = '1/0';
  el('calcBtn').onclick();
  assert.equal(el('calcResult').textContent, 'Cannot divide by zero');
  el('calcClear').onclick();
  assert.equal(el('calcResult').textContent, '0');
  assert.equal(el('calcExpr').value, '');
});

test('keyboard Enter triggers calculate', () => {
  el('calcExpr').value = '12*12';
  el('calcExpr').listeners.keydown({ key: 'Enter' });
  assert.equal(el('calcResult').textContent, '144.00');
});

test('discount clamps cash off at zero price', () => {
  el('discPrice').value = '100';
  discBtns[1].onclick();
  el('discCash').value = '150';
  el('discCalc').onclick();
  assert.equal(el('discPay').textContent, '0.00');
  assert.equal(el('discSave').textContent, '100.00');
});

test('discount percent keeps both outputs in sync', () => {
  discBtns[0].onclick();
  el('discPrice').value = '199';
  el('discPct').value = '15';
  el('discCalc').onclick();
  assert.equal(el('discPay').textContent, '169.15');
  assert.equal(el('discSave').textContent, '29.85');
});

test('pricing shows error on every output field', () => {
  el('priceCost').value = 'abc';
  el('priceCalc').onclick();
  for (const id of ['priceSell', 'priceFeeAmt', 'priceProfit', 'priceVatAmt', 'priceInclVat']) {
    assert.equal(el(id).textContent, 'Check the numbers');
  }
});

test('pricing computes full breakdown', () => {
  el('priceCost').value = '100';
  el('priceMarkup').value = '0';
  el('priceMargin').value = '20';
  el('priceFee').value = '2.5';
  el('priceVat').value = '7';
  el('priceCalc').onclick();
  assert.equal(el('priceSell').textContent, '125.00');
  assert.equal(el('priceFeeAmt').textContent, '3.13');
  assert.equal(el('priceProfit').textContent, '21.87');
  assert.equal(el('priceVatAmt').textContent, '8.75');
  assert.equal(el('priceInclVat').textContent, '133.75');
});

test('cash change and quick-cash buttons', () => {
  el('cashTotal').value = '735.5';
  el('cashReceived').value = '1000';
  el('cashCalc').onclick();
  assert.equal(el('cashChange').textContent, '264.50');
  const quick = el('quickCash').children;
  assert.equal(quick.length, 6);
  el('cashTotal').value = '35';
  quick[1].onclick();
  assert.equal(el('cashReceived').value, '50');
  assert.equal(el('cashChange').textContent, '15.00');
  el('cashTotal').value = '99999';
  quick[0].onclick();
  assert.equal(el('cashMsg').textContent, 'Short by 99,979.00');
});

test('percent tab modes', () => {
  el('pctAmount').value = '200';
  el('pctPct').value = '15';
  el('pctCalc').onclick();
  assert.equal(el('pctResult').textContent, '30.00');
  pctBtns[1].onclick();
  el('pctCalc').onclick();
  assert.equal(el('pctResult').textContent, '230.00');
  pctBtns[2].onclick();
  el('pctCalc').onclick();
  assert.equal(el('pctResult').textContent, '170.00');
});

test('main tabs switch active section', () => {
  tabBtns[2].onclick();
  assert.equal(tabBtns[2].classList.contains('active'), true);
  assert.equal(tabBtns[0].classList.contains('active'), false);
  assert.equal(el('pricing').classList.contains('active'), true);
  assert.equal(el('calc').classList.contains('active'), false);
});

test('language switch persists and translates at runtime', async () => {
  const { setLang, translate, getLang } = await import('./i18n/index.js');
  setLang('th');
  assert.equal(getLang(), 'th');
  assert.equal(translate('tab.calc'), 'เครื่องคิด');
  assert.equal(localStorage.getItem('merchant-calculator-lang'), 'th');
  el('langSelect').value = 'th';
  el('langSelect').onchange();
  setLang('en');
  assert.equal(translate('tab.calc'), 'Calculator');
});
