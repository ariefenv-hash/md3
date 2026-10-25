// ==================== v800-connected-subpage.test.js — #10 三期回归守护 ====================
// ①已连接的设备子页（页 18）connected_devices.xml 权威条目链与分组序
// ②values-zh-rCN 权威文案锚定 ③蓝牙单一真源接线（__qsTileState）与门控语义
// ④icons-aosp v8.00 增量 devAdd/devBt（drawable 逐 path 实证）⑤一级菜单 connected 行直通
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');

describe('v8.00 #10 三期 — 一级菜单 connected 行直通', () => {
  const tp = R('ios-desktop/js/apps/settings-two-pane.js');

  it('connected 行 idx 直通页 18（脱离 STUB_IDX 占位）', () => {
    expect(tp).toContain("key: 'connected', icon: 'topDevices', label: '已连接的设备', sub: '蓝牙、配对', idx: 18");
  });

  it('connected 行摘要保持 XML 默认串 connected_devices_dashboard_default_summary「蓝牙、配对」', () => {
    expect(tp).toContain("label: '已连接的设备', sub: '蓝牙、配对'");
  });

  it('剩余 STUB 语义保留（v8.01 重锚：notifications 已转正页 19，modes/accessibility 等仍指占位页）', () => {
    // v8.01 重锚：notifications 行随页 19 转正脱离 STUB（见 v801-notifications-subpage.test.js）
    expect(tp).toContain("key: 'notifications', icon: 'topNotifications', label: '通知', sub: '历史通知、对话', idx: 19");
    expect(tp).toContain("key: 'modes', icon: 'topModes', label: '模式', sub: '', idx: STUB_IDX");
  });
});

describe('v8.00 #10 三期 — 已连接的设备子页（页 18）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('页 18 存在且标题 = connected_devices_dashboard_title 权威串', () => {
    expect(s).toContain("title: '已连接的设备'");
  });

  it('条目链按 connected_devices.xml 权威序（媒体设备→其他设备→与新设备配对→保存的设备→曾与账号配对过的设备→连接偏好设置）', () => {
    const order = ['媒体设备', '其他设备', '与新设备配对', '保存的设备', '曾与账号配对过的设备', '连接偏好设置'];
    let pos = -1;
    for (const t of order) {
      const i = s.indexOf(t, pos + 1);
      expect(i, `「${t}」应按 XML 序出现在前一项之后`).toBeGreaterThan(pos);
      pos = i;
    }
  });

  it('values-zh-rCN 权威文案锚定（add_device_summary/bluetooth_off_footer/see_all）', () => {
    expect(s).toContain('系统将开启蓝牙以进行配对'); // connected_device_add_device_summary
    expect(s).toContain('开启蓝牙即可连接到其他设备。'); // bluetooth_off_footer
    expect(s).toContain('曾与账号配对过的设备'); // connected_device_previously_associated_fast_pair_device_title
    expect((s.match(/查看全部/g) || []).length).toBeGreaterThanOrEqual(2); // previous_connected_see_all ×2
  });

  it('controller 门控语义注释保留（bt_nearby_slice / audio_sharing hidden 语义）', () => {
    expect(s).toContain('bt_nearby_slice');
    expect(s).toContain('SlicePreferenceController');
    expect(s).toContain('AudioSharingDevicePreferenceController');
    expect(s).toContain('允许他人和您一起收听您的媒体内容。'); // audio_sharing_description 考证注记（前段）
    expect(s).toContain('收听者需要自备 LE 音频耳机。'); // audio_sharing_description 考证注记（后段）
  });

  it('设备分组蓝牙态门控（connDevCatConnected/connDevCatSaved/connDevCatFastPair + footer 反相）', () => {
    expect(s).toContain("['connDevCatConnected', 'connDevCatSaved', 'connDevCatFastPair']");
    expect(s).toContain("el.style.display = btOn ? '' : 'none'");
    expect(s).toContain("ft.style.display = btOn ? 'none' : ''");
  });

  it('add_bt_devices 单一真源接线（__connDevAdd → __qsTileState.sync bluetooth + Toast）', () => {
    expect(s).toContain('onclick="__connDevAdd(this)"');
    expect(s).toContain("window.__qsTileState.sync('bluetooth', { active: true })");
    expect(s).toContain("__qsToast(wasOn ? '正在搜索附近的设备' : '蓝牙已开启')");
    expect(s).toContain("window.__qsTileState.get('bluetooth')");
  });

  it('app-page-active 页 18 激活刷新接线', () => {
    expect(s).toContain('e.detail.pageIdx === 18');
  });

  it('connection_preferences 摘要 = summary_placeholder 忠实空呈现（无虚构摘要）', () => {
    const i = s.indexOf('连接偏好设置');
    const seg = s.slice(i, i + 400);
    expect(seg).not.toContain('display:block;font-size:13px'); // 该行无摘要子元素
  });
});

describe('v8.00 #10 三期 — icons-aosp 增量（drawable 逐 path 实证）', () => {
  const ic = R('ios-desktop/js/icons-aosp.js');

  it('devAdd = ic_add_24dp pathData 实证（M20,13h-7v7...）', () => {
    expect(ic).toContain('devAdd:');
    expect(ic).toContain('M20,13h-7v7h-2v-7H4v-2h7V4h2v7h7V13z');
  });

  it('devBt = ic_settings_bluetooth pathData 实证（M17.71,7.71L12,2h-1v7.59...）', () => {
    expect(ic).toContain('devBt:');
    expect(ic).toContain('M17.71,7.71L12,2h-1v7.59L6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 11,14.41L11,22h1l5.71,-5.71 -4.3,-4.29 4.3,-4.29z');
  });

  it('页 18 引用 devBt/devAdd 图标（media 行用项目 cast 资产）', () => {
    const s = R('ios-desktop/js/apps/settings.js');
    expect(s).toContain('AOSP_ICONS.devBt');
    expect(s).toContain('AOSP_ICONS.devAdd');
    expect(s).toContain('viewBox="0 -960 960 960"'); // cast 960 网格同源资产
  });
});
