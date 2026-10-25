// ==================== v8.25 #46：音乐应用三联动（A17 remedia 对标） ====================
//
// 议题 #46 三件事守护：
//   ① 波纹（remedia 波浪进度条）同步到音乐应用 —— 与通知卡/QS 卡共享单源
//      （aosp/media-wave.js 同一引擎同参数，颜色随主题 resolve on-surface 系）
//   ② 播放/暂停按钮 A17 化 —— Media.kt PlayPauseAction 权威规格：
//      72×48 胶囊 / 圆角 morph（播放 16 ↔ 暂停 48，spring ζ=1 k400）/ 点击脉冲
//      scale 1→1.125→1（tween 250ms FastOutSlowIn）
//   ③ 图标切换 morph 不硬切 —— 官方 AVD（ic_media_play_button.xml /
//      ic_media_pause_button.xml）pathData 逐数字插值 + translateX 平移
//
// 测试纪律（worklog 惯例）：indexOf 切片锚点用定义形态；负断言用 not.toMatch 正则
// 防注释误报；CSS 块断言用 [^]*? 容忍行内注释。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v8.25 #46① media-wave.js 颜色参数化（默认白零回归）', () => {
  const wave = src('ios-desktop/js/aosp/media-wave.js');

  it('createMediaWave 增加 opts 可选颜色参数，默认白色系（Media.kt 规格原值）', () => {
    expect(wave).toContain('export function createMediaWave(trackEl, opts = {})');
    expect(wave).toMatch(/active:\s*opts\.activeColor \|\| 'rgba\(255,255,255,1\)'/);
    expect(wave).toMatch(/inactive:\s*opts\.inactiveColor \|\| 'rgba\(255,255,255,0\.3\)'/);
    expect(wave).toMatch(/thumb:\s*opts\.thumbColor \|\| 'rgba\(255,255,255,1\)'/);
  });

  it('colors 域应用到三绘制槽位（wavePath/inactiveLine/thumb）', () => {
    expect(wave).toMatch(/inactiveLine\.setAttribute\('stroke', colors\.inactive\)/);
    expect(wave).toMatch(/wavePath\.setAttribute\('stroke', colors\.active\)/);
    expect(wave).toMatch(/background:' \+ colors\.thumb \+/);
  });

  it('返回面新增 setColors（主题联动刷新，三槽位逐字）', () => {
    const i = wave.indexOf('setColors(c = {})');
    expect(i).toBeGreaterThan(-1);
    const seg = wave.slice(i, i + 400);
    expect(seg).toContain("wavePath.setAttribute('stroke', c.activeColor)");
    expect(seg).toContain("inactiveLine.setAttribute('stroke', c.inactiveColor)");
    expect(seg).toContain('thumb.style.background = c.thumbColor');
  });

  it('既有单参调用零回归：通知卡/QS 卡仍为 createMediaWave(trackEl) 形态', () => {
    const noti = src('ios-desktop/js/notifications.js');
    expect(noti).toContain('createMediaWave(trackContainer)');
    const qs = src('ios-desktop/js/quick-settings.js');
    expect(qs).toMatch(/createMediaWave\(trackEl\)/);
  });
});

describe('v8.25 #46② PlayPauseAction 按钮规格（music/index.html）', () => {
  const page = src('ios-desktop/apps/music/index.html');

  it('CSS：72×48 胶囊（DpSize 逐字）+ 初始 border-radius 48px（暂停端点）', () => {
    expect(page).toMatch(/\.play-btn-large \{[^]*?width: 72px;[^]*?height: 48px;[^]*?border-radius: 48px;/);
    // 移动端同步（不再 50×50 旧方钮）
    expect(page).not.toMatch(/\.play-btn-large \{ width: 50px; height: 50px; \}/);
  });

  it('圆角弹簧参数 = animateDpAsState 默认（ζ=1 NoBouncy / k=StiffnessMediumLow 400）', () => {
    expect(page).toMatch(/new Spring\(\{ mass: 1, stiffness: 400, damping: 40, initialValue: 48 \}\)/);
  });

  it('setState 端点：isPlaying→16dp else 48dp（buttonCornerRadius 逐字语义）', () => {
    const i = page.indexOf('setState(playing) {');
    expect(i).toBeGreaterThan(-1);
    const seg = page.slice(i, i + 400);
    expect(seg).toMatch(/playing \? 16 : 48/);
  });

  it('点击脉冲：1→1.125→1（tween 250ms + 250ms FastOutSlowIn）', () => {
    expect(page).toMatch(/PULSE_SCALE = 1\.125, PULSE_MS = 250/);
    expect(page).toContain('EASE_FOSI = [0.4, 0, 0.2, 1]');
    const iPulse = page.indexOf('pulse() {');
    expect(iPulse).toBeGreaterThan(-1);
    const seg = page.slice(iPulse, iPulse + 900);
    expect(seg).toContain('(now - start) / PULSE_MS');
    expect(seg).toContain('(now - start - PULSE_MS) / PULSE_MS');
    expect(seg).toContain("btn.style.transform = ''"); // 收尾归位清 transform
  });

  it('快速连点语义：pulse 重启从当前 scale 出发（Animatable animateTo 互斥同构）', () => {
    const i = page.indexOf('pulse() {');
    const seg = page.slice(i, i + 300);
    expect(seg).toContain('cancelAnimationFrame(pulseRaf)');
    expect(seg).toContain('const from = scale');
  });

  it('no-anim 全局开关：setState 瞬时落位 + pulse 不动画（磁贴先例同律）', () => {
    expect(page).toContain("document.documentElement.classList.contains('no-anim')");
    const i = page.indexOf('if (noAnim()) {');
    const seg = page.slice(i, i + 400);
    expect(seg).toContain("btn.style.borderRadius = target + 'px'");
    const iP = page.indexOf('pulse() {');
    expect(page.slice(iP, iP + 200)).toContain('if (noAnim()) return');
  });

  it('接线：btnPlayPause onclick 先 pulse 再 togglePlay（onClick 即脉冲）', () => {
    const i = page.indexOf('this.dom.btnPlayPause.onclick');
    const seg = page.slice(i, i + 400);
    expect(seg).toContain('this.a17Btn.pulse()');
    expect(seg).toContain('this.togglePlay()');
  });
});

describe('v8.25 #46③ 图标 morph：官方 AVD 数据与几何链（逐字移植）', () => {
  const page = src('ios-desktop/apps/music/index.html');

  it('AVD pathData 端点（play 三角 / pause 双杠 valueFrom/valueTo 逐字）', () => {
    // play 三角（ic_media_play_button.xml valueFrom；右顶点 20.31,0.25）
    expect(page).toContain('M-4.69 -16.69 C-4.69,-16.69 20.25,-1.25 20.31,0.25');
    // pause 左杠（valueTo；圆角矩形 C 链底缘与左缘拐点，分字段避开跨行拼接点）
    expect(page).toContain('C-5.06,19.36 -6.41,20.7 -8.06,20.7');
    expect(page).toContain('C-17.66,20.7 -19,19.36 -19,17.7');
    expect(page).toContain('C-16,-21 -8.06,-21 -8.06,-21');
    // 两杠差异点（-1.24 vs -0.75）
    expect(page).toContain('-5.06,-1.24');
    expect(page).toContain('-5.06,-0.75');
  });

  it('几何变换链：scale 0.333 + path1 平移 11.4993 / path2 11.5863→19.4953（Δ=7.909 与 AVD 一致）', () => {
    expect(page).toContain('const T1 = { x: 11.4993, y: 12.084 }');
    expect(page).toContain('const TX_PLAY = 11.5863, TX_PAUSE = 19.4953;');
    expect(page).toMatch(/translate\(\$\{T1\.x\} \$\{T1\.y\}\) scale\(0\.333\)/);
    expect(page).toMatch(/translate\(\$\{tx\.toFixed\(4\)\} \$\{T1\.y\}\) scale\(0\.333\)/);
  });

  it('pathInterpolator 三次贝塞尔逐字（正向/反向/两段/脉冲）', () => {
    expect(page).toContain('EASE_D_TO_PAUSE = [0.433, 0, 0, 1]');
    expect(page).toContain('EASE_D_TO_PLAY = [0.449, 0, 0, 1]');
    expect(page).toContain('EASE_TX_TO_PAUSE = [0.583, 0, 0.089, 0.874]');
    expect(page).toContain('EASE_TX_REV_1 = [0.3, 0, 0.8, 0.15]');
    expect(page).toContain('EASE_TX_REV_2 = [0.05, 0.7, 0.1, 1]');
  });

  it('时长体系：morph 333ms；反向 translateX 56ms+278ms 两段（AVD 逐字）', () => {
    expect(page).toContain('const MORPH_MS = 333');
    expect(page).toContain('const TX_REV_MS1 = 56, TX_REV_MS2 = 278;');
    expect(page).toMatch(/tt < TX_REV_MS1 \/ txDur/);
  });

  it('morph 引擎：数字序列插值 + 模板回填（结构同构 M+9C+Z）', () => {
    expect(page).toMatch(/function seqOf\(d\)/);
    expect(page).toMatch(/const PLAY_SEQ = seqOf\(PLAY_D\), PAUSE1_SEQ = seqOf\(PAUSE_D1\), PAUSE2_SEQ = seqOf\(PAUSE_D2\)/);
    expect(page).toMatch(/function lerpSeq\(a, b, p\)/);
    expect(page).toMatch(/const TEMPLATE = PLAY_D\.replace/);
  });

  it('setState 硬切退役：a17Btn 接管图标，旧 innerHTML 仅作引擎缺位回退', () => {
    const i = page.indexOf('setPlayState(playing)');
    expect(i).toBeGreaterThan(-1);
    const seg = page.slice(i, i + 800);
    expect(seg).toContain('this.a17Btn.setState(playing)');
    // 回退路径保留（module 加载失败时仍可用），但必须在 a17Btn 缺位分支内
    expect(seg).toMatch(/else if \(playing\) \{[^]*?playIcon\.innerHTML/);
  });

  it('初始渲染即 play 三角（暂停态 = atEnd==Playing 语义：播放中才显 pause 杠）', () => {
    expect(page).toMatch(/let p = 0, tx = TX_PLAY;/);
    expect(page).toMatch(/apply\(\);\s+\/\/ 初始渲染 play 三角/);
  });
});

describe('v8.25 #46① 波浪挂载与进度管线（music/index.html）', () => {
  const page = src('ios-desktop/apps/music/index.html');

  it('共享单源 import：aosp/media-wave.js（与通知卡/QS 卡同一引擎）', () => {
    expect(page).toContain("import { createMediaWave } from '../../js/aosp/media-wave.js';");
    expect(page).toMatch(/window\.__a17MediaWave = \{ create: createMediaWave \}/);
  });

  it('进度容器 + 透明 range 覆盖（保留拖拽/点击/无障碍语义）', () => {
    expect(page).toContain('<div class="progress-track" id="seekTrack">');
    expect(page).toMatch(/class="slider slider-seek" id="seekSlider"/);
    expect(page).toMatch(/\.slider-seek \{[^]*?opacity: 0;/);
    expect(page).toMatch(/\.progress-track \{[^]*?position: relative;/);
  });

  it('挂载点：seekTrack + __a17MediaWave.create(track, resolveWaveColors())', () => {
    expect(page).toMatch(/seekTrack: document\.getElementById\('seekTrack'\)/);
    expect(page).toContain('window.__a17MediaWave.create(this.dom.seekTrack, this.resolveWaveColors())');
  });

  it('进度管线：onTimeUpdate 锚点+速率 / oninput 即时 / metadata 重锚 / 清空归零', () => {
    const iT = page.indexOf('onTimeUpdate() {');
    const segT = page.slice(iT, iT + 800);
    expect(segT).toContain('this.wave.setProgress((this.audio.currentTime || 0) / this.audio.duration)');
    expect(segT).toMatch(/this\.wave\.setRate\(this\.isPlaying \? 1 \/ this\.audio\.duration : 0\)/);
    const iI = page.indexOf('this.dom.seekSlider.oninput');
    const segI = page.slice(iI, iI + 400);
    expect(segI).toContain('this.wave.setProgress(e.target.value / 100)');
    const iM = page.indexOf('onMetadataLoaded() {');
    const segM = page.slice(iM, iM + 400);
    expect(segM).toMatch(/this\.wave\.setProgress\(/);
    expect(segM).toContain('this.wave.setRate(0)');
    const iC = page.indexOf('clearPlaylist() {');
    const segC = page.slice(iC, iC + 1600);
    expect(segC).toContain('this.wave.setProgress(0)');
    expect(segC).toContain('this.wave.setPlaying(false)');
  });

  it('播放态联动：setPlayState → wave.setPlaying（起振/平复 LaunchedEffect 同构）', () => {
    const i = page.indexOf('setPlayState(playing)');
    const seg = page.slice(i, i + 800);
    expect(seg).toContain('if (this.wave) this.wave.setPlaying(playing)');
  });

  it('宿主反向通道：MEDIA_COMMAND seek 转发即时跟随', () => {
    const i = page.indexOf("cmd === 'seek'");
    expect(i).toBeGreaterThan(-1);
    const seg = page.slice(i, i + 400);
    expect(seg).toContain('app.wave.setProgress(app.audio.currentTime / app.audio.duration)');
  });

  it('主题联动：refreshThemeColors → setColors；resolveWaveColors 走 --c-ink computed', () => {
    const iR = page.indexOf('refreshThemeColors() {');
    const segR = page.slice(iR, iR + 500);
    expect(segR).toContain('this.wave.setColors(this.resolveWaveColors())');
    const iW = page.indexOf('resolveWaveColors() {');
    const segW = page.slice(iW, iW + 1200);
    expect(segW).toContain("probe.style.color = 'var(--c-ink)'");
    expect(segW).toContain("getComputedStyle(probe).color");
    expect(segW).toMatch(/, 0\.3\)/); // inactive 30% 衰减（Media.kt White@30% 同构）
  });
});
