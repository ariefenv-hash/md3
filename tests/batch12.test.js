// ==================== batch12.test.js — #181 第十二批整改：threes 六条准入（13/13 收官）====================
//
// 覆盖（渐进累计 13/13 —— 历史遗留 @media=0 清单全清）：
//   · threes 令牌化收尾（--shadow/--th-scrim-30/45/65 从 --md-scrim color-mix 派生：
//     .app 阴影/overlay 径向渐变/modal 面/dialog 阴影/拍立得预览阴影五处消费；
//     棋子立体投影与导出画布内阴影按 v7.26 裁决豁免保留——头注声明在录）
//   · 响应式：@media 400px 手机紧凑 + 760px 平板真分栏（body 两列 grid 1fr/300px，
//     右列战绩常驻面板 side-panel 跨全行——game2048 同款范式，手机态 display:none 零变化）
//   · SDK：VFS /documents/threes-history.json 最近 20 条镜像（落档写入/启动恢复双落点
//     + sysAvail/fsAvail 双守卫降级零炸 + score|moves|date 三元组去重并集恢复）；
//     notify 新纪录既有锚保留
//   · 形态语言：pressRipple 两排事件委托（.btn-group/.dash 欧氏距离衰减 240px/0.08
//     三释放；与 board 手势系统共存——ripple 只动 .icon-btn/.card）
//   · 回归锚：棋子色板/合并核心/AI 推演/手势拖拽/拍立得导出/APP_CLOSE 生命周期零变化
//   · 准入门：ADMITTED_APPS 扩至 17 应用（+threes，包含语义）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'ios-desktop/apps/threes/index.html'), 'utf-8');
const CORE = readFileSync(join(ROOT, 'ios-desktop/apps/threes/core.js'), 'utf-8'); // #286 续第七批：core 真身对账面
const VITE = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8');

describe('#181 第十二批 threes：令牌化收尾', () => {
  it('scrim 三档派生 + --shadow 派生 + 五处消费 + 豁免头注在录', () => {
    expect(HTML).toContain('--shadow: color-mix(in srgb, var(--md-scrim, #000) 25%, transparent);');
    expect(HTML).toContain('--th-scrim-30: color-mix(in srgb, var(--md-scrim, #000) 30%, transparent);');
    expect(HTML).toContain('--th-scrim-45: color-mix(in srgb, var(--md-scrim, #000) 45%, transparent);');
    expect(HTML).toContain('--th-scrim-65: color-mix(in srgb, var(--md-scrim, #000) 65%, transparent);');
    // 五处消费（#312 V1 直连后重锚保义：消费点由 var(--th-scrim-*)/var(--shadow) 别名改为内联同式
    //   color-mix；同式计数 = 定义行 + 消费点）：overlay 径向 45 + modal 65 + dialog 阴影 30 + 拍立得预览阴影 30 + .app 阴影 25
    expect((HTML.match(/color-mix\(in srgb, var\(--md-scrim, #000\) 45%, transparent\)/g) || []).length).toBe(2);
    expect((HTML.match(/color-mix\(in srgb, var\(--md-scrim, #000\) 65%, transparent\)/g) || []).length).toBe(2);
    expect((HTML.match(/color-mix\(in srgb, var\(--md-scrim, #000\) 30%, transparent\)/g) || []).length).toBe(3);
    expect((HTML.match(/color-mix\(in srgb, var\(--md-scrim, #000\) 25%, transparent\)/g) || []).length).toBe(3);
    // 别名消费点退役至零（全内联；定义行保留）
    expect((HTML.match(/var\(--th-scrim-\d+\)/g) || []).length).toBe(0);
    expect((HTML.match(/var\(--shadow\)/g) || []).length).toBe(0);
    // CSS 内黑 scrim 裸写归零（棋子投影 rgba(0,0,0,0.18/0.12) 为棋子立体功能色豁免）
    expect(HTML).not.toMatch(/background:\s*rgba\(0,0,0/);
    expect(HTML).not.toMatch(/box-shadow: 0 20px 48px rgba/);
    // 豁免头注声明在录（v7.26 裁决 + #181 ②口径）
    expect(HTML).toContain('棋子色板/签名白纸/导出画布为游戏与实物功能色，保持常量。');
    expect(HTML).toContain('拍立得导出画布内阴影按 v7.26 裁决豁免保留（头注声明在录）');
  });
});

describe('#181 第十二批 threes：响应式 + 760px 平板真分栏', () => {
  it('@media 400px 紧凑 + 760px 两列 grid（战绩面板右列常驻，手机态 display:none 零变化）', () => {
    expect(HTML).toMatch(/@media \(max-width:400px\) \{/);
    expect(HTML).toMatch(/@media \(min-width:760px\) \{/);
    // 手机紧凑锚
    expect(HTML).toContain('.app { padding: 8px 10px; gap: 6px; }');
    expect(HTML).toContain('.icon-btn { width: 32px; height: 32px; }');
    // 平板分栏：body 两列 + side-panel 右列跨全行
    expect(HTML).toContain('body { grid-template-columns: 1fr 300px; grid-template-rows: 1fr; place-items: center; }');
    expect(HTML).toContain('.app { grid-column: 1; grid-row: 1; }');
    expect(HTML).toContain('grid-column: 2; grid-row: 1;');
    // 手机态零变化锚：基础 side-panel 隐藏，基础 body 保持 place-items center 单列
    expect(HTML).toContain('.side-panel { display: none; }');
    expect(HTML).toContain('display: grid; place-items: center; padding:');
    // side-panel 结构锚（四格 stats + TOP5 荣誉榜 + 提示）
    expect(HTML).toContain('id="spHigh"');
    expect(HTML).toContain('id="spGames"');
    expect(HTML).toContain('id="spHist"');
  });
});

describe('#181 第十二批 threes：SDK 双通道（VFS 历史镜像）', () => {
  it('sysAvail/fsAvail 双守卫 + 落档写入/启动恢复双落点 + 三元组去重并集', () => {
    expect(HTML).toContain('const sysAvail = !!(window.__system && window.__system.notify);');
    expect(HTML).toContain('const fsAvail = !!(window.__system && window.__system.fs);');
    expect(HTML).toContain("'/documents/threes-history.json'");
    expect(HTML).toContain('TH_HISTORY_CAP = 20');
    expect(HTML).toContain("window.__system.fs.write(TH_HISTORY_PATH, JSON.stringify({ app: 'threes', records: records.slice(0, TH_HISTORY_CAP) })).catch(function () {})");
    // 双落点：落档写入 + 启动恢复
    expect(HTML).toContain('pushHistory(records);   // #181 准入④：落档 → VFS 历史镜像（落点一）');
    expect(HTML).toContain('restoreHistory();     // #181 准入④落点二：启动恢复镜像（宿主在库时异步回填）');
    // 恢复去重键（score|moves|date 三元组）与主存键不变
    expect(HTML).toContain("const keyOf = (r) => [r.score, r.moves, r.date].join('|');");
    expect(HTML).toContain("localStorage.getItem('threes_records')");
    // notify 新纪录既有锚保留（v7.x 统一通知 API）
    expect(HTML).toContain("window.__system.notify({ appId: 'threes', appName: 'Threes!', title: '新纪录诞生！'");
  });
});

describe('#181 第十二批 threes：形态语言（pressRipple 整排联动）', () => {
  it('两排事件委托 + 三释放 + 欧氏距离衰减（与 board 手势共存）', () => {
    expect(HTML).toContain("var REACH = 240, STEP = 0.08, SEL = '.btn-group, .dash';");
    expect(HTML).toContain("'pointerup', 'pointercancel', 'pointerleave'");
    expect(HTML).toContain('Math.hypot(e.clientX - (r.x + r.width / 2), e.clientY - (r.y + r.height / 2)) / REACH');
    expect(HTML).toContain("el.style.transform = 'scale(' + (1 - STEP * k).toFixed(3) + ')';");
    expect(HTML).toContain('setupPressRipple();');
    expect(HTML).toContain('// 启动（SDK 块后：fsAvail 已赋值——R68 坑①同源纪律）');
  });
});

describe('#181 第十二批 threes：回归锚（游戏核心零变化）', () => {
  it('合并核心/AI 推演/手势拖拽/拍立得导出/APP_CLOSE 零变化', () => {
    // 合并规则（1+2=3 / 同值相加）——#286 续第七批内联实现锚上移走 core.js 真身（v166/v164 四笔先例同律）
    expect(HTML).toContain('canCombine(a, b) { return window.__threesCore.canCombine(a, b); }');
    expect(HTML).toContain('getMergedVal(a, b) { return window.__threesCore.getMergedVal(a, b); }');
    expect(CORE).toContain('function canCombine(a, b) { return (a === 1 && b === 2) || (a === 2 && b === 1) || (a >= 3 && a === b); }');
    expect(CORE).toContain('function getMergedVal(a, b) { return (a === 1 && b === 2) || (a === 2 && b === 1) ? 3 : a + b; }');
    // Grandmaster AI 蛇形权重矩阵与 expectimax 不变（SNAKE_MATS 上移 core 真身，expectimax 留内联）
    expect(HTML).toContain('const SNAKE_MATS = window.__threesCore.SNAKE_MATS;');
    expect(CORE).toContain('var SNAKE_MATS = [');
    expect(HTML).toContain('expectimax(flat, depth, isPlayer, next) {');
    // 手势拖拽推演（慢拖/快滑阈值链）
    expect(HTML).toContain('if (dist >= 8) lockedAxis = absX >= absY ? \'h\' : \'v\';');
    expect(HTML).toContain('if (curDir && prog >= 0.3) game.move(curDir);');
    // 拍立得导出（600×880 画布）
    expect(HTML).toContain('c.width = 600; c.height = 880;');
    // APP_CLOSE 生命周期收尾链不变
    expect(HTML).toContain("if (e && e.data && e.data.type === 'APP_CLOSE') {");
    // 徽章统计与荣誉榜主逻辑不变
    expect(HTML).toContain("records.unshift({ score: game.score, maxTile: Math.max(...game.tiles.map(t => t.value)), moves: game.moves, date: new Date().toLocaleDateString() });");
  });
});

describe('v11.02 #228 准入覆盖（全量扫描取代清单制）', () => {
  it('threes 已由全量扫描自动覆盖（白名单制度在 v11.02 退役）', () => {
    // v11.02 #228 制度性根因修正：ADMITTED_APPS 硬编码白名单已删除（24 应用绕过检查的根因），
    // 改 audit-app-quality.mjs 全量扫描 —— apps/ 落盘即受检，应用 id 不得再硬编码进 vite.config.js
    expect(VITE).not.toContain('ADMITTED_APPS');
    expect(VITE).toContain('audit-app-quality.mjs');
    expect(VITE).toContain('runQualityAudit');
    expect((VITE.match(/'threes'/g) || []).length).toBe(0); // 全量扫描下零硬编码（旧「清单含 X」断言的语义反转）
  });
});