// ==================== v159-nav-symbols.test.js — #159 时钟导航图标 Material Symbols 权威字形化（v9.96 · R60 窗） ====================
// 五个自创内联 SVG（alarm-bell-group/globe-svg-group/hourglass-anim-group/sw-plunger/noise-svg-group）
// → Material Symbols 权威字形 alarm/public/timer/av_timer/bedtime（本地子集字体连字链路
//   已验证：outlined/rounded 两族 shape 模拟单 glyph 收敛，零体积代价）；
// 动画改 data-tab 特化锚定 .nav-msr-icon 容器叠加（M3E 语义逐项保留），
// 分部件动画 soundWave/hgDrain/hgFill 随自创 path 退役（诚实标注在 index.html 注释）。
// v751 ⑥「单次化」与 v849 顶栏 tabs 锚同步滚动（意图保留，形态演进）。
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');
const src = R('ios-desktop/apps/clock-app/index.html');

// nav 区五字形与 data-tab 映射（#159 正文权威字形表）
const GLYPHS = [
  ['Alarm', 'alarm', '闹钟'],
  ['World', 'public', '世界时钟'],
  ['Timer', 'timer', '计时器'],
  ['Stopwatch', 'av_timer', '秒表'],
  ['Bedtime', 'bedtime', '睡眠时间'],
];

// 已退役的自创 SVG 部件类（HTML class 属性形态绝迹；退役说明注释中的裸词不算）
const RETIRED_CLASSES = [
  'alarm-bell-group', 'alarm-wave-left', 'alarm-wave-right',
  'globe-svg-group', 'hourglass-anim-group',
  'sand-top-chamber', 'sand-bottom-chamber',
  'sw-plunger', 'noise-svg-group', 'noise-wave-bar',
  'nav-act-only', 'nav-inact-only', 'nav-fill', 'nav-stroke',
];

describe('v9.96 #159 — A. 权威字形落地（5 nav-item）', () => {
  it('每个 data-tab 的 nav-icon-wrapper 内是 Material Symbols 字形 span（字形名与中文标签对应）', () => {
    for (const [tab, glyph, title] of GLYPHS) {
      const re = new RegExp(
        `data-tab="${tab}" data-title="${title}"><div class="nav-icon-wrapper fc"><span class="material-symbols-outlined nav-msr-icon">${glyph}</span>`
      );
      expect(src, `${tab} → ${glyph}`).toMatch(re);
    }
  });

  it('nav 字形 span 共恰 5 处（不多不少，非 nav 区 material-symbols 消费不受影响）', () => {
    expect(src.match(/class="material-symbols-outlined nav-msr-icon"/g)?.length).toBe(5);
  });

  it('顶部 material-symbols.css 本地 vendor 引用在册（#159 前置：权威字体已在手）', () => {
    expect(src).toContain('../../assets/fonts/material-symbols.css');
  });

  it('两族子集 woff2 文件在库且非空（woff2 魔数）', () => {
    for (const f of ['material-symbols-outlined.woff2', 'material-symbols-rounded.woff2']) {
      const p = resolve(__dirname, '..', 'ios-desktop/assets/fonts', f);
      expect(existsSync(p), f).toBe(true);
      const buf = readFileSync(p);
      expect(buf.length, f).toBeGreaterThan(100000);
      expect(buf.subarray(0, 4).toString('latin1'), f).toBe('wOF2');
    }
  });
});

describe('v9.96 #159 — B. 自创 path 绝迹', () => {
  it('14 个旧 SVG 部件类以 class=" 形态全文绝迹', () => {
    for (const cls of RETIRED_CLASSES) {
      expect(src, cls).not.toContain(`class="${cls}`);
      expect(src, cls).not.toContain(` ${cls}"`);
    }
  });

  it('top-tabs 区块内 <svg 绝迹（导航区全字形化）', () => {
    const m = src.match(/<div class="top-tabs">([\s\S]*?)<\/div>\s*\n\s*<div class="content-area">/);
    expect(m).toBeTruthy();
    expect(m[1]).not.toContain('<svg');
  });
});

describe('v9.96 #159 — C. 动画接线（M3E 语义逐项保留）', () => {
  it('5 条 data-tab 特化动画规则在册（bellRing/globeSpin/hgRot/swPlunge/wavePulse）', () => {
    expect(src).toContain('.nav-item.animate-click .nav-msr-icon{display:inline-block}');
    expect(src).toContain('.nav-item[data-tab="Alarm"].animate-click .nav-msr-icon{transform-origin:center;animation:bellRing .6s cubic-bezier(.36,.07,.19,.97)}');
    expect(src).toContain('.nav-item[data-tab="World"].animate-click .nav-msr-icon{transform-origin:center;animation:globeSpin .7s cubic-bezier(.4,0,.2,1)}');
    expect(src).toContain('.nav-item[data-tab="Timer"].animate-click .nav-msr-icon{transform-origin:center;animation:hgRot .85s cubic-bezier(.4,0,.2,1) forwards}');
    expect(src).toContain('.nav-item[data-tab="Stopwatch"].animate-click .nav-msr-icon{transform-origin:center;animation:swPlunge .35s cubic-bezier(.34,1.56,.64,1)}');
    expect(src).toContain('.nav-item[data-tab="Bedtime"].animate-click .nav-msr-icon{transform-origin:center;animation:wavePulse .5s ease-in-out 1 both}');
  });

  it('5 个保留 keyframes 在册；3 个退役 keyframes 以 @keyframes 形态绝迹', () => {
    for (const kf of ['hgRot', 'bellRing', 'globeSpin', 'swPlunge', 'wavePulse']) {
      expect(src).toMatch(new RegExp(`@keyframes ${kf}\\{`));
    }
    for (const kf of ['hgDrain', 'hgFill', 'soundWave']) {
      expect(src, kf).not.toMatch(new RegExp(`@keyframes ${kf}\\{`));
    }
  });

  it('animate-click 生命周期不变（app.mjs：reflow 后加类触发单次动画）', () => {
    const app = R('ios-desktop/apps/clock-app/app.mjs');
    expect(app).toContain("ni.classList.remove('active','animate-click')");
    expect(app).toContain("void t.offsetWidth;t.classList.add('animate-click')");
  });
});

describe('v9.96 #159 — D. 版本锚', () => {
  it('package.json 9.96.0 + index.html v9.96 退役标注在册', () => {
    expect(JSON.parse(R('package.json')).version).toBe('9.96.0');
    expect(src).toContain('（#159）：5 个自创内联 SVG'); /* 版本无关锚：index.html 不在 roll-version 扫描范围，历史注释保留引入时版本号 */
  });
});
