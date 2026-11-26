import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, relative, sep } from 'node:path';
import { parse } from 'yaml';

// 同梱サンプルの親・子YAMLを実ファイルで再帰検証する。
const base = resolve('public/scenarios');
const manifest = JSON.parse(await readFile(resolve(base, 'manifest.json'), 'utf8'));
let fragmentCount = 0;
const inside = (file, root = base) => file === root || (file.startsWith(root + sep) && !relative(root, file).startsWith('..'));
async function visit(file, ancestors = new Set(), isRoot = false, root = base) {
  const absolute = resolve(file);
  assert.ok(inside(absolute, root), `参照先がscenarios外です: ${absolute}`);
  assert.ok(!ancestors.has(absolute), `循環参照: ${absolute}`);
  assert.ok(ancestors.size < 32, `参照階層が32を超えています: ${absolute}`);
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
    await visit(resolve(dirname(absolute), ref), next, false, root);
  }
}
for (const entry of manifest) {
  assert.ok(entry.startsWith('/scenarios/'), `manifestのパスが不正: ${entry}`);
  await visit(resolve(base, entry.slice('/scenarios/'.length)), new Set(), true);
}
assert.ok(fragmentCount > 0, '断片YAMLのテストが実行されていません');
console.log(`シナリオ参照検証成功: 親${manifest.length}件、断片${fragmentCount}件`);

 
// WIN-16: 参照階層の境界、循環参照、ルート逸脱を独立した一時YAMLで回帰検証する。
const fixtureRoot = await mkdtemp(resolve(tmpdir(), 'bfe-fragment-regression-'));
try {
  const chain = resolve(fixtureRoot, 'chain');
  await mkdir(chain);
  for (let index = 0; index < 33; index++) {
    const data = index === 32 ? { actors: [] } : { steps: [{ file: `f${index + 1}.yaml` }] };
    await writeFile(resolve(chain, `f${index}.yaml`), JSON.stringify(data));
  }
  // 32ファイルまでは許可、33番目で拒否。
  await visit(resolve(chain, 'f1.yaml'), new Set(), false, fixtureRoot);
  await assert.rejects(
    () => visit(resolve(chain, 'f0.yaml'), new Set(), false, fixtureRoot),
    /参照階層が32を超えています/,
  );

  await writeFile(resolve(fixtureRoot, 'cycle-a.yaml'), JSON.stringify({ steps: [{ file: 'cycle-b.yaml' }] }));
  await writeFile(resolve(fixtureRoot, 'cycle-b.yaml'), JSON.stringify({ steps: [{ file: 'cycle-a.yaml' }] }));
  await assert.rejects(
    () => visit(resolve(fixtureRoot, 'cycle-a.yaml'), new Set(), false, fixtureRoot),
    /循環参照/,
  );

  await writeFile(resolve(fixtureRoot, 'outside.yaml'), JSON.stringify({ steps: [{ file: '../outside.yaml' }] }));
  await assert.rejects(
    () => visit(resolve(fixtureRoot, 'outside.yaml'), new Set(), false, fixtureRoot),
    /scenarios外/,
  );
  console.log('WIN-16参照境界検証成功: 深さ32/33・循環参照・ルート逸脱');
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}
