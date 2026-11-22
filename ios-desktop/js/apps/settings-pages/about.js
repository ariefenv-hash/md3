export const ABOUT_PAGE_SCRIPT=`
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var DEVICE_NAME_KEY = 'ios-desktop:device-name';
            var DEV_MODE_KEY = 'ios-desktop:development-settings-enabled';
            var TAPS_TO_BECOME_DEVELOPER = 7; // BuildNumberPreferenceController \u540C\u6784
            var tapCount = 0;
            var ipToken = 0;
            var lastU = null;
            function byId(id) { return document.getElementById(id); }
            function dHash(s) { return window.__settingsCore.dHash(s); }
            // UA-CH\uFF08Chrome 90+ \u542B 127\uFF09\u2192 platformVersion/model/fullVersionList\uFF1B\u7F3A\u5931 \u2192 UA \u89E3\u6790\u964D\u7EA7
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
            // platformVersion \u2192 Android \u7248\u672C\u8868\u8FF0\uFF08'15.0.0' \u2192 '15'\uFF09\uFF1B\u975E Android \u2192 \u5E73\u53F0\u540D\u771F\u5B9E\u56DE\u663E
            function osLabel(u) {
              var pv = (u.platformVersion || '').trim();
              if (/^[0-9]/.test(pv)) return pv.split('.')[0];
              if (u.platform) return u.platform;
              return '\u672A\u77E5';
            }
            // \u578B\u53F7\uFF1AUA-CH model\uFF08Android \u771F\u673A\u771F\u5B9E\u578B\u53F7\uFF09\u2192 platform \u964D\u7EA7 \u2192\u300C\u672A\u77E5\u300D
            function modelLabel(u) {
              if (u.model) return u.model;
              if (u.platform) return u.platform;
              return '\u672A\u77E5';
            }
            function engineLabel(u) {
              if (u.fullChrome) return 'Google Chrome ' + u.fullChrome;
              for (var i = 0; i < u.brands.length; i++) { if (/Google Chrome/i.test(u.brands[i].brand)) return 'Google Chrome ' + u.brands[i].version; }
              var m = /Chrome.([0-9.]+)/.exec(navigator.userAgent || '');
              return m ? 'Chromium ' + m[1] : '\u672A\u77E5';
            }
            function seedOf(u) {
              return u.platform + ':' + u.platformVersion + ':' + (u.model || '') + ':' + engineLabel(u);
            }
            // \u4F2A\u88C5 Build \u53F7\uFF1AAOSP 'XXXX.YYMMDD.NNN' \u683C\u5F0F\uFF08\u524D\u7F00\u6863 + hash \u6D3E\u751F\u65E5 + \u5E8F\u53F7\uFF09
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
            // \u4F2A\u88C5\u5B89\u5168\u8865\u4E01\u7EA7\u522B\uFF1A'YYYY-MM-DD'\uFF08SecurityPatchLevelPreferenceController \u503C\u683C\u5F0F\uFF09
            function fakePatch(seed) {
              var h = dHash('patch:' + seed);
              var p2 = function(n) { return (n < 10 ? '0' : '') + n; };
              var y = 2025 + (h % 2);
              var m = 1 + Math.floor(h / 2) % 12;
              var d = 1 + Math.floor(h / 24) % 28;
              return y + '-' + p2(m) + '-' + p2(d);
            }
            // \u4F2A\u88C5\u5185\u6838\u7248\u672C\uFF1AAOSP '5.15.NN-androidMAJ-N-gHEX12' \u683C\u5F0F
            function fakeKernel(u) {
              var maj = ((u.platformVersion || '').split('.')[0]) || '0';
              var seed = 'kernel:' + u.platform + ':' + u.platformVersion;
              var h = dHash(seed), h2 = dHash(seed + '#2');
              var hex = '0123456789abcdef', g = '';
              for (var i = 0; i < 12; i++) { g += hex[Math.abs((h2 >> (i % 28)) % 16)]; }
              return '5.15.' + (10 + h % 90) + '-android' + maj + '-' + (h2 % 9) + '-g' + g;
            }
            // \u672C\u673A IP\uFF1AWebRTC host candidate\uFF08\u65E0 STUN \u2192 \u4E0D\u5916\u4F20\uFF09\uFF1B\u73B0\u4EE3\u6D4F\u89C8\u5668 mDNS \u6DF7\u6DC6
            // \u2192 .local \u4E3B\u673A\u540D\u5373\u6D4F\u89C8\u5668\u771F\u5B9E\u8F93\u51FA\uFF1B\u8D85\u65F6/\u4E0D\u53EF\u7528 \u2192\u300C\u672A\u77E5\u300D
            function probeIp() {
              var el = byId('aboutIpSub');
              if (!el || !el.isConnected) return;
              if (typeof RTCPeerConnection === 'undefined') { el.textContent = '\u672A\u77E5'; return; }
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
              } catch (e) { finish('\u672A\u77E5'); return; }
              setTimeout(function() { finish('\u672A\u77E5'); }, 3000);
            }
            // \u7535\u6C60\u884C\uFF1Abattery-service \u5355\u4E00\u771F\u6E90\uFF08window \u6865\uFF09\u4F18\u5148\uFF0Cnavigator.getBattery \u515C\u5E95\uFF1B
            // \u6458\u8981 = v8.06 TopLevelBatteryPreferenceController.getDashboardLabel \u540C\u6784
            function refreshBatteryRow() {
              var el = byId('aboutBatterySub');
              if (!el || !el.isConnected) return;
              var st = window.__batteryGetState && window.__batteryGetState();
              if (st && typeof st.level === 'number') {
                el.textContent = st.charging ? st.level + '% - \u6B63\u5728\u5145\u7535' : st.level + '%';
                return;
              }
              if (navigator.getBattery) {
                navigator.getBattery().then(function(b) {
                  if (el.isConnected) el.textContent = b.charging ? Math.round(b.level * 100) + '% - \u6B63\u5728\u5145\u7535' : Math.round(b.level * 100) + '%';
                }).catch(function() { el.textContent = '\u672A\u77E5'; });
              } else { el.textContent = '\u672A\u77E5'; }
            }
            // \u6B63\u5E38\u8FD0\u884C\u65F6\u95F4\uFF1AformatElapsed zh \u8BED\u4E49\uFF1BWeb \u57DF\u6620\u5C04 = \u9875\u9762\u4F1A\u8BDD\u65F6\u957F\uFF08\u5F00\u673A\u65F6\u957F\u4E0D\u53EF\u5F97\uFF09
            // v11.50 #286 \u7EED\uFF1A\u53C2\u6570\u5316\u6838\u4E0A\u79FB\uFF08fmtUptime(ms)\uFF09\uFF0C\u5185\u8054 wrapper \u4F20 performance.now() \u7B49\u503C\u6362\u7B97
            function fmtUptime() {
              return window.__settingsCore.fmtUptime(performance.now());
            }
            function deviceNameDefault(u) {
              return u.model || u.platform || 'Web \u8BBE\u5907';
            }
            // device_name \u7F16\u8F91\uFF1ADeviceNamePreferenceController dialog \u8BED\u4E49 \u2192 prompt \u7B49\u4EF7\uFF1B
            // \u7A7A\u540D\u4E0D\u4FDD\u5B58\uFF08ValidatedEditTextPreference \u975E\u7A7A\u6821\u9A8C\u540C\u6784\uFF09
            function renameDevice() {
              var el = byId('aboutDeviceName');
              var cur = '';
              try { cur = localStorage.getItem(DEVICE_NAME_KEY) || ''; } catch (e) {}
              if (!cur && lastU) cur = deviceNameDefault(lastU);
              var next = window.prompt('\u91CD\u547D\u540D\u6B64\u8BBE\u5907', cur);
              if (next == null) return;
              next = String(next).replace(/^\\s+|\\s+$/g, '');
              if (!next) return;
              try { localStorage.setItem(DEVICE_NAME_KEY, next); } catch (e) {}
              if (el && el.isConnected) el.textContent = next;
            }
            // build_number \u8FDE\u70B9\u94FE\uFF08BuildNumberPreferenceController \u540C\u6784\uFF09\uFF1A
            // \u6BCF\u70B9 remaining \u9012\u51CF toast show_dev_countdown\uFF1B\u5F52\u96F6 toast show_dev_on \u5E76\u6301\u4E45\u5316
            // development_settings_enabled\uFF1B\u5DF2\u89E3\u9501\u6001\u70B9\u51FB toast show_dev_already
            function onBuildTap() {
              var enabled = false;
              try { enabled = localStorage.getItem(DEV_MODE_KEY) === '1'; } catch (e) {}
              if (enabled) { if (window.showSystemToast) window.showSystemToast('\u60A8\u5DF2\u5904\u4E8E\u5F00\u53D1\u8005\u6A21\u5F0F\uFF0C\u65E0\u9700\u8FDB\u884C\u6B64\u64CD\u4F5C\u3002'); return; }
              tapCount = (tapCount + 1) % TAPS_TO_BECOME_DEVELOPER;
              if (tapCount === 0) {
                try { localStorage.setItem(DEV_MODE_KEY, '1'); } catch (e) {}
                if (window.showSystemToast) window.showSystemToast('\u60A8\u73B0\u5728\u5904\u4E8E\u5F00\u53D1\u8005\u6A21\u5F0F\uFF01');
              } else {
                var remaining = TAPS_TO_BECOME_DEVELOPER - tapCount;
                if (window.showSystemToast) window.showSystemToast('\u73B0\u5728\u53EA\u9700\u518D\u6267\u884C ' + remaining + ' \u6B65\u64CD\u4F5C\uFF0C\u5373\u53EF\u8FDB\u5165\u5F00\u53D1\u8005\u6A21\u5F0F\u3002');
              }
            }
            function showLegal() {
              // legal_container\uFF08LegalSettings fragment\uFF09Web \u7B49\u4EF7\uFF1A\u672C\u5730\u65E0\u6587\u6863\u63D0\u793A
              if (window.showSystemToast) window.showSystemToast('\u672C\u5730\u672A\u5B58\u50A8\u6CD5\u5F8B\u6587\u6863');
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
              if (el) el.textContent = screen.width + ' \xD7 ' + screen.height + ' \xB7 dpr ' + (window.devicePixelRatio || 1) + ' \xB7 \u8272\u6DF1 ' + (screen.colorDepth || 0) + ' \u4F4D';
              el = byId('aboutHwCores');
              if (el) el.textContent = navigator.hardwareConcurrency ? navigator.hardwareConcurrency + ' \u6838' : '\u672A\u77E5';
              el = byId('aboutHwMemory');
              if (el) el.textContent = navigator.deviceMemory ? '\u2265 ' + navigator.deviceMemory + ' GB\uFF08\u8FD1\u4F3C\u6863\u4F4D\uFF09' : '\u672A\u77E5';
              el = byId('aboutHwEngine');
              if (el) el.textContent = engineLabel(u);
              el = byId('aboutHwLocale');
              if (el) {
                var tz = '';
                try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
                el.textContent = (navigator.language || '\u672A\u77E5') + (tz ? ' \xB7 ' + tz : '');
              }
              el = byId('aboutHwStorage');
              if (el) {
                if (navigator.storage && navigator.storage.estimate) {
                  navigator.storage.estimate().then(function(est) {
                    if (!el.isConnected) return;
                    var usage = (est.usage || 0) / 1073741824;
                    var quota = (est.quota || 0) / 1073741824;
                    el.textContent = '\u5DF2\u7528 ' + usage.toFixed(2) + ' GB \xB7 \u914D\u989D ' + quota.toFixed(1) + ' GB';
                  }).catch(function() { el.textContent = '\u672A\u77E5'; });
                } else { el.textContent = '\u672A\u77E5'; }
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
            // \u5E42\u7B49\u5B88\u536B\uFF1A\u672C script \u5728\u9875 21/22/23 \u5404\u5185\u5D4C\u4E00\u6B21\uFF0C\u91CD\u590D\u6267\u884C\u4EC5\u8865\u5237\u65B0
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
