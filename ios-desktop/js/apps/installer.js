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

  // ---------- 事件（根节点委托，内联脚本只执行一次） ----------
  root.addEventListener('click', function(e) {
    var t = e.target;
    if (t.closest('#pkgImportTop') || t.closest('#pkgImportFab')) { var fi = $('pkgFileInput'); if (fi) fi.click(); return; }
    var tab = t.closest('.pkg-tab');
    if (tab) { S.tab = tab.getAttribute('data-t'); syncTabs(); render(); return; }

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
