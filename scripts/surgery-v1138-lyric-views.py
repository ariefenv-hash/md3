#!/usr/bin/env python3
# surgery-v1138-lyric-views.py — #284 批16：music/index.html 歌词双簇单源搬迁 lyric-views.js
#
# 簇（boundary-map §3.2 表前两簇 · v11.37 现树行号 1-based）：
#   歌词滚动渲染  L1575–1696：prepareLyricsUI / toggleLyricsPanel / renderLyrics / updateLyricsHighlight
#   歌词制作编辑器 L1698–2013：initLyricMaker / openLyricMaker / closeLyricMaker（含 window.__lyricMakerUI e2e 桥）
# 宿主保留（§3.2 表第三簇）：播放器 UI 绑定 + 媒体会话桥 + boot/恢复/消息协议。
#
# 手术规则：
#   1. 簇体逐字节搬迁，唯一语义差异 = 方法→纯函数（首参注入 app），`this.` → `app.`、`const self = this` → `const self = app`
#   2. 宿主原位替换为委托行（G2 单源桥接；可选链守卫 = core 缺位防御同律，桥缺位时静默降级零抛错）
#   3. module 块新增 import + window.__lyricViews 桥（__mediaMeta/__a17MediaWave 先例同律；defer 先于 DOMContentLoaded）
#   4. 边界断言先行（锚行不匹配即拒绝落盘）；落盘后回读终验（簇体唯一差异 = this→app / export 包裹）
import re
import sys

SRC = 'ios-desktop/apps/music/index.html'
DST = 'ios-desktop/apps/music/lyric-views.js'

with open(SRC, 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')  # 0-based; 文档行号 = idx+1

def at(n0, expect):
    """1-based 行断言"""
    got = lines[n0 - 1]
    if expect not in got:
        print(f'FAIL 边界断言 L{n0}: 期望含 {expect!r}，实得 {got[:80]!r}')
        sys.exit(1)

# ---- 边界断言（v11.37 现树） ----
at(1575, '/* ---- v7.61 歌词 UI：渲染 / 开关 / 跟随高亮 / 点击跳转')
at(1576, 'prepareLyricsUI(track) {')
at(1581, '}')
at(1583, 'toggleLyricsPanel() {')
at(1596, '}')
at(1598, 'renderLyrics() {')
at(1658, '}')
at(1660, 'updateLyricsHighlight(force = false) {')
at(1696, '}')
at(1698, '/* ==================== v9.13 #180 歌词制作二级界面')
at(1703, 'initLyricMaker() {')
at(1998, '}')
at(2000, 'openLyricMaker() {')
at(2006, '}')
at(2008, 'closeLyricMaker() {')
at(2013, '}')
at(2015, '/* ---- 桌面集成：宿主「导入本地音乐」浮层投递')

# ---- 簇体提取（1-based 闭区间） ----
def block(a, b):
    return lines[a - 1:b]

c_render_comment = block(1575, 1575)     # 歌词 UI 簇头注
c_render = block(1576, 1696)             # prepare/toggle/render/updateHighlight 四方法体（含中间空行）
c_maker_comment = block(1698, 1702)      # 歌词制作簇考证链头注
c_maker = block(1703, 2013)              # init/open/close 三方法体（含中间空行）

def to_pure(body, fname, params, extra_header=None):
    """方法体 → 导出纯函数：缩进降 4（class 方法 6 空格 → 模块顶层 2 空格）、this.→app.、self=this→app"""
    out = []
    for ln in body:
        # 降 4 空格缩进（方法体恒 ≥6 空格起）
        if ln.strip():
            assert ln.startswith('      '), f'缩进异常: {ln[:60]!r}'
            ln = ln[4:]
        # this. → app.（词边界；簇内无字符串字面量含 this. 已由前置扫描证实）
        ln = re.sub(r'\bthis\.', 'app.', ln)
        out.append(ln)
    text = '\n'.join(out)
    # const self = this; → const self = app;（initLyricMaker 桥闭包捕获，桥 getters 引用 self）
    text = text.replace('const self = this;', 'const self = app;')
    head = f'export function {fname}({params}) {{'
    body_text = text
    # 首行是方法签名行（如 prepareLyricsUI(track) {）→ 换成纯函数签名
    first = body_text.split('\n', 1)
    sig = re.match(r'\s*(?:async )?(\w+)\(([^)]*)\) \{$', first[0])
    assert sig, f'签名行不识别: {first[0]!r}'
    assert sig.group(1) == fname, f'签名名不符: {sig.group(1)} != {fname}'
    rest = first[1]
    return '\n'.join([head, rest])

f_prepare = to_pure(block(1576, 1581), 'prepareLyricsUI', 'app, track')
f_toggle  = to_pure(block(1583, 1596), 'toggleLyricsPanel', 'app')
f_rlyrics = to_pure(block(1598, 1658), 'renderLyrics', 'app')
f_uhl     = to_pure(block(1660, 1696), 'updateLyricsHighlight', 'app, force = false')
f_init    = to_pure(block(1703, 1998), 'initLyricMaker', 'app')
f_open    = to_pure(block(2000, 2006), 'openLyricMaker', 'app')
f_close   = to_pure(block(2008, 2013), 'closeLyricMaker', 'app')

HEADER = '''/* ==========================================================================
   lyric-views.js — music 歌词双簇单源核（#284 批16 · v11.38）
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

'''

new_module = (HEADER
  + '\n\n'.join([
      '/* ---- ① 歌词滚动渲染（原 index.html L1575-1596 · v7.61）---- */\n'
      + c_render_comment[0].replace('this.', 'app.') + '\n' + f_prepare,
      f_toggle,
      f_rlyrics,
      f_uhl,
      '/* ---- ② 歌词制作编辑器（原 index.html L1698-2013 · v9.13 #180）---- */\n'
      + '\n'.join(c_maker_comment).replace('this.', 'app.') + '\n' + f_init,
      f_open,
      f_close,
    ])
  + '\n')

# ---- 宿主替换：L1575–2013 → 委托块 ----
DELEG = '''      /* ---- v7.61 歌词 UI + v9.13 #180 歌词制作 —— v11.38 #284 批16：
         歌词滚动渲染（prepare/toggle/render/updateHighlight）与歌词制作编辑器
         （init/open/close）两簇单源搬迁 apps/music/lyric-views.js（boundary-map
         §3.2 表前两簇；#286 混合形态 = module 块 ESM import 挂 window.__lyricViews
         桥 + tests ESM 直连）。宿主保留委托行（G2 单源桥接，全部调用点零改动）；
         可选链守卫 = 打轴核缺位防御同律（桥缺位静默降级零抛错）。 */
      prepareLyricsUI(track) { return window.__lyricViews?.prepareLyricsUI(this, track); }
      toggleLyricsPanel() { return window.__lyricViews?.toggleLyricsPanel(this); }
      renderLyrics() { return window.__lyricViews?.renderLyrics(this); }
      updateLyricsHighlight(force = false) { return window.__lyricViews?.updateLyricsHighlight(this, force); }
      initLyricMaker() { return window.__lyricViews?.initLyricMaker(this); }
      openLyricMaker() { return window.__lyricViews?.openLyricMaker(this); }
      closeLyricMaker() { return window.__lyricViews?.closeLyricMaker(this); }'''

new_lines = lines[:1574] + DELEG.split('\n') + lines[2013:]

# ---- module 块桥注入（window.__mediaMeta 行后） ----
BRIDGE_ANCHOR = "    window.__mediaMeta = { readZip, parseAudioMeta, parseLrc, classifyZipEntries, coverForAudio, basenameNoExt, parseTar, gunzipBytes };"
idx = None
for i, ln in enumerate(new_lines):
    if ln.rstrip() == BRIDGE_ANCHOR:
        idx = i
        break
if idx is None:
    print('FAIL: module 桥锚行未命中')
    sys.exit(1)

BRIDGE = '''
    // =====================================================================
    // v11.38 #284 批16：歌词簇单源桥（lyric-views.js · #286 混合形态）
    //   歌词滚动渲染 + 歌词制作编辑器（boundary-map §3.2 表前两簇）——
    //   播放器 UI 绑定/媒体会话桥留宿主（表第三簇）。module defer 执行先于
    //   DOMContentLoaded，MusicApp 构造期桥必然就绪（__mediaMeta 同律）；
    //   缺位时宿主委托行可选链静默降级（打轴核缺位防御同律）。
    // =====================================================================
    import {
      prepareLyricsUI, toggleLyricsPanel, renderLyrics, updateLyricsHighlight,
      initLyricMaker, openLyricMaker, closeLyricMaker
    } from './lyric-views.js';
    window.__lyricViews = { prepareLyricsUI, toggleLyricsPanel, renderLyrics, updateLyricsHighlight, initLyricMaker, openLyricMaker, closeLyricMaker };'''

new_lines = new_lines[:idx + 1] + BRIDGE.split('\n') + new_lines[idx + 1:]

new_html = '\n'.join(new_lines)

# ---- 回读终验断言 ----
assert new_html.count('window.__lyricViews') == 9, f'__lyricViews 出现 {new_html.count("window.__lyricViews")} 次（期望 9 = 委托7+import后桥1+注释1）'
assert new_html.count('prepareLyricsUI(track) { return window.__lyricViews') == 1
assert "this.prepareLyricsUI(track)" in new_html, '宿主调用点锚丢失'
assert "initLyricMaker(); // v9.13 #180" in new_html, '构造调用锚丢失'
assert "<script src=\"lyric-core.js\"></script>" in new_html, 'lyric-core script 标签锚丢失'
assert 'fsReadTextSafe(\'/music/\' + meta.name.replace' in new_html, 'boot 恢复 pairing 锚丢失'
assert "'/music/.lyric-draft.json'" not in new_html, '草稿路径应已随簇迁出'
assert "code === 'Space'" not in new_html, 'Space 快捷键应已随簇迁出'
assert "lmRenderKaraoke" not in new_html, 'lm 渲染簇体应已迁出'
for token in ('lmMarkAt', 'lmSaveDraft', 'lyricMakerUI', 'estimateWords', 'karaokeAt'):
    assert token not in new_html, f'{token} 应已迁出宿主'

with open(SRC, 'w', encoding='utf-8') as f:
    f.write(new_html)
with open(DST, 'w', encoding='utf-8') as f:
    f.write(new_module)

print('OK 簇体搬迁完成')
print('  index.html 行数:', len(lines), '->', len(new_lines))
print('  lyric-views.js 行数:', len(new_module.split('\n')))
