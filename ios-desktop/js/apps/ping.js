// ==================== ping.js — PING 网络诊断 (iframe 嵌入, v8.44 #60) ====================
// geek 桌面标配：fetch HEAD no-cors 计时模拟（HTTP TTFB 口径明示）+ 统计/时序图。
// 纯函数在 ping-core.js（vitest 锚），页面侧只做接线（零 innerHTML）。

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'ping',
  name: 'PING',
  pages: [
    {
      title: 'PING',
      content: iframeAppContent('apps/ping/index.html'),
    },
  ],
};
