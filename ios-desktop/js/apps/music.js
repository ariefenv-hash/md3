// ==================== music.js — 音乐 (iframe 嵌入 + 本地文件导入) ====================
//
// fix(audit-E): 移除原「本地音乐」子页（pages[1]）—— 该页无任何入口（全工程无
// pushSubPage(1) 调用方）、musicFileInput2 无 onchange 死按钮、localMusicList 无渲染
// 逻辑，属不可达死 UI；本地导入的完整可用入口在内嵌应用自带按钮与拖放区
// （apps/music/index.html），桌面侧保留经定向修正后的导入浮层链路。
//
// v8.22 #55①: 导入浮层补齐取消路径三件套——
//   a) file input 增补 oncancel 内联（用户在文件选择器点「取消」时浏览器派发 cancel、
//      不派发 change，旧逻辑关闭分支被 if (files.length > 0) 包裹 → 浮层永久滞留卡死）；
//   b) onchange 的关闭路径移出 files.length 分支（无论是否选中文件都收起浮层）；
//   c) 模块级 Escape 委托 + 浮层背景点击关闭（内联 event.target === this 判定）。
//   同步根治多实例 ID 歧义：此前取消按钮/onchange 均用 document.getElementById——
//   page-stack 实例页 + 分屏窗格页 + 多任务预览可同时存在多个 #musicImportOverlay /
//   #musicFileInput 同 ID 节点，getElementById 永远命中文档第一个。全部改为
//   closest('.app-page') 就近查找（与 fix(audit-E) 的 iframe 定向同范式）。
//   注：当前版本浮层无开启入口（audit-E 移除子页后遗留的保留链路），本修复保证
//   未来任何入口接入后取消/逃逸/背景三条路径均安全闭合。

import { iframeAppContent } from '../iframe-app.js';
import { ICONS } from '../icons.js';

// v8.22 #55①：Escape 收起所有可见实例的导入浮层（模块级一次委托，app 实例销毁零泄漏）
// v8.22 消费语义：浮层实际收起时 stopImmediatePropagation 吞掉本次 Escape——阻断
// window 级快捷键层（performance.js Escape「层级关闭」链尾 closeApp）把整个应用
// 一起关掉的双动作（E2E 探针实锤：浮层收起 + 应用窗口同时进 closing 动画）。
// AOSP 对话框语义：Escape 只消费最顶层。
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  let closed = false;
  document.querySelectorAll('#musicImportOverlay').forEach((ov) => {
    if (getComputedStyle(ov).display !== 'none') {
      ov.style.opacity = '0';
      setTimeout(() => { ov.style.display = 'none'; }, 250);
      closed = true;
    }
  });
  if (closed) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

export default {
  id: 'music',
  name: '音乐',
  pages: [
    {
      title: '音乐',
      content: `
        ${iframeAppContent('apps/music/index.html')}
        <!-- 本地文件导入浮层 -->
        <div id="musicImportOverlay" style="position:absolute;inset:0;z-index:500;background:rgba(0,0,0,0.7);backdrop-filter:blur(20px);display:none;align-items:center;justify-content:center;opacity:0;transition:opacity 0.25s;" onclick="if(event.target===this){var s=this; s.style.opacity='0'; setTimeout(function(){s.style.display='none';},250);}">
          <div style="background:var(--md-surface-container,hsl(var(--md-h,215) 18% 12%));border-radius:24px;padding:24px;width:80%;max-width:340px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">${ICONS.music_note}</div>
            <div style="font-size:18px;font-weight:600;color:var(--md-on-surface,#e2e2e9);margin-bottom:8px;">导入本地音乐</div>
            <div style="font-size:14px;color:var(--md-on-surface-variant,#9a9b9e);margin-bottom:20px;">支持 MP3 / WAV / FLAC / M4A，以及 ZIP / TAR 音乐压缩包（含封面·歌词）</div>
            <div style="background:var(--md-primary,hsl(var(--md-h,215) 80% 25%));color:var(--md-on-primary,#fff);padding:14px;border-radius:9999px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:12px;" onclick="var p=this.closest('.app-page'); var f=p&&p.querySelector('#musicFileInput'); if(f)f.click();">选择音乐文件</div>
            <div style="color:var(--md-on-surface-variant,#9a9b9e);font-size:14px;cursor:pointer;padding:8px;" onclick="var o=this.closest('.app-page'); o=o&&o.querySelector('#musicImportOverlay'); if(o){o.style.opacity='0';setTimeout(function(){o.style.display='none';},250);}">取消</div>
          </div>
        </div>
        <input type="file" id="musicFileInput" accept="audio/*,.zip,.tar,.tgz,.lrc,.txt,.jpg,.jpeg,.png,.webp" multiple style="display:none;" onchange="
          // fix(audit-E): 定向当前音乐实例的 iframe —— 此前 document.querySelector('iframe')
          // 错投全文档第一个 iframe（可能是其它常驻实例/多任务预览）。当前实例的 iframe 与
          // 本输入框同属一个 .app-page（page-stack 实例页与分屏窗格页均有该类名），
          // 从 this 向上就近查找，天然避开其它实例。
          // v8.22 #55①: 关闭路径移出 files.length 分支——选中或取消都必须收起浮层。
          var page = this.closest && this.closest('.app-page');
          var overlay = page ? page.querySelector('#musicImportOverlay') : null;
          if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(function(){ overlay.style.display = 'none'; }, 250);
          }
          var files = this.files;
          if (files.length > 0) {
            var iframe = page ? page.querySelector('iframe') : null;
            if (iframe && iframe.contentWindow) {
              for (var i = 0; i < files.length; i++) {
                // v8.22 #55 附加疑点实锤：内联处理器作用域链含 document，裸标识符 URL
                // 解析到 document.URL（字符串）→ createObjectURL 抛 TypeError，
                // postMessage 从未发出（QA「onchange 触发但曲库不刷新」的真正根因）——
                // 必须 window.URL 全限定
                var url = window.URL.createObjectURL(files[i]);
                iframe.contentWindow.postMessage({ type: 'import-music', url: url, name: files[i].name }, '*');
              }
            }
          }
        " oncancel="
          // v8.22 #55①: 文件选择器「取消」路径 —— 浏览器派发 cancel 且不派发 change，
          // 就近收起本实例浮层（files.length === 0 时旧实现永久滞留卡死的根治路径）。
          var page = this.closest && this.closest('.app-page');
          var overlay = page ? page.querySelector('#musicImportOverlay') : null;
          if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(function(){ overlay.style.display = 'none'; }, 250);
          }
        ">
      `,
    },
  ],
};
