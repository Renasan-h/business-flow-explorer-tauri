import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

// TauriのアイコンがWindows向けに正しく生成されていることを検証する。
const png = readFileSync('src-tauri/icons/icon.png');
const ico = readFileSync('src-tauri/icons/icon.ico');
assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'PNG signature');
assert.equal(png.readUInt32BE(16), 256, 'PNG width');
assert.equal(png.readUInt32BE(20), 256, 'PNG height');
assert.equal(png[24], 8, 'PNG bit depth');
assert.equal(png[25], 6, 'PNG RGBA');
assert.equal(ico.readUInt16LE(0), 0, 'ICO reserved');
assert.equal(ico.readUInt16LE(2), 1, 'ICO image type');
const count = ico.readUInt16LE(4);
assert.equal(count, 3, 'ICO resolution count');
const sizes = [];
for (let i = 0; i < count; i++) {
  const entry = 6 + i * 16;
  const width = ico[entry] || 256;
  const height = ico[entry + 1] || 256;
  const bits = ico.readUInt16LE(entry + 6);
  const length = ico.readUInt32LE(entry + 8);
  const offset = ico.readUInt32LE(entry + 12);
  assert.equal(width, height, 'Square ICO image');
  assert.equal(bits, 32, '32-bit ICO');
  assert.ok(offset >= 6 + count * 16 && offset + length <= ico.length, 'ICO bitmap bounds');
  assert.equal(ico.readUInt32LE(offset), 40, 'Windows BMP DIB header');
  assert.equal(ico.readInt32LE(offset + 4), width, 'ICO bitmap width');
  assert.equal(ico.readInt32LE(offset + 8), height * 2, 'ICO bitmap height including mask');
  assert.equal(length, 40 + width * height * 4 + width * Math.ceil(width / 32) * 4, 'ICO bitmap payload length');
  sizes.push(width);
}
assert.deepEqual(sizes, [32, 48, 256], 'Windows icon sizes');
console.log('Windows app icons verified: PNG 256x256, ICO 32/48/256.');
