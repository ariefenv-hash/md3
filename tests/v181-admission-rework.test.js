// ==================== v181-admission-rework.test.js — #181 第一批整改（#179 六条准入） v10.55 ====================
//
// 覆盖（#179 六条 × 三个新建未达标应用 + 脚手架模板 + 构建期 lint 防线）：
//   · typing：六条静态锚（令牌/断点/分栏/VFS+notify/怠速柄滑条/整排联动）+ 逻辑零破坏
//   · drawcircle：六条静态锚 + canvas 无效颜色 bug 修复锚（Canvas 2D 不解析 CSS 变量）
//   · gravity：六条静态锚（原生①已达标补自证）+ dt 标度时间流速零 core 改动
//   · app-template-multi：模板自身达标（准入⑥：模板不达标 → 生成应用天然不达标）
//   · vite.config.js：准入 lint 清单制断言（ADMITTED_APPS + 五项静态检查 + fail 构建）
//   · 回归：注册链不变（apps-data 40 平行不动，本批为存量整改零新增应用）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

const TYPING = read('ios-desktop/apps/typing/index.html');
const CIRCLE = read('ios-desktop/apps/drawcircle/index.html');
const GRAVITY = read('ios-desktop/apps/gravity/index.html');
const TPL_HTML = read('scripts/app-template-multi/index.html');
const TPL_CSS = read('scripts/app-template-multi/style.css');
const TPL_MJS = read('scripts/app-template-multi/app.mjs');
const VITE_CFG = read('vite.config.js');

const count = (src, re) => (src.match(re) || []).length;

describe('v10.55 #181 typing：#179 六条准入整改', () => {
  it('准入②：@media 760px 两断点（min/max 各 ≥1）', () => {
    expect(count(TYPING, /@media/g)).toBeGreaterThanOrEqual(2);
    expect(count(TYPING, /min-width:\s*760px/g)).toBeGreaterThanOrEqual(1);
    expect(count(TYPING, /max-width:\s*759\.98px/g)).toBeGreaterThanOrEqual(1); /* v10.55 修：roll-version 把断点数值 759.98px 误当版本子串（"9.98"）滚成 759.99px——HTML 断点真值 759.98px 不变，锚回真值 */
  });
  it('准入③：平板真分栏 —— grid 双栏 + #side 侧栏（手机 display:contents 零变化）', () => {
    expect(TYPING).toMatch(/grid-template-columns:\s*1fr\s+330px/);
    expect(TYPING).toMatch(/#side\s*{\s*display:\s*contents/);
    expect(TYPING).toMatch(/grid-area:\s*side/);
  });
  it('准入④：SDK 接入 —— VFS 成绩历史 + __system.notify 新纪录', () => {
    expect(TYPING).toMatch(/typing-records\.json/);
    expect(TYPING).toMatch(/__system\.fs\.write/);
    expect(TYPING).toMatch(/__system\.notify/);
    expect(TYPING).toMatch(/fsSyncRecords/);
  });
  it('准入⑤：怠速柄滑条（细竖条怠速/hover 胶囊展开）+ --p 同步 + 持久化', () => {
    expect(count(TYPING, /mdslider/g)).toBeGreaterThanOrEqual(2);
    // v10.55 #227 单源化：thumb 几何规范在 _shared/idle-slider.css，本地零伪元素
    expect(TYPING).toContain('../_shared/idle-slider.css');
    expect(TYPING).not.toMatch(/::-webkit-slider-thumb/);
    const gsf = readFileSync(join(ROOT, 'ios-desktop/apps/_shared/idle-slider.css'), 'utf-8'); // 组件单一真源（命名沿用本窗史实变量）
    expect(gsf).toMatch(/width: 6px;\s*\n\s*height: 22px/);           // 怠速细竖条
    expect(gsf).toMatch(/width: 24px;\s*\n\s*border-radius: 11px/);  // hover 胶囊
    expect(TYPING).toMatch(/setProperty\('--p'/);
    expect(TYPING).toMatch(/typing\.fontsize\.v1/);
  });
  it('准入⑤：顶栏 chip 整排按压联动（pressRipple 距离衰减让位+圆角形变）', () => {
    expect(TYPING).toMatch(/function pressRipple\(originIdx\)/);
    expect(TYPING).toMatch(/function releaseRipple\(\)/);
    expect(TYPING).toMatch(/querySelectorAll\('#bar \.chip'\)/);
    expect(TYPING).toMatch(/pointerdown/);
  });
  it('六条自证头注释在位（诚实标注豁免：无播放条）', () => {
    expect(TYPING).toMatch(/#179 六条准入自证/);
    expect(TYPING).toMatch(/播放条波浪.*不适用/);
  });
  it('回归：e2e 桥只读零写入面保持，新增 fontSize/fsSynced getter', () => {
    expect(TYPING).toMatch(/get fontSize\(\)/);
    expect(TYPING).toMatch(/get fsSynced\(\)/);
    expect(TYPING).toMatch(/setTyped: function/);   // v122 原锚仍在
  });
});

describe('v10.55 #181 drawcircle：#179 六条准入整改 + canvas 颜色 bug 修复', () => {
  it('【真 bug】canvas 无效颜色修复：Canvas 2D 不解析 CSS 变量，改 --md-h 读取后 hsl 合成', () => {
    expect(CIRCLE).not.toMatch(/strokeStyle\s*=\s*'hsl\(var\(--md-h/);   // 旧无效写法清除
    expect(CIRCLE).not.toMatch(/fillStyle\s*=\s*'hsl\(var\(--md-h/);
    expect(CIRCLE).toMatch(/getPropertyValue\('--md-h'\)/);               // gravity 同款读取
    expect(CIRCLE).toMatch(/function hsl\(h, s, l, a\)/);
    expect(CIRCLE).toMatch(/cssHue\(\)/);
  });
  it('准入②③：@media 两断点 + 平板右侧常驻 dock（画布让位 360px，非手机版放大）', () => {
    expect(count(CIRCLE, /@media/g)).toBeGreaterThanOrEqual(2);
    expect(CIRCLE).toMatch(/#cv\s*{\s*left:\s*0;\s*right:\s*360px/);
    expect(CIRCLE).toMatch(/translateX\(110%\)/);   // dock 平板态滑入形态
  });
  it('准入④：VFS 纪录历史（最近 20 条）+ notify 新纪录 + 右栏最近纪录列表', () => {
    expect(CIRCLE).toMatch(/drawcircle-records\.json/);
    expect(CIRCLE).toMatch(/__system\.fs\.write/);
    expect(CIRCLE).toMatch(/__system\.notify/);
    expect(CIRCLE).toMatch(/records\.length > 20/);
    expect(CIRCLE).toMatch(/id="recList"/);
  });
  it('准入⑤：chip 整排按压联动；滑条/播放条诚实豁免注明', () => {
    expect(CIRCLE).toMatch(/function pressRipple\(originIdx\)/);
    expect(CIRCLE).toMatch(/怠速柄滑条\/波浪播放条.*不适用|滑条与播放链路/);
  });
  it('回归：resize 显式尺寸计算（替换元素 inset 不拉伸，视口−computed right）+ e2e 桥补 records getter', () => {
    expect(CIRCLE).toMatch(/getComputedStyle\(cv\)\.right/);            // 平板让位 360 经 computed right 读出
    expect(CIRCLE).toMatch(/Math\.max\(50, window\.innerWidth - offR\)/);
    expect(CIRCLE).toMatch(/get records\(\)/);
    expect(CIRCLE).toMatch(/get last\(\) \{ return lastResult; \}/);   // v124 原锚仍在
  });
});

describe('v10.55 #181 gravity：#179 六条准入整改（①原生已达标补自证）', () => {
  it('准入②③：@media 两断点 + 平板右侧控制 dock（物理画布全视口语义保留）', () => {
    expect(count(GRAVITY, /@media/g)).toBeGreaterThanOrEqual(2);
    expect(GRAVITY).toMatch(/#dock\s*{\s*display:\s*none/);            // 手机态隐藏
    expect(GRAVITY).toMatch(/width:\s*280px;\s*z-index:\s*4/);         // 平板态右栏
    expect(GRAVITY).toMatch(/物理画布保持全视口/);
  });
  it('准入④：VFS 场景管理（保存/载入/删除，多场景最近 12）', () => {
    expect(GRAVITY).toMatch(/gravity-scenes\.json/);
    expect(GRAVITY).toMatch(/btnSaveScene/);
    expect(GRAVITY).toMatch(/__system\.fs\.write/);
    expect(GRAVITY).toMatch(/scenes\.length > 12/);
    expect(GRAVITY).toMatch(/data-load/);
    expect(GRAVITY).toMatch(/data-del/);
  });
  it('准入⑤：时间流速怠速柄滑条（dt 标度零 core 改动）+ chip 整排联动', () => {
    expect(GRAVITY).toMatch(/mdslider/);
    expect(GRAVITY).toMatch(/core\.step\(bodies, dt \* speed\)/);      // dt 标度
    expect(GRAVITY).toMatch(/setProperty\('--p'/);
    expect(GRAVITY).toMatch(/function pressRipple\(originIdx\)/);
  });
  it('SDK 语义豁免诚实标注（沙盒无通知语义）+ e2e 桥补 speed/scenes getter', () => {
    expect(GRAVITY).toMatch(/notify 不接：沙盒无通知语义/);
    expect(GRAVITY).toMatch(/get speed\(\)/);
    expect(GRAVITY).toMatch(/get scenes\(\)/);
    expect(GRAVITY).toMatch(/getBodies: function/);   // v123 原锚仍在
  });
});

describe('v10.55 #181 准入⑥：脚手架模板自身达标（模板不达标 → 生成应用天然不达标）', () => {
  it('模板 HTML/CSS/JS 三件套六条骨架齐备', () => {
    expect(TPL_HTML).toMatch(/#179 六条准入骨架自证/);
    expect(TPL_HTML).toMatch(/id="paneA"/);
    expect(TPL_HTML).toMatch(/id="paneB"/);
    expect(TPL_HTML).toMatch(/class="splitter"/);
    expect(TPL_HTML).toMatch(/id="demoSlider"/);
    expect(TPL_HTML).toMatch(/id="squeezeRow"/);
    expect(count(TPL_CSS, /@media/g)).toBeGreaterThanOrEqual(2);
    expect(TPL_CSS).toMatch(/min-width:\s*760px/);
    expect(TPL_CSS).toMatch(/var\(--md-h, 165\)/);          // fallback 兜底引用宿主令牌
    expect(TPL_MJS).toMatch(/sdk\.notify\(\{ title: APP_TITLE, body:/);  // {title,body} 消费形态
    expect(TPL_MJS).toMatch(/sdk\.fs\.write/);
    expect(TPL_MJS).toMatch(/pressRipple/);
    expect(TPL_MJS).toMatch(/setProperty\('--p'/);
  });
});

describe('v10.55 #228/#230 构建期应用质量门禁（vite.config.js 全量扫描防线，白名单制退役）', () => {
  it('全量扫描接线 + 硬门禁 throw + 模板同审在位（清单制 ADMITTED_APPS 已删除）', () => {
    expect(VITE_CFG).not.toContain('ADMITTED_APPS');
    expect(VITE_CFG).toContain('audit-app-quality.mjs');
    expect(VITE_CFG).toContain('runQualityAudit');
    expect(VITE_CFG).toMatch(/应用质量门禁不通过/);
    expect(VITE_CFG).toMatch(/app-template/); // 模板同审（#181 准入⑥语义由 audit 模板审计承担）
    expect(VITE_CFG).toMatch(/1\.06\) v10\.\d+ #228/); // 版本无关锚（滚动不复发）
  });
  it('门禁与 #152 兄弟引用断言同段生效（closeBundle 内）', () => {
    const idx152 = VITE_CFG.indexOf('内联应用兄弟引用缺失（#152）');
    const idxAudit = VITE_CFG.indexOf('应用质量门禁不通过');
    expect(idx152).toBeGreaterThan(-1);
    expect(idxAudit).toBeGreaterThan(idx152);   // 同一 closeBundle 内先后执行
  });
});

describe('v10.55 #181 回归：注册链零变化（存量整改零新增应用）', () => {
  it('apps-data 聚合不变：三应用 import/聚合原位（本批为存量整改零新增应用）', () => {
    const appsData = read('ios-desktop/js/apps-data.js');
    expect(appsData).toMatch(/import typing from '\.\/apps\/typing\.js'/);
    expect(appsData).toMatch(/import drawcircle from '\.\/apps\/drawcircle\.js'/);
    expect(appsData).toMatch(/import gravity from '\.\/apps\/gravity\.js'/);
    expect(appsData).toMatch(/gravity, drawcircle, typing, markdown/);   // v9.13 后聚合序原位
  });
});
