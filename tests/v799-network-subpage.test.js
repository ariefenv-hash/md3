// ==================== v799-network-subpage.test.js — #10 二期回归守护 ====================
// ①一级菜单动态摘要纠偏（网络静态串/存储 storage_summary/电池仪表盘标签）
// ②网络和互联网子页（页 17）network_provider_internet.xml 权威 10 项清单
// ③单一真源接线（QS aeroplane/internet 磁贴桥）④icons-aosp v7.99 增量 6 枚
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');

describe('v7.99 #10 二期 — 一级菜单动态摘要纠偏', () => {
  const tp = R('ios-desktop/js/apps/settings-two-pane.js');

  it('网络行摘要 = network_dashboard_summary_mobile 权威串「移动网络、WLAN、热点」（非 Wi-Fi 状态）', () => {
    expect(tp).toContain("label: '网络和互联网', sub: '移动网络、WLAN、热点', idx: 17");
    expect(tp).not.toContain('Wi-Fi、移动数据、热点');
  });

  it('存储行 = storage_summary 动态语义（subId 桥 + 空 placeholder 初始值）', () => {
    expect(tp).toContain("subId: 'settingsStorageSub'");
    expect(tp).toContain("label: '存储空间', sub: '', subId: 'settingsStorageSub', idx: 7");
  });

  it('电池行保留 v751 锚定契约（hintId=settingsMainBatteryPct），摘要转 placeholder 空值', () => {
    expect(tp).toContain("hintId: 'settingsMainBatteryPct'");
    expect(tp).toContain("label: '电池', sub: '', hintId: 'settingsMainBatteryPct', idx: 2");
  });

  it('页 0 内联脚本按 storage_summary 格式刷新存储摘要（已使用 X% - 还剩 Y）', () => {
    const s = R('ios-desktop/js/apps/settings.js');
    expect(s).toContain("settingsStorageSub");
    expect(s).toMatch(/'已使用 ' \+ Math\.round\(Math\.min\(100, pct\)\) \+ '% - 还剩 '/);
  });

  it('settings-battery.js 电池摘要升级为 getDashboardLabel 语义（67% - 正在充电）', () => {
    const b = R('ios-desktop/js/apps/settings-battery.js');
    expect(b).toContain("s.charging ? `${s.level}% - 正在充电` : `${s.level}%`");
  });
});

describe('v7.99 #10 二期 — 网络和互联网子页（页 17）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('清单 = network_provider_internet.xml 权威 10 项按 order 排序', () => {
    const titles = ['互联网', '通话和短信', 'SIM 卡', '飞行模式', '热点和网络共享', '省流模式', 'VPN', '私人 DNS', '自适应连接', '移动网络安全'];
    let pos = -1;
    for (const t of titles) {
      const i = s.indexOf(t, pos + 1);
      expect(i, `「${t}」应按 order 出现在前一项之后`).toBeGreaterThan(pos);
      pos = i;
    }
  });

  it('权威 zh 文案锚定（provider_internet_settings/data_saver_title/cellular_security_summary 等）', () => {
    expect(s).toContain('自动管理您的网络连接，从而延长电池续航时间并提升设备性能'); // adaptive_connectivity_summary
    expect(s).toContain('网络类型、加密、通知控件'); // cellular_security_summary
    expect(s).toContain("title: '网络和互联网'"); // network_dashboard_title
  });

  it('飞行模式行 = md3-switch，单源接线 syncTileState(\'aeroplane\')', () => {
    expect(s).toContain('id="netAirplaneToggle"');
    expect(s).toContain("window.__qsTileState.sync('aeroplane', { active: on })");
    expect(s).toMatch(/netAirplaneToggle[\s\S]{0,200}?addEventListener\('change'/);
  });

  it('互联网行摘要动态（InternetPreferenceControllerV2 语义：internet 磁贴单一真源）+ 点击打开网络面板', () => {
    expect(s).toContain("window.__qsTileState.tile('internet')");
    expect(s).toContain('onclick="__qsNetworkSheet(this)"');
  });

  it('子页脚本以 app-page-active(17) 重放 + 开关绑定幂等（v799Bound 防重复监听）', () => {
    expect(s).toMatch(/pageIdx === 17/);
    expect(s).toMatch(/dataset\.v799Bound/);
  });
});

describe('v7.99 #10 二期 — quick-settings 单一真源 window 桥', () => {
  const qs = R('ios-desktop/js/quick-settings.js');

  it('桥暴露磁贴 get/sync/tile + 网络面板 + 系统 Toast（设置子页内联脚本专用）', () => {
    expect(qs).toContain('window.__qsTileState = {');
    expect(qs).toContain('get: getTileActive');
    expect(qs).toContain('sync: syncTileState');
    expect(qs).toContain('window.__qsNetworkSheet = openNetworkSheet');
    expect(qs).toContain('window.__qsToast = showSystemToast');
  });

  it('aeroplane 磁贴在出厂磁贴清单中真实存在（接线目标非虚构）', () => {
    expect(qs).toMatch(/id:\s*'aeroplane'/);
  });
});

describe('v7.99 #10 二期 — icons-aosp 增量（network_provider_internet 图标）', () => {
  const ic = R('ios-desktop/js/icons-aosp.js');

  it('6 枚新键齐备（calls_sms/sim/airplanemode/tether/data_usage/vpn_key）', () => {
    for (const k of ['netCallsSms', 'netSim', 'netAirplane', 'netTether', 'netDataSaver', 'netVpn']) {
      expect(ic).toMatch(new RegExp(`\\b${k}: \`<svg viewBox="0 0 [\\d.]+ [\\d.]+"[^>]*><path d="`));
    }
  });

  it('顶层 21 键总量保持（v7.98 20 项 + net* 6 枚 + topCommunal；v8.00 重锚 +devAdd/devBt）', () => {
    const keys = [...ic.matchAll(/^\s{2}([A-Za-z]\w*): `/gm)].map((m) => m[1]);
    expect(keys.length).toBe(42); // v8.00 重锚 = 29（+devAdd/devBt）；v8.02 #10 五期 +a11y* 13 枚（无障碍子页 layer-list 前景）
    for (const k of ['topWireless', 'topStorage', 'topBattery']) expect(keys).toContain(k);
  });
});
