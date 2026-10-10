// ==================== installer.js — 安装包（v7.52 · 包管理器） ====================
//
// 系统级「安装包」应用：导入 .mdapp/.zip 压缩包 → 点击卡片 → 安装确认单（权限/体量/识别
// 信息一目了然）→ 装进系统（桌面出图标、sw.js 托管、沙箱 iframe 运行）；已安装页提供
// 打开 / 放回桌面 / 卸载。
//
// 实现形态：模块渲染型应用（与 files.js 同族）—— 内容 HTML 注入 app-instance 容器，
// page-stack.activatePageScripts 负责激活内联脚本。内联脚本与桌面同文档，通过
// window.__pkgInstallerAPI（pkg-registry.js 注册）访问存储与安装服务。
//
// 转义纪律（files.js 双层求值深坑的工程结论）：外层模板静态、无 ${} 插值；内层脚本
// 不出现反引号 / 反斜杠 / ${；HTML 拼接全部单引号字符串 + esc() 实体化。
//
// 刷新协议：pkg-registry 在导入/安装/卸载后派发 window 事件 'pkg-installer-refresh'；
// files 应用「点 zip 交接」也会先导入再打开本页 —— 首次 refresh 即可拉到新记录。

const installerHTML = `
<div class="pkg-app" id="pkgApp">
  <div class="pkg-topbar">
    <div class="pkg-title-row">
      <span class="pkg-title-icon" id="pkgTitleIcon"></span>
      <div class="pkg-title-wrap">
        <h2 class="pkg-title">安装包</h2>
        <div class="pkg-sub" id="pkgSubLine">导入压缩包 · 自动识别图标与名称 · 权限透明安装</div>
      </div>
      <button class="pkg-help-btn" id="pkgHelpBtn" aria-label="配置讲解与 AI 提示词" title="配置讲解与 AI 提示词">?</button>
      <button class="pkg-import-pill" id="pkgImportTop">导入</button>
    </div>
    <div class="pkg-tabs" role="tablist">
      <button class="pkg-tab on" data-t="pending" role="tab">待安装<span class="pkg-tab-n" id="pkgNPending"></span></button>
      <button class="pkg-tab" data-t="installed" role="tab">已安装<span class="pkg-tab-n" id="pkgNInstalled"></span></button>
    </div>
  </div>

  <div class="pkg-body" id="pkgList"></div>

  <button class="pkg-fab" id="pkgImportFab" aria-label="导入压缩包">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 20h16"/></svg>
    <span>导入压缩包</span>
  </button>

  <input type="file" id="pkgFileInput" multiple accept=".zip,.mdapp,application/zip,application/x-zip-compressed" style="display:none" />

  <div class="pkg-snack" id="pkgSnack" role="status"></div>

  <div class="pkg-sheet-overlay" id="pkgSheetOverlay">
    <div class="pkg-sheet" role="dialog" aria-modal="true" aria-label="安装确认" id="pkgSheet"></div>
  </div>

  <div class="pkg-sheet-overlay" id="pkgConfirmOverlay">
    <div class="pkg-confirm-card" role="alertdialog" aria-modal="true" id="pkgConfirm"></div>
  </div>

  <div class="pkg-sheet-overlay pkg-help-overlay" id="pkgHelpOverlay">
    <div class="pkg-help-card" role="dialog" aria-modal="true" aria-label="安装包配置讲解" id="pkgHelpCard">
      <div class="pkg-help-head">
        <div>
          <div class="pkg-help-title">配置讲解</div>
          <div class="pkg-help-sub">包规范 · 系统能力 · 一键交给 AI</div>
        </div>
        <button class="pkg-btn ghost" data-help-close>关闭</button>
      </div>
      <div class="pkg-help-body">
        <div class="pkg-help-sec">① 这是什么</div>
        <p class="pkg-help-p">本页把网页应用打包成压缩包（.zip / .mdapp）安装进系统：导入后自动识别名称与图标，权限透明可查，安装后图标出现在桌面，沙箱隔离运行，离线可用。</p>

        <div class="pkg-help-sec">② 包结构</div>
        <pre class="pkg-help-pre">myapp.mdapp (zip)
├─ manifest.json   清单（必须，zip 根目录）
├─ index.html      入口（缺省入口名）
├─ icon.svg        图标（manifest.icon 指向）
└─ ...其余资源按相对路径引用</pre>

        <div class="pkg-help-sec">③ manifest.json 字段</div>
        <div class="pkg-help-row"><b>id</b><span>必填 · 小写字母开头，仅 a-z 0-9 . _ -，2～40 位，禁连续点（..）。安装后系统 id 为 pkg-&lt;id&gt;</span></div>
        <div class="pkg-help-row"><b>name</b><span>可选 · ≤24 字符。缺省自动识别：入口页 &lt;title&gt; → 压缩包文件名</span></div>
        <div class="pkg-help-row"><b>version</b><span>可选 · 仅 0-9 A-Z a-z . -，≤20 位。缺省 1.0.0</span></div>
        <div class="pkg-help-row"><b>entry</b><span>可选 · 包内真实存在的相对路径，缺省 index.html。禁绝对路径与 .. 穿越</span></div>
        <div class="pkg-help-row"><b>icon</b><span>可选 · png/jpg/jpeg/gif/webp/avif/ico/bmp/svg，≤512KB。缺省回退 favicon → 系统默认图标</span></div>
        <div class="pkg-help-row"><b>author</b><span>可选 · ≤40 字符</span></div>
        <div class="pkg-help-row"><b>description</b><span>可选 · ≤120 字符</span></div>
        <div class="pkg-help-row"><b>permissions</b><span>可选 · 字符串数组，白名单仅：camera / microphone / location / notifications / clipboard。未知项自动忽略</span></div>

        <div class="pkg-help-sec">④ 体量与文件白名单</div>
        <div class="pkg-help-row"><b>体量</b><span>压缩包 ≤30MB · 解压总量 ≤40MB · 单文件 ≤25MB · 条目 ≤800</span></div>
        <div class="pkg-help-row"><b>扩展名</b><span>html htm css js mjs json txt md xml csv map svg png jpg jpeg gif webp avif ico bmp woff woff2 ttf otf wav mp3 ogg m4a flac mp4 webm mov wasm（白名单之外拒绝安装）</span></div>
        <div class="pkg-help-row"><b>路径安全</b><span>禁绝对路径 / .. 穿越 / NUL / Windows 盘符；反斜杠自动归一</span></div>

        <div class="pkg-help-sec">⑤ 运行环境与系统能力（SDK）</div>
        <p class="pkg-help-p">应用运行在沙箱 iframe（opaque origin）：localStorage 不可用，持久化统一走 <code>window.__system.fs</code>。系统自动注入 SDK，无需自行引入。可用能力：</p>
        <div class="pkg-help-row"><b>事件</b><span>__system.emit(event, payload, target?) / broadcast(event, payload)</span></div>
        <div class="pkg-help-row"><b>跳转</b><span>__system.openApp(appId, { event, payload })</span></div>
        <div class="pkg-help-row"><b>分享</b><span>__system.share({ title, text, url })</span></div>
        <div class="pkg-help-row"><b>通知</b><span>__system.notify({ title, body })</span></div>
        <div class="pkg-help-row"><b>权限</b><span>__system.requestPermission(name) → Promise&lt;boolean&gt;</span></div>
        <div class="pkg-help-row"><b>文件</b><span>__system.fs.write / read / list / del / mkdir / exists / url（全部返回 Promise）</span></div>
        <div class="pkg-help-row"><b>剪贴板</b><span>__system.clipboard.write(payload) / read()</span></div>
        <div class="pkg-help-row"><b>主题</b><span>CSS 变量 --md-h 自动同步主题色，直接写 hsl(var(--md-h, 215) ...) 即可跟随系统</span></div>
        <div class="pkg-help-row"><b>手势</b><span>底部 68px 与左右边缘 36px 归系统手势，勿放关键交互</span></div>

        <div class="pkg-help-sec">⑥ 一键交给 AI 的提示词</div>
        <p class="pkg-help-p">复制下方全部内容发给任意 AI 助手（仅读这一段即可），它就能一次性产出可直接安装的合规安装包：</p>
        <button class="pkg-btn primary pkg-help-copy" id="pkgHelpCopy">复制提示词全文</button>
        <pre class="pkg-help-pre pkg-help-prompt" id="pkgAIPrompt">你是「md3 安装包」构建器。请为 Material Design 3 风格移动端 Web 桌面（md3）生成一个可直接安装的 .zip 安装包（扩展名 .mdapp 亦可）。只输出制作结果，不输出多余解释。

【包结构】
- manifest.json（必须，zip 根目录）
- index.html（入口，zip 根目录；除非 manifest.entry 另指定）
- 其余资源按相对路径引用，全部打进 zip

【manifest.json 规范】
{ "id": "com.example.myapp", "name": "我的应用", "version": "1.0.0", "entry": "index.html", "icon": "icon.svg", "author": "作者名", "description": "一句话简介（≤120字）", "permissions": ["notifications"] }
字段约束：
- id 必填：小写字母开头，仅 a-z 0-9 . _ -，2～40 位，禁止连续点（..）；安装后系统 id 为 pkg-&lt;id&gt;
- name 可选 ≤24 字符；缺省时依次回退：入口页 &lt;title&gt; → zip 文件名
- version 可选，仅 0-9 A-Z a-z . -，≤20 位，缺省 1.0.0
- entry 可选，包内真实存在的相对路径；缺省 index.html；禁止绝对路径与 .. 穿越
- icon 可选：png/jpg/jpeg/gif/webp/avif/ico/bmp/svg，≤512KB；缺省回退 favicon → 系统默认图标；svg 会被净化（剥 script / on* / 外链）
- permissions 可选数组，白名单仅：camera, microphone, location, notifications, clipboard；未知权限自动忽略

【硬限制】
zip ≤30MB；解压总量 ≤40MB；单文件 ≤25MB；条目 ≤800；文件扩展名必须在白名单内：html htm css js mjs json txt md xml csv map svg png jpg jpeg gif webp avif ico bmp woff woff2 ttf otf wav mp3 ogg m4a flac mp4 webm mov wasm

【运行环境（写代码时必须遵守）】
- 页面运行在沙箱 iframe（opaque origin）：禁止依赖 localStorage / sessionStorage（会抛 SecurityError）；持久化统一用 window.__system.fs
- 系统已在页面注入 SDK（pkg-sdk.js），直接使用 window.__system，无需自行引入
- __system 可用 API：
  · emit(event, payload, target?) / broadcast(event, payload)：跨应用事件
  · share({...})：调起系统分享面板
  · openApp(appId, { event, payload })：跳转其他应用
  · notify({ title, body })：系统通知
  · requestPermission(name)：申请 manifest 声明过的权限，返回 Promise&lt;boolean&gt;
  · fs.write(path, data, { mime? }) / fs.read(path) / fs.list(path) / fs.del(path) / fs.mkdir(path) / fs.exists(path) / fs.url(path)：虚拟文件系统，全部返回 Promise
  · clipboard.write(payload) / clipboard.read()：全局剪贴板
- 主题自动同步：CSS 变量 --md-h（主题色 hue）已注入，用 hsl(var(--md-h, 215) ...) 让应用跟随系统主题色
- 底部 68px 与左右 36px 边缘是系统手势区，不要在这些区域放关键交互
- 移动端竖屏优先，Material Design 3 视觉语言（大圆角、tonal 色、动态色）

【质量要求】
- 单页自包含优先：CSS/JS 内联或相对路径引用包内文件；不引用任何外网资源（必须离线可用）
- 所有交互真实可用，不做假按钮；字体 ≥14px，点击目标 ≥44px

【输出要求】
1. 完整列出 zip 内每个文件的最终内容（文件名 + 全文）
2. manifest.json 必须严格符合上述规范
3. 最后给出打包命令（zip -r myapp.mdapp .）与导入安装步骤</pre>
      </div>
    </div>
  </div>
</div>

<script>
(function(){
  'use strict';
  if (window.__pkgInstallerBooted) return;
  window.__pkgInstallerBooted = true;

  var api = window.__pkgInstallerAPI || null;
  var root = document.getElementById('pkgApp');
  if (!root) return;

  var S = { tab: 'pending', pending: [], installed: [], busy: false, sheetKey: null };

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s)
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;');
  }

  function fmtSize(b) {
    if (b == null) return '';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function snack(msg) {
    var el = $('pkgSnack');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(el.__t);
    el.__t = setTimeout(function() { el.classList.remove('on'); }, 2800);
  }

  var FALLBACK_ICON = '<svg viewBox="0 0 100 100" width="100%" height="100%"><rect width="100" height="100" rx="24" style="fill:hsl(calc(var(--md-h,215) + 8) 40% 46%)"/><path d="M30 40 L50 28 L70 40 L70 62 L50 74 L30 62 Z" fill="#FFFFFF" opacity="0.92"/></svg>';

  function iconBox(iconHTML) {
    return '<div class="pkg-ic">' + (iconHTML || FALLBACK_ICON) + '</div>';
  }

  function permIconSVG() {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
  }

  function emptyBlock(iconPath, title, sub) {
    return '<div class="pkg-empty"><div class="pkg-empty-ic"><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + iconPath + '</svg></div>'
      + '<div class="pkg-empty-t">' + esc(title) + '</div><div class="pkg-empty-s">' + esc(sub) + '</div></div>';
  }

  var EMPTY_PENDING = emptyBlock('<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>', '还没有待安装的压缩包', '点击下方「导入压缩包」，或在文件管理器里点开 zip 安装包');
  var EMPTY_INSTALLED = emptyBlock('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 12l2 2 4-5"/>', '还没有安装任何应用', '在「待安装」里点击压缩包即可安装；安装后图标出现在桌面');
  var EMPTY_NOAPI = emptyBlock('<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/>', '系统服务未就绪', '安装服务尚未完成初始化，稍后重开本页再试');

  function render() {
    var ti = $('pkgTitleIcon');
    if (ti && !ti.__done) {
      ti.innerHTML = (window.__appIconProbe && window.__appIconProbe.svg('installer')) || FALLBACK_ICON;
      ti.__done = true;
    }
    var nP = $('pkgNPending'), nI = $('pkgNInstalled');
    if (nP) nP.textContent = S.pending.length ? String(S.pending.length) : '';
    if (nI) nI.textContent = S.installed.length ? String(S.installed.length) : '';
    var list = $('pkgList');
    if (!list) return;
    if (!api) { list.innerHTML = EMPTY_NOAPI; return; }
    if (S.tab === 'pending') renderPending(list); else renderInstalled(list);
  }

  function renderPending(list) {
    if (!S.pending.length) { list.innerHTML = EMPTY_PENDING; return; }
    var h = '';
    for (var i = 0; i < S.pending.length; i++) {
      var p = S.pending[i];
      var pv = p.preview || {};
      var warn = (pv.warnings && pv.warnings.length) ? '<div class="pkg-warn">已自动识别 · ' + esc(pv.warnings[0]) + '</div>' : '';
      h += '<div class="pkg-card" data-key="' + esc(p.key) + '" role="button" tabindex="0" aria-label="安装 ' + esc(pv.name || p.zipName) + '">'
        + iconBox(pv.iconHTML)
        + '<div class="pkg-card-main">'
        + '<div class="pkg-card-name">' + esc(pv.name || p.zipName) + '</div>'
        + '<div class="pkg-card-meta">' + esc(pv.version || '1.0.0') + ' · ' + fmtSize(p.size) + '</div>'
        + '<div class="pkg-card-sub">' + esc(p.zipName) + '</div>'
        + warn
        + '</div>'
        + '<div class="pkg-card-go">安装</div>'
        + '</div>';
    }
    list.innerHTML = h;
  }

  function onDesktop(appId) {
    return !!(window.__pkgDesktopRoot || document).querySelector('.app-icon[data-id="' + appId + '"]');
  }

  function renderInstalled(list) {
    if (!S.installed.length) { list.innerHTML = EMPTY_INSTALLED; return; }
    var h = '';
    for (var i = 0; i < S.installed.length; i++) {
      var r = S.installed[i];
      var desktop = onDesktop(r.appId);
      var permN = (r.permissions && r.permissions.length) ? (r.permissions.length + ' 项权限') : '无敏感权限';
      h += '<div class="pkg-card static" data-appid="' + esc(r.appId) + '">'
        + iconBox(r.iconHTML)
        + '<div class="pkg-card-main">'
        + '<div class="pkg-card-name">' + esc(r.name) + '</div>'
        + '<div class="pkg-card-meta">v' + esc(r.version || '1.0.0') + ' · ' + fmtSize(r.size) + ' · ' + esc(permN) + '</div>'
        + '<div class="pkg-card-sub">' + (desktop ? '已在桌面' : '已从桌面移除') + ' · 安装于 ' + esc(new Date(r.installedAt || Date.now()).toLocaleDateString()) + '</div>'
        + '</div>'
        + '<div class="pkg-card-btns">'
        + (desktop ? '' : '<button class="pkg-btn ghost" data-reattach="' + esc(r.appId) + '">放回桌面</button>')
        + '<button class="pkg-btn ghost" data-open="' + esc(r.appId) + '">打开</button>'
        + '<button class="pkg-btn danger" data-uninstall="' + esc(r.appId) + '">卸载</button>'
        + '</div>'
        + '</div>';
    }
    list.innerHTML = h;
  }

  function refresh() {
    if (!api) { render(); return; }
    Promise.all([api.listPending(), api.listInstalled()]).then(function(rs) {
      S.pending = Array.isArray(rs[0]) ? rs[0] : [];
      S.installed = Array.isArray(rs[1]) ? rs[1] : [];
      render();
    }).catch(function() { render(); });
  }

  function closeSheet() {
    S.sheetKey = null;
    var ov = $('pkgSheetOverlay');
    if (ov) ov.classList.remove('on');
  }

  function openSheet(key) {
    var rec = null;
    for (var i = 0; i < S.pending.length; i++) if (S.pending[i].key === key) rec = S.pending[i];
    if (!rec) return;
    S.sheetKey = key;
    var pv = rec.preview || {};
    var mf = pv.manifest || {};
    var appId = mf.id ? ('pkg-' + mf.id) : '';
    var existing = null;
    for (var j = 0; j < S.installed.length; j++) if (S.installed[j].appId === appId) existing = S.installed[j];

    var meta = (api && api.permissionMeta) || {};
    var perms = pv.permissions || [];
    var permRows = '';
    if (!perms.length) {
      permRows = '<div class="pkg-perm-none">此应用未声明任何敏感权限</div>';
    } else {
      for (var k = 0; k < perms.length; k++) {
        var m = meta[perms[k]];
        permRows += '<div class="pkg-perm-row">' + permIconSVG()
          + '<div class="pkg-perm-txt"><div class="pkg-perm-name">' + esc(m ? m.label : perms[k]) + '</div>'
          + '<div class="pkg-perm-desc">' + esc(m ? m.desc : '自定义权限') + '</div></div></div>';
      }
    }

    var warns = '';
    if (pv.warnings && pv.warnings.length) {
      warns += '<div class="pkg-sheet-warns">';
      for (var w = 0; w < pv.warnings.length; w++) warns += '<div class="pkg-sheet-warn">' + esc(pv.warnings[w]) + '</div>';
      warns += '</div>';
    }

    var infoBits = '';
    if (pv.author) infoBits += '<div class="pkg-info-row"><span>作者</span><b>' + esc(pv.author) + '</b></div>';
    if (pv.description) infoBits += '<div class="pkg-info-row"><span>简介</span><b>' + esc(pv.description) + '</b></div>';
    infoBits += '<div class="pkg-info-row"><span>包体</span><b>' + esc(rec.zipName) + ' · ' + fmtSize(rec.size) + '</b></div>';

    var sheet = $('pkgSheet');
    sheet.innerHTML = '<div class="pkg-sheet-head">' + iconBox(pv.iconHTML)
      + '<div class="pkg-sheet-title"><div class="pkg-sheet-name">' + esc(pv.name || rec.zipName) + '</div>'
      + '<div class="pkg-sheet-ver">v' + esc(pv.version || '1.0.0') + (existing ? ' · 将覆盖已装的 v' + esc(existing.version || '1.0.0') : '') + '</div></div></div>'
      + '<div class="pkg-sheet-body">' + infoBits + warns
      + '<div class="pkg-perm-title">权限声明<span>安装后运行时仍会逐项询问</span></div>'
      + '<div class="pkg-perm-list">' + permRows + '</div></div>'
      + '<div class="pkg-sheet-foot">'
      + '<button class="pkg-btn ghost" data-sheet-cancel>取消</button>'
      + '<button class="pkg-btn primary" data-sheet-install="' + esc(key) + '">' + (existing ? '覆盖安装' : '安装') + '</button>'
      + '</div>';
    $('pkgSheetOverlay').classList.add('on');
  }

  function doInstall(key) {
    if (S.busy || !api) return;
    S.busy = true;
    var btn = document.querySelector('[data-sheet-install]');
    if (btn) { btn.textContent = '安装中…'; btn.setAttribute('disabled', 'true'); }
    api.installPending(key).then(function(r) {
      closeSheet();
      snack('已安装「' + r.name + '」' + (r.upgraded ? '（覆盖升级）' : '') + '，图标已放到桌面');
    }).catch(function(e) {
      snack('安装失败：' + ((e && e.message) || '未知错误'));
    }).then(function() { S.busy = false; refresh(); });
  }

  function askUninstall(appId) {
    var rec = null;
    for (var i = 0; i < S.installed.length; i++) if (S.installed[i].appId === appId) rec = S.installed[i];
    if (!rec) return;
    var box = $('pkgConfirm');
    box.innerHTML = '<div class="pkg-confirm-t">卸载「' + esc(rec.name) + '」？</div>'
      + '<div class="pkg-confirm-s">将同时清除它的权限记录与全部包数据，此操作不可恢复。</div>'
      + '<div class="pkg-confirm-btns"><button class="pkg-btn ghost" data-confirm-cancel>取消</button>'
      + '<button class="pkg-btn danger solid" data-confirm-uninstall="' + esc(appId) + '">卸载</button></div>';
    $('pkgConfirmOverlay').classList.add('on');
  }

  function closeConfirm() { var ov = $('pkgConfirmOverlay'); if (ov) ov.classList.remove('on'); }

  function doUninstall(appId) {
    if (S.busy || !api) return;
    S.busy = true;
    api.uninstallPackage(appId).then(function() {
      closeConfirm();
      snack('已卸载');
    }).catch(function(e) {
      snack('卸载失败：' + ((e && e.message) || '未知错误'));
    }).then(function() { S.busy = false; refresh(); });
  }

  function importFiles(files) {
    if (!api || !files || !files.length) return;
    if (S.busy) return;
    S.busy = true;
    snack('正在解析压缩包…');
    api.importFiles(files).then(function(results) {
      var ok = 0, fail = 0, firstErr = '';
      for (var i = 0; i < results.length; i++) {
        if (results[i].ok) ok++;
        else { fail++; if (!firstErr) firstErr = results[i].name + '：' + results[i].error; }
      }
      if (ok && fail) snack('导入完成：成功 ' + ok + ' 个，失败 ' + fail + ' 个');
      else if (ok) snack('导入完成：' + ok + ' 个压缩包待安装');
      else snack('导入失败：' + firstErr);
      S.tab = 'pending';
      syncTabs();
    }).catch(function(e) {
      snack('导入失败：' + ((e && e.message) || '未知错误'));
    }).then(function() { S.busy = false; refresh(); });
  }

  function syncTabs() {
    var tabs = root.querySelectorAll('.pkg-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i].getAttribute('data-t') === S.tab);
  }

  // ---------- v7.57：配置讲解 + AI 提示词（帮助面板） ----------
  function openHelp() {
    var ov = $('pkgHelpOverlay');
    if (ov) ov.classList.add('on');
  }

  function closeHelp() {
    var ov = $('pkgHelpOverlay');
    if (ov) ov.classList.remove('on');
  }

  function copyPrompt(btn) {
    var pre = $('pkgAIPrompt');
    if (!pre) return;
    var text = pre.textContent || '';
    var done = function() {
      if (!btn) return;
      var old = btn.getAttribute('data-old') || btn.textContent;
      btn.setAttribute('data-old', old);
      btn.textContent = '已复制';
      clearTimeout(btn.__t);
      btn.__t = setTimeout(function() { btn.textContent = old; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function() { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text); done();
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (err) {}
    try { document.body.removeChild(ta); } catch (err) {}
  }

  // ---------- 事件（根节点委托，内联脚本只执行一次） ----------
  root.addEventListener('click', function(e) {
    var t = e.target;
    if (t.closest('#pkgImportTop') || t.closest('#pkgImportFab')) { var fi = $('pkgFileInput'); if (fi) fi.click(); return; }
    var tab = t.closest('.pkg-tab');
    if (tab) { S.tab = tab.getAttribute('data-t'); syncTabs(); render(); return; }

    // v7.57：帮助面板（配置讲解 + AI 提示词）
    if (t.closest('#pkgHelpBtn')) { openHelp(); return; }
    if (t.closest('[data-help-close]')) { closeHelp(); return; }
    if (t.closest('#pkgHelpCopy')) { copyPrompt(t.closest('#pkgHelpCopy')); return; }
    if (t.id === 'pkgHelpOverlay') { closeHelp(); return; }

    if (t.closest('[data-sheet-cancel]')) { closeSheet(); return; }
    var inst = t.closest('[data-sheet-install]');
    if (inst) { doInstall(inst.getAttribute('data-sheet-install')); return; }
    if (t.closest('[data-confirm-cancel]')) { closeConfirm(); return; }
    var un2 = t.closest('[data-confirm-uninstall]');
    if (un2) { doUninstall(un2.getAttribute('data-confirm-uninstall')); return; }

    if (t.id === 'pkgSheetOverlay') { closeSheet(); return; }
    if (t.id === 'pkgConfirmOverlay') { closeConfirm(); return; }

    var openBtn = t.closest('[data-open]');
    if (openBtn) { api.openPkgApp(openBtn.getAttribute('data-open')).catch(function(err) { snack((err && err.message) || '打开失败'); }); return; }
    var reBtn = t.closest('[data-reattach]');
    if (reBtn) { api.reattachToDesktop(reBtn.getAttribute('data-reattach')).then(function() { snack('已放回桌面'); refresh(); }).catch(function(err) { snack((err && err.message) || '操作失败'); }); return; }
    var unBtn = t.closest('[data-uninstall]');
    if (unBtn) { askUninstall(unBtn.getAttribute('data-uninstall')); return; }

    var card = t.closest('.pkg-card[data-key]');
    if (card && !t.closest('button')) { openSheet(card.getAttribute('data-key')); return; }
  });

  root.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target.closest ? e.target.closest('.pkg-card[data-key]') : null;
    if (card) { e.preventDefault(); openSheet(card.getAttribute('data-key')); }
  });

  var fileInput = $('pkgFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      var fs = fileInput.files;
      if (fs && fs.length) importFiles(fs);
      fileInput.value = '';
    });
  }

  window.addEventListener('pkg-installer-refresh', refresh);

  refresh();
})();
</script>
`;

export default {
  id: 'installer',
  name: '安装包',
  isPkgHost: true,
  pages: [{ title: '安装包', content: installerHTML }],
};
