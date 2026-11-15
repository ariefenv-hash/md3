/* ==========================================================================
   lyric-views.js — music 歌词双簇单源核（#284 批16 · v11.45）
   ==========================================================================

   #284 巨石拆分批16：自 apps/music/index.html 内联主逻辑段整簇搬迁（逐字节保真，
   唯一语义差异 = class 方法 → 首参注入 app 的导出纯函数，`this.` → `app.`）。
   boundary-map §3.2 表前两簇：
     ① 歌词滚动渲染（v7.61 #46 面板 / v9.49 #173 逐字卡拉OK 消费端）
        prepareLyricsUI / toggleLyricsPanel / renderLyrics / updateLyricsHighlight
     ② 歌词制作编辑器（v9.13 #180，原 49 号独立应用并入；#251 IA 方案卡联动面）
        initLyricMaker / openLyricMaker / closeLyricMaker（含 window.__lyricMakerUI e2e 桥）
   §3.2 表第三簇（播放器 UI 绑定 + 媒体会话桥）留宿主零触碰。

   消费形态（#286 范式三形态学登记）：混合形态 —— 宿主 module 块 ESM import 挂
   window.__lyricViews 桥（__mediaMeta/__a17MediaWave 先例同律，defer 先于
   DOMContentLoaded，构造期必然就绪）+ tests 直接 ESM import（lyric-merge /
   lyric-views-single-source 双守护面）。委托行随簇走（宿主 G2 单源桥接），
   可选链守卫 = 打轴核缺位防御同律（桥缺位静默降级零抛错，等价原 core 缺位早退）。

   宿主全局依赖（classic 主脚本顶层函数声明 → global object 属性，跨脚本 bare 解析）：
     saveMusicPrefs(patch)          —— 歌词面板开关落盘（v7.44 双通道 prefs）
     fsReadTextSafe(path)           —— 草稿回读双引擎兼容（v9.13 #180 桥无 readText）
   打轴核依赖 window.__lyricCore（apps/music/lyric-core.js，#121/#180 单源核）：
     parseLrc / serializeLrc / fmtTime / clampMark / splitWords / karaokeAt /
     DEMO / exportJson / parseEnhancedLrc（v9.49 #173 词级标签保留）。

   DOM 契约（apps/music/index.html 结构零触碰）：#lyricsPanel/#lyricsList/
   #btnLyrics 行级 li.active + .wkw/.lw/.sung 逐字 span（dataset.t 消费契约=秒）；
   #lyricMakerView + lm* 25 元素 + .lm-lrow/.lm-tag/.lm-tx/.lm-del 行列表；
   快捷键 Space（打点）/ KeyP（播放/暂停）——仅二级界面打开时生效。
   ========================================================================== */

/* ---- ① 歌词滚动渲染（原 index.html L1575-1596 · v7.61）---- */
      /* ---- v7.61 歌词 UI：渲染 / 开关 / 跟随高亮 / 点击跳转 ---- */
export function prepareLyricsUI(app, track) {
    const has = !!(track && track.lyrics && track.lyrics.length);
    app.dom.btnLyrics.style.display = has ? '' : 'none';
    if (!has && app.lyricsOn) app.toggleLyricsPanel();
    if (app.lyricsOn) app.renderLyrics();
  }

export function toggleLyricsPanel(app) {
    app.lyricsOn = !app.lyricsOn;
    app.dom.btnLyrics.classList.toggle('active', app.lyricsOn);
    const track = app.tracks[app.currentIndex];
    if (app.lyricsOn) {
      app.dom.lyricsPanel.style.display = 'block';
      app.dom.canvas.style.display = 'none';
      app.renderLyrics();
    } else {
      app.dom.lyricsPanel.style.display = 'none';
      app.dom.canvas.style.display = 'block';
    }
    saveMusicPrefs({ lyricsOn: app.lyricsOn });
  }

export function renderLyrics(app) {
    const ul = app.dom.lyricsList;
    const track = app.tracks[app.currentIndex];
    ul.innerHTML = '';
    app._lyricEls = [];
    app._lyricActive = -1;
    const lyrics = track && track.lyrics;
    if (!lyrics || !lyrics.length) {
      const li = document.createElement('li');
      li.className = 'no-lyrics';
      li.textContent = '暂无歌词';
      app.dom.lyricsPanel.classList.add('no-lyrics');
      ul.appendChild(li);
      return;
    }
    app.dom.lyricsPanel.classList.remove('no-lyrics');
    const core = window.__lyricCore;
    const dur = app.audio.duration || 0;
    lyrics.forEach((l, i) => {
      const li = document.createElement('li');
      // 非同步歌词（整段 USLT）：时长可测后按时长均布时间戳
      const t = l.t >= 0 ? l.t : (l._plainIdx !== undefined && dur ? (l._plainIdx / lyrics.length) * dur : -1);
      if (t >= 0) {
        li.dataset.t = String(t);
        li.onclick = () => { app.audio.currentTime = t; if (app.audio.paused) app.togglePlay(); };
        // v9.49 #173 逐字卡拉OK：行内逐字 span 化——词级真实时戳（map 层已归一秒）优先，
        // 缺省 estimateWords 行区间毫秒均分 → 归一秒（dataset.t 消费契约秒，勿二次除算）；
        // 行区间钳可听时长：下一行越界 dur 时推进止于曲尾，不跨无音频区段
        if (core && l.text) {
          const nextT = (i + 1 < lyrics.length && lyrics[i + 1].t >= 0) ? lyrics[i + 1].t : (dur || t + 4);
          const nt = dur ? Math.min(nextT, dur) : nextT;
          const words = (l.words && l.words.length)
            ? l.words
            : core.estimateWords(l.text, Math.round(t * 1000), Math.round(nt * 1000)).map(w => ({ w: w.w, t: w.t / 1000 }));
          if (words.length) {
            li.classList.add('wkw');
            words.forEach(wd => {
              const sp = document.createElement('span');
              sp.className = 'lw';
              sp.textContent = wd.w;
              sp.dataset.t = String(wd.t);
              li.appendChild(sp);
            });
          } else {
            li.textContent = l.text;
          }
        } else {
          li.textContent = l.text;
        }
      } else {
        li.onclick = null;
        li.style.cursor = 'default';
        li.textContent = l.text;
      }
      app._lyricEls.push({ li, t });
      ul.appendChild(li);
    });
    app._lyricActive = -1;
    app._lyricWordLine = null; // v9.49 #173：逐字扫描行指针复位
    app.updateLyricsHighlight(true);
  }

export function updateLyricsHighlight(app, force = false) {
    if (!app.lyricsOn || !app._lyricEls || !app._lyricEls.length) return;
    if (app._lyricEls[0] && app._lyricEls[0].t < 0) return; // 纯静态（无时间标签且时长未知）
    const t = app.audio.currentTime || 0;
    // 顺序指针：歌词按时间升序，播放推进只需 O(1) 前进 / 一次回退扫描
    let idx = -1;
    for (let i = 0; i < app._lyricEls.length; i++) {
      if (app._lyricEls[i].t <= t + 0.05) idx = i; else break;
    }
    if (idx === app._lyricActive && !force) return;
    if (app._lyricActive >= 0 && app._lyricEls[app._lyricActive]) {
      app._lyricEls[app._lyricActive].li.classList.remove('active');
    }
    app._lyricActive = idx;
    if (idx >= 0) {
      const li = app._lyricEls[idx].li;
      li.classList.add('active');
      const vp = app.dom.lyricsPanel.clientHeight;
      const target = li.offsetTop - vp / 2 + li.offsetHeight / 2;
      app.dom.lyricsList.style.transform = `translateY(${(-Math.max(0, target)).toFixed(1)}px)`;
      // v9.49 #173 逐字卡拉OK：换行时清旧行已唱态，扫描行指针切换
      if (li !== app._lyricWordLine) {
        if (app._lyricWordLine) {
          app._lyricWordLine.querySelectorAll('.lw.sung').forEach(s => s.classList.remove('sung'));
        }
        app._lyricWordLine = li;
      }
    }
    // active 行内逐字着色：每 tick 对行内 span 扫描（O(行字数)，timeupdate 4Hz +
    // CSS transition 平滑）；seek 回退/前进均幂等（toggle 语义），与行级指针解耦
    if (app._lyricWordLine) {
      const now = t;
      app._lyricWordLine.querySelectorAll('.lw').forEach(sp => {
        sp.classList.toggle('sung', now >= (parseFloat(sp.dataset.t) || 0));
      });
    }
  }

/* ---- ② 歌词制作编辑器（原 index.html L1698-2013 · v9.13 #180）---- */
      /* ==================== v9.13 #180 歌词制作二级界面（原 49 号独立应用并入） ====================
       * 曲库与播放器同源（app.tracks = 本地选择/深链/VFS 恢复），打点跟随真实播放进度（同一 app.audio）；
       * 歌词草稿落 VFS /music/.lyric-draft.json（不新建 localStorage 键，#178 孤岛自查第 1 条）；
       * 存入曲库：写 /music/<题名>.lrc 并同步注入当前曲目 → v7.61 歌词面板即存即用
       * （生产端→消费端同应用闭环；词级渲染消费端属 #173，此处交付生产端与同核 karaokeAt）。 */
export function initLyricMaker(app) {
    const core = window.__lyricCore;
    app._lm = {
      open: false, lines: [], sel: -1, meta: { ti: '' },
      sim: { on: false, t: 0, last: 0 }, draftTimer: null, raf: 0,
      DRAFT_PATH: '/music/.lyric-draft.json'
    };
    if (!core || !app.dom.lyricMakerView) return; // 打轴核缺位防御（_lm 已建保证视图守卫可用）
    const self = app;

    app.lmToast = (msg) => {
      const el = app.dom.lmToast;
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove('show'), 1600);
    };

    /* ---- 播放源：真实曲目优先（跟随播放进度），否则模拟时钟 ---- */
    app.lmNow = () => {
      if (app._lm.sim.on) return app._lm.sim.t;
      const t = app.audio.currentTime || 0;
      return t > 0 ? t * 1000 : 0;
    };

    /* ---- 曲目下拉：与播放器共用曲库（VFS /music/ 同源） ---- */
    app.lmSyncTrackOptions = () => {
      const sel = app.dom.lmTrackSel;
      const cur = sel.value;
      sel.innerHTML = '<option value="-1">— 未选择曲目（可用模拟播放/演示）—</option>' +
        app.tracks.map((t, i) => '<option value="' + i + '">' +
          ((t.artist && t.artist !== '未知艺术家' ? t.artist + ' - ' : '') + (t.title || t.vfsName || '曲目 ' + (i + 1))).replace(/</g, '&lt;') + '</option>').join('');
      if (cur !== null && sel.querySelector('option[value="' + cur + '"]')) sel.value = cur;
    };
    app.dom.lmTrackSel.onchange = () => {
      const idx = parseInt(app.dom.lmTrackSel.value, 10);
      app._lm.sim.on = false;
      app.dom.lmSimBtn.textContent = '模拟播放';
      app.dom.lmSimBtn.classList.add('lm-ghost');
      if (idx >= 0 && idx < app.tracks.length) {
        app.loadTrack(idx, false); // 与播放器同一装载逻辑（只装载不自动播，自动播放策略友好）
        const t = app.tracks[idx];
        if (!app.dom.lmTi.value.trim()) app.dom.lmTi.value = t.title || '';
        // 当前曲目已有歌词且编辑器为空 → 预填（闭环起点：既有歌词可重打轴）
        if (t.lyrics && t.lyrics.length && !app._lm.lines.length) {
          app.dom.lmSrc.value = core.serializeLrc(
            t.lyrics.map((l) => ({ time: l.t >= 0 ? Math.round(l.t * 1000) : null, text: l.text }))
          );
        }
      }
    };
    app.dom.lmPlayBtn.onclick = () => app.togglePlay();
    app.dom.lmSimBtn.onclick = () => {
      const s = app._lm.sim;
      if (s.on) { s.on = false; app.dom.lmSimBtn.textContent = '模拟播放'; app.dom.lmSimBtn.classList.add('lm-ghost'); return; }
      s.on = true; s.last = 0;
      app.dom.lmSimBtn.textContent = '停止模拟';
      app.dom.lmSimBtn.classList.remove('lm-ghost');
    };

    /* ---- 打轴（clampMark 单调化 / 自动分配下一未定时行，与原 lyricmaker 同语义） ---- */
    app.lmMarkAt = (ms) => {
      const lines = app._lm.lines;
      const nextUntimed = () => { for (let i = 0; i < lines.length; i++) if (lines[i].time == null) return i; return -1; };
      const prevTimed = (idx) => { for (let i = idx - 1; i >= 0; i--) if (lines[i].time != null) return lines[i].time; return null; };
      let idx = nextUntimed();
      if (idx < 0 && app._lm.sel >= 0) idx = app._lm.sel;
      if (idx < 0) { app.lmToast('没有可打点的行：先「载入行」'); return -1; }
      lines[idx].time = core.clampMark(ms, prevTimed(idx));
      lines[idx].words = null; // 时间变了，逐字需重算
      app._lm.sel = idx;
      app.lmRender();
      app.lmSaveDraft();
      return idx;
    };
    app.dom.lmMarkBtn.onclick = () => { app.lmMarkAt(app.lmNow()); };
    app.dom.lmRemarkBtn.onclick = () => {
      if (app._lm.sel < 0) { app.lmToast('先在列表中选中一行'); return; }
      app._lm.lines[app._lm.sel].time = null;
      app._lm.lines[app._lm.sel].words = null;
      app.lmRender();
      app.lmToast('已清空第 ' + (app._lm.sel + 1) + ' 行时间，重新打点');
    };
    app.lmGenWords = () => {
      const lines = app._lm.lines;
      const timed = [];
      lines.forEach((l, i) => { if (l.time != null) timed.push(i); });
      if (!timed.length) { app.lmToast('先打点再生成逐字'); return; }
      timed.forEach((idx, k) => {
        const l = lines[idx];
        const end = k + 1 < timed.length ? lines[timed[k + 1]].time : l.time + 4000;
        l.words = core.splitWords(l.text, l.time, end);
      });
      app.lmToast('逐字对齐已生成（' + timed.length + ' 行）');
      app.lmSaveDraft();
    };
    app.dom.lmWordsBtn.onclick = () => app.lmGenWords();

    /* ---- 载入 ---- */
    app.lmLoadFromText = () => {
      const parsed = core.parseLrc(app.dom.lmSrc.value);
      if (!parsed.length) { app.lmToast('歌词源为空'); return; }
      app._lm.lines = parsed;
      app._lm.sel = -1;
      app._lm.meta.ti = app.dom.lmTi.value.trim() || app._lm.meta.ti;
      app.lmRender();
      app.lmSaveDraft();
      app.lmToast('已载入 ' + parsed.length + ' 行');
    };
    app.dom.lmLoadBtn.onclick = () => app.lmLoadFromText();
    app.lmLoadDemo = () => {
      app._lm.lines = core.DEMO.lines.map((l) => ({ time: l.time, text: l.text, words: null }));
      app._lm.meta.ti = core.DEMO.title;
      app.dom.lmTi.value = core.DEMO.title;
      app.dom.lmSrc.value = app._lm.lines.map((l) => '[' + core.fmtTime(l.time) + ']' + l.text).join('\n');
      app._lm.sel = -1;
      app.lmGenWords();
      app.lmRender();
      app.lmToast('演示已载入（6 行预打轴）');
    };
    app.dom.lmDemoBtn.onclick = () => app.lmLoadDemo();

    /* ---- 渲染（行列表 / 卡拉OK逐字预览） ---- */
    app.lmRender = () => {
      const box = app.dom.lmList;
      box.innerHTML = '';
      let untimed = 0;
      app._lm.lines.forEach((l, i) => {
        if (l.time == null) untimed++;
        const row = document.createElement('div');
        row.className = 'lm-lrow' + (i === app._lm.sel ? ' sel' : '');
        const tag = document.createElement('span');
        tag.className = 'lm-tag' + (l.time == null ? ' untimed' : '');
        tag.textContent = l.time == null ? '·····' : core.fmtTime(l.time);
        const tx = document.createElement('span');
        tx.className = 'lm-tx';
        tx.textContent = l.text;
        const del = document.createElement('button');
        del.className = 'lm-del';
        del.textContent = '×';
        del.title = '删除本行';
        del.onclick = (e) => { e.stopPropagation(); app._lm.lines.splice(i, 1); app._lm.sel = -1; app.lmRender(); app.lmSaveDraft(); };
        row.appendChild(tag); row.appendChild(tx); row.appendChild(del);
        row.onclick = () => { app._lm.sel = (app._lm.sel === i ? -1 : i); app.lmRender(); };
        box.appendChild(row);
      });
      app.dom.lmStat.textContent = '未定时 ' + untimed + ' / 共 ' + app._lm.lines.length + ' 行';
      const d = new Date();
      app.dom.lmDraftState.textContent = '草稿 · VFS ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    };

    app.lmRenderKaraoke = () => {
      if (!app._lm.open) return; // 二级界面未开 → 零 DOM 开销（rAF 常驻守卫）
      const t = app.lmNow();
      const k = core.karaokeAt(app._lm.lines, t);
      const cur = app.dom.lmKCur, nxt = app.dom.lmKNext;
      if (k.idx < 0 || !k.line) {
        cur.innerHTML = '<span class="lm-muted">载入歌词后开始预览</span>';
        nxt.textContent = '';
        return;
      }
      let html = '';
      k.words.forEach((w, i) => {
        const cls = 'w' + (i < k.wordIdx || (i === k.wordIdx && k.wordProgress >= 1) ? ' done'
          : (i === k.wordIdx && k.wordProgress > 0 ? ' on' : ''));
        html += '<span class="' + cls + '">' + w.w.replace(/</g, '&lt;') + '</span>';
      });
      cur.innerHTML = html || '<span class="lm-muted">（空行）</span>';
      const timed = app._lm.lines.filter((l) => l.time != null);
      nxt.textContent = (k.idx + 1 < timed.length) ? '下一句：' + timed[k.idx + 1].text : '— 尾句 —';
      const src = app._lm.sim.on ? ' / 模拟' : (app.audio.src ? ' / 音频' : '');
      app.dom.lmClock.innerHTML = core.fmtTime(t) + '<small>' + src + '</small>';
    };
    const lmTick = (ts) => {
      const s = app._lm.sim;
      if (s.on) {
        if (s.last) s.t += Math.min(100, ts - s.last);
        s.last = ts;
        if (s.t > 8 * 60000) { s.on = false; app.dom.lmSimBtn.textContent = '模拟播放'; app.dom.lmSimBtn.classList.add('lm-ghost'); }
      }
      app.lmRenderKaraoke();
      app._lm.raf = requestAnimationFrame(lmTick);
    };
    app._lm.raf = requestAnimationFrame(lmTick);

    /* ---- 导出 ---- */
    app.lmLrcText = () => core.serializeLrc(app._lm.lines, { ti: app._lm.meta.ti || app.dom.lmTi.value.trim() || '未命名' });
    app.lmJsonText = () => core.exportJson(app._lm.lines, { ti: app.dom.lmTi.value.trim() || '未命名' });
    app.lmDownload = (name, text, mime) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: mime || 'text/plain' }));
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
      app.lmToast('已下载 ' + name);
    };
    app.dom.lmDlLrc.onclick = () => app.lmDownload((app.dom.lmTi.value.trim() || 'lyrics') + '.lrc', app.lmLrcText());
    app.dom.lmDlJson.onclick = () => app.lmDownload((app.dom.lmTi.value.trim() || 'lyrics') + '.md3lyric.json', app.lmJsonText(), 'application/json');
    app.dom.lmCpLrc.onclick = () => {
      const txt = app.lmLrcText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(() => app.lmToast('LRC 已复制'), () => app.lmToast('复制失败（权限）'));
      } else app.lmToast('剪贴板不可用');
    };

    /* ---- 存入曲库：写 VFS /music/<题名>.lrc + 注入当前曲目（同应用闭环） ---- */
    app.lmSaveToLibrary = async () => {
      const text = app.lmLrcText();
      if (!text.trim()) { app.lmToast('无可导出的歌词'); return null; }
      if (!(window.__system && window.__system.fs)) { app.lmToast('VFS 不可用（独立运行无系统桥）'); return null; }
      const track = app.tracks[app.currentIndex];
      const base = (app.dom.lmTi.value.trim() || (track && ((track.title || '') || (track.vfsName || '').replace(/\.[^/.]+$/, ''))) || 'lyrics')
        .replace(/[\\/:*?"<>|]/g, '_');
      const path = '/music/' + base + '.lrc';
      // 桥形态：成功 resolve 条目 meta（{path,name,...}，无 .ok）；直驱形态：{ok,entry}；失败 reject
      let r = null;
      try { r = await window.__system.fs.write(path, text); } catch (e) { r = null; }
      if (!r || (r.ok === false)) { app.lmToast('VFS 写入失败' + (r && r.error ? '：' + r.error : '')); return null; }
      if (track) {
        // v9.49 #173：parseEnhancedLrc 接线——词级标签行保留 words（毫秒→秒），行级数据同构兼容
        track.lyrics = core.parseEnhancedLrc(text).map((l) => ({
          t: l.time == null ? -1 : l.time / 1000,
          text: l.text,
          words: (l.words && l.words.length) ? l.words.map(w => ({ w: w.w, t: w.t / 1000 })) : []
        }));
        app.prepareLyricsUI(track);
        if (app.lyricsOn) app.renderLyrics();
      }
      app.lmToast('已存入曲库：' + path + (track ? '（歌词面板即用）' : ''));
      return path;
    };
    app.dom.lmSaveBtn.onclick = () => app.lmSaveToLibrary();

    /* ---- 草稿：VFS /music/.lyric-draft.json（不新建 localStorage 键，#178 自查第 1 条） ---- */
    app.lmSaveDraft = () => {
      clearTimeout(app._lm.draftTimer);
      app._lm.draftTimer = setTimeout(() => app.lmSaveDraftNow(), 500);
    };
    app.lmSaveDraftNow = () => {
      if (!(window.__system && window.__system.fs)) return;
      try {
        window.__system.fs.write(app._lm.DRAFT_PATH, JSON.stringify({
          src: app.dom.lmSrc.value, ti: app.dom.lmTi.value, lines: app._lm.lines, sim: app._lm.sim.on
        })).catch(() => null);
      } catch (e) { /* VFS 不可用静默（同 fsWrite 回退语义） */ }
    };
    app.lmRestoreDraft = async () => {
      try {
        const txt = await fsReadTextSafe(app._lm.DRAFT_PATH);
        if (!txt) return false;
        const d = JSON.parse(txt);
        app.dom.lmSrc.value = d.src || '';
        app.dom.lmTi.value = d.ti || '';
        app._lm.lines = Array.isArray(d.lines) ? d.lines : [];
        app._lm.meta.ti = app.dom.lmTi.value;
        app.lmRender();
        return app._lm.lines.length > 0;
      } catch (e) { return false; }
    };
    app.dom.lmSrc.addEventListener('input', () => app.lmSaveDraft());
    app.dom.lmTi.addEventListener('input', () => { app._lm.meta.ti = app.dom.lmTi.value; app.lmSaveDraft(); });

    /* ---- 快捷键：仅二级界面打开时生效（不抢播放器全局键） ---- */
    document.addEventListener('keydown', (e) => {
      if (!app._lm.open) return;
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.code === 'Space') { e.preventDefault(); app.lmMarkAt(app.lmNow()); }
      if (e.code === 'KeyP') { e.preventDefault(); app.togglePlay(); }
    });

    /* ---- e2e 只读+驱动桥（同原 lyricmaker 形态，宿主为 music iframe） ---- */
    window.__lyricMakerUI = {
      get lines() { return self._lm.lines; },
      get sel() { return self._lm.sel; },
      get sim() { return self._lm.sim.on; },
      get isOpen() { return self._lm.open; },
      get draftPath() { return self._lm.DRAFT_PATH; },
      get currentTrackTitle() { const t = self.tracks[self.currentIndex]; return t ? (t.title || '') : ''; },
      now: () => self.lmNow(),
      markAt: (ms) => self.lmMarkAt(ms),
      loadDemo: () => self.lmLoadDemo(),
      loadFromText: () => self.lmLoadFromText(),
      genWords: () => self.lmGenWords(),
      exportLrc: () => self.lmLrcText(),
      exportJsonText: () => self.lmJsonText(),
      setSrc: (v) => { self.dom.lmSrc.value = v; },
      setTi: (v) => { self.dom.lmTi.value = v; },
      openPanel: () => self.openLyricMaker(),
      closePanel: () => self.closeLyricMaker(),
      saveDraftNow: () => self.lmSaveDraftNow(),
      restoreDraft: () => self.lmRestoreDraft(),
      saveToLibrary: () => self.lmSaveToLibrary()
    };
  }

export function openLyricMaker(app) {
    if (!app._lm) return;
    app._lm.open = true;
    app.lmSyncTrackOptions();
    app.updateViewState();
    app.lmRestoreDraft().then((ok) => { if (!ok) app.lmRender(); });
  }

export function closeLyricMaker(app) {
    if (!app._lm) return;
    app._lm.open = false;
    app.lmSaveDraftNow();
    app.updateViewState();
  }
