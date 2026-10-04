// ==================== shortcuts.js — 快捷指令 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'shortcuts',
  name: '快捷指令',
  pages: [{ title: '快捷指令', content: iframeAppContent('apps/shortcuts/index.html') }],
};
