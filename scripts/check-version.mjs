import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const tauri = JSON.parse(await readFile(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
const cargo = await readFile(new URL('../src-tauri/Cargo.toml', import.meta.url), 'utf8');
const packageSection = cargo.split(/(?=^\[)/m).find(section => section.startsWith('[package]'));
assert.ok(packageSection, 'Cargo.toml の [package] が見つかりません');
const cargoVersion = packageSection.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
assert.ok(cargoVersion, 'Cargo.toml の package.version が見つかりません');
assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
assert.equal(tauri.version, pkg.version, 'Tauri version が package.json と一致しません');
assert.equal(cargoVersion, pkg.version, 'Cargo version が package.json と一致しません');
const expectedTag = 'v' + pkg.version;
if (process.argv[2]) assert.equal(process.argv[2], expectedTag, '指定タグがアプリのバージョンと一致しません');
console.log('Version OK:', pkg.version, '(package.json / tauri.conf.json / Cargo.toml)', 'tag:', expectedTag);
