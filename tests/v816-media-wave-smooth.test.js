// v8.16 #40 通知栏进度条平滑推进守护测试
// 议题：https://github.com/ariefenv-hash/md3/issues/40（进度条停顿感 → 平滑连续推进）
// 根因：media-wave 的 rAF 循环只动波形相位/振幅，thumb/clip 位置由外部 setProgress
// 低频注入（宿主电台 audio timeupdate ~4Hz；音乐应用 external 上报更低频）——
// 波形 60fps 流动对比 thumb 4Hz 跳变 = 停顿感。
// 修复：wave 内进度外推——setProgress 真值锚点 + setRate(p01/s) + rAF 内
// progressView 连续外推（与波形同一循环同一时间轴，零新增 rAF 开销）。
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createMediaWave } from '../ios-desktop/js/aosp/media-wave.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_WAVE = readFileSync(join(root, 'ios-desktop/js/aosp/media-wave.js'), 'utf8');
const SRC_NOTIF = readFileSync(join(root, 'ios-desktop/js/notifications.js'), 'utf8');
const SRC_QS = readFileSync(join(root, 'ios-desktop/js/quick-settings.js'), 'utf8');

/** 挂轨道容器（clientWidth 需 >0）+ stub rAF 手动步进 */
function mount() {
  const host = document.createElement('div');
  Object.defineProperty(host, 'clientWidth', { value: 200, configurable: true });
  Object.defineProperty(host, 'clientHeight', { value: 4, configurable: true });
  document.body.appendChild(host);
  return host;
}

describe('v8.16 media-wave 进度外推（行为级：stub rAF 手动步进）', () => {
  let rafQueue;
  let nowMs;
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb) => { rafQueue.push(cb); return rafQueue.length; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('performance', { now: () => nowMs });
    rafQueue = [];
    nowMs = 1000;
  });
  afterEach(() => vi.unstubAllGlobals());

  const step = (ms) => { nowMs += ms; const q = rafQueue; rafQueue = []; q.forEach((cb) => cb(nowMs)); };

  it('播放中：thumb 位置随 rAF 帧连续外推（0.1@rate 1/200 → +500ms ≈ 0.125）', () => {
    const host = mount();
    const w = createMediaWave(host);
    w.setPlaying(true);
    w.setProgress(0.1);          // 真值锚点（≈30s/200s）
    w.setRate(1 / 200);          // duration=200s → 每秒推进 0.005
    const px0 = w.el.querySelector('div').style.left; // thumb 初始（0.1×200−2=18px）
    step(500);                   // 推进 0.5s → 视觉进度 ≈ 0.1025 → thumb ≈ 20.5−2 = 18.5px
    const px1 = w.el.querySelector('div').style.left;
    expect(parseFloat(px1)).toBeGreaterThan(parseFloat(px0));   // 连续推进（旧实现 500ms 内纹丝不动）
    expect(parseFloat(px1) - parseFloat(px0)).toBeCloseTo(0.5, 1); // +0.0025×200 = +0.5px 精确外推
    w.destroy();
  });

  it('暂停（rate=0）：progressView 冻结在锚点，不随时间漂移', () => {
    const host = mount();
    const w = createMediaWave(host);
    w.setPlaying(false);
    w.setProgress(0.4);
    w.setRate(0);
    step(1000); step(1000);
    // 暂停态 loop 可能停止——强制 draw 后 thumb 应仍为 0.4×200−2 = 78px
    expect(parseFloat(w.el.querySelector('div').style.left)).toBeCloseTo(78, 1);
    w.destroy();
  });

  it('seek 瞬时落位：setProgress 重锚（外推起点随真值跳变，无平滑追赶残留）', () => {
    const host = mount();
    const w = createMediaWave(host);
    w.setPlaying(true);
    w.setProgress(0.1);
    w.setRate(1 / 200);
    step(400);
    w.setProgress(0.8);          // seek 跳变 → 立即落位 0.8×200−2 = 158px
    expect(parseFloat(w.el.querySelector('div').style.left)).toBeCloseTo(158, 1);
    step(300);                   // 从 0.8 继续（0.3s → +0.0015×200 = +0.3px）
    expect(parseFloat(w.el.querySelector('div').style.left)).toBeGreaterThan(158);
    w.destroy();
  });

  it('外推上限 clamp：接近曲末推进不超过 1（thumb 不越轨）', () => {
    const host = mount();
    const w = createMediaWave(host);
    w.setPlaying(true);
    w.setProgress(0.999);
    w.setRate(1 / 10);
    step(5000);                  // 理论推进 0.5 → 1.499，clamp 到 1 → thumb = 198px
    expect(parseFloat(w.el.querySelector('div').style.left)).toBeCloseTo(198, 1);
    w.destroy();
  });

  it('rate 防御：非有限/负值归一为 0（NaN/负速率不污染外推）', () => {
    const host = mount();
    const w = createMediaWave(host);
    w.setPlaying(true);
    w.setProgress(0.3);
    w.setRate(NaN);
    w.setRate(-1);
    step(1000);
    expect(parseFloat(w.el.querySelector('div').style.left)).toBeCloseTo(0.3 * 200 - 2, 1);
    w.destroy();
  });

  it('锚点不被污染：外推多帧后 setProgress 真值仍瞬时生效（progressView 独立）', () => {
    const host = mount();
    const w = createMediaWave(host);
    w.setPlaying(true);
    w.setProgress(0.2);
    w.setRate(1 / 100);
    step(900);                   // 外推至 ≈0.209
    expect(w.el.querySelector('div').style.left !== `${0.2 * 200 - 2}px`).toBe(true);
    w.setProgress(0.2);          // 同值重锚（notify 重复）→ 视觉回到锚点无漂移
    expect(parseFloat(w.el.querySelector('div').style.left)).toBeCloseTo(0.2 * 200 - 2, 1);
    w.destroy();
  });
});

describe('v8.16 源码锚定：单管线接线在场', () => {
  it('media-wave.js：progressView 外推分支 + setRate 导出形态', () => {
    expect(SRC_WAVE).toContain('progressView');
    expect(SRC_WAVE).toMatch(/if \(playing && rate > 0\) \{\s*\n\s*progressView = Math\.min\(1, progress \+ \(\(t - anchorT\) \/ 1000\) \* rate\);/);
    expect(SRC_WAVE).toMatch(/setRate\(p01PerSec\) \{/);
    expect(SRC_WAVE).toMatch(/Number\.isFinite\(r\) && r > 0 \? r : 0/); // 防御归一
  });

  it('两卡消费端 setRate 接线（1/duration 语义，暂停归 0）', () => {
    expect(SRC_NOTIF).toMatch(/wave\.setRate\(state\.isPlaying && state\.duration > 0 \? 1 \/ state\.duration : 0\)/);
    expect(SRC_QS).toMatch(/qsWave\.setRate\(state\.isPlaying && state\.duration > 0 \? 1 \/ state\.duration : 0\)/);
  });

  it('draw 使用 progressView 而非锚点 progress（thumb/clip/inactiveLine 同一视觉域）', () => {
    expect(SRC_WAVE).toMatch(/const thumbPx = width \* progressView;/);
    expect(SRC_WAVE).not.toMatch(/const thumbPx = width \* progress;\s*\n/); // 锚点直绘不回潮
  });
});
