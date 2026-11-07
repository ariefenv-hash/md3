// ==================== appstore.js — 应用市场（v10.40 #183 一期 · v10.40 二期在线目录+外部项目） ====================
//
// #183 一期：NightSky「浏览/详情/已装/卸载」话语体系落到真数据 —— 静态展示壳退役
// （假应用/假价格/未定义演示动作钩子全数移除），宿主裁决 = 改造本壳不立新应用户口。
// #183 二期（R114）：①目录 fetch 链 CDN 优先→同源回退→全失降级 ②#172 外部项目账
// （externals 轻量壳：添加→桌面图标→iframe 直载→移除，无 SDK 边界诚实标注）
// ③目录版本语义三态（获取/已安装/可更新，compareVersions 纯函数）。
//
// 数据流（#178 孤岛判据消费面闭环）：
//   已装列表   ← window.__pkgInstallerAPI.listInstalled()（pkg-registry 桥，单一真源）
//   卸载全链   ← __pkgInstallerAPI.uninstallPackage()（IDB+桌面反注册+权限清除+实例销毁+SW 失效）
//   在线目录   ← fetch 链（catalogFetchChain：jsdelivr CDN → 同源 catalog.json）→ pkg-catalog.js 归一
//   获取安装   ← __pkgInstallerAPI.importBlob() → installPending()（analyzeZipBlob 校验 + 权限确认上桌）
//   外部项目   ← __pkgInstallerAPI.addExternalApp()/removeExternalApp()（#172 轻量壳，iframe 直载远程 url）
//   响应式同步 ← window 'pkg-installer-refresh' 事件（导入/安装/卸载/重挂四触发点，实例常驻后台同步）
//
// #179 准入六条对照：
//   ① var(--md-*) 全程零裸色（fallback 值仅作变量缺省兜底）  ② @media(min-width:768px) 断点
//   ③ 平板双栏 .as-grid（列表+目录并陈，非手机放大）        ④ 桥+事件接 pkg 体系非孤岛
//   ⑤ 融合圆角按压 = .m3e-btngroup 连体钮组（m3e.css 既有范式，卸载确认行）
//     —— 怠速柄滑条/波浪播放条在本应用无对应 UI 形态，诚实留点不硬造
//   ⑥ 脚手架模板不在本轮触碰面
//
// 降级纪律（#183 裁决硬要求）：目录 fetch/解析任何异常 → 「目录暂不可达」+ 已装列表照常，
//   零白屏零报错（e2e route.abort 注入实测锚）。

import { ICONS } from '../icons.js';

const AS_ICONS = ICONS;

/** 目录纯核（页面脚本经典脚本拿不到模块作用域 → 内容串挂 window.__asCatalogCore） */
import {
  normalizeCatalog,
  isUsableCatalog,
  CATALOG_URL,
  catalogFetchChain,
  compareVersions,
} from '../pkg/pkg-catalog.js';

// 页面脚本（经典脚本）拿不到模块作用域 → 纯核五件套挂 window 桥（唯一通道，e2e 亦经此断言）
if (typeof window !== 'undefined') {
  window.__asCatalogCore = { normalizeCatalog, isUsableCatalog, CATALOG_URL, catalogFetchChain, compareVersions };
}

export default {
  id: 'appstore',
  name: '应用商店',
  pages: [
    {
      title: '应用商店',
      content: `
        <style>
          .as-grid { display: grid; grid-template-columns: 1fr; gap: 16px; padding: 16px 0; }
          @media (min-width: 768px) {
            .as-grid { grid-template-columns: minmax(0, 5fr) minmax(0, 4fr); align-items: start; }
          }
          .as-state { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:var(--md-r-full, 999px);
            background:var(--md-surface-container-high, #e6e1e5); color:var(--md-on-surface-variant, #49454f);
            font-size:12.5px; margin-bottom:14px; }
          .as-state .as-dot { width:8px; height:8px; border-radius:50%; flex:none;
            background:var(--md-primary, #a8c8ff); }
          .as-state[data-as-mode="down"] .as-dot { background:var(--md-error, #b3261e); }
          .as-state[data-as-mode="loading"] .as-dot { opacity:.45; }
          .as-sec-title { font-size:15px; font-weight:600; color:var(--md-on-surface, #e8eaf0); margin:2px 0 10px; }
          .as-row { cursor:pointer; }
          .as-thumb { width:44px; height:44px; border-radius:12px; flex:none; display:flex; align-items:center;
            justify-content:center; font-size:20px; font-weight:600; color:var(--md-on-primary, #062e5f);
            background:hsl(var(--md-h, 215) 60% 45%); overflow:hidden; }
          .as-thumb svg { width:26px; height:26px; }
          .as-get { padding:6px 14px; font-size:12px; }
          .as-empty { padding:22px 16px; text-align:center; color:var(--md-on-surface-variant, #49454f); font-size:13px; }
          .as-import { display:flex; align-items:center; gap:12px; margin-top:14px; padding:14px 16px; cursor:pointer;
            border-radius:var(--md-r-md, 16px); background:var(--md-surface-container, #211f26);
            border:1px solid var(--md-outline-variant, #47464f); }
          .as-import svg { width:20px; height:20px; color:var(--md-primary, #a8c8ff); flex:none; }
          .as-import-title { font-size:13.5px; font-weight:600; color:var(--md-on-surface, #e8eaf0); }
          .as-import-sub { font-size:12px; color:var(--md-on-surface-variant, #49454f); margin-top:2px; }
          .as-toast { position:absolute; left:50%; bottom:22px; transform:translateX(-50%) translateY(8px);
            background:var(--md-surface-container-highest, #36343b); color:var(--md-on-surface, #e8eaf0);
            padding:9px 18px; border-radius:var(--md-r-full, 999px); font-size:13px; opacity:0; pointer-events:none;
            transition:opacity .2s ease, transform .2s ease; box-shadow:var(--md-shadow-1, 0 1px 3px rgba(0,0,0,.3)); max-width:82%; }
          .as-toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
          .as-confirm-ov { position:absolute; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center;
            justify-content:center; z-index:30; }
          .as-confirm-ov[hidden] { display:none; }
          .as-badge { font-size:11px; padding:2px 8px; border-radius:var(--md-r-full,999px); flex:none;
            background:var(--md-tertiary-container,#efd8e5); color:var(--md-on-tertiary-container,#221a2c); }
        </style>
        <div class="as-grid">
          <div>
            <div class="as-state" data-as-mode="loading" id="as-cat-state"><span class="as-dot"></span><span id="as-cat-state-text">目录检测中…</span></div>
            <div class="as-sec-title">我的应用</div>
            <div class="md3-card" style="padding:4px 0;overflow:hidden;">
              <div id="as-installed" data-test="as-installed"></div>
            </div>
            <div class="as-import" onclick="__asImport && __asImport()" role="button" data-test="as-import">
              ${AS_ICONS.upload_file}
              <div>
                <div class="as-import-title">导入安装包</div>
                <div class="as-import-sub">安装本地 .mdapp / .zip（安装包应用）</div>
              </div>
            </div>
          </div>
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div class="as-sec-title" style="margin-bottom:10px;">在线目录</div>
              <div style="font-size:12px;color:var(--md-primary,#a8c8ff);cursor:pointer;padding:4px 8px;" onclick="pushSubPage(2)" data-test="as-cat-more">全部 ›</div>
            </div>
            <div class="md3-card" style="padding:4px 0;overflow:hidden;">
              <div id="as-cat-home" data-test="as-cat-home"></div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;">
              <div class="as-sec-title" style="margin-bottom:10px;">外部项目</div>
              <div style="font-size:11.5px;color:var(--md-on-surface-variant,#49454f);padding:4px 8px;">轻量壳 · 无系统权限</div>
            </div>
            <div class="md3-card" style="padding:4px 0;overflow:hidden;">
              <div id="as-ext-home" data-test="as-ext-home"></div>
            </div>
          </div>
        </div>
        <div class="as-toast" id="as-toast" role="status"></div>
        <div class="as-confirm-ov" data-as-ext-confirm hidden data-test="as-ext-confirm">
          <div class="as-confirm-card">
            <div style="font-size:16px;font-weight:600;">移除这个外部项目？</div>
            <div style="font-size:13px;color:var(--md-on-surface-variant,#49454f);margin-top:6px;">仅移除桌面入口与本地记录，不影响外部站点本身。</div>
            <div class="m3e-btngroup" style="display:flex; margin-top:18px; width:100%;">
              <button class="m3e-bg-seg" data-as-ext-cancel style="flex:1; justify-content:center; height:40px;" data-test="as-ext-cancel">取消</button>
              <button class="m3e-bg-seg" data-as-ext-ok style="flex:1; justify-content:center; height:40px; color:var(--md-error,#b3261e);" data-test="as-ext-ok">移除</button>
            </div>
          </div>
        </div>
        <style>
          .as-confirm-card { background:var(--md-surface-container-high, #e6e1e5); color:var(--md-on-surface, #e8eaf0);
            border-radius:var(--md-r-xl, 28px); padding:22px 20px 16px; width:min(320px, 86%); box-shadow:var(--md-shadow-2, 0 2px 6px rgba(0,0,0,.4)); }
        </style>
        <script>
          (function () {
            if (window.__asBoot) { if (window.__asRefresh) window.__asRefresh(); return; }
            window.__asBoot = true;

            var AS = {
              installed: [],
              exts: [],               // 已添加外部应用（pkgStore 'externals'，#172 轻量壳账）
              catalog: null,          // normalizeCatalog 结果（pkg-catalog.js 归一产物）
              catState: 'loading',    // loading | ok | down
              catSource: '',          // 实际命中的 fetch 链位（CDN|同源，诚实展示）
              sel: '',                // 卸载确认当前选中的 appId
              extSel: ''              // 外部移除确认当前选中的 appId
            };

            function esc(s) {
              return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
              });
            }
            function fmtSize(n) {
              n = Number(n) || 0;
              if (n <= 0) return '—';
              if (n < 1024) return n + ' B';
              if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
              return (n / 1048576).toFixed(1) + ' MB';
            }
            function api() { return window.__pkgInstallerAPI || null; }
            function toast(msg) {
              var t = document.getElementById('as-toast');
              if (!t) return;
              t.textContent = msg;
              t.classList.add('show');
              clearTimeout(t.__timer);
              t.__timer = setTimeout(function () { t.classList.remove('show'); }, 2400);
            }
            function thumb(entry) {
              if (entry.iconHTML) return entry.iconHTML;
              var ch = (entry.name || '?').trim().charAt(0).toUpperCase() || '?';
              return '<div class="as-thumb">' + esc(ch) + '</div>';
            }
            function subOf(rec) {
              var bits = [];
              if (rec.version) bits.push('v' + rec.version);
              bits.push(fmtSize(rec.size));
              return esc(bits.join(' · '));
            }

            /* ---------- 已装列表 ---------- */
            function renderInstalled() {
              var box = document.getElementById('as-installed');
              if (!box) return;
              if (!api()) {
                box.innerHTML = '<div class="as-empty">安装服务未就绪（重启后重试）</div>';
                return;
              }
              var rows = '';
              for (var i = 0; i < AS.installed.length; i++) {
                var r = AS.installed[i];
                rows += '<div class="md3-list-item as-row" data-as-id="' + esc(r.appId) + '" data-test="as-app-row">'
                  + thumb(r)
                  + '<div class="md3-list-item-text"><div>' + esc(r.name) + '</div>'
                  + '<div class="md3-list-item-subtext">' + subOf(r) + '</div></div>'
                  + '<span style="color:var(--md-on-surface-variant,#49454f);font-size:18px;">›</span></div>';
                if (i < AS.installed.length - 1) {
                  rows += '<div style="height:1px;background:var(--md-outline-variant,#47464f);margin:0 16px;"></div>';
                }
              }
              box.innerHTML = rows || '<div class="as-empty" data-test="as-installed-empty">还没有安装包应用 —— 从右侧目录获取，或导入本地安装包</div>';
            }

            /* ---------- 目录条目安装态（二期版本语义） ---------- */
            // 已装记录匹配：pkg- 前缀安装 id（pkgAppId = 'pkg-' + manifest.id）与 pkgId 双路对齐
            function installedForEntry(e) {
              var wantPkg = 'pkg-' + (e.packageId || e.id);
              for (var i = 0; i < AS.installed.length; i++) {
                var r = AS.installed[i];
                if (r.appId === wantPkg || r.pkgId === e.id) return r;
              }
              return null;
            }
            function entryAction(e) {
              var inst = installedForEntry(e);
              if (!inst) {
                return e.downloadUrl
                  ? '<button class="md3-btn md3-btn-filled as-get" data-as-acquire="' + esc(e.id) + '" data-test="as-acquire">获取</button>'
                  : '<button class="md3-btn md3-btn-outlined as-get" data-as-import-jump="1">经安装器导入</button>';
              }
              var cmp = window.__asCatalogCore ? window.__asCatalogCore.compareVersions(inst.version, e.version) : null;
              if (cmp === -1 && e.downloadUrl) {
                // 目录版本 > 已装 → 可更新（覆盖安装链 installPending 已有 prev 检测，直接复用获取链）
                return '<button class="md3-btn md3-btn-filled as-get" data-as-acquire="' + esc(e.id) + '" data-test="as-upd" style="background:var(--md-tertiary,#ffd8e4);color:var(--md-on-tertiary,#31111d);">可更新</button>'
                  + '<span class="as-badge" data-test="as-upd-badge">v' + esc(e.version) + '</span>';
              }
              return '<span style="font-size:12px;color:var(--md-on-surface-variant,#49454f);padding:0 10px;" data-test="as-installed-badge">已安装 v' + esc(inst.version || '—') + '</span>';
            }

            /* ---------- 外部项目区块（#172 轻量壳） ---------- */
            function extAdded(id) {
              for (var i = 0; i < AS.exts.length; i++) if (AS.exts[i].extId === id || AS.exts[i].appId === 'ext-' + id) return AS.exts[i];
              return null;
            }
            function extRows(entries, compact) {
              if (!entries || !entries.length) {
                return '<div class="as-empty" data-test="as-ext-empty">目录未含外部项目</div>';
              }
              var rows = '';
              var n = compact ? Math.min(entries.length, 3) : entries.length;
              for (var i = 0; i < n; i++) {
                var e = entries[i];
                var added = extAdded(e.id);
                var action = added
                  ? '<button class="md3-btn md3-btn-outlined as-get" data-as-ext-remove="' + esc(e.id) + '" data-test="as-ext-remove">移除</button>'
                  : '<button class="md3-btn md3-btn-filled as-get" data-as-ext-add="' + esc(e.id) + '" data-test="as-ext-add">添加</button>';
                rows += '<div class="md3-list-item">'
                  + '<div class="as-thumb">' + (e.icon ? '<img src="' + esc(e.icon) + '" alt="" style="width:100%;height:100%;object-fit:cover;">' : esc((e.name || '?').charAt(0).toUpperCase())) + '</div>'
                  + '<div class="md3-list-item-text"><div>' + esc(e.name) + (added ? ' <span class="as-badge" data-test="as-ext-added-badge">已添加</span>' : '') + '</div>'
                  + '<div class="md3-list-item-subtext">外部站点 · iframe 轻量壳' + (e.description && !compact ? ' · ' + esc(e.description) : '') + '</div></div>'
                  + action + '</div>';
                if (i < n - 1) rows += '<div style="height:1px;background:var(--md-outline-variant,#47464f);margin:0 16px;"></div>';
              }
              return rows;
            }

            /* ---------- 目录区块 ---------- */
            function catRows(entries, compact) {
              var rows = '';
              var n = compact ? Math.min(entries.length, 4) : entries.length;
              for (var i = 0; i < n; i++) {
                var e = entries[i];
                rows += '<div class="md3-list-item">'
                  + '<div class="as-thumb">' + (e.icon ? '<img src="' + esc(e.icon) + '" alt="" style="width:100%;height:100%;object-fit:cover;">' : esc((e.name || '?').charAt(0).toUpperCase())) + '</div>'
                  + '<div class="md3-list-item-text"><div>' + esc(e.name) + '</div>'
                  + '<div class="md3-list-item-subtext">' + esc(e.version ? 'v' + e.version : '应用包') + ' · ' + fmtSize(e.size) + (e.description && !compact ? ' · ' + esc(e.description) : '') + '</div></div>'
                  + entryAction(e) + '</div>';
                if (i < n - 1) rows += '<div style="height:1px;background:var(--md-outline-variant,#47464f);margin:0 16px;"></div>';
              }
              return rows;
            }
            function renderCatalog() {
              var home = document.getElementById('as-cat-home');
              var full = document.getElementById('as-catalog-full');
              var extHome = document.getElementById('as-ext-home');
              var extFull = document.getElementById('as-ext-full');
              var st = document.getElementById('as-cat-state');
              var stText = document.getElementById('as-cat-state-text');
              var usable = window.__asCatalogCore && window.__asCatalogCore.isUsableCatalog(AS.catalog);
              var exts = (usable && AS.catalog && AS.catalog.externals) ? AS.catalog.externals : [];
              if (st) st.setAttribute('data-as-mode', AS.catState);
              if (stText) {
                var srcBit = AS.catState === 'ok' && AS.catSource ? ' · ' + AS.catSource : '';
                stText.textContent = AS.catState === 'ok' && usable
                  ? '在线目录 · ' + AS.catalog.apps.length + ' 款可获取' + (exts.length ? ' · ' + exts.length + ' 个外部项目' : '') + srcBit
                  : (AS.catState === 'loading' ? '目录检测中…' : '目录暂不可达 · 离线模式（已装应用不受影响）');
              }
              var html = usable ? catRows(AS.catalog.apps, false) : '';
              var extHtml = exts.length ? extRows(exts, false) : '';
              if (home) home.innerHTML = usable ? catRows(AS.catalog.apps, true) : '<div class="as-empty">目录暂不可达 —— 可经安装器导入本地安装包</div>';
              if (full) full.innerHTML = html || '<div class="as-empty">目录暂不可达（离线或未托管）。已装应用不受影响；可点击下方重试。</div>';
              if (extHome) extHome.innerHTML = exts.length ? extRows(exts, true) : '<div class="as-empty" data-test="as-ext-empty">目录未含外部项目</div>';
              if (extFull) extFull.innerHTML = extHtml || '<div class="as-empty">目录暂不可达，外部项目随之不可见；已添加入口照常可用。</div>';
            }
            function fetchChainJson() {
              var chain = (window.__asCatalogCore && window.__asCatalogCore.catalogFetchChain)
                ? window.__asCatalogCore.catalogFetchChain() : ['catalog.json'];
              var i = 0;
              function tryNext() {
                if (i >= chain.length) return Promise.reject(new Error('目录全链不可达'));
                var url = chain[i++];
                return fetch(url).then(function (res) {
                  if (!res.ok) throw new Error('HTTP ' + res.status);
                  return res.json();
                }).then(function (raw) {
                  // 命中位记录：CDN 判据 = 与首选位完全同串（纯串比对，不猜域名）
                  return { raw: raw, url: url, isCdn: i === 1 };
                }).catch(function (err) {
                  if (i < chain.length) return tryNext();
                  throw err;
                });
              }
              return tryNext();
            }
            function loadCatalog() {
              AS.catState = 'loading';
              renderCatalog();
              fetchChainJson()
                .then(function (hit) {
                  AS.catalog = window.__asCatalogCore.normalizeCatalog(hit.raw);
                  AS.catSource = hit.isCdn ? 'CDN' : '同源';
                  AS.catState = window.__asCatalogCore.isUsableCatalog(AS.catalog) ? 'ok' : 'down';
                })
                .catch(function () { AS.catalog = null; AS.catSource = ''; AS.catState = 'down'; })
                .then(renderCatalog);
            }

            /* ---------- 详情 / 卸载 ---------- */
            function findInstalled(appId) {
              for (var i = 0; i < AS.installed.length; i++) if (AS.installed[i].appId === appId) return AS.installed[i];
              return null;
            }
            function permLabel(key) {
              var meta = api() && api().permissionMeta;
              return (meta && meta[key] && meta[key].label) ? meta[key].label : key;
            }
            function renderDetail() {
              var box = document.getElementById('as-detail');
              var r = findInstalled(AS.sel);
              if (!box || !r) return;
              var perms = '';
              if (Array.isArray(r.permissions) && r.permissions.length) {
                for (var i = 0; i < r.permissions.length; i++) {
                  perms += '<span class="md3-chip" data-test="as-perm-chip">' + esc(permLabel(r.permissions[i])) + '</span>';
                }
              } else {
                perms = '<span style="font-size:12.5px;color:var(--md-on-surface-variant,#49454f);">无权限声明</span>';
              }
              box.innerHTML = ''
                + '<div class="md3-card md3-card-elevated" style="text-align:center;padding:24px 20px;">'
                + '<div style="width:80px;height:80px;border-radius:20px;margin:0 auto 14px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:600;color:var(--md-on-primary,#062e5f);background:hsl(var(--md-h,215) 60% 45%);box-shadow:var(--md-shadow-2,0 2px 6px rgba(0,0,0,.3));">' + (r.iconHTML || esc((r.name || '?').charAt(0).toUpperCase())) + '</div>'
                + '<div style="font-size:20px;font-weight:600;color:var(--md-on-surface,#e8eaf0);">' + esc(r.name) + '</div>'
                + '<div style="font-size:13px;color:var(--md-on-surface-variant,#49454f);margin-top:2px;">' + esc(r.author || '本地安装包应用') + '</div>'
                + '<div style="font-size:12.5px;color:var(--md-on-surface-variant,#49454f);margin-top:10px;">包名 <span style="font-family:monospace;">' + esc(r.pkgId || r.appId) + '</span> · v' + esc(r.version || '—') + ' · ' + fmtSize(r.size) + '</div>'
                + '<div style="font-size:12px;color:var(--md-on-surface-variant,#49454f);margin-top:4px;">安装于 ' + esc(new Date(r.installedAt || Date.now()).toLocaleDateString()) + '</div>'
                + '<button class="md3-btn md3-btn-filled" style="width:100%;margin-top:20px;background:var(--md-error,#b3261e);color:var(--md-on-error,#ffffff);" data-test="as-uninstall-btn" onclick="__asAskUninstall && __asAskUninstall()">卸载</button>'
                + '</div>'
                + '<div class="md3-card" style="margin-top:16px;"><div style="font-size:15px;font-weight:600;color:var(--md-on-surface,#e8eaf0);margin-bottom:8px;">权限声明</div>'
                + '<div style="display:flex;flex-wrap:wrap;gap:8px;">' + perms + '</div></div>'
                + (r.description ? '<div class="md3-card" style="margin-top:16px;"><div style="font-size:15px;font-weight:600;color:var(--md-on-surface,#e8eaf0);margin-bottom:8px;">应用简介</div><p style="font-size:13px;color:var(--md-on-surface-variant,#49454f);line-height:1.6;margin:0;">' + esc(r.description) + '</p></div>' : '');
            }
            function openDetail(appId) {
              var r = findInstalled(appId);
              if (!r) return;
              AS.sel = appId;
              renderDetail();
              if (window.pushSubPage) window.pushSubPage(1);
            }
            function askUninstall() {
              var ov = document.getElementById('as-confirm');
              if (ov) ov.hidden = false;
            }
            function confirmCancel() {
              var ov = document.getElementById('as-confirm');
              if (ov) ov.hidden = true;
            }
            function confirmOk() {
              var appId = AS.sel;
              var r = findInstalled(appId);
              confirmCancel();
              if (!api() || !r) return;
              api().uninstallPackage(appId).then(function () {
                toast('已卸载「' + (r.name || appId) + '」');
                if (window.popSubPage) window.popSubPage();
              }).catch(function (e) {
                toast('卸载失败：' + (e && e.message || '未知错误'));
              });
            }

            /* ---------- 获取安装（目录直链全链） ---------- */
            function acquire(entryId) {
              if (!window.__asCatalogCore || !window.__asCatalogCore.isUsableCatalog(AS.catalog)) return;
              var e = null;
              for (var i = 0; i < AS.catalog.apps.length; i++) if (AS.catalog.apps[i].id === entryId) e = AS.catalog.apps[i];
              if (!e) return;
              if (!e.downloadUrl) { window.__asImport(); return; }
              if (!api() || !api().importBlob) { toast('安装服务未就绪'); return; }
              toast('正在获取「' + e.name + '」…');
              fetch(e.downloadUrl)
                .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.blob(); })
                .then(function (blob) { return api().importBlob(blob, e.name + '.mdapp'); })
                .then(function (rec) { return api().installPending(rec.key); })
                .then(function () { toast('已安装「' + e.name + '」'); })
                .catch(function (err) { toast('获取失败：' + (err && err.message || '网络或包校验异常')); });
            }
            function importJump() {
              if (window.__shareSheet && window.__shareSheet.openAppById) window.__shareSheet.openAppById('installer');
            }

            /* ---------- 外部项目添加 / 移除（#172 轻量壳，二期） ---------- */
            function extAdd(entryId) {
              if (!window.__asCatalogCore || !window.__asCatalogCore.isUsableCatalog(AS.catalog)) return;
              var exts = AS.catalog.externals || [];
              var e = null;
              for (var i = 0; i < exts.length; i++) if (exts[i].id === entryId) e = exts[i];
              if (!e) return;
              if (!api() || !api().addExternalApp) { toast('安装服务未就绪'); return; }
              api().addExternalApp(e).then(function (r) {
                toast(r && r.updated ? '已更新「' + e.name + '」入口' : '已添加「' + e.name + '」到桌面');
              }).catch(function (err) {
                toast('添加失败：' + (err && err.message || '未知错误'));
              });
            }
            function extRemoveAsk(entryId) {
              var added = extAdded(entryId);
              if (!added) return;
              AS.extSel = added.appId;
              var ovs = document.querySelectorAll('[data-as-ext-confirm]');
              for (var i = 0; i < ovs.length; i++) ovs[i].hidden = false;
            }
            function extRemoveCancel() {
              var ovs = document.querySelectorAll('[data-as-ext-confirm]');
              for (var i = 0; i < ovs.length; i++) ovs[i].hidden = true;
              AS.extSel = '';
            }
            function extRemoveOk() {
              var appId = AS.extSel;
              extRemoveCancel();
              if (!appId || !api() || !api().removeExternalApp) return;
              api().removeExternalApp(appId).then(function (r) {
                toast('已移除「' + (r && r.name || appId) + '」');
              }).catch(function (e) {
                toast('移除失败：' + (e && e.message || '未知错误'));
              });
            }

            /* ---------- 事件委托（行点击 / 获取钮 / 确认组 / 外部项目） ---------- */
            document.addEventListener('click', function (ev) {
              var t = ev.target;
              var acq = t.closest ? t.closest('[data-as-acquire]') : null;
              if (acq) { acquire(acq.getAttribute('data-as-acquire')); return; }
              if (t.closest && t.closest('[data-as-import-jump]')) { importJump(); return; }
              var extAddBtn = t.closest ? t.closest('[data-as-ext-add]') : null;
              if (extAddBtn) { extAdd(extAddBtn.getAttribute('data-as-ext-add')); return; }
              var extRmBtn = t.closest ? t.closest('[data-as-ext-remove]') : null;
              if (extRmBtn) { extRemoveAsk(extRmBtn.getAttribute('data-as-ext-remove')); return; }
              if (t.closest && t.closest('[data-as-ext-cancel]')) { extRemoveCancel(); return; }
              if (t.closest && t.closest('[data-as-ext-ok]')) { extRemoveOk(); return; }
              var row = t.closest ? t.closest('[data-as-id]') : null;
              if (row) { openDetail(row.getAttribute('data-as-id')); return; }
              if (t.id === 'as-confirm-cancel') { confirmCancel(); return; }
              if (t.id === 'as-confirm-ok') { confirmOk(); return; }
            });

            /* ---------- 响应式同步（pkg 体系四触发点 → 重拉已装） ----------
             * 双保险：① 120ms 防抖（导入→安装双发合一，错开 installPending 尾部事务窗口）
             * ② 拉取失败重试二次（IDB 事务竞态实测：emitInstallerRefresh 后即刻 listInstalled
             *    在事务未释放窗口内会 rejected —— R113 探针二分实证，手动重拉即成功） */
            var refreshQueued = false;
            window.addEventListener('pkg-installer-refresh', function () {
              if (refreshQueued) return;
              refreshQueued = true;
              setTimeout(function () { refreshQueued = false; window.__asRefresh(); }, 120);
            });

            var refreshRetries = 0;
            window.__asRefresh = function () {
              if (!api()) { renderInstalled(); renderCatalog(); return; }
              api().listInstalled().then(function (list) {
                refreshRetries = 0;
                AS.installed = Array.isArray(list) ? list : [];
                // 二期：已添加外部应用同步拉取（桥未升级时宽容降级为空账）
                var extPull = api().listExternals ? api().listExternals() : Promise.resolve([]);
                return extPull.then(function (exts) {
                  AS.exts = Array.isArray(exts) ? exts : [];
                  renderInstalled();
                  renderCatalog();
                  renderDetail(); // 详情页开着且记录还在 → 刷新；被卸载则由 popSubPage 收场
                });
              }).catch(function () {
                if (refreshRetries < 2) { refreshRetries++; setTimeout(window.__asRefresh, 350); return; }
                refreshRetries = 0;
                AS.installed = [];
                renderInstalled();
              });
            };
            window.__asOpenDetail = openDetail;
            window.__asAskUninstall = askUninstall;
            window.__asConfirmOk = confirmOk;
            window.__asConfirmCancel = confirmCancel;
            window.__asAcquire = acquire;
            window.__asImport = importJump;
            window.__asLoadCatalog = loadCatalog;
            window.__asToast = toast;
            window.__asExtAdd = extAdd;
            window.__asExtRemoveAsk = extRemoveAsk;
            window.__asExtRemoveOk = extRemoveOk;
            window.__asExtRemoveCancel = extRemoveCancel;

            window.__asRefresh();
            loadCatalog();
          })();
        </script>
      `,
    },
    {
      title: '应用详情',
      content: `
        <style>
          #as-confirm { position:absolute; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center;
            justify-content:center; z-index:30; }
          #as-confirm[hidden] { display:none; }
          .as-confirm-card { background:var(--md-surface-container-high, #e6e1e5); color:var(--md-on-surface, #e8eaf0);
            border-radius:var(--md-r-xl, 28px); padding:22px 20px 16px; width:min(320px, 86%); box-shadow:var(--md-shadow-2, 0 2px 6px rgba(0,0,0,.4)); }
        </style>
        <div style="padding:16px 0;" data-test="as-detail-page">
          <div id="as-detail"></div>
        </div>
        <div id="as-confirm" hidden data-test="as-confirm">
          <div class="as-confirm-card">
            <div style="font-size:16px;font-weight:600;">卸载这个应用？</div>
            <div style="font-size:13px;color:var(--md-on-surface-variant,#49454f);margin-top:6px;">应用及其数据将从本机移除，此操作不可撤销。</div>
            <div class="m3e-btngroup" style="display:flex; margin-top:18px; width:100%;">
              <button class="m3e-bg-seg" id="as-confirm-cancel" style="flex:1; justify-content:center; height:40px;" data-test="as-confirm-cancel">取消</button>
              <button class="m3e-bg-seg" id="as-confirm-ok" style="flex:1; justify-content:center; height:40px; color:var(--md-error,#b3261e);" data-test="as-confirm-ok">卸载</button>
            </div>
          </div>
        </div>
      `,
    },
    {
      title: '在线目录',
      content: `
        <div style="padding:16px 0;" data-test="as-catalog-page">
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div id="as-catalog-full" data-test="as-catalog-full"></div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;">
            <div class="as-sec-title" style="margin-bottom:10px;">外部项目</div>
            <div style="font-size:11.5px;color:var(--md-on-surface-variant,#49454f);padding:4px 8px;">轻量壳 · 无系统权限</div>
          </div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div id="as-ext-full" data-test="as-ext-full"></div>
          </div>
          <div style="text-align:center;margin-top:14px;">
            <button class="md3-btn md3-btn-outlined" data-test="as-cat-retry" onclick="__asLoadCatalog && __asLoadCatalog()">重新检测目录</button>
          </div>
          <p style="font-size:12px;color:var(--md-on-surface-variant,#49454f);line-height:1.6;margin-top:14px;">
            目录经 jsdelivr CDN 拉取（同源回退，零自建服务）。获取动作经包校验（analyzeZipBlob）与权限确认后上桌，与安装器导入同一信任边界；外部项目为 iframe 直载轻量壳，不接入系统 SDK（#172 边界），移除仅删本地入口。
          </p>
        </div>
        <div class="as-confirm-ov" data-as-ext-confirm hidden>
          <div class="as-confirm-card" style="background:var(--md-surface-container-high, #e6e1e5); color:var(--md-on-surface, #e8eaf0); border-radius:var(--md-r-xl, 28px); padding:22px 20px 16px; width:min(320px, 86%); box-shadow:var(--md-shadow-2, 0 2px 6px rgba(0,0,0,.4));">
            <div style="font-size:16px;font-weight:600;">移除这个外部项目？</div>
            <div style="font-size:13px;color:var(--md-on-surface-variant,#49454f);margin-top:6px;">仅移除桌面入口与本地记录，不影响外部站点本身。</div>
            <div class="m3e-btngroup" style="display:flex; margin-top:18px; width:100%;">
              <button class="m3e-bg-seg" data-as-ext-cancel style="flex:1; justify-content:center; height:40px;">取消</button>
              <button class="m3e-bg-seg" data-as-ext-ok style="flex:1; justify-content:center; height:40px; color:var(--md-error,#b3261e);">移除</button>
            </div>
          </div>
        </div>
        <style>
          .as-confirm-ov { position:absolute; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:30; }
          .as-confirm-ov[hidden] { display:none; }
          .as-sec-title { font-size:15px; font-weight:600; color:var(--md-on-surface, #e8eaf0); margin:2px 0 10px; }
          .as-empty { padding:22px 16px; text-align:center; color:var(--md-on-surface-variant, #49454f); font-size:13px; }
        </style>
        <script>
          (function () {
            if (window.__asBoot && window.__asLoadCatalog) window.__asLoadCatalog();
          })();
        </script>
      `,
    },
  ],
};
