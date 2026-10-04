// ==================== stocks.js — 股票 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'stocks',
  name: '股票',
  pages: [{ title: '股票', content: iframeAppContent('apps/stocks/index.html') }],
};
