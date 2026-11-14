// ==================== settings-pages/a11y.js — 页 20 无障碍（A11Y_PAGE_SCRIPT 单源真身 · #284 批 10） ====================
//
// #284 批 10（v11.29 · §7.5 加餐卷二）：A11Y_PAGE_SCRIPT 常量自 settings.js 整体搬迁至此——
// boundary-map §3.1 候选表顺位（R159 续点候选首位；页 20 无障碍 v8.02 #10 五期
// accessibility.xml 1:1，簇块 82 行 = 头注考证链 9 行 + 模板串 71 行+空行 2，批 9 DISPLAY
// 簇后余六簇现存块首位）。G2 单源桥接禁双轨：本文件 = 常量唯一真源（export），settings.js
// 经 import 消费同一份；负向锚守护 = tests/accessibility-subpage.test.js「G2 单源桥接」组
// （settings.js 本体零 const A11Y_PAGE_SCRIPT 残留，批 2-9 互指纪律同款）。
// 运行语义零漂移：settingsApp 页注册表 `<script>` + A11Y_PAGE_SCRIPT + `</script>`
// 拼接面逐字节不变（消费点 = settings.js 页 20 content 尾段原位）；簇模板串零 `${` 插值
// （boundary-map §3.1 拆分风险注记核查：A11Y 簇自包含 IIFE，桥接全走 window.* 宿主面，
// 迁移零委托行；簇体零 window.__settingsCore. / window.__mdEscape( 委托——A2/A3 壳层
// 基线与 v286 C2 读取面计数零触碰，比批 8 SOUND 簇更干净）。测试面实证：全库测试
// 零簇体独占串引用（accessibility-subpage/a11y-settings 断言面全在宿主），随迁面=
// G2 四锚尾挂（批 2-9 范式最小随迁卷）。超越点注记（极暗 CSS filter html×body 分层
// 合成）随考证链逐字在次。
// v8.02 #10 五期：无障碍子页（页 20）内联脚本 —— 提为模块级常量便于单测文本守护（v8.01 惯例）。
// 单一真源 window.__settingsA11yStore（localStorage settings:accessibility-v1，
// 默认值 = AOSP 默认：REDUCE_BRIGHT_COLORS_ACTIVATED=0（关）、toggle_audio_description
// persistent=false 默认关）。
// 超越点（#22 注记「色彩反转/减少亮色可用 CSS filter 真实现」）：极暗（reduce_bright_colors）
// 开关以 CSS filter 真实现 —— 作用于 documentElement（html 层），与快捷设置亮度滑条
// body.filter（quick-settings.js 全库唯一既有消费链）分层乘法合成：html brightness ×
// body brightness = 在当前亮度之下额外压暗，正是 AOSP「将设备屏幕调得比通常更暗」语义；
// 强度取 RBC 滑条默认 50% → brightness(0.5)。activated 态持久化（Secure 表语义），重载恢复。

export const A11Y_PAGE_SCRIPT = `
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
            var STORE_KEY = 'settings:accessibility-v1';
            // v11.29 #105：DEFAULTS 扩展（键序与 ios-desktop/js/aosp/a11y-settings.js
            // A11Y_STORE_DEFAULTS 单一真源对齐——文本守护测试对账漂移即红）
            var DEFAULTS = { rbc: false, audioDescription: false, removeAnimations: false, colorInversion: false, daltonizerEnabled: false, daltonizerMode: 12, daltonizerSaturation: 7, fontScale: 100, displayScale: 100, boldText: false, highContrastText: false };
            function load() {
              var s = {};
              try {
                var v = JSON.parse(localStorage.getItem(STORE_KEY));
                if (v && typeof v === 'object') { for (var k in DEFAULTS) { if (k in v) s[k] = v[k]; } }
              } catch (e) {}
              var out = {};
              for (var k2 in DEFAULTS) out[k2] = (k2 in s) ? s[k2] : DEFAULTS[k2];
              return out;
            }
            function save(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }
            if (typeof window !== 'undefined' && !window.__settingsA11yStore) {
              window.__settingsA11yStore = { load: load, save: save, DEFAULTS: DEFAULTS };
            }
            // 超越点：极暗 CSS filter 真实现（html 层独立于 body.filter 亮度链，乘法合成）。
            // v11.29 #105：html.style.filter 收口单写点——RBC/色彩校正/颜色反转经
            // a11y-apply.js applyA11yRuntime 合成链统一写（散写点互踩退役）；
            // a11y-apply 缺席时保留 v8.02 直写降级路径（页脚本独立可活）。
            function applyRbc(on) {
              var el = document.documentElement;
              if (window.__a11yApplyRuntime) { window.__a11yApplyRuntime(window.__settingsA11yStore ? window.__settingsA11yStore.load() : { rbc: !!on }); return; }
              el.style.transition = 'filter .25s ease';
              el.style.filter = on ? 'brightness(0.5)' : '';
            }
            function setSw(id, on) { var sw = document.getElementById(id); (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(sw, on); }
            function refresh() {
              var s = load();
              setSw('a11yRbcToggle', s.rbc);
              setSw('a11yAudioDescToggle', s.audioDescription);
              applyRbc(s.rbc);
            }
            function bind() {
              var rbc = document.getElementById('a11yRbcToggle');
              if (rbc && !rbc.dataset.v802Bound) {
                rbc.dataset.v802Bound = '1';
                rbc.addEventListener('change', function() {
                  var s = load();
                  s.rbc = !!rbc.checked; // Secure REDUCE_BRIGHT_COLORS_ACTIVATED 1/0
                  save(s);
                  applyRbc(s.rbc);
                });
              }
              var ad = document.getElementById('a11yAudioDescToggle');
              if (ad && !ad.dataset.v802Bound) {
                ad.dataset.v802Bound = '1';
                ad.addEventListener('change', function() {
                  var s = load();
                  s.audioDescription = !!ad.checked; // persistent=false 仅会话内状态
                  save(s);
                });
              }
            }
            window.__a11yRbcChange = function(sw) {
              var s = load();
              s.rbc = !!sw.checked;
              save(s);
              applyRbc(s.rbc);
            };
            refresh(); bind();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 20) { refresh(); bind(); }
            });
          })();
        `;