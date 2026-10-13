export class CalcError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CalcError';
    this.code = code;
  }
}

export function round2(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new CalcError('NOT_FINITE', 'value is not a finite number');
  }
  const abs = Math.abs(n);
  if (abs >= Number.MAX_SAFE_INTEGER) return n;
  if (abs < 0.005) return 0;
  const s = String(n);
  if (s.includes('e') || s.includes('E')) return Math.round(n * 100) / 100;
  const shifted = Number(s + 'e2');
  const r = shifted < 0 ? -Math.round(-shifted) : Math.round(shifted);
  return Number(r + 'e-2') + 0;
}

const OPS = new Set(['+', '-', '*', '/']);

export function tokenize(src) {
  if (typeof src !== 'string') throw new CalcError('SYNTAX', 'input must be a string');
  const text = src.trim();
  if (text === '') throw new CalcError('EMPTY', 'empty expression');
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === ' ') { i++; continue; }
    if (ch >= '0' && ch <= '9' || ch === '.') {
      let j = i;
      let dots = 0;
      while (j < text.length && ((text[j] >= '0' && text[j] <= '9') || text[j] === '.')) {
        if (text[j] === '.') dots++;
        j++;
      }
      const raw = text.slice(i, j);
      if (dots > 1 || raw === '.') throw new CalcError('SYNTAX', 'bad number: ' + raw);
      tokens.push({ type: 'num', value: Number(raw) });
      i = j;
      continue;
    }
    if (OPS.has(ch)) { tokens.push({ type: 'op', value: ch }); i++; continue; }
    if (ch === '%') { tokens.push({ type: 'pct' }); i++; continue; }
    if (ch === '(' || ch === ')') { tokens.push({ type: ch }); i++; continue; }
    throw new CalcError('SYNTAX', 'unexpected character: ' + ch);
  }
  return tokens;
}

export function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (type, value) => {
    const t = tokens[pos];
    if (!t || t.type !== type || (value !== undefined && t.value !== value)) {
      throw new CalcError('SYNTAX', 'unexpected token');
    }
    pos++;
    return t;
  };

  function expression() {
    let node = term();
    while (peek() && peek().type === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = tokens[pos++].value;
      node = { type: 'binary', op, left: node, right: term() };
    }
    return node;
  }

  function term() {
    let node = factor();
    while (peek() && peek().type === 'op' && (peek().value === '*' || peek().value === '/')) {
      const op = tokens[pos++].value;
      node = { type: 'binary', op, left: node, right: factor() };
    }
    return node;
  }

  function factor() {
    const t = peek();
    if (t && t.type === 'op' && (t.value === '-' || t.value === '+')) {
      pos++;
      return { type: 'unary', op: t.value, operand: factor() };
    }
    return primary();
  }

  function primary() {
    const t = peek();
    if (!t) throw new CalcError('SYNTAX', 'unexpected end of expression');
    if (t.type === 'num') { pos++; return withPercent({ type: 'num', value: t.value }); }
    if (t.type === '(') {
      pos++;
      const node = expression();
      eat(')');
      return withPercent(node);
    }
    throw new CalcError('SYNTAX', 'unexpected token');
  }

  function withPercent(node) {
    while (peek() && peek().type === 'pct') {
      pos++;
      node = { type: 'percent', operand: node };
    }
    return node;
  }

  const ast = expression();
  if (pos !== tokens.length) throw new CalcError('SYNTAX', 'trailing input');
  return ast;
}

export function evaluateAst(node) {
  switch (node.type) {
    case 'num': return node.value;
    case 'percent': return evaluateAst(node.operand) / 100;
    case 'unary': {
      const v = evaluateAst(node.operand);
      return (node.op === '-' ? -v : v) + 0;
    }
    case 'binary': {
      const a = evaluateAst(node.left);
      if (node.right.type === 'percent' && (node.op === '+' || node.op === '-')) {
        const v = node.op === '+' ? a + a * evaluateAst(node.right) : a - a * evaluateAst(node.right);
        if (!Number.isFinite(v)) throw new CalcError('NOT_FINITE', 'result is not finite');
        return v + 0;
      }
      const b = evaluateAst(node.right);
      if (node.op === '/' && b === 0) throw new CalcError('DIV_ZERO', 'division by zero');
      const v = node.op === '+' ? a + b : node.op === '-' ? a - b : node.op === '*' ? a * b : a / b;
      if (!Number.isFinite(v)) throw new CalcError('NOT_FINITE', 'result is not finite');
      return v + 0;
    }
    default:
      throw new CalcError('SYNTAX', 'unknown node');
  }
}

export function evaluate(src) {
  return evaluateAst(parse(tokenize(src)));
}
