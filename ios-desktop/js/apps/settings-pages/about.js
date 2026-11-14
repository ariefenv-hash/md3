// ==================== settings-pages/about.js — 页 21 关于手机 / 页 22 型号 / 页 23 Android 版本（ABOUT_PAGE_SCRIPT 单源真身 · #284 批 14） ====================
//
// #284 批 14（v11.30 · §7.5 加餐卷三）：ABOUT_PAGE_SCRIPT 常量自 settings.js 整体搬迁至此
// ——boundary-map §3.1 候选表顺位（v8.26 #48 关于手机三页 my_device_info/hardware_info/
// firmware_version.xml 1:1，簇块 307 行 = 头注考证链 47 行 + const 1 + 模板串 257 + 闭合 1，
// 批 13 DALTONIZER 簇后余两簇现存块首位）。G2 单源桥接禁双轨：本文件 = 常量唯一真源
// （export），settings.js 经 import 消费同一份；负向锚守护 = tests/about-device.test.js
// 「G2 单源桥接」组（settings.js 本体零 const ABOUT_PAGE_SCRIPT 残留，批 2-13 互指纪律同款）。
// 运行语义零漂移：settingsApp 页注册表 `<script>` + ABOUT_PAGE_SCRIPT + `</script>`
// 拼接面逐字节不变（消费点 = settings.js 页 21/22/23 content 尾段原位）；簇模板串零 `${`
// 插值（boundary-map §3.1 拆分风险注记核查：ABOUT 簇自包含 IIFE，桥接全走 window.* 宿主
// 面；**簇体含 2 处 window.__settingsCore. 委托（dHash/fmtUptime，批 9 DISPLAY 同款）——
// v286 C2 读取面 +ABOUT_PAGE_SRC 四源合计守恒（settings.js+notif.js+display.js+about.js）**；
// 零 __mdEscape( 委托）。测试面实证：about-device.test.js describe① seg 切源改读本文件
// 全文件（宿主面 describe②③④⑤ 切片锚 v8.26 #48 关于手机三页/页 22/页 23 在 settingsApp
// 模板面零触碰）；随迁面 = describe① 切源 + C2 四源守恒 + G2 四锚尾挂（批 6/9 范式）。
// ABOUT 簇零 rbc-DEFAULTS（F5 计数不受影响，现树复核 0 命中）。
// issue #48 浏览器 API 设备信息填充：全部采集仅在本机进行、不外传（议题隐私要求）；
//   WebRTC 探测不带 STUN/TURN（iceServers 空数组 → 无外部候选收集器）。
// AOSP 权威清单（aosp-mirror/platform_packages_apps_settings main 实源，非记忆）：
//   页 21 = res/xml/my_device_info.xml（my_device_info_pref_screen，四分区 20 键，行均无
//     android:icon → 忠实纯文本行）：
//     ① basic_info_category「基本信息」：device_name(1, ValidatedEditTextPreference +
//       DeviceNamePreferenceController → prompt 编辑等价，localStorage 持久化)/
//       branded_account(2, BrandedAccountPreferenceController：非 branded device → 隐藏)/
//       phone_number(3, config_show_sim_info=false → 隐藏，Web 无 SIM 栈)
//     ② legal_category「法律法规」：legal_container(15, LegalSettings fragment → Web 等价
//       toast「本地未存储法律文档」)/ regulatory_info(16, intent SHOW_REGULATORY_INFO 无解析
//       → 隐藏)/ safety_info(17, 无内容源 → 隐藏)
//     ③ device_detail_category「设备详细信息」：sim_status(18)/eid(31)/imei(32) 全 SIM 门控隐藏；
//       device_model(30, model_info「型号」，fragment=HardwareInfoFragment → 页 22)/
//       firmware_version(42, FirmwareVersionSettings → 页 23)/
//       battery_info(43, BatteryInfoFragment → Web 等价=电池子页页 2)
//     ④ device_identifiers_category「设备标识符」：wifi_ip_address(44, WebRTC host candidate
//       + mDNS/.local 降级 + device_info_default「未知」)/ saved_accesspoints_wifi_mac_address(45)/
//       wifi_mac_address(46)/bt_address(47)（Web 无 MAC 栈 → 隐藏）/ up_time(48, formatElapsed
//       zh 语义「X 小时 Y 分钟」，Web 映射=页面会话时长 performance.now，开机时长不可得注记)/
//       manual(50, intent SHOW_MANUAL 无解析 → 隐藏)/ device_feedback(51, 无反馈通道 → 隐藏)/
//       fcc_equipment_id(52, 无 FCC 标识 → 隐藏)/ build_number(53, BuildNumberPreferenceController
//       连点链 TAPS_TO_BECOME_DEVELOPER=7 → 开发者模式，show_dev_countdown/show_dev_on/
//       show_dev_already zh-rCN 权威文案同构)
//   页 22 = res/xml/hardware_info.xml（标题 model_info「型号」，4 行）：
//     hardware_info_device_model（DeviceModelPreferenceController.getSummary=getDeviceModel →
//       Web=UA-CH model → platform 降级）/ hardware_info_device_serial（config_show_device_model
//       门控 + Build.getSerial 无 Web API → 隐藏）/ hardware_info_device_revision
//       （ro.boot.hardware.revision 空 → UNSUPPORTED_ON_DEVICE 同构 → 隐藏）/
//       hardware_info_manufactured_year（→ 隐藏）
//     +「浏览器设备信息」扩展分区（#48 议题明示超越点，AOSP 无此分区注记保留）：
//       屏幕(screen×dpr×colorDepth)/处理器核心(hardwareConcurrency)/内存(deviceMemory 近似档位)/
//       浏览器与渲染引擎(UA-CH brands)/语言与时区(navigator.language + Intl timeZone)/
//       存储(storage.estimate usage/quota)
//   页 23 = res/xml/firmware_version.xml（1:1 六键）：
//     os_firmware_version「Android 版本」/ security_key「Android 安全更新」/
//     module_version「Google Play 系统更新」（Web=fullVersionList Chrome 完整版真实值）/
//     base_band「基带版本」（Web 无调制解调器 → 隐藏）/ kernel_version「内核版本」/
//     os_build_number「Build 号」
// 伪装链（#48 议题明示许可「可用 platformVersion 伪装内核/构建号行」）：确定性派生
//   （dHash djb2 变体；同一设备数据恒生成同一伪装值，E2E 双次刷新一致性断言锚定）：
//   fakeBuildId 'XXXX.YYMMDD.NNN'（AOSP BuildID 格式）/ fakePatch 'YYYY-MM-DD'（补丁级别格式）/
//   fakeKernel '5.15.NN-androidMAJ-N-gHEX12'（AOSP 内核版本格式）
// 优雅降级（议题验收）：userAgentData 缺失 → UA 解析；getHighEntropyValues 缺失 → 浅层字段；
//   各 API 不可用 → device_info_default「未知」（zh-rCN 权威回退值）
// 幂等：window.__aboutV826 守卫 —— 三个页面 content 各内嵌一次本 script，仅首次安装
//   定时器/监听（renderPageStack 重复 innerHTML 不重复 setInterval）

export const ABOUT_PAGE_SCRIPT = `
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var DEVICE_NAME_KEY = 'ios-desktop:device-name';
            var DEV_MODE_KEY = 'ios-desktop:development-settings-enabled';
            var TAPS_TO_BECOME_DEVELOPER = 7; // BuildNumberPreferenceController 同构
            var tapCount = 0;
            var ipToken = 0;
            var lastU = null;
            function byId(id) { return document.getElementById(id); }
            function dHash(s) { return window.__settingsCore.dHash(s); }
            // UA-CH（Chrome 90+ 含 127）→ platformVersion/model/fullVersionList；缺失 → UA 解析降级
            function uaInfo(cb) {
              var u = { platform: '', platformVersion: '', model: '', mobile: false, brands: [], fullChrome: '' };
              var uad = navigator.userAgentData;
              if (uad && uad.getHighEntropyValues) {
                u.platform = uad.platform || '';
                u.mobile = !!uad.mobile;
                u.brands = (uad.brands || []).slice();
                uad.getHighEntropyValues(['platformVersion', 'model', 'fullVersionList']).then(function(hv) {
                  u.platformVersion = hv.platformVersion || '';
                  u.model = hv.model || '';
                  var fl = hv.fullVersionList || [];
                  for (var i = 0; i < fl.length; i++) { if (/Google Chrome/i.test(fl[i].brand)) u.fullChrome = fl[i].version; }
                  cb(u);
                }).catch(function() { cb(u); });
                return;
              }
              var ua = navigator.userAgent || '';
              var ma = /Android ([0-9.]+)/.exec(ua);
              var mc = /Chrome.([0-9.]+)/.exec(ua);
              u.platform = /Android/.test(ua) ? 'Android' : (navigator.platform || '');
              u.platformVersion = ma ? ma[1] : '';
              if (mc) { u.brands = [{ brand: 'Google Chrome', version: mc[1].split('.')[0] }]; u.fullChrome = mc[1]; }
              cb(u);
            }
            // platformVersion → Android 版本表述（'15.0.0' → '15'）；非 Android → 平台名真实回显
            function osLabel(u) {
              var pv = (u.platformVersion || '').trim();
              if (/^[0-9]/.test(pv)) return pv.split('.')[0];
              if (u.platform) return u.platform;
              return '未知';
            }
            // 型号：UA-CH model（Android 真机真实型号）→ platform 降级 →「未知」
            function modelLabel(u) {
              if (u.model) return u.model;
              if (u.platform) return u.platform;
              return '未知';
            }
            function engineLabel(u) {
              if (u.fullChrome) return 'Google Chrome ' + u.fullChrome;
              for (var i = 0; i < u.brands.length; i++) { if (/Google Chrome/i.test(u.brands[i].brand)) return 'Google Chrome ' + u.brands[i].version; }
              var m = /Chrome.([0-9.]+)/.exec(navigator.userAgent || '');
              return m ? 'Chromium ' + m[1] : '未知';
            }
            function seedOf(u) {
              return u.platform + ':' + u.platformVersion + ':' + (u.model || '') + ':' + engineLabel(u);
            }
            // 伪装 Build 号：AOSP 'XXXX.YYMMDD.NNN' 格式（前缀档 + hash 派生日 + 序号）
            function fakeBuildId(seed) {
              var h = dHash(seed);
              var p2 = function(n) { return (n < 10 ? '0' : '') + n; };
              var pre = ['AP3A', 'AP4A', 'BP3A', 'BP4A'][h % 4];
              var yy = 25 + (h % 2);
              var mm = 1 + Math.floor(h / 2) % 12;
              var dd = 1 + Math.floor(h / 24) % 28;
              var num = 10 + Math.floor(h / 672) % 990;
              return pre + '.' + yy + p2(mm) + p2(dd) + '.' + num;
            }
            // 伪装安全补丁级别：'YYYY-MM-DD'（SecurityPatchLevelPreferenceController 值格式）
            function fakePatch(seed) {
              var h = dHash('patch:' + seed);
              var p2 = function(n) { return (n < 10 ? '0' : '') + n; };
              var y = 2025 + (h % 2);
              var m = 1 + Math.floor(h / 2) % 12;
              var d = 1 + Math.floor(h / 24) % 28;
              return y + '-' + p2(m) + '-' + p2(d);
            }
            // 伪装内核版本：AOSP '5.15.NN-androidMAJ-N-gHEX12' 格式
            function fakeKernel(u) {
              var maj = ((u.platformVersion || '').split('.')[0]) || '0';
              var seed = 'kernel:' + u.platform + ':' + u.platformVersion;
              var h = dHash(seed), h2 = dHash(seed + '#2');
              var hex = '0123456789abcdef', g = '';
              for (var i = 0; i < 12; i++) { g += hex[Math.abs((h2 >> (i % 28)) % 16)]; }
              return '5.15.' + (10 + h % 90) + '-android' + maj + '-' + (h2 % 9) + '-g' + g;
            }
            // 本机 IP：WebRTC host candidate（无 STUN → 不外传）；现代浏览器 mDNS 混淆
            // → .local 主机名即浏览器真实输出；超时/不可用 →「未知」
            function probeIp() {
              var el = byId('aboutIpSub');
              if (!el || !el.isConnected) return;
              if (typeof RTCPeerConnection === 'undefined') { el.textContent = '未知'; return; }
              var tok = ++ipToken;
              var pc = null, done = false;
              var finish = function(v) {
                if (done || tok !== ipToken) return;
                done = true;
                try { if (pc) pc.close(); } catch (e) {}
                if (el.isConnected) el.textContent = v;
              };
              try {
                pc = new RTCPeerConnection({ iceServers: [] });
                pc.createDataChannel('about-probe');
                pc.onicecandidate = function(e) {
                  if (done) return;
                  var c = (e.candidate && e.candidate.candidate) || '';
                  if (c.indexOf(' typ host') === -1 && c.indexOf('typ host') === -1) return;
                  var parts = c.split(' ');
                  if (parts.length > 4 && parts[4]) finish(parts[4]);
                };
                pc.createOffer().then(function(o) { return pc.setLocalDescription(o); }).catch(function() {});
              } catch (e) { finish('未知'); return; }
              setTimeout(function() { finish('未知'); }, 3000);
            }
            // 电池行：battery-service 单一真源（window 桥）优先，navigator.getBattery 兜底；
            // 摘要 = v8.06 TopLevelBatteryPreferenceController.getDashboardLabel 同构
            function refreshBatteryRow() {
              var el = byId('aboutBatterySub');
              if (!el || !el.isConnected) return;
              var st = window.__batteryGetState && window.__batteryGetState();
              if (st && typeof st.level === 'number') {
                el.textContent = st.charging ? st.level + '% - 正在充电' : st.level + '%';
                return;
              }
              if (navigator.getBattery) {
                navigator.getBattery().then(function(b) {
                  if (el.isConnected) el.textContent = b.charging ? Math.round(b.level * 100) + '% - 正在充电' : Math.round(b.level * 100) + '%';
                }).catch(function() { el.textContent = '未知'; });
              } else { el.textContent = '未知'; }
            }
            // 正常运行时间：formatElapsed zh 语义；Web 域映射 = 页面会话时长（开机时长不可得）
            // v11.30 #286 续：参数化核上移（fmtUptime(ms)），内联 wrapper 传 performance.now() 等值换算
            function fmtUptime() {
              return window.__settingsCore.fmtUptime(performance.now());
            }
            function deviceNameDefault(u) {
              return u.model || u.platform || 'Web 设备';
            }
            // device_name 编辑：DeviceNamePreferenceController dialog 语义 → prompt 等价；
            // 空名不保存（ValidatedEditTextPreference 非空校验同构）
            function renameDevice() {
              var el = byId('aboutDeviceName');
              var cur = '';
              try { cur = localStorage.getItem(DEVICE_NAME_KEY) || ''; } catch (e) {}
              if (!cur && lastU) cur = deviceNameDefault(lastU);
              var next = window.prompt('重命名此设备', cur);
              if (next == null) return;
              next = String(next).replace(/^\\s+|\\s+$/g, '');
              if (!next) return;
              try { localStorage.setItem(DEVICE_NAME_KEY, next); } catch (e) {}
              if (el && el.isConnected) el.textContent = next;
            }
            // build_number 连点链（BuildNumberPreferenceController 同构）：
            // 每点 remaining 递减 toast show_dev_countdown；归零 toast show_dev_on 并持久化
            // development_settings_enabled；已解锁态点击 toast show_dev_already
            function onBuildTap() {
              var enabled = false;
              try { enabled = localStorage.getItem(DEV_MODE_KEY) === '1'; } catch (e) {}
              if (enabled) { if (window.showSystemToast) window.showSystemToast('您已处于开发者模式，无需进行此操作。'); return; }
              tapCount = (tapCount + 1) % TAPS_TO_BECOME_DEVELOPER;
              if (tapCount === 0) {
                try { localStorage.setItem(DEV_MODE_KEY, '1'); } catch (e) {}
                if (window.showSystemToast) window.showSystemToast('您现在处于开发者模式！');
              } else {
                var remaining = TAPS_TO_BECOME_DEVELOPER - tapCount;
                if (window.showSystemToast) window.showSystemToast('现在只需再执行 ' + remaining + ' 步操作，即可进入开发者模式。');
              }
            }
            function showLegal() {
              // legal_container（LegalSettings fragment）Web 等价：本地无文档提示
              if (window.showSystemToast) window.showSystemToast('本地未存储法律文档');
            }
            function fillPage21(u) {
              var el;
              var name = '';
              try { name = localStorage.getItem(DEVICE_NAME_KEY) || ''; } catch (e) {}
              el = byId('aboutDeviceName');
              if (el) el.textContent = name || deviceNameDefault(u);
              el = byId('aboutModelSub');
              if (el) el.textContent = modelLabel(u);
              el = byId('aboutOsSub');
              if (el) el.textContent = osLabel(u);
              el = byId('aboutBuildSub');
              if (el) el.textContent = fakeBuildId(seedOf(u));
              el = byId('aboutUptimeSub');
              if (el) el.textContent = fmtUptime();
              probeIp();
              refreshBatteryRow();
            }
            function fillPage22(u) {
              var el;
              el = byId('aboutHwModel');
              if (el) el.textContent = modelLabel(u);
              el = byId('aboutHwScreen');
              if (el) el.textContent = screen.width + ' × ' + screen.height + ' · dpr ' + (window.devicePixelRatio || 1) + ' · 色深 ' + (screen.colorDepth || 0) + ' 位';
              el = byId('aboutHwCores');
              if (el) el.textContent = navigator.hardwareConcurrency ? navigator.hardwareConcurrency + ' 核' : '未知';
              el = byId('aboutHwMemory');
              if (el) el.textContent = navigator.deviceMemory ? '≥ ' + navigator.deviceMemory + ' GB（近似档位）' : '未知';
              el = byId('aboutHwEngine');
              if (el) el.textContent = engineLabel(u);
              el = byId('aboutHwLocale');
              if (el) {
                var tz = '';
                try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
                el.textContent = (navigator.language || '未知') + (tz ? ' · ' + tz : '');
              }
              el = byId('aboutHwStorage');
              if (el) {
                if (navigator.storage && navigator.storage.estimate) {
                  navigator.storage.estimate().then(function(est) {
                    if (!el.isConnected) return;
                    var usage = (est.usage || 0) / 1073741824;
                    var quota = (est.quota || 0) / 1073741824;
                    el.textContent = '已用 ' + usage.toFixed(2) + ' GB · 配额 ' + quota.toFixed(1) + ' GB';
                  }).catch(function() { el.textContent = '未知'; });
                } else { el.textContent = '未知'; }
              }
            }
            function fillPage23(u) {
              var el;
              el = byId('aboutOsVer');
              if (el) el.textContent = osLabel(u);
              el = byId('aboutPatch');
              if (el) el.textContent = fakePatch(seedOf(u));
              el = byId('aboutModule');
              if (el) el.textContent = engineLabel(u);
              el = byId('aboutKernel');
              if (el) el.textContent = fakeKernel(u);
              el = byId('aboutBuild2');
              if (el) el.textContent = fakeBuildId(seedOf(u));
            }
            function refresh() {
              uaInfo(function(u) {
                lastU = u;
                fillPage21(u);
                fillPage22(u);
                fillPage23(u);
              });
            }
            // 幂等守卫：本 script 在页 21/22/23 各内嵌一次，重复执行仅补刷新
            if (typeof window !== 'undefined' && window.__aboutV826) {
              window.__aboutV826.refresh();
              return;
            }
            window.__aboutV826 = { refresh: refresh, renameDevice: renameDevice, onBuildTap: onBuildTap, showLegal: showLegal, probeIp: probeIp };
            refresh();
            setInterval(function() {
              var el = byId('aboutUptimeSub');
              if (el && el.isConnected && lastU) el.textContent = fmtUptime();
              probeIp();
              refreshBatteryRow();
            }, 30000);
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && (e.detail.pageIdx === 21 || e.detail.pageIdx === 22 || e.detail.pageIdx === 23)) { refresh(); }
            });
          })();
        `;
