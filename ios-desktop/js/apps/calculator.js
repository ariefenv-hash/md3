// ==================== calculator.js — 计算器 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'calculator',
  name: '计算器',
  pages: [{ title: '计算器', content: iframeAppContent('apps/calculator/index.html') }],
};
