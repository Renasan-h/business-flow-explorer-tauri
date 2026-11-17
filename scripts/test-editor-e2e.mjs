import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { parse, stringify } from 'yaml';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const server = spawn('npm', ['run', 'dev:web', '--', '--host', '127.0.0.1', '--port', '4179', '--strictPort'], { shell: process.platform === 'win32', stdio: 'pipe' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { const response = await fetch('http://127.0.0.1:4179/'); if (response.ok) { ready = true; break; } } catch {}
    await delay(1000);
  }
  if (!ready) throw new Error('Vite server did not start');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4179/');
  await page.getByRole('button', { name: /新規/ }).first().click();
  await page.getByRole('button', { name: '＋ ノード追加' }).click();
  // Undo/Redo はノード追加を戻し、やり直しで同じノードを復元する。
  if (await page.locator('[data-actor-id]').count() !== 1) throw new Error('Expected one newly created actor');
  await page.keyboard.press('Control+z');
  if (await page.locator('[data-actor-id]').count() !== 0) throw new Error('Ctrl+Z did not undo actor creation');
  await page.keyboard.press('Control+y');
  if (await page.locator('[data-actor-id]').count() !== 1) throw new Error('Ctrl+Y did not redo actor creation');
  // 新しい編集を行ったらRedo履歴が破棄されること。
  await page.getByRole('button', { name: '＋ ノード追加' }).click();
  if (await page.locator('[data-actor-id]').count() !== 2) throw new Error('Second actor was not added');
  await page.keyboard.press('Control+z');
  if (await page.locator('[data-actor-id]').count() !== 1) throw new Error('Undo did not remove second actor');
  await page.getByRole('button', { name: '＋ ノード追加' }).click();
  if (await page.locator('[data-actor-id]').count() !== 2) throw new Error('Replacement actor was not added');
  const actorIdsBeforeRedo = await page.locator('[data-actor-id]').evaluateAll(elements => elements.map(element => element.getAttribute('data-actor-id')));
  await page.keyboard.press('Control+y');
  const actorIdsAfterRedo = await page.locator('[data-actor-id]').evaluateAll(elements => elements.map(element => element.getAttribute('data-actor-id')));
  if (JSON.stringify(actorIdsBeforeRedo) !== JSON.stringify(actorIdsAfterRedo)) throw new Error('Redo incorrectly restored a discarded branch');
  // 後続のドラッグ検証はノード1件の状態で行う。
  await page.keyboard.press('Control+z');
  if (await page.locator('[data-actor-id]').count() !== 1) throw new Error('Undo did not restore single-actor state');
  const node = page.locator('[data-actor-id]').first();
  await node.waitFor();
  for (let i = 0; i < 8; i++) await page.getByRole('button', { name: '−', exact: true }).click();
  await page.getByText('30%', { exact: true }).waitFor();
  const svg = page.locator('.editor-canvas svg');
  const viewport = await svg.boundingBox();
  if (!viewport) throw new Error('Editor SVG is not visible');
  const start = await node.locator('rect').first().getAttribute('x');
  const box = await node.locator('rect').first().boundingBox();
  if (!box) throw new Error('Node is not visible');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(viewport.x + viewport.width - 15, viewport.y + viewport.height / 2, { steps: 20 });
  await delay(450);
  await page.mouse.up();
  const end = await node.locator('rect').first().getAttribute('x');
  if (start === end) throw new Error('Node did not move at 30% zoom');
  // 複数のpointermoveを伴うドラッグを1回のUndoで元の座標へ戻せること。
  await page.keyboard.press('Control+z');
  const undone = await node.locator('rect').first().getAttribute('x');
  if (undone !== start) throw new Error(`One Ctrl+Z did not undo the entire drag: start=${start}, end=${end}, undone=${undone}`);
  await page.keyboard.press('Control+y');
  const redone = await node.locator('rect').first().getAttribute('x');
  if (redone !== end) throw new Error('Ctrl+Y did not restore the dragged position');
  // ポインタ操作が中断された場合は、ノード座標とUndo履歴をドラッグ前へ戻す。
  const cancelStart = await node.locator('rect').first().getAttribute('x');
  const cancelBox = await node.locator('rect').first().boundingBox();
  if (!cancelBox) throw new Error('Node is not visible for pointer cancellation test');
  await page.mouse.move(cancelBox.x + cancelBox.width / 2, cancelBox.y + cancelBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cancelBox.x + cancelBox.width / 2 + 65, cancelBox.y + cancelBox.height / 2 + 15, { steps: 8 });
  const cancelMoved = await node.locator('rect').first().getAttribute('x');
  if (cancelMoved === cancelStart) throw new Error('Cancellation test did not move the actor');
  await svg.dispatchEvent('pointercancel', { pointerId: 1, bubbles: true });
  await page.mouse.up();
  const cancelRestored = await node.locator('rect').first().getAttribute('x');
  if (cancelRestored !== cancelStart) throw new Error(`PointerCancel did not restore actor: before=${cancelStart}, after=${cancelRestored}`);
  await page.keyboard.press('Control+z');
  const afterCancelUndo = await node.locator('rect').first().getAttribute('x');
  if (afterCancelUndo !== start) throw new Error('PointerCancel created an extra Undo history entry');
  await page.keyboard.press('Control+y');
  if (await node.locator('rect').first().getAttribute('x') !== cancelStart) throw new Error('Redo failed after PointerCancel');
  await page.getByRole('button', { name: '表示リセット' }).click();
  // プレビューへの遷移で編集データを破棄・再初期化しないことを確認する。
  const beforePreview = await node.locator('rect').first().getAttribute('x');
  const actorCount = await page.locator('[data-actor-id]').count();
  await page.getByRole('button', { name: '▶ プレビュー' }).click();
  await page.getByRole('heading', { name: /プレビュー：/ }).waitFor();
  await page.getByRole('button', { name: '編集画面に戻る' }).click();
  await page.getByRole('heading', { name: '新規フロー作成' }).waitFor();
  const afterPreview = await page.locator('[data-actor-id]').first().locator('rect').first().getAttribute('x');
  if (beforePreview !== afterPreview) throw new Error('Node coordinates changed after preview round trip');
  if (await page.locator('[data-actor-id]').count() !== actorCount) throw new Error('Actors changed after preview round trip');
  // 負座標と正座標に離れたノードの表示リセットは、外接範囲の中心を画面中央に合わせる。
  await page.locator('[data-actor-id]').first().locator('rect').first().click();
  await page.getByLabel('X', { exact: true }).fill('-800');
  await page.getByLabel('Y', { exact: true }).fill('-400');
  await page.getByRole('button', { name: '＋ ノード追加' }).click();
  await page.locator('[data-actor-id]').last().locator('rect').first().click();
  await page.getByLabel('X', { exact: true }).fill('400');
  await page.getByLabel('Y', { exact: true }).fill('200');
  await page.getByRole('button', { name: '表示リセット' }).click();
  const bounds = await page.locator('[data-actor-id]').evaluateAll(elements =>
    elements.map(element => {
      const rect = element.querySelector('rect').getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }));
  const canvas = await svg.boundingBox();
  if (!canvas || bounds.length !== 2) throw new Error(`Expected two nodes and a visible canvas for negative-coordinate test: nodes=${bounds.length}, canvas=${Boolean(canvas)}`);
  const midpoint = {
    x: (Math.min(...bounds.map(item => item.x)) + Math.max(...bounds.map(item => item.x))) / 2,
    y: (Math.min(...bounds.map(item => item.y)) + Math.max(...bounds.map(item => item.y))) / 2,
  };
  if (Math.abs(midpoint.x - (canvas.x + canvas.width / 2)) > 3 ||
      Math.abs(midpoint.y - (canvas.y + canvas.height / 2)) > 3) {
    throw new Error('Reset view did not center the negative/positive actor bounds: ' + JSON.stringify({ midpoint, canvas }));
  }
  // 複数選択したノードのドラッグは1件の履歴として確定し、全ノードを同時に復元する。
  await page.getByRole('button', { name: '複数ノード選択・移動' }).click();
  await page.getByRole('button', { name: 'すべて選択' }).click();
  await page.getByText('2件選択中', { exact: true }).waitFor();
  const multiPositions = () => page.locator('[data-actor-id]').evaluateAll(elements =>
    elements.map(element => ({ id: element.getAttribute('data-actor-id'), x: element.querySelector('rect').getAttribute('x'), y: element.querySelector('rect').getAttribute('y') })));
  const multiBefore = await multiPositions();
  const multiBox = await page.locator('[data-actor-id]').first().locator('rect').first().boundingBox();
  if (!multiBox) throw new Error('First node is not visible for multi drag');
  await page.mouse.move(multiBox.x + multiBox.width / 2, multiBox.y + multiBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(multiBox.x + multiBox.width / 2 + 48, multiBox.y + multiBox.height / 2 + 32, { steps: 12 });
  await page.mouse.up();
  const multiAfter = await multiPositions();
  if (multiAfter.some((item, index) => item.x === multiBefore[index].x || item.y === multiBefore[index].y)) {
    throw new Error('Multi drag did not move every selected actor');
  }
  await page.keyboard.press('Control+z');
  if (JSON.stringify(await multiPositions()) !== JSON.stringify(multiBefore)) throw new Error('Multi drag was not restored by one Undo');
  await page.keyboard.press('Control+y');
  if (JSON.stringify(await multiPositions()) !== JSON.stringify(multiAfter)) throw new Error('Multi drag was not restored by one Redo');
  // 複数ノード移動中のキャンセルでも全ノードを復元し、Undo履歴を増やさない。
  const cancelMultiBox = await page.locator('[data-actor-id]').first().locator('rect').first().boundingBox();
  if (!cancelMultiBox) throw new Error('First node is not visible for multi cancel');
  await page.mouse.move(cancelMultiBox.x + cancelMultiBox.width / 2, cancelMultiBox.y + cancelMultiBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cancelMultiBox.x + cancelMultiBox.width / 2 + 35, cancelMultiBox.y + cancelMultiBox.height / 2 + 20, { steps: 8 });
  await svg.dispatchEvent('pointercancel', { pointerId: 1, bubbles: true });
  await page.mouse.up();
  if (JSON.stringify(await multiPositions()) !== JSON.stringify(multiAfter)) throw new Error('Multi drag cancellation did not restore all actors');
  await page.keyboard.press('Control+z');
  if (JSON.stringify(await multiPositions()) !== JSON.stringify(multiBefore)) throw new Error('Multi drag cancellation created an extra history entry');
  await page.keyboard.press('Control+y');
  if (JSON.stringify(await multiPositions()) !== JSON.stringify(multiAfter)) throw new Error('Multi drag redo failed after cancellation');
  await page.getByRole('button', { name: '再生画面へ戻る' }).click();
  await page.getByRole('dialog', { name: '未保存の変更があります' }).waitFor();
  await page.getByRole('button', { name: '編集を続ける' }).click();
  if (await page.getByRole('dialog').count()) throw new Error('Dialog was not dismissed');
  await page.getByRole('button', { name: '再生画面へ戻る' }).click();
  await page.getByRole('button', { name: '保存せず戻る' }).click();
  await page.getByRole('button', { name: /ローカルのシナリオフォルダを開く/ }).waitFor();
  // 既存YAMLの読み込み直後も、負座標・可変サイズのノード群を中心表示する。
  await page.route('**/scenarios/order-processing.yaml', async route => {
    const scenario = parse(await readFile('public/scenarios/order-processing.yaml', 'utf8'));
    scenario.actors[0].position = { x: -1800, y: -950 };
    scenario.actors[0].width = 360;
    scenario.actors[0].height = 220;
    scenario.actors[1].position = { x: 1200, y: 750 };
    scenario.actors[1].width = 180;
    scenario.actors[1].height = 80;
    scenario.actors[2].position = { x: -500, y: 250 };
    scenario.actors[3].position = { x: 300, y: -300 };
    await route.fulfill({ status: 200, contentType: 'text/yaml', body: stringify(scenario) });
  });
  // シナリオ一覧をテスト対象の1件に限定し、選択状態に依存せず読み込む。
  await page.route('**/scenarios/manifest.json', route => route.fulfill({ json: ['/scenarios/order-processing.yaml'] }));
  await page.reload();
  await page.getByRole('heading', { name: 'ECサイトの注文処理' }).waitFor();
  await page.getByRole('button', { name: /フローを編集/ }).click();
  await page.locator('[data-actor-id]').first().waitFor();
  const loadedNodes = await page.locator('[data-actor-id]').evaluateAll(elements => elements.map(element => {
    const rect = element.querySelector('rect').getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  }));
  const loadedCanvas = await page.locator('.editor-canvas svg').boundingBox();
  if (!loadedCanvas || loadedNodes.length !== 4) throw new Error('Existing YAML did not load four nodes');
  const loadedCenter = {
    x: (Math.min(...loadedNodes.map(node => node.left)) + Math.max(...loadedNodes.map(node => node.right))) / 2,
    y: (Math.min(...loadedNodes.map(node => node.top)) + Math.max(...loadedNodes.map(node => node.bottom))) / 2,
  };
  if (Math.abs(loadedCenter.x - (loadedCanvas.x + loadedCanvas.width / 2)) > 4 ||
      Math.abs(loadedCenter.y - (loadedCanvas.y + loadedCanvas.height / 2)) > 4) {
    throw new Error('Initial YAML view is not centered on variable-size negative-coordinate nodes: ' + JSON.stringify({ loadedCenter, loadedCanvas }));
  }

  if (errors.length) throw new Error('Browser errors: ' + errors.join(' | '));
  console.log('PASS: undo/redo, redo branch invalidation, atomic drag undo, pointer cancellation rollback, multi drag atomic undo/redo and cancellation, 30% drag, viewport fit, negative-coordinate centering, existing YAML initial centering, preview round trip, unsaved changes, discard navigation');
} finally {
  if (browser) await browser.close();
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
    await new Promise(resolve => killer.once('close', resolve));
  } else {
    server.kill('SIGTERM');
  }
  server.stdout?.destroy();
  server.stderr?.destroy();
}
