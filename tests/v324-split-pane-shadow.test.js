// ==================== v324-split-pane-shadow.test.js — #324 分屏窗格投影收敛 ====================
//
// #259-⑦ 用户原话：「文件这个在分屏模式下的二级菜单打开却有上浮层阴影，这是为什么」
//
// 成因（v11.26 无头取证因果实验实锤，scripts/diag-324-files-sheet.mjs + causal 探针）：
//   - 二级菜单本体（.fj-sheet，#215 重构后的 in-app bottom sheet）全场景 box-shadow=none；
//   - 全屏稳态无阴影（.app-window box-shadow:none，v7.5 影子层化）；
//   - 分屏下后挂载窗格（DOM 序靠后，如 notes）整层盖住先挂载窗格，其窗口投影
//     .split-pane { box-shadow: 0 10px 40px rgba(0,0,0,0.5) } 的 40px blur 裙边越过分栏带
//     （24px）向上 ~60px 压在文件窗格底部（含贴底二级菜单下缘）——菜单被罩出
//     「上浮层阴影」观感。因果实验：置邻格 box-shadow:none 后菜单面亮度梯度
//     （229→204）完全消失（恒 229 平直）。
//   修复：窗格投影 blur 收敛 12px（裙边收在分栏带内消散，浮窗隐喻保留，邻格
//   内容零污染）。值口径：AOSP 分屏窗格投影为 SystemUI WindowDecor 薄阴影，
//   原值需固件站源锚（墙内不可实拉）——按原生观感约束收紧并标注超越项
//   （#54 第六条口径），待补源锚。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = readFileSync(path.join(ROOT, 'ios-desktop/css/split-screen.css'), 'utf-8');

describe('#324 窗格投影收敛（v11.26）', () => {
  it('A1 .split-pane 窗口投影 = 收敛值 0 2px 12px（裙边不越 24px 分栏带）', () => {
    expect(CSS).toMatch(/\.split-pane\s*\{[^}]*box-shadow:\s*0 2px 12px rgba\(0, 0, 0, 0\.45\);/);
  });

  it('A2 旧重投影值退役（负向锚）', () => {
    expect(CSS).not.toContain('box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);');
  });

  it('A3 收敛注记在场（超越项披露 + 因果实验出处，防无声改值；版本戳=滚动锚随滚版演进）', () => {
    expect(CSS).toMatch(/v11\.\d{2} #324 窗口投影收敛/);
    expect(CSS).toContain('超越项待补源锚');
    expect(CSS).toContain('因果实验');
  });

  it('A4 菜单本体零阴影语义不受本卡影响（.fj-sheet 无 box-shadow 声明，#215 面零触碰）', () => {
    const filesCss = readFileSync(path.join(ROOT, 'ios-desktop/css/files-app.css'), 'utf-8');
    expect(filesCss).toMatch(/\.fj-sheet\s*\{[^}]*\}/);
    expect(filesCss).not.toMatch(/\.fj-sheet\s*\{[^}]*box-shadow/);
  });
});
