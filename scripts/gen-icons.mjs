// Generates PWA icons (no dependencies): rounded dark tile, display bar, 3x3 key grid.
// Usage: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = [192, 512];

const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  table[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function sdRoundRect(px, py, cx, cy, w, h, r) {
  const qx = Math.abs(px - cx) - (w / 2 - r);
  const qy = Math.abs(py - cy) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

const COLORS = {
  bg: [27, 27, 27, 1],
  screen: [232, 230, 229, 1],
  key: [101, 99, 99, 1],
  accent: [75, 208, 138, 1],
};

function render(size) {
  const px = new Uint8ClampedArray(size * size * 4);
  const aa = size / 192;
  const cover = (d) => Math.max(0, Math.min(1, 0.5 - d / (2 * aa)));

  const blend = (i, color, a) => {
    const sa = a * color[3];
    px[i] = color[0] * sa + px[i] * (1 - sa);
    px[i + 1] = color[1] * sa + px[i + 1] * (1 - sa);
    px[i + 2] = color[2] * sa + px[i + 2] * (1 - sa);
    px[i + 3] = 255 * sa + px[i + 3] * (1 - sa);
  };

  const shapes = [];
  shapes.push({ c: COLORS.bg, f: (x, y) => sdRoundRect(x, y, size / 2, size / 2, size, size, size * 0.22) });
  const dw = size * 0.72, dh = size * 0.16;
  shapes.push({ c: COLORS.screen, f: (x, y) => sdRoundRect(x, y, size * 0.5, size * 0.21, dw, dh, size * 0.035) });

  const gap = size * 0.045;
  const colW = (size * 0.72 - 2 * gap) / 3;
  const rowH = (size * 0.5 - 2 * gap) / 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cx = size * 0.14 + colW / 2 + c * (colW + gap);
      const cy = size * 0.36 + rowH / 2 + r * (rowH + gap);
      const color = r === 2 && c === 2 ? COLORS.accent : COLORS.key;
      const w = colW, h = rowH, rad = size * 0.03;
      shapes.push({ c: color, f: (x, y) => sdRoundRect(x, y, cx, cy, w, h, rad) });
    }
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      for (const s of shapes) blend(i, s.c, cover(s.f(x + 0.5, y + 0.5)));
    }
  }

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of OUT) {
  const file = path.join(root, 'icons', `icon-${size}.png`);
  const png = render(size);
  writeFileSync(file, png);
  console.log(`icons/icon-${size}.png  ${size}x${size}  ${png.length} bytes`);
}
