// ==================== dynamic-monet.test.js — v11.19 #33 留点：动态壁纸 Monet 化 ====================
// AOSP 语义：WallpaperColors 于壁纸变更时提取（换源触发），帧间不跟随——程序化/视频
// 壁纸逐帧皆新画面，逐帧重提色不可接受（k-means 全量代价），节流为工程自定（无权威值）。
// 覆盖：A 接线锚 / B seed 管线确定性（纯函数真跑） / C 开关门（applyMonetSeed 自含）

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const src = (p) => readFileSync(path.join(ROOT, p), 'utf8');

import { monetFromRgbaData } from '../ios-desktop/js/aosp/monet.js';

describe('v20b · A. 接线锚（wallpaper.js 动态壁纸 seed 跟随）', () => {
  const wp = src('ios-desktop/js/wallpaper.js');
  test('A1 快照通道导入（getProceduralSnapshotURL）+ 视频帧通道', () => {
    expect(wp).toContain('getProceduralSnapshotURL } from \'./procedural-wallpaper.js\'');
    expect(wp).toContain('monetSeedFromImageUrl(getVideoFrameDataURL(), 0)');
    expect(wp).toContain('monetSeedFromImageUrl(getProceduralSnapshotURL(), 0)');
  });
  test('A2 换源触发（wallpaper-changed procedural/video）+ 启动恢复兜底', () => {
    expect(wp).toContain("src === 'procedural' || src === 'video'");
    expect(wp).toContain('setTimeout(refreshMonetFromDynamicWallpaper, 900)');
  });
  test('A3 48px 下采样（与静态路径同口径）+ 快照 toBlob 晚派发重试兜底', () => {
    expect(wp).toContain('c.width = 48; c.height = 48');
    expect(wp).toMatch(/attempt < 3[\s\S]*?monetSeedFromImageUrl\(url, attempt \+ 1\)/);
  });
  test('A4 节流自创标注在位（无 AOSP 权威值诚实声明）', () => {
    expect(wp).toContain('节流为「换源触发一次」');
    expect(wp).toContain('帧间不跟随');
  });
});

describe('v20b · B. seed 管线确定性（monetFromRgbaData 纯函数真跑）', () => {
  // 程序化快照真实像素级的 seed 稳定性由 e2e-v20b 双应用同 seed 断言承载；
  // 此处用合成像素锚定「同图同色板」验收不变式
  const mkPixels = (r, g, b, n = 256) => {
    const data = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) { data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b; data[i * 4 + 3] = 255; }
    return data;
  };
  test('B1 同像素集两次提取 seed 全等（零随机）', () => {
    const a = monetFromRgbaData(mkPixels(180, 60, 40), { k: 4 });
    const b = monetFromRgbaData(mkPixels(180, 60, 40), { k: 4 });
    expect(a.seed).toBe(b.seed);
  });
  test('B2 异像素集 seed 可分（红 vs 蓝主面）', () => {
    const red = monetFromRgbaData(mkPixels(180, 60, 40), { k: 4 });
    const blue = monetFromRgbaData(mkPixels(40, 60, 180), { k: 4 });
    expect(red.seed).not.toBe(blue.seed);
  });
});

describe('v20b · C. 开关门（applyMonetSeed 自含判断）', () => {
  test('C1 theme-engine applyMonetSeed → rerollMonetIfEnabled（关时仅落盘）', () => {
    const te = src('ios-desktop/js/theme-engine.js');
    expect(te).toMatch(/export function applyMonetSeed\(seed, showToast = false\) \{[\s\S]*?setMonetSeed\(seed\);[\s\S]*?rerollMonetIfEnabled\(showToast\);/);
  });
  test('C2 wallpaper.js 动态路径调用带 false（不弹 toast，静态路径同参）', () => {
    const wp = src('ios-desktop/js/wallpaper.js');
    expect(wp.match(/applyMonetSeed\([^)]*, false\)/g).length).toBe(2);
  });
});
