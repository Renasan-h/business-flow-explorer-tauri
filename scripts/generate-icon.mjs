import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

// Business Flow Explorer のブランドアイコンを外部依存なしで描画する。
// PNG と Windows リソース用 BMP-ICO を同じデザインから生成する。
const size = 256;
const pixels = Buffer.alloc(size * size * 4);
const clamp = n => Math.max(0, Math.min(255, Math.round(n)));
function put(x, y, color, alpha = 1) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  const a = (color[3] ?? 255) / 255 * alpha;
  const old = pixels[i + 3] / 255;
  const total = a + old * (1 - a);
  for (let c = 0; c < 3; c++) pixels[i + c] = clamp((color[c] * a + pixels[i + c] * old * (1 - a)) / (total || 1));
  pixels[i + 3] = clamp(total * 255);
}
function rounded(x, y, w, h, r, color) {
  for (let py = Math.floor(y); py < y + h; py++) for (let px = Math.floor(x); px < x + w; px++) {
    const cx = Math.max(x + r, Math.min(px, x + w - r));
    const cy = Math.max(y + r, Math.min(py, y + h - r));
    if ((px - cx) ** 2 + (py - cy) ** 2 <= r ** 2) put(px, py, color);
  }
}
function line(x1, y1, x2, y2, width, color) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2);
  for (let i = 0; i <= steps; i++) {
    const x = x1 + (x2 - x1) * i / steps, y = y1 + (y2 - y1) * i / steps;
    for (let dy = -width; dy <= width; dy++) for (let dx = -width; dx <= width; dx++) {
      if (dx * dx + dy * dy <= width * width) put(x + dx, y + dy, color);
    }
  }
}
function arrow(x1, y1, x2, y2, color) {
  line(x1, y1, x2, y2, 4, color);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  for (const offset of [-0.7, 0.7]) line(x2, y2, x2 - 13 * Math.cos(angle + offset), y2 - 13 * Math.sin(angle + offset), 4, color);
}
const navy = [5, 34, 85], ice = [193, 235, 255], white = [246, 251, 255];
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const r = 47, cx = Math.max(r, Math.min(x, size - r)), cy = Math.max(r, Math.min(y, size - r));
  if ((x - cx) ** 2 + (y - cy) ** 2 > r ** 2) continue;
  const glow = Math.max(0, 1 - Math.hypot(x - 45, y - 30) / 280);
  put(x, y, [clamp(3 + 17 * glow), clamp(52 + 94 * glow), clamp(127 + 100 * glow)]);
}
// 上部のYAMLドキュメントと、下部の双方向通信を表現する。
line(64, 88, 64, 108, 5, [115, 196, 247]);
line(192, 88, 192, 108, 5, [115, 196, 247]);
rounded(89, 35, 78, 77, 12, navy);
rounded(94, 40, 68, 67, 9, white);
rounded(101, 49, 54, 11, 4, [70, 150, 217]);
rounded(101, 68, 40, 5, 2, [101, 166, 212]);
rounded(101, 80, 48, 5, 2, [101, 166, 212]);
rounded(101, 92, 32, 5, 2, [101, 166, 212]);
for (const x of [31, 151]) {
  rounded(x, 116, 74, 82, 18, navy);
  rounded(x + 5, 121, 64, 72, 15, white);
  for (const y of [138, 160]) {
    rounded(x + 17, y, 41, 15, 6, navy);
    rounded(x + 22, y + 4, 27, 7, 3, ice);
    rounded(x + 52, y + 6, 4, 4, 2, [43, 114, 188]);
  }
}
arrow(112, 143, 146, 143, ice);
arrow(144, 173, 110, 173, ice);
// 編集を示す黄色のペン。小さいアイコンでも視認できる太さにする。
line(178, 211, 222, 167, 14, navy);
line(178, 211, 222, 167, 9, [255, 201, 48]);
line(215, 174, 222, 167, 9, [255, 123, 155]);
line(175, 215, 184, 206, 6, [255, 246, 205]);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const kind = Buffer.from(type), length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(Buffer.concat([kind, data])));
  return Buffer.concat([length, kind, data, checksum]);
}
function png(size, rgba) {
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
function downsample(to) {
  const out = Buffer.alloc(to * to * 4), scale = size / to;
  for (let y = 0; y < to; y++) for (let x = 0; x < to; x++) {
    const totals = [0, 0, 0, 0];
    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
      const i = ((y * scale + sy) * size + x * scale + sx) * 4;
      for (let c = 0; c < 4; c++) totals[c] += pixels[i + c];
    }
    for (let c = 0; c < 4; c++) out[(y * to + x) * 4 + c] = clamp(totals[c] / (scale * scale));
  }
  return out;
}
function icoBitmap(n, rgba) {
  const dib = Buffer.alloc(40), xor = Buffer.alloc(n * n * 4);
  dib.writeUInt32LE(40, 0); dib.writeInt32LE(n, 4); dib.writeInt32LE(n * 2, 8);
  dib.writeUInt16LE(1, 12); dib.writeUInt16LE(32, 14);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const src = (y * n + x) * 4, dst = ((n - 1 - y) * n + x) * 4;
    xor[dst] = rgba[src + 2]; xor[dst + 1] = rgba[src + 1];
    xor[dst + 2] = rgba[src]; xor[dst + 3] = rgba[src + 3];
  }
  const mask = Buffer.alloc(n * Math.ceil(n / 32) * 4);
  return Buffer.concat([dib, xor, mask]);
}
const images = [32, 48, 256].map(n => ({ n, bitmap: icoBitmap(n, n === size ? pixels : downsample(n)) }));
const header = Buffer.alloc(6 + images.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
let offset = header.length;
for (let i = 0; i < images.length; i++) {
  const { n, bitmap } = images[i], p = 6 + i * 16;
  header[p] = n === 256 ? 0 : n; header[p + 1] = n === 256 ? 0 : n;
  header.writeUInt16LE(1, p + 4); header.writeUInt16LE(32, p + 6);
  header.writeUInt32LE(bitmap.length, p + 8); header.writeUInt32LE(offset, p + 12);
  offset += bitmap.length;
}
mkdirSync('src-tauri/icons', { recursive: true });
writeFileSync('src-tauri/icons/icon.png', png(size, pixels));
writeFileSync('src-tauri/icons/icon.ico', Buffer.concat([header, ...images.map(x => x.bitmap)]));
