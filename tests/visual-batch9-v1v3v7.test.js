// ==================== v314 测试 — #314 [V 清单批 9] V1 camera 非缺口登记 + V3/V7 chess·terminal 2 家（R140 窗 Job 2933040 · 第 2 定时消息系列） ====================
//
// 背景：R140 续点（HANDOFF 覆写二十 next_candidates 第 4 项「V 清单维持水位——后续批按 #229/#243 车道另行立卡」；
// 对侧实录：ref-core 批 1 由第 3 系列 2931605 于 10:08:08 认领在先，本系列让位（#286 让位帖 6730753592）；
// #305 由第 1 系列 2932311 于 10:14:38 认领——零文件交集；V 系车道覆写十九第 3 系列已声明让位本系列 2933040）。
// 撞号合流实录：本卡初滚 v10.89 与对侧 c1147f7（第 3 系列 ref-core 首批）同号，push 非快进被拒 +
// ls-remote 回读救场（R138 假阳性管道退出码教训原样复现）→ backup-v1089-314 分支全量留档推送确认，
// 本卡重滚 v11.08（对侧已连推 v10.89=c1147f7 / v10.90=96f52d2，车道内容与对侧零文件交集）。
// 快照实树口径：V3 41/43 → 43/43 全清（chess/terminal 2 家清零）；
// V7 33/43 → 34/43（chess 清零 + terminal 非缺口登记维持 false，8 家真缺口留批 10）；
// V1 42/43 维持（camera 结构性非缺口登记，见 D1）。
//
// 施工形态（R136 #312 / R139 #313 先例同律，真适配不硬造）：
//   · V3 形状令牌：chess 三处直连——工具栏 .ch-btn border-radius 999px → var(--md-r-full)
//     （药丸等值：任一半径 ≥ 盒高之半经 CSS 钳制渲染恒为药丸，999px→9999px 零漂移）+
//     .ch-status / .ch-board 12px → var(--md-r-sm)（--md-r-sm: 12px 逐位等值零漂移）；
//     terminal 滚动条 thumb 3px → var(--md-r-xs)（6px 宽 thumb 上 8px 值经 CSS 曲线重叠
//     钳制生效 3px——border-radius 超出盒宽之半时按比例缩敛，零漂移实证链见 E1）。
//   · V7 空状态：chess 着法史空态占位「暂无着法，走子后自动记录」（真 UX：开局/新对局/
//     悔棋至起点时着法面板不再空白；grid-column 1/-1 跨满三栏；renderMoves 空分支早退）。
//   · camera V1 裁决（非缺口登记）：取景器覆盖白字语义为功能本体——v7.26 裁决 15 处
//     白玻璃系豁免面在录（取景器叠加层在任意画面上必须恒白，不随主题翻转），#181 十一批
//     令牌化后剩余硬编码全部属覆盖层白字/功能色（scrim 类已全量令牌化 12 处在案）；
//     A 口径密度阈值（≥4/100 行）按内容型应用校准，对覆盖型应用结构性不适用
//     —— terminal V2（等宽栅格功能本体 #313 D1）/ terminal V3 微值面（#309）先例同律。
//     附带打磨：键盘焦点环 :focus-visible（dialog-a11y 键盘导航配套，仅键盘触发零渲染漂移）。
//
// 关联：#314（本卡）/ #313（批 8）/ #312（批 7）/ #311（批 6）/ #309（批 5）/ #243（V 清单基建）/
//       #230（A 口径·§七禁止刷次数）/ #286（对侧 ref-core 撞号合流实录）/ #18 §5/§9/§7.5/§7.6/§7.7

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditVisual } from '../scripts/audit-app-quality.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const APPS_DIR = join(ROOT, 'ios-desktop', 'apps');
const readApp = (id) => readFileSync(join(APPS_DIR, id, 'index.html'), 'utf-8');
/** 审计同口径：应用目录 .html/.css/.js/.mjs 合并文本（跳过 vendor/ 与 *.min.*） */
const readAppDir = (id) => {
  const dir = join(APPS_DIR, id);
  const files = readdirSync(dir).filter((f) => /\.(html|css|js|mjs)$/.test(f) && !/\.min\./.test(f) && f !== 'index.html');
  return readApp(id) + '\n' + files.map((f) => readFileSync(join(dir, f), 'utf-8')).join('\n');
};
const BASELINE = JSON.parse(readFileSync(join(ROOT, 'scripts/visual-baseline.json'), 'utf-8'));
const TOKENS = readFileSync(join(APPS_DIR, '_shared', 'md3-tokens.css'), 'utf-8');

const V3_CLEARED = ['chess', 'terminal'];
const V7_CLEARED = ['chess'];
const V1_REGISTERED = ['camera', 'flow11', 'game2048']; // v11.08 #286 续深提增值合流演进重评追加 game2048（#312 REGISTERED 同源）；v11.08 第十一批 flow11 同律追加（R147）

describe('v314 · #314 V 清单批 9（V1 camera 非缺口登记 + V3/V7 chess·terminal）', () => {
  it('A1 · 端到端：V3 批 chess/terminal 逐家 auditVisual V3 pass（形状令牌 ≥2，审计目录合并口径）', () => {
    for (const id of V3_CLEARED) {
      const v = auditVisual(id, readAppDir(id));
      expect(v.items.V3.pass, `${id} V3 应 pass：${v.items.V3.detail}`).toBe(true);
    }
  });

  it('A2 · 端到端：chess auditVisual V7 pass（空状态锚，审计目录合并口径）', () => {
    const v = auditVisual('chess', readAppDir('chess'));
    expect(v.items.V7.pass, `chess V7 应 pass：${v.items.V7.detail}`).toBe(true);
    // terminal V7 维持非缺口登记（输出区语义本体，见 D1）
    const t = auditVisual('terminal', readAppDir('terminal'));
    expect(t.items.V7.pass, 'terminal V7 维持 false（非缺口登记）').toBe(false);
  });

  it('A3 · camera V1 结构性非缺口：audit 维持 false + 恒白语义豁免文面在录 + scrim 全量令牌化面', () => {
    const cam = readAppDir('camera');
    const v = auditVisual('camera', cam);
    expect(v.items.V1.pass, 'camera V1 维持 false（结构性非缺口登记，真适配不硬造）').toBe(false);
    // v7.26 裁决文面在录（覆盖层恒白语义本体）
    expect(cam.includes('取景器叠加层在任意画面上必须恒白'), 'v7.26 恒白裁决文面在录').toBe(true);
    expect(cam.includes('#314 V1 结构性非缺口登记'), '#314 登记注记在录').toBe(true);
    // scrim 类已全量令牌化（覆盖层对比度由 scrim 保证，非未接入）
    expect((cam.match(/var\(--md-scrim/g) || []).length, 'scrim 令牌化消费 ≥10 处').toBeGreaterThanOrEqual(10);
  });

  it('B1 · V3 形态锚：chess 三处直连（999px→--md-r-full 药丸钳制等值 + 12px→--md-r-sm 逐位等值 ×2）', () => {
    const ch = readApp('chess');
    expect(ch.includes('border-radius: var(--md-r-full)'), '.ch-btn 药丸半径令牌直连').toBe(true);
    expect(
      (ch.match(/border-radius: var\(--md-r-sm\)/g) || []).length,
      '.ch-status/.ch-board 12px→--md-r-sm 应 2 处'
    ).toBe(2);
    expect(ch.includes('border-radius: 999px'), '旧硬编码 999px 已退役').toBe(false);
  });

  it('B2 · V7 形态锚：chess 暂无着法空态占位（真 UX：空分支早退 + grid 跨列三栏）', () => {
    const ch = readApp('chess');
    expect(ch.includes('暂无着法，走子后自动记录'), '空态文案在录').toBe(true);
    expect(ch.includes('.ch-moves-empty'), '空态样式类在录').toBe(true);
    expect(ch.includes('grid-column: 1 / -1'), 'grid 跨列铺满三栏').toBe(true);
    expect(ch.includes("if (!game.sanHistory.length) { // #314 V7 空状态"), 'renderMoves 空分支在录').toBe(true);
  });

  it('B3 · V3 形态锚：terminal 滚动条 thumb 半径令牌化（6px 宽 thumb 钳制链在录）', () => {
    const tm = readApp('terminal');
    expect(
      tm.includes('.tm-out::-webkit-scrollbar-thumb { background: var(--md-outline); border-radius: var(--md-r-xs); }'),
      'thumb 半径直连 var(--md-r-xs)'
    ).toBe(true);
    expect(tm.includes('半径令牌化 #314 V3'), '钳制等值依据随行注记').toBe(true);
    expect(tm.includes('.tm-out::-webkit-scrollbar { width: 6px; }'), '6px 宽 thumb（钳制链前提）').toBe(true);
  });

  it('C1 · 快照对账：V3 43/43 清零；V7 余量 8 家真缺口（批 10）+ terminal 非缺口登记；V1 余量 camera+game2048（非缺口登记双笔）', () => {
    for (const id of V3_CLEARED) expect(BASELINE[id]?.V3, `${id} 快照 V3=true`).toBe(true);
    for (const id of V7_CLEARED) expect(BASELINE[id]?.V7, `${id} 快照 V7=true`).toBe(true);
    expect(BASELINE['terminal']?.V7, 'terminal 快照 V7=false（非缺口登记）').toBe(false);
    expect(BASELINE['camera']?.V1, 'camera 快照 V1=false（非缺口登记）').toBe(false);
    const v3Fails = Object.entries(BASELINE).filter(([, v]) => !v.V3).map(([k]) => k);
    expect(v3Fails, '全库 V3 缺口清零（43/43）').toEqual([]);
    // V7 非全清类目：水位 34/43 = 8 家真缺口（flow11/game2048/phone/piano/safari/shortcuts/typing/word，批 10 车道）
    // + terminal（非缺口登记）——本卡仅 chess 消项，余量按快照实树对账
    const v7Fails = Object.entries(BASELINE).filter(([, v]) => !v.V7).map(([k]) => k).sort();
    expect(v7Fails, 'V7 水位 34/43（8 家真缺口留批 10 + terminal 非缺口登记）').toEqual(
      ['flow11', 'game2048', 'phone', 'piano', 'safari', 'shortcuts', 'terminal', 'typing', 'word'].sort()
    );
    const v1Fails = Object.entries(BASELINE).filter(([, v]) => !v.V1).map(([k]) => k).sort();
    // v11.08 #286 续深提增值合流演进重评追加 game2048：增值 11 出口并入 core.js 后审计目录合并口径密度结构性跌破 ≥4
    // （index.html 侧 4.7/百行维持；非 UI 退化——#312 REGISTERED 同源登记，V 清单终态定格「后续仅演进重评」条款）
    // v11.08 第十一批 flow11 同律：三族 11 出口并入 core.js 后合并口径 59/1485=3.97<4（index 侧 4.4 维持）
    expect(v1Fails, 'V1 余量 camera+flow11+game2048（非缺口登记三笔）').toEqual(['camera', 'flow11', 'game2048']);
  });

  it('D1 · 非缺口登记文面双笔：camera 取景器覆盖语义（v7.26 裁决 + #314 注记）+ terminal 输出语义本体（boot 横幅在位）', () => {
    const cam = readApp('camera');
    expect(cam.includes('v11.08 #314 V1 结构性非缺口登记'), 'camera 登记注记（版本+卡号在录）').toBe(true);
    expect(cam.includes('terminal V2/V3 非缺口先例同律（#309/#313）'), '先例同律引用在录').toBe(true);
    const tm = readApp('terminal');
    // boot 横幅：输出区启动即有内容（输出语义本体，空态不可达）——terminal V7 登记依据
    expect(tm.includes("addLine('msh 1.0（md3 shell）· 议题 #25 · 输入 help 查看全部命令'"), 'terminal boot 横幅在位').toBe(true);
    expect(BASELINE['terminal']?.V7).toBe(false);
    expect(BASELINE['camera']?.V1).toBe(false);
  });

  it('E1 · 零漂移抽证：半径令牌真值链（--md-r-sm=12px 逐位等值 / --md-r-full=9999px 药丸钳制 / 6px thumb×8px→3px 生效值）', () => {
    expect(TOKENS.includes('--md-r-sm: 12px'), '--md-r-sm=12px（chess 12px 逐位等值锚）').toBe(true);
    expect(TOKENS.includes('--md-r-full: 9999px'), '--md-r-full=9999px（药丸钳制锚）').toBe(true);
    expect(TOKENS.includes('--md-r-xs: 8px'), '--md-r-xs=8px（terminal thumb 钳制链锚）').toBe(true);
    // 附带打磨零渲染漂移：focus-visible 仅键盘触发（默认渲染零变化）
    expect(readApp('camera').includes(':focus-visible { outline: 2px solid var(--md-primary'), 'camera 焦点环打磨在录').toBe(true);
  });
});
