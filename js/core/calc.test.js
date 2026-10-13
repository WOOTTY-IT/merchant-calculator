import test from 'node:test';
import assert from 'node:assert/strict';
import { CalcError, round2, tokenize, parse, evaluate, evaluateAst } from './calc.js';

test('round2 fixes float artifacts', () => {
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(2.675), 2.68);
  assert.equal(round2(-1.005), -1.01);
  assert.equal(round2(10), 10);
  assert.equal(round2(9.999), 10);
  assert.throws(() => round2(NaN), CalcError);
  assert.throws(() => round2(Infinity), CalcError);
});

test('tokenize basics', () => {
  assert.deepEqual(tokenize('1+2.5'), [
    { type: 'num', value: 1 },
    { type: 'op', value: '+' },
    { type: 'num', value: 2.5 },
  ]);
  assert.deepEqual(tokenize(' ( 3 ) '), [{ type: '(' }, { type: 'num', value: 3 }, { type: ')' }]);
});

test('tokenize rejects bad input', () => {
  assert.throws(() => tokenize(''), (e) => e.code === 'EMPTY');
  assert.throws(() => tokenize('   '), (e) => e.code === 'EMPTY');
  assert.throws(() => tokenize('1..2'), (e) => e.code === 'SYNTAX');
  assert.throws(() => tokenize('.5x'), (e) => e.code === 'SYNTAX');
  assert.throws(() => tokenize('2$3'), (e) => e.code === 'SYNTAX');
});

test('evaluate arithmetic and precedence', () => {
  assert.equal(evaluate('1+2*3'), 7);
  assert.equal(evaluate('(1+2)*3'), 9);
  assert.equal(evaluate('10/4'), 2.5);
  assert.equal(evaluate('10/4/5'), 0.5);
  assert.equal(evaluate('-5+2'), -3);
  assert.equal(evaluate('2--3'), 5);
  assert.equal(evaluate('+7'), 7);
  assert.equal(evaluate('0.1+0.2'), 0.30000000000000004);
  assert.equal(round2(evaluate('0.1+0.2')), 0.3);
});

test('repeated decimals round predictably', () => {
  assert.equal(round2(evaluate('1000/3')), 333.33);
  assert.equal(round2(evaluate('1000/3*3')), 1000);
  assert.equal(round2(evaluate('1/3')), 0.33);
  assert.equal(round2(evaluate('2/3')), 0.67);
});

test('negative and zero results', () => {
  assert.equal(evaluate('3-10'), -7);
  assert.equal(evaluate('0*5'), 0);
  assert.equal(evaluate('-4*0'), 0);
  assert.equal(evaluate('5-5'), 0);
});

test('division by zero throws DIV_ZERO', () => {
  assert.throws(() => evaluate('1/0'), (e) => e.code === 'DIV_ZERO');
  assert.throws(() => evaluate('5/(2-2)'), (e) => e.code === 'DIV_ZERO');
  assert.throws(() => evaluate('0/0'), (e) => e.code === 'DIV_ZERO');
});

test('malformed expressions throw SYNTAX', () => {
  assert.throws(() => evaluate(''), (e) => e.code === 'EMPTY');
  assert.throws(() => evaluate('1+'), (e) => e.code === 'SYNTAX');
  assert.throws(() => evaluate('*3'), (e) => e.code === 'SYNTAX');
  assert.throws(() => evaluate('(1+2'), (e) => e.code === 'SYNTAX');
  assert.throws(() => evaluate('1+2)'), (e) => e.code === 'SYNTAX');
  assert.throws(() => evaluate('1 2'), (e) => e.code === 'SYNTAX');
  assert.throws(() => evaluate('()'), (e) => e.code === 'SYNTAX');
});

test('round2 handles huge, tiny and exponential values', () => {
  assert.equal(round2(1e21), 1e21);
  assert.equal(round2(-1e21), -1e21);
  assert.equal(round2(1e16), 1e16);
  assert.equal(round2(1e-9), 0);
  assert.equal(round2(-0.004), 0);
  assert.equal(round2(0.005), 0.01);
  assert.equal(round2(-0.005), -0.01);
});

test('percent postfix in expressions', () => {
  assert.deepEqual(tokenize('15%'), [{ type: 'num', value: 15 }, { type: 'pct' }]);
  assert.equal(evaluate('100-15%'), 85);
  assert.equal(evaluate('200+10%'), 220);
  assert.equal(evaluate('500*15%'), 75);
  assert.equal(evaluate('100/25%'), 400);
  assert.equal(evaluate('15%'), 0.15);
  assert.equal(evaluate('(100+10)%'), 1.1);
  assert.equal(evaluate('-15%'), -0.15);
  assert.equal(round2(evaluate('199-15%')), 169.15);
  assert.equal(round2(evaluate('100-15%-10%')), 76.5);
  assert.throws(() => evaluate('%'), (e) => e.code === 'SYNTAX');
  assert.throws(() => evaluate('100-%'), (e) => e.code === 'SYNTAX');
  assert.throws(() => evaluate('100*%'), (e) => e.code === 'SYNTAX');
});

test('parse returns an AST', () => {
  const ast = parse(tokenize('1+2*3'));
  assert.equal(ast.type, 'binary');
  assert.equal(ast.op, '+');
  assert.equal(ast.right.op, '*');
  assert.equal(evaluateAst(ast), 7);
});
