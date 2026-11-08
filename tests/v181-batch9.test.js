// ==================== v181-batch9.test.js — #181 第九批整改：midi-player 六条准入 ====================
//
// 覆盖（渐进累计 10/13）：
//   · midi-player 令牌化收尾（--mp-panel/--mp-well/--mp-mask 从 --md-scrim/--md-on-surface
//     color-mix 派生 + ::part(control-panel) 消费派生变量 + sheet 遮罩/阴影/悬停面派生；
//     fallback 兜底不算裸写）
//   · 响应式：@media 400px 手机紧凑 + 760px 平板真分栏（grid 1fr/300px 左 head/body/info 沉底
//     + 右示例曲目 chips 纵向铺开 grid-row:1/4，手机 flex 零变化；samples 移出 .mp-body 成为
//     .mp-app 直接子级——手机态视觉由自带 padding 保持）
//   · SDK：notify（装载成功发一次，同曲重复装载不重发——低频门）+ VFS
//     /documents/midi-player-history.json 最近 20 条镜像（装载写入/启动恢复双落点 +
//     fsAvail 守卫降级零炸 + localStorage 独立键不经 normalizeState 白名单）
//   · 形态语言：pressRipple 两排事件委托（mp-head/mp-samples 欧氏距离衰减 240px/0.08——
//     纵向 chips 排同样适用；三释放）
//   · 回归锚：切歌纪律 stop→revoke→src / 深链 midi-player/open / 取消路径四件套 /
//     零 innerHTML / core.SAMPLES 桥 / 启动恢复不自动播放 零变化
//   · 准入门：ADMITTED_APPS 扩至 14 应用（+midi-player）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'ios-desktop/apps/midi-player/index.html'), 'utf-8');
const MJS = readFileSync(join(ROOT, 'ios-desktop/apps/midi-player/app.mjs'), 'utf-8');
const VITE = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8');

describe('#181 第九批 midi-player：令牌化收尾', () => {
  it('面板/元件面/遮罩/阴影/悬停五面派生 + 裸 rgba 仅剩 fallback 兜底', () => {
    expect(HTML).toContain('--mp-panel: color-mix(in srgb, var(--md-scrim, #000) 22%, transparent);');
    expect(HTML).toContain('--mp-well: color-mix(in srgb, var(--md-on-surface, #fff) 6%, transparent);');
    expect(HTML).toContain('--mp-mask: color-mix(in srgb, var(--md-scrim, #000) 45%, transparent);');
    // 五处消费点接线（原裸 rgba 退役）
    expect(HTML).toContain('midi-player::part(control-panel) { background: var(--mp-well); border: 1px solid var(--mp-line); }');
    expect(HTML).toContain('background: var(--mp-mask);');
    expect(HTML).toContain('box-shadow: 0 -8px 40px color-mix(in srgb, var(--md-scrim, #000) 50%, transparent);');
    expect(HTML).toContain('.mp-vfs-row:hover { background: var(--md-state-hover, color-mix(in srgb, var(--md-on-surface, #fff) 5%, transparent)); }'); // v10.80 #229 P1 二批：state 优先 color-mix fallback
    expect(HTML).toContain('background: var(--mp-panel);');
    // 裸 rgba 仅剩 1 处 var() 内 fallback 兜底（--mp-line 的 rgba(255,255,255,.12)，准入口径不算裸写）
    expect((HTML.match(/rgba\(/g) || []).length).toBe(1);
  });
});

describe('#181 第九批 midi-player：响应式 + 760px 平板真分栏', () => {
  it('@media 400px 紧凑 + 760px grid 两列（左主区右示例纵向，手机 flex 零变化）', () => {
    expect(HTML).toMatch(/@media \(max-width:400px\) \{/);
    expect(HTML).toMatch(/@media \(min-width:760px\) \{/);
    expect(HTML).toContain('.mp-app { display: grid; grid-template-columns: 1fr 300px; grid-template-rows: auto 1fr auto; }');
    expect(HTML).toContain('.mp-head { grid-column: 1; grid-row: 1; }');
    expect(HTML).toContain('.mp-body { grid-column: 1; grid-row: 2; }');
    expect(HTML).toContain('.mp-info { grid-column: 1; grid-row: 3; }');
    expect(HTML).toMatch(/\.mp-samples \{ grid-column: 2; grid-row: 1 \/ 4; flex-direction: column; flex-wrap: nowrap;/);
    // 手机紧凑锚
    expect(HTML).toContain('midi-visualizer { max-height: 34vh; }');
    expect(HTML).toContain('.mp-info { padding: 6px 8px; font-size: 9.5px; gap: 7px; }');
    // 手机态零变化锚：基础 .mp-app 保持 flex column + samples 横向 wrap（基础规则）
    // v10.80 #245 批 2 重锚：mp-app 主体入场动画（emphasized-decelerate 令牌消费）
    expect(HTML).toContain('.mp-app { position: absolute; inset: 0; display: flex; flex-direction: column; animation: mp-app-in');
    expect(HTML).toContain('var(--md-easing-emphasized-decelerate, cubic-bezier(0.05,0.7,0.1,1))');
    expect(HTML).toMatch(/\.mp-samples \{ flex: 0 0 auto; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;/);
    // 结构锚：samples 已是 .mp-app 直接子级（head/body/samples/info 四区落位前提）
    const bodyEnd = HTML.indexOf('</div>\n    <div class="mp-samples"');
    expect(bodyEnd).toBeGreaterThan(-1);
  });
});

describe('#181 第九批 midi-player：SDK 双通道（notify + VFS 历史镜像）', () => {
  it('sysAvail/fsAvail 双守卫 + 同曲门低频 notify + VFS 最近 20 条双落点 + 独立键', () => {
    expect(MJS).toContain('!!(window.__system && window.__system.notify)');
    expect(MJS).toContain('!!(window.__system && window.__system.fs && typeof window.__system.fs.write === \'function\')');
    expect(MJS).toContain("try { window.__system.notify({ title: title, body: body }); } catch (err) { /* 静默降级 */ }");
    expect(MJS).toContain("if (key === lastNotifyKey) return;      // 同曲重复装载不重发（低频门）");
    expect(MJS).toContain("var MP_HISTORY_KEY = 'ios-desktop:midi-history-v1';");
    expect(MJS).toContain("'/documents/midi-player-history.json'");
    expect(MJS).toContain('MP_HISTORY_CAP = 20');
    expect(MJS).toContain("window.__system.fs.write(MP_HISTORY_PATH, JSON.stringify({ app: 'midi-player', records: readHistory().slice(-MP_HISTORY_CAP) })).catch(function () {})");
    // 双落点：装载写入 + 启动恢复
    expect(MJS).toMatch(/recordHistory\(name, notes\);         \/\/ #181 准入④：装载成功 → 历史记录 \+ VFS 镜像（落点一）/);
    expect(MJS).toMatch(/mirrorHistory\(\);                    \/\/ #181 准入④：启动时恢复镜像（宿主在库时同步，落点二）/);
  });
});

describe('#181 第九批 midi-player：形态语言（pressRipple 整排联动）', () => {
  it('两排事件委托 + 三释放 + 欧氏距离衰减（240px 步进 0.08，纵向 chips 排适用）', () => {
    expect(MJS).toContain("var REACH = 240, STEP = 0.08, SEL = '.mp-head, .mp-samples';");
    expect(MJS).toContain("'pointerup', 'pointercancel', 'pointerleave'");
    expect(MJS).toContain('Math.hypot(e.clientX - (r.x + r.width / 2), e.clientY - (r.y + r.height / 2)) / REACH');
    expect(MJS).toContain("el.style.transform = 'scale(' + (1 - STEP * k).toFixed(3) + ')';");
    expect(MJS).toContain('setupPressRipple();                 // #181 准入⑤：整排按压联动（初始化置于 SDK 块后）');
  });
});

describe('#181 第九批 midi-player：回归锚（播放装载核心零变化）', () => {
  it('切歌纪律/深链/取消路径/零 innerHTML/SAMPLES 桥/启动恢复 零变化', () => {
    // 切歌纪律：先 stop 旧播放 + revoke 旧 URL 再换 src
    const lb = MJS.slice(MJS.indexOf('function loadBytes'), MJS.indexOf('function loadSample'));
    expect(lb.indexOf('stopPlayback()')).toBeGreaterThan(-1);
    expect(lb.indexOf('releaseBlobUrl()')).toBeGreaterThan(-1);
    expect(lb.indexOf('stopPlayback()')).toBeLessThan(lb.indexOf('player.src'));
    expect(MJS).toContain('revokeObjectURL');
    // 空曲目拒绝仍在 blob URL 之前
    expect(lb.indexOf('空曲目')).toBeGreaterThan(-1);
    expect(lb.indexOf('空曲目')).toBeLessThan(lb.indexOf('createObjectURL'));
    // 深链 / 取消路径 / 零 innerHTML / SAMPLES 桥 / 启动恢复
    expect(MJS).toContain("d.event !== 'midi-player/open'");
    expect(MJS).toContain("fileInput.addEventListener('cancel', function () { closeSheet(); })");
    expect(MJS).toContain('ev.stopImmediatePropagation()');
    expect(MJS).not.toMatch(/\.innerHTML\s*=/);
    expect(MJS).toContain('core.SAMPLES.forEach');
    expect(MJS).toContain("state.last.type === 'sample'");
    expect(MJS).toContain("state.last.type === 'vfs'");
    // 装载核心新增调用不破坏 src 前置次序
    expect(lb.indexOf('recordHistory(name, notes)')).toBeLessThan(lb.indexOf('player.src'));
  });
});

describe('v10.80 #228 准入覆盖（全量扫描取代清单制）', () => {
  it('midi-player 已由全量扫描自动覆盖（白名单制度在 v10.80 退役）', () => {
    // v10.80 #228 制度性根因修正：ADMITTED_APPS 硬编码白名单已删除（24 应用绕过检查的根因），
    // 改 audit-app-quality.mjs 全量扫描 —— apps/ 落盘即受检，应用 id 不得再硬编码进 vite.config.js
    expect(VITE).not.toContain('ADMITTED_APPS');
    expect(VITE).toContain('audit-app-quality.mjs');
    expect(VITE).toContain('runQualityAudit');
    expect((VITE.match(/'midi-player'/g) || []).length).toBe(0); // 全量扫描下零硬编码（旧「清单含 X」断言的语义反转）
  });
});