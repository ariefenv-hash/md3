#!/usr/bin/env node
// ==================== build-ocr-vendor.mjs — OCR vendor 离线资源构建脚本（v8.52 #58） ====================
//
// 产出 apps/_shared/vendor/ocr/ 全量资源（零 CDN 纪律）。本脚本记录可复现管线；
// 临时构建区 npm 包不入库（.gitignore node_modules/），产物入库。
//
// 管线：
//   1. mkdir 临时区 && npm install tesseract.js@5.1.1（自带依赖 tesseract.js-core@5.1.1）
//   2. 主线程包：tesseract.js src/index.js 系 CJS（module.exports），dist/tesseract.esm.min.js
//      实为 CJS 包装（首行 `module.exports=r()`，node --input-type=module 实测失败）——
//      走 esbuild 自建 entry（具名再导出 createWorker/recognize/createScheduler/
//      setLogging/OEM/PSM）→ --bundle --format=esm --platform=browser --minify
//      → tesseract-bundle.mjs（18.8KB，7 具名导出）。
//   3. worker：dist/worker.min.js 原样拷贝（12 万字节，内含 zlibjs gunzip + idb-keyval 缓存）。
//   4. core：tesseract.js-core 5.1.1 LSTM 变体双件（v5 OEM 默认 LSTM_ONLY=1）：
//      - tesseract-core-simd-lstm.wasm.js（3.76MB，主路径）
//      - tesseract-core-lstm.wasm.js     （3.76MB，无 SIMD 回退——Safari ≤16.4 等）
//      worker-script/browser/getCore.js 目录型 corePath 特性探测自动二选一
//      （simd() 为真 → simd-lstm；否则 lstm），文件名硬编码约定，不可改名。
//   5. 语言包：@tesseract.js-data/{eng,chi_sim,chi_tra} 的 4.0.0_best_int/
//      （v5 LSTM_ONLY 默认档，best 整数量化模型，精度高于 tessdata_fast）：
//      eng 2952873B / chi_sim 1718768B / chi_tra 1656239B（.gz，zlibjs worker 内解压）。
//      注意 4.0.0/ 目录是 legacy+LSTM 混合标准模型（11M/20M/26M）—— 不采用。
//
// 运行：node scripts/build-ocr-vendor.mjs  （幂等，覆盖式重拷）
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = '/tmp/ocr-vendor-build';
const out = join(root, 'ios-desktop/apps/_shared/vendor/ocr');
const langsOut = join(out, 'langs');

mkdirSync(tmp, { recursive: true });
mkdirSync(langsOut, { recursive: true });

if (!existsSync(join(tmp, 'node_modules/tesseract.js/package.json'))) {
  console.log('[1/3] npm install tesseract.js@5.1.1 + @tesseract.js-data/* …');
  execSync('npm install tesseract.js@5.1.1 @tesseract.js-data/eng @tesseract.js-data/chi_sim @tesseract.js-data/chi_tra',
    { cwd: tmp, stdio: 'inherit' });
} else {
  console.log('[1/3] 临时区已就绪，跳过 npm install');
}

console.log('[2/3] esbuild 主线程 ESM bundle …');
const entry = join(tmp, 'ocr-entry.mjs');
const entrySrc = `import Tesseract from 'tesseract.js';
export const createWorker = Tesseract.createWorker;
export const recognize = Tesseract.recognize;
export const createScheduler = Tesseract.createScheduler;
export const setLogging = Tesseract.setLogging;
export const OEM = Tesseract.OEM;
export const PSM = Tesseract.PSM;
export default Tesseract;
`;
execSync(`echo > /dev/null`); // noop 保持顺序可读
import('node:fs').then(({ writeFileSync }) => {
  writeFileSync(entry, entrySrc);
  execSync(`npx esbuild ${entry} --bundle --format=esm --platform=browser --minify --outfile=${join(tmp, 'tesseract-bundle.mjs')}`,
    { cwd: tmp, stdio: 'inherit' });
  console.log('[3/3] 拷贝入库 …');
  copyFileSync(join(tmp, 'tesseract-bundle.mjs'), join(out, 'tesseract-bundle.mjs'));
  copyFileSync(join(tmp, 'node_modules/tesseract.js/dist/worker.min.js'), join(out, 'worker.min.js'));
  copyFileSync(join(tmp, 'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js'), join(out, 'tesseract-core-simd-lstm.wasm.js'));
  copyFileSync(join(tmp, 'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js'), join(out, 'tesseract-core-lstm.wasm.js'));
  copyFileSync(join(tmp, 'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'), join(langsOut, 'eng.traineddata.gz'));
  copyFileSync(join(tmp, 'node_modules/@tesseract.js-data/chi_sim/4.0.0_best_int/chi_sim.traineddata.gz'), join(langsOut, 'chi_sim.traineddata.gz'));
  copyFileSync(join(tmp, 'node_modules/@tesseract.js-data/chi_tra/4.0.0_best_int/chi_tra.traineddata.gz'), join(langsOut, 'chi_tra.traineddata.gz'));
  ['tesseract-bundle.mjs', 'worker.min.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js', 'langs/eng.traineddata.gz', 'langs/chi_sim.traineddata.gz', 'langs/chi_tra.traineddata.gz']
    .forEach((f) => {
      const p = join(out, f);
      if (!existsSync(p)) { console.error('缺失产物: ' + f); process.exit(1); }
      console.log('  OK ' + f + ' ' + statSync(p).size + 'B');
    });
  console.log('done.');
});
