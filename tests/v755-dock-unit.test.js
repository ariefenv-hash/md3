// ==================== v755-dock-unit.test.js — v7.55 renderDock 来源图标接力（单元层） ====================
//
// 独立模块图（与 v755-dock-return.test.js 场景层分文件，避免同文件双实例污染）。
// 验证 dock.js renderDock 重建 itemsEl 时对 state.currentIconEl 的三种处理：
//   · 本栏 Dock 来源 → 重建后接力到同 id 活按钮（引用始终连在文档上）
//   · 非本栏来源（桌面图标等） → 引用不受重建影响
//   · 本栏来源但重建后应用已不在 Dock → 引用保持原样（归巢层 findRealtimeTargetRect 2.5 步兜底）

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');

describe('v7.55 单元：dock.js renderDock 来源图标接力', () => {
  test('重建后 currentIconEl 指向同 id 活按钮；桌面来源不受影响；离场来源不误接力', async () => {
    localStorage.clear();
    localStorage.setItem('ios-desktop:dock-items', JSON.stringify(['camera', 'safari']));
    const { initDock, renderDock } = await import('../ios-desktop/js/dock.js');
    const { state } = await import('../ios-desktop/js/state.js');
    initDock();

    const bar = document.querySelector('.dock-bar');
    expect(bar).toBeTruthy();

    // ① 本栏 Dock 来源：重建 → 接力到同 id 活按钮
    const btn = bar.querySelector('.dock-app-icon[data-id="camera"]');
    expect(btn).toBeTruthy();
    state.currentIconEl = btn;
    renderDock();
    const fresh = bar.querySelector('.dock-app-icon[data-id="camera"]');
    expect(fresh).toBeTruthy();
    expect(btn.isConnected).toBe(false);      // 旧按钮确实被 innerHTML 重建废弃
    expect(state.currentIconEl).toBe(fresh);  // 引用已接力
    expect(fresh.isConnected).toBe(true);

    // ② 非本栏来源（桌面图标）：重建不触碰引用
    const deskLike = document.createElement('div');
    deskLike.className = 'app-icon';
    deskLike.dataset.id = 'camera';
    document.body.appendChild(deskLike);
    state.currentIconEl = deskLike;
    renderDock();
    expect(state.currentIconEl).toBe(deskLike);
    deskLike.remove();

    // ③ 本栏来源但重建后应用已不在 Dock：引用保持原样（不误指、不误抛）
    const orphan = document.createElement('button');
    orphan.className = 'dock-app-icon';
    orphan.dataset.id = 'ghost-app';
    bar.querySelector('.dock-items').appendChild(orphan);
    state.currentIconEl = orphan;
    renderDock();
    expect(state.currentIconEl).toBe(orphan); // 无同 id 新按钮 → 保持原引用
    orphan.remove();
  });

  test('源码锚定：getIconRect 识别 .dock-icon-box（Dock 字形精确测量）', () => {
    expect(R('ios-desktop/js/utils.js')).toContain("el.querySelector('.dock-icon-box')");
  });
});
