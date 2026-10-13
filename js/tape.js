import { escapeHtml, moneyStr, el } from './ui.js';

const TAPE_KEY = 'merchant-calculator-tape';
const MAX_TAPE = 50;

function loadTape() {
  try {
    const raw = localStorage.getItem(TAPE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => x && typeof x.expr === 'string') : [];
  } catch (e) {
    return [];
  }
}

let tape = loadTape();

function saveTape() {
  try {
    localStorage.setItem(TAPE_KEY, JSON.stringify(tape.slice(0, MAX_TAPE)));
  } catch (e) {}
}

export function renderTape() {
  const box = el('tape');
  const empty = el('tapeEmpty');
  box.innerHTML = '';
  if (tape.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  tape.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'tape-item';
    div.innerHTML = '<div class="tape-expr">' + escapeHtml(item.expr) +
      '</div><div class="tape-res">' + moneyStr(item.res) + '</div>';
    div.onclick = () => { el('calcExpr').value = item.expr; };
    box.appendChild(div);
  });
}

export function pushTape(expr, res) {
  tape.unshift({ expr, res });
  if (tape.length > MAX_TAPE) tape = tape.slice(0, MAX_TAPE);
  saveTape();
  renderTape();
}
