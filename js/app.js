import { evaluate, round2 } from './core/calc.js';
import {
  discountPercent, discountCash,
  marginPrice, markupPrice, platformFee, profitOf, withVat,
  percentOf, addPercent, reducePercent,
  changeDue, formatMoney,
} from './core/tools.js';
import { t, el, show, moneyStr, errMsg, toggleGroup, initTabs, initLang } from './ui.js';
import { renderTape, pushTape } from './tape.js';

const PRICE_OUT = ['priceSell', 'priceFeeAmt', 'priceProfit', 'priceVatAmt', 'priceInclVat'];

function num(id) {
  const v = Number(el(id).value || 0);
  return Number.isFinite(v) ? v : NaN;
}

function initCalc() {
  const input = el('calcExpr');
  el('calcBtn').onclick = () => {
    try {
      const res = round2(evaluate(input.value || ''));
      show('calcResult', moneyStr(res));
      pushTape(input.value, res);
    } catch (e) {
      show('calcResult', errMsg(e));
    }
  };
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') el('calcBtn').click();
  });
  el('calcCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(el('calcResult').textContent); } catch (e) {}
  };
  el('calcClear').onclick = () => {
    input.value = '';
    show('calcResult', '0');
  };
}

function initDiscount() {
  let mode = 'percent';
  document.querySelectorAll('[data-discmode]').forEach((b) => {
    b.onclick = () => {
      toggleGroup('[data-discmode]', b);
      mode = b.dataset.discmode;
      el('discPctRow').style.display = mode === 'percent' ? 'flex' : 'none';
      el('discCashRow').style.display = mode === 'cash' ? 'flex' : 'none';
    };
  });
  el('discCalc').onclick = () => {
    const price = num('discPrice');
    try {
      const rate = mode === 'percent' ? num('discPct') : num('discCash');
      const pay = mode === 'percent' ? discountPercent(price, rate) : discountCash(price, rate);
      show('discPay', moneyStr(pay));
      show('discSave', moneyStr(round2(price - pay)));
    } catch (e) {
      show('discPay', errMsg(e));
      show('discSave', '—');
    }
  };
}

function initPricing() {
  el('priceCalc').onclick = () => {
    const cost = num('priceCost');
    const markup = num('priceMarkup');
    const margin = num('priceMargin');
    const fee = num('priceFee');
    const vat = num('priceVat');
    try {
      const sell = margin > 0 ? marginPrice(cost, margin)
        : markup > 0 ? markupPrice(cost, markup) : cost;
      show('priceSell', moneyStr(sell));
      show('priceFeeAmt', moneyStr(platformFee(sell, fee)));
      show('priceProfit', moneyStr(profitOf(sell, cost, fee)));
      show('priceVatAmt', moneyStr(percentOf(sell, vat)));
      show('priceInclVat', moneyStr(withVat(sell, vat)));
    } catch (e) {
      PRICE_OUT.forEach((id) => show(id, errMsg(e)));
    }
  };
}

const QUICK = [20, 50, 100, 500, 1000, 5000];

function calcCash() {
  try {
    const chg = changeDue(num('cashReceived'), num('cashTotal'));
    show('cashChange', moneyStr(chg));
    const msg = el('cashMsg');
    if (chg < 0) msg.textContent = t('cash.short') + ' ' + moneyStr(Math.abs(chg));
    else if (chg === 0) msg.textContent = t('cash.enough');
    else msg.textContent = '';
  } catch (e) {
    show('cashChange', errMsg(e));
    el('cashMsg').textContent = '';
  }
}

function initCash() {
  const grid = el('quickCash');
  QUICK.forEach((v) => {
    const b = document.createElement('button');
    b.className = 'btn-secondary';
    b.textContent = formatMoney(v, 0);
    b.onclick = () => {
      el('cashReceived').value = String(v);
      calcCash();
    };
    grid.appendChild(b);
  });
  el('cashCalc').onclick = calcCash;
}

function initPercent() {
  let mode = 'of';
  document.querySelectorAll('#pctTabs .tab').forEach((b) => {
    b.onclick = () => {
      toggleGroup('#pctTabs .tab', b);
      mode = b.dataset.pct;
    };
  });
  el('pctCalc').onclick = () => {
    const amt = num('pctAmount');
    const p = num('pctPct');
    try {
      const res = mode === 'of' ? percentOf(amt, p)
        : mode === 'add' ? addPercent(amt, p) : reducePercent(amt, p);
      show('pctResult', moneyStr(res));
    } catch (e) {
      show('pctResult', errMsg(e));
    }
  };
}

initLang();
initTabs();
renderTape();
initCalc();
initDiscount();
initPricing();
initCash();
initPercent();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
