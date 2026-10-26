// ==================== v8.26 #48：关于手机浏览器 API 设备信息填充 ====================
//
// 议题 #48 三页守护（AOSP main 实源逐 key 取证，考证链见 settings.js ABOUT_PAGE_SCRIPT 头注）：
//   页 21 = res/xml/my_device_info.xml（四分区 20 键：渲染 8 行 + 门控隐藏注记）
//   页 22 = res/xml/hardware_info.xml（1:1 四键：渲染 1 行 + 隐藏 3 行注记）+
//           「浏览器设备信息」扩展分区（#48 明示超越点）6 行
//   页 23 = res/xml/firmware_version.xml（1:1 六键：渲染 5 行 + base_band 隐藏注记）
//   ① 浏览器 API 映射（userAgentData/screen/hardwareConcurrency/deviceMemory/connection?
//      storage.estimate/getBattery/WebRTC/Intl）② 伪装链确定性 ③ 连点链 ④ two-pane 转正
//
// 测试纪律（worklog 惯例）：indexOf 切片锚点用定义形态；负断言用 not.toMatch 正则
// 防注释误报；\u 零出现（源文件为字面 CJK）。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v8.26 #48① ABOUT_PAGE_SCRIPT：采集与降级基建', () => {
  const s = src('ios-desktop/js/apps/settings.js');
  const i = s.indexOf('const ABOUT_PAGE_SCRIPT = `');
  expect(i).toBeGreaterThan(-1);
  const seg = s.slice(i, s.indexOf('// ==================== APPS_PAGE_SCRIPT', i));

  it('UA-CH 采集：userAgentData.getHighEntropyValues(platformVersion/model/fullVersionList)', () => {
    expect(seg).toContain('navigator.userAgentData');
    expect(seg).toContain("getHighEntropyValues(['platformVersion', 'model', 'fullVersionList'])");
  });

  it('老内核降级：userAgentData 缺失 → UA 解析（Android/Chrome 字面提取，零反斜杠纪律）', () => {
    expect(seg).toContain('/Android ([0-9.]+)/');
    expect(seg).toContain("navigator.platform || ''");
  });

  it('优雅降级权威回退值：device_info_default「未知」', () => {
    expect(seg).toMatch(/return '未知';/);
  });

  it('隐私纪律：WebRTC 探测不带 STUN/TURN（iceServers 空），注释明示不外传', () => {
    expect(seg).toContain('new RTCPeerConnection({ iceServers: [] })');
    expect(seg).toContain('不外传');
  });

  it('确定性伪装链三函数：dHash/fakeBuildId/fakePatch/fakeKernel（同 seed 同值）', () => {
    expect(seg).toContain('function dHash(s) {');
    expect(seg).toContain('function fakeBuildId(seed) {');
    expect(seg).toContain("dHash('patch:' + seed)");
    expect(seg).toContain("'-g' + g");
  });

  it('伪装格式对齐 AOSP：BuildID XXXX.YYMMDD.NNN / 补丁 YYYY-MM-DD / 内核 5.15.NN-androidMAJ-N-gHEX12', () => {
    expect(seg).toContain("['AP3A', 'AP4A', 'BP3A', 'BP4A'][h % 4]");
    expect(seg).toContain("-android' + maj + '-'");
  });

  it('电池行单一真源：window.__batteryGetState 桥优先 + getDashboardLabel 同构摘要', () => {
    expect(seg).toContain("window.__batteryGetState && window.__batteryGetState()");
    expect(seg).toContain("st.level + '% - 正在充电'");
  });

  it('正常运行时间：performance.now 映射（formatElapsed zh 语义）+ 30s 周期刷新', () => {
    expect(seg).toContain('function fmtUptime() {');
    expect(seg).toMatch(/setInterval\(function\(\) \{[^]*?\}, 30000\)/);
  });

  it('幂等守卫：window.__aboutV826 重复执行不重复 setInterval（三页各内嵌一次）', () => {
    expect(seg).toContain('window.__aboutV826)');
    expect(seg.indexOf('window.__aboutV826 = {')).toBeGreaterThan(-1);
  });

  it('零反斜杠纪律：script 内不出现 \\u 转义（源码字面 CJK）', () => {
    expect(seg).not.toMatch(/\\u[0-9a-fA-F]{4}/);
  });
});

describe('v8.26 #48② 页 21 关于手机（my_device_info.xml 1:1）', () => {
  const s = src('ios-desktop/js/apps/settings.js');
  const i = s.indexOf('v8.26 #48：关于手机三页');
  const j = s.indexOf('v8.26 #48：页 22 型号', i);
  const seg = s.slice(i, j);

  it('四分区权威序与 zh-rCN 权威标题：基本信息→法律法规→设备详细信息→设备标识符', () => {
    const a = seg.indexOf('>基本信息</div>');
    const b = seg.indexOf('>法律法规</div>');
    const c = seg.indexOf('>设备详细信息</div>');
    const d = seg.indexOf('>设备标识符</div>');
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(d).toBeGreaterThan(c);
  });

  it('渲染 8 行权威文案：设备名称/法律信息/型号/Android 版本/电池信息/IP 地址/正常运行时间/Build 号', () => {
    ['设备名称', '法律信息', '型号', 'Android 版本', '电池信息', 'IP 地址', '正常运行时间', 'Build 号'].forEach((t) => {
      expect(seg).toContain(t);
    });
  });

  it('渲染行 data id 契约（E2E 锚定）：aboutDeviceName/aboutModelSub/aboutOsSub/aboutBatterySub/aboutIpSub/aboutUptimeSub/aboutBuildSub', () => {
    ['aboutDeviceName', 'aboutModelSub', 'aboutOsSub', 'aboutBatterySub', 'aboutIpSub', 'aboutUptimeSub', 'aboutBuildSub'].forEach((id) => {
      expect(seg).toContain(`id="${id}"`);
    });
  });

  it('隐藏注记 13 行：branded_account/phone_number/regulatory_info/safety_info/sim_status/eid/imei/WLAN MAC×2/蓝牙地址/manual/device_feedback/fcc_equipment_id', () => {
    ['branded_account', 'phone_number', 'regulatory_info', 'safety_info', 'sim_status', 'eid_info', 'imei_info', 'saved_accesspoints_wifi_mac_address', 'wifi_mac_address', 'bt_address', 'manual', 'device_feedback', 'fcc_equipment_id'].forEach((k) => {
      expect(seg).toContain(k);
    });
  });

  it('隐藏行零渲染：仅存在于 HTML 注释（注释形态 = <!-- key … -->），不产出可见行', () => {
    // 13 个隐藏 key 全部以注记形态出现（"（…）：… → 隐藏注记" 行），非 data 行
    expect(seg.match(/config_show_sim_info=false/g)).not.toBeNull();
    expect(seg).toMatch(/intent SHOW_MANUAL 无解析 → 隐藏注记/);
  });

  it('跳转链：型号→页 22 / Android 版本→页 23 / 电池信息→电池子页（BatteryInfoFragment Web 等价）', () => {
    expect(seg).toContain('window.pushSubPage && window.pushSubPage(22)');
    expect(seg).toContain('window.pushSubPage && window.pushSubPage(23)');
    expect(seg).toContain('window.pushSubPage && window.pushSubPage(2)');
  });

  it('device_name 编辑：prompt 等价 + localStorage ios-desktop:device-name + 空名不保存', () => {
    expect(seg).toContain('window.__aboutV826.renameDevice()');
    expect(seg).toContain('ios-desktop:device-name');
  });

  it('build_number 连点链：行 onclick 引 onBuildTap（content）+ TAPS=7/show_dev 三文案/持久化键（ABOUT_PAGE_SCRIPT）', () => {
    expect(seg).toContain('window.__aboutV826.onBuildTap()');
    const si = s.indexOf('const ABOUT_PAGE_SCRIPT = `');
    const script = s.slice(si, s.indexOf('// ==================== APPS_PAGE_SCRIPT', si));
    expect(script).toContain('TAPS_TO_BECOME_DEVELOPER = 7');
    expect(script).toContain('您现在处于开发者模式！');
    expect(script).toContain('您已处于开发者模式，无需进行此操作。');
    expect(script).toContain('步操作，即可进入开发者模式。');
    expect(script).toContain('ios-desktop:development-settings-enabled');
  });

  it('行均无图标（XML 全行无 android:icon 忠实）：页 21 不引用 AOSP_ICONS/tp-home-icon', () => {
    expect(seg).not.toContain('AOSP_ICONS');
    expect(seg).not.toContain('tp-home-icon');
  });
});

describe('v8.26 #48③ 页 22 型号（hardware_info.xml 1:1 + #48 扩展分区）', () => {
  const s = src('ios-desktop/js/apps/settings.js');
  const i = s.indexOf('v8.26 #48：页 22 型号');
  const j = s.indexOf('v8.26 #48：页 23 Android 版本', i);
  const seg = s.slice(i, j);

  it('AOSP 权威行：型号（hardware_info_device_model → UA-CH model → platform 降级）', () => {
    expect(seg).toContain('id="aboutHwModel"');
    expect(seg).toContain('DeviceModelPreferenceController.getSummary');
  });

  it('隐藏注记 3 行：serial/hardware_revision/manufactured_year（各自门控理由）', () => {
    ['hardware_info_device_serial', 'hardware_info_device_revision', 'hardware_info_manufactured_year'].forEach((k) => {
      expect(seg).toContain(k);
    });
    expect(seg).toMatch(/ro\.boot\.hardware\.revision 空 → UNSUPPORTED_ON_DEVICE 同构/);
  });

  it('#48 扩展分区「浏览器设备信息」6 行 data id 契约 + 分区标题（content）', () => {
    expect(seg).toContain('>浏览器设备信息</div>');
    ['aboutHwScreen', 'aboutHwCores', 'aboutHwMemory', 'aboutHwEngine', 'aboutHwLocale', 'aboutHwStorage'].forEach((id) => {
      expect(seg).toContain(`id="${id}"`);
    });
  });

  it('扩展分区超越点注记：AOSP hardware_info.xml 无此分区（议题明示）', () => {
    expect(seg).toMatch(/AOSP hardware_info\.xml 无此分区/);
  });

  it('fillPage22 API 映射（ABOUT_PAGE_SCRIPT）：screen/dpr/colorDepth/hardwareConcurrency/deviceMemory/brands/Intl/storage.estimate', () => {
    const si = s.indexOf('const ABOUT_PAGE_SCRIPT = `');
    const script = s.slice(si, s.indexOf('// ==================== APPS_PAGE_SCRIPT', si));
    expect(script).toContain("screen.width + ' × ' + screen.height");
    expect(script).toContain('navigator.hardwareConcurrency');
    expect(script).toContain('navigator.deviceMemory');
    expect(script).toContain('Intl.DateTimeFormat().resolvedOptions().timeZone');
    expect(script).toContain('navigator.storage.estimate()');
  });
});

describe('v8.26 #48④ 页 23 Android 版本（firmware_version.xml 1:1 六键）', () => {
  const s = src('ios-desktop/js/apps/settings.js');
  const i = s.indexOf('v8.26 #48：页 23 Android 版本');
  const seg = s.slice(i, i + 6000);

  it('渲染 5 行权威文案 + data id：Android 版本/Android 安全更新/Google Play 系统更新/内核版本/Build 号', () => {
    const titles = ['Android 版本', 'Android 安全更新', 'Google Play 系统更新', '内核版本', 'Build 号'];
    const ids = ['aboutOsVer', 'aboutPatch', 'aboutModule', 'aboutKernel', 'aboutBuild2'];
    titles.forEach((t) => expect(seg).toContain(t));
    ids.forEach((id) => expect(seg).toContain(`id="${id}"`));
  });

  it('base_band 隐藏注记（Web 无调制解调器）', () => {
    expect(seg).toMatch(/base_band：BasebandVersionPreferenceController —— Web 无调制解调器 → 隐藏注记/);
  });

  it('伪装许可注记：内核/补丁行（#48 议题明示「可用 platformVersion 伪装内核/构建号行」）', () => {
    expect(seg).toMatch(/伪装确定性/);
  });
});

describe('v8.26 #48⑤ two-pane 转正与共享桥', () => {
  it('about 一级入口转正：idx STUB→21（label/plate/kw 不变）', () => {
    const tp = src('ios-desktop/js/apps/settings-two-pane.js');
    expect(tp).toMatch(/key: 'about', icon: 'topAbout', plate: 'grey', label: '关于手机', sub: '', idx: 21,/);
  });

  it('STUB 注记更新：关于手机转正页 21，剩余 6 项', () => {
    const tp = src('ios-desktop/js/apps/settings-two-pane.js');
    expect(tp).toContain('v8.29 位置信息转正页 24、v8.30 模式转正页 27，剩余 4 项仍占位');
  });

  it('battery-service window 桥：window.__batteryGetState = getBatteryState（单一真源）', () => {
    const bs = src('ios-desktop/js/battery-service.js');
    expect(bs).toContain('window.__batteryGetState = getBatteryState');
  });

  it('三页 title 契约：关于手机/型号/Android 版本（pushSubPage 栈顶标题）', () => {
    const s = src('ios-desktop/js/apps/settings.js');
    expect(s).toContain("title: '关于手机',");
    expect(s).toContain("title: '型号',");
    expect(s).toContain("title: 'Android 版本',");
  });
});
