// ==================== ocr/app.mjs — Tesseract.js 5 挂载与接线（v8.52 #58） ====================
// 纯函数在 js/ocr-core.js（vitest 锚）；本模块只做 DOM/FS 桥/worker 接线。
// vendor 离线链路（零 CDN，nightsky「运行时拼 script」反例根除）：
//   · 主线程：../_shared/vendor/ocr/tesseract-bundle.mjs（esbuild ESM，具名导出
//     createWorker/OEM/PSM —— tesseract.js src/index.js 系 CJS，dist/tesseract.esm.min.js
//     实为 CJS 包装不可 import，自建 entry 具名再导出）；
//   · worker：workerBlobURL:false + workerPath 指向本地 worker.min.js（默认 true 会把
//     workerPath 包进 Blob 再 importScripts —— blob 基 URL 下相对 importScripts 不可靠，
//     直接以本地同源 URL 实例化 Worker 最稳；主线程 resolvePaths 已将相对路径按本
//     iframe 文档预解析为绝对 URL）；
//   · core：corePath 目录态 → worker-script/browser/getCore.js 特性探测自动选
//     tesseract-core-simd-lstm.wasm.js（主）/ tesseract-core-lstm.wasm.js（无 SIMD 回退）；
//   · 语言：langPath 目录态 → fetch ${langPath}/${lang}.traineddata.gz（best_int 档，
//     zlibjs worker 内解压，IndexedDB 缓存二次免载）。
import { createWorker, OEM } from '../_shared/vendor/ocr/tesseract-bundle.mjs';

(function () {
    'use strict';
    var core = window.__ocrCore;
    if (!core) return;

    // ---------- 元素 ----------
    var $ = function (id) { return document.getElementById(id); };
    var startBtn = $('ocStartBtn'), cancelBtn = $('ocCancelBtn'), importBtn = $('ocImportBtn');
    var langsRow = $('ocLangs'), view = $('ocView'), img = $('ocImg'), empty = $('ocEmpty');
    var zoombar = $('ocZoombar'), progressRow = $('ocProgress'), pfill = $('ocPfill'), ptext = $('ocPtext');
    var resultBox = $('ocResult'), resArea = $('ocResArea'), resCount = $('ocResCount'), copyBtn = $('ocCopyBtn');
    var stSrc = $('ocStSrc'), stDim = $('ocStDim'), stScaled = $('ocStScaled'), stSize = $('ocStSize'), stTime = $('ocStTime');
    var mask = $('ocMask'), vfsList = $('ocVfsList'), fileInput = $('ocFileInput'), toastEl = $('ocToast');
    var fontSlider = $('ocFontSlider'), histPanel = $('ocHistPanel'), histList = $('ocHistList'), histCount = $('ocHistCount');

    // ---------- 状态 ----------
    var state = core.loadState();
    var cur = { type: null, name: null, path: null, bytes: 0, blobUrl: null, w: 0, h: 0 };
    var busy = false;             // 识别中（worker 存活且 recognize 未决）
    var cancelled = false;        // 本次识别被用户取消（catch 分支据此分流文案）
    var zoom = 100;               // 当前缩放百分比（100 = 1:1）
    var workers = {};             // langs key → Worker 缓存（复用免重载；取消即 terminate 剔除）

    function persist() {
        state.last = cur.type === 'file' ? { type: 'file', name: cur.name }
                   : cur.type === 'vfs' ? { type: 'vfs', path: cur.path } : null;
        core.saveState(state);
    }

    // ---------- toast ----------
    var toastTimer = 0;
    function toast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
    }

    // ---------- FS 桥（FS_REQUEST → FS_RESULT；3s 超时兜底，midi-player 同款） ----------
    var fsSeq = 0;
    var fsPending = {};
    function fsCall(op, args) {
        return new Promise(function (resolve) {
            var rid = 'oc' + (++fsSeq) + '_' + Date.now();
            var timer = setTimeout(function () {
                if (fsPending[rid]) { delete fsPending[rid]; resolve({ ok: false, error: 'FS 超时' }); }
            }, 3000);
            fsPending[rid] = function (res) { clearTimeout(timer); resolve(res); };
            try {
                window.parent.postMessage({ type: 'FS_REQUEST', requestId: rid, op: op, args: args || {} }, '*');
            } catch (e) {
                clearTimeout(timer); delete fsPending[rid]; resolve({ ok: false, error: 'FS 桥不可用' });
            }
        });
    }
    window.addEventListener('message', function (e) {
        try {
            var d = e.data;
            if (!d || d.type !== 'FS_RESULT' || !d.requestId) return;
            var fn = fsPending[d.requestId];
            if (fn) { delete fsPending[d.requestId]; fn(d); }
        } catch (err) { /* 桥异常不影响本体 */ }
    });

    // ---------- 语言 5 档 chips ----------
    core.LANG_MODES.forEach(function (m) {
        var b = document.createElement('button');
        b.className = 'oc-lang';
        b.dataset.test = 'oc-lang-' + m.id;
        b.textContent = m.label;
        b.title = m.langs;
        b.addEventListener('click', function () {
            if (busy) { toast('识别中，请先取消'); return; }
            state.lang = m.id;
            core.saveState(state);
            applyLang();
        });
        langsRow.appendChild(b);
    });
    function applyLang() {
        Array.prototype.forEach.call(langsRow.children, function (b) {
            b.classList.toggle('active', b.dataset.test === 'oc-lang-' + state.lang);
        });
    }
    function currentMode() {
        return core.LANG_MODES.filter(function (m) { return m.id === state.lang; })[0] || core.LANG_MODES[0];
    }

    // ---------- 缩放条（适应 / 50 / 100 / 150 / 200） ----------
    var ZOOMS = ['fit', 50, 100, 150, 200];
    ZOOMS.forEach(function (z) {
        var b = document.createElement('button');
        b.className = 'oc-zoom';
        b.dataset.zoom = String(z);
        b.textContent = z === 'fit' ? '适应' : z + '%';
        b.addEventListener('click', function () {
            if (cur.type === null) { toast('先选择一张图片'); return; }
            if (z === 'fit') {
                view.classList.add('fit');
                img.style.width = '';
                img.style.transform = '';
            } else {
                view.classList.remove('fit');
                var w = (cur.w || img.naturalWidth) || 0;
                if (!w) return;
                var k = z / 100;
                img.style.width = Math.round(w * k) + 'px';
                img.style.transform = '';
            }
            zoom = z === 'fit' ? 100 : z;
            applyZoom();
        });
        zoombar.appendChild(b);
    });
    function applyZoom() {
        var fitOn = view.classList.contains('fit');
        Array.prototype.forEach.call(zoombar.querySelectorAll('.oc-zoom'), function (b) {
            // 适应态仅「适应」高亮；百分比态仅当前档高亮（互斥，避免双 active 视觉歧义）
            b.classList.toggle('active', b.dataset.zoom === 'fit' ? fitOn : (!fitOn && Number(b.dataset.zoom) === zoom));
        });
    }

    // ---------- 载入（统一入口：本地 File / VFS blob → 预览 + 门禁） ----------
    function releaseBlobUrl() {
        if (cur.blobUrl) {
            try { window.URL.revokeObjectURL(cur.blobUrl); } catch (e) { /* revoke 无害 */ }
            cur.blobUrl = null;
        }
    }
    function loadBlob(name, blob, srcType, srcPath) {
        var v = core.validateImage({ name: name, size: blob && blob.size });
        if (!v.ok) { toast(v.error); return; }
        // 像素门：img 解码后校验（30MP 上限，超巨图 canvas 重绘内存防御）
        releaseBlobUrl();
        var url = window.URL.createObjectURL(blob);
        cur.blobUrl = url;
        cur.type = srcType; cur.name = name; cur.path = srcPath || null; cur.bytes = blob.size;
        img.onload = function () {
            cur.w = img.naturalWidth; cur.h = img.naturalHeight;
            if (cur.w * cur.h > core.MAX_IMAGE_PIXELS) {
                resetToEmpty();
                toast('图片过大（' + cur.w + '×' + cur.h + ' > 30MP），无法处理');
                return;
            }
            empty.classList.add('hide');
            view.classList.add('show');
            zoombar.classList.add('show');
            // 默认适应档：重载 fit 类与宽度样式
            view.classList.add('fit');
            img.style.width = '';
            stSrc.textContent = name;
            stDim.textContent = cur.w + '×' + cur.h;
            stScaled.textContent = '—';
            stSize.textContent = core.fmtBytes(cur.bytes);
            stTime.textContent = '—';
            resArea.value = '';
            resultBox.classList.add('hide');
            startBtn.disabled = false;
            applyZoom();
            persist();
        };
        img.onerror = function () {
            resetToEmpty();
            toast('图片解码失败（文件损坏或格式不支持）');
        };
        img.src = url;
    }
    function resetToEmpty() {
        releaseBlobUrl();
        cur.type = null; cur.name = null; cur.path = null; cur.bytes = 0; cur.w = 0; cur.h = 0;
        img.removeAttribute('src');
        view.classList.remove('show');
        empty.classList.remove('hide');
        zoombar.classList.remove('show');
        resultBox.classList.add('hide');
        progressRow.classList.remove('show');
        startBtn.disabled = true;
        stSrc.textContent = '—'; stDim.textContent = '—'; stScaled.textContent = '—';
        stSize.textContent = '—'; stTime.textContent = '—';
        persist();
    }

    // ---------- worker 管理（缓存复用；取消即 terminate 剔除） ----------
    function makeLogger() {
        return function (m) {
            if (!m || typeof m.status !== 'string') return;
            var label = core.statusLabel(m.status);
            var pct = core.formatProgress(m.progress);
            if (m.status === 'recognizing text') {
                pfill.style.width = pct;
                ptext.textContent = label + ' ' + pct;
            } else {
                ptext.textContent = label;
            }
        };
    }
    function getWorker(langs) {
        if (workers[langs]) return Promise.resolve(workers[langs]);
        ptext.textContent = '准备引擎…';
        return createWorker(langs, OEM.LSTM_ONLY, {
            workerPath: '../_shared/vendor/ocr/worker.min.js',
            corePath: '../_shared/vendor/ocr/',
            langPath: '../_shared/vendor/ocr/langs',
            workerBlobURL: false,           // 本地同源 URL 直实例化（见文件头说明）
            logger: makeLogger(),
        }).then(function (w) {
            workers[langs] = w;
            return w;
        });
    }
    function dropWorker(langs) {
        var w = workers[langs];
        delete workers[langs];
        if (w) { try { w.terminate(); } catch (e) { /* 已终止无害 */ } }
    }

    // ---------- 识别主流程（含降采样与取消） ----------
    function downscaleToDataUrl() {
        var g = core.calcDownscale(cur.w, cur.h, core.MAX_LONG_EDGE);
        if (!g) return null;
        var canvas = document.createElement('canvas');
        canvas.width = g.w; canvas.height = g.h;
        var ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.imageSmoothingEnabled = true;
        try { ctx.imageSmoothingQuality = 'high'; } catch (e) { /* 老内核无此属性 */ }
        ctx.drawImage(img, 0, 0, g.w, g.h);
        stScaled.textContent = g.scaled ? g.w + '×' + g.h + '（↓' + Math.round(g.scale * 100) + '%）' : g.w + '×' + g.h + '（原尺寸）';
        return canvas.toDataURL('image/png');
    }
    function recognize() {
        if (busy) return;
        if (cur.type === null) { toast('先选择一张图片'); return; }
        var mode = currentMode();
        var dataUrl = downscaleToDataUrl();
        if (!dataUrl) { toast('降采样失败（画布不可用）'); return; }
        busy = true; cancelled = false;
        startBtn.disabled = true;
        cancelBtn.hidden = false;
        progressRow.classList.add('show');
        pfill.style.width = '0%';
        ptext.textContent = '准备中…';
        resArea.value = '';
        resultBox.classList.add('hide');
        var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
        getWorker(mode.langs).then(function (w) {
            return w.recognize(dataUrl).then(function (ret) {
                var text = ret && ret.data && typeof ret.data.text === 'string' ? ret.data.text : '';
                var conf = ret && ret.data && typeof ret.data.confidence === 'number' ? ret.data.confidence : null;
                var t1 = (window.performance && performance.now) ? performance.now() : Date.now();
                busy = false;
                cancelBtn.hidden = true;
                startBtn.disabled = false;
                progressRow.classList.remove('show');
                resArea.value = text;
                resCount.textContent = text.replace(/\s/g, '').length + ' 字';
                stTime.textContent = core.fmtMs(t1 - t0) + (conf != null ? ' · 置信 ' + Math.round(conf) + '%' : '');
                resultBox.classList.remove('hide');
                // v9.50 #181：识别完成 → 历史镜像（VFS 最近 20 条）+ notify（低频主动语义）
                if (text.replace(/\s/g, '').length) {
                    saveHistory(text, currentMode().label || currentMode().langs, conf);
                    notifyDone(text.replace(/\s/g, '').length);
                }
            });
        }).catch(function (e) {
            busy = false;
            cancelBtn.hidden = true;
            startBtn.disabled = cur.type === null ? true : false;
            if (cancelled) {
                ptext.textContent = '已取消';
                toast('已取消识别');
            } else {
                progressRow.classList.remove('show');
                toast('识别失败：' + (e && e.message || e));
            }
        });
    }
    function cancelRecognize() {
        if (!busy) return;
        cancelled = true;
        dropWorker(currentMode().langs);   // terminate 是 v5 中断在途 recognize 的唯一安全手段
        busy = false;
        cancelBtn.hidden = true;
        startBtn.disabled = cur.type === null ? true : false;
        // 关键：worker.terminate() 后在途 recognize/createWorker promise 永不 settle
        // （v5 内部 job 随 worker 一起湮灭，无拒绝回包）——「已取消」UI 必须同步自置，
        // 不能依赖 catch 分支回填（catch 仅为某些内核版本会 reject 的情形兜底，幂等）。
        ptext.textContent = '已取消';
    }
    startBtn.addEventListener('click', recognize);
    cancelBtn.addEventListener('click', cancelRecognize);

    // ---------- 复制（v9.50 #181：__system.clipboard.write 优先 → navigator.clipboard → execCommand，
    // #177 ocr 剪贴板缺口顺带补强 —— 沙盒宿主内桥优先，直开降级链不变） ----------
    function copyResult() {
        var text = resArea.value;
        if (!text) { toast('结果为空，无可复制内容'); return; }
        var fallback = function () {
            try {
                resArea.focus();
                resArea.select();
                var ok = document.execCommand && document.execCommand('copy');
                toast(ok ? '已复制到剪贴板' : '复制失败，请手动全选复制');
            } catch (e) { toast('复制失败，请手动全选复制'); }
        };
        var sys = (typeof window.__system === 'object' && window.__system) ? window.__system : null;
        if (sys && sys.clipboard && typeof sys.clipboard.write === 'function') {
            try {
                var r = sys.clipboard.write(text);
                var done = function () { toast('已复制到剪贴板'); };
                if (r && typeof r.then === 'function') r.then(done).catch(fallback); else done();
                return;
            } catch (e) { /* 桥异常走降级 */ }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                toast('已复制到剪贴板');
            }).catch(fallback);
        } else fallback();
    }
    copyBtn.addEventListener('click', copyResult);

    // ---------- v9.50 #181 识别历史（VFS /documents/ocr-history.json 最近 20 条镜像；
    //   fsCall 桥降级 resolve {ok:false} 静默，直开零炸）+ 识别完成 notify（低频主动语义） ----------
    var HIST_PATH = '/documents/ocr-history.json';
    var histItems = [];
    function loadHistory() {
        fsCall('read', { path: HIST_PATH }).then(function (r) {
            if (!r || !r.ok || !r.content) { renderHistory(); return; }   // 降级/空文件也渲染空态行
            try {
                var j = JSON.parse(r.content);
                if (Array.isArray(j.items)) { histItems = j.items.slice(0, 20); }
                renderHistory();
            } catch (e) { renderHistory(); /* 脏数据静默回落空态 */ }
        });
    }
    function saveHistory(text, langLabel, conf) {
        var chars = text.replace(/\s/g, '').length;
        histItems.unshift({ at: Date.now(), lang: langLabel, chars: chars,
                            conf: conf != null ? Math.round(conf) : null,
                            prev: text.replace(/\s+/g, ' ').trim().slice(0, 60),
                            full: text.slice(0, 5000) });   // 全文镜像上限 5000 字符（防历史文件膨胀）
        histItems = histItems.slice(0, 20);
        renderHistory();
        fsCall('write', { path: HIST_PATH, content: JSON.stringify({ format: 'md3-ocr-history', version: 1, items: histItems }) });
    }
    function renderHistory() {
        if (!histList) return;
        while (histList.firstChild) histList.removeChild(histList.firstChild);   // v852 DOM 组装纪律：removeChild 逐个移除，禁用整块标记注入
        histCount.textContent = histItems.length ? histItems.length + ' 条' : '';
        if (!histItems.length) {
            var emp = document.createElement('div');
            emp.className = 'oc-hist-empty';
            emp.textContent = '暂无识别历史';
            histList.appendChild(emp);
            return;
        }
        histItems.forEach(function (it) {
            var row = document.createElement('div');
            row.className = 'oc-hist-row';
            var meta = document.createElement('span');
            meta.className = 'meta';
            meta.textContent = it.lang + '·' + it.chars + '字' + (it.conf != null ? '·' + it.conf + '%' : '');
            var prev = document.createElement('span');
            prev.className = 'prev';
            prev.textContent = it.prev || '（无文本）';
            row.appendChild(meta); row.appendChild(prev);
            row.addEventListener('click', function () {
                // 历史回看：从 VFS 读回全文入结果区（prev 仅预览，正文以落盘镜像为准）
                fsCall('read', { path: HIST_PATH }).then(function (r) {
                    if (!r || !r.ok || !r.content) return;
                    try {
                        var j = JSON.parse(r.content);
                        var hit = (j.items || []).filter(function (x) { return x.at === it.at; })[0];
                        if (hit && hit.full) { resArea.value = hit.full; resultBox.classList.remove('hide'); toast('已回填历史识别结果'); }
                    } catch (e) { /* 静默 */ }
                });
            });
            histList.appendChild(row);
        });
    }
    function notifyDone(chars) {
        var sys = (typeof window.__system === 'object' && window.__system) ? window.__system : null;
        if (sys && typeof sys.notify === 'function') {
            try { sys.notify({ appId: 'ocr', appName: 'OCR 文字识别', title: '识别完成', desc: '本次共识别 ' + chars + ' 字，结果已入历史' }); } catch (e) { /* 沙盒语义豁免诚实标注 */ }
        }
    }
    renderHistory();   // v9.50：挂载即空态（fsCall 3s 超时降级前 histList 不空白）
    loadHistory();

    // ---------- v9.50 #181 结果字号怠速柄（0.85–1.3× → --res-font-scale 乘算 .oc-res-area 字号；
    //   --p 同步 track 渐变 + localStorage ocr-res-font-v1 持久化 reload 复验） ----------
    (function initResFontSlider() {
        if (!fontSlider) return;
        var KEY = 'ocr-res-font-v1';
        function apply(v, save) {
            var f = Math.min(1.3, Math.max(0.85, parseFloat(v) || 1));
            document.documentElement.style.setProperty('--res-font-scale', String(f));
            var min = parseFloat(fontSlider.min), max = parseFloat(fontSlider.max);
            fontSlider.style.setProperty('--p', Math.round(((f - min) / (max - min)) * 100) + '%');
            if (save) { try { localStorage.setItem(KEY, String(f)); } catch (e) { /* 隐私模式静默 */ } }
        }
        var saved = 1;
        try { saved = parseFloat(localStorage.getItem(KEY)) || 1; } catch (e) { /* 静默 */ }
        fontSlider.value = String(Math.min(1.3, Math.max(0.85, saved)));
        apply(fontSlider.value, false);
        fontSlider.addEventListener('input', function () { apply(fontSlider.value, false); });
        fontSlider.addEventListener('change', function () { apply(fontSlider.value, true); });
    })();

    // ---------- v9.50 #181 整排按压联动（pressRipple 轻量版：oc-lang/oc-btn 事件委托；
    //   胶囊基准 999px → 邻项距离衰减让位 + 圆角按基准形状形变（R62 在录坑②方向）） ----------
    (function initPressRipple() {
        var RIPPLE_BASE_R = 999;
        function pressOn(sibs, originIdx) {
            sibs.forEach(function (k, i) {
                if (k.disabled) return;
                var d = Math.abs(i - originIdx);
                var f = d === 0 ? 1 : Math.max(0, 1 - d * 0.45);
                var sc = d === 0 ? 0.9 : 1 - 0.04 * f;
                var shift = d === 0 ? 0 : (i < originIdx ? 1 : -1) * 2 * f;
                k.style.transform = 'translateX(' + shift.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
                k.style.borderRadius = (d === 0 ? RIPPLE_BASE_R : Math.round(RIPPLE_BASE_R - 260 * f)) + 'px';
                k.style.zIndex = d === 0 ? '1' : '';
            });
        }
        function releaseAll() {
            document.querySelectorAll('.oc-lang, .oc-btn').forEach(function (k) { k.style.transform = ''; k.style.borderRadius = ''; k.style.zIndex = ''; });
        }
        document.addEventListener('pointerdown', function (e) {
            var chip = e.target.closest('.oc-lang, .oc-btn');
            if (!chip) return;
            var sibs = Array.from(chip.parentElement.querySelectorAll('.oc-lang, .oc-btn'));
            pressOn(sibs, sibs.indexOf(chip));
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
            document.addEventListener(ev, releaseAll);
        });
    })();

    // ---------- 导入 sheet（#55 取消路径纪律） ----------
    function openSheet() {
        if (busy) { toast('识别中，请先取消'); return; }
        mask.classList.add('show');
        refreshVfsList();
    }
    function closeSheet() {
        mask.classList.remove('show');
        fileInput.value = '';       // 复位：同文件二次选择仍触发 change
    }
    importBtn.addEventListener('click', openSheet);
    $('ocSheetCancel').addEventListener('click', closeSheet);
    mask.addEventListener('click', function (ev) { if (ev.target === mask) closeSheet(); });
    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && mask.classList.contains('show')) {
            ev.stopImmediatePropagation();      // 消费语义：阻断宿主 Escape 链（v8.22 纪律）
            closeSheet();
        }
    });
    $('ocLocalBtn').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
        var f = fileInput.files && fileInput.files[0];
        closeSheet();                            // 选中/取消都收起（v8.22 分支外关闭纪律）
        if (!f) return;
        var url = window.URL.createObjectURL(f);
        var probe = new Image();
        probe.onload = function () {
            window.URL.revokeObjectURL(probe.src);
            loadBlob(f.name, f, 'file', null);
        };
        probe.onerror = function () {
            window.URL.revokeObjectURL(probe.src);
            toast('图片解码失败（文件损坏或格式不支持）');
        };
        probe.src = url;
    });
    fileInput.addEventListener('cancel', function () { closeSheet(); });   // 文件选择器取消路径

    // ---------- VFS 列表（/pictures /documents /downloads 根目录扫描） ----------
    var SCAN_DIRS = ['/pictures', '/documents', '/downloads', '/'];
    function refreshVfsList() {
        vfsList.textContent = '';
        var found = [];
        var seq = Promise.resolve();
        SCAN_DIRS.forEach(function (dir) {
            seq = seq.then(function () {
                return fsCall('list', { path: dir }).then(function (res) {
                    if (res && res.ok) {
                        found = found.concat(core.filterImageEntries((res.data && res.data.entries) || []));
                    }
                });
            });
        });
        return seq.then(function () {
            var seen = {};
            found = found.filter(function (e) { var k = e.path + '|' + e.name; if (seen[k]) return false; seen[k] = 1; return true; });
            if (!found.length) {
                var d = document.createElement('div');
                d.className = 'oc-vfs-empty';
                d.textContent = 'VFS 未发现图片文件（可先在相册或文件管理器导入）';
                vfsList.appendChild(d);
                return;
            }
            found.forEach(function (e) {
                var row = document.createElement('div');
                row.className = 'oc-vfs-row';
                row.dataset.test = 'oc-vfs-row';
                row.dataset.path = e.path;
                var nm = document.createElement('span');
                nm.textContent = e.path;
                var sz = document.createElement('span');
                sz.className = 'sz';
                sz.textContent = core.fmtBytes(e.size);
                row.appendChild(nm); row.appendChild(sz);
                row.addEventListener('click', function () { closeSheet(); loadVfs(e.path); });
                vfsList.appendChild(row);
            });
        });
    }
    function loadVfs(path) {
        return fsCall('read', { path: path }).then(function (res) {
            if (!res || !res.ok) { toast('读取失败：' + ((res && res.error) || '未知')); return false; }
            var entry = res.data || {};
            var blob = entry.blob;
            if (!blob) { toast('读取失败：VFS 无二进制载荷'); return false; }
            var name = (entry.meta && entry.meta.name) || path.split('/').pop() || path;
            loadBlob(name, blob, 'vfs', path);
            return true;
        }).catch(function (e) { toast('读取异常：' + (e && e.message || e)); return false; });
    }

    // ---------- 生命周期：冻结/隐藏/卸载 → 取消在途识别（CPU 资源回收纪律） ----------
    window.addEventListener('message', function (e) {
        try { if (e.data && e.data.type === 'APP_FREEZE') cancelRecognize(); } catch (err) { /* 无害 */ }
    });
    document.addEventListener('app-freeze', function () { cancelRecognize(); });
    window.addEventListener('pagehide', cancelRecognize);
    window.addEventListener('beforeunload', cancelRecognize);

    // ---------- 深链消费（inline __ocrDeepLink 缓冲 → 本 module 启动消费） ----------
    function consumeDeepLink(payload) {
        var p = core.parseDeepLink(payload);
        if (!p) { toast('深链缺 path 参数'); return; }
        loadVfs(p.path);
    }
    (window.__ocrDeepLink || []).forEach(consumeDeepLink);
    window.addEventListener('message', function (e) {
        try {
            var d = e.data;
            if (!d || d.type !== 'BUS_DELIVER' || d.event !== 'ocr/open') return;
            consumeDeepLink(d.payload);
        } catch (err) { /* 深链异常不影响本体 */ }
    });

    // ---------- 启动恢复：语言档 + VFS 来源（file 型不可持久化，仅记忆文件名） ----------
    applyLang();
    applyZoom();
    if (state.last && state.last.type === 'vfs') {
        loadVfs(state.last.path);
    }
})();
