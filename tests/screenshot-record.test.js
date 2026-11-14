// ==================== screenshot-record.test.js — #196 截屏/录屏 SystemUI 双域 ====================
//
// 覆盖（AOSP screenshot/ + screenrecord/ 同构纯逻辑 + recent-apps/sound-haptics 接线）：
//   1. 常量实证：6s 驻留 / 快门音双调用点 / 滚动截屏五步链路 / 事件枚举
//   2. Shelf 生命周期：enter→6s 超时退场 / touch 重置（SCREENSHOT_REENTERED）/
//      swipe 删除·分享 / 非驻留态无效
//   3. 录屏：音频四源原序（NONE 在首）/ 倒计时 3-2-1 / 取消无片段（cancelled）/
//      范围默认单应用 / 显示点按默认关 / 非法值回退
//   4. 接线锚：recent-apps 双桥 + 截屏按钮真链路 + 快门音预设 + CSS 面 + 回归锚
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', p), 'utf8');

import {
  SCREENSHOT_CORNER_DEFAULT_TIMEOUT_MILLIS,
  SCREENSHOT_SOUND_POINTS,
  SCROLL_CAPTURE_STEPS,
  SCREENSHOT_EVENT,
  SHELF_SWIPE,
  isScreenshotSoundAt,
  createScreenshotShelf,
} from '../ios-desktop/js/aosp/screenshot-shelf.js';
import {
  AUDIO_SOURCES,
  COUNTDOWN_DELAY_MS,
  COUNTDOWN_INTERVAL_MS,
  DEFAULT_MODE,
  RECORD_MODES,
  SHOW_TAPS_DEFAULT,
  resolveAudioSource,
  resolveRecordMode,
  createRecordingController,
} from '../ios-desktop/js/aosp/screen-record-dialog.js';

describe('A — 常量实证（AOSP blob 页实拉同值）', () => {
  it('角标驻留 6000ms（ScreenshotController.kt SCREENSHOT_CORNER_DEFAULT_TIMEOUT_MILLIS）', () => {
    expect(SCREENSHOT_CORNER_DEFAULT_TIMEOUT_MILLIS).toBe(6000);
  });

  it('快门音双调用点：startAnimation + saveScreenshotAndToast（动画即响，不只落盘时）', () => {
    expect(SCREENSHOT_SOUND_POINTS).toEqual(['startAnimation', 'saveScreenshotAndToast']);
    expect(isScreenshotSoundAt('startAnimation')).toBe(true);
    expect(isScreenshotSoundAt('saveScreenshotAndToast')).toBe(true);
    expect(isScreenshotSoundAt('onShelfDismiss')).toBe(false);
  });

  it('滚动截屏五步链路命名对齐（enqueue→request→onScrollButtonClicked→executeBatch→createLong）', () => {
    expect(SCROLL_CAPTURE_STEPS).toEqual([
      'enqueueScrollCaptureRequest',
      'requestScrollCapture',
      'onScrollButtonClicked',
      'executeBatchScrollCapture',
      'createLongScreenshotIntent',
    ]);
  });

  it('交互事件枚举：SCREENSHOT_INTERACTION_TIMEOUT / SCREENSHOT_REENTERED', () => {
    expect(SCREENSHOT_EVENT.SCREENSHOT_INTERACTION_TIMEOUT).toBe('SCREENSHOT_INTERACTION_TIMEOUT');
    expect(SCREENSHOT_EVENT.SCREENSHOT_REENTERED).toBe('SCREENSHOT_REENTERED');
  });

  it('录屏常量：音频四源原序（NONE 在首）/ 倒计时 3000/1000 / 范围默认单应用 / 点按默认关', () => {
    expect(AUDIO_SOURCES).toEqual(['NONE', 'INTERNAL', 'MIC', 'MIC_AND_INTERNAL']);
    expect(COUNTDOWN_DELAY_MS).toBe(3000);
    expect(COUNTDOWN_INTERVAL_MS).toBe(1000);
    expect(DEFAULT_MODE).toBe('SINGLE_APP');
    expect(RECORD_MODES).toEqual(['SINGLE_APP', 'ENTIRE_SCREEN']);
    expect(SHOW_TAPS_DEFAULT).toBe(false);
  });
});

describe('B — Shelf 生命周期（6s 驻留 / 触摸重置 / 手势退场）', () => {
  it('enter 后 6s 内 tick 不退场；到 6s tick 返回 SCREENSHOT_INTERACTION_TIMEOUT 且转 idle', () => {
    let t = 0;
    const sh = createScreenshotShelf({ now: () => t });
    sh.enter();
    expect(sh.state()).toBe('shown');
    t = 5999;
    expect(sh.tick()).toBeNull();
    expect(sh.state()).toBe('shown');
    t = 6000;
    expect(sh.tick()).toBe(SCREENSHOT_EVENT.SCREENSHOT_INTERACTION_TIMEOUT);
    expect(sh.state()).toBe('idle');
  });

  it('触摸重置（SCREENSHOT_REENTERED）：5s 触摸后再等 5s 仍在场（重置生效）', () => {
    let t = 0;
    const sh = createScreenshotShelf({ now: () => t });
    sh.enter();
    t = 5000;
    expect(sh.touch()).toBe(SCREENSHOT_EVENT.SCREENSHOT_REENTERED);
    t = 10000; // 距入场 10s > 6s，但距触摸 5s < 6s
    expect(sh.tick()).toBeNull();
    expect(sh.state()).toBe('shown');
    t = 11000; // 距触摸 6s → 超时
    expect(sh.tick()).toBe(SCREENSHOT_EVENT.SCREENSHOT_INTERACTION_TIMEOUT);
  });

  it('手势退场：swipe(delete|share) 返回原因并转 idle；非法方向与非驻留态返回 null', () => {
    let t = 0;
    const sh = createScreenshotShelf({ now: () => t });
    sh.enter();
    expect(sh.swipe('left')).toBeNull();
    expect(sh.swipe(SHELF_SWIPE.DELETE)).toBe('delete');
    expect(sh.state()).toBe('idle');
    sh.enter();
    expect(sh.swipe(SHELF_SWIPE.SHARE)).toBe('share');
    expect(sh.state()).toBe('idle');
    expect(sh.swipe(SHELF_SWIPE.SHARE)).toBeNull(); // 已退场
  });

  it('自定义 timeoutMs 注入（可测性）；remainingMs 随时间递减且不低于 0', () => {
    let t = 0;
    const sh = createScreenshotShelf({ now: () => t, timeoutMs: 1200 });
    expect(sh.timeoutMs()).toBe(1200);
    sh.enter();
    expect(sh.remainingMs()).toBe(1200);
    t = 500;
    expect(sh.remainingMs()).toBe(700);
    t = 5000;
    expect(sh.remainingMs()).toBe(0);
  });

  it('idle 态 touch/tick 均 null（防御）', () => {
    const sh = createScreenshotShelf({ now: () => 0 });
    expect(sh.touch()).toBeNull();
    expect(sh.tick()).toBeNull();
  });
});

describe('C — 录屏准出状态机（倒计时可取消 / 取消无片段 / 四源回退）', () => {
  it('startCountdown → tick 3-2-1 每秒一拍 → 到 3000ms 转 recording', () => {
    let t = 0;
    const rc = createRecordingController({ now: () => t });
    expect(rc.startCountdown({ audioSource: 'MIC' })).toBe(true);
    expect(rc.state()).toBe('counting');
    expect(rc.tick()).toBe(3);
    t = 1000;
    expect(rc.tick()).toBe(2);
    t = 2000;
    expect(rc.tick()).toBe(1);
    t = 3000;
    expect(rc.tick()).toBe(0);
    expect(rc.state()).toBe('recording');
  });

  it('倒计时期间取消 → cancelled=true（取消不产生片段文件——验收二）；recording 中停止 → cancelled=false', () => {
    let t = 0;
    const rc = createRecordingController({ now: () => t });
    rc.startCountdown({ audioSource: 'INTERNAL' });
    t = 1200;
    expect(rc.cancel()).toBe(true);
    expect(rc.state()).toBe('idle');
    expect(rc.cancelled()).toBe(true);
    // 正常停止路径（时钟重置：startedAt 基准独立）
    t = 0;
    const rc2 = createRecordingController({ now: () => t });
    rc2.startCountdown({});
    rc2.tick(); t = 3000; rc2.tick();
    expect(rc2.state()).toBe('recording');
    expect(rc2.cancel()).toBe(true);
    expect(rc2.cancelled()).toBe(false);
  });

  it('会话参数：session 携带四源/范围/点按开关；非法音频源与范围回退（NONE 在首）', () => {
    let t = 0;
    const rc = createRecordingController({ now: () => t });
    rc.startCountdown({ audioSource: 'MIC_AND_INTERNAL', mode: 'ENTIRE_SCREEN', showTaps: true });
    expect(rc.session()).toEqual({ audioSource: 'MIC_AND_INTERNAL', mode: 'ENTIRE_SCREEN', showTaps: true });
    rc.cancel();
    rc.startCountdown({ audioSource: 'HACKED', mode: 'BOGUS' });
    expect(rc.session().audioSource).toBe('NONE');
    expect(rc.session().mode).toBe('SINGLE_APP');
    expect(rc.session().showTaps).toBe(false);
    rc.cancel();
    rc.startCountdown(); // 无参 → 全默认
    expect(rc.session()).toEqual({ audioSource: 'NONE', mode: 'SINGLE_APP', showTaps: false });
  });

  it('resolveAudioSource/resolveRecordMode 纯函数回退；counting 中重复 start 被拒', () => {
    expect(resolveAudioSource('MIC')).toBe('MIC');
    expect(resolveAudioSource('x')).toBe('NONE');
    expect(resolveAudioSource(undefined)).toBe('NONE');
    expect(resolveRecordMode('ENTIRE_SCREEN')).toBe('ENTIRE_SCREEN');
    expect(resolveRecordMode('y')).toBe('SINGLE_APP');
    const rc = createRecordingController({ now: () => 0 });
    expect(rc.startCountdown()).toBe(true);
    expect(rc.startCountdown()).toBe(false); // counting 中不得重入
    expect(rc.cancel()).toBe(true);
    expect(rc.cancel()).toBe(false); // idle 再取消无效
  });
});

describe('D — recent-apps 接线锚（v11.26 #196 真实消费，#149 注释=代码纪律）', () => {
  const src = read('ios-desktop/js/recent-apps.js');

  it('三模块 import 在场（shelf/record/sound）+ 截屏按钮真链路（toast 占位退役）', () => {
    expect(src).toContain("from './aosp/screenshot-shelf.js'");
    expect(src).toContain("from './aosp/screen-record-dialog.js'");
    expect(src).toContain("from './sound-haptics.js'");
    expect(src).toContain("captureScreenshot('recent-apps')");
    expect(src).not.toContain('已截取当前后台任务屏幕'); // 旧占位退役
  });

  it('Shelf 全生命周期接线：白闪 + 快门音 startAnimation 点 + 角标入场 + 触摸重置 + 超时退场', () => {
    expect(src).toMatch(/function captureScreenshot\(sourceApp\)/);
    expect(src).toContain('ensureShelfFlash()');
    expect(src).toMatch(/isScreenshotSoundAt\('startAnimation'\)/);
    expect(src).toContain("playSfx('screenshot')");
    expect(src).toMatch(/shelfCtl\.touch\(\) === SCREENSHOT_EVENT\.SCREENSHOT_REENTERED/);
    expect(src).toMatch(/shelfCtl\.tick\(\) === SCREENSHOT_EVENT\.SCREENSHOT_INTERACTION_TIMEOUT/);
    expect(src).toContain('shelfDismiss(SHELF_SWIPE.DELETE)');
    expect(src).toContain('shelfDismiss(SHELF_SWIPE.SHARE)');
  });

  it('缩略图占位与光栅另案裁决：顶部卡 appId + getAppIconSVG + 裁决注释在录', () => {
    expect(src).toMatch(/deck\.querySelector\('\.recent-app-card'\)/);
    expect(src).toContain('getAppIconSVG(topId || \'settings\')');
    expect(src).toContain('光栅真源另案');
    expect(src).toContain('saveScreenshotAndToast 调用点暂不发声');
  });

  it('双桥暴露：window.__screenshot（capture/shelfState）+ window.__screenRecord（start/cancel/cancelled/四源）', () => {
    expect(src).toContain('window.__screenshot');
    expect(src).toContain('shelfState: () => (shelfCtl ? shelfCtl.state() : \'idle\')');
    expect(src).toContain('window.__screenRecord');
    expect(src).toMatch(/cancelled: \(\) => recordCtl\.cancelled\(\)/);
    expect(src).toContain('AUDIO_SOURCES,');
  });

  it('分享链路真实消费 #200 share-sheet：shelfHide share 分支调 __shareSheet.open', () => {
    expect(src).toMatch(/window\.__shareSheet\.open\(\{ title: '屏幕截图'/);
  });

  it('sound-haptics 快门音预设（双「咔哒」对）+ v803 引擎锚保持', () => {
    const sfx = read('ios-desktop/js/sound-haptics.js');
    expect(sfx).toMatch(/screenshot: \[\s*\{ freq: 2400/);
    expect(sfx).toContain('playScreenshotSoundAsync 同语义');
    expect(sfx).toContain("if (!preset) return;"); // 引擎主体未动
  });

  it('CSS 消费：白闪层 + 角标三面（thumb/meta/ss-out 退场）+ reduced-motion 兜底', () => {
    const css = read('ios-desktop/css/pixel-features.css');
    expect(css).toMatch(/\.screenshot-flash\.on \{ animation: ssFlash/);
    expect(css).toMatch(/\.screenshot-shelf \{/);
    expect(css).toMatch(/\.screenshot-shelf\.ss-out \{/);
    expect(css).toMatch(/\.screenshot-shelf \.ss-thumb \{/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.screenshot-flash\.on \{ animation: none/);
  });

  it('纯模块导入冒烟：shelf/record 两纯逻辑模块独立加载（recent-apps 全链路由 e2e 浏览器覆盖）', async () => {
    const shelf = await import('../ios-desktop/js/aosp/screenshot-shelf.js');
    const rec = await import('../ios-desktop/js/aosp/screen-record-dialog.js');
    expect(typeof shelf.createScreenshotShelf).toBe('function');
    expect(rec.AUDIO_SOURCES).toEqual(['NONE', 'INTERNAL', 'MIC', 'MIC_AND_INTERNAL']);
  });
});
