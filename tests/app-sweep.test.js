// ==================== v300 测试 — #300 全应用 sweep 自动化入库（R134 窗 Job 2931605 第 3 定时消息系列） ====================
//
// 背景：#300 全应用 sweep 能力（52 应用逐个开启→截图→收集 console/pageerror/netfail→关窗→校验）
// 曾只存在于会话内存，未固化为仓库脚本。本卡落 scripts/e2e-app-sweep.mjs（源码档真实 UI 路径）
// + .github/workflows/app-sweep.yml（每日档，不挡发布）+ package.json e2e:sweep 登记。
//
// 与 e2e-dist-smoke（#139②/#260/#299）分层：dist 档=API 直调 openAppById 验构建产物；
// 本档=桌面 .app-icon 真实点击→开窗→三零断言→back-btn 关窗的真实用户路径，
// 覆盖非 iframe 卡片式应用（clock/settings 等 dist-smoke 注册表解析不到的应用）。
//
// #300 实录踩坑四要素（知识本体，锚位固化）：①锁屏上滑解锁（D 键不解锁；默认 nolock=1 双档）
// ②.app-icon[data-id] 跨页 JS el.click() 绕可见性 ③关窗=back-btn 勿 Esc（电源对话框遮罩驻留）
// ④console/pageerror/netfail 三零断言（豁免口径 #260/#299 同律）。
//
// 关联：#300（本卡）/ #139（dist-smoke 分层基座）/ #260/#299（三防线口径）/ #272（e2e 治理）/
//       #295（docs 截图膨胀→docs/sweep/ gitignore）/ #18 §5/§9/§7.5/§7.6/§7.7

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const sweepSrc = readFileSync(join(ROOT, 'scripts/e2e-app-sweep.mjs'), 'utf-8');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));

describe('v300 · #300 全应用 sweep 自动化入库', () => {
  it('A1 · 脚本存在且形态完备：注册表单一真源解析 + ≥30 防误报中止', () => {
    expect(existsSync(join(ROOT, 'scripts/e2e-app-sweep.mjs')), 'scripts/e2e-app-sweep.mjs 应存在').toBe(true);
    expect(sweepSrc).toContain("readdirSync(path.join(root, 'ios-desktop/js/apps')");
    expect(sweepSrc).toContain("iframeAppContent\\(\\s*['\"]apps\\/([a-z0-9-]+)\\/index\\.html['\"]");
    expect(sweepSrc).toContain('预期 ≥30');
    expect(sweepSrc).toContain('中止防误报');
  });

  it('A2 · package.json 登记 e2e:sweep 直指本脚本', () => {
    expect(pkg.scripts['e2e:sweep'], 'e2e:sweep 应登记').toBe('node scripts/e2e-app-sweep.mjs');
  });

  it('B1 · 实录踩坑②：真实 UI 路径驱动源 .app-icon[data-id] + 跨页 JS el.click() 绕可见性', () => {
    expect(sweepSrc).toContain(".app-icon[data-id=\"${appId}\"]");
    expect(sweepSrc).toContain('el.click()');
    expect(sweepSrc).toMatch(/绕横滑分页|绕过.*可见性/);
    // 真源锚：desktop.js 桌面图标 dataset.id 属性（选择器真源健在，重构漂移即红）
    const desktopSrc = readFileSync(join(ROOT, 'ios-desktop/js/desktop.js'), 'utf-8');
    expect(desktopSrc).toContain("div.className = 'app-icon'");
    expect(desktopSrc).toContain('div.dataset.id = app.id;');
  });

  it('B2 · 实录踩坑③：关窗=#appWindow button.back-btn，禁 Esc 路径 + 关窗态校验', () => {
    expect(sweepSrc).toContain("'#appWindow button.back-btn'");
    expect(sweepSrc).toMatch(/back-btn|backBtn/);
    expect(sweepSrc).toContain("classList.contains('open')");
    // Esc 会唤出电源对话框且遮罩驻留——脚本不得用 keyboard Esc 关窗
    expect(sweepSrc).not.toMatch(/keyboard\.press\(\s*['"]Escape/);
    expect(sweepSrc).toMatch(/电源对话框|Esc 会唤出/);
    // 真源锚：main.js backBtn click → popSubPage（关窗链路健在，重构漂移即红）
    const mainSrc = readFileSync(join(ROOT, 'ios-desktop/js/main.js'), 'utf-8');
    expect(mainSrc).toContain("dom.backBtn.addEventListener('click'");
    expect(mainSrc).toContain('popSubPage()');
  });

  it('B3 · 实录踩坑①：锁屏双档——默认 nolock=1 直达桌面；--lock 档上滑手势解锁（D 键不解锁）', () => {
    expect(sweepSrc).toContain('?nolock=1');
    expect(sweepSrc).toContain('LOCK_MODE');
    expect(sweepSrc).toMatch(/mouse\.move\(640, 700\)/);
    expect(sweepSrc).toMatch(/mouse\.down\(\)/);
    expect(sweepSrc).toMatch(/mouse\.up\(\)/);
    expect(sweepSrc).toMatch(/D 键不解锁/);
    // 真源锚：lock-screen 锁屏类（解锁检测目标健在）
    const indexHtml = readFileSync(join(ROOT, 'ios-desktop/index.html'), 'utf-8');
    expect(indexHtml).toContain("css/lock-screen.css");
  });

  it('C1 · 三零断言三防线齐备：pageerror + 同源 console 资源失败 + 同源网络失败（#260/#299 同律）', () => {
    expect(sweepSrc).toContain("page.on('pageerror'");
    expect(sweepSrc).toContain('attachConsoleGuard');
    expect(sweepSrc).toContain('attachNetGuard');
    expect(sweepSrc).toContain('Failed to load resource');
    expect(sweepSrc).toContain("pg.on('response'");
    expect(sweepSrc).toContain("pg.on('requestfailed'");
    expect(sweepSrc).toContain('const NET_EXEMPT = []');
    expect(sweepSrc).toMatch(/route\.abort\(\)/);
    expect(sweepSrc).toMatch(/断网纪律/);
  });

  it('D1 · 每日档工作流：schedule + workflow_dispatch，无 push 触发器（不挡发布）', () => {
    const wfPath = join(ROOT, '.github/workflows/app-sweep.yml');
    expect(existsSync(wfPath), 'app-sweep.yml 应存在').toBe(true);
    const wf = readFileSync(wfPath, 'utf-8');
    expect(wf).toMatch(/schedule:/);
    expect(wf).toContain("cron: '0 21 * * *'");
    expect(wf).toMatch(/workflow_dispatch:/);
    // 无 push 触发器：发布链零干扰（#300「不挡发布」）
    expect(wf).not.toMatch(/^\s*push:/m);
    expect(wf).toContain('node scripts/e2e-app-sweep.mjs');
  });

  it('D2 · 截图产物不入库：docs/sweep/ 已 gitignore（#295 膨胀防线）', () => {
    const gi = readFileSync(join(ROOT, '.gitignore'), 'utf-8');
    expect(gi).toContain('docs/sweep/');
    expect(sweepSrc).toMatch(/docs\/sweep\/ 已 gitignore|已 gitignore 不入库/);
  });
});
