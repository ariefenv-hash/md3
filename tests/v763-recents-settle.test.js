// ==================== v763-recents-settle.test.js — 后台关场一致性结算 + QS 网格参考图校准 ====================
//
// 背景（用户反馈：issue #8 截图里的故障仍未根除）：
//   shot2 = 空白壁纸只剩 Dock（桌面 scale(0.95) + 图标 launch-hidden + 页点/glance/搜索隐藏）。
//   v7.48 修过「清空全部」路径、v7.57 修过「切后台打断」路径，但第三族路径漏网：
//   从应用内进后台（窗口 flyAppToCard 缩入卡片挂起，isOpen 仍 true）后 ——
//     · 点空白关闭 recents（overlay click）
//     · 导航栏返回键（sysBack → closeRecentApps）
//     · Esc（performance.js → __closeRecentApps）
//   三者此前只摘 overlay：桌面残留「应用打开背景态」= shot2 故障帧；
//   且该路径无 visibilitychange，visibility-heal ② 的 !state.isOpen 条件对挂起态全盲。
//   E2E 实证（scripts/issue8-repro.sh）：修复前 A2/B1 残留 scale(0.95)+launch-hidden；
//   修复后（scripts/issue8-verify.sh）V1/V2 回原应用全屏、V3 Home 语义桌面直接干净、V4 对照干净。
//
// 同批：QS 磁贴网格参考图逐像素校准（手机 4 列 / 平板 6 列 / 横卧药丸 / 形状形变 /
//   出厂混排 Internet/Bluetooth/Modes 2×1）—— 运行时断言在 v762-android16-ui.test.js，
//   本文件锚定关场结算与 heal 扩盲接线。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

describe('v7.63 · recents 关场一致性结算（recent-apps.js）', () => {
  const js = src('ios-desktop/js/recent-apps.js');

  test('挂起来源标记：进后台缩入卡片时记录，模块级持有', () => {
    expect(js).toContain('let recentsSuspendedFromApp = null;');
    expect(js).toContain('recentsSuspendedFromApp = fromId || null;');
  });

  test('closeRecentApps 收 opts 并调关场结算；结算函数三分支语义齐备', () => {
    expect(js).toContain('export function closeRecentApps(opts = null)');
    expect(js).toContain('settleAfterRecentsClose(opts);');
    expect(js).toContain('function settleAfterRecentsClose(opts)');
    // 返回语义默认开；Home 语义显式关
    expect(js).toContain('const resumeSuspended = !(opts && opts.resumeSuspended === false);');
    // 挂起判定：flyAppToCard 落定 .open 已摘 / 中间态 .open 仍在但高度 < 视口（A2 实测）
    expect(js).toContain('appWin.getBoundingClientRect().height >= window.innerHeight * 0.98');
    // ① 返回语义：卡片在场 → 复用 launchAppDirectFromCard 从卡片矩形回原应用
    expect(js).toContain('launchAppDirectFromCard(appId, card); // 回到原应用（展开链路自带 overlay 延迟收场）');
    // ①卡不在/②Home 语义：复位桌面 + 摘挂起态（实例留在后台列表，与 Android 一致）
    expect(js).toContain('try { restoreDesktopAfterBatchClear(); } catch (e) {}');
    // ③ 兜底：无挂起窗口时幂等复位任何不可见残留
    expect(js).toContain("const residue = (desk && ((desk.style.transform && desk.style.transform !== '') ||");
    expect(js).toContain("document.querySelector('.launch-hidden');");
  });

  test('挂起标记生命周期：显式启动即消费 / 清空全部即清除（防重入与误恢复）', () => {
    expect(js).toContain('// v7.63：显式启动即消费挂起标记（防止落定后的 closeRecentApps 重入结算再启动一次）');
    expect(js).toContain('recentsSuspendedFromApp = null; // v7.63：清空后无挂起可言，防关场结算误恢复');
    // 消费即清（重入/二次关场安全）
    expect(js).toContain('recentsSuspendedFromApp = null; // 消费即清（重入/二次关场安全）');
  });
});

describe('v7.63 · 导航栏 Home 语义（nav-bar.js）', () => {
  const js = src('ios-desktop/js/nav-bar.js');

  test('sysHome 在后台在场时以 resumeSuspended:false 关场（回桌面，实例留在后台）', () => {
    expect(js).toContain('closeRecentApps({ resumeSuspended: false });');
  });
});

describe('v7.63 · visibility-heal 扩盲（issue #8 复发盲区）', () => {
  const js = src('ios-desktop/js/visibility-heal.js');

  test('挂起窗口态（isOpen 真且 .open 已摘）纳入残留体检；recents 浮层在场时让位关场结算', () => {
    expect(js).toContain('const suspendedStale = !!state.isOpen && !state.isClosing &&');
    expect(js).toContain("dom.appWindow && !dom.appWindow.classList.contains('open');");
    expect(js).toContain('const recentsActive = !!(recentsOverlayEl && recentsOverlayEl.classList.contains(\'active\'));');
    expect(js).toContain('if (!state.isClosing && dom.desktop && !recentsActive && (!state.isOpen || suspendedStale)) {');
  });
});

describe('v7.63 · SW 版本', () => {
  test('sw.js VERSION = geek-v72', () => {
    expect(src('sw.js')).toContain("const VERSION = 'geek-v72';");
  });
});
