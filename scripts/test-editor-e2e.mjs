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
  await page.getByRole('button', { name: '表示リセット' }).click();
  await page.getByRole('button', { name: '再生画面へ戻る' }).click();
  await page.getByRole('dialog', { name: '未保存の変更があります' }).waitFor();
  await page.getByRole('button', { name: '編集を続ける' }).click();
  if (await page.getByRole('dialog').count()) throw new Error('Dialog was not dismissed');
  await page.getByRole('button', { name: '再生画面へ戻る' }).click();
  await page.getByRole('button', { name: '保存せず戻る' }).click();
  await page.getByRole('button', { name: /ローカルのシナリオフォルダを開く/ }).waitFor();
  if (errors.length) throw new Error('Browser errors: ' + errors.join(' | '));
  console.log('PASS: 30% drag, viewport fit, unsaved changes, discard navigation');
} finally {
  if (browser) await browser.close();
  server.kill();
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/t', '/f'], { shell: true });
}
