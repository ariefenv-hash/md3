// tests/v316-zerotouch-registration.test.js — #286 续车道 zero-touch P1 三家结构性非缺口登记锚
// @snapshot · 交付时点快照（#291 §1 裁决）：钉扎对象=zero-touch 注册面内容；允许随快照失义退役（docs/test-naming-evergreen.md §4 登记制）——R149 改名机械批注入
//
// 覆盖面（R142 窗 · Job 2932311 · 第 1 系列 · 认领帖 6734038030）：
//   A wallet.js 实读裁决：纯静态模板页——零纯函数面/零逻辑导出（default 对象 pages 模板 +
//     ICONS 模板插值唯一消费）→ 结构性非缺口，真适配不硬造（#309/#313/#314 D1 先例同律）；
//   B facetime.js 实读裁决：静态入口页（按钮组 + 静态最近通话列表 + __demoAction onclick）
//     ——零纯函数面 → 结构性非缺口；
//   C findmy.js 实读裁决：静态定位视图 + 唯一动态沿 = subscribeBattery DOM 直绑
//     （battery-service 单一真源订阅 → textContent 三元模板；零纯逻辑导出）→ 结构性非缺口；
//   D 零硬造跨批互证：三文件零 *Core 出口 + docs/globals-registry.json 无三家 core 登记
//     （ref-core 三批 files/settings/photo/translate/weather 全为真逻辑提取对照面）；
//   E 矩阵联动：v316 实读锚使三档位翻转如实登记——zeroTouch 3→0、refOnly 22→25
//     （v10.93 第四批 camera/notes 演进重锚：refOnly→23 / cores→30；v11.25 safari 对侧合流 22/31；v11.25 第五批 phone/markdown 本侧合流再锚：refOnly→20 / cores→33），覆盖矩阵 --check 逐字节随树再生。；v11.25 archive/pdf 对侧合流 18/35）
//
// 车道边界：零产品源码触达（登记卷）；零滚版（#315/321e42e 先例同律）。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

describe('v316 · zero-touch 三家实读裁决（结构性非缺口登记）', () => {
  it('A wallet.js：纯静态模板页——零纯函数面零逻辑导出（default pages 模板 + ICONS 唯一消费）', () => {
    const src = read('ios-desktop/js/apps/wallet.js');
    expect(src).toContain("id: 'wallet'");
    // 逻辑面裁决：无函数声明/无箭头函数体/无逻辑导出（default 页面对象外零出口）
    expect(src).not.toMatch(/function\s+\w+/);
    expect(src).not.toMatch(/=>\s*\{/);
    expect(src).not.toMatch(/export\s+(const|function|class)/);
    expect(src.match(/export default/g) || []).toHaveLength(1);
    // 模板消费面：ICONS 模板插值（视觉资产）+ onclick 导航（接线层语义）
    expect(src).toContain("import { ICONS } from '../icons.js'");
    expect(src).toContain('${ICONS.');
    // 头注裁决在案（#120 对齐 GMS 裁决保留）
    expect(src).toContain('#120');
  });

  it('B facetime.js：静态入口页——零纯函数面（按钮组+静态列表+__demoAction onclick）', () => {
    const src = read('ios-desktop/js/apps/facetime.js');
    expect(src).toContain("id: 'facetime'");
    expect(src).not.toMatch(/function\s+\w+/);
    expect(src).not.toMatch(/=>\s*\{/);
    expect(src).not.toMatch(/export\s+(const|function|class)/);
    // 对齐裁决在案（#120 Meet 改名 + id 稳定声明）
    expect(src).toContain('#120');
    expect(src).toContain("__demoAction && __demoAction('发起视频')");
  });

  it('C findmy.js：静态定位视图 + 唯一动态沿=subscribeBattery DOM 直绑（零纯逻辑导出）', () => {
    const src = read('ios-desktop/js/apps/findmy.js');
    expect(src).toContain("id: 'findmy'");
    expect(src).not.toMatch(/function\s+\w+/);
    expect(src).not.toMatch(/export\s+(const|function|class)/);
    // 唯一动态沿：battery-service 单一真源订阅 → textContent 直绑（无中间纯函数）
    expect(src).toContain('subscribeBattery((s) => {');
    expect(src).toContain("document.getElementById('findmyThisDeviceBattery')");
    expect(src).toContain('s.level');
  });

  it('D 零硬造跨批互证：三文件零 *Core 出口 + globals-registry 无三家登记（ref-core 三批对照面）', () => {
    for (const f of ['wallet', 'facetime', 'findmy']) {
      expect(read(`ios-desktop/js/apps/${f}.js`)).not.toMatch(/__\w+Core/);
    }
    const registry = read('docs/globals-registry.json');
    expect(registry).not.toContain('__walletCore');
    expect(registry).not.toContain('__facetimeCore');
    expect(registry).not.toContain('__findmyCore');
    // 对照面：ref-core 三批真提取在册（同卷不硬造的正面证据）
    expect(registry).toContain('__filesCore');
    expect(registry).toContain('__settingsCore');
    expect(registry).toContain('__photoCore');
    expect(registry).toContain('__translateCore');
    expect(registry).toContain('__weatherCore');
  });

  it('E 矩阵联动：zeroTouch 3→0 / refOnly 22→25→9→8（v11.25 第十三批 installer 本侧池收口卷演进重锚）翻转如实（appsTotal 52 · cores 45 · 消费 100% 零 gap）', () => {
    const m = JSON.parse(read('docs/test-coverage-matrix.json'));
    expect(m.stats.appsTotal).toBe(52);
    expect(m.stats.coresTotal).toBe(45); // 演进重锚：game2048→36（对侧第七批）→ threes/dice→38（对侧第八批）→ shortcuts→39（对侧第九批）→ stocks→40（本侧合流终态）→ cal_app→41（对侧第十批）→ contacts→42（本侧第十批合流终态）→ flow11→43（对侧第十一批）→ recorder→44（本侧第十二批，双站合流终态）→ installer→45（本侧第十三批，native 池收口卷）
    expect(m.stats.coresConsumed).toBe(45);
    expect(m.stats.coresCoveragePct).toBe(100);
    expect(m.stats.zeroTouch).toBe(0);
    expect(m.stats.zeroTouchP0).toBe(0);
    expect(m.stats.refOnly).toBe(8); // 演进链：…→17（game2048 对侧第七批）→15（threes/dice 对侧第八批）→14（shortcuts 对侧第九批）→13（stocks 本侧合流终态）→12（cal_app 对侧第十批）→11（contacts 本侧第十批合流终态）→10（flow11 对侧第十一批，R147）→9（recorder 本侧第十二批，双站合流终态）→8（installer 本侧第十三批池收口，native 五家 health/map/wallet/facetime/findmy 零纯函数面结构性暂缓登记如实账·books/reminders 前窗暂缓维持，本卷持真）
    // 三家 tier 翻转在账（zero-touch → ref-only：实读锚即消费面）
    for (const id of ['wallet', 'facetime', 'findmy']) {
      const app = m.apps.find((a) => a.id === id);
      expect(app.tier, id).toBe('ref-only');
    }
  });
});
