// ==================== permission-refresh.test.js — #217 授权后天气不切换当前地址 ====================
//
// 背景：#217「位置权限授权后天气仍不切换当前地址」（复测立项）。根因三面（无头链路实证）：
//   ① manual 锁阻断：v7.74「手动选城锁定」同时挡住周期性静默重定位与打开时校准 ——
//      用户手动选城后又授予位置权限，天气永远停在旧城市（用户视角「授权后不切换」）；
//   ② 授权完成零联动：permissions.js applyGroupChoice 落权后无应用侧可感知通道
//      （REQUEST_PERMISSION 只覆盖「应用主动询问」路径，权限中心改授权无事件桥）；
//   ③ 两层权限混淆：桌面层（permissions.js store）与浏览器层（navigator.geolocation）
//      是两套授权体系，浏览器层拒绝时 UI 与超时混同静默降级，用户无从得知。
//
// 修复（#217 交付面）：
//   A. permissions.js 新增 REQUEST_PERMISSION_STATE 只读查询桥（零对话框，五态透传）；
//   B. main.js __system.getPermissionState 查询封装（1200ms 兜底 → null 不可判定）；
//   C. weather probeAuthorizedRelocate：manual + 已授权 → 单次授权校准（forceGps 放行
//      manual 锁一次；denied/unset/default/null 零打扰跳过）；
//   D. getCurrentPosition 错误分型：PERMISSION_DENIED(1) 明示浏览器层权限被拒（诚实化）。
//
// 纪律：weather/permissions/main 的源码字符串断言为仓库惯例（v181-batch2/v240 同模式）；
// #178 孤岛判据：只读查询桥为共享数据源通道，不合并 UI。#18 §7.3：改实现前先跑单测。
//
// 关联 #217 #127 #195 #182 #178 #18 §5/§9/§7.3。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');
const PERM = read('ios-desktop/js/permissions.js');
const MAIN = read('ios-desktop/js/main.js');
const WEATHER = read('ios-desktop/apps/weather/index.html');

// ==================== A. permissions.js 只读查询桥 ====================

describe('A. permissions.js REQUEST_PERMISSION_STATE 只读桥（#217 修复 A）', () => {
  test('A1 消息类型过滤纳入 REQUEST_PERMISSION_STATE', () => {
    expect(PERM).toContain("d.type !== 'REQUEST_PERMISSION_STATE'");
  });

  test('A2 PERMISSION_STATE_RESULT 回执 + getPermissionState 消费在案', () => {
    expect(PERM).toContain("type: 'PERMISSION_STATE_RESULT'");
    expect(PERM).toMatch(/REQUEST_PERMISSION_STATE'[\s\S]{0,600}?getPermissionState\(appId, d\.permission\)/);
  });

  test('A3 只读语义锚：查询桥零对话框（与 REQUEST_PERMISSION 询问语义分离的注释在案）', () => {
    expect(PERM).toMatch(/#217：权限态只读查询桥[\s\S]{0,500}?零对话框弹出/);
  });

  test('A4 既有询问协议零变化（PERMISSION_ACK / PERMISSION_RESULT 回执保留）', () => {
    expect(PERM).toContain("{ type: 'PERMISSION_ACK', requestId: d.requestId }");
    expect(PERM).toContain("{ type: 'PERMISSION_RESULT', requestId: d.requestId, granted }");
  });
});

// ==================== B. main.js __system.getPermissionState 封装 ====================

describe('B. main.js __system.getPermissionState（#217 修复 B）', () => {
  test('B1 查询封装 + 消息对在案', () => {
    expect(MAIN).toContain('getPermissionState: function(name)');
    expect(MAIN).toContain("{ type: 'REQUEST_PERMISSION_STATE', requestId: rid, permission: name }");
    expect(MAIN).toContain("d.type !== 'PERMISSION_STATE_RESULT'");
  });

  test('B2 兜底语义：1200ms 超时 → null（旧桌面/独立打开按不可判定零打扰）', () => {
    expect(MAIN).toMatch(/getPermissionState: function\(name\)[\s\S]{0,1200}setTimeout\(function\(\) \{ done\(null\); \}, 1200\)/);
  });

  test('B3 requestPermission 既有询问封装零变化（ACK 兜底放行语义保留）', () => {
    expect(MAIN).toMatch(/requestPermission: function\(name\)[\s\S]{0,1200}if \(!acknowledged\) done\(true\); \}, 1200\)/);
  });
});

// ==================== C. weather probeAuthorizedRelocate 授权校准 ====================

describe('C. weather 授权态探测校准（#217 修复 C · 主行为面）', () => {
  test('C1 probeAuthorizedRelocate 函数在案 + granted 三态映射', () => {
    expect(WEATHER).toContain('async function probeAuthorizedRelocate()');
    expect(WEATHER).toContain("state === 'granted' || state === 'granted_one_time' || state === 'granted_selected'");
  });

  test('C2 granted → forceGps 单次校准；denied/unset/default/null 零打扰跳过', () => {
    expect(WEATHER).toMatch(/granted_selected'\) \{[\s\S]{0,200}detectPreciseLocation\(\{ silent: true, forceGps: true \}\);/);
    expect(WEATHER).toMatch(/denied \/ unset \/ default \/ null：零打扰/);
  });

  test('C3 forceGps 语义：manual 锁放行仅限授权探测单次（周期性静默重定位仍被锁）', () => {
    expect(WEATHER).toMatch(/opts\.forceGps —— 授权态驱动的单次校准放行 manual 锁/);
    expect(WEATHER).toContain("if (currentLoc.src === 'manual' && !forceGps) return;");
    // 负向锚：v7.74 打扰语义回归保护 —— 非 silent 分支不得引入 forceGps 旁路
    expect(WEATHER).toMatch(/const forceGps = !!\(opts && opts\.forceGps\);/);
  });

  test('C4 init：manual 锁城市调度授权探测（1500ms 延迟，非 manual 走既有 silent 校准）', () => {
    expect(WEATHER).toContain("if (currentLoc.src !== 'manual') scheduleSilentRelocate();");
    expect(WEATHER).toContain('else setTimeout(probeAuthorizedRelocate, 1500);');
  });

  test('C5 探针前置守卫：__system.getPermissionState 不可用（旧桌面）→ 静默返回零变化', () => {
    expect(WEATHER).toMatch(/probeAuthorizedRelocate\(\) \{[\s\S]{0,400}typeof window\.__system\.getPermissionState !== 'function'[\s\S]{0,100}return;/);
  });

  test('C6 单次性锚：__probeDone 防重入（多实例/重复初始化零重复校准）', () => {
    expect(WEATHER).toMatch(/let __probeDone = false;[\s\S]{0,200}if \(__probeDone\) return;/);
  });
});

// ==================== D. 浏览器层权限拒绝分型（两层权限诚实化） ====================

describe('D. getCurrentPosition 错误分型（#217 修复 D）', () => {
  test('D1 PERMISSION_DENIED(1) 明示两层语义，不与超时混同', () => {
    expect(WEATHER).toMatch(/e\.code === 1/);
    expect(WEATHER).toContain('浏览器层定位权限被拒（系统已授权）');
    expect(WEATHER).toContain('桌面层授权（permissions.js store）与浏览器层授权（navigator.geolocation）');
  });

  test('D2 超时路径语义保留（GPS Timeout 8s 兜底在案）', () => {
    expect(WEATHER).toMatch(/reject\(\{ code: 3, msg: 'GPS Timeout' \}\), 8000\)/);
  });
});

// ==================== E. 数据源与缓存 key 实证锚（#217 怀疑方向 3/4 对账） ====================

describe('E. 数据源对账（#217 正文怀疑方向实证）', () => {
  test('E1 缓存 key 方向实证：loadHighPrecisionWeather 直 fetch 无城市缓存（URL 随 lat/lon 变化）', () => {
    // 正文怀疑「缓存 key 未随城市失效」——实证：weather 数据请求 URL 以 lat/lon 为参数直发，
    // 无 localStorage/内存缓存层，城市切换即换参零失效问题
    expect(WEATHER).toMatch(/loadHighPrecisionWeather\(lat, lon, resolvedName\)/);
    expect(WEATHER).toMatch(/const weatherUrl = `https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=\$\{lat\}&longitude=\$\{lon\}/);
  });

  test('E2 地理定位结果持久化随定位写入（LOC_KEY src=gps 覆盖语义在案）', () => {
    expect(WEATHER).toMatch(/currentLoc = \{ name: resolvedName, lat, lon, src: 'gps' \};[\s\S]{0,100}saveLoc\('gps'\)/);
  });
});
