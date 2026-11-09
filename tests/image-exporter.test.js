// ==================== image-exporter.test.js — #94 二期 ImageExporter 网页等价纯逻辑 ====================
// 覆盖（aosp/image-exporter.js）：A 常量锚 / B 命名 / C 伴生路径 / D 导出校验全分支 /
// E 光栅同源门 / F 超时自动保存判定 / G 纯逻辑纪律。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCREENSHOTS_DIR,
  MARKUP_SIDECAR_EXT,
  RASTER_MAX_EDGE,
  EXPORT_MAX_BYTES,
  PNG_DATAURL_PREFIX,
  screenshotFileName,
  sidecarPathFor,
  validateExport,
  canRasterizeLocation,
  shouldAutoSave,
} from '../ios-desktop/js/aosp/image-exporter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = join(__dirname, '..');
const IE = readFileSync(join(repo, 'ios-desktop/js/aosp/image-exporter.js'), 'utf8');

describe('v94-IE-A · 常量锚（#94 议题原文 + 自研门标注）', () => {
  it('A1 落盘目录 = VFS /Pictures/Screenshots（#94 议题原文路径）', () => {
    expect(SCREENSHOTS_DIR).toBe('/Pictures/Screenshots');
  });
  it('A2 伴生扩展名 + 自研防炸门两常量在值域', () => {
    expect(MARKUP_SIDECAR_EXT).toBe('.markup.json');
    expect(RASTER_MAX_EDGE).toBeGreaterThanOrEqual(2048);
    expect(EXPORT_MAX_BYTES).toBeGreaterThan(1024 * 1024);
    expect(PNG_DATAURL_PREFIX).toBe('data:image/png;base64,');
  });
  it('A3 源码自研门标注在录（AOSP 无逐值公开源——#170 惯例）', () => {
    expect(IE).toContain('自研防炸门');
  });
});

describe('v94-IE-B · 截图文件命名（AOSP IMAGE_NAME_FORMAT "Screenshot_%s" 网页等价）', () => {
  it('B1 常规时刻：yyyyMMdd-HHmmss 本地时区补零', () => {
    expect(screenshotFileName(new Date(2026, 10, 5, 22, 0, 0))).toBe('Screenshot_20261105-220000.png');
  });
  it('B2 补零矩阵：月/日/时/分/秒逐段 <10 补零', () => {
    expect(screenshotFileName(new Date(2026, 0, 3, 7, 5, 9))).toBe('Screenshot_20260103-070509.png');
    expect(screenshotFileName(new Date(2026, 11, 31, 23, 59, 59))).toBe('Screenshot_20261231-235959.png');
  });
  it('B3 非法输入：非 Date/Invalid Date → null（永不半成品）', () => {
    expect(screenshotFileName(null)).toBeNull();
    expect(screenshotFileName(new Date('nonsense'))).toBeNull();
  });
});

describe('v94-IE-C · Markup 伴生文件路径（OCR 消费入口预埋 #58/#59）', () => {
  it('C1 同主名换扩展名', () => {
    expect(sidecarPathFor('/Pictures/Screenshots/Screenshot_20261105-220000.png'))
      .toBe('/Pictures/Screenshots/Screenshot_20261105-220000.markup.json');
  });
  it('C2 非 .png 结尾 → null（防御：永不写错位伴生文件）', () => {
    expect(sidecarPathFor('/Pictures/Screenshots/foo.jpg')).toBeNull();
    expect(sidecarPathFor('')).toBeNull();
    expect(sidecarPathFor(null)).toBeNull();
  });
});

describe('v94-IE-D · 导出载荷校验（零面积/超限/前缀错一律拒绝）', () => {
  const PNG1x1 = PNG_DATAURL_PREFIX + 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  it('D1 合法载荷 → ok + bytes 估算', () => {
    const r = validateExport({ width: 1280, height: 720, dataUrl: PNG1x1 });
    expect(r.ok).toBe(true);
    expect(r.bytes).toBeGreaterThan(0);
  });
  it('D2 尺寸门：零/负/NaN 拒绝 + 长边超限拒绝', () => {
    expect(validateExport({ width: 0, height: 10, dataUrl: PNG1x1 }).ok).toBe(false);
    expect(validateExport({ width: 10, height: -1, dataUrl: PNG1x1 }).ok).toBe(false);
    expect(validateExport({ width: NaN, height: 10, dataUrl: PNG1x1 }).ok).toBe(false);
    expect(validateExport({ width: RASTER_MAX_EDGE + 1, height: 10, dataUrl: PNG1x1 }).ok).toBe(false);
  });
  it('D3 dataURL 门：前缀错/空载荷/非字符串拒绝', () => {
    expect(validateExport({ width: 10, height: 10, dataUrl: 'data:image/jpeg;base64,AA' }).ok).toBe(false);
    expect(validateExport({ width: 10, height: 10, dataUrl: PNG_DATAURL_PREFIX }).ok).toBe(false);
    expect(validateExport({ width: 10, height: 10, dataUrl: 42 }).ok).toBe(false);
    expect(validateExport(null).ok).toBe(false);
  });
  it('D4 载荷超限门（EXPORT_MAX_BYTES 上限）', () => {
    const big = PNG_DATAURL_PREFIX + 'A'.repeat(EXPORT_MAX_BYTES * 2); // 3/4 折算后必超限
    expect(validateExport({ width: 100, height: 100, dataUrl: big }).ok).toBe(false);
  });
});

describe('v94-IE-E · 光栅同源门（#116 R2 同源同律）', () => {
  it('E1 http(s) 放行', () => {
    expect(canRasterizeLocation({ protocol: 'https:', origin: 'https://x.y' }).ok).toBe(true);
    expect(canRasterizeLocation({ protocol: 'http:', origin: 'http://localhost' }).ok).toBe(true);
  });
  it('E2 非 http(s) 拒绝且给理由（诚实拒绝优于静默黑帧）', () => {
    for (const protocol of ['file:', 'about:', 'chrome-extension:', '']) {
      const r = canRasterizeLocation({ protocol, origin: 'null' });
      expect(r.ok).toBe(false);
      expect(typeof r.reason).toBe('string');
      expect(r.reason.length).toBeGreaterThan(0);
    }
    expect(canRasterizeLocation(null).ok).toBe(false);
  });
});

describe('v94-IE-F · Shelf 退场 → 自动落盘判定（saveScreenshotAndToast 语义单源）', () => {
  it('F1 超时退场 = 自动保存', () => {
    expect(shouldAutoSave('timeout')).toBe(true);
  });
  it('F2 其余退场一律不落盘（delete 丢弃/share 接管/edit 进编辑器/close 取消）', () => {
    for (const reason of ['delete', 'share', 'edit', 'close', '', undefined]) {
      expect(shouldAutoSave(reason)).toBe(false);
    }
  });
});

describe('v94-IE-G · 纯逻辑纪律（js/aosp 层契约）', () => {
  it('G1 零 window/document/localStorage/随机源（剥注释扫描，v94 一期 E1 同款）', () => {
    const code = IE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toContain('window.');
    expect(code).not.toContain('document.');
    expect(code).not.toContain('localStorage');
    expect(code).not.toContain('Math.random');
  });
  it('G2 范围锚：光栅化 DOM 操作与浮层 UI 归属 js/screenshot-markup.js（本模块只留纯逻辑）', () => {
    expect(IE).toContain('js/screenshot-markup.js');
    expect(IE).toContain('#196「光栅另案」承接');
  });
});
