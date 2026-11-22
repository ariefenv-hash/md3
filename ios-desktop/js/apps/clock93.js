// ==================== clock93.js — 时钟 9.3 Gastown（iframe 嵌入，从零移植） ====================
// 新应用身份 clock93：与已退役的旧时钟实现互不复用。
// 目录沿用 apps/clock-app/（9.3 原始 AVD 资产 avd/ 三文件原地保留，测试锚零改动）。
// 证据卷 docs/reference/deskclock/gastown93/；本次范围 = UI 交互核心（五 tab / 原始 AVD
// 过渡 / 闹钟·世界时钟·计时器·秒表·就寝五页交互 / 响应式四档）。

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'clock93',
  name: '时钟 9.3',
  // v11.52 #330：type='clock' → 桌面/文件夹/全部应用/分屏卡/启动屏全走 launcher 动态
  // 图标（createDynamicIconHTML 真源位图版，APK launcher_clock_* 四层 + applyTime 公式）；
  // 启动屏底色由 app-window type==='clock' 分支给 #18181B（Gastown 深底，冷启动白闪规避）
  type: 'clock',
  bgColor: '#18181B', // v11.52：bgColor 同步 Gastown 深底（旧 #3C5A99 为 9.0 时代残留）
  pages: [
    {
      title: '时钟 9.3',
      content: iframeAppContent('apps/clock-app/index.html'),
    },
  ],
};
