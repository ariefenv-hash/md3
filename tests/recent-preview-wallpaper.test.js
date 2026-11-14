// v11.27 #319 透壁纸快照合成守护测试（v11.27 #326 演进：白名单通道收敛）
// 议题：https://github.com/ariefenv-hash/md3/issues/319（能显示壁纸的应用退后台卡片变白底）
// AOSP 语义：TaskSnapshot = 任务窗口的真实合成外观（透壁纸区域仍是壁纸，不是主题面）。
// 诊断实锤：天气卡底 rgb(231,236,243) = 浅色主题 var(--md-surface)（预览壳兜底色），
// 桌面真实外观 = 壁纸透出 —— #319 修复后热任务预览壳底板 = 桌面壁纸层实拍。
// v11.27 #326 演进：应用内 blanket 壁纸直映退役后，真窗口透出底板 = 主题面；
// 预览壳底板随之统一主题面，壁纸实拍通道收敛为显式壁纸应用白名单
// （PREVIEW_WALLPAPER_APPS，现树 clock_app）——wallpaperBackdropCSS 保留为工具函数。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { wallpaperBackdropCSS } from '../ios-desktop/js/recent-preview.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'ios-desktop/js/recent-preview.js'), 'utf8');

describe('v11.27 wallpaperBackdropCSS 纯函数（#desktop 内联背景四件套快照）', () => {
  it('四件套齐备 → 分号拼接声明串（读内联 style，非 computed）', () => {
    const doc = {
      getElementById: (id) => (id === 'desktop' ? {
        style: {
          backgroundImage: 'url("wall.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: 'rgb(18, 20, 24)',
        },
      } : null),
    };
    expect(wallpaperBackdropCSS(doc)).toBe(
      'background-image:url("wall.png");background-size:cover;background-position:center;background-color:rgb(18, 20, 24)',
    );
  });

  it('透明底色不计入（rgba(0, 0, 0, 0) 跳过）；仅图片也成立', () => {
    const doc = {
      getElementById: () => ({
        style: { backgroundImage: 'url("a.jpg")', backgroundColor: 'rgba(0, 0, 0, 0)' },
      }),
    };
    expect(wallpaperBackdropCSS(doc)).toBe('background-image:url("a.jpg")');
  });

  it('无壁纸 / 无元素 / 无 document → 空串（调用方回落 surface 兜底）', () => {
    expect(wallpaperBackdropCSS({ getElementById: () => null })).toBe('');
    expect(wallpaperBackdropCSS({ getElementById: () => ({ style: {} }) })).toBe('');
    expect(wallpaperBackdropCSS(null)).toBe('');
    expect(wallpaperBackdropCSS({})).toBe('');
  });

  it('视频壁纸当前帧：video readyState≥2 → 离屏抓帧 dataURL（getVideoFrameDataURL 同构）', () => {
    const video = { readyState: 2, videoWidth: 640, videoHeight: 360 };
    let drawn = null;
    const doc = {
      createElement: () => ({
        width: 0, height: 0,
        getContext: () => ({ drawImage: (src) => { drawn = src; } }),
        toDataURL: () => 'data:image/jpeg;base64,vid',
      }),
      getElementById: () => ({ style: {}, querySelector: (sel) => (sel === 'video' ? video : null) }),
    };
    const out = wallpaperBackdropCSS(doc);
    expect(drawn).toBe(video);
    expect(out).toBe('background-image:url(data:image/jpeg;base64,vid);background-size:cover');
  });

  it('程序化画布快照：.procedural-wallpaper toDataURL；视频未就绪时降位消费', () => {
    const proc = { width: 320, height: 200, toDataURL: () => 'data:image/jpeg;base64,proc' };
    const idleVideo = { readyState: 0, videoWidth: 0, videoHeight: 0 };
    const doc = {
      createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {} }), toDataURL: () => '' }),
      getElementById: () => ({ style: {}, querySelector: (sel) => (sel === 'video' ? idleVideo : proc) }),
    };
    expect(wallpaperBackdropCSS(doc)).toBe('background-image:url(data:image/jpeg;base64,proc);background-size:cover');
  });

  it('三源优先级：静态内联壁纸优先于 video/canvas 源', () => {
    const doc = {
      getElementById: () => ({
        style: { backgroundImage: 'url("static.jpg")', backgroundSize: 'cover' },
        querySelector: () => { throw new Error('静态源命中后不应再查 video/canvas'); },
      }),
    };
    expect(wallpaperBackdropCSS(doc)).toBe('background-image:url("static.jpg");background-size:cover');
  });

  it('happy-dom：真实 document 挂 #desktop 内联壁纸 → 快照取到；摘除 → 空串', () => {
    const el = document.createElement('div');
    el.id = 'desktop';
    el.style.backgroundImage = 'url("diag-wall.jpg")';
    el.style.backgroundSize = 'cover';
    document.body.appendChild(el);
    try {
      expect(wallpaperBackdropCSS(document)).toBe('background-image:url("diag-wall.jpg");background-size:cover');
      el.style.backgroundImage = '';
      el.style.backgroundSize = '';
      expect(wallpaperBackdropCSS(document)).toBe('');
    } finally {
      el.remove();
    }
  });
});

describe('v11.27 #326 演进锚：热任务预览壳底板 = 主题面（显式壁纸应用白名单除外）', () => {
  it('wallpaperBackdropCSS 消费点收敛为白名单通道（backdrop 变量 → 热任务两变体）', () => {
    // #326 语义统一：非白名单应用底板恒主题面；wallpaperBackdropCSS 仅白名单
    // 应用（PREVIEW_WALLPAPER_APPS，现树 clock_app）消费 —— #319 实拍能力保留
    expect(SRC).toContain("wallpaperBackdropCSS() || 'background:var(--md-surface,#121418)'");
    expect(SRC).toContain('PREVIEW_WALLPAPER_APPS.has(app.id)');
    expect(SRC).toMatch(/position:relative;\$\{backdrop\}/); // live iframe 克隆变体
    expect(SRC).toMatch(/position:relative;\$\{backdrop\};overflow:hidden/); // 原生克隆变体
  });

  it('冷任务占位卡与静态兜底保持 surface 底（AOSP 冷任务 = 图标+主题面，非合成快照）', () => {
    // buildColdTaskHTML 与 pages[0] 静态回退两个变体仍是 var(--md-surface)
    expect(SRC).toMatch(/buildColdTaskHTML[\s\S]*?background:linear-gradient\(180deg, var\(--md-surface/);
    expect(SRC).toMatch(/background:var\(--md-surface,#121418\);overflow:hidden;?[\s\S]{0,500}app\.pages\[0\]\.content/);
  });

  it('拆分纪律保持：不 import recent-apps.js（防循环）', () => {
    expect(SRC).not.toMatch(/from '\.\/recent-apps\.js'/);
  });
});
