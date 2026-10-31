// ==================== code-editor/app.mjs — CM6 挂载与接线（v8.50 #32） ====================
// 纯函数在 js/code-editor-core.js（vitest 锚）；本模块只做 DOM/FS 桥/CM6 接线。
import {
  EditorView, EditorState, Compartment, keymap, Prec,
  lineNumbers, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars,
  history, historyKeymap, defaultKeymap, indentWithTab,
  syntaxHighlighting, HighlightStyle, tags,
  bracketMatching, indentOnInput, foldGutter, foldKeymap, codeFolding,
  autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap,
  highlightSelectionMatches, searchKeymap, search,
  javascript, html, css, python, placeholder,
  drawSelection, rectangularSelection, crosshairCursor, dropCursor,
} from '../_shared/vendor/codemirror-bundle.mjs';

(function () {
    'use strict';
    var core = window.__codeEditorCore;
    if (!core) return;

    // ---------- 元素 ----------
    var $ = function (id) { return document.getElementById(id); };
    var host = $('ceHost'), empty = $('ceEmpty'), tree = $('ceTree');
    var fileNameEl = $('ceFileName'), dirtyDot = $('ceDirtyDot'), langChip = $('ceLangChip');
    var wrapBtn = $('ceWrapBtn'), fontBtn = $('ceFontBtn');
    var stPath = $('ceStPath'), stPos = $('ceStPos'), stLines = $('ceStLines'), stSize = $('ceStSize'), stSave = $('ceStSave');
    var modal = $('ceModal'), modalTitle = $('ceModalTitle'), modalDir = $('ceModalDir'), modalInput = $('ceModalInput'), modalErr = $('ceModalErr');

    // ---------- 状态 ----------
    function loadState() {
        try { return JSON.parse(localStorage.getItem(core.STATE_KEY)); } catch (e) { return null; }
    }
    var state = core.normalizeState(loadState());
    function saveState() {
        try { localStorage.setItem(core.STATE_KEY, JSON.stringify(state)); } catch (e) { /* 存储满静默 */ }
    }
    var drafts = {};                 // path → 未保存 doc（切换零丢失锚：内容驻留内存，切回即恢复）
    var cur = { path: null, lang: null, size: 0, savedText: '' };
    var langComp = new Compartment();
    var wrapComp = new Compartment();
    var fontSizeComp = new Compartment();
    var view = null;
    var treeDirs = {};               // dirPath → 已展开 bool（懒展开树）
    var treeFiles = {};              // path → meta（快速查大小）

    // ---------- FS 桥（FS_REQUEST → FS_RESULT；3s 超时兜底，terminal 同款） ----------
    var fsSeq = 0;
    var fsPending = {};
    function fsCall(op, args) {
        return new Promise(function (resolve) {
            var rid = 'ce' + (++fsSeq) + '_' + Date.now();
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

    // ---------- toast ----------
    var toastTimer = 0;
    function toast(msg) {
        var t = $('ceToast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
    }

    // ---------- CM6 主题：md3 暗色 + Material 语法高亮 ----------
    var mdTheme = EditorView.theme({
        '&': { color: '#e3e1ec', backgroundColor: 'transparent', height: '100%' },
        '.cm-content': { fontFamily: "var(--ce-mono)", caretColor: '#bac8ff', padding: '10px 0 30px' },
        '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#bac8ff', borderLeftWidth: '2px' },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
            backgroundColor: 'rgba(70,100,180,.35)',
        },
        '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,.045)' },
        '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,.05)', color: '#e3e1ec' },
        '.cm-gutters': { backgroundColor: 'transparent', color: 'rgba(227,225,236,.38)', border: 'none' },
        '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 12px', minWidth: '34px' },
        '.cm-foldGutter .cm-gutterElement': { padding: '0 4px' },
        '.cm-selectionMatch': { backgroundColor: 'rgba(120,160,120,.28)' },
        '.cm-matchingBracket': { backgroundColor: 'rgba(120,150,220,.30)', outline: 'none' },
        '.cm-nonmatchingBracket': { color: '#f2b8b5' },
        '.cm-tooltip': { backgroundColor: '#2b2930', border: '1px solid rgba(255,255,255,.14)', borderRadius: '8px' },
        '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#46569a', color: '#e3e1ec' },
        '.cm-panels': { backgroundColor: '#2b2930', color: '#e3e1ec' },
        '.cm-searchMatch': { backgroundColor: 'rgba(160,120,60,.35)' },
        '.cm-searchMatch-selected': { backgroundColor: 'rgba(200,140,60,.55)' },
    }, { dark: true });

    var mdHighlight = HighlightStyle.define([
        { tag: tags.keyword, color: '#c8b1ff' },
        { tag: [tags.function(tags.variableName), tags.labelName], color: '#bac8ff' },
        { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: '#a8c7fa' },
        { tag: [tags.typeName, tags.className, tags.number, tags.changed, tags.annotation, tags.self, tags.namespace], color: '#ffb59d' },
        { tag: [tags.operator, tags.operatorKeyword], color: '#9fc7ff' },
        { tag: [tags.url, tags.escape, tags.regexp, tags.link], color: '#8fd4a0' },
        { tag: [tags.meta, tags.comment], color: 'rgba(227,225,236,.45)', fontStyle: 'italic' },
        { tag: tags.strong, fontWeight: 'bold' },
        { tag: tags.emphasis, fontStyle: 'italic' },
        { tag: tags.strikethrough, textDecoration: 'line-through' },
        { tag: tags.heading, fontWeight: 'bold', color: '#c8b1ff' },
        { tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: '#ffb59d' },
        { tag: [tags.processingInstruction, tags.string, tags.inserted], color: '#8fd4a0' },
        { tag: tags.invalid, color: '#f2b8b5' },
    ]);

    var LANG_FACTORY = {
        javascript: function () { return javascript(); },
        html: function () { return html(); },
        css: function () { return css(); },
        python: function () { return python(); },
    };
    function langExtFor(id) {
        var f = LANG_FACTORY[id];
        return f ? f() : [];
    }

    // ---------- 状态栏 ----------
    function setStatus(saveCls, saveText) {
        stSave.textContent = saveText;
        stSave.className = 'cell ' + (saveCls || '');
    }
    function updatePos() {
        if (!view) return;
        var sel = view.state.selection.main;
        var line = view.state.doc.lineAt(sel.head);
        stPos.textContent = 'Ln ' + (line.number) + ', Col ' + (sel.head - line.from + 1);
        stLines.textContent = view.state.doc.lines + ' 行';
    }
    function refreshChrome() {
        var name = cur.path ? core.baseName(cur.path) : '未打开文件';
        fileNameEl.textContent = name;
        dirtyDot.classList.toggle('on', !!state.dirty);
        langChip.textContent = core.langLabel(cur.lang);
        stPath.textContent = cur.path || '—';
        stSize.textContent = cur.path ? core.fmtBytes(cur.size) : '—';
        setStatus(state.dirty ? 'save-dirty' : 'save-ok', state.dirty ? '未保存' : '已同步');
        document.querySelectorAll('.ce-node').forEach(function (n) {
            n.classList.toggle('active', n.dataset.path === cur.path);
        });
    }

    // ---------- 编辑器 ----------
    function makeView() {
        var updateListener = EditorView.updateListener.of(function (u) {
            if (!u.docChanged && !u.selectionSet) return;
            if (u.docChanged) {
                var text = u.state.doc.toString();
                state.dirty = core.isDirty(text, cur.savedText);
                if (cur.path) drafts[cur.path] = text;
                refreshChrome();
            }
            updatePos();
        });
        var baseExts = [
            lineNumbers(),
            highlightActiveLineGutter(),
            highlightSpecialChars(),
            history(),
            foldGutter(),
            codeFolding(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            syntaxHighlighting(mdHighlight, { fallback: true }),
            bracketMatching(),
            closeBrackets(),
            autocompletion(),
            rectangularSelection(),
            crosshairCursor(),
            highlightActiveLine(),
            highlightSelectionMatches(),
            keymap.of([
                ...closeBracketsKeymap,
                ...defaultKeymap,
                ...searchKeymap,
                ...historyKeymap,
                ...foldKeymap,
                ...completionKeymap,
                indentWithTab,
            ]),
            saveKeymap(),
            langComp.of([]),
            wrapComp.of(state.wrap ? EditorView.lineWrapping : []),
            fontSizeComp.of(EditorView.theme({ '.cm-content': { fontSize: state.fontSize + 'px' } })),
            placeholder('未打开文件 — 从左侧文件树选择，或点「新建」'),
            mdTheme,
            updateListener,
        ];
        view = new EditorView({
            state: EditorState.create({ doc: '', extensions: baseExts }),
            parent: host,
        });
        return Promise.resolve(view);
    }

    function saveKeymap() {
        return Prec.highest(keymap.of([{
            key: 'Mod-s',
            run: function () { saveCurrent(); return true; },
            preventDefault: true,
        }]));
    }

    // ---------- 文件操作 ----------
    var openSeq = 0;                 // openFile 竞态守卫：启动恢复与深链补投并发时，过期回包丢弃（后发优先）
    function openFile(path, opts) {
        path = core.normalizePath(path);
        if (!path || path === '/') return Promise.resolve(false);
        var seq = ++openSeq;
        var load;
        if (Object.prototype.hasOwnProperty.call(drafts, path)) {
            load = Promise.resolve({ ok: true, text: drafts[path] });
        } else {
            load = fsCall('read', { path: path }).then(function (res) {
                if (!res || !res.ok) return { ok: false, error: (res && res.error) || '读取失败' };
                var entry = res.data || {};
                // v7.69 双引擎口径：字符串内容走 text 通道；OPFS 引擎内容是 Blob（text=null），
                // 结构化克隆直传后 blob.text() 解码（terminal readTextVia 同款）
                var size = (entry.meta && entry.meta.size) || 0;
                if (typeof entry.text === 'string') return { ok: true, text: entry.text, size: size || entry.text.length };
                if (entry.blob && typeof entry.blob.text === 'function') {
                    return entry.blob.text().then(function (t) {
                        return { ok: true, text: t, size: size || t.length };
                    });
                }
                return { ok: true, text: '', size: size };
            });
        }
        return load.then(function (r) {
            if (seq !== openSeq) return false;   // 过期回包：更新的 openFile 已发出，丢弃本次结果
            if (!r.ok) { toast((r.error || '打开失败') + '：' + path); return false; }
            var big = core.isBigFile(r.size || (r.text || '').length);
            var noWrapBig = core.shouldDisableWrap(r.size || (r.text || '').length);
            if (noWrapBig && state.wrap) {
                state.wrap = false;
                if (view) view.dispatch({ effects: wrapComp.reconfigure([]) });
                wrapBtn.classList.remove('on');
                saveState();
            }
            cur.path = path;
            cur.lang = core.detectLang(path);
            cur.size = r.size || (r.text || '').length;
            cur.savedText = r.text || '';
            state.path = path;
            state.dirty = false;
            saveState();
            if (view) {
                view.dispatch({
                    changes: { from: 0, to: view.state.doc.length, insert: cur.savedText },
                    effects: [
                        langComp.reconfigure(langExtFor(cur.lang)),
                    ],
                    selection: { anchor: 0 },
                    scrollIntoView: true,
                });
                view.focus();
            }
            empty.classList.add('hide');
            refreshChrome();
            updatePos();
            if (big) toast('大文件 ' + core.fmtBytes(cur.size) + ' · 已关闭自动换行');
            return true;
        });
    }

    function saveCurrent() {
        if (!view || !cur.path) { toast('未打开文件'); return; }
        var text = view.state.doc.toString();
        setStatus('', '保存中…');
        fsCall('write', { path: cur.path, data: text }).then(function (res) {
            if (!res || !res.ok) {
                setStatus('save-warn', '保存失败');
                toast('保存失败：' + ((res && res.error) || '未知错误'));
                return;
            }
            cur.savedText = text;
            cur.size = text.length;
            state.dirty = false;
            delete drafts[cur.path];
            saveState();
            refreshChrome();
            toast('已保存 ' + cur.path);
        });
    }

    // ---------- 新建 / 另存面板 ----------
    var modalMode = 'new';   // 'new' | 'saveas'
    function openModal(mode) {
        modalMode = mode;
        modalTitle.textContent = mode === 'new' ? '新建文件' : '另存为';
        var dir = cur.path ? core.dirName(cur.path) : '/documents';
        modalDir.textContent = '目录：' + dir;
        modalInput.value = mode === 'saveas' && cur.path ? core.baseName(cur.path) : '';
        modalErr.textContent = '';
        modal.classList.add('show');
        setTimeout(function () { modalInput.focus(); }, 60);
    }
    function closeModal() { modal.classList.remove('show'); }

    function confirmModal() {
        var dir = cur.path ? core.dirName(cur.path) : '/documents';
        var name = modalInput.value.trim();
        var p = core.joinPath(dir, name);
        if (!p) { modalErr.textContent = '文件名非法（不得含 / ）'; return; }
        if (modalMode === 'new') {
            fsCall('exists', { path: p }).then(function (res) {
                if (res && res.ok && res.data && res.data.exists) {
                    // 已存在 → 直接打开（草稿优先）
                    closeModal(); openFile(p); return;
                }
                fsCall('write', { path: p, data: '' }).then(function (w) {
                    if (!w || !w.ok) { modalErr.textContent = '创建失败：' + ((w && w.error) || '未知'); return; }
                    closeModal();
                    refreshTree().then(function () { openFile(p); });
                    toast('已创建 ' + p);
                });
            });
        } else {
            // 另存：写当前内容到新路径
            if (!view) { modalErr.textContent = '无内容可另存'; return; }
            var text = view.state.doc.toString();
            fsCall('write', { path: p, data: text }).then(function (w) {
                if (!w || !w.ok) { modalErr.textContent = '写入失败：' + ((w && w.error) || '未知'); return; }
                cur.savedText = text;
                state.dirty = false;
                var oldPath = cur.path;
                if (oldPath) delete drafts[oldPath];
                cur.path = p;
                cur.lang = core.detectLang(p);
                cur.size = text.length;
                state.path = p;
                saveState();
                closeModal();
                refreshTree();
                if (view) view.dispatch({ effects: langComp.reconfigure(langExtFor(cur.lang)) });
                refreshChrome();
                toast('已另存 ' + p);
            });
        }
    }

    // ---------- 文件树（VFS list；目录懒展开） ----------
    function nodeRow(meta, depth) {
        var row = document.createElement('div');
        row.className = 'ce-node ' + (meta.type === 'dir' ? 'dir' : 'file');
        row.dataset.path = meta.path;
        row.style.paddingLeft = (7 + depth * 12) + 'px';
        var ico = document.createElement('span');
        ico.className = 'ico';
        ico.textContent = meta.type === 'dir' ? '▸' : '·';
        var nm = document.createElement('span');
        nm.className = 'nm';
        nm.textContent = meta.name;
        row.appendChild(ico);
        row.appendChild(nm);
        if (meta.type === 'file' && typeof meta.size === 'number') {
            var sz = document.createElement('span');
            sz.className = 'sz';
            sz.textContent = core.fmtBytes(meta.size);
            row.appendChild(sz);
        }
        return row;
    }

    function renderDir(dirPath, entries, depth, mount) {
        var sorted = core.sortEntries(entries);
        sorted.forEach(function (m) {
            var row = nodeRow(m, depth);
            if (m.type === 'dir') {
                row.querySelector('.ico').textContent = treeDirs[m.path] ? '▾' : '▸';
                row.addEventListener('click', function () { toggleDir(m.path, depth, row); });
            } else {
                row.addEventListener('click', function () { openFile(m.path); });
            }
            mount.appendChild(row);
            if (m.type === 'dir' && treeDirs[m.path]) {
                var sub = document.createElement('div');
                sub.dataset.subdir = m.path;
                mount.appendChild(sub);
                loadDirInto(m.path, sub, depth + 1);
            }
        });
    }

    function loadDirInto(dirPath, mount, depth) {
        return fsCall('list', { path: dirPath }).then(function (res) {
            if (!res || !res.ok) { return; }
            renderDir(dirPath, (res.data && res.data.entries) || [], depth, mount);
        });
    }

    function toggleDir(dirPath, depth, row) {
        treeDirs[dirPath] = !treeDirs[dirPath];
        row.querySelector('.ico').textContent = treeDirs[dirPath] ? '▾' : '▸';
        var existing = tree.parentElement.querySelector('[data-subdir="' + dirPath + '"]');
        if (treeDirs[dirPath]) {
            var sub = document.createElement('div');
            sub.dataset.subdir = dirPath;
            row.insertAdjacentElement('afterend', sub);
            loadDirInto(dirPath, sub, depth + 1);
        } else if (existing) {
            existing.remove();
        }
    }

    function refreshTree() {
        tree.textContent = '';
        return fsCall('list', { path: '/' }).then(function (res) {
            if (!res || !res.ok) {
                var e = document.createElement('div');
                e.className = 'ce-tree-empty';
                e.textContent = 'VFS 未就绪（' + ((res && res.error) || '未知') + '）——稍后点 ⟳ 重试';
                tree.appendChild(e);
                return;
            }
            renderDir('/', (res.data && res.data.entries) || [], 0, tree);
        });
    }

    // ---------- 深链：终端 `code <file>` → code-editor/open ----------
    window.addEventListener('message', function (e) {
        try {
            var d = e.data;
            if (!d || d.type !== 'BUS_DELIVER' || d.event !== core.DEEP_LINK_EVENT) return;
            var p = core.parseDeepLink(d.payload);
            if (!p) { toast('深链缺 path 参数'); return; }
            openFile(p.path).then(function (ok) {
                if (ok) toast('来自终端：' + p.path);
            });
        } catch (err) { /* 深链异常不影响本体 */ }
    });

    // ---------- 按钮 ----------
    $('ceSaveBtn').addEventListener('click', saveCurrent);
    $('ceNewBtn').addEventListener('click', function () { openModal('new'); });
    $('ceSaveAsBtn').addEventListener('click', function () { openModal('saveas'); });
    $('ceModalCancel').addEventListener('click', closeModal);
    $('ceModalOk').addEventListener('click', confirmModal);
    modalInput.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') confirmModal();
        if (ev.key === 'Escape') closeModal();
    });
    modal.addEventListener('click', function (ev) { if (ev.target === modal) closeModal(); });
    $('ceRefreshBtn').addEventListener('click', function () { refreshTree(); });
    wrapBtn.classList.toggle('on', state.wrap);
    wrapBtn.addEventListener('click', function () {
        state.wrap = !state.wrap;
        wrapBtn.classList.toggle('on', state.wrap);
        if (view) view.dispatch({ effects: wrapComp.reconfigure(state.wrap ? EditorView.lineWrapping : []) });
        saveState();
    });
    fontBtn.textContent = state.fontSize + 'px';
    fontBtn.addEventListener('click', function () {
        var steps = [12, 13, 14, 16, 18];
        var i = steps.indexOf(state.fontSize);
        state.fontSize = steps[(i + 1) % steps.length];
        fontBtn.textContent = state.fontSize + 'px';
        if (view) view.dispatch({ effects: fontSizeComp.reconfigure(EditorView.theme({ '.cm-content': { fontSize: state.fontSize + 'px' } })) });
        saveState();
    });

    // ---------- 启动：恢复上次文件 → 消费缓冲深链（module 加载期暂存） → 否则空态 ----------
    function consumeDeepLinks() {
        var arr = window.__ceDeepLink || [];
        window.__ceDeepLink = [];
        for (var i = 0; i < arr.length; i++) {
            var p = core.parseDeepLink(arr[i]);
            if (p) openFile(p.path).then(function (ok) { if (ok) toast('来自终端：' + cur.path); });
        }
    }
    makeView().then(function () {
        refreshTree();
        if (window.__ceDeepLink && window.__ceDeepLink.length) {
            consumeDeepLinks();          // 深链优先于上次文件恢复
        } else if (state.path) {
            openFile(state.path);
        } else {
            refreshChrome();
        }
    });
})();
