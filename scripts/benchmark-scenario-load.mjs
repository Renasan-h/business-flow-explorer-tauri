import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { stringify } from 'yaml';
import { writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

// 実際のsrc/scenario.tsのYAML解析・参照展開・配置処理をブラウザ上で計測する。
// GUI描画・操作・保存・WindowsネイティブファイルIOは対象外。
const sizes = [
  { label: 'small', actors: 20, steps: 30 },
  { label: 'medium', actors: 100, steps: 200 },
  { label: 'large', actors: 500, steps: 1000 },
  { label: 'extreme-reference', actors: 5000, steps: 10000 },
];
const selected = process.argv.includes('--extreme') ? sizes : sizes.slice(0, 3);
const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0 && !process.argv[outputIndex + 1]) {
  throw new Error('--outputには保存先ファイル名が必要です');
}
const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
const npmCli = process.env.npm_execpath;
const server = npmCli
  ? spawn(process.execPath, [npmCli, 'run', 'dev:web', '--', '--host', '127.0.0.1', '--port', '4180', '--strictPort'], { stdio: 'pipe' })
  : spawn(process.platform === 'win32' ? 'cmd.exe' : 'npm',
    process.platform === 'win32'
      ? ['/d', '/s', '/c', 'npm run dev:web -- --host 127.0.0.1 --port 4180 --strictPort']
      : ['run', 'dev:web', '--', '--host', '127.0.0.1', '--port', '4180', '--strictPort'],
    { stdio: 'pipe' });
let browser;
let failure;
let logs = '';
server.on('error', error => { failure = error; });
server.on('exit', (code, signal) => { failure ??= new Error(`Vite終了: code=${code}, signal=${signal}`); });
for (const stream of [server.stdout, server.stderr]) {
  stream?.on('data', chunk => { logs = (logs + chunk.toString()).slice(-6000); });
}
const results = [];
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (failure) throw failure;
    try {
      if ((await fetch('http://127.0.0.1:4180/')).ok) { ready = true; break; }
    } catch {}
    await delay(1000);
  }
  if (!ready) throw new Error('Vite起動タイムアウト: ' + logs);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4180/');
  for (const size of selected) {
    const actors = Array.from({ length: size.actors }, (_, i) => ({
      id: `actor-${i}`, name: `担当者${i}`, type: 'service',
      position: { x: (i % 20) * 220, y: Math.floor(i / 20) * 140 },
    }));
    const steps = Array.from({ length: size.steps }, (_, i) => ({
      id: `step-${i}`, title: `通信${i}`, description: '',
      actions: [{ type: 'transfer', from: `actor-${i % size.actors}`,
        to: `actor-${(i + 1) % size.actors}`, payload: 'test', durationMs: 100 }],
    }));
    const yaml = stringify({
      schemaVersion: '1.0',
      metadata: { id: 'performance', title: '性能測定', description: '', category: 'test' },
      actors, steps,
    });
    await page.route('**/scenarios/0/performance.yaml', route =>
      route.fulfill({ status: 200, contentType: 'text/yaml; charset=utf-8', body: yaml }));
    const times = [];
    for (let run = 0; run < 3; run++) {
      const elapsed = await page.evaluate(async () => {
        const { loadScenario } = await import('/src/scenario.ts');
        const start = performance.now();
        const scenario = await loadScenario('/scenarios/0/performance.yaml');
        if (!scenario.actors.length || !scenario.steps.length) throw new Error('読込結果が空です');
        return performance.now() - start;
      });
      times.push(Math.round(elapsed * 10) / 10);
    }
    times.sort((a, b) => a - b);
    results.push({ label: size.label, actors: size.actors, steps: size.steps,
      yamlBytes: Buffer.byteLength(yaml), runsMs: times, medianMs: times[1] });
    await page.unroute('**/scenarios/0/performance.yaml');
  }
  const report = JSON.stringify({ measuredAt: new Date().toISOString(),
    platform: process.platform, node: process.version, scope: 'YAML loadScenario only',
    results }, null, 2);
  console.log(report);
  if (outputPath) {
    await writeFile(outputPath, report + '\n', 'utf8');
    console.log(`性能測定結果を保存しました: ${outputPath}`);
  }
} finally {
  await browser?.close();
  if (server.pid) {
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
      await new Promise(resolve => { killer.once('close', resolve); killer.once('error', resolve); });
    } else server.kill('SIGTERM');
  }
}
