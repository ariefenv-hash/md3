// ==================== v8.22 #55：音乐导入链取消路径 + 品牌角标溢出 + 版本文案 ====================
//
// 议题 #55（QA 走查报告）四项修复守护：
//   ① 音乐导入 overlay 取消路径三件套（oncancel / onchange 关闭出分支 / Escape+背景点击）
//      + 多实例 ID 歧义根治（document.getElementById → closest('.app-page') 就近查找）
//   ② musicFileInput2 死按钮 —— audit-E 已移除含死元素的 pages[1]（源码注释留痕守护）
//   ③ brand-logo::after 负偏移溢出（-4px）收进容器（2px + 6px）
//   ④ 版本文案升 A17（title / 锁屏系统更新通知 / QS 页脚构建号）
//
// 测试纪律（worklog 惯例）：indexOf 切片锚点用定义形态；负断言用 not.toMatch 正则
// 防注释误报；CSS 块断言用 [^]*? 容忍行内注释。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v8.22 #55① 音乐导入浮层取消路径（music.js）', () => {
  const music = src('ios-desktop/js/apps/music.js');

  // —— oncancel 内联（文件选择器「取消」不派发 change，旧实现永久滞留） ——
  it('file input 增补 oncancel 内联取消路径', () => {
    expect(music).toContain('oncancel=');
    // oncancel 片段内：就近查找 + 淡出收起
    const iCancel = music.indexOf('oncancel=');
    const seg = music.slice(iCancel, iCancel + 900);
    expect(seg).toContain("this.closest('.app-page')");
    expect(seg).toContain("querySelector('#musicImportOverlay')");
    expect(seg).toContain("overlay.style.opacity = '0'");
    expect(seg).toContain("overlay.style.display = 'none'");
  });

  // —— onchange 关闭路径移出 files.length 分支（先关浮层再投递） ——
  it('onchange 关闭路径在 files.length 分支之前（无论是否选中都收起浮层）', () => {
    const iChange = music.indexOf('onchange=');
    const iClose = music.indexOf("overlay.style.opacity = '0'", iChange);
    const iBranch = music.indexOf('if (files.length > 0)', iChange);
    expect(iClose).toBeGreaterThan(-1);
    expect(iBranch).toBeGreaterThan(-1);
    expect(iClose).toBeLessThan(iBranch);
  });

  // —— 模块级 Escape 委托 + 消费语义 ——
  it('模块级 Escape 委托收起浮层并吞掉事件（阻断 window 级层级关闭双动作）', () => {
    expect(music).toMatch(/document\.addEventListener\('keydown'/);
    expect(music).toMatch(/e\.key !== 'Escape'/);
    expect(music).toMatch(/querySelectorAll\('#musicImportOverlay'\)/);
    expect(music).toMatch(/getComputedStyle\(ov\)\.display !== 'none'/);
    // v8.22 消费语义：实际收起才吞事件（closed 门控 + stopImmediatePropagation）
    expect(music).toMatch(/let closed = false/);
    expect(music).toMatch(/closed = true/);
    expect(music).toMatch(/if \(closed\) \{\s*e\.stopImmediatePropagation\(\);\s*e\.preventDefault\(\);/);
  });

  // —— 多实例 ID 歧义根治：全部消费点就近化 ——
  it('全库零 document.getElementById 全局歧义消费（就近查找范式）', () => {
    // 精确带参形态才判定（头注释讲史不含括号实参，不误报）
    expect(music).not.toMatch(/document\.getElementById\('musicImportOverlay'\)/);
    expect(music).not.toMatch(/document\.getElementById\('musicFileInput'\)/);
    // 就近查找消费点 ≥ 4：onchange / oncancel / 取消按钮 / 选择音乐文件按钮
    const hits = music.match(/closest\('\.app-page'\)/g) || [];
    expect(hits.length).toBeGreaterThanOrEqual(4);
  });

  // —— 背景点击关闭（event.target === this 判定） ——
  it('浮层背景点击关闭（event.target===this + 淡出）', () => {
    expect(music).toContain('if(event.target===this)');
    const iBg = music.indexOf('if(event.target===this)');
    const seg = music.slice(iBg, iBg + 200);
    expect(seg).toMatch(/var s=this/);
    expect(seg).toContain("s.style.display='none'");
  });
});

describe('v8.22 #55② musicFileInput2 死按钮（audit-E 移除留痕）', () => {
  const music = src('ios-desktop/js/apps/music.js');
  const dir = src('ios-desktop/js/apps-data.js');

  it('全工程无 musicFileInput2 元素残留，audit-E 注释留痕在位', () => {
    // 负断言限定元素标记形态（头注释讲史提及 musicFileInput2 不算残留）
    expect(music).not.toMatch(/id=["']musicFileInput2/);
    expect(music).not.toMatch(/getElementById\('musicFileInput2'\)/);
    // 唯一被允许的引用 = fix(audit-E) 历史注释（含「无 onchange 死按钮」处置记录）
    expect(music).toMatch(/musicFileInput2 无 onchange 死按钮/);
    // pages[1] 已移除：music.js 仅单页定义（负断言限元素/消费形态，注释讲史不判违）
    expect(music).not.toMatch(/id=["']localMusicList/);
    expect(music).not.toMatch(/getElementById\('localMusicList'\)/);
    expect(dir).toMatch(/import music\s+from '\.\/apps\/music\.js'/);
  });
});

describe('v8.22 #55③ brand-logo 角标溢出（apps/music/index.html）', () => {
  const html = src('ios-desktop/apps/music/index.html');

  it('::after 角标收进容器内（2px 内缩 + 6px 尺寸）', () => {
    const iAfter = html.indexOf('.brand-logo::after {');
    const seg = html.slice(iAfter, iAfter + 400);
    expect(seg).toMatch(/right:\s*2px/);
    expect(seg).toMatch(/bottom:\s*2px/);
    expect(seg).toMatch(/width:\s*6px/);
    expect(seg).toMatch(/height:\s*6px/);
  });

  it('负偏移溢出形态防回潮（right/bottom:-4px 全无残留）', () => {
    // 负断言限定在 ::after 规则块内（v8.22 修复注释讲史提及旧值，不判违）
    const iAfter2 = html.indexOf('.brand-logo::after {');
    const block = html.slice(iAfter2, iAfter2 + 400);
    expect(block).not.toMatch(/right:\s*-4px/);
    expect(block).not.toMatch(/bottom:\s*-4px/);
  });

  it('品牌角标本体未误删（--c-accent 语义保留）', () => {
    const iAfter = html.indexOf('.brand-logo::after {');
    const seg = html.slice(iAfter, iAfter + 400);
    expect(seg).toContain('var(--c-accent)');
  });
});

describe('v8.22 #55④ 版本文案升 A17', () => {
  const indexHtml = src('ios-desktop/index.html');
  const noti = src('ios-desktop/js/notifications.js');

  it('页面 title 改 md3/A17 口径，旧「安卓16极客」退役', () => {
    expect(indexHtml).toMatch(/<title>md3 — Android 17 \/ Pixel 10 物理体验<\/title>/);
    expect(indexHtml).not.toMatch(/安卓16极客/);
  });

  it('锁屏系统更新通知文案升 Android 17（BP31 退役）', () => {
    expect(noti).toContain("'Android 17 系统体验已更新'");
    expect(noti).not.toMatch(/BP31/);
  });

  it('QS 页脚构建号升 17（CQ1A）+ v779 重锚在位', () => {
    expect(indexHtml).toContain('17 (CQ1A.251005.002)');
    expect(indexHtml).not.toMatch(/BP31/);
    // 重锚文件同步更新（防双源漂移）
    const v779 = src('tests/v779-qs-m3e-hd.test.js');
    expect(v779).toContain('17 (CQ1A.251005.002)');
    expect(v779).not.toContain('16 (BP31.250502.008)');
  });
});

describe('v8.22 回归兼容（未动区域守护）', () => {
  it('iframe 内置导入链未受影响（audioFileInput + 立即挑选文件 + addExternalTrack）', () => {
    const html = src('ios-desktop/apps/music/index.html');
    expect(html).toContain("id=\"audioFileInput\"");
    expect(html).toContain("document.getElementById('audioFileInput').click()");
    expect(html).toMatch(/addExternalTrack\(url, name\)/);
    expect(html).toMatch(/['"]import-music['"]/); // iframe 消费端 d.type === 'import-music'
  });

  it('music.js 导入投递链保持 postMessage import-music 协议', () => {
    const music = src('ios-desktop/js/apps/music.js');
    expect(music).toMatch(/type:\s*'import-music'/);
    expect(music).toMatch(/URL\.createObjectURL\(files\[i\]\)/);
    expect(music).toMatch(/iframe\.contentWindow\.postMessage/);
  });
});
