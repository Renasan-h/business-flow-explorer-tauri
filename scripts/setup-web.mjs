import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const web = resolve('web');
const repository = 'https://github.com/Renasan-h/business-flow-explorer.git';

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} が失敗しました (exit ${result.status})`);
  }
}

// Web版を読み取り専用のベースとして別フォルダに取得する。
// 既存の作業ツリーは勝手に更新・破棄しない。
if (!existsSync(resolve(web, 'package.json'))) {
  run('git', ['clone', '--depth', '1', repository, web], process.cwd());
}
run('npm', ['install', '--no-audit', '--no-fund'], web);
