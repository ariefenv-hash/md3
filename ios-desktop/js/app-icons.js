// ==================== app-icons.js — Pixel / Material You 旗舰级纯色几何方圆矢量图标库 ====================
//
// 设计规范:
// 1. 分辨率保证: 100% 矢量 SVG (viewBox="0 0 100 100")，在任何分辨率/DPI 下均极致锐利、无锯齿
// 2. 风格统一: 统一 100x100 空间基底，统一 rx="24" 方圆 Squircle 容器比例
// 3. 去除渐变色: 纯色色块 (Solid Color Blocks) 搭配高对比度色板，杜绝任何渐变色
// 4. 方圆组合: 融合圆角矩形 (Square/Squircle) 与圆形 (Circle/Arc/Rings) 的纯几何解构组合

export const APP_ICONS = {
  // 1. 信息 (Messages) — 薄荷绿方圆基底 + 白色圆气泡 + 纯色圆点
  msg: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 55) 100% 26.47%)"/>
    <!-- 主体圆形对话气泡 -->
    <path d="M 50 18 C 32 18 18 31 18 47 C 18 56 23 64 30 69 L 26 82 L 40 76 C 43 77 47 78 50 78 C 68 78 82 65 82 47 C 82 31 68 18 50 18 Z" fill="#FFFFFF"/>
    <!-- 3 颗内部纯色几何实心圆 -->
    <circle cx="36" cy="48" r="5" style="fill:hsl(calc(var(--md-h,215) - 55) 100% 26.47%)"/>
    <circle cx="50" cy="48" r="5" style="fill:hsl(calc(var(--md-h,215) - 55) 100% 26.47%)"/>
    <circle cx="64" cy="48" r="5" style="fill:hsl(calc(var(--md-h,215) - 55) 100% 26.47%)"/>
  </svg>`,

  // 2. 邮件 (Mail / Gmail) — 皇家蓝方圆基底 + 白色几何折纸信封 + 纯色圆封口
  mail: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 0.92) 81.75% 50.59%)"/>
    <!-- 信封白色主体方块 -->
    <rect x="18" y="26" width="64" height="48" rx="8" fill="#FFFFFF"/>
    <!-- 纯色几何折叠折痕 (纯色灰蓝) -->
    <path d="M 18 32 L 50 56 L 82 32 L 82 26 L 18 26 Z" style="fill:hsl(calc(var(--md-h,215) + 3.18) 91.67% 95.29%)"/>
    <path d="M 18 74 L 40 50" style="stroke:hsl(calc(var(--md-h,215) - 2.27) 26.83% 83.92%)" stroke-width="4" stroke-linecap="round"/>
    <path d="M 82 74 L 60 50" style="stroke:hsl(calc(var(--md-h,215) - 2.27) 26.83% 83.92%)" stroke-width="4" stroke-linecap="round"/>
    <!-- 封口红印圆形色块 -->
    <circle cx="50" cy="54" r="9" style="fill:hsl(calc(var(--md-h,215) - 210.36) 81.17% 56.27%)"/>
    <circle cx="50" cy="54" r="4" fill="#FFFFFF"/>
  </svg>`,

  // 3. 照片 (Photos) — 纯白方圆基底 + Google 四原色纯色圆形花瓣
  photos: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#FFFFFF"/>
    <rect width="98" height="98" x="1" y="1" rx="23" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)" stroke-width="2"/>
    <!-- 顶部红色圆形花瓣 -->
    <circle cx="50" cy="32" r="16" style="fill:hsl(calc(var(--md-h,215) - 210.36) 81.17% 56.27%)"/>
    <!-- 右侧黄色圆形花瓣 -->
    <circle cx="68" cy="50" r="16" style="fill:hsl(calc(var(--md-h,215) - 170.37) 96.85% 50.2%)"/>
    <!-- 底部绿色圆形花瓣 -->
    <circle cx="50" cy="68" r="16" style="fill:hsl(calc(var(--md-h,215) - 78.97) 52.73% 43.14%)"/>
    <!-- 左侧蓝色圆形花瓣 -->
    <circle cx="32" cy="50" r="16" style="fill:hsl(calc(var(--md-h,215) + 2.42) 89% 60.78%)"/>
    <!-- 中心纯白方形圆角遮罩核 -->
    <rect x="38" y="38" width="24" height="24" rx="8" fill="#FFFFFF"/>
    <circle cx="50" cy="50" r="6" style="fill:hsl(calc(var(--md-h,215) + 2.24) 32.58% 17.45%)"/>
  </svg>`,

  // 4. 设置 (Settings) — 深炭灰基底 + 纯色同心圆齿轮与翡翠绿核心
  settings: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 0.29) 25% 26.67%)"/>
    <!-- 8 方位几何十字齿轮 (方圆组合) -->
    <rect x="42" y="16" width="16" height="68" rx="5" style="fill:hsl(calc(var(--md-h,215) - 5) 40% 98.04%)"/>
    <rect x="16" y="42" width="68" height="16" rx="5" style="fill:hsl(calc(var(--md-h,215) - 5) 40% 98.04%)"/>
    <rect x="42" y="16" width="16" height="68" rx="5" style="fill:hsl(calc(var(--md-h,215) - 5) 40% 98.04%)" transform="rotate(45 50 50)"/>
    <rect x="16" y="42" width="68" height="16" rx="5" style="fill:hsl(calc(var(--md-h,215) - 5) 40% 98.04%)" transform="rotate(45 50 50)"/>
    <!-- 外部白色主圆 -->
    <circle cx="50" cy="50" r="26" style="fill:hsl(calc(var(--md-h,215) - 5) 40% 98.04%)"/>
    <!-- 中间纯色深灰圆环 -->
    <circle cx="50" cy="50" r="16" style="fill:hsl(calc(var(--md-h,215) + 0.29) 25% 26.67%)"/>
    <!-- 核心翡翠绿圆形指示点 -->
    <circle cx="50" cy="50" r="9" style="fill:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)"/>
  </svg>`,

  // 5. 时钟 (Clock) — 黑曜石方圆基底 + 白色表盘圆 + 纯色几何指针
  clock: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#18181B"/>
    <!-- 白色纯圆表盘 -->
    <circle cx="50" cy="50" r="38" fill="#FFFFFF"/>
    <!-- 4 方位方形刻度 -->
    <rect x="48" y="18" width="4" height="8" rx="2" fill="#71717A"/>
    <rect x="48" y="74" width="4" height="8" rx="2" fill="#71717A"/>
    <rect x="18" y="48" width="8" height="4" rx="2" fill="#71717A"/>
    <rect x="74" y="48" width="8" height="4" rx="2" fill="#71717A"/>
    <!-- 纯色时针与分针 -->
    <rect x="47.5" y="30" width="5" height="24" rx="2.5" fill="#18181B"/>
    <rect x="48" y="48" width="22" height="4" rx="2" fill="#18181B"/>
    <!-- 纯色亮橙秒针 -->
    <circle cx="50" cy="50" r="5" style="fill:hsl(calc(var(--md-h,215) - 190.42) 94.98% 53.14%)"/>
    <circle cx="50" cy="50" r="2.5" fill="#FFFFFF"/>
  </svg>`,

  // 6. 日历 (Calendar) — 纯白基底 + 顶部红色色块 + 纯色悬挂圆环
  calendar: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#FFFFFF"/>
    <rect width="98" height="98" x="1" y="1" rx="23" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)" stroke-width="2"/>
    <!-- 顶部猩红纯色块 -->
    <path d="M 0 24 C 0 10.7 10.7 0 24 0 L 76 0 C 89.3 0 100 10.7 100 24 L 100 32 L 0 32 Z" style="fill:hsl(calc(var(--md-h,215) - 215) 72.22% 50.59%)"/>
    <!-- 两个白色纯圆挂扣 -->
    <circle cx="30" cy="16" r="4" fill="#FFFFFF"/>
    <circle cx="70" cy="16" r="4" fill="#FFFFFF"/>
    <!-- 底部日期数字方形与圆形布局 -->
    <text x="50" y="74" font-size="38" font-family="-apple-system, Roboto, sans-serif" font-weight="800" text-anchor="middle" style="fill:hsl(calc(var(--md-h,215) + 2.24) 32.58% 17.45%)">16</text>
  </svg>`,

  // 7. 天气 (Weather) — 蔚蓝方圆基底 + 金黄太阳纯圆 + 纯白几何云朵
  weather: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 14.59) 98.01% 39.41%)"/>
    <!-- 金黄太阳实心圆 -->
    <circle cx="64" cy="38" r="18" style="fill:hsl(calc(var(--md-h,215) - 177.31) 92.13% 50.2%)"/>
    <!-- 纯白几何云朵 (由三个实心圆与底座圆角矩形组合) -->
    <circle cx="34" cy="62" r="14" fill="#FFFFFF"/>
    <circle cx="52" cy="52" r="18" fill="#FFFFFF"/>
    <circle cx="70" cy="62" r="12" fill="#FFFFFF"/>
    <rect x="34" y="60" width="36" height="16" fill="#FFFFFF"/>
  </svg>`,

  // 8. 音乐 (CyanWave · 极简青蓝本地音乐) — 青蓝方圆基底 + 纯白黑胶圆盘 + 深青双音符 + 品牌青绿角标
  music: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 14.59) 98.01% 39.41%)"/>
    <!-- 纯白黑胶圆形大底 -->
    <circle cx="50" cy="50" r="34" fill="#FFFFFF"/>
    <!-- 内部深青双音符 (双实心圆 + 矩形连接梁) -->
    <circle cx="40" cy="60" r="7" style="fill:hsl(calc(var(--md-h,215) - 13.73) 96.34% 32.16%)"/>
    <circle cx="60" cy="52" r="7" style="fill:hsl(calc(var(--md-h,215) - 13.73) 96.34% 32.16%)"/>
    <rect x="44" y="34" width="4" height="26" style="fill:hsl(calc(var(--md-h,215) - 13.73) 96.34% 32.16%)"/>
    <rect x="64" y="26" width="4" height="26" style="fill:hsl(calc(var(--md-h,215) - 13.73) 96.34% 32.16%)"/>
    <polygon points="44,34 68,26 68,34 44,42" style="fill:hsl(calc(var(--md-h,215) - 13.73) 96.34% 32.16%)"/>
    <!-- CyanWave 品牌青绿角标（brand-logo ::after 同源） -->
    <rect x="73" y="73" width="13" height="13" rx="3" style="fill:hsl(calc(var(--md-h,215) - 40.33) 83.85% 31.57%)"/>
  </svg>`,

  // 9. 计算器 (Calculator / Calc) — 墨黑方圆基底 + 4 色纯圆运算几何块
  calc: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 2.24) 32.58% 17.45%)"/>
    <!-- 4 个纯色圆形计算符号色块 -->
    <!-- 1. 加号 (琥珀橙圆) -->
    <circle cx="34" cy="34" r="14" style="fill:hsl(calc(var(--md-h,215) - 177.31) 92.13% 50.2%)"/>
    <rect x="32" y="26" width="4" height="16" rx="2" fill="#FFFFFF"/>
    <rect x="26" y="32" width="16" height="4" rx="2" fill="#FFFFFF"/>

    <!-- 2. 减号 (靛蓝圆) -->
    <circle cx="66" cy="34" r="14" style="fill:hsl(calc(var(--md-h,215) + 23.73) 83.53% 66.67%)"/>
    <rect x="58" y="32" width="16" height="4" rx="2" fill="#FFFFFF"/>

    <!-- 3. 乘号 (天蓝圆) -->
    <circle cx="34" cy="66" r="14" style="fill:hsl(calc(var(--md-h,215) - 16.37) 88.66% 48.43%)"/>
    <rect x="32" y="58" width="4" height="16" rx="2" fill="#FFFFFF" transform="rotate(45 34 66)"/>
    <rect x="26" y="64" width="16" height="4" rx="2" fill="#FFFFFF" transform="rotate(45 34 66)"/>

    <!-- 4. 等号 (薄荷绿圆) -->
    <circle cx="66" cy="66" r="14" style="fill:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)"/>
    <rect x="58" y="61" width="16" height="3.5" rx="1.5" fill="#FFFFFF"/>
    <rect x="58" y="68" width="16" height="3.5" rx="1.5" fill="#FFFFFF"/>
  </svg>`,

  // 10. 相机 (Camera) — 暗夜灰方圆基底 + 纯色同心圆多重镜头
  camera: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#1E2022"/>
    <!-- 顶部闪光灯与快门方形 -->
    <rect x="28" y="18" width="18" height="8" rx="3" fill="#4B5563"/>
    <circle cx="72" cy="28" r="5" style="fill:hsl(calc(var(--md-h,215) - 171.74) 96.41% 56.27%)"/>
    <!-- 镜头外圈 (中性灰圆) -->
    <circle cx="50" cy="54" r="28" style="fill:hsl(calc(var(--md-h,215) + 1.92) 19.12% 26.67%)"/>
    <!-- 镜头中圈 (皇家蓝纯圆) -->
    <circle cx="50" cy="54" r="20" style="fill:hsl(calc(var(--md-h,215) + 9.28) 76.33% 48.04%)"/>
    <!-- 镜头瞳孔 (黑曜深蓝圆) -->
    <circle cx="50" cy="54" r="12" style="fill:hsl(calc(var(--md-h,215) + 7.22) 47.37% 11.18%)"/>
    <!-- 纯白圆形反光高光点 -->
    <circle cx="45" cy="49" r="4" fill="#FFFFFF"/>
  </svg>`,

  // 11. 地图 (Maps) — 纯白基底 + 绿蓝纯色地形块 + 经典红水滴圆形图钉
  map: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#FFFFFF"/>
    <rect width="98" height="98" x="1" y="1" rx="23" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)" stroke-width="2"/>
    <!-- 绿色几何公园色块 -->
    <path d="M 0 24 C 0 10.7 10.7 0 24 0 L 52 0 L 32 48 L 0 38 Z" style="fill:hsl(calc(var(--md-h,215) - 73.29) 76.64% 73.14%)"/>
    <!-- 蓝色几何水系色块 -->
    <path d="M 68 0 L 100 0 L 100 48 L 84 54 Z" style="fill:hsl(calc(var(--md-h,215) - 3.3) 96.36% 78.43%)"/>
    <!-- 黄色道路纵贯线 -->
    <polygon points="20,100 80,0 92,0 32,100" style="fill:hsl(calc(var(--md-h,215) - 164.56) 97.85% 63.53%)"/>
    <!-- 纯红地图定位标记 (圆+三角) -->
    <path d="M 50 26 C 40 26 32 34 32 44 C 32 58 50 78 50 78 C 50 78 68 58 68 44 C 68 34 60 26 50 26 Z" style="fill:hsl(calc(var(--md-h,215) - 215) 84.24% 60.2%)"/>
    <!-- 中心纯白圆形空腔 -->
    <circle cx="50" cy="44" r="7" fill="#FFFFFF"/>
  </svg>`,

  // 12. 便签 (Notes / Keep) — 暖琥珀方圆基底 + 奶黄便签纸 + 棕色实心条纹
  notes: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 182.87) 94.62% 43.73%)"/>
    <!-- 奶黄方形便签主体 (带折角) -->
    <path d="M 22 20 L 78 20 L 78 62 L 62 78 L 22 78 Z" style="fill:hsl(calc(var(--md-h,215) - 167) 96.49% 88.82%)"/>
    <!-- 折角三角形纯色块 -->
    <polygon points="62,62 78,62 62,78" style="fill:hsl(calc(var(--md-h,215) - 167) 96.64% 76.67%)"/>
    <!-- 顶部固定圆图钉 -->
    <circle cx="50" cy="28" r="5" style="fill:hsl(calc(var(--md-h,215) - 189.04) 90.48% 37.06%)"/>
    <!-- 3 条纯色横线 -->
    <rect x="30" y="40" width="40" height="4" rx="2" style="fill:hsl(calc(var(--md-h,215) - 182.87) 94.62% 43.73%)"/>
    <rect x="30" y="50" width="40" height="4" rx="2" style="fill:hsl(calc(var(--md-h,215) - 182.87) 94.62% 43.73%)"/>
    <rect x="30" y="60" width="24" height="4" rx="2" style="fill:hsl(calc(var(--md-h,215) - 182.87) 94.62% 43.73%)"/>
  </svg>`,

  // 13. 提醒事项 (Reminders) — 纯白基底 + 3 组彩色纯圆与列表药丸条
  reminders: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#FFFFFF"/>
    <rect width="98" height="98" x="1" y="1" rx="23" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)" stroke-width="2"/>
    <!-- 第 1 条 (蓝色圆) -->
    <circle cx="28" cy="30" r="8" style="fill:hsl(calc(var(--md-h,215) + 2.22) 91.22% 59.8%)"/>
    <rect x="42" y="26" width="38" height="8" rx="4" style="fill:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)"/>
    <!-- 第 2 条 (红色圆) -->
    <circle cx="28" cy="50" r="8" style="fill:hsl(calc(var(--md-h,215) - 215) 84.24% 60.2%)"/>
    <rect x="42" y="46" width="44" height="8" rx="4" style="fill:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)"/>
    <!-- 第 3 条 (琥珀圆) -->
    <circle cx="28" cy="70" r="8" style="fill:hsl(calc(var(--md-h,215) - 177.31) 92.13% 50.2%)"/>
    <rect x="42" y="66" width="30" height="8" rx="4" style="fill:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)"/>
  </svg>`,

  // 14. 健康 (Health / Fit) — 纯白基底 + 玫红爱心 + 翡翠绿运动圆环
  health: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#FFFFFF"/>
    <rect width="98" height="98" x="1" y="1" rx="23" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)" stroke-width="2"/>
    <!-- 外部翡翠绿圆形运动环 -->
    <circle cx="50" cy="50" r="32" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)" stroke-width="8"/>
    <!-- 内部纯红几何爱心 (圆角与方形融合) -->
    <path d="M 50 64 L 33 47 C 27 41 27 31 34 25 C 41 19 50 23 50 29 C 50 23 59 19 66 25 C 73 31 73 41 67 47 Z" style="fill:hsl(calc(var(--md-h,215) + 134.72) 89.16% 60.2%)"/>
  </svg>`,

  // 15. 钱包 (Wallet) — 藏青方圆基底 + 双色几何卡片 + 纯圆金扣
  wallet: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 28.75) 47.06% 20%)"/>
    <!-- 顶部插卡 1 (蓝绿纯色矩形) -->
    <rect x="24" y="20" width="52" height="24" rx="6" style="fill:hsl(calc(var(--md-h,215) - 40.33) 83.85% 31.57%)"/>
    <!-- 顶部插卡 2 (金黄纯色矩形) -->
    <rect x="28" y="28" width="44" height="24" rx="6" style="fill:hsl(calc(var(--md-h,215) - 177.31) 92.13% 50.2%)"/>
    <!-- 钱包白色主体 -->
    <rect x="18" y="38" width="64" height="42" rx="10" fill="#FFFFFF"/>
    <!-- 钱包翻盖横条与金圆扣 -->
    <rect x="18" y="38" width="64" height="18" rx="6" style="fill:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)"/>
    <circle cx="50" cy="58" r="8" style="fill:hsl(calc(var(--md-h,215) - 177.31) 92.13% 50.2%)"/>
    <circle cx="50" cy="58" r="4" fill="#FFFFFF"/>
  </svg>`,

  // 16. 应用商店 (App Store / Play) — 极光蓝方圆基底 + 纯色几何 Play 三原色三角
  appstore: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 14.59) 98.01% 39.41%)"/>
    <!-- Google Play 经典 4 纯色几何切片 (纯色无渐变) -->
    <polygon points="26,20 26,80 56,50" style="fill:hsl(calc(var(--md-h,215) + 2.22) 91.22% 59.8%)"/>
    <polygon points="26,20 56,50 68,38 38,14" style="fill:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)"/>
    <polygon points="26,80 56,50 68,62 38,86" style="fill:hsl(calc(var(--md-h,215) - 215) 84.24% 60.2%)"/>
    <polygon points="56,50 68,38 82,46 82,54 68,62" style="fill:hsl(calc(var(--md-h,215) - 177.31) 92.13% 50.2%)"/>
  </svg>`,

  // 17. 浏览器 (Safari / Chrome) — 纯白基底 + 三原色实心圆环 + 核心蓝圆
  safari: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#FFFFFF"/>
    <rect width="98" height="98" x="1" y="1" rx="23" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)" stroke-width="2"/>
    <!-- 3 色纯圆扇区环 (红、黄、绿) -->
    <!-- 红色扇形区 -->
    <path d="M 50 18 A 32 32 0 0 1 77.7 34 L 50 50 Z" style="fill:hsl(calc(var(--md-h,215) - 210.36) 81.17% 56.27%)"/>
    <!-- 黄色扇形区 -->
    <path d="M 77.7 34 A 32 32 0 0 1 77.7 66 L 50 50 Z" style="fill:hsl(calc(var(--md-h,215) - 170.37) 96.85% 50.2%)"/>
    <!-- 绿色扇形区 -->
    <path d="M 77.7 66 A 32 32 0 0 1 22.3 66 L 50 50 Z" style="fill:hsl(calc(var(--md-h,215) - 78.97) 52.73% 43.14%)"/>
    <!-- 蓝色扇形区 -->
    <path d="M 22.3 66 A 32 32 0 0 1 50 18 L 50 50 Z" style="fill:hsl(calc(var(--md-h,215) + 2.42) 89% 60.78%)"/>
    <!-- 隔离白色圆环 -->
    <circle cx="50" cy="50" r="20" fill="#FFFFFF"/>
    <!-- 核心皇家蓝纯圆 -->
    <circle cx="50" cy="50" r="14" style="fill:hsl(calc(var(--md-h,215) - 0.92) 81.75% 50.59%)"/>
  </svg>`,

  // 18. 电话 (Phone) — 翠绿方圆基底 + 45° 几何听筒 (双圆 + 弧形连梁)
  phone: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 72.87) 76.22% 36.27%)"/>
    <!-- 纯白几何听筒 -->
    <g transform="rotate(45 50 50)">
      <circle cx="36" cy="36" r="10" fill="#FFFFFF"/>
      <circle cx="64" cy="64" r="10" fill="#FFFFFF"/>
      <path d="M 36 26 C 58 26 74 42 74 64 L 64 64 C 64 48 52 36 36 36 Z" fill="#FFFFFF"/>
    </g>
  </svg>`,

  // 19. 视频通话 (FaceTime / Meet) — 翡翠绿方圆基底 + 几何录像机与纯色透镜
  facetime: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 53.62) 93.55% 30.39%)"/>
    <!-- 白色录像机机身方形 -->
    <rect x="20" y="30" width="42" height="40" rx="10" fill="#FFFFFF"/>
    <!-- 右侧投影镜头纯白三角形 -->
    <polygon points="66,42 84,30 84,70 66,58" fill="#FFFFFF"/>
    <!-- 机身内部指示圆点 -->
    <circle cx="32" cy="42" r="4" style="fill:hsl(calc(var(--md-h,215) - 53.62) 93.55% 30.39%)"/>
  </svg>`,

  // 20. 通讯录 (Contacts) — 宝蓝方圆基底 + 纯白人物几何圆头与半圆身体
  contacts: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 9.28) 76.33% 48.04%)"/>
    <!-- 右侧 3 个纯色索引方块 -->
    <rect x="80" y="24" width="8" height="12" rx="3" style="fill:hsl(calc(var(--md-h,215) - 3.3) 96.36% 78.43%)"/>
    <rect x="80" y="44" width="8" height="12" rx="3" style="fill:hsl(calc(var(--md-h,215) - 3.3) 96.36% 78.43%)"/>
    <rect x="80" y="64" width="8" height="12" rx="3" style="fill:hsl(calc(var(--md-h,215) - 3.3) 96.36% 78.43%)"/>
    <!-- 纯白人物头像 (实心圆 + 弧形半身) -->
    <circle cx="46" cy="38" r="14" fill="#FFFFFF"/>
    <path d="M 22 74 C 22 58 70 58 70 74 Z" fill="#FFFFFF"/>
  </svg>`,

  // 21. 查找 (Find My) — 墨绿方圆基底 + 3 重同心雷达纯圆 + 扫描扇区
  findmy: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 50.83) 85.71% 16.47%)"/>
    <!-- 外层雷达圆环 -->
    <circle cx="50" cy="50" r="34" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 52.07) 93.55% 24.31%)" stroke-width="4"/>
    <!-- 中层雷达圆环 -->
    <circle cx="50" cy="50" r="22" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)" stroke-width="4"/>
    <!-- 雷达扫描纯色 90度 扇区 -->
    <path d="M 50 50 L 50 16 A 34 34 0 0 1 84 50 Z" style="fill:hsl(calc(var(--md-h,215) - 53.62) 93.55% 30.39%)" opacity="0.6"/>
    <!-- 核心定位白点圆 -->
    <circle cx="50" cy="50" r="8" style="fill:hsl(calc(var(--md-h,215) - 56.89) 64.37% 51.57%)"/>
    <circle cx="50" cy="50" r="4" fill="#FFFFFF"/>
  </svg>`,

  // 22. 翻译 (Translate) — 经典蓝方圆基底 + 双色交叠对话方形与文字
  translate: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 6.21) 83.19% 53.33%)"/>
    <!-- 左上白色对话方块 (带英文 A) -->
    <rect x="18" y="20" width="40" height="40" rx="10" fill="#FFFFFF"/>
    <text x="38" y="48" font-size="24" font-family="-apple-system, sans-serif" font-weight="900" text-anchor="middle" style="fill:hsl(calc(var(--md-h,215) + 10.93) 70.73% 40.2%)">A</text>
    <!-- 右下深蓝对话方块 (带汉字 文) -->
    <rect x="42" y="40" width="40" height="40" rx="10" style="fill:hsl(calc(var(--md-h,215) + 9.44) 64.29% 32.94%)"/>
    <text x="62" y="68" font-size="22" font-family="-apple-system, sans-serif" font-weight="900" text-anchor="middle" fill="#FFFFFF">文</text>
  </svg>`,

  // 23. 2048 接龙 (2048 Solitaire) — 莫奈青蓝方圆基底 + 浅青/中青双翼卡牌 + 纯白主卡「2048」+ 极光青星徽
  game2048: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 19.66) 100% 34.51%)"/>
    <!-- 左侧浅青翼卡牌 2（-12° 倾斜） -->
    <g transform="rotate(-12 27 45)">
      <rect x="12" y="24" width="30" height="42" rx="7" style="fill:hsl(calc(var(--md-h,215) - 22.37) 64.04% 82.55%)"/>
      <text x="27" y="51" font-size="16" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle" style="fill:hsl(calc(var(--md-h,215) - 14.23) 59.09% 17.25%)">2</text>
    </g>
    <!-- 右侧中青翼卡牌 4（+12° 倾斜） -->
    <g transform="rotate(12 73 45)">
      <rect x="58" y="24" width="30" height="42" rx="7" style="fill:hsl(calc(var(--md-h,215) - 21.89) 61.13% 51.57%)"/>
      <text x="73" y="51" font-size="16" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle" fill="#FFFFFF">4</text>
    </g>
    <!-- 前中纯白主卡牌 2048 -->
    <rect x="29" y="30" width="42" height="52" rx="9" fill="#FFFFFF"/>
    <text x="50" y="61" font-size="14" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle" style="fill:hsl(calc(var(--md-h,215) - 16.54) 78.79% 12.94%)">2048</text>
    <!-- 顶部极光青万能星徽章（游戏万能牌图腾） -->
    <circle cx="68" cy="27" r="9" style="fill:hsl(calc(var(--md-h,215) - 28.88) 100% 50%)"/>
    <polygon points="68,22 69.55,25.13 73,26.64 70.5,29.07 71.09,32.51 68,32.89 64.91,32.51 65.5,29.07 63,26.64 66.46,25.13" style="fill:hsl(calc(var(--md-h,215) - 16.54) 78.79% 12.94%)"/>
  </svg>`,

  // 24. 图书 (Books) — 焦糖红橙方圆基底 + 纯白对称书页 + 金黄书签圆
  books: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 194.46) 90.24% 48.24%)"/>
    <!-- 白色双翼展开书页 (方圆结合) -->
    <path d="M 20 34 C 20 34 32 30 50 36 L 50 76 C 32 70 20 74 20 74 Z" fill="#FFFFFF"/>
    <path d="M 80 34 C 80 34 68 30 50 36 L 50 76 C 68 70 80 74 80 74 Z" fill="#FFFFFF"/>
    <!-- 书脊中心分隔 -->
    <line x1="50" y1="36" x2="50" y2="76" style="stroke:hsl(calc(var(--md-h,215) - 197.53) 88.35% 40.39%)" stroke-width="2"/>
    <!-- 顶部金黄阅读圆章 -->
    <circle cx="50" cy="24" r="6" style="fill:hsl(calc(var(--md-h,215) - 171.74) 96.41% 56.27%)"/>
  </svg>`,

  // 25. 股票 (Stocks / Finance) — 纯黑方圆基底 + 纯绿折线图与数据圆点
  stocks: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#18181B"/>
    <!-- 绿色趋势折线底色块 (方圆剪裁) -->
    <polygon points="18,72 38,52 58,62 82,30 82,82 18,82" style="fill:hsl(calc(var(--md-h,215) - 50.83) 85.71% 16.47%)" opacity="0.6"/>
    <!-- 绿色趋势实心折线 -->
    <polyline points="18,72 38,52 58,62 82,30" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- 趋势折点纯色实心圆 -->
    <circle cx="18" cy="72" r="5" style="fill:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)"/>
    <circle cx="38" cy="52" r="5" style="fill:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)"/>
    <circle cx="58" cy="62" r="5" style="fill:hsl(calc(var(--md-h,215) - 54.88) 84.08% 39.41%)"/>
    <circle cx="82" cy="30" r="6" style="fill:hsl(calc(var(--md-h,215) - 56.89) 64.37% 51.57%)"/>
    <circle cx="82" cy="30" r="3" fill="#FFFFFF"/>
  </svg>`,

  // 26. 快捷指令 (Shortcuts) — 暗夜黑青方圆基底 + 双交叠 45° 几何方圆菱形
  shortcuts: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 7.22) 47.37% 11.18%)"/>
    <!-- 右下天蓝圆角菱形 -->
    <rect x="36" y="36" width="34" height="34" rx="10" style="fill:hsl(calc(var(--md-h,215) - 26.26) 94.5% 42.75%)" transform="rotate(45 53 53)"/>
    <!-- 左上洋红圆角菱形 -->
    <rect x="30" y="30" width="34" height="34" rx="10" style="fill:hsl(calc(var(--md-h,215) + 115.37) 81.19% 60.39%)" transform="rotate(45 47 47)"/>
    <!-- 中间交叠纯色圆 -->
    <circle cx="50" cy="50" r="7" fill="#FFFFFF"/>
  </svg>`,

  // 27. 小三传奇 (Threes! Pro) — 纯几何三色卡牌叠加 (蓝 1 + 红 2 + 白 3 上下结构面部表情与大数字)
  threes: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" fill="#1C1B1F"/>
    <!-- 左侧蓝色卡牌 1 -->
    <rect x="12" y="24" width="22" height="36" rx="6" style="fill:hsl(calc(var(--md-h,215) + 2.22) 91.22% 59.8%)"/>
    <text x="23" y="49" font-size="18" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle" fill="#FFFFFF">1</text>
    <!-- 右侧红色卡牌 2 -->
    <rect x="66" y="24" width="22" height="36" rx="6" style="fill:hsl(calc(var(--md-h,215) - 215) 84.24% 60.2%)"/>
    <text x="77" y="49" font-size="18" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle" fill="#FFFFFF">2</text>
    <!-- 中间主角卡牌 3 (白底纯净卡牌，清晰上下二段式结构：上方颜文字表情，下方数字3) -->
    <rect x="27" y="32" width="46" height="56" rx="10" fill="#FFFFFF"/>
    <rect x="27" y="32" width="46" height="56" rx="10" fill="none" style="stroke:hsl(calc(var(--md-h,215) - 0.71) 31.82% 91.37%)" stroke-width="2"/>
    <!-- 上方：颜文字表情 (Kaomoji) -->
    <circle cx="43" cy="46.5" r="2.2" style="fill:hsl(calc(var(--md-h,215) + 2.24) 32.58% 17.45%)"/>
    <circle cx="57" cy="46.5" r="2.2" style="fill:hsl(calc(var(--md-h,215) + 2.24) 32.58% 17.45%)"/>
    <circle cx="37.5" cy="49" r="1.5" style="fill:hsl(calc(var(--md-h,215) + 137.58) 95.7% 81.76%)" opacity="0.85"/>
    <circle cx="62.5" cy="49" r="1.5" style="fill:hsl(calc(var(--md-h,215) + 137.58) 95.7% 81.76%)" opacity="0.85"/>
    <path d="M 46.5 51 Q 50 54.5 53.5 51" fill="none" style="stroke:hsl(calc(var(--md-h,215) + 2.24) 32.58% 17.45%)" stroke-width="2" stroke-linecap="round"/>
    <!-- 下方：数字 3 (明显分离，间距通透不拥挤) -->
    <text x="50" y="78" font-size="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle" style="fill:hsl(calc(var(--md-h,215) + 2.24) 32.58% 17.45%)">3</text>
  </svg>`,

  // 28. 掷骰子 (Dice Lab) — 翡翠墨绿方圆基底 + 黄金等角六面骰与点数
  dice: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 48.33) 64.29% 10.98%)"/>
    <!-- 骰子主体外框 (金光六边形透视) -->
    <polygon points="50,18 80,35 80,68 50,85 20,68 20,35" style="fill:hsl(calc(var(--md-h,215) - 49.4) 53.19% 18.43%);stroke:hsl(calc(var(--md-h,215) - 169.14) 64.61% 52.35%)" stroke-width="3" stroke-linejoin="round"/>
    <!-- 顶部面 (浅翡翠) -->
    <polygon points="50,18 80,35 50,52 20,35" style="fill:hsl(calc(var(--md-h,215) - 48.55) 50.82% 23.92%);stroke:hsl(calc(var(--md-h,215) - 169.14) 64.61% 52.35%)" stroke-width="1.5"/>
    <circle cx="50" cy="35" r="4.5" style="fill:hsl(calc(var(--md-h,215) - 169.14) 64.61% 52.35%)"/>
    <!-- 左侧面 (中翡翠) -->
    <polygon points="20,35 50,52 50,85 20,68" style="fill:hsl(calc(var(--md-h,215) - 48.85) 53.42% 14.31%);stroke:hsl(calc(var(--md-h,215) - 169.14) 64.61% 52.35%)" stroke-width="1.5"/>
    <circle cx="31" cy="49" r="3.5" style="fill:hsl(calc(var(--md-h,215) - 53) 33.33% 94.12%)"/>
    <circle cx="39" cy="69" r="3.5" style="fill:hsl(calc(var(--md-h,215) - 53) 33.33% 94.12%)"/>
    <!-- 右侧面 (深翡翠) -->
    <polygon points="50,52 80,35 80,68 50,85" style="fill:hsl(calc(var(--md-h,215) - 48.55) 54.39% 11.18%);stroke:hsl(calc(var(--md-h,215) - 169.14) 64.61% 52.35%)" stroke-width="1.5"/>
    <circle cx="61" cy="69" r="3.5" style="fill:hsl(calc(var(--md-h,215) - 204.67) 60.64% 48.82%)"/>
    <circle cx="69" cy="49" r="3.5" style="fill:hsl(calc(var(--md-h,215) - 204.67) 60.64% 48.82%)"/>
    <circle cx="65" cy="59" r="3.5" style="fill:hsl(calc(var(--md-h,215) - 204.67) 60.64% 48.82%)"/>
    <!-- 闪耀金星点缀 -->
    <circle cx="78" cy="22" r="3" style="fill:hsl(calc(var(--md-h,215) - 166.67) 75% 81.18%)"/>
  </svg>`,

  // 29. Flow 11 (晶石流光 / 莫奈莫兰迪) — 翡翠陶土方圆基底 + 纯几何交织流光圆环 + 纯白双立柱 11
  flow11: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 10.29) 15.6% 21.37%)"/>
    <!-- 纯色几何交叉流光圆环与色块 -->
    <circle cx="36" cy="40" r="24" style="fill:hsl(calc(var(--md-h,215) - 52.37) 16.52% 54.9%)"/>
    <circle cx="64" cy="60" r="22" style="fill:hsl(calc(var(--md-h,215) - 215) 53.37% 68.04%)"/>
    <circle cx="62" cy="36" r="15" style="fill:hsl(calc(var(--md-h,215) - 176.18) 76.58% 56.47%)"/>
    <circle cx="38" cy="64" r="14" style="fill:hsl(calc(var(--md-h,215) + 2.22) 91.22% 59.8%)"/>
    <!-- 中心纯白双立柱 11 符号与切角光斑 -->
    <rect x="38" y="28" width="8" height="44" rx="4" fill="#FFFFFF"/>
    <rect x="54" y="28" width="8" height="44" rx="4" fill="#FFFFFF"/>
    <circle cx="42" cy="22" r="3.5" style="fill:hsl(calc(var(--md-h,215) - 164.56) 97.85% 63.53%)"/>
    <circle cx="58" cy="22" r="3.5" style="fill:hsl(calc(var(--md-h,215) - 164.56) 97.85% 63.53%)"/>
  </svg>`,

  // 30. 文件 (Files / 批次三·数据层) — 天蓝方圆基底 + 纯白文件夹 + 纯色蓝内页层次
  files: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) - 3.62) 92.55% 63.14%)"/>
    <!-- 内层深蓝文件夹背板（拉开层次） -->
    <path d="M 24 34 C 24 30 27 27 31 27 L 43 27 L 48 33 L 69 33 C 73 33 76 36 76 40 L 76 66 C 76 70 73 73 69 73 L 31 73 C 27 73 24 70 24 66 Z" style="fill:hsl(calc(var(--md-h,215) - 1.88) 74.76% 40.39%)"/>
    <!-- 纯白文件夹前板 -->
    <path d="M 24 44 C 24 40 27 37 31 37 L 45 37 L 51 44 L 69 44 C 73 44 76 47 76 51 L 76 66 C 76 70 73 73 69 73 L 31 73 C 27 73 24 70 24 66 Z" fill="#FFFFFF"/>
    <!-- 前板内淡蓝描边层次 -->
    <path d="M 31 41 L 44 41 L 50 48 L 69 48 C 71 48 72 49 72 51" style="stroke:hsl(calc(var(--md-h,215) - 5.91) 89.19% 85.49%)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </svg>`,

  // 31. 录音机 (Recorder / 批次四·大功能) — 珊瑚红方圆基底 + 纯白麦克风 + 琥珀指示点
  recorder: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 143.09) 75.12% 59.02%)"/>
    <!-- 麦克风网罩 -->
    <rect x="41" y="22" width="18" height="32" rx="9" fill="#FFFFFF"/>
    <!-- 支架弧线 -->
    <path d="M 32 46 C 32 56 39 63 50 63 C 61 63 68 56 68 46" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- 麦克风杆 -->
    <rect x="47" y="62" width="6" height="10" rx="3" fill="#FFFFFF"/>
    <rect x="38" y="72" width="24" height="6" rx="3" fill="#FFFFFF"/>
    <!-- 录音指示点 -->
    <circle cx="72" cy="26" r="6" style="fill:hsl(calc(var(--md-h,215) - 164.56) 97.85% 63.53%)"/>
  </svg>`,

  // 32. 安装包 (Installer / v7.52·包管理) — 紫罗兰方圆基底 + 纯白立体包裹盒 + 亮紫落点
  installer: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 43.31) 89.53% 66.27%)"/>
    <!-- 包裹盒：顶面 / 左右侧面三块面拉开立体感 -->
    <path d="M 28 40 L 50 28 L 72 40 L 50 52 Z" fill="#FFFFFF"/>
    <path d="M 28 40 L 50 52 L 50 76 L 28 64 Z" fill="#FFFFFF" opacity="0.82"/>
    <path d="M 72 40 L 50 52 L 50 76 L 72 64 Z" fill="#FFFFFF" opacity="0.66"/>
    <!-- 盒盖中缝（深紫描边） -->
    <path d="M 50 52 L 50 76" style="stroke:hsl(calc(var(--md-h,215) + 48.5) 67.42% 34.9%)" stroke-width="2.5" fill="none"/>
    <!-- 底部落点指示圈（包安装进系统的隐喻） -->
    <circle cx="50" cy="85" r="4" style="fill:hsl(calc(var(--md-h,215) + 35.5) 95.24% 91.76%)"/>
  </svg>`
};

// 兼容别名映射
APP_ICONS['messages'] = APP_ICONS['msg'];
APP_ICONS['calculator'] = APP_ICONS['calc'];
APP_ICONS['clock_app'] = APP_ICONS['clock'];
APP_ICONS['cal_app'] = APP_ICONS['calendar'];
APP_ICONS['photo'] = APP_ICONS['photos'];

/**
 * 判断指定应用是否拥有真实桌面图标（用于通知等场景优先使用应用本体图标）
 * @param {string} appId - 应用唯一 ID
 * @returns {boolean}
 */
export function hasAppIcon(appId) {
  return !!APP_ICONS[appId];
}

/**
 * 获取指定应用的 SVG 图标字符串
 * @param {string} appId - 应用唯一 ID (如 'msg', 'settings', 'game2048')
 * @returns {string} 纯矢量 SVG 字符串
 */
// ==================== v7.52 动态图标注册表（安装包矢量图标通道） ====================
//
// 安装包（pkg-）应用的图标不是内置 SVG 表，而是包内文件：SVG 图标净化后以内联 HTML
// 注入（与内置图标同一条 innerHTML 通道，可写 hsl(var(--md-h)) 跟随主题），位图为
// dataURL <img>。注册进本 Map 后，getAppIconSVG 的所有既有消费方（桌面网格/最近任务/
// 搜索/设置权限页/锁屏…）零改动自动生效。
const DYNAMIC_ICONS = new Map();

/** 注册/更新动态应用图标（html 为完整 SVG 或 <img> HTML；传空串删除） */
export function registerAppIcon(appId, html) {
  if (!appId || typeof html !== 'string' || !html) { if (appId) DYNAMIC_ICONS.delete(appId); return; }
  DYNAMIC_ICONS.set(appId, html);
}

/** 注销动态应用图标（卸载包应用时调用） */
export function unregisterAppIcon(appId) {
  if (appId) DYNAMIC_ICONS.delete(appId);
}

export function getAppIconSVG(appId) {
  if (APP_ICONS[appId]) {
    return APP_ICONS[appId];
  }
  if (DYNAMIC_ICONS.has(appId)) {
    return DYNAMIC_ICONS.get(appId);
  }
  // 默认后备方圆几何图标
  return `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 0.29) 19.32% 34.51%)"/>
    <circle cx="50" cy="50" r="22" fill="#FFFFFF"/>
    <circle cx="50" cy="50" r="10" style="fill:hsl(calc(var(--md-h,215) - 16.37) 88.66% 48.43%)"/>
  </svg>`;
}
