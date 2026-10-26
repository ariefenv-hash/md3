// ==================== terminal.js — 命令行终端 (iframe 嵌入, v8.40 #25) ====================
// msh（md3 shell）：31 命令白名单注册表 + VFS 互通（FS 桥）+ open 深链 35 应用
// （断网全功能；Roboto Mono 等宽 + AOSP 黑底质感）

import { iframeAppContent } from '../iframe-app.js';
import { getAppIconSVG } from '../app-icons.js';

export default {
  id: 'terminal',
  name: '终端',
  pages: [
    {
      title: 'TERMINAL',
      content: iframeAppContent('apps/terminal/index.html'),
    },
  ],
};
