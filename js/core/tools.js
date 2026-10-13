import { round2 } from './calc.js';

export class ToolError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
  }
}

function money(n, label) {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new ToolError('BAD_NUMBER', (label || 'value') + ' must be a finite number');
  }
  return round2(n);
}

function pct(p, label) {
  if (typeof p !== 'number' || !Number.isFinite(p)) {
    throw new ToolError('BAD_PERCENT', (label || 'percent') + ' must be a finite number');
  }
  if (p < 0 || p > 100) throw new ToolError('BAD_PERCENT', (label || 'percent') + ' must be 0..100');
  return p;
}

export function percentOf(value, p) {
  return money(money(value) * pct(p, 'percent') / 100, 'percent');
}

export function addPercent(value, p) {
  const v = money(value);
  return money(v + v * pct(p, 'percent') / 100);
}

export function reducePercent(value, p) {
  const v = money(value);
  return money(v - v * pct(p, 'percent') / 100);
}

export function discountPercent(price, p) {
  return reducePercent(price, p);
}

export function discountCash(price, amountOff) {
  const v = money(price);
  const off = money(amountOff, 'discount');
  if (off < 0) throw new ToolError('BAD_NUMBER', 'discount must be >= 0');
  return money(Math.max(0, v - off));
}

export function markupPrice(cost, markupPct) {
  return addPercent(cost, markupPct);
}

export function marginPrice(cost, marginPct) {
  const c = money(cost);
  const m = pct(marginPct, 'margin');
  if (m >= 100) throw new ToolError('BAD_PERCENT', 'margin must be < 100');
  return money(c / (1 - m / 100));
}

export function platformFee(price, feePct) {
  return percentOf(price, feePct);
}

export function profitOf(price, cost, feePct) {
  const p = money(price);
  const c = money(cost, 'cost');
  return money(p - percentOf(p, feePct) - c);
}

export function withVat(amount, vatPct = 7) {
  return addPercent(amount, vatPct);
}

export function withoutVat(amount, vatPct = 7) {
  const a = money(amount);
  const v = pct(vatPct, 'vat');
  return money(a / (1 + v / 100));
}

export function changeDue(bill, total) {
  const b = money(bill, 'received');
  const t = money(total, 'total');
  return money(b - t);
}

export function formatMoney(n, decimals = 2) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + grouped + (dec ? '.' + dec : '');
}
