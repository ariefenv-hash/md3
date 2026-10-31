// ==================== terminal-core.js — 终端命令核心（v8.40 #25） ====================
//
// 终端（msh — md3 shell）纯函数核心。经典脚本 IIFE 挂 window.__terminalCore
// （fx-core/word-core 同款模式；ESM export 在经典 <script> 下整文件 SyntaxError，
//  且 module defer 时序晚于主脚本 —— v8.38 教训沿用）。
// 顶层零副作用：不触碰 document / localStorage / window（仅末尾挂载导出对象），
// node 直接 import / new Function 沙箱提取均可安全直驱（vitest 用）。
//
// 设计纪律（议题 #25 验收锚）：
//  - 31 命令白名单注册表，全部显式分支调度 —— 禁止 eval / new Function 动态执行
//  - 虚拟文件树经 FS 桥对接 VFS（与文件应用互通；core 只做路径/格式化纯函数）
//  - open <应用> 深链映射覆盖全部 45 个内置应用（44 既有 + 终端自身；v8.94 #149 注释修正：旧注「35」滞后）
//  - 输出内容一律不可信：esc 全链转义（文件名/文件内容经用户输入与 VFS 双重不可信面）

(function () {
  'use strict';

  // ---------- 45 应用映射（id / 中文名 / 英文与中文别名） ----------
  // 顺序即 apps/ 目录应用定义顺序（initialApps），末位 terminal 为 v8.40 自身。
  // 验收锚：open 可启动全部 45 个内置应用 —— 测试从 ios-desktop/js/apps/*.js
  // 提取全部 id 对拍本表，缺一即红。
  var APPS = [
    ['msg', '信息', 'messages', 'sms', '短信', '简讯'],
    ['mail', '邮件', 'email', '邮箱'],
    ['photo', '相册', 'photos', 'gallery', '图片', '图库'],
    ['settings', '设置', 'preferences', '设定', '配置'],
    ['clock_app', '时钟', 'clock', '闹钟'],
    ['cal_app', '日历', 'calendar', '日程'],
    ['weather', '天气', 'forecast', '气象'],
    ['music', '音乐', 'player', '播放器'],
    ['calculator', '计算器', 'calc'],
    ['camera', '相机', '拍照'],
    ['map', '地图', 'maps', '导航'],
    ['notes', '备忘录', 'note', '便签', '记事'],
    ['reminders', '提醒', 'reminder', '待办', '任务'],
    ['health', '健康', 'fitness', '健身'],
    ['wallet', '钱包', 'pay', '卡包'],
    ['appstore', '应用商店', 'store', 'market', '商店', '市场'],
    ['stocks', '股票', 'quotes', '行情', '证券'],
    ['shortcuts', '快捷指令', 'shortcut', '指令'],
    ['threes', '小三传奇', 'threes!'],
    ['dice', '掷骰子', '骰子', 'dice'],
    ['flow11', 'Flow 11', 'flow'],
    ['safari', '浏览器', 'browser', 'web', '上网'],
    ['phone', '电话', '拨号', 'dialer'],
    ['facetime', 'FaceTime', '视频通话', '通话'],
    ['contacts', '通讯录', '联系人', '电话本'],
    ['findmy', '查找', 'find', '定位', '查找我的'],
    ['translate', '翻译', 'translation', '翻译器'],
    ['game2048', '2048 接龙', '2048', '接龙'],
    ['books', '图书', 'book', '阅读', '书架'],
    ['files', '文件', 'file', '文件管理', '文件管理器'],
    ['recorder', '录音机', 'record', '录音'],
    ['installer', '安装包', 'apk', '包管理', '安装器'],
    ['reaction', '反应力测试', '反应力', '反应'],
    ['word', '每日单词', '单词', '背单词', '词汇'],
    ['terminal', '终端', 'terminal', 'shell', 'console', '控制台', '命令行'],
    ['piano', '电子琴', 'piano', 'keyboard', '琴'],
    ['bytebeat', 'ByteBeat', 'bytebeat', 'beat', '音乐编程', '音乐'],
    ['python', 'Python', 'python', 'py', 'repl', '蛇'],
    ['ping', 'PING', 'ping', '网络诊断', '网络'],
    ['code-editor', '代码编辑器', 'code', '编辑器', 'editor'],
    ['midi-player', 'MIDI 播放器', 'midi', 'mid', '卷帘'],
    ['ocr', 'OCR 文字识别', 'ocr', '识别', '文字识别'],
    ['stt', '语音转文字', 'stt', '听写', '语音'],
    ['radio', '收音机', 'radio', '电台', '广播'],
    ['driving', '驾考题库', 'driving', '驾考', '题库', '科目一'],
  ];

  /** alias → appId（含 id 自身 + 中文名 + 英文/中文别名；先到先得，全小写键） */
  var APP_ALIAS = {};
  /** appId → 中文名 */
  var APP_NAMES = {};
  APPS.forEach(function (row) {
    var id = row[0];
    APP_NAMES[id] = row[1];
    row.forEach(function (alias) {
      var key = String(alias).toLowerCase();
      if (!(key in APP_ALIAS)) APP_ALIAS[key] = id;
    });
  });

  /**
   * open 目标解析：别名（大小写不敏感）→ { id, name }；未知 → null。
   * 纯函数：任何输入都不抛错，空/非字符串一律 null。
   */
  function resolveTarget(input) {
    if (typeof input !== 'string') return null;
    var key = input.trim().toLowerCase();
    if (!key) return null;
    var id = APP_ALIAS[key];
    return id ? { id: id, name: APP_NAMES[id] } : null;
  }

  // ---------- 31 命令白名单注册表 ----------
  // group: 文件系统 / 文本 / 系统 / 应用。help 按 group 分组展示。
  // 每条 desc 是 help 的唯一文案来源 —— 31 命令全部带单测锚（tests/v840）。
  var COMMANDS = {
    help:     { group: '系统',   desc: '列出全部命令与分组' },
    ls:       { group: '文件系统', desc: '列目录（-l 长格式）' },
    cd:       { group: '文件系统', desc: '切换目录（cd .. 上行；cd / 回根）' },
    pwd:      { group: '文件系统', desc: '显示当前目录' },
    cat:      { group: '文件系统', desc: '输出文本文件内容' },
    mkdir:    { group: '文件系统', desc: '创建目录' },
    touch:    { group: '文件系统', desc: '创建空文本文件' },
    rm:       { group: '文件系统', desc: '删除文件或目录（-r 递归）' },
    tree:     { group: '文件系统', desc: '目录树（深度 3 · 上限 200 项）' },
    stat:     { group: '文件系统', desc: '文件/目录元信息' },
    du:       { group: '文件系统', desc: 'VFS 已用容量' },
    df:       { group: '文件系统', desc: '按类型容量分布' },
    echo:     { group: '文本',   desc: '输出文本（> 重定向写入 VFS）' },
    wc:       { group: '文本',   desc: '文本行/词/字节统计（配合 cat 路径）' },
    head:     { group: '文本',   desc: '取前 N 行（默认 10）' },
    tail:     { group: '文本',   desc: '取后 N 行（默认 10）' },
    clear:    { group: '系统',   desc: '清屏' },
    date:     { group: '系统',   desc: '当前日期时间' },
    whoami:   { group: '系统',   desc: '当前用户' },
    uptime:   { group: '系统',   desc: '开机时长' },
    uname:    { group: '系统',   desc: '内核信息（-a 全量）' },
    neofetch: { group: '系统',   desc: '系统信息概览' },
    ps:       { group: '系统',   desc: '系统进程快照' },
    env:      { group: '系统',   desc: '终端环境变量' },
    history:  { group: '系统',   desc: '命令历史（↑↓ 翻阅）' },
    notify:   { group: '系统',   desc: '发送系统通知' },
    exit:     { group: '系统',   desc: '退出会话（cwd/历史复位）' },
    open:     { group: '应用',   desc: '启动内置应用（open 设置 / open safari）' },
    apps:     { group: '应用',   desc: '列出全部可启动应用' },
    print:    { group: '应用',   desc: '原样输出参数文本' },
    beat:     { group: '应用',   desc: 'ByteBeat 公式播放（#30 联动·打开即奏）' },
    code:     { group: '应用',   desc: '用代码编辑器打开 VFS 文件（#32 联动）' },
    ocr:      { group: '应用',   desc: '用 OCR 打开 VFS 图片并识别（#58 联动）' },
    stt:      { group: '应用',   desc: '打开语音转文字实时听写（#59 联动）' },
    radio:    { group: '应用',   desc: '打开收音机在线电台（#61 联动）' },
    driving:  { group: '应用',   desc: '打开驾考题库刷题（#62 联动·科目可选）' },
  };

  // ---------- 词法：tokenize ----------
  /**
   * 空白分词 + 单/双引号保护（引号内空格不切分；引号内无转义，成对才闭合）。
   * 未闭合引号：引号段整体作为一个 token（宽松容错，不抛错）。
   * 'echo "a b"  c' → ['echo', 'a b', 'c']
   */
  function tokenize(line) {
    var out = [];
    var cur = '';
    var has = false;
    var q = null;
    var s = String(line == null ? '' : line);
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (q) {
        if (ch === q) { q = null; } else { cur += ch; }
        continue;
      }
      if (ch === '\'' || ch === '"') { q = ch; has = true; continue; }
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        if (has) { out.push(cur); cur = ''; has = false; }
        continue;
      }
      cur += ch; has = true;
    }
    if (has) out.push(cur);
    return out;
  }

  /**
   * 重定向解析：tokens 中首个独立 '>' 之后为写入路径（覆盖写）。
   * 返回 { argv, redirect }（redirect 为 null 表示无重定向）。
   * '>' 必须是独立 token（">path" 不视为重定向，按字面参数处理）。
   */
  function parseRedirect(tokens) {
    var i = tokens.indexOf('>');
    if (i < 0 || i === tokens.length - 1) return { argv: tokens, redirect: null };
    return {
      argv: tokens.slice(0, i),
      redirect: tokens[i + 1],
    };
  }

  // ---------- 路径：normalizePath ----------
  /**
   * POSIX 风格路径归一（与 vfs.js normalizePath 同语义的终端侧镜像）：
   *  - '~' 或 '~/x' → '/x'（HOME = /）
   *  - 相对路径基于 cwd 拼接；'.' 消除；'..' 上行（越过根止于 '/'）
   *  - 连续斜杠折叠；尾斜杠去除
   * 返回 null 仅当归一结果为空串（输入全斜杠外的空内容不可能发生，防御位）。
   */
  function normalizePath(p, cwd) {
    var raw = String(p == null ? '' : p).trim();
    var base = (cwd && cwd[0] === '/') ? cwd : '/';
    if (raw === '~') return '/'; // HOME 恒为根 —— 与 cwd 无关
    if (raw === '') return base;
    if (raw[0] === '~') { raw = raw.slice(1); base = '/'; }
    var abs = raw[0] === '/' ? raw : (base === '/' ? '' : base) + '/' + raw;
    var parts = abs.split('/');
    var stack = [];
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i];
      if (seg === '' || seg === '.') continue;
      if (seg === '..') { stack.pop(); continue; }
      stack.push(seg);
    }
    return '/' + stack.join('/');
  }

  /** cd 参数语义：无参 → HOME('/')；'-' → 上一次目录（page 侧记忆，core 只归一） */
  function cdTarget(arg, cwd) {
    if (arg == null || String(arg).trim() === '') return '/';
    return normalizePath(String(arg), cwd);
  }

  // ---------- 格式化：ls / tree / stat ----------
  /**
   * ls 普通格式：单列按序换行（目录后缀 '/'）。宽屏多列由 CSS 负责，
   * core 输出一行一项 —— 不可信文件名全经 esc 转义由页面层执行（core 只给文本）。
   * entries: [{ name, type, ... }]（FS 桥 list 结果，已目录优先排序）
   */
  function formatLs(entries) {
    if (!Array.isArray(entries) || entries.length === 0) return [];
    return entries.map(function (e) {
      return (e && e.name ? String(e.name) : '') + (e && e.type === 'dir' ? '/' : '');
    });
  }

  /**
   * ls -l 长格式：类型位 / 大小（B 人类可读）/ 修改时间 / 名称。
   * size: 文件字节数（目录 —）；modified: epoch 毫秒 → 'YYYY-MM-DD HH:MM' 本地时区。
   */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtTime(ms) {
    var d = new Date(Number(ms) || 0);
    if (isNaN(d.getTime())) return '—';
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  function fmtSize(n) {
    var v = Number(n);
    if (!isFinite(v) || v < 0) return '—';
    if (v < 1024) return v + ' B';
    if (v < 1024 * 1024) return (v / 1024).toFixed(1) + ' KB';
    if (v < 1024 * 1024 * 1024) return (v / 1024 / 1024).toFixed(1) + ' MB';
    return (v / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }
  function formatLong(entries) {
    if (!Array.isArray(entries) || entries.length === 0) return [];
    return entries.map(function (e) {
      var isDir = e && e.type === 'dir';
      var size = isDir ? '—' : fmtSize(e && e.size);
      return (isDir ? 'd' : '-') + '  ' + pad(String(size), 9) + '  ' + fmtTime(e && e.modified) + '  ' + (e && e.name ? String(e.name) : '') + (isDir ? '/' : '');
    });
  }
  function pad(s, n) {
    s = String(s);
    while (s.length < n) s += ' ';
    return s;
  }

  /**
   * tree 渲染：nodes 为深度优先收集的 [{ depth, name, isDir, isLast, root }] 序列
   *（page 侧递归 FS 桥收集；core 纯渲染）。root 节点不带前缀。
   */
  function formatTree(nodes) {
    if (!Array.isArray(nodes)) return [];
    return nodes.map(function (n) {
      if (!n || n.root) {
        // 根节点不带前缀；名为 '/' 时不另加目录后缀（避免 '//'）
        var nm = String(n && n.name ? n.name : '');
        return nm + (n && n.isDir && nm !== '/' ? '/' : '');
      }
      var pre = '';
      // 祖先链按 depth 回溯：位图（isLast）决定 '│ ' 或 '   '，自身位 '├─ '/'└─ '
      for (var d = 1; d <= n.depth; d++) {
        if (d === n.depth) {
          pre += n.isLast ? '└─ ' : '├─ ';
        } else {
          pre += (n.ancestors && n.ancestors[d] === false) ? '│  ' : '   ';
        }
      }
      return pre + (n.name ? String(n.name) : '') + (n.isDir ? '/' : '');
    });
  }

  /** stat 单文件元信息行（FS 桥 stat 结果 → 文本行） */
  function formatStat(entry) {
    if (!entry) return ['stat: 无此路径'];
    var isDir = entry.type === 'dir';
    return [
      '  路径: ' + (entry.path || ''),
      '  类型: ' + (isDir ? '目录' : (entry.mime || 'application/octet-stream')),
      '  大小: ' + (isDir ? '—' : fmtSize(entry.size)),
      '  修改: ' + fmtTime(entry.modified),
      '  来源: ' + (entry.owner ? entry.owner : 'system'),
    ];
  }

  /** df：usageByType() [{ type, size }] → 对齐两列 + 合计 */
  function formatDf(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return ['df: 暂无分类数据'];
    var total = 0;
    var lines = rows.map(function (r) {
      var v = Number(r && r.size) || 0;
      total += v;
      return pad(String(r && r.type ? r.type : '?'), 12) + fmtSize(v);
    });
    lines.push(pad('合计', 12) + fmtSize(total));
    return lines;
  }

  // ---------- 文本：echo/wc/head/tail ----------
  function splitLines(text) {
    var s = String(text == null ? '' : text);
    if (s === '') return [];
    return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  }
  function headLines(text, n) {
    var lines = splitLines(text);
    var k = Number(n);
    if (!isFinite(k) || k < 0) k = 10;
    return lines.slice(0, k).join('\n');
  }
  function tailLines(text, n) {
    var lines = splitLines(text);
    var k = Number(n);
    if (!isFinite(k) || k < 0) k = 10;
    return lines.slice(Math.max(0, lines.length - k)).join('\n');
  }
  /** wc 统计：行数 / 词数（空白切分）/ 字节数（精确 UTF-8：CJK 3 字节・代理对 4） */
  function wcCount(text) {
    var s = String(text == null ? '' : text);
    var lines = splitLines(s).length;
    var words = s.trim() === '' ? 0 : s.trim().split(/\s+/).length;
    var bytes = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) { bytes += 4; i++; } // 代理对整体
      else bytes += c < 0x80 ? 1 : (c < 0x800 ? 2 : 3);
    }
    return { lines: lines, words: words, bytes: bytes };
  }
  function formatWc(c) {
    return pad(String(c.lines), 8) + pad(String(c.words), 8) + pad(String(c.bytes), 8);
  }

  // ---------- 系统：neofetch / ps / env / history ----------
  /**
   * neofetch：左侧 md3 色块 ASCII 徽标 + 右侧信息行。
   * info 字段缺省一律 '—'（页面组装真实值：VFS engine/usage、应用数、主题色相）。
   */
  var LOGO = [
    '  ╭──────╮  ',
    '  │ ▓▓▓▓ │  ',
    '  │ ▓▓▓▓ │  ',
    '  ╰──────╯  ',
    '  ┌┐      ┌┐ ',
    '  └┘      └┘ ',
  ];
  function renderNeofetch(info) {
    var i = info || {};
    var rows = [
      pad('', 12) + 'arief@md3',
      pad('', 12) + '──────────',
      pad('OS', 12) + (i.os || 'md3 web (Material Design 3)'),
      pad('Kernel', 12) + (i.kernel || 'web ' + (i.ua || '')),
      pad('Shell', 12) + (i.shell || 'msh 1.0'),
      pad('Resolution', 12) + (i.resolution || '—'),
      pad('Theme', 12) + (i.theme || '—'),
      pad('Apps', 12) + (i.apps != null ? String(i.apps) : '—') + ' installed',
      pad('FS Engine', 12) + (i.engine || '—'),
      pad('Storage', 12) + (i.storage || '—'),
      pad('Uptime', 12) + (i.uptime || '—'),
    ];
    var out = [];
    var h = Math.max(LOGO.length, rows.length);
    for (var k = 0; k < h; k++) {
      out.push((LOGO[k] || pad('', 12)) + (rows[k] || ''));
    }
    return out;
  }

  /** ps：进程快照（pid 对齐 + 真实 VFS engine 注入 fsd 行） */
  function formatPs(procs) {
    if (!Array.isArray(procs) || procs.length === 0) return ['ps: 无进程'];
    var head = pad('PID', 6) + pad('COMMAND', 14) + 'NOTE';
    var lines = [head];
    procs.forEach(function (p) {
      lines.push(pad(String(p && p.pid != null ? p.pid : '?'), 6) + pad(String(p && p.name ? p.name : '?'), 14) + String(p && p.note ? p.note : ''));
    });
    return lines;
  }

  /** env：[['KEY','val']] → KEY=val 行 */
  function formatEnv(pairs) {
    if (!Array.isArray(pairs)) return [];
    return pairs.map(function (kv) { return kv[0] + '=' + String(kv[1] == null ? '' : kv[1]); });
  }

  /** history：右对齐序号 + 命令原文 */
  function formatHistory(lines) {
    var arr = Array.isArray(lines) ? lines : [];
    var w = String(arr.length).length;
    return arr.map(function (cmd, i) {
      var n = String(i + 1);
      while (n.length < w) n = ' ' + n;
      return '  ' + n + '  ' + String(cmd == null ? '' : cmd);
    });
  }

  // ---------- esc：HTML 转义（页面渲染层全链使用） ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- apps 命令输出：两列对齐 ----------
  function formatApps() {
    return APPS.map(function (row) {
      return pad(row[0], 14) + row[1];
    });
  }

  // ---------- 导出（唯一 DOM 外出口；node 沙箱可直驱） ----------
  var core = {
    APPS: APPS,
    APP_ALIAS: APP_ALIAS,
    APP_NAMES: APP_NAMES,
    COMMANDS: COMMANDS,
    resolveTarget: resolveTarget,
    tokenize: tokenize,
    parseRedirect: parseRedirect,
    normalizePath: normalizePath,
    cdTarget: cdTarget,
    formatLs: formatLs,
    formatLong: formatLong,
    formatTree: formatTree,
    formatStat: formatStat,
    formatDf: formatDf,
    splitLines: splitLines,
    headLines: headLines,
    tailLines: tailLines,
    wcCount: wcCount,
    formatWc: formatWc,
    fmtSize: fmtSize,
    fmtTime: fmtTime,
    renderNeofetch: renderNeofetch,
    formatPs: formatPs,
    formatEnv: formatEnv,
    formatHistory: formatHistory,
    formatApps: formatApps,
    esc: esc,
    pad: pad,
  };

  if (typeof window !== 'undefined') {
    window.__terminalCore = core;
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = core;
  }
})();
