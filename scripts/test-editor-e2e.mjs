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
  // Tauri保存APIをブラウザ上で模擬し、新規作成→再保存→外部競合を検証する。
  // 画面操作のテストとは別に、エディターが利用する保存経路の契約を確認する。
  await page.evaluate(async () => {
    const previous = window.__TAURI_INTERNALS__;
    const files = new Map();
    const calls = [];
    window.__TAURI_INTERNALS__ = {
      invoke: async (command, args) => {
        calls.push({ command, ...args });
        if (command === 'create_scenario_file') {
          if (files.has(args.relativePath)) throw new Error('既存ファイル');
          files.set(args.relativePath, args.content);
        } else if (command === 'write_scenario_file') {
          if (files.get(args.relativePath) !== args.expectedContent) throw new Error('保存競合');
          files.set(args.relativePath, args.content);
        } else {
          throw new Error('Unexpected Tauri command: ' + command);
        }
      },
    };
    try {
      const { saveScenarioYaml } = await import('/src/editor/scenarioPersistence.ts');
      const options = { scenarioPath: '/scenarios/native/new-flow.yaml', isNew: true, filename: 'new-flow.yaml' };
      const first = 'metadata: first\\n';
      const second = 'metadata: second\\n';
      const created = await saveScenarioYaml({ ...options, yaml: first, nativeCreatedPath: null });
      if (created.nativeCreatedPath !== 'new-flow.yaml') throw new Error('Initial save did not return created path');
      await saveScenarioYaml({ ...options, yaml: second, nativeCreatedPath: created.nativeCreatedPath, expectedContent: first });
      if (files.get('new-flow.yaml') !== second) throw new Error('Second save did not update the created file');
      if (calls.length !== 2 || calls[0].command !== 'create_scenario_file' ||
          calls[1].command !== 'write_scenario_file' || calls[1].expectedContent !== first) {
        throw new Error('New-file save did not switch to checked update');
      }
      // 外部アプリによる変更後は、古い原文での再保存を拒否する。
      files.set('new-flow.yaml', 'metadata: external\\n');
      let conflicted = false;
      try {
        await saveScenarioYaml({ ...options, yaml: 'metadata: editor\\n', nativeCreatedPath: created.nativeCreatedPath, expectedContent: second });
      } catch (error) {
        conflicted = String(error).includes('保存競合');
      }
      if (!conflicted || files.get('new-flow.yaml') !== 'metadata: external\\n') {
        throw new Error('External modification was overwritten');
      }
    } finally {
      window.__TAURI_INTERNALS__ = previous;
    }
  });

  // 実際の編集画面で新規作成→初回保存→編集→再保存を検証する。
  // Tauriコマンドのみモックし、ボタン・ノード・接続線は実画面で操作する。
  const nativePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await nativePage.addInitScript(() => {
    const files = new Map();
    const calls = [];
    window.__nativeSaveTest = { files, calls };
    window.__TAURI_INTERNALS__ = {
      invoke: async (command, args = {}) => {
        if (command === 'select_scenario_folder') return 'E2E test folder';
        if (command === 'list_scenario_files') return [];
        if (command === 'create_scenario_file') {
          if (files.has(args.relativePath)) throw new Error('既存ファイル');
          files.set(args.relativePath, args.content);
          calls.push({ command, ...args });
          return;
        }
        if (command === 'write_scenario_file') {
          if (files.get(args.relativePath) !== args.expectedContent) throw new Error('保存競合');
          files.set(args.relativePath, args.content);
          calls.push({ command, ...args });
          return;
        }
        throw new Error('Unexpected native command: ' + command);
      },
    };
  });
  try {
    await nativePage.goto('http://127.0.0.1:4179/');
    await nativePage.getByRole('button', { name: /ローカルのシナリオフォルダを開く/ }).click();
    await nativePage.getByRole('button', { name: /新規/ }).first().click();
    await nativePage.getByRole('heading', { name: '新規フロー作成' }).waitFor();
    await nativePage.getByRole('button', { name: '＋ ノード追加' }).click();
    await nativePage.getByRole('button', { name: '＋ ノード追加' }).click();
    const actors = nativePage.locator('[data-actor-id]');
    if (await actors.count() !== 2) throw new Error('Native editor did not create two nodes');
    // 新規ノードは同じキャンバス中心に生成されるため、接続前に2件目を移動する。
    await nativePage.getByLabel('X', { exact: true }).fill('300');
    const handle = nativePage.locator('[data-connection-handle]').first();
    const source = await handle.boundingBox();
    const destination = await actors.last().locator('rect').first().boundingBox();
    if (!source || !destination) throw new Error('Connection handles are not visible');
    await nativePage.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
    await nativePage.mouse.down();
    await nativePage.mouse.move(destination.x + destination.width / 2, destination.y + destination.height / 2, { steps: 12 });
    await nativePage.mouse.up();
    await nativePage.getByText('通信線を追加しました。').waitFor();
    await nativePage.getByRole('button', { name: 'YAMLを保存…' }).click();
    await nativePage.getByText('選択したフォルダに新しいYAMLを作成しました。').waitFor();
    // 保存後にノードを追加してから再保存し、初回の原文が渡されることを確認する。
    await nativePage.getByRole('button', { name: '＋ ノード追加' }).click();
    await nativePage.getByRole('button', { name: 'YAMLを保存…' }).click();
    await nativePage.getByText('選択したフォルダのYAMLを上書き保存しました。').waitFor();
    const saved = await nativePage.evaluate(() => {
      const { files, calls } = window.__nativeSaveTest;
      return { calls, content: files.get(calls[0]?.relativePath) };
    });
    if (saved.calls.length !== 2 ||
        saved.calls[0].command !== 'create_scenario_file' ||
        saved.calls[1].command !== 'write_scenario_file' ||
        saved.calls[1].relativePath !== saved.calls[0].relativePath ||
        saved.calls[1].expectedContent !== saved.calls[0].content ||
        saved.content !== saved.calls[1].content ||
        parse(saved.content).actors.length !== 3) {
      throw new Error('Native editor did not update the newly created YAML with its original revision');
    }
  } finally {
    await nativePage.close();
  }
  // 空の既存YAMLは新規作成ではなく既存編集として開き、原文付きで上書きする。
  const emptyPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const originalEmpty = stringify({
    schemaVersion: '1.0',
    metadata: { id: 'empty-existing', title: '空の既存フロー', description: '', category: 'custom' },
    actors: [],
    steps: [],
  });
  await emptyPage.addInitScript(content => {
    const files = new Map([['empty-existing.yaml', content]]);
    const calls = [];
    window.__emptyExistingTest = { files, calls };
    window.__TAURI_INTERNALS__ = {
      invoke: async (command, args = {}) => {
        if (command === 'select_scenario_folder') return 'E2E existing folder';
        if (command === 'list_scenario_files') return [...files.keys()];
        if (command === 'read_scenario_file') return files.get(args.relativePath);
        if (command === 'write_scenario_file') {
          if (files.get(args.relativePath) !== args.expectedContent) throw new Error('保存競合');
          files.set(args.relativePath, args.content);
          calls.push({ command, ...args });
          return;
        }
        if (command === 'create_scenario_file') throw new Error('既存YAMLを新規作成してはいけません');
        throw new Error('Unexpected native command: ' + command);
      },
    };
  }, originalEmpty);
  try {
    await emptyPage.goto('http://127.0.0.1:4179/');
    await emptyPage.getByRole('button', { name: /ローカルのシナリオフォルダを開く/ }).click();
    await emptyPage.getByRole('button', { name: '✎ フローを編集' }).waitFor();
    await emptyPage.getByRole('button', { name: '✎ フローを編集' }).click();
    await emptyPage.getByRole('heading', { name: 'フローエディター' }).waitFor();
    await emptyPage.getByRole('button', { name: '＋ ノード追加' }).click();
    await emptyPage.getByRole('button', { name: '＋ ノード追加' }).click();
    await emptyPage.getByLabel('X', { exact: true }).fill('300');
    const emptyActors = emptyPage.locator('[data-actor-id]');
    const emptyHandle = await emptyPage.locator('[data-connection-handle]').first().boundingBox();
    const emptyDestination = await emptyActors.last().locator('rect').first().boundingBox();
    if (!emptyHandle || !emptyDestination) throw new Error('Existing scenario connection handles are missing');
    await emptyPage.mouse.move(emptyHandle.x + emptyHandle.width / 2, emptyHandle.y + emptyHandle.height / 2);
    await emptyPage.mouse.down();
    await emptyPage.mouse.move(emptyDestination.x + emptyDestination.width / 2, emptyDestination.y + emptyDestination.height / 2, { steps: 12 });
    await emptyPage.mouse.up();
    await emptyPage.getByText('通信線を追加しました。').waitFor();
    await emptyPage.getByRole('button', { name: 'YAMLを保存…' }).click();
    await emptyPage.getByText('選択したフォルダのYAMLを上書き保存しました。').waitFor();
    const result = await emptyPage.evaluate(() => {
      const { files, calls } = window.__emptyExistingTest;
      return { calls, content: files.get('empty-existing.yaml') };
    });
    if (result.calls.length !== 1 || result.calls[0].command !== 'write_scenario_file' ||
        result.calls[0].expectedContent !== originalEmpty || parse(result.content).actors.length !== 2 ||
        parse(result.content).steps.length !== 1) {
      throw new Error('Existing empty YAML was not updated with its original content');
    }
    // 編集開始後の外部更新を模擬し、競合時に内容と比較基準が上書きされないことを検証する。
    const externalRevision = result.content + '# externally updated\\n';
    await emptyPage.evaluate(content => {
      window.__emptyExistingTest.files.set('empty-existing.yaml', content);
    }, externalRevision);
    await emptyPage.getByRole('button', { name: '＋ ノード追加' }).click();
    await emptyPage.getByRole('button', { name: 'YAMLを保存…' }).click();
    await emptyPage.getByText(/保存できませんでした:.*保存競合/).waitFor();
    // 失敗後の再試行も古い比較基準を使い、外部変更を上書きしてはいけない。
    await emptyPage.getByRole('button', { name: 'YAMLを保存…' }).click();
    await emptyPage.getByText(/保存できませんでした:.*保存競合/).waitFor();
    const conflict = await emptyPage.evaluate(() => {
      const { files, calls } = window.__emptyExistingTest;
      return { content: files.get('empty-existing.yaml'), calls };
    });
    if (conflict.content !== externalRevision || conflict.calls.length !== 1) {
      throw new Error('Save conflict overwrote external YAML or incorrectly advanced the saved revision');
    }
    // 保存競合のまま画面を離れようとしても、未保存の変更を維持する。
    await emptyPage.getByRole('button', { name: '再生画面へ戻る' }).click();
    const exitDialog = emptyPage.getByRole('dialog', { name: '未保存の変更があります' });
    await exitDialog.waitFor();
    await exitDialog.getByRole('button', { name: '保存して戻る' }).click();
    await emptyPage.getByText(/保存できませんでした:.*保存競合/).waitFor();
    await exitDialog.waitFor();
    await emptyPage.getByRole('heading', { name: 'フローエディター' }).waitFor();
    if (await emptyPage.locator('[data-actor-id]').count() !== 3) {
      throw new Error('Conflict save-and-exit discarded unsaved nodes');
    }
    await exitDialog.getByRole('button', { name: '編集を続ける' }).click();
    await exitDialog.waitFor({ state: 'hidden' });
    const preserved = await emptyPage.evaluate(() => window.__emptyExistingTest.files.get('empty-existing.yaml'));
    if (preserved !== externalRevision) throw new Error('Conflict exit flow overwrote external YAML');
    await emptyPage.getByRole('button', { name: '再生画面へ戻る' }).click();
    await emptyPage.getByRole('dialog', { name: '未保存の変更があります' }).getByRole('button', { name: '保存せず戻る' }).click();
    await emptyPage.getByRole('heading', { name: 'フローエディター' }).waitFor({ state: 'hidden' });
    if (await emptyPage.evaluate(() => window.__emptyExistingTest.files.get('empty-existing.yaml')) !== externalRevision) {
      throw new Error('Discarding local changes modified externally updated YAML');
    }
  } finally {
    await emptyPage.close();
  }
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
  // ウィンドウリサイズ後もSVGのviewBoxと表示サイズを同期し、再センタリングできること。
  await page.setViewportSize({ width: 1100, height: 760 });
  await page.waitForFunction(() => {
    const svg = document.querySelector('.editor-canvas svg');
    if (!svg) return false;
    const rect = svg.getBoundingClientRect();
    const view = svg.viewBox.baseVal;
    return Math.abs(view.width - rect.width) < 2 && Math.abs(view.height - rect.height) < 2;
  });
  await page.getByRole('button', { name: '表示リセット' }).click();
  const resizedNodes = await page.locator('[data-actor-id]').evaluateAll(elements => elements.map(element => {
    const rect = element.querySelector('rect').getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  }));
  const resizedCanvas = await svg.boundingBox();
  if (!resizedCanvas) throw new Error('Canvas disappeared after viewport resize');
  const resizedCenter = {
    x: (Math.min(...resizedNodes.map(item => item.left)) + Math.max(...resizedNodes.map(item => item.right))) / 2,
    y: (Math.min(...resizedNodes.map(item => item.top)) + Math.max(...resizedNodes.map(item => item.bottom))) / 2,
  };
  if (Math.abs(resizedCenter.x - (resizedCanvas.x + resizedCanvas.width / 2)) > 4 ||
      Math.abs(resizedCenter.y - (resizedCanvas.y + resizedCanvas.height / 2)) > 4) {
    throw new Error('Viewport reset failed to center nodes after resize');
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
  let savedScenarioForReload = null;
  await page.route('**/scenarios/order-processing.yaml', async route => {
    const scenario = savedScenarioForReload ?? parse(await readFile('public/scenarios/order-processing.yaml', 'utf8'));
    // 往路と復路の設定が保存・再読込を経ても失われないことを検証する。
    scenario.steps[0].bidirectional = true;
    scenario.steps[0].reverseFrom = 'order';
    scenario.steps[0].reverseTo = 'customer';
    scenario.steps[0].reversePayload = '注文受付結果';
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

  // 双方向通信のUI編集をUndo/Redoで戻せること。往復線は1件の通信として管理する。
  await page.getByRole('button', { name: '1. 注文受付' }).click();
  const direction = page.getByLabel('接続方向');
  const selectCommunication = () => page.getByRole('button', { name: '1. 注文受付' }).click();
  await direction.selectOption('one');
  if (await page.getByLabel('復路通信内容').count() !== 0) {
    throw new Error('Reverse communication settings remained visible in one-way mode');
  }
  await page.keyboard.press('Control+z');
  await selectCommunication();
  if (await direction.inputValue() !== 'both') throw new Error('Undo did not restore bidirectional mode');
  await page.keyboard.press('Control+y');
  await selectCommunication();
  if (await direction.inputValue() !== 'one') throw new Error('Redo did not restore one-way mode');
  await page.keyboard.press('Control+z');
  await selectCommunication();
  if (await direction.inputValue() !== 'both') throw new Error('Second Undo did not restore bidirectional mode');
  // 復路内容のフォーム編集はYAML保存にも反映される。元の値に戻して後続の再読込テストへ渡す。
  const reversePayload = page.getByLabel('復路通信内容');
  await reversePayload.fill('編集後の応答');
  if (await reversePayload.inputValue() !== '編集後の応答') throw new Error('Reverse payload editing failed');
  await reversePayload.fill('注文受付結果');
  if (await reversePayload.inputValue() !== '注文受付結果') throw new Error('Reverse payload was not restored for YAML save');

  // 再生順の入れ替えは通信IDを保持したままUndo/Redoでき、保存時も順序が維持される。
  const playbackRows = page.locator('.editor-step-list > div');
  const playbackTitles = async () => playbackRows.locator('button.selected, button:not([aria-label])').allTextContents();
  const originalOrder = await playbackTitles();
  if (originalOrder.length !== 5 || !originalOrder[0].includes('注文受付') || !originalOrder[1].includes('在庫照会')) {
    throw new Error('Unexpected playback order before reordering: ' + JSON.stringify(originalOrder));
  }
  await playbackRows.nth(1).getByRole('button', { name: '上へ' }).click();
  const reordered = await playbackTitles();
  if (!reordered[0].includes('在庫照会') || !reordered[1].includes('注文受付')) {
    throw new Error('Playback order did not move the second step up: ' + JSON.stringify(reordered));
  }
  await page.keyboard.press('Control+z');
  if (JSON.stringify(await playbackTitles()) !== JSON.stringify(originalOrder)) throw new Error('Undo did not restore playback order');
  await page.keyboard.press('Control+y');
  if (JSON.stringify(await playbackTitles()) !== JSON.stringify(reordered)) throw new Error('Redo did not restore reordered playback steps');
  await page.keyboard.press('Control+z');
  if (JSON.stringify(await playbackTitles()) !== JSON.stringify(originalOrder)) throw new Error('Playback order was not restored before YAML save');

  // 往路・復路の経由点を独立して追加・解除し、Undo/Redoでも相手側を保持する。
  const receiveEdge = page.locator('.editor-edge[data-step-id="receive"]');
  const openReceiveMenu = async () => {
    // SVGパスの外接矩形中心は実際の線上とは限らないため、対象要素へ直接contextmenuを発火する。
    await receiveEdge.locator('path').first().dispatchEvent('contextmenu', { bubbles: true, clientX: 450, clientY: 300, button: 2 });
    await page.getByRole('menuitem', { name: '往路の経由点を追加' }).waitFor();
  };
  await openReceiveMenu();
  await page.getByRole('menuitem', { name: '往路の経由点を追加' }).dispatchEvent('click');
  await receiveEdge.locator('[data-waypoint-index]:not([data-waypoint-direction])').waitFor();
  await openReceiveMenu();
  await page.getByRole('menuitem', { name: '復路の経由点を追加' }).dispatchEvent('click');
  await receiveEdge.locator('[data-waypoint-direction="reverse"]').waitFor();
  await page.keyboard.press('Control+z');
  await page.getByRole('button', { name: '1. 注文受付' }).click();
  if (await receiveEdge.locator('[data-waypoint-direction="reverse"]').count() !== 0 ||
      await receiveEdge.locator('[data-waypoint-index]:not([data-waypoint-direction])').count() !== 1) {
    throw new Error('Undo of reverse waypoint changed forward waypoints');
  }
  await page.keyboard.press('Control+y');
  await page.getByRole('button', { name: '1. 注文受付' }).click();
  if (await receiveEdge.locator('[data-waypoint-direction="reverse"]').count() !== 1) {
    throw new Error('Redo did not restore reverse waypoint');
  }
  await openReceiveMenu();
  await page.getByRole('menuitem', { name: '往路の経由点を解除' }).dispatchEvent('click');
  await page.getByRole('button', { name: '1. 注文受付' }).click();
  if (await receiveEdge.locator('[data-waypoint-index]:not([data-waypoint-direction])').count() !== 0 ||
      await receiveEdge.locator('[data-waypoint-direction="reverse"]').count() !== 1) {
    throw new Error('Removing forward waypoints also removed reverse waypoints');
  }
  await page.keyboard.press('Control+z');
  await page.getByRole('button', { name: '1. 注文受付' }).click();
  if (await receiveEdge.locator('[data-waypoint-index]:not([data-waypoint-direction])').count() !== 1) {
    throw new Error('Undo did not restore forward waypoint');
  }
  await openReceiveMenu();
  await page.getByRole('menuitem', { name: '復路の経由点を解除' }).dispatchEvent('click');
  await page.getByRole('button', { name: '1. 注文受付' }).click();
  if (await receiveEdge.locator('[data-waypoint-direction="reverse"]').count() !== 0 ||
      await receiveEdge.locator('[data-waypoint-index]:not([data-waypoint-direction])').count() !== 1) {
    throw new Error('Removing reverse waypoints also removed forward waypoints');
  }
  await page.keyboard.press('Control+z');
  await page.getByRole('button', { name: '1. 注文受付' }).click();
  if (await receiveEdge.locator('[data-waypoint-direction="reverse"]').count() !== 1) {
    throw new Error('Undo did not restore reverse waypoint after removal');
  }

  // Web保存の回帰確認: 既存シナリオの編集結果がYAMLとしてダウンロードされる。
  // 保存したファイルを再パースし、ノード配置の負座標が欠落しないことを検証する。
  // ChromiumではFile System Access APIが優先されるため、ダウンロード分岐を明示的に検証する。
  await page.evaluate(() => Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }));
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'YAMLを保存…' }).click(),
  ]);
  if (!/\.ya?ml$/i.test(download.suggestedFilename())) {
    throw new Error('Downloaded scenario does not have a YAML filename: ' + download.suggestedFilename());
  }
  const downloadedPath = await download.path();
  if (!downloadedPath) throw new Error('Downloaded YAML file is not available');
  const downloadedScenario = parse(await readFile(downloadedPath, 'utf8'));
  if (!Array.isArray(downloadedScenario.actors) || downloadedScenario.actors.length !== 4) {
    throw new Error('Downloaded YAML lost the existing scenario actors');
  }
  if (downloadedScenario.actors[0].position.x !== -1800 ||
      downloadedScenario.actors[0].position.y !== -950) {
    throw new Error('Downloaded YAML did not preserve negative actor coordinates');
  }
  await page.getByText('YAMLをダウンロードしました。', { exact: false }).waitFor();
  if (downloadedScenario.steps.map(step => step.id).join(',') !== 'receive,stock,stock-result,pay,done') {
    throw new Error('YAML save changed playback order after Undo');
  }
  const bidirectionalStep = downloadedScenario.steps.find(step => step.id === 'receive');
  if (!bidirectionalStep || bidirectionalStep.bidirectional !== true ||
      bidirectionalStep.reverseFrom !== 'order' ||
      bidirectionalStep.reverseTo !== 'customer' ||
      bidirectionalStep.reversePayload !== '注文受付結果' ||
      bidirectionalStep.actions[0].from !== 'customer' ||
      bidirectionalStep.actions[0].to !== 'order') {
    throw new Error('Downloaded YAML lost bidirectional forward/reverse communication settings');
  }
  if (bidirectionalStep.waypoints?.length !== 1 || bidirectionalStep.reverseWaypoints?.length !== 1) {
    throw new Error('YAML save lost independent forward/reverse waypoints');
  }
  // 保存したYAMLを次の読込データとして使用し、エディターで再保存しても往復設定が保持されること。
  savedScenarioForReload = downloadedScenario;
  await page.reload();
  await page.getByRole('heading', { name: 'ECサイトの注文処理' }).waitFor();
  await page.getByRole('button', { name: /フローを編集/ }).click();
  await page.locator('[data-actor-id]').first().waitFor();
  await page.evaluate(() => Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true }));
  const [roundTripDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'YAMLを保存…' }).click(),
  ]);
  const roundTripPath = await roundTripDownload.path();
  if (!roundTripPath) throw new Error('Re-saved YAML download is missing');
  const roundTripScenario = parse(await readFile(roundTripPath, 'utf8'));
  const roundTripStep = roundTripScenario.steps.find(step => step.id === 'receive');
  if (!roundTripStep || roundTripStep.bidirectional !== true ||
      roundTripStep.reverseFrom !== 'order' ||
      roundTripStep.reverseTo !== 'customer' ||
      roundTripStep.reversePayload !== '注文受付結果') {
    throw new Error('Bidirectional communication settings changed after YAML reload and save');
  }


  if (errors.length) throw new Error('Browser errors: ' + errors.join(' | '));
  console.log('PASS: undo/redo, redo branch invalidation, atomic drag undo, pointer cancellation rollback, multi drag atomic undo/redo and cancellation, viewport resize, 30% drag, viewport fit, negative-coordinate centering, existing YAML initial centering, bidirectional UI undo/redo, playback order undo/redo and YAML order, browser YAML download and bidirectional communication reload round trip, preview round trip, unsaved changes, discard navigation');
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
