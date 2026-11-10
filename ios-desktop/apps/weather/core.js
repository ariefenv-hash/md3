// ==================== weather/core.js — 天气纯函数核（#286 续 · ref-only 补提取第三批 · v11.12） ====================
//
// 职责：weather/index.html 内联脚本的纯逻辑真身——WMO 标准天气编码表（22 档）/
// 城市预设表（18 城）/ 最近城市判定 / 高精矢量 SVG 图标引擎（纯字符串构造）。
// 内联主脚本（经典 <script>）经 window.__weatherCore 桥消费同一份；
// vitest 侧用 new Function 沙箱提取（photos/core.js / drawcircle core.js 同范式）。
//
// ⚠ 模块形态：经典脚本 IIFE（无 export），由 index.html <script src="./core.js"> 同步加载
// （先于主内联脚本），零依赖，保证测试侧 new Function('window', SRC) 可直接执行提取。
//
// 车道：#286 ref-only 候补池第三批（weather 域，池内第二家；R141 窗首建版沙箱回收
// 丢失后本窗按认领帖 6732066592 原车道重建，滚版按合流树顺延 v11.12）。零行为变化——
// 内联原实现整体搬移，调用点等值换算（编码表 / 城市表 / 最近城 / SVG 四处委托）。

(function () {
  'use strict';

  // ==================== WMO 标准天气编码表（原内联 WMO_CODES 原样上移，22 档键集不变） ====================
  var WMO_CODES = {
    0: { desc: '晴朗', type: 'sunny', aura: 'radial-gradient(circle, #f59e0b 0%, #3b82f6 80%)' },
    1: { desc: '大部晴朗', type: 'sunny', aura: 'radial-gradient(circle, #fbbf24 0%, #2563eb 80%)' },
    2: { desc: '多云间晴', type: 'cloudy', aura: 'radial-gradient(circle, #94a3b8 0%, #3b82f6 80%)' },
    3: { desc: '阴天多云', type: 'overcast', aura: 'radial-gradient(circle, #64748b 0%, #1e293b 80%)' },
    45: { desc: '大雾弥漫', type: 'fog', aura: 'radial-gradient(circle, #94a3b8 0%, #475569 80%)' },
    48: { desc: '薄雾结霜', type: 'fog', aura: 'radial-gradient(circle, #cbd5e1 0%, #64748b 80%)' },
    51: { desc: '小毛毛雨', type: 'drizzle', aura: 'radial-gradient(circle, #38bdf8 0%, #1e3a8a 80%)' },
    53: { desc: '毛毛细雨', type: 'drizzle', aura: 'radial-gradient(circle, #0ea5e9 0%, #172554 80%)' },
    55: { desc: '密闭细雨', type: 'drizzle', aura: 'radial-gradient(circle, #0284c7 0%, #0c4a6e 80%)' },
    61: { desc: '轻度小雨', type: 'rain', aura: 'radial-gradient(circle, #0284c7 0%, #0f172a 80%)' },
    63: { desc: '中雨连绵', type: 'rain', aura: 'radial-gradient(circle, #0369a1 0%, #020617 80%)' },
    65: { desc: '倾盆大雨', type: 'heavy-rain', aura: 'radial-gradient(circle, #1d4ed8 0%, #030712 80%)' },
    71: { desc: '纷飞小雪', type: 'snow', aura: 'radial-gradient(circle, #e0f2fe 0%, #1e40af 80%)' },
    73: { desc: '中度降雪', type: 'snow', aura: 'radial-gradient(circle, #bae6fd 0%, #172554 80%)' },
    75: { desc: '鹅毛大雪', type: 'heavy-snow', aura: 'radial-gradient(circle, #f8fafc 0%, #1e1b4b 80%)' },
    80: { desc: '短时阵雨', type: 'rain', aura: 'radial-gradient(circle, #38bdf8 0%, #1e293b 80%)' },
    81: { desc: '中度阵雨', type: 'rain', aura: 'radial-gradient(circle, #0284c7 0%, #0f172a 80%)' },
    82: { desc: '强降水阵雨', type: 'heavy-rain', aura: 'radial-gradient(circle, #1e40af 0%, #020617 80%)' },
    85: { desc: '短时阵雪', type: 'snow', aura: 'radial-gradient(circle, #e0f2fe 0%, #1e3a8a 80%)' },
    95: { desc: '雷电交加', type: 'storm', aura: 'radial-gradient(circle, #f59e0b 0%, #450a0a 80%)' },
    96: { desc: '雷暴伴微雹', type: 'storm', aura: 'radial-gradient(circle, #d97706 0%, #3b0764 80%)' },
    99: { desc: '强雷暴大冰雹', type: 'storm', aura: 'radial-gradient(circle, #ef4444 0%, #18181b 80%)' }
  };

  // ==================== 城市预设表（原内联 CITY_PRESETS 原样上移，18 城序不变） ====================
  var CITY_PRESETS = [
    { name: '北京', pinyin: 'beijing', lat: 39.9042, lon: 116.4074, prov: '直辖市' },
    { name: '洛阳', pinyin: 'luoyang', lat: 34.6197, lon: 112.4540, prov: '河南省' },
    { name: '郑州', pinyin: 'zhengzhou', lat: 34.7466, lon: 113.6253, prov: '河南省' },
    { name: '上海', pinyin: 'shanghai', lat: 31.2304, lon: 121.4737, prov: '直辖市' },
    { name: '广州', pinyin: 'guangzhou', lat: 23.1291, lon: 113.2644, prov: '广东省' },
    { name: '深圳', pinyin: 'shenzhen', lat: 22.5431, lon: 114.0579, prov: '广东省' },
    { name: '杭州', pinyin: 'hangzhou', lat: 30.2741, lon: 120.1551, prov: '浙江省' },
    { name: '成都', pinyin: 'chengdu', lat: 30.5728, lon: 104.0668, prov: '四川省' },
    { name: '武汉', pinyin: 'wuhan', lat: 30.5928, lon: 114.3055, prov: '湖北省' },
    { name: '南京', pinyin: 'nanjing', lat: 32.0603, lon: 118.7969, prov: '江苏省' },
    { name: '西安', pinyin: 'xian', lat: 34.3416, lon: 108.9398, prov: '陕西省' },
    { name: '重庆', pinyin: 'chongqing', lat: 29.5630, lon: 106.5516, prov: '直辖市' },
    { name: '开封', pinyin: 'kaifeng', lat: 34.7972, lon: 114.3076, prov: '河南省' },
    { name: '青岛', pinyin: 'qingdao', lat: 36.0671, lon: 120.3826, prov: '山东省' },
    { name: '香港', pinyin: 'hongkong', lat: 22.3193, lon: 114.1694, prov: '特别行政区' },
    { name: '台北', pinyin: 'taipei', lat: 25.0330, lon: 121.5654, prov: '中国台湾' },
    { name: '东京', pinyin: 'tokyo', lat: 35.6762, lon: 139.6503, prov: '日本' },
    { name: '伦敦', pinyin: 'london', lat: 51.5074, lon: -0.1278, prov: '英国' }
  ];

  // ==================== 最近城市判定（原 findNearestCity 整体搬移，逐位等值） ====================
  /** 欧氏距离（坐标平面近似）扫描 CITY_PRESETS 取最小——与原 forEach+Math.hypot 语义一致。 */
  function findNearestCity(lat, lon) {
    var minD = Infinity;
    var nearest = CITY_PRESETS[0];
    CITY_PRESETS.forEach(function (c) {
      var d = Math.hypot(c.lat - lat, c.lon - lon);
      if (d < minD) {
        minD = d;
        nearest = c;
      }
    });
    return nearest;
  }

  // ==================== 高精矢量 SVG 图标引擎（原 createWeatherSVG 整体搬移，逐字符等值） ====================
  /** 纯字符串构造（零 DOM 零副作用），type 七分支 + 未知类型圆点兜底，size 缺省 100。 */
  function createWeatherSVG(type, size) {
    if (typeof size !== 'number') size = 100;
    if (type === 'sunny') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" class="drop-shadow-lg">
                    <circle cx="50" cy="50" r="23" fill="#fbbf24"/>
                    <g stroke="#fbbf24" stroke-width="4" stroke-linecap="round" class="weather-spin-slow origin-center">
                        <line x1="50" y1="8" x2="50" y2="18"/>
                        <line x1="50" y1="82" x2="50" y2="92"/>
                        <line x1="8" y1="50" x2="18" y2="50"/>
                        <line x1="82" y1="50" x2="92" y2="50"/>
                        <line x1="20" y1="20" x2="28" y2="28"/>
                        <line x1="72" y1="72" x2="80" y2="80"/>
                        <line x1="20" y1="80" x2="28" y2="72"/>
                        <line x1="72" y1="28" x2="80" y2="20"/>
                    </g>
                </svg>`;
    } else if (type === 'cloudy') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" class="drop-shadow-lg">
                    <circle cx="38" cy="38" r="17" fill="#fbbf24" opacity="0.95"/>
                    <path d="M74 72H32a18 18 0 0 1-3.6-35.6 22 22 0 0 1 42.4-5.2A16 16 0 0 1 74 72z" fill="#94a3b8" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"/>
                </svg>`;
    } else if (type === 'overcast' || type === 'fog') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" class="drop-shadow-lg">
                    <path d="M75 66H25a17 17 0 0 1-3.4-33.6 21 21 0 0 1 40.5-5 15 15 0 0 1 12.9 38.6z" fill="#64748b"/>
                    <line x1="20" y1="76" x2="80" y2="76" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
                    <line x1="26" y1="84" x2="74" y2="84" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
                </svg>`;
    } else if (type === 'rain' || type === 'drizzle' || type === 'heavy-rain') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" class="drop-shadow-lg">
                    <path d="M72 56H32a16 16 0 0 1-3.2-31.7 20 20 0 0 1 38.6-4.7A14 14 0 0 1 72 56z" fill="#475569"/>
                    <g stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round">
                        <line x1="34" y1="64" x2="28" y2="80"/>
                        <line x1="48" y1="64" x2="42" y2="84"/>
                        <line x1="62" y1="64" x2="56" y2="80"/>
                    </g>
                </svg>`;
    } else if (type === 'snow' || type === 'heavy-snow') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" class="drop-shadow-lg">
                    <path d="M72 54H32a16 16 0 0 1-3.2-31.7 20 20 0 0 1 38.6-4.7A14 14 0 0 1 72 54z" fill="#64748b"/>
                    <circle cx="34" cy="68" r="3.5" fill="#f8fafc"/>
                    <circle cx="50" cy="74" r="3" fill="#f8fafc"/>
                    <circle cx="64" cy="68" r="3.5" fill="#f8fafc"/>
                    <circle cx="42" cy="84" r="2.5" fill="#f8fafc"/>
                    <circle cx="58" cy="84" r="2.5" fill="#f8fafc"/>
                </svg>`;
    } else if (type === 'storm') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" class="drop-shadow-lg">
                    <path d="M72 52H32a16 16 0 0 1-3.2-31.7 20 20 0 0 1 38.6-4.7A14 14 0 0 1 72 52z" fill="#334155"/>
                    <polygon points="48,56 40,68 47,68 43,86 57,66 49,66" fill="#f59e0b"/>
                </svg>`;
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="20" fill="#fbbf24"/></svg>`;
  }

  // ==================== 出口（window 桥；Node 沙箱 / 浏览器双域零崩） ====================
  var core = {
    WMO_CODES: WMO_CODES,
    CITY_PRESETS: CITY_PRESETS,
    findNearestCity: findNearestCity,
    createWeatherSVG: createWeatherSVG,
  };
  if (typeof window !== 'undefined') window.__weatherCore = core;
})();
