import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

// 外部画像ツールに依存せず、初期ビルド用の単色アイコンを生成する。
// 製品用アイコンに置き換えるまではこのスクリプトを利用する。
const size = 32;
const pixels = Buffer.alloc(size * (size * 4 + 1));
for (let y = 0; y < size; y++) {
  const row = y * (size * 4 + 1);
  for (let x = 0; x < size; x++) {
    const index = row + 1 + x * 4;
    const foreground = x > 5 && x < 26 && y > 5 && y < 26;
    pixels[index] = foreground ? 34 : 22;
    pixels[index + 1] = foreground ? 112 : 39;
    pixels[index + 2] = foreground ? 192 : 65;
    pixels[index + 3] = 255;
  }
}
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const kind = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([kind, data])));
  return Buffer.concat([length, kind, data, checksum]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(size, 0);
ihdr.writeUInt32BE(size, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(pixels)),
  chunk('IEND', Buffer.alloc(0)),
]);
// WindowsのRC.EXEが受け付けるBMP形式のICOを生成する。
// PNG圧縮のICOは環境によってRC2175になるため使用しない。
const dib = Buffer.alloc(40);
dib.writeUInt32LE(40, 0);
dib.writeInt32LE(size, 4);
dib.writeInt32LE(size * 2, 8); // XOR画像とANDマスクの合計高さ
dib.writeUInt16LE(1, 12);
dib.writeUInt16LE(32, 14);
dib.writeUInt32LE(0, 16); // BI_RGB
const xor = Buffer.alloc(size * size * 4);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const source = y * (size * 4 + 1) + 1 + x * 4;
    const dest = ((size - 1 - y) * size + x) * 4;
    xor[dest] = pixels[source + 2];
    xor[dest + 1] = pixels[source + 1];
    xor[dest + 2] = pixels[source];
    xor[dest + 3] = pixels[source + 3];
  }
}
const andMask = Buffer.alloc(size * Math.ceil(size / 32) * 4);
const bitmap = Buffer.concat([dib, xor, andMask]);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = size;
header[7] = size;
header[8] = 0;
header[9] = 0;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(bitmap.length, 14);
header.writeUInt32LE(22, 18);
mkdirSync('src-tauri/icons', { recursive: true });
writeFileSync('src-tauri/icons/icon.png', png);
writeFileSync('src-tauri/icons/icon.ico', Buffer.concat([header, bitmap]));
