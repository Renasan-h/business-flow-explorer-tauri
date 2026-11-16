import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, relative, sep } from 'node:path';
import { parse } from 'yaml';

// 同梱サンプルの親・子YAMLを実ファイルで再帰検証する。
const base = resolve('public/scenarios');
const manifest = JSON.parse(await readFile(resolve(base, 'manifest.json'), 'utf8'));
let fragmentCount = 0;
const inside = (file) => file === base || (file.startsWith(base + sep) && !relative(base, file).startsWith('..'));
async function visit(file, ancestors = new Set(), isRoot = false) {
  const absolute = resolve(file);
  assert.ok(inside(absolute), `参照先がscenarios外です: ${absolute}`);
  assert.ok(!ancestors.has(absolute), `循環参照: ${absolute}`);
  const next = new Set([...ancestors, absolute]);
  const data = parse(await readFile(absolute, 'utf8'));
  assert.ok(data && typeof data === 'object' && !Array.isArray(data), `YAMLのルートが不正: ${absolute}`);
  if (isRoot) {
    assert.equal(data.schemaVersion, '1.0', `親schemaVersion: ${absolute}`);
    assert.ok(data.metadata?.id, `親metadata: ${absolute}`);
  } else {
    assert.ok(!('schemaVersion' in data) && !('metadata' in data), `断片が親定義を含みます: ${absolute}`);
    fragmentCount++;
  }
  const references = [
    ...(data.actorFiles ?? []),
    ...(data.actors ?? []).filter(item => item && typeof item === 'object' && 'file' in item).map(item => item.file),
    ...(data.steps ?? []).filter(item => item && typeof item === 'object' && 'file' in item).map(item => item.file),
  ];
  for (const ref of references) {
    assert.equal(typeof ref, 'string', `参照が文字列ではありません: ${absolute}`);
    await visit(resolve(dirname(absolute), ref), next);
  }
}
for (const entry of manifest) {
  assert.ok(entry.startsWith('/scenarios/'), `manifestのパスが不正: ${entry}`);
  await visit(resolve(base, entry.slice('/scenarios/'.length)), new Set(), true);
}
assert.ok(fragmentCount > 0, '断片YAMLのテストが実行されていません');
console.log(`シナリオ参照検証成功: 親${manifest.length}件、断片${fragmentCount}件`);
