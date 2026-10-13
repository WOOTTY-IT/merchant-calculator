#!/usr/bin/env node
// Automated quality gate: node scripts/verify.mjs
// Runs unit tests, i18n parity, markup coverage, file-size and PWA asset checks.
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_LINES = 200;
let failed = 0;

const ok = (m) => console.log('  PASS  ' + m);
const bad = (m) => { failed++; console.log('  FAIL  ' + m); };

function runTests() {
  console.log('\n[1/6] node --test');
  const r = spawnSync(process.execPath, ['--test'], { cwd: root, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const pass = /ℹ pass (\d+)/.exec(out);
  const fail = /ℹ fail (\d+)/.exec(out);
  if (r.status === 0 && pass && fail && fail[1] === '0') ok(`${pass[1]} tests pass`);
  else { bad('unit tests failed'); console.log(out.slice(-2000)); }
}

async function checkI18n() {
  console.log('\n[2/6] i18n parity th/en');
  const th = (await import(pathToFileURL(path.join(root, 'js/i18n/th.js')))).default;
  const en = (await import(pathToFileURL(path.join(root, 'js/i18n/en.js')))).default;
  const tk = Object.keys(th).sort();
  const ek = Object.keys(en).sort();
  const missingInTh = ek.filter((k) => !(k in th));
  const missingInEn = tk.filter((k) => !(k in en));
  if (missingInTh.length) bad('missing in th.js: ' + missingInTh.join(', '));
  if (missingInEn.length) bad('missing in en.js: ' + missingInEn.join(', '));
  if (!missingInTh.length && !missingInEn.length) ok(`${tk.length} keys identical in th/en`);
  return { th, en };
}

async function checkMarkup(dict) {
  console.log('\n[3/6] data-i18n coverage in index.html');
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
  const missing = keys.filter((k) => !(k in dict.en) || !(k in dict.th));
  if (missing.length) bad('missing i18n keys: ' + [...new Set(missing)].join(', '));
  else ok(`${keys.length} data-i18n attributes all translated`);
}

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const p = path.join(dir, name);
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const s = await stat(p);
    if (s.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

async function checkSizes() {
  console.log('\n[4/6] file size budget (<= ' + MAX_LINES + ' lines)');
  const files = [...await walk(path.join(root, 'js')), ...await walk(path.join(root, 'scripts')), path.join(root, 'sw.js')];
  const long = [];
  for (const f of files) {
    const n = (await readFile(f, 'utf8')).split('\n').length;
    if (n > MAX_LINES) long.push(`${path.relative(root, f)}=${n}`);
  }
  if (long.length) bad('too long: ' + long.join(', '));
  else ok(`${files.length} js files within budget`);
}

async function checkImports() {
  console.log('\n[5/6] module import graph resolves');
  const files = await walk(path.join(root, 'js'));
  const missing = [];
  let count = 0;
  for (const f of files) {
    const src = await readFile(f, 'utf8');
    for (const m of src.matchAll(/from\s+['"](\.[^'"]+)['"]|import\s+['"](\.[^'"]+)['"]/g)) {
      const spec = m[1] || m[2];
      count++;
      if (!existsSync(path.resolve(path.dirname(f), spec))) {
        missing.push(path.relative(root, f) + ' -> ' + spec);
      }
    }
  }
  if (missing.length) bad('unresolved imports: ' + missing.join(', '));
  else ok(`${count} relative imports resolve`);
}

async function checkPwa() {
  console.log('\n[6/6] PWA assets referenced by sw.js/manifest');
  const sw = await readFile(path.join(root, 'sw.js'), 'utf8');
  const cache = /const CACHE = '([^']+)'/.exec(sw);
  if (!cache) bad('CACHE constant missing in sw.js');
  else ok(`CACHE = ${cache[1]}`);
  const assets = [...sw.matchAll(/'\.\/[^']+'/g)].map((m) => m[0].slice(1, -1));
  const missing = assets.filter((a) => !existsSync(path.join(root, a)));
  if (missing.length) bad('sw assets missing on disk: ' + missing.join(', '));
  else ok(`${assets.length} cached assets exist`);
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
  const icons = manifest.icons.map((i) => i.src.replace('./', ''));
  const missIcon = icons.filter((i) => !existsSync(path.join(root, i)));
  if (missIcon.length) bad('icons missing: ' + missIcon.join(', '));
  else {
    const small = [];
    for (const i of icons) {
      const s = await stat(path.join(root, i));
      if (s.size < 2000) small.push(`${i}=${s.size}B`);
    }
    if (small.length) bad('placeholder-sized icons: ' + small.join(', '));
    else ok(`manifest + ${icons.length} icons >= 2KB each`);
  }
}

runTests();
const dict = await checkI18n();
await checkMarkup(dict);
await checkSizes();
await checkImports();
await checkPwa();

console.log(failed ? `\nRESULT: ${failed} check(s) FAILED` : '\nRESULT: all checks passed');
process.exit(failed ? 1 : 0);
