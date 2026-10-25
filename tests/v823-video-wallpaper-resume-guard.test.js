// ==================== v8.23 #69：视频壁纸恢复位置连续性守卫 ====================
//
// 议题 #69（bug）：实时模糊开启时应用开合导致视频壁纸从头重播。
// 仓库源码全量走查实证：无任何 JS 路径在应用开合时触碰视频时间轴（pause/play 看
// 门狗只切播放态、blur 快照只 drawImage 只读）→ 复位来自平台层（Android Chrome
// 媒体栈在祖先合成层变化/解码器挂起后丢弃挂起视频的播放位置，老内核尤甚）。
//
// 修复 = 看门狗位置连续性守卫（video-wallpaper.js startWatch）：
//   ① 挂起锚点：videoEl 进入暂停时刻记 currentTime + 装载世代（videoGen）
//   ② 恢复守卫：回桌面 resume 前，位置意外回卷（< anchor - 0.4）→ 恢复锚点再续播
//   ③ 宽限单发：play() 指令本身触发平台重启时，宽限窗（1500ms）内首拍恢复锚点
//     （要求锚点距片尾 ≥ 2s，否则与合法 loop 回卷不可区分，放弃恢复）
//   ④ 采样让位：extractVideoPalette 运行中 samplingActive 门控（采样自管时间轴）
//   ⑤ 新装载作废：applyVideoWallpaper 重置锚点/宽限状态
//
// 测试纪律（worklog 惯例）：indexOf 切片锚点用定义形态；负断言用 not.toMatch 正则
// 防注释误报；切片带防前缀误匹配 \b。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v8.23 #69 视频壁纸恢复位置连续性守卫（video-wallpaper.js）', () => {
  const vw = src('ios-desktop/js/video-wallpaper.js');

  // —— 看门狗切片（定义形态锚点） ——
  const iWatch = vw.indexOf('function startWatch() {');
  expect(iWatch).toBeGreaterThan(-1);
  const iWatchEnd = vw.indexOf('/** 停止全屏暂停/恢复看门狗 */', iWatch);
  const watch = vw.slice(iWatch, iWatchEnd);

  it('守卫常量三件套在位（0.5 起守卫 / 0.4 回卷容差 / 1500ms 宽限）', () => {
    expect(vw).toMatch(/const RESUME_GUARD_MIN = 0\.5;/);
    expect(vw).toMatch(/const REWIND_TOLERANCE = 0\.4;/);
    expect(vw).toMatch(/const RESUME_GRACE_MS = 1500;/);
  });

  it('挂起锚点：pause 前记 currentTime + 世代绑定 + 宽限失效', () => {
    const iPause = watch.indexOf('if (shouldPause) {');
    const seg = watch.slice(iPause, iPause + 500);
    expect(seg).toContain('anchorTime = videoEl.currentTime || 0');
    expect(seg).toContain('anchorGen = videoGen;');
    expect(seg).toContain('graceRestoreDone = true;');
    expect(seg).toContain('videoEl.pause();');
  });

  it('恢复守卫：resume 前回卷检出 → 恢复锚点（世代 + 采样 + 最小锚点三重门控）', () => {
    const iResume = watch.indexOf('if (videoEl.paused) {');
    const seg = watch.slice(iResume, iResume + 600);
    expect(seg).toContain('if (samplingActive) return;');
    expect(seg).toMatch(/anchorGen === videoGen && anchorTime >= RESUME_GUARD_MIN/);
    expect(seg).toMatch(/videoEl\.currentTime < anchorTime - REWIND_TOLERANCE/);
    expect(seg).toContain('videoEl.currentTime = anchorTime;');
    // 守卫必须先于 play 指令（回卷在续播前修正）
    expect(seg.indexOf('videoEl.currentTime = anchorTime;')).toBeLessThan(seg.indexOf('videoEl.play()'));
  });

  it('宽限单发：play() 指令触发的平台重启在宽限窗内恢复（片尾 2s 尾距门控防误伤 loop）', () => {
    expect(watch).toMatch(/const inGrace = performance\.now\(\) < resumeGraceUntil;/);
    expect(watch).toMatch(/inGrace && !graceRestoreDone && anchorGen === videoGen/);
    expect(watch).toMatch(/anchorTime <= videoEl\.duration - \(RESUME_GRACE_MS \/ 1000\) - 0\.5/);
    expect(watch).toMatch(/graceRestoreDone = true;\s*\n\s*return;/);
    // resume 每次都重挂宽限（resumeGrace 先于 play）
    const iResume = watch.indexOf('if (videoEl.paused) {');
    const seg = watch.slice(iResume, iResume + 600);
    expect(seg.indexOf('resumeGrace();')).toBeLessThan(seg.indexOf('videoEl.play()'));
  });

  it('播放中锚点跟踪：合法 loop 回卷重置锚点 / 前进即跟随', () => {
    expect(watch).toMatch(/if \(t < anchorTime - REWIND_TOLERANCE\) anchorTime = t;/);
    expect(watch).toMatch(/else if \(t > anchorTime\) anchorTime = t;/);
    expect(watch).toContain('anchorGen = videoGen;');
  });

  it('新装载作废旧锚点：applyVideoWallpaper 重置三态', () => {
    const iApply = vw.indexOf('export async function applyVideoWallpaper(blob, opts = {}) {');
    const iEnsure = vw.indexOf('const video = ensureVideoEl();', iApply);
    const seg = vw.slice(iEnsure, iEnsure + 400);
    expect(seg).toContain('anchorTime = 0;');
    expect(seg).toContain('anchorGen = 0;');
    expect(seg).toContain('graceRestoreDone = true;');
    // 重置在 ++videoGen 之前（世代语义连贯）
    const iGen = vw.indexOf('const gen = ++videoGen;', iApply);
    expect(iGen).toBeGreaterThan(-1);
    expect(iEnsure).toBeLessThan(iGen);
  });

  it('采样让位：extractVideoPalette try/finally 门控 samplingActive', () => {
    const iExtract = vw.indexOf('export async function extractVideoPalette(video) {');
    const iPeak = vw.indexOf('const peaks = peakBins(hist);', iExtract);
    const seg = vw.slice(iExtract, iPeak);
    expect(seg).toContain('samplingActive = true;');
    expect(seg).toMatch(/finally \{\s*samplingActive = false;\s*\}/);
    // hist/stat 声明在 try 外（作用域完整：finally 后 peakBins 仍可达）
    const iTry = seg.indexOf('try {');
    const iHist = seg.indexOf('const hist = new Array(HUE_BINS).fill(0);');
    expect(iHist).toBeGreaterThan(-1);
    expect(iHist).toBeLessThan(iTry);
  });
});

describe('v8.23 #69 防回潮与兼容（video-wallpaper.js / desktop-blur.js）', () => {
  const vw = src('ios-desktop/js/video-wallpaper.js');

  it('旧无守卫看门狗形态退役（裸 resume 双分支 if/else 不再存在）', () => {
    // 旧实现：`if (shouldPause && !videoEl.paused) videoEl.pause(); else if (...) play()`
    expect(vw).not.toMatch(/if \(shouldPause && !videoEl\.paused\) videoEl\.pause\(\);/);
    expect(vw).not.toMatch(/else if \(!shouldPause && videoEl\.paused\) videoEl\.play\(\)/);
  });

  it('看门狗轮询间隔与暂停语义不变（500ms / currentApp / reducedMotion）', () => {
    const iWatch = vw.indexOf('function startWatch() {');
    const iWatchEnd = vw.indexOf('/** 停止全屏暂停/恢复看门狗 */', iWatch);
    const watch = vw.slice(iWatch, iWatchEnd);
    expect(watch).toContain('}, 500);');
    expect(watch).toContain('!!state.currentApp || reducedMotion');
  });

  it('blur 引擎零回归：快照路径仍只读帧（不触碰视频时间轴）', () => {
    const blur = src('ios-desktop/js/desktop-blur.js');
    const iRefresh = blur.indexOf('export function refreshBlurSnapshot(force = false) {');
    const seg = blur.slice(iRefresh, iRefresh + 2600);
    expect(seg).toContain('drawImage(source, dx, dy, dw, dh)');
    expect(seg).not.toMatch(/\.currentTime\s*=/);
    expect(seg).not.toMatch(/\.play\(\)|\.pause\(\)|\.load\(\)/);
  });

  it('reduced-motion 语义不受守卫影响（shouldPause 恒真 → 永不进入 resume 分支）', () => {
    // reducedMotion 并入 shouldPause，守卫只活在 resume 路径 —— 首帧静止语义保持
    const vwSrc = vw;
    expect(vwSrc).toMatch(/const shouldPause = !!state\.currentApp \|\| reducedMotion;/);
  });
});
