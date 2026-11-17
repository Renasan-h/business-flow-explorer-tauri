import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
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
  await page.getByRole('button', { name: '再生画面へ戻る' }).click();
  await page.getByRole('dialog', { name: '未保存の変更があります' }).waitFor();
  await page.getByRole('button', { name: '編集を続ける' }).click();
  if (await page.getByRole('dialog').count()) throw new Error('Dialog was not dismissed');
  await page.getByRole('button', { name: '再生画面へ戻る' }).click();
  await page.getByRole('button', { name: '保存せず戻る' }).click();
  await page.getByRole('button', { name: /ローカルのシナリオフォルダを開く/ }).waitFor();
  if (errors.length) throw new Error('Browser errors: ' + errors.join(' | '));
  console.log('PASS: undo/redo, redo branch invalidation, atomic drag undo, 30% drag, viewport fit, negative-coordinate centering, preview round trip, unsaved changes, discard navigation');
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
