// ==================== midi-player/app.mjs — html-midi-player 挂载与接线（v8.51 #56） ====================
// 纯函数在 js/midi-player-core.js（vitest 锚）；本模块只做 DOM/FS 桥/元件接线。
// #181 第九批准入④⑤：SDK 双通道（notify 同曲门 + VFS 播放历史镜像）与 pressRipple
// 整排联动追加于本文件尾段——播放装载核心（loadBytes/stop/release 链）零触碰。
// 音频引擎（懒加载语义）：
//   · 默认「内置合成」—— 元件不带 sound-font 属性 → mm.Player = Tone 振荡器合成器，
//     首次 play 才实例化（零网络，离线可发声）；
//   · 「音源(SF)」—— 用户显式开启后写入 sound-font 属性 → SoundFontPlayer 懒拉取
//     采样（CDN），失败（离线/超时）自动回退内置合成并 toast —— 回退由 controls
//     class 的 error 态 MutationObserver 驱动。
import '../_shared/vendor/midi-player-bundle.mjs';

(function () {
    'use strict';
    var core = window.__midiPlayerCore;
    if (!core) return;

    // ---------- 元素 ----------
    var $ = function (id) { return document.getElementById(id); };
    var player = $('mpPlayer'), viz = $('mpViz'), stage = $('mpStage'), empty = $('mpEmpty');
    var samplesRow = $('mpSamples'), info = $('mpInfo');
    var stName = $('mpStName'), stFmt = $('mpStFmt'), stTrks = $('mpStTrks');
    var stNotes = $('mpStNotes'), stDur = $('mpStDur'), stSize = $('mpStSize');
    var mask = $('mpMask'), vfsList = $('mpVfsList'), fileInput = $('mpFileInput');
    var sfBtn = $('mpSfBtn'), importBtn = $('mpImportBtn'), toastEl = $('mpToast');

    // 可视化绑定重锚：bundle 内 customElements.define('midi-player') 先于 define('midi-visualizer')
    // 执行，midi-player upgrade 时其 attributeChangedCallback('visualizer') 立即跑
    // setVisualizerSelector → 当时 #mpViz 尚未 upgrade → instanceof 失败 → 绑定被丢弃
    // （控制台 'matched non-visualizer element' + 卷帘零渲染实证）。两个元件均已就绪的
    // module 启动期手动重锚一次。
    try { if (typeof player.setVisualizerSelector === 'function') player.setVisualizerSelector('#mpViz'); } catch (e) { /* 绑定失败不影响播放 */ }

    // ---------- 状态 ----------
    var state = core.loadState();
    var cur = { type: null, id: null, path: null, bytes: 0, blobUrl: null };
    var loading = false;

    function persist() {
        state.last = cur.type === 'sample' ? { type: 'sample', id: cur.id }
                   : cur.type === 'vfs' ? { type: 'vfs', path: cur.path } : null;
        core.saveState(state);
    }

    // ---------- toast ----------
    var toastTimer = 0;
    function toast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
    }

    // ---------- FS 桥（FS_REQUEST → FS_RESULT；3s 超时兜底，code-editor 同款） ----------
    var fsSeq = 0;
    var fsPending = {};
    function fsCall(op, args) {
        return new Promise(function (resolve) {
            var rid = 'mp' + (++fsSeq) + '_' + Date.now();
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

    // ---------- 载入（统一入口：sample / bytes） ----------
    // 切歌纪律：先 stop 旧播放 + revoke 旧 blob URL，再换 src —— 无音频泄漏、无 URL 泄漏。
    function stopPlayback() {
        try { if (typeof player.stop === 'function') player.stop(); } catch (e) { /* 未装载时 stop 无害 */ }
    }
    function releaseBlobUrl() {
        if (cur.blobUrl) {
            try { window.URL.revokeObjectURL(cur.blobUrl); } catch (e) { /* revoke 无害 */ }
            cur.blobUrl = null;
        }
    }

    function renderInfo(name, header, notes, bytes) {
        stName.textContent = name || '—';
        stFmt.textContent = header ? 'MIDI ' + header.format : '—';
        stTrks.textContent = header ? String(header.ntrks) : '—';
        stNotes.textContent = notes >= 0 ? String(notes) : '—';
        stDur.textContent = '—';    // 'load' 事件后由 ns.totalTime 回填
        stSize.textContent = core.fmtBytes(bytes);
        stage.classList.remove('hide');
        empty.classList.add('hide');
    }

    /** loadBytes(name, buf, srcMeta)：公共尾 —— 头校验 → 空曲目拒绝 → blob URL → 元件装载 */
    function loadBytes(name, buf, srcMeta) {
        var header = core.parseMidiHeader(buf);
        if (!header.ok) {
            toast('无法解析：' + header.error);
            return Promise.resolve(false);
        }
        var notes = core.scanNoteCount(buf);
        if (notes === 0) {
            // 0 音符序列的 totalTime 为 0（falsy），magenta 可视化横向定尺会 throw
            // （实测 pageerror: "does not have a totalQuantizedSteps or totalTime field"），
            // 且播放即空转瞬时停止 —— 装载层直接拒绝，整类退化输入不入元件。
            toast('空曲目（0 音符），无法播放');
            return Promise.resolve(false);
        }
        stopPlayback();
        releaseBlobUrl();
        cur.bytes = header.size;
        cur.blobUrl = window.URL.createObjectURL(new Blob([buf], { type: 'audio/midi' }));
        renderInfo(name, header, notes, header.size);
        recordHistory(name, notes);         // #181 准入④：装载成功 → 历史记录 + VFS 镜像（落点一）
        pushLoaded(name, notes, header.ntrks); // #181 准入④：低频 notify（同曲门）
        player.src = cur.blobUrl;           // 属性 → initPlayer（urlToNoteSequence fetch blob）
        loading = true;
        persist();
        return Promise.resolve(true);
    }

    function loadSample(s) {
        return fetch(s.file)
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
            .then(function (buf) {
                cur.type = 'sample'; cur.id = s.id; cur.path = null;
                return loadBytes(s.name, buf, s);
            })
            .then(function (ok) { if (ok) toast('已装载：' + s.name); return ok; })
            .catch(function (e) { toast('示例装载失败：' + (e && e.message || e)); return false; });
    }

    function loadVfs(path) {
        return fsCall('read', { path: path }).then(function (res) {
            if (!res || !res.ok) { toast('读取失败：' + ((res && res.error) || '未知')); return false; }
            var entry = res.data || {};
            var blob = entry.blob;
            if (!blob) { toast('读取失败：VFS 无二进制载荷'); return false; }
            return Promise.resolve(blob.arrayBuffer ? blob.arrayBuffer() : new Response(blob).arrayBuffer())
                .then(function (buf) {
                    cur.type = 'vfs'; cur.id = null; cur.path = path;
                    var name = (entry.meta && entry.meta.name) || path.split('/').pop() || path;
                    return loadBytes(name, buf, entry.meta);
                })
                .then(function (ok) { if (ok) toast('已装载：' + path); return ok; });
        }).catch(function (e) { toast('读取异常：' + (e && e.message || e)); return false; });
    }

    // ---------- 元件 load 事件：时长回填 + 静态卷帘预渲染 ----------
    player.addEventListener('load', function () {
        loading = false;
        try {
            var ns = player.ns;
            var total = ns && typeof ns.totalTime === 'number' ? ns.totalTime : 0;
            stDur.textContent = core.formatTime(total);
            // 未播先渲：装载即出静态卷帘（不依赖 _start 时的强制 reload；同 ns 时
            // 元件 setter 幂等早退，start 事件的 reload 仍会重绘高亮层）
            // 空序列（0 音符 → totalTime 0 falsy）会让 magenta 可视化横向定尺 throw，跳过预渲染
            if (ns && viz.ns !== ns && ns.totalTime > 0) viz.noteSequence = ns;
        } catch (e) { stDur.textContent = '—'; }
    });

    // ---------- 音源（sound-font）懒加载 + 失败自动回退 ----------
    function applySfLabel() {
        sfBtn.textContent = state.soundfont ? '音色：音源(SF)' : '音色：内置合成';
        sfBtn.classList.toggle('on', state.soundfont);
    }
    function setSoundfont(on) {
        state.soundfont = !!on;
        core.saveState(state);
        applySfLabel();
        if (on) {
            // 显式开启才写属性：SoundFontPlayer 采样懒拉取（CDN）；离线 → error 态 → 回退
            player.setAttribute('sound-font', '');
        } else {
            player.removeAttribute('sound-font');
        }
    }
    sfBtn.addEventListener('click', function () {
        if (!cur.type) { toast('先装载一首曲目再切换音色'); return; }
        setSoundfont(!state.soundfont);
        if (state.soundfont) {
            toast('音源采样加载中（需网络，失败自动回退）…');
            watchSfError();
        } else {
            toast('已切换：内置合成');
        }
    });
    var sfWatch = 0;
    /** error 态观察：sound-font 装载失败（离线/URL 不可达）→ 自动回退内置合成 */
    function watchSfError() {
        clearTimeout(sfWatch);
        var controls = player.shadowRoot && player.shadowRoot.querySelector('.controls');
        if (!controls) return;
        sfWatch = setTimeout(function () {
            if (state.soundfont && controls.classList.contains('error')) {
                setSoundfont(false);
                toast('音源不可用（离线）—— 已回退内置合成');
            }
        }, 6000);
    }

    // ---------- 示例 chips ----------
    core.SAMPLES.forEach(function (s) {
        var b = document.createElement('button');
        b.className = 'mp-chip';
        b.dataset.test = 'mp-sample-' + s.id;
        b.textContent = s.name;
        b.title = s.meta;
        b.addEventListener('click', function () { loadSample(s); });
        samplesRow.appendChild(b);
    });

    // ---------- 导入 sheet（#55 取消路径纪律） ----------
    function openSheet() {
        mask.classList.add('show');
        refreshVfsList();
    }
    function closeSheet() {
        mask.classList.remove('show');
        fileInput.value = '';       // 复位：同文件二次选择仍触发 change
    }
    importBtn.addEventListener('click', openSheet);
    $('mpSheetCancel').addEventListener('click', closeSheet);
    mask.addEventListener('click', function (ev) { if (ev.target === mask) closeSheet(); });
    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && mask.classList.contains('show')) {
            ev.stopImmediatePropagation();      // 消费语义：阻断宿主 Escape 链（v8.22 纪律）
            closeSheet();
        }
    });
    $('mpLocalBtn').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
        var f = fileInput.files && fileInput.files[0];
        closeSheet();                            // 选中/取消都收起（v8.22 分支外关闭纪律）
        if (!f) return;
        if (!core.isMidiName(f.name)) { toast('仅支持 .mid / .midi 文件'); return; }
        if (f.size > core.MAX_MIDI_BYTES) { toast('文件过大（' + core.fmtBytes(f.size) + ' > 5MB）'); return; }
        var bufP = f.arrayBuffer ? f.arrayBuffer() : new Response(f).arrayBuffer();
        bufP.then(function (buf) {
            cur.type = 'file'; cur.id = null; cur.path = null;
            // v9.15 #176 一期：导入的 .mid 同步沉淀 VFS /music/midi/（同名覆盖幂等）。
            // 此前只读不写（VFS 扫描在册但用户导入文件会话即弃）—— #176 实证表「接 VFS ❌」的写侧缺口。
            // 存档成功后刷新库列表，新文件立即可在 mpVfsList 选中；失败静默不阻塞装载。
            fsCall('write', { path: '/music/midi/' + f.name, data: new Blob([buf], { type: 'audio/midi' }) })
                .then(function (r) {
                    if (r && r.ok) { toast('已存入曲库：/music/midi/' + f.name); try { refreshVfsList(); } catch (e2) { /* 列表刷新失败不影响 */ } }
                });
            return loadBytes(f.name, buf, null);
        }).then(function (ok) { if (ok) toast('已导入：' + f.name); })
          .catch(function (e) { toast('导入失败：' + (e && e.message || e)); });
    });
    fileInput.addEventListener('cancel', function () { closeSheet(); });   // 文件选择器取消路径

    // ---------- VFS 列表（/music /documents /downloads 根目录扫描） ----------
    var SCAN_DIRS = ['/music', '/documents', '/downloads', '/'];
    function refreshVfsList() {
        vfsList.textContent = '';
        var found = [];
        var seq = Promise.resolve();
        SCAN_DIRS.forEach(function (dir) {
            seq = seq.then(function () {
                return fsCall('list', { path: dir }).then(function (res) {
                    if (res && res.ok) {
                        found = found.concat(core.filterMidiEntries((res.data && res.data.entries) || []));
                    }
                });
            });
        });
        return seq.then(function () {
            var seen = {};
            found = found.filter(function (e) { var k = e.path + '|' + e.name; if (seen[k]) return false; seen[k] = 1; return true; });
            if (!found.length) {
                var d = document.createElement('div');
                d.className = 'mp-vfs-empty';
                d.textContent = 'VFS 未发现 .mid / .midi 文件（可先在文件管理器或终端导入）';
                vfsList.appendChild(d);
                return;
            }
            found.forEach(function (e) {
                var row = document.createElement('div');
                row.className = 'mp-vfs-row';
                row.dataset.test = 'mp-vfs-row';
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

    // ---------- 生命周期：冻结/隐藏/卸载 → 停止播放（无音频泄漏纪律） ----------
    window.addEventListener('message', function (e) {
        try { if (e.data && e.data.type === 'APP_FREEZE') stopPlayback(); } catch (err) { /* 无害 */ }
    });
    document.addEventListener('app-freeze', function () { stopPlayback(); });
    window.addEventListener('pagehide', stopPlayback);
    window.addEventListener('beforeunload', stopPlayback);

    // ---------- 深链消费（inline __mpDeepLink 缓冲 → 本 module 启动消费） ----------
    function consumeDeepLink(payload) {
        var p = core.parseDeepLink(payload);
        if (!p) { toast('深链缺 path 参数'); return; }
        loadVfs(p.path);
    }
    (window.__mpDeepLink || []).forEach(consumeDeepLink);
    window.addEventListener('message', function (e) {
        try {
            var d = e.data;
            if (!d || d.type !== 'BUS_DELIVER' || d.event !== 'midi-player/open') return;
            consumeDeepLink(d.payload);
        } catch (err) { /* 深链异常不影响本体 */ }
    });

    /* =========================================================================
       #181 第九批准入④⑤：SDK 双通道 + 形态语言（播放装载核心零触碰）
       ④ notify（装载成功发一次，同曲重复装载不重发——低频门）+ VFS 播放历史镜像
          /documents/midi-player-history.json 最近 20 条 —— sysAvail/fsAvail 双守卫，
          宿主不可用（直开/E2E）全程静默降级零炸。历史主存 localStorage 独立键
          （core.saveState 走 normalizeState 白名单会剥未知字段，故不经 state）。
       ⑤ 整排按压联动 pressRipple 轻量版（mp-head/mp-samples 两排事件委托，
          欧氏距离衰减 240px 步进 0.08，pointerup/cancel/leave 三释放；
          平板纵向 chips 排同样适用——欧氏距离不依赖轴向）
       ========================================================================= */
    var sysAvail = function () { return !!(window.__system && window.__system.notify); };
    var fsAvail = function () { return !!(window.__system && window.__system.fs && typeof window.__system.fs.write === 'function'); };
    var MP_HISTORY_KEY = 'ios-desktop:midi-history-v1';
    var MP_HISTORY_PATH = '/documents/midi-player-history.json';
    var MP_HISTORY_CAP = 20;
    var lastNotifyKey = '';
    function pushNotify(title, body) {
        if (!sysAvail()) return;
        try { window.__system.notify({ title: title, body: body }); } catch (err) { /* 静默降级 */ }
    }
    function readHistory() {
        try { var v = JSON.parse(localStorage.getItem(MP_HISTORY_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
    }
    function writeHistory(list) {
        try { localStorage.setItem(MP_HISTORY_KEY, JSON.stringify(list.slice(-MP_HISTORY_CAP))); } catch (e) { /* 存储满静默 */ }
    }
    function recordHistory(name, notes) {
        var list = readHistory().filter(function (r) { return r && r.name !== name; });
        list.push({ name: name, notes: notes, ts: Date.now() });
        writeHistory(list);
        mirrorHistory();
    }
    function mirrorHistory() {
        if (!fsAvail()) return;
        try {
            window.__system.fs.write(MP_HISTORY_PATH, JSON.stringify({ app: 'midi-player', records: readHistory().slice(-MP_HISTORY_CAP) })).catch(function () {});
        } catch (err) { /* 静默降级 */ }
    }
    function pushLoaded(name, notes, ntrks) {
        var key = cur.type + ':' + (cur.id || cur.path || name);
        if (key === lastNotifyKey) return;      // 同曲重复装载不重发（低频门）
        lastNotifyKey = key;
        pushNotify('MIDI 播放器', '已装载：' + name + '（' + notes + ' 音符 · ' + ntrks + ' 轨）');
    }
    function setupPressRipple() {
        var REACH = 240, STEP = 0.08, SEL = '.mp-head, .mp-samples';
        var all = function (row) { return Array.prototype.slice.call(row.querySelectorAll('button')); };
        var release = function (row) { all(row).forEach(function (el) { el.style.transform = ''; }); };
        var activeRow = null;
        document.addEventListener('pointerdown', function (e) {
            var row = e.target.closest(SEL);
            if (!row || !e.target.closest('button')) return;
            activeRow = row;
            all(row).forEach(function (el) {
                var r = el.getBoundingClientRect();
                var k = Math.max(0, 1 - Math.hypot(e.clientX - (r.x + r.width / 2), e.clientY - (r.y + r.height / 2)) / REACH);
                el.style.transform = 'scale(' + (1 - STEP * k).toFixed(3) + ')';
            });
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
            document.addEventListener(t, function () {
                if (activeRow) { release(activeRow); activeRow = null; }
            });
        });
    }

    // ---------- 启动恢复：上次来源记忆（不自动播放） ----------
    applySfLabel();
    mirrorHistory();                    // #181 准入④：启动时恢复镜像（宿主在库时同步，落点二）
    setupPressRipple();                 // #181 准入⑤：整排按压联动（初始化置于 SDK 块后）
    if (state.last && state.last.type === 'sample') {
        var s = core.SAMPLES.filter(function (x) { return x.id === state.last.id; })[0];
        if (s) loadSample(s);
    } else if (state.last && state.last.type === 'vfs') {
        loadVfs(state.last.path);
    }
})();
