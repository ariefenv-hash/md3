// ==================== settings-pages/daltonizer.js — 页 34 色彩校正（DALTONIZER_PAGE_SCRIPT 单源真身 · #284 批 13） ====================
//
// #284 批 13（v11.29 · §7.5 加餐卷二）：DALTONIZER_PAGE_SCRIPT 常量自 settings.js 整体搬迁
// 至此——boundary-map §3.1 候选表顺位（页 34 色彩校正 v11.07 #105 一期
// ToggleDaltonizerPreferenceFragment + accessibility_daltonizer_settings.xml 1:1，簇块 85 行
// = 头注考证链 8 行 + const 1 + 模板串 74 + 闭合 1，批 12 TEXT_READING 簇后余三簇现存块
// 首位）。G2 单源桥接禁双轨：本文件 = 常量唯一真源（export），settings.js 经 import 消费
// 同一份；负向锚守护 = tests/a11y-settings.test.js「G2 单源桥接」组（settings.js 本体零
// const DALTONIZER_PAGE_SCRIPT 残留，批 2-12 互指纪律同款）。
// 运行语义零漂移：settingsApp 页注册表 `<script>` + DALTONIZER_PAGE_SCRIPT +
// `</script>` 拼接面逐字节不变（消费点 = settings.js 页 34 content 尾段原位）；簇模板串
// 零 `${` 插值（boundary-map §3.1 拆分风险注记核查：DALTONIZER 簇自包含 IIFE，桥接
// 全走 window.* 宿主面，迁移零委托行；簇体零 window.__settingsCore. / window.__mdEscape(
// 委托——A2/A3 壳层基线与 v286 C2 读取面计数零触碰，批 8/10/11/12 同款干净簇）。测试面
// 实证：全库测试零簇体独占串引用（a11y-settings F5 计数族读取面随迁守恒，F4 页 34 id
// 断言全在宿主 pages HTML 模板面），随迁面 = F5 读取面扩展 + G2 四锚尾挂（批 2-12 范式
// 最小随迁卷）。__settingsA11yStore 幂等守卫双定义之四（与 a11y.js/color-motion.js/
// text-reading.js 同构：先挂先赢，definer 随簇走）。
// AOSP 真源 = ToggleDaltonizerPreferenceFragment + accessibility_daltonizer_settings.xml：
// primary switch（accessibility_daltonizer_primary_switch_title「使用色彩校正」）+
// PaletteListPreference 色带预览 + 四模式 radio（arrays.xml keys×values 权威映射：
// deuteranomaly=12 / protanomaly=11 / tritanomaly=13 / grayscale=0）+ 强度滑条
// （DaltonizerSaturationSeekbarPreferenceController：MIN=1 / MAX=10 / DEFAULT=7；
// daltonizer_saturation_unavailable_summary 权威语义 = 灰度模式或停用时不可用）。
// 滤镜真实现 = SVG feColorMatrix（Machado 同源矩阵，a11y-apply.js ensureDaltonizerDefs
// 幂等注入）+ saturate() 饱和度链——SurfaceFlinger 管线差异诚实标注。

export const DALTONIZER_PAGE_SCRIPT = `
          (function() {
            var bindDoc = window.__bindAppDocListener ? function(t, f, o) { window.__bindAppDocListener(t, f, o); } : function(t, f, o) { document.addEventListener(f, o); };
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
            function applyAll(s) { if (window.__a11yApplyRuntime) { window.__a11yApplyRuntime(s); } }
            function setSw(id, on) { var sw = document.getElementById(id); (window.__setSwitchChecked||function(a,b){if(a)a.checked=!!b})(sw, on); }
            var UNAVAILABLE = '在灰度模式下或“色彩校正”功能已停用时不可用';
            function syncSaturation(s) {
              var sat = document.getElementById('a11yDaltonizerSat');
              var satVal = document.getElementById('a11yDaltonizerSatVal');
              var satSub = document.getElementById('a11yDaltonizerSatSub');
              var row = document.getElementById('a11yDaltonizerSatRow');
              if (!sat) return;
              var usable = s.daltonizerEnabled && s.daltonizerMode !== 0;
              sat.disabled = !usable;
              if (row) row.style.opacity = usable ? '1' : '0.45';
              if (satVal) satVal.textContent = usable ? (s.daltonizerSaturation + '/10') : '—';
              if (satSub) satSub.textContent = usable ? '' : UNAVAILABLE;
            }
            function refresh() {
              var s = load();
              setSw('a11yDaltonizerToggle', s.daltonizerEnabled);
              var radios = document.querySelectorAll('input[name=a11yDaltonizerMode]');
              for (var i = 0; i < radios.length; i++) radios[i].checked = (Number(radios[i].value) === Number(s.daltonizerMode));
              var sat = document.getElementById('a11yDaltonizerSat');
              if (sat) sat.value = s.daltonizerSaturation;
              syncSaturation(s);
              var prev = document.getElementById('a11yDaltonizerPalette');
              if (prev) prev.style.filter = window.__a11yApplyRuntime ? (s.daltonizerEnabled ? (s.daltonizerMode === 0 ? 'grayscale(1)' : 'url(#a11y-daltonizer-' + ({12:'deuteranomaly',11:'protanomaly',13:'tritanomaly'})[s.daltonizerMode] + ') saturate(' + (s.daltonizerSaturation / 10) + ')') : 'none') : 'none';
            }
            function bind() {
              var tg = document.getElementById('a11yDaltonizerToggle');
              if (tg && !tg.dataset.v1011Bound) {
                tg.dataset.v1011Bound = '1';
                tg.addEventListener('change', function() {
                  var s = load(); s.daltonizerEnabled = !!tg.checked; save(s); applyAll(s); refresh();
                });
              }
              var radios = document.querySelectorAll('input[name=a11yDaltonizerMode]');
              for (var i = 0; i < radios.length; i++) {
                (function(r) {
                  if (r.dataset.v1011Bound) return;
                  r.dataset.v1011Bound = '1';
                  r.addEventListener('change', function() {
                    var s = load(); s.daltonizerMode = Number(r.value); save(s); applyAll(s); refresh();
                  });
                })(radios[i]);
              }
              var sat = document.getElementById('a11yDaltonizerSat');
              if (sat && !sat.dataset.v1011Bound) {
                sat.dataset.v1011Bound = '1';
                sat.addEventListener('input', function() {
                  var s = load(); s.daltonizerSaturation = Math.round(Number(sat.value)) || 7; save(s); applyAll(s); syncSaturation(s);
                  var prev = document.getElementById('a11yDaltonizerPalette');
                  if (prev && s.daltonizerEnabled && s.daltonizerMode !== 0) prev.style.filter = 'url(#a11y-daltonizer-' + ({12:'deuteranomaly',11:'protanomaly',13:'tritanomaly'})[s.daltonizerMode] + ') saturate(' + (s.daltonizerSaturation / 10) + ')';
                });
              }
            }
            refresh(); bind();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 34) { refresh(); bind(); }
            });
          })();
        `;
