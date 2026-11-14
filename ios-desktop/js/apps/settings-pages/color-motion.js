// ==================== settings-pages/color-motion.js — 页 32 色彩和动画（COLOR_MOTION_PAGE_SCRIPT 单源真身 · #284 批 11） ====================
//
// #284 批 11（v11.30 · R163 续点候选首位）：COLOR_MOTION_PAGE_SCRIPT 常量自 settings.js
// 整体搬迁至此——boundary-map §3.1 候选表顺位（页 32 色彩和动画 v11.07 #105 一期
// accessibility_color_and_motion.xml 1:1，簇块 64 行 = 头注考证链 7 行 + const 1 +
// 模板串 54 + 闭合 1，批 10 A11Y 簇后余五簇现存块首位）。G2 单源桥接禁双轨：本文件 =
// 常量唯一真源（export），settings.js 经 import 消费同一份；负向锚守护 =
// tests/a11y-settings.test.js「G2 单源桥接」组（settings.js 本体零 const
// COLOR_MOTION_PAGE_SCRIPT 残留，批 2-10 互指纪律同款）。
// 运行语义零漂移：settingsApp 页注册表 `<script>` + COLOR_MOTION_PAGE_SCRIPT +
// `</script>` 拼接面逐字节不变（消费点 = settings.js 页 32 content 尾段原位）；簇模板串
// 零 `${` 插值（boundary-map §3.1 拆分风险注记核查：COLOR_MOTION 簇自包含 IIFE，桥接
// 全走 window.* 宿主面，迁移零委托行；簇体零 window.__settingsCore. / window.__mdEscape(
// 委托——A2/A3 壳层基线与 v286 C2 读取面计数零触碰，批 8/10 同款干净簇）。测试面实证：
// 全库测试零簇体独占串引用（a11y-settings F5 计数族读取面随迁守恒，F2 页 32 id 断言全在
// 宿主 pages HTML 模板面），随迁面 = F5 读取面扩展 + G2 四锚尾挂（批 2-10 范式最小随迁卷）。
// __settingsA11yStore 幂等守卫双定义之二（与 a11y.js 同构：先挂先赢，definer 随簇走）。
// AOSP 真源 = res/xml/accessibility_color_and_motion.xml（全文实拉入库
// docs/reference/packages-apps-settings/color-and-motion/）：渲染序 = daltonizer_preference
// → toggle_inversion_preference → dark_ui_mode → toggle_force_invert → animator_duration_scale
// → toggle_large_pointer_icon → experimental_category（空区隐藏）。文案 = values-zh-rCN 实拉。
// 真实现面：颜色反转/移除动画 = html 属性与 filter 合成链（a11y-apply.js 单写点）；
// 诚实隐藏注记：toggle_force_invert（Web 无应用深色强制通道）/ toggle_large_pointer_icon
// （Web 无自绘指针面）/ experimental_category（空区）。

export const COLOR_MOTION_PAGE_SCRIPT = `
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, f === 'change' ? o : o); };
            var STORE_KEY = 'settings:accessibility-v1';
            var DEFAULTS = { rbc: false, audioDescription: false, removeAnimations: false, colorInversion: false, daltonizerEnabled: false, daltonizerMode: 12, daltonizerSaturation: 7, fontScale: 100, displayScale: 100, boldText: false, highContrastText: false };
            function load() {
              var s = {};
              try { var v = JSON.parse(localStorage.getItem(STORE_KEY)); if (v && typeof v === 'object') { for (var k in DEFAULTS) { if (k in v) s[k] = v[k]; } } } catch (e) {}
              var out = {};
              for (var k2 in DEFAULTS) out[k2] = (k2 in s) ? s[k2] : DEFAULTS[k2];
              return out;
            }
            function save(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }
            if (typeof window !== 'undefined' && !window.__settingsA11yStore) {
              window.__settingsA11yStore = { load: load, save: save, DEFAULTS: DEFAULTS };
            }
            // 应用收口：全量态走 a11y-apply.js applyA11yRuntime（html 属性 + filter 合成单写点）；
            // 桥缺席降级 = 直写属性（页脚本独立可活）
            function applyAll(s) {
              if (window.__a11yApplyRuntime) { window.__a11yApplyRuntime(s); return; }
              var el = document.documentElement;
              if (s.removeAnimations) el.setAttribute('data-a11y-reduce-motion', ''); else el.removeAttribute('data-a11y-reduce-motion');
              try { document.dispatchEvent(new CustomEvent('a11y-reduce-motion-changed', { detail: { active: !!s.removeAnimations } })); } catch (e) {}
              el.style.filter = (s.colorInversion ? 'invert(1) hue-rotate(180deg)' : (s.rbc ? 'brightness(0.5)' : ''));
            }
            function setSw(id, on) { var sw = document.getElementById(id); (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(sw, on); }
            var MODE_TITLES = { 12: '红绿色盲、绿色弱', 11: '红绿色盲、红色弱', 13: '蓝黄色盲', 0: '灰度模式' };
            function refresh() {
              var s = load();
              setSw('a11yColorInvertToggle', s.colorInversion);
              setSw('a11yRemoveAnimToggle', s.removeAnimations);
              var cc = document.getElementById('a11yColorCorrectionSub');
              if (cc) cc.textContent = s.daltonizerEnabled ? (MODE_TITLES[s.daltonizerMode] || '已开启') : '已关闭';
            }
            function bind() {
              var inv = document.getElementById('a11yColorInvertToggle');
              if (inv && !inv.dataset.v1011Bound) {
                inv.dataset.v1011Bound = '1';
                inv.addEventListener('change', function() {
                  var s = load(); s.colorInversion = !!inv.checked; save(s); applyAll(s);
                });
              }
              var rm = document.getElementById('a11yRemoveAnimToggle');
              if (rm && !rm.dataset.v1011Bound) {
                rm.dataset.v1011Bound = '1';
                rm.addEventListener('change', function() {
                  var s = load(); s.removeAnimations = !!rm.checked; save(s); applyAll(s);
                });
              }
            }
            refresh(); bind();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 32) { refresh(); bind(); }
            });
          })();
        `;
