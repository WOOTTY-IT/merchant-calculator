import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ToolError, percentOf, addPercent, reducePercent, discountPercent, discountCash,
  markupPrice, marginPrice, platformFee, profitOf, withVat, withoutVat,
  changeDue, formatMoney,
} from './tools.js';

test('percent tools', () => {
  assert.equal(percentOf(200, 15), 30);
  assert.equal(percentOf(0.1 + 0.2, 100), 0.3);
  assert.equal(addPercent(100, 7), 107);
  assert.equal(reducePercent(100, 10), 90);
  assert.equal(addPercent(333.33, 7), 356.66);
});

test('percent rejects out-of-range and non-numbers', () => {
  assert.throws(() => percentOf(100, -1), (e) => e.code === 'BAD_PERCENT');
  assert.throws(() => percentOf(100, 101), (e) => e.code === 'BAD_PERCENT');
  assert.throws(() => percentOf('100', 10), (e) => e.code === 'BAD_NUMBER');
  assert.throws(() => percentOf(NaN, 10), (e) => e.code === 'BAD_NUMBER');
});

test('discounts', () => {
  assert.equal(discountPercent(500, 10), 450);
  assert.equal(discountPercent(199, 15), 169.15);
  assert.equal(discountCash(500, 50), 450);
  assert.equal(discountCash(100, 100), 0);
  assert.equal(discountCash(100, 150), 0);
  assert.equal(discountCash(100, 200), 0);
  assert.equal(discountCash(0, 50), 0);
  assert.throws(() => discountCash(100, -5), (e) => e.code === 'BAD_NUMBER');
});

test('pricing: markup, margin, fee, profit', () => {
  assert.equal(markupPrice(100, 30), 130);
  assert.equal(marginPrice(100, 20), 125);
  assert.equal(marginPrice(100, 0), 100);
  assert.equal(platformFee(1000, 2.5), 25);
  assert.equal(profitOf(1000, 600, 2.5), 375);
  assert.throws(() => marginPrice(100, 100), (e) => e.code === 'BAD_PERCENT');
});

test('vat 7 percent', () => {
  assert.equal(withVat(100), 107);
  assert.equal(withVat(100, 0), 100);
  assert.equal(withoutVat(107), 100);
  assert.equal(withoutVat(107, 0), 107);
  assert.equal(roundTripCheck(), true);
  assert.throws(() => withVat('x'), (e) => e.code === 'BAD_NUMBER');
});

function roundTripCheck() {
  const net = 1234.56;
  return withoutVat(withVat(net)) === net;
}

test('cash and change', () => {
  assert.equal(changeDue(1000, 735.5), 264.5);
  assert.equal(changeDue(100, 100), 0);
  assert.equal(changeDue(100, 150), -50);
  assert.throws(() => changeDue('a', 100), (e) => e.code === 'BAD_NUMBER');
});

test('money never carries float noise', () => {
  assert.equal(addPercent(0.1, 20), 0.12);
  assert.equal(discountPercent(19.9, 10), 17.91);
  assert.equal(changeDue(200, 19.9 + 0.1), 180);
  assert.equal(withVat(99.99), 106.99);
});

test('formatMoney', () => {
  assert.equal(formatMoney(1234.5), '1,234.50');
  assert.equal(formatMoney(-1234.5), '-1,234.50');
  assert.equal(formatMoney(0), '0.00');
  assert.equal(formatMoney(1000000, 0), '1,000,000');
  assert.equal(formatMoney(NaN), '—');
});
