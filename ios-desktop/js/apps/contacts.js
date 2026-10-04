// ==================== contacts.js — 通讯录 (iframe 嵌入) ====================

import { iframeAppContent } from '../iframe-app.js';

export default {
  id: 'contacts',
  name: '通讯录',
  pages: [{ title: '通讯录', content: iframeAppContent('apps/contacts/index.html') }],
};
