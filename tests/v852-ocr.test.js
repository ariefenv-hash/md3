// ==================== v852-ocr.test.js — #58 OCR 文字识别（v8.52） ====================
// 验收锚（#58 原文）：3000px 截图识别 < 10s（中英混合档，e2e 实测）+ 进度实时 +
// 识别中可取消 + 结果可复制 + 预览缩放 + 2000px 长边降采样 + vitest 锚。
// 执行要点：语言 5 档沿用 / tesseract.js@5 npm 引入全量离线化（worker + SIMD/LSTM wasm
// 双核 + best_int 三语言包，零 CDN 零运行时拼 script）/ 终端 ocr 深链可达。
import { describe, it, expect } from 'vitest';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/ocr-core.js'), 'utf8');
const PAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/ocr/index.html'), 'utf8');
const APP_MJS_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/ocr/app.mjs'), 'utf8');
const SHELL_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps/ocr.js'), 'utf8');
const APPSDATA_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf8');
const ICONS_SRC = readFileSync(join(ROOT, 'ios-desktop/js/app-icons.js'), 'utf8');
const TCORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/terminal-core.js'), 'utf8');
const TPAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/terminal/index.html'), 'utf8');
const VENDOR_DIR = join(ROOT, 'ios-desktop/apps/_shared/vendor/ocr');
const FIXTURE = JSON.parse(readFileSync(join(ROOT, 'tests/icon-dynamic-colors.generated.json'), 'utf-8'));

// ---------- 沙箱提取（经典脚本 IIFE → window.__ocrCore） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__ocrCore;

// ---------- vendor 文件 ----------
const VENDOR_FILES = {
  bundle: join(VENDOR_DIR, 'tesseract-bundle.mjs'),
  worker: join(VENDOR_DIR, 'worker.min.js'),
  coreSimd: join(VENDOR_DIR, 'tesseract-core-simd-lstm.wasm.js'),
  corePlain: join(VENDOR_DIR, 'tesseract-core-lstm.wasm.js'),
  eng: join(VENDOR_DIR, 'langs/eng.traineddata.gz'),
  chiSim: join(VENDOR_DIR, 'langs/chi_sim.traineddata.gz'),
  chiTra: join(VENDOR_DIR, 'langs/chi_tra.traineddata.gz'),
};

describe('v8.52 #58 core：语言 5 档（nightsky 设计沿用）', () => {
  it('恰 5 档，id/langs/label 三元组唯一且齐整', () => {
    expect(core.LANG_MODES).toHaveLength(5);
    const ids = core.LANG_MODES.map((m) => m.id);
    expect(new Set(ids).size).toBe(5);
    core.LANG_MODES.forEach((m) => {
      expect(typeof m.id).toBe('string');
      expect(typeof m.label).toBe('string');
      expect(typeof m.langs).toBe('string');
      expect(m.langs.length).toBeGreaterThan(0);
    });
  });
  it('五档语义精确：简中/简中+英/繁中/繁中+英/英（tesseract "+" 连接多语言）', () => {
    const byId = {};
    core.LANG_MODES.forEach((m) => { byId[m.id] = m; });
    expect(byId['chi_sim'].langs).toBe('chi_sim');
    expect(byId['chi_sim+eng'].langs).toBe('chi_sim+eng');
    expect(byId['chi_tra'].langs).toBe('chi_tra');
    expect(byId['chi_tra+eng'].langs).toBe('chi_tra+eng');
    expect(byId['eng'].langs).toBe('eng');
  });
  it('首档为简体中文（默认档）', () => {
    expect(core.LANG_MODES[0].id).toBe('chi_sim');
  });
});

describe('v8.52 #58 core：图片名与门禁（isImageName/validateImage）', () => {
  it('六扩展名大小写不敏感', () => {
    expect(core.isImageName('a.png')).toBe(true);
    expect(core.isImageName('A.PNG')).toBe(true);
    expect(core.isImageName('b.jpg')).toBe(true);
    expect(core.isImageName('c.jpeg')).toBe(true);
    expect(core.isImageName('d.webp')).toBe(true);
    expect(core.isImageName('e.bmp')).toBe(true);
    expect(core.isImageName('f.gif')).toBe(true);
  });
  it('非图片扩展名/无扩展名/点开头隐藏文件/非字符串 → false', () => {
    expect(core.isImageName('a.pdf')).toBe(false);
    expect(core.isImageName('a.txt')).toBe(false);
    expect(core.isImageName('noext')).toBe(false);
    expect(core.isImageName('.png')).toBe(false);      // 隐藏文件不算扩展名
    expect(core.isImageName('')).toBe(false);
    expect(core.isImageName(null)).toBe(false);
    expect(core.isImageName(123)).toBe(false);
  });
  it('validateImage 门禁矩阵：合法/非图片/空文件/超 12MB/缺名', () => {
    expect(core.validateImage({ name: 'ok.png', size: 1024 }).ok).toBe(true);
    expect(core.validateImage({ name: 'bad.pdf', size: 1024 }).ok).toBe(false);
    expect(core.validateImage({ name: 'empty.png', size: 0 }).ok).toBe(false);
    expect(core.validateImage({ name: 'big.png', size: 13 * 1024 * 1024 }).ok).toBe(false);
    expect(core.validateImage({ name: '', size: 100 }).ok).toBe(false);
    expect(core.validateImage(null).ok).toBe(false);
  });
  it('12MB 上限常量与文件一致（MAX_IMAGE_BYTES = 12 × 1024²）', () => {
    expect(core.MAX_IMAGE_BYTES).toBe(12 * 1024 * 1024);
  });
});

describe('v8.52 #58 core：降采样几何（calcDownscale，长边 2000）', () => {
  it('长边 ≤2000 原尺寸直过（scaled=false / scale=1，零重绘）', () => {
    expect(core.calcDownscale(1000, 500)).toEqual({ w: 1000, h: 500, scale: 1, scaled: false });
    expect(core.calcDownscale(2000, 1800)).toEqual({ w: 2000, h: 1800, scale: 1, scaled: false });
    expect(core.calcDownscale(640, 640)).toEqual({ w: 640, h: 640, scale: 1, scaled: false });
  });
  it('横图超限：3000px 截图长边压到 2000（#58 验收口径）', () => {
    const g = core.calcDownscale(3000, 600);
    expect(g.scaled).toBe(true);
    expect(g.w).toBe(2000);
    expect(g.h).toBe(400);
    expect(g.scale).toBeCloseTo(2000 / 3000, 10);
  });
  it('竖图超限：长边取 max(w,h) 语义（600×3000 → 400×2000）', () => {
    const g = core.calcDownscale(600, 3000);
    expect(g.w).toBe(400);
    expect(g.h).toBe(2000);
  });
  it('方图超限与 1px 短边钳制（Math.round 后最少 1px）', () => {
    const g1 = core.calcDownscale(4000, 4000);
    expect(g1.w).toBe(2000);
    expect(g1.h).toBe(2000);
    const g2 = core.calcDownscale(100000, 2);   // 超长条：2×(2000/100000)=0.04 → 钳 1
    expect(g2.w).toBe(2000);
    expect(g2.h).toBe(1);
  });
  it('非法输入 → null（0/负/NaN/字符串/缺参不抛错）', () => {
    expect(core.calcDownscale(0, 100)).toBeNull();
    expect(core.calcDownscale(-3, 100)).toBeNull();
    expect(core.calcDownscale(NaN, 100)).toBeNull();
    expect(core.calcDownscale('100', 100)).toBeNull();
    expect(core.calcDownscale(undefined, undefined)).toBeNull();
  });
  it('自定义 maxLongEdge 生效（四舍五入取整）', () => {
    const g = core.calcDownscale(1000, 750, 500);
    expect(g.w).toBe(500);
    expect(g.h).toBe(375);
  });
});

describe('v8.52 #58 core：展示格式（formatProgress/fmtMs/fmtBytes/clampZoom）', () => {
  it('formatProgress：0-1 → 0%-100%（非法回落 0%，越界钳制）', () => {
    expect(core.formatProgress(0)).toBe('0%');
    expect(core.formatProgress(0.42)).toBe('42%');
    expect(core.formatProgress(1)).toBe('100%');
    expect(core.formatProgress(1.5)).toBe('100%');
    expect(core.formatProgress(-1)).toBe('0%');
    expect(core.formatProgress(NaN)).toBe('0%');
    expect(core.formatProgress('x')).toBe('0%');
  });
  it('fmtMs：ms/s 双档（<1000ms 走 ms，≥1s 走 s 一位小数）', () => {
    expect(core.fmtMs(830)).toBe('830ms');
    expect(core.fmtMs(1200)).toBe('1.2s');
    expect(core.fmtMs(9876)).toBe('9.9s');
    expect(core.fmtMs(-5)).toBe('—');
    expect(core.fmtMs(NaN)).toBe('—');
  });
  it('fmtBytes 三档与异常回落', () => {
    expect(core.fmtBytes(562)).toBe('562 B');
    expect(core.fmtBytes(2048)).toBe('2.0 KB');
    expect(core.fmtBytes(3 * 1024 * 1024)).toBe('3.0 MB');
    expect(core.fmtBytes(-1)).toBe('—');
    expect(core.fmtBytes(null)).toBe('—');
  });
  it('clampZoom：25-400 钳制 + 非法回落 100', () => {
    expect(core.clampZoom(100)).toBe(100);
    expect(core.clampZoom(50)).toBe(50);
    expect(core.clampZoom(400)).toBe(400);
    expect(core.clampZoom(10)).toBe(25);
    expect(core.clampZoom(1000)).toBe(400);
    expect(core.clampZoom(NaN)).toBe(100);
    expect(core.clampZoom('x')).toBe(100);
  });
});

describe('v8.52 #58 core：worker 状态文案（STATUS_TEXT/statusLabel）', () => {
  it('v5 worker 上报全集五键齐备且映射非空', () => {
    const keys = Object.keys(core.STATUS_TEXT);
    expect(keys).toContain('loading tesseract core');
    expect(keys).toContain('initializing tesseract');
    expect(keys).toContain('loading language traineddata');
    expect(keys).toContain('initializing api');
    expect(keys).toContain('recognizing text');
    keys.forEach((k) => expect(core.STATUS_TEXT[k].length).toBeGreaterThan(0));
  });
  it('statusLabel：已知 → 中文 / 未知 → 原文直显（前向兼容）/ 非法 → 空串', () => {
    expect(core.statusLabel('recognizing text')).toBe('识别中…');
    expect(core.statusLabel('loading language traineddata')).toBe('加载语言模型…');
    expect(core.statusLabel('some-future-status')).toBe('some-future-status');
    expect(core.statusLabel('')).toBe('');
    expect(core.statusLabel(null)).toBe('');
  });
});

describe('v8.52 #58 core：VFS 图片行过滤（filterImageEntries）', () => {
  const rows = [
    { path: '/pictures/b.png', name: 'b.png', size: 20 },
    { path: '/pictures/a.jpg', name: 'a.jpg', size: 10 },
    { path: '/documents/t.txt', name: 't.txt', size: 5 },
    { path: '/pictures', name: 'pictures', type: 'dir' },
    { path: '/pictures/c.webp' },                             // 缺 name → path 基名回退
    { path: '/pictures/missing-size.png', name: 'missing-size.png' },
    null,
    { path: '/pictures/noextfile', name: 'noextfile', size: 3 },
  ];
  it('仅图片行入列、dir 剔除、path 字典序', () => {
    const out = core.filterImageEntries(rows);
    expect(out.map((e) => e.path)).toEqual(['/pictures/a.jpg', '/pictures/b.png', '/pictures/c.webp', '/pictures/missing-size.png']);
  });
  it('缺 size 回落 0 / 缺 name 回退 path 基名', () => {
    const out = core.filterImageEntries(rows);
    expect(out[2].name).toBe('c.webp');
    expect(out[2].size).toBe(0);
    expect(out[3].size).toBe(0);
  });
  it('非数组/空数组安全（midi-player 同纪律）', () => {
    expect(core.filterImageEntries(null)).toEqual([]);
    expect(core.filterImageEntries('x')).toEqual([]);
    expect(core.filterImageEntries([])).toEqual([]);
  });
});

describe('v8.52 #58 core：深链与状态钳制（parseDeepLink/normalizeState）', () => {
  it('parseDeepLink：合法 path 透传 / 缺 path / 控制字符 / 超长拒绝', () => {
    expect(core.parseDeepLink({ path: '/pictures/a.png' })).toEqual({ path: '/pictures/a.png' });
    expect(core.parseDeepLink({ path: '  /pictures/a.png  ' })).toEqual({ path: '/pictures/a.png' });
    expect(core.parseDeepLink({})).toBeNull();
    expect(core.parseDeepLink(null)).toBeNull();
    expect(core.parseDeepLink({ path: 'a\nb' })).toBeNull();
    expect(core.parseDeepLink({ path: 'a'.repeat(513) })).toBeNull();
  });
  it('normalizeState：lang 白名单外回落 chi_sim 默认档', () => {
    expect(core.normalizeState({}).lang).toBe('chi_sim');
    expect(core.normalizeState({ lang: 'eng' }).lang).toBe('eng');
    expect(core.normalizeState({ lang: 'hacker' }).lang).toBe('chi_sim');
    expect(core.normalizeState(null).lang).toBe('chi_sim');
  });
  it('normalizeState：last 白名单（file/vfs 双形态 + 越界值整块丢弃）', () => {
    expect(core.normalizeState({ last: { type: 'vfs', path: '/pictures/a.png' } }).last)
      .toEqual({ type: 'vfs', path: '/pictures/a.png' });
    expect(core.normalizeState({ last: { type: 'file', name: 'shot.png' } }).last)
      .toEqual({ type: 'file', name: 'shot.png' });
    expect(core.normalizeState({ last: { type: 'vfs', path: 123 } }).last).toBeNull();
    expect(core.normalizeState({ last: { type: 'evil', x: 1 } }).last).toBeNull();
    expect(core.normalizeState({ last: 'x' }).last).toBeNull();
  });
  it('STATE_KEY 命名空间与 load/save 往返（沙箱 localStorage 桩）', () => {
    expect(core.STATE_KEY).toBe('ios-desktop:ocr-state-v1');
    const store = {};
    const ctx2 = { window: {}, localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
    }, JSON };
    // loadState/saveState 闭包引用全局 localStorage —— 用 Function 注入全局桩
    const fn = new Function('window', 'localStorage', 'JSON', CORE_SRC + ';return window.__ocrCore;');
    const c2 = fn(ctx2.window, ctx2.localStorage, JSON);
    c2.saveState({ lang: 'eng', last: { type: 'vfs', path: '/p/x.png' } });
    expect(JSON.parse(store[core.STATE_KEY])).toEqual({ lang: 'eng', last: { type: 'vfs', path: '/p/x.png' } });
    expect(c2.loadState().lang).toBe('eng');
  });
});

describe('v8.52 #58 vendor：全量离线内嵌（零 CDN 纪律）', () => {
  it('七件套齐备且体积在控（bundle <60KB / worker <300KB / core 3-5MB / 语言包 1-4MB）', () => {
    const b = statSync(VENDOR_FILES.bundle).size;
    const w = statSync(VENDOR_FILES.worker).size;
    const cs = statSync(VENDOR_FILES.coreSimd).size;
    const cp = statSync(VENDOR_FILES.corePlain).size;
    const eng = statSync(VENDOR_FILES.eng).size;
    const chiSim = statSync(VENDOR_FILES.chiSim).size;
    const chiTra = statSync(VENDOR_FILES.chiTra).size;
    expect(b).toBeGreaterThan(10000);
    expect(b).toBeLessThan(60 * 1024);
    expect(w).toBeGreaterThan(100 * 1024);
    expect(w).toBeLessThan(300 * 1024);
    expect(cs).toBeGreaterThan(3 * 1024 * 1024);
    expect(cs).toBeLessThan(5 * 1024 * 1024);
    expect(cp).toBeGreaterThan(3 * 1024 * 1024);
    expect(cp).toBeLessThan(5 * 1024 * 1024);
    expect(eng).toBeGreaterThan(1 * 1024 * 1024);
    expect(eng).toBeLessThan(4 * 1024 * 1024);
    expect(chiSim).toBeGreaterThan(1 * 1024 * 1024);
    expect(chiSim).toBeLessThan(2.5 * 1024 * 1024);
    expect(chiTra).toBeGreaterThan(1 * 1024 * 1024);
    expect(chiTra).toBeLessThan(2.5 * 1024 * 1024);
  });
  it('语言包 GZ 魔数 1f 8b（traineddata.gz 二进制完整性）', () => {
    [VENDOR_FILES.eng, VENDOR_FILES.chiSim, VENDOR_FILES.chiTra].forEach((f) => {
      const buf = readFileSync(f);
      expect(buf[0]).toBe(0x1f);
      expect(buf[1]).toBe(0x8b);
    });
  });
  it('worker 内核零 CDN 残留：CDN 字符串仅以「|| 兜底默认值」形态存在（显式注入时不触达）', () => {
    const workerSrc = readFileSync(VENDOR_FILES.worker, 'utf8');
    // 恰两处兜底：corePath 兜底（o||jsdelivr core）+ langPath 兜底（s||jsdelivr data），
    // 均系 tesseract.js worker 内置默认值 —— app.mjs 三路径全显式注入后永不触达。
    expect(workerSrc.split('https://cdn.jsdelivr.net').length - 1).toBe(2);
    // 两处都必须是短路兜底形态（「|| "https://...」），而非无条件加载
    const cdnIdx = [];
    let p = workerSrc.indexOf('https://cdn.jsdelivr.net');
    while (p >= 0) { cdnIdx.push(p); p = workerSrc.indexOf('https://cdn.jsdelivr.net', p + 1); }
    cdnIdx.forEach((i) => {
      const prefix = workerSrc.slice(Math.max(0, i - 6), i);
      expect(prefix.includes('||')).toBe(true);
    });
    expect(workerSrc.includes('tessdata.projectnaptha.com')).toBe(false);
    const bundleSrc = readFileSync(VENDOR_FILES.bundle, 'utf8');
    // 主线程 bundle 允许兜底默认值存在（不被调用：workerPath/corePath/langPath 全显式注入），
    // 但 app.mjs 必须三路径全显式
    expect(APP_MJS_SRC.includes("workerPath: '../_shared/vendor/ocr/worker.min.js'")).toBe(true);
    expect(APP_MJS_SRC.includes("corePath: '../_shared/vendor/ocr/'")).toBe(true);
    expect(APP_MJS_SRC.includes("langPath: '../_shared/vendor/ocr/langs'")).toBe(true);
    expect(APP_MJS_SRC.includes('workerBlobURL: false')).toBe(true);
  });
  it('build 脚本入库可复现（scripts/build-ocr-vendor.mjs）', () => {
    expect(existsSync(join(ROOT, 'scripts/build-ocr-vendor.mjs'))).toBe(true);
    const s = readFileSync(join(ROOT, 'scripts/build-ocr-vendor.mjs'), 'utf8');
    expect(s.includes('tesseract.js@5.1.1')).toBe(true);
    expect(s.includes('4.0.0_best_int')).toBe(true);
  });
});

describe('v8.52 #58 页面接线（index.html + app.mjs）', () => {
  it('vendor ESM 导入 + core 脚本注入 + md3 令牌层 + freeze-shim（iframe 四件套）', () => {
    expect(PAGE_SRC.includes('../freeze-shim.js')).toBe(true);
    expect(PAGE_SRC.includes('../_shared/md3-tokens.css')).toBe(true);
    expect(PAGE_SRC.includes('../../js/ocr-core.js')).toBe(true);
    expect(APP_MJS_SRC.includes("../_shared/vendor/ocr/tesseract-bundle.mjs")).toBe(true);
  });
  it('识别主流程锚：降采样→recognize→结果区，OEM.LSTM_ONLY（v5 默认引擎）', () => {
    expect(APP_MJS_SRC.includes('downscaleToDataUrl')).toBe(true);
    expect(APP_MJS_SRC.includes('.recognize(')).toBe(true);
    expect(APP_MJS_SRC.includes('OEM.LSTM_ONLY')).toBe(true);
    expect(APP_MJS_SRC.includes('imageSmoothingQuality')).toBe(true);
  });
  it('取消锚：cancelled 分流 + terminate 剔除缓存（v5 中断唯一安全手段）', () => {
    expect(APP_MJS_SRC.includes('function cancelRecognize')).toBe(true);
    expect(APP_MJS_SRC.includes('cancelled = true')).toBe(true);
    expect(APP_MJS_SRC.includes('dropWorker(currentMode().langs)')).toBe(true);
    expect(APP_MJS_SRC.includes('w.terminate()')).toBe(true);
  });
  it('进度锚：logger → statusLabel/formatProgress 双通道（word progress 实时）', () => {
    expect(APP_MJS_SRC.includes('function makeLogger')).toBe(true);
    expect(APP_MJS_SRC.includes("m.status === 'recognizing text'")).toBe(true);
    expect(APP_MJS_SRC.includes('core.formatProgress(m.progress)')).toBe(true);
  });
  it('复制锚：clipboard API 优先 + execCommand 回退（headless/老内核双路径）', () => {
    expect(APP_MJS_SRC.includes('navigator.clipboard.writeText')).toBe(true);
    expect(APP_MJS_SRC.includes("execCommand('copy')")).toBe(true);
  });
  it('预览缩放锚：适应 + 50/100/150/200 五档（transform-origin 纪律）', () => {
    expect(APP_MJS_SRC.includes("ZOOMS = ['fit', 50, 100, 150, 200]")).toBe(true);
    expect(PAGE_SRC.includes('transform-origin: 0 0')).toBe(true);
  });
  it('生命周期三路取消（APP_FREEZE 消息 + app-freeze 事件 + pagehide/beforeunload）', () => {
    expect(APP_MJS_SRC.includes("e.data.type === 'APP_FREEZE'")).toBe(true);
    expect(APP_MJS_SRC.includes("addEventListener('app-freeze'")).toBe(true);
    expect(APP_MJS_SRC.includes("addEventListener('pagehide', cancelRecognize)")).toBe(true);
  });
  it('深链双通道：inline 缓冲 + module BUS_DELIVER 消费（v8.50 时序纪律）', () => {
    expect(PAGE_SRC.includes('window.__ocrDeepLink = window.__ocrDeepLink || []')).toBe(true);
    expect(PAGE_SRC.includes("d.event !== 'ocr/open'")).toBe(true);
    expect(APP_MJS_SRC.includes('(window.__ocrDeepLink || []).forEach(consumeDeepLink)')).toBe(true);
  });
  it('导入 sheet 取消路径四件套（#55 纪律：取消按钮/Escape 消费/背景点击/input oncancel）', () => {
    expect(PAGE_SRC.includes('id="ocSheetCancel"')).toBe(true);
    expect(APP_MJS_SRC.includes('ev.stopImmediatePropagation()')).toBe(true);
    expect(APP_MJS_SRC.includes('ev.target === mask')).toBe(true);
    expect(APP_MJS_SRC.includes("fileInput.addEventListener('cancel'")).toBe(true);
  });
  it('图片门禁接线：validateImage + 30MP 像素门（解码后二次防御）', () => {
    expect(APP_MJS_SRC.includes('core.validateImage({ name: name, size: blob && blob.size })')).toBe(true);
    expect(APP_MJS_SRC.includes('core.MAX_IMAGE_PIXELS')).toBe(true);
  });
  it('零 innerHTML 注入（DOM 组装纪律）', () => {
    expect(APP_MJS_SRC.includes('innerHTML')).toBe(false);
  });
  it('VFS 扫描四目录（/pictures /documents /downloads /）', () => {
    expect(APP_MJS_SRC.includes("SCAN_DIRS = ['/pictures', '/documents', '/downloads', '/']")).toBe(true);
  });
  it('blob URL 生命周期：load 失败/onload 复用前 release + probe 预检 revoke（零泄漏）', () => {
    expect(APP_MJS_SRC.includes('revokeObjectURL')).toBe(true);
    expect((APP_MJS_SRC.match(/revokeObjectURL/g) || []).length).toBeGreaterThanOrEqual(3);
  });
});

describe('v8.52 #58 注册链（第 42 应用）', () => {
  it('apps/ocr.js iframe 壳定义（id=ocr / iframeAppContent）', () => {
    expect(SHELL_SRC.includes("id: 'ocr'")).toBe(true);
    expect(SHELL_SRC.includes('iframeAppContent')).toBe(true);
    expect(SHELL_SRC.includes('apps/ocr/index.html')).toBe(true);
  });
  it('apps-data.js 导入 + 第 2 页数组末位（第 42 位）', () => {
    expect(APPSDATA_SRC.includes("import ocr from './apps/ocr.js'")).toBe(true);
    expect(APPSDATA_SRC.includes('midiPlayer, ocr,')).toBe(true);
  });
  it('app-icons.js 「ocr」图标在册（hsl 公式纪律）+ fixture 3 动态色声明', () => {
    expect(ICONS_SRC.includes("'ocr': `<svg")).toBe(true);
    const ocrIcon = ICONS_SRC.split("'ocr': `<svg")[1]?.split('</svg>`')[0] || '';
    expect(ocrIcon).not.toContain('style="stroke:#');   // style 内只许 hsl 公式（v8.50 纪律）
    expect(ocrIcon).not.toContain('style="fill:#');
    expect(FIXTURE.icons['ocr']).toBeDefined();
    expect(FIXTURE.icons['ocr'].dynamic).toBe(3);
    expect(FIXTURE.icons['ocr'].colors).toHaveLength(3);
  });
  it('terminal-core：APPS 行 + COMMANDS 注册（33 命令）', () => {
    expect(TCORE_SRC.includes("['ocr', 'OCR 文字识别', 'ocr', '识别', '文字识别']")).toBe(true);
    expect(TCORE_SRC.includes("ocr:      { group: '应用'")).toBe(true);
    expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(9);   // open/apps/print/beat/code/ocr/stt/radio/driving — 应用组 9 条
  });
  it('terminal 页 case ocr：normalizePath + openApp 深链（ocr/open 载荷）', () => {
    expect(TPAGE_SRC.includes("case 'ocr':")).toBe(true);
    expect(TPAGE_SRC.includes("openApp('ocr', { event: 'ocr/open'")).toBe(true);
  });
});
