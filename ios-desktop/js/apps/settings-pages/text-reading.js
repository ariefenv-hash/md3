// ==================== settings-pages/text-reading.js — 页 33 显示大小和文字（TEXT_READING_PAGE_SCRIPT 单源真身 · #284 批 12） ====================
//
// #284 批 12（v11.29 · §7.5 加餐卷）：TEXT_READING_PAGE_SCRIPT 常量自 settings.js 整体搬迁
// 至此——boundary-map §3.1 候选表顺位（页 33 显示大小和文字 v11.07 #105 一期
// accessibility_text_reading_options.xml 1:1，簇块 91 行 = 头注考证链 8 行 + const 1 +
// 模板串 80 + 闭合 1，批 11 COLOR_MOTION 簇后余四簇现存块首位）。G2 单源桥接禁双轨：
// 本文件 = 常量唯一真源（export），settings.js 经 import 消费同一份；负向锚守护 =
// tests/a11y-settings.test.js「G2 单源桥接」组（settings.js 本体零 const
// TEXT_READING_PAGE_SCRIPT 残留，批 2-11 互指纪律同款）。
// 运行语义零漂移：settingsApp 页注册表 `<script>` + TEXT_READING_PAGE_SCRIPT +
// `</script>` 拼接面逐字节不变（消费点 = settings.js 页 33 content 尾段原位）；簇模板串
// 零 `${` 插值（boundary-map §3.1 拆分风险注记核查：TEXT_READING 簇自包含 IIFE，桥接
// 全走 window.* 宿主面，迁移零委托行；簇体零 window.__settingsCore. / window.__mdEscape(
// 委托——A2/A3 壳层基线与 v286 C2 读取面计数零触碰，批 8/10/11 同款干净簇）。测试面实证：
// 全库测试零簇体独占串引用（a11y-settings F5 计数族读取面随迁守恒，F3 页 33 id 断言全在
// 宿主 pages HTML 模板面），随迁面 = F5 读取面扩展 + G2 四锚尾挂（批 2-11 范式最小随迁卷）。
// __settingsA11yStore 幂等守卫双定义之三（与 a11y.js/color-motion.js 同构：先挂先赢，
// definer 随簇走）。
// AOSP 真源 = res/xml/accessibility_text_reading_options.xml：preview → font_size →
// display_size → toggle_force_bold_text → toggle_high_text_contrast_preference → reset。
// 文案 = values-zh-rCN 实拉（title_font_size「字体大小」/ short_summary_font_size「放大或缩小文字」/
// screen_zoom_title「显示大小」/ screen_zoom_short_summary「放大或缩小所有内容」/
// force_bold_text「粗体文字」/ high contrast title+summary 权威值）。
// 通道诚实标注：字体大小 = html 根字号（rem 族生效；md3 全库 px 化文本不随动——
// px→rem 迁移列后续阶段）；显示大小 = .app-body zoom（壳层手势阈值 px 语义不缩放）；
// 预览区两通道全真实（TextReadingPreviewPreference 等价）。

export const TEXT_READING_PAGE_SCRIPT = `
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
            function refresh() {
              var s = load();
              var fs = document.getElementById('a11yFontScale');
              var fsv = document.getElementById('a11yFontScaleVal');
              if (fs) fs.value = s.fontScale;
              if (fsv) fsv.textContent = s.fontScale + '%';
              var ds = document.getElementById('a11yDisplayScale');
              var dsv = document.getElementById('a11yDisplayScaleVal');
              if (ds) ds.value = s.displayScale;
              if (dsv) dsv.textContent = s.displayScale + '%';
              setSw('a11yBoldTextToggle', s.boldText);
              setSw('a11yHighContrastToggle', s.highContrastText);
              var pv = document.getElementById('a11yTextPreviewInner');
              if (pv) {
                pv.style.fontSize = (15 * s.fontScale / 100) + 'px';
                pv.style.zoom = String(s.displayScale / 100);
                pv.style.fontWeight = s.boldText ? '700' : '';
              }
            }
            function bind() {
              var fs = document.getElementById('a11yFontScale');
              if (fs && !fs.dataset.v1011Bound) {
                fs.dataset.v1011Bound = '1';
                fs.addEventListener('input', function() {
                  var s = load(); s.fontScale = Math.round(Number(fs.value)) || 100; save(s); applyAll(s); refresh();
                });
              }
              var ds = document.getElementById('a11yDisplayScale');
              if (ds && !ds.dataset.v1011Bound) {
                ds.dataset.v1011Bound = '1';
                ds.addEventListener('input', function() {
                  var s = load(); s.displayScale = Math.round(Number(ds.value)) || 100; save(s); applyAll(s); refresh();
                });
              }
              var bt = document.getElementById('a11yBoldTextToggle');
              if (bt && !bt.dataset.v1011Bound) {
                bt.dataset.v1011Bound = '1';
                bt.addEventListener('change', function() {
                  var s = load(); s.boldText = !!bt.checked; save(s); applyAll(s); refresh();
                });
              }
              var hc = document.getElementById('a11yHighContrastToggle');
              if (hc && !hc.dataset.v1011Bound) {
                hc.dataset.v1011Bound = '1';
                hc.addEventListener('change', function() {
                  var s = load(); s.highContrastText = !!hc.checked; save(s); applyAll(s); refresh();
                });
              }
              var rs = document.getElementById('a11yTextReadingReset');
              if (rs && !rs.dataset.v1011Bound) {
                rs.dataset.v1011Bound = '1';
                rs.addEventListener('click', function() {
                  var s = load();
                  s.fontScale = 100; s.displayScale = 100; s.boldText = false; s.highContrastText = false;
                  save(s); applyAll(s); refresh();
                });
              }
            }
            refresh(); bind();
            bindDoc('settings', 'app-page-active', function(e) {
              if (e.detail && e.detail.appId === 'settings' && e.detail.pageIdx === 33) { refresh(); bind(); }
            });
          })();
        `;
