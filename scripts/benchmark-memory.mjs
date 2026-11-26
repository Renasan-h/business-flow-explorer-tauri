import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { setTimeout as delay } from 'node:timers/promises';

// YAML読込・参照保持後のChromiumレンダラーJSヒープを計測。Tauri全体のメモリではない。
const scenarioCounts = [1, 5, 10, 20];
const lineTargets = [50, 200, 500, 1000];
const outputIndex = process.argv.indexOf('--output-dir');
if (outputIndex >= 0 && (!process.argv[outputIndex + 1] || process.argv[outputIndex + 1].startsWith('--'))) {
  throw new Error('--output-dir に出力先フォルダを指定してください');
}
const outputDir = outputIndex >= 0 ? process.argv[outputIndex + 1] : 'benchmark-memory';
const npmCli = process.env.npm_execpath;
const server = npmCli
  ? spawn(process.execPath, [npmCli, 'run', 'dev:web', '--', '--host', '127.0.0.1', '--port', '4181', '--strictPort'], { stdio: 'pipe' })
  : spawn(process.platform === 'win32' ? 'cmd.exe' : 'npm',
    process.platform === 'win32'
      ? ['/d', '/s', '/c', 'npm run dev:web -- --host 127.0.0.1 --port 4181 --strictPort']
      : ['run', 'dev:web', '--', '--host', '127.0.0.1', '--port', '4181', '--strictPort'],
    { stdio: 'pipe' });
let browser;
let serverFailure;
let output = '';
server.on('error', error => { serverFailure = error; });
server.on('exit', (code, signal) => { serverFailure ??= new Error(`Vite exited: ${code}/${signal}`); });
for (const stream of [server.stdout, server.stderr]) stream?.on('data', chunk => {
  output = (output + chunk.toString()).slice(-5000);
});

function makeYaml(target, id) {
  const actorCount = Math.max(2, Math.floor(target / 20));
  const actors = Array.from({ length: actorCount }, (_, i) => ({
    id: `actor-${i}`, name: `Node ${i}`, type: 'service',
    position: { x: i % 12 * 200, y: Math.floor(i / 12) * 140 },
  }));
  const steps = [];
  let yaml;
  do {
    const i = steps.length;
    steps.push({ id: `step-${i}`, title: `Step ${i}`, description: '',
      actions: [{ type: 'transfer', from: `actor-${i % actorCount}`,
        to: `actor-${(i + 1) % actorCount}`, payload: 'data', durationMs: 100 }] });
    yaml = stringify({ schemaVersion: '1.0', metadata: {
      id: `memory-${id}`, title: 'Benchmark', description: '', category: 'test',
    }, actors, steps });
  } while (yaml.split('\n').length - 1 < target);
  return { yaml, actualLines: yaml.split('\n').length - 1, actors: actorCount, steps: steps.length };
}
const mib = n => Math.round(n / 1048576 * 100) / 100;
function svgChart(rows) {
  const left = 85, top = 75, width = 900, height = 440;
  const max = Math.max(1, ...rows.map(row => row.heapGrowthMB)) * 1.2;
  const x = n => left + (n - 1) / 19 * width;
  const y = n => top + height - n / max * height;
  const colors = ['#2563eb', '#16a34a', '#d97706', '#dc2626'];
  const lines = lineTargets.map((target, index) => {
    const series = rows.filter(row => row.targetLines === target);
    const path = series.map((row, i) => `${i ? 'L' : 'M'} ${x(row.scenarioCount)} ${y(row.heapGrowthMB)}`).join(' ');
    return `<path d="${path}" stroke="${colors[index]}" stroke-width="3" fill="none"/>` +
      series.map(row => `<circle cx="${x(row.scenarioCount)}" cy="${y(row.heapGrowthMB)}" r="5" fill="${colors[index]}"/>`).join('') +
      `<text x="${left + index * 220}" y="574" font-size="14" fill="${colors[index]}">● ~${target} lines</text>`;
  }).join('');
  const grid = Array.from({ length: 6 }, (_, i) => {
    const value = max * i / 5;
    return `<line x1="${left}" x2="${left + width}" y1="${y(value)}" y2="${y(value)}" stroke="#e5e7eb"/><text x="${left - 8}" y="${y(value) + 4}" text-anchor="end" font-size="13">${value.toFixed(1)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1060 620"><rect width="100%" height="100%" fill="white"/><text x="${left}" y="35" font-size="23" font-weight="bold">Scenario count vs renderer JS heap growth</text>${grid}<line x1="${left}" x2="${left}" y1="${top}" y2="${top + height}" stroke="#475569"/><line x1="${left}" x2="${left + width}" y1="${top + height}" y2="${top + height}" stroke="#475569"/>${scenarioCounts.map(n => `<text x="${x(n)}" y="${top + height + 24}" font-size="14" text-anchor="middle">${n}</text>`).join('')}<text x="530" y="560" text-anchor="middle" font-size="14">Loaded scenarios</text><text transform="translate(22 290) rotate(-90)" text-anchor="middle" font-size="14">Heap growth (MiB)</text>${lines}<text x="${left}" y="605" font-size="12" fill="#64748b">Renderer JS heap only; retained YAML scenario objects, not Tauri app RSS or GPU memory</text></svg>`;
}

try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (serverFailure) throw new Error(`${serverFailure.message}\n${output}`);
    try { if ((await fetch('http://127.0.0.1:4181/')).ok) { ready = true; break; } } catch {}
    await delay(1000);
  }
  if (!ready) throw new Error(`Vite startup timeout: ${output}`);
  browser = await chromium.launch({ headless: true });
  const rows = [];
  for (const targetLines of lineTargets) {
    const generated = makeYaml(targetLines, targetLines);
    for (const scenarioCount of scenarioCounts) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Performance.enable');
        await page.goto('http://127.0.0.1:4181/');
        await page.route('**/scenarios/0/memory-*.yaml', route => route.fulfill({
          status: 200, contentType: 'text/yaml; charset=utf-8', body: generated.yaml,
        }));
        await page.evaluate(() => import('/src/scenario.ts'));
        const heap = async () => {
          const { metrics } = await cdp.send('Performance.getMetrics');
          const value = metrics.find(item => item.name === 'JSHeapUsedSize')?.value;
          if (!Number.isFinite(value)) throw new Error('JSHeapUsedSize unavailable');
          return value;
        };
        await cdp.send('HeapProfiler.collectGarbage');
        const before = await heap();
        const started = Date.now();
        await page.evaluate(async count => {
          const { loadScenario } = await import('/src/scenario.ts');
          window.__memoryBenchmark = [];
          for (let i = 0; i < count; i++) {
            window.__memoryBenchmark.push(await loadScenario(`/scenarios/0/memory-${i}.yaml`));
          }
        }, scenarioCount);
        const elapsedMs = Date.now() - started;
        await cdp.send('HeapProfiler.collectGarbage');
        const after = await heap();
        const row = { scenarioCount, targetLines, actualLines: generated.actualLines,
          actorsPerScenario: generated.actors, stepsPerScenario: generated.steps,
          yamlBytesPerScenario: Buffer.byteLength(generated.yaml),
          heapBeforeMB: mib(before), heapAfterMB: mib(after),
          heapGrowthMB: mib(after - before), elapsedMs };
        rows.push(row);
        console.log(`${scenarioCount} scenarios × ${row.actualLines} lines: +${row.heapGrowthMB} MiB (${elapsedMs} ms)`);
      } finally {
        await context.close();
      }
    }
  }
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'memory-results.json'), JSON.stringify({
    measuredAt: new Date().toISOString(), platform: process.platform, node: process.version,
    metric: 'Chromium renderer JSHeapUsedSize after forced garbage collection',
    limitations: 'Not Tauri process RSS, GPU memory, or GUI drawing; each case has a fresh browser context',
    rows,
  }, null, 2) + '\n');
  await writeFile(join(outputDir, 'memory-chart.svg'), svgChart(rows));
  console.log(`Saved ${outputDir}/memory-results.json and memory-chart.svg`);
} finally {
  await browser?.close();
  if (server.pid) {
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
      await new Promise(resolve => { killer.once('close', resolve); killer.once('error', resolve); });
    } else server.kill('SIGTERM');
  }
}
